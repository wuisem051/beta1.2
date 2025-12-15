import React, { useState, useEffect, useContext } from 'react'; // Importar useContext
import { db } from '../../services/firebase'; // Importar la instancia de Firebase Firestore
import { collection, query, orderBy, onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore';
import { ThemeContext } from '../../context/ThemeContext'; // Importar ThemeContext
import { useError } from '../../context/ErrorContext'; // Importar useError

const WithdrawalRequestsManagement = ({ onUnreadCountChange }) => { // Aceptar prop
  const { darkMode } = useContext(ThemeContext); // Usar ThemeContext
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
        const balanceKey = `balance${request.currency}`;
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
      case 'Pendiente': return 'bg-yellow-100 text-yellow-800';
      case 'Completado': return 'bg-green-100 text-green-800';
      case 'Rechazado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`${darkMode ? 'bg-dark_card text-light_text' : 'bg-white text-gray-900'} p-6 rounded-lg shadow-md`}>
      <h2 className={`text-2xl font-semibold mb-4 ${darkMode ? 'text-light_text' : 'text-gray-800'}`}>Gestión de Solicitudes de Retiro</h2>
      {/* Los mensajes de error y éxito ahora se manejan globalmente */}

      {withdrawalRequests.length === 0 ? (
        <p className={`${darkMode ? 'text-light_text' : 'text-gray-600'} text-center py-8`}>No hay solicitudes de retiro pendientes.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className={`min-w-full divide-y ${darkMode ? 'divide-dark_border' : 'divide-gray-200'}`}>
            <thead className={`${darkMode ? 'bg-dark_bg' : 'bg-gray-50'}`}>
              <tr>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-light_text' : 'text-gray-500'}`}>Fecha</th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-light_text' : 'text-gray-500'}`}>Usuario (Email)</th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-light_text' : 'text-gray-500'}`}>Cantidad</th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-light_text' : 'text-gray-500'}`}>Moneda</th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-light_text' : 'text-gray-500'}`}>Método</th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-light_text' : 'text-gray-500'}`}>Dirección/ID</th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-light_text' : 'text-gray-500'}`}>Estado</th>
                <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-light_text' : 'text-gray-500'}`}>Acciones</th>
              </tr>
            </thead>
            <tbody className={`${darkMode ? 'bg-dark_card divide-dark_border' : 'bg-white divide-gray-200'} divide-y`}>
              {withdrawalRequests.map((request) => (
                <tr key={request.id}>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-light_text' : 'text-gray-900'}`}>
                    {request.createdAt.toLocaleDateString()}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-light_text' : 'text-gray-900'}`}>
                    {request.userEmail}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-light_text' : 'text-gray-900'}`}>
                    {request.amount.toFixed(8)}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-light_text' : 'text-gray-900'}`}>
                    {request.currency}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-light_text' : 'text-gray-900'}`}>
                    {request.method}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-light_text' : 'text-gray-900'}`}>
                    {request.addressOrId}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-light_text' : 'text-gray-900'}`}>
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(request.status)}`}>
                      {request.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {request.status === 'Pendiente' && (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(request, 'Completado')}
                          className="text-green-600 hover:text-green-800 mr-3"
                        >
                          Completar
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(request, 'Rechazado')}
                          className="text-red-600 hover:text-red-800"
                        >
                          Rechazar
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default WithdrawalRequestsManagement;
