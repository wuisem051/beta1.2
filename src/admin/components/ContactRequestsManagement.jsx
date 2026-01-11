import React, { useState, useEffect } from 'react'; // Importar React y hooks necesarios
import { db } from '../../services/firebase';
import { collection, getDocs, onSnapshot, doc, updateDoc, query, orderBy, where, deleteDoc } from 'firebase/firestore';
import { ThemeContext } from '../../context/ThemeContext'; // Importar ThemeContext
import { useError } from '../../context/ErrorContext'; // Importar useError

const ContactRequestsManagement = ({ onUnreadCountChange }) => {
  const { showError, showSuccess } = useError(); // Usar el contexto de errores
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [adminReply, setAdminReply] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'contactRequests'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log("ContactRequestsManagement: Firebase suscripción - Evento recibido.");
      const fetchedRequests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(), // Convertir Timestamp a Date
        updatedAt: doc.data().updatedAt ? doc.data().updatedAt.toDate() : doc.data().createdAt.toDate(), // Convertir Timestamp a Date
      }));
      setRequests(fetchedRequests);

      const unreadCount = fetchedRequests.filter(req => req.status === 'Abierto' || req.status === 'Pendiente').length;
      if (onUnreadCountChange) {
        onUnreadCountChange(unreadCount);
      }

      if (selectedRequest) {
        const updatedSelected = fetchedRequests.find(req => req.id === selectedRequest.id);
        setSelectedRequest(updatedSelected || null);
      }
    }, (error) => {
      console.error("Error fetching contact requests from Firebase:", error);
      showError('Error al cargar las solicitudes de contacto.');
    });

    return () => {
      unsubscribe(); // Desuscribirse de los cambios de Firebase
    };
  }, [selectedRequest, onUnreadCountChange, showError]);

  const handleSelectRequest = (request) => {
    setSelectedRequest(request);
    setAdminReply(''); // Limpiar la respuesta al seleccionar una nueva solicitud
    showError(null); // Limpiar errores previos
    showSuccess(null); // Limpiar mensajes de éxito previos
  };

  const handleSendReply = async () => {
    if (!adminReply.trim() || !selectedRequest) {
      showError('El mensaje no puede estar vacío.');
      return;
    }

    try {
      const newConversation = [...selectedRequest.conversation, {
        sender: 'admin',
        text: adminReply,
        timestamp: new Date().toISOString(),
      }];
      const requestRef = doc(db, 'contactRequests', selectedRequest.id);
      await updateDoc(requestRef, {
        conversation: newConversation,
        status: 'Respondido',
        updatedAt: new Date(), // Usar un objeto Date para Firebase Timestamp
      });
      setAdminReply('');
      showSuccess('Respuesta enviada exitosamente.');
    } catch (error) {
      console.error("Error al enviar respuesta:", error);
      showError(`Error al enviar respuesta: ${error.message}`);
    }
  };

  const handleCloseRequest = async () => {
    if (!selectedRequest) return;
    try {
      const requestRef = doc(db, 'contactRequests', selectedRequest.id);
      await updateDoc(requestRef, {
        status: 'Cerrado',
        updatedAt: new Date(), // Usar un objeto Date para Firebase Timestamp
      });
      showSuccess('Solicitud cerrada exitosamente.');
    } catch (error) {
      console.error("Error al cerrar solicitud:", error);
      showError(`Error al cerrar solicitud: ${error.message}`);
    }
  };

  const handleDeleteClosedRequests = async () => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar TODAS las solicitudes de contacto cerradas? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const closedRequestsQuery = query(collection(db, 'contactRequests'), where('status', '==', 'Cerrado'));
      const snapshot = await getDocs(closedRequestsQuery);

      const deletePromises = snapshot.docs.map(docToDelete => deleteDoc(doc(db, 'contactRequests', docToDelete.id)));
      await Promise.all(deletePromises);

      // Actualizar el estado local para reflejar los cambios inmediatamente
      setRequests(prevRequests => prevRequests.filter(req => req.status !== 'Cerrado'));
      showSuccess('Todas las solicitudes cerradas han sido eliminadas exitosamente.');
      setSelectedRequest(null); // Deseleccionar cualquier solicitud si fue eliminada
    } catch (error) {
      console.error("Error al eliminar solicitudes cerradas:", error);
      showError(`Error al eliminar solicitudes cerradas: ${error.message}`);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-160px)] gap-6" style={{ color: '#f8fafc' }}>
      {/* Lista de Solicitudes */}
      <div className="w-full md:w-1/3 bg-slate-800/50 rounded-2xl border border-slate-700 shadow-lg flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-700 bg-slate-900/50 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="bg-blue-500/10 p-1.5 rounded-lg text-sm">📬</span>
            Solicitudes
          </h2>
          <button
            onClick={handleDeleteClosedRequests}
            className="bg-red-900/30 hover:bg-red-900 text-red-400 hover:text-white font-bold py-1 px-3 rounded-lg text-xs transition-colors border border-red-900/30"
          >
            Limpiar Cerrados
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {requests.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No hay solicitudes.</p>
          ) : (
            <ul>
              {requests.map(req => (
                <li
                  key={req.id}
                  className={`p-4 mb-3 rounded-xl cursor-pointer transition-all border ${selectedRequest && selectedRequest.id === req.id
                    ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-900/20'
                    : 'bg-slate-900/50 border-slate-700 hover:bg-slate-700/50'
                    }`}
                  onClick={() => handleSelectRequest(req)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <p className={`font-bold text-sm ${selectedRequest && selectedRequest.id === req.id ? 'text-white' : 'text-slate-100'}`}>{req.subject}</p>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${req.status === 'Abierto' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20' :
                      req.status === 'Pendiente' ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/20' :
                        req.status === 'Respondido' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/20' :
                          'bg-green-500/20 text-green-400 border border-green-500/20'
                      }`}>
                      {req.status}
                    </span>
                  </div>
                  <p className={`text-xs line-clamp-1 mb-2 ${selectedRequest && selectedRequest.id === req.id ? 'text-blue-100' : 'text-slate-400'}`}>
                    {req.conversation[req.conversation.length - 1]?.text}
                  </p>
                  <div className={`flex justify-between items-center text-[10px] ${selectedRequest && selectedRequest.id === req.id ? 'text-blue-200' : 'text-slate-500'}`}>
                    <span>{req.userEmail}</span>
                    <span>{req.updatedAt.toLocaleDateString()}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Detalles de la Solicitud y Conversación */}
      <div className="flex-1 bg-slate-800/50 rounded-2xl border border-slate-700 shadow-lg flex flex-col overflow-hidden">
        {selectedRequest ? (
          <div className="flex flex-col h-full">
            <div className="p-6 border-b border-slate-700 bg-slate-900/50">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-2xl font-bold text-white">{selectedRequest.subject}</h2>
                <div className="flex items-center gap-3">
                  <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase border ${selectedRequest.status === 'Abierto' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20' :
                    selectedRequest.status === 'Pendiente' ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/20' :
                      selectedRequest.status === 'Respondido' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/20' :
                        'bg-green-500/20 text-green-400 border border-green-500/20'
                    }`}>
                    {selectedRequest.status}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <span className="font-semibold text-blue-400">{selectedRequest.userEmail}</span>
                <span>•</span>
                <span>Iniciado el {selectedRequest.createdAt.toLocaleDateString()}</span>
              </div>
            </div>

            {/* Historial de Conversación */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-900/30">
              {selectedRequest.conversation.map((msg, index) => (
                <div key={index} className={`flex flex-col ${msg.sender === 'admin' ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[80%] p-4 rounded-2xl text-sm shadow-md ${msg.sender === 'admin'
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-slate-700 text-slate-100 rounded-tl-none border border-slate-600'
                    }`}>
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 px-1">
                    {new Date(msg.timestamp).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            {/* Área de Respuesta del Administrador */}
            <div className="p-6 bg-slate-900/50 border-t border-slate-700">
              <h3 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">Enviar Respuesta</h3>
              <textarea
                rows="3"
                className="w-full p-4 rounded-xl text-sm bg-slate-950 border border-slate-700 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all placeholder:text-slate-600 mb-4 resize-none"
                placeholder="Escribe tu mensaje aquí..."
                value={adminReply}
                onChange={(e) => setAdminReply(e.target.value)}
              ></textarea>
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleCloseRequest}
                  className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2.5 px-6 rounded-xl text-sm transition-all"
                >
                  Cerrar Caso
                </button>
                <button
                  onClick={handleSendReply}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-8 rounded-xl text-sm shadow-lg shadow-blue-900/20 transition-all flex items-center gap-2"
                >
                  🚀 Enviar Respuesta
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-4">
            <span className="text-6xl">📬</span>
            <p className="text-lg font-medium">Selecciona una solicitud para ver los detalles.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactRequestsManagement;
