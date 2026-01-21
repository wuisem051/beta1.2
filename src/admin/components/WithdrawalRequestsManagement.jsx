import React, { useState, useEffect } from 'react'; // Importar React y hooks necesarios
import { db } from '../../services/firebase'; // Importar la instancia de Firebase Firestore
import { collection, query, orderBy, onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore';
import { ThemeContext } from '../../context/ThemeContext'; // Importar ThemeContext
import { useError } from '../../context/ErrorContext'; // Importar useError

const WithdrawalRequestsManagement = ({ onUnreadCountChange }) => { // Aceptar prop
  const { showError, showSuccess } = useError(); // Usar el contexto de errores
  const [withdrawalRequests, setWithdrawalRequests] = useState([]);


  useEffect(() => {
    const q = query(collection(db, 'withdrawals'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const requests = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt.toDate(), // Convertir Timestamp a Date
        }));
        setWithdrawalRequests(requests);

        const pendingRequestsCount = requests.filter(req => req.status === 'Pendiente').length;
        if (onUnreadCountChange) {
          onUnreadCountChange(pendingRequestsCount);
        }
      } catch (fetchError) {
        console.error("Error fetching withdrawal requests from Firebase:", fetchError);
        showError('Error al cargar las solicitudes de retiro.');
        if (onUnreadCountChange) {
          onUnreadCountChange(0);
        }
      }
    }, (error) => {
      console.error("Error subscribing to withdrawal requests:", error);
      showError('Error al suscribirse a las solicitudes de retiro.');
    });

    return () => {
      unsubscribe();
    };
  }, [onUnreadCountChange, showError]);

  const handleUpdateStatus = async (request, newStatus) => {
    showSuccess(null);
    showError(null);
    try {
      const withdrawalRef = doc(db, 'withdrawals', request.id);
      await updateDoc(withdrawalRef, { status: newStatus });

      if (newStatus === 'Completado') {
        const userRef = doc(db, 'users', request.userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          showError(`Error: No se pudo obtener el balance del usuario ${request.userId}.`);
          return;
        }

        const userData = userSnap.data();
        const balanceKey = `balance${request.currency.replace('-', '')}`;
        const currentBalance = userData[balanceKey] || 0;
        const newBalance = currentBalance - request.amount;

        await updateDoc(userRef, {
          [balanceKey]: newBalance >= 0 ? newBalance : 0,
        });

        showSuccess(`Estado de la solicitud ${request.id} actualizado a ${newStatus} y balance del usuario reducido.`);
      } else {
        showSuccess(`Estado de la solicitud ${request.id} actualizado a ${newStatus}.`);
      }
    } catch (err) {
      console.error("Error updating withdrawal status or user balance:", err);
      showError(`Fallo al actualizar el estado o el balance: ${err.message}`);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pendiente': return 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20';
      case 'Completado': return 'bg-green-500/10 text-green-500 border border-green-500/20';
      case 'Rechazado': return 'bg-red-500/10 text-red-500 border border-red-500/20';
      default: return 'bg-slate-500/10 text-slate-500 border border-slate-500/20';
    }
  };

  return (
    <div className="p-6 rounded-2xl shadow-xl space-y-6" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>
      <div className="flex justify-between items-center border-b border-slate-700 pb-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <span className="bg-blue-500/10 p-2 rounded-lg text-lg">💸</span>
          Gestión de Solicitudes de Retiro
        </h2>
      </div>

      {withdrawalRequests.length === 0 ? (
        <div className="bg-slate-800/50 rounded-2xl p-12 text-center border border-slate-700 shadow-lg">
          <p className="text-slate-500 text-lg">No hay solicitudes de retiro pendientes.</p>
        </div>
      ) : (
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/50">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">Fecha</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">Usuario (Email)</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">Cantidad</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">Moneda</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">Método</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">Dirección/ID</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">Estado</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {withdrawalRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {request.createdAt.toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                      {request.userEmail}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-400">
                      {request.amount.toFixed(8)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {request.currency}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {request.method}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300 font-mono">
                      {request.addressOrId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full border ${getStatusColor(request.status)}`}>
                        {request.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {request.status === 'Pendiente' && (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleUpdateStatus(request, 'Completado')}
                            className="bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-lg shadow-green-900/20"
                          >
                            Aprobar
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(request, 'Rechazado')}
                            className="bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-lg shadow-red-900/20"
                          >
                            Rechazar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default WithdrawalRequestsManagement;
