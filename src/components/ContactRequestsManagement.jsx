import React, { useState, useEffect, useContext } from 'react'; // Importar useContext
import { db } from '../services/firebase';
import { collection, getDocs, onSnapshot, doc, updateDoc, query, orderBy, where, deleteDoc } from 'firebase/firestore';
import { ThemeContext } from '../context/ThemeContext'; // Importar ThemeContext
import { useError } from '../context/ErrorContext'; // Importar useError
import Button from './common/Button'; // Importar el componente Button

const ContactRequestsManagement = ({ onUnreadCountChange }) => {
  const { darkMode } = useContext(ThemeContext); // Usar ThemeContext
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
    <div className={`flex h-full ${darkMode ? 'bg-dark_bg text-light_text' : 'bg-gray-100 text-gray-900'}`}>
      {/* Lista de Solicitudes */}
      <div className={`w-1/3 p-4 border-r overflow-y-auto ${darkMode ? 'bg-dark_card border-dark_border' : 'bg-white border-gray-200'}`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className={`text-xl font-bold ${darkMode ? 'text-light_text' : 'text-gray-900'}`}>Solicitudes de Contacto</h2>
          <Button
            onClick={handleDeleteClosedRequests}
            variant="danger"
            className="py-1.5 px-3 text-sm"
          >
            Eliminar Cerrados
          </Button>
        </div>
        {requests.length === 0 ? (
          <p className={`${darkMode ? 'text-light_text' : 'text-gray-600'}`}>No hay solicitudes de contacto.</p>
        ) : (
          <ul>
            {requests.map(req => (
              <li
                key={req.id}
                className={`p-3 mb-2 rounded-lg cursor-pointer ${
                  selectedRequest && selectedRequest.id === req.id 
                    ? (darkMode ? 'bg-accent text-white' : 'bg-yellow-200') 
                    : (darkMode ? 'bg-dark_bg hover:bg-dark_border' : 'bg-gray-100 hover:bg-gray-200')
                }`}
                onClick={() => handleSelectRequest(req)}
              >
                <p className={`font-semibold ${darkMode ? 'text-light_text' : 'text-gray-800'}`}>{req.subject}</p>
                <p className={`text-sm truncate ${darkMode ? 'text-light_text' : 'text-gray-600'}`}>{req.conversation[req.conversation.length - 1]?.text}</p>
                <div className={`flex justify-between items-center text-xs mt-1 ${darkMode ? 'text-light_text' : 'text-gray-500'}`}>
                  <span>{req.userEmail}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xxs font-semibold ${
                    req.status === 'Abierto' ? 'bg-blue-100 text-blue-800' :
                    req.status === 'Pendiente' ? 'bg-yellow-100 text-yellow-800' :
                    req.status === 'Respondido' ? 'bg-purple-100 text-purple-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {req.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Detalles de la Solicitud y Conversación */}
      <div className="flex-1 p-4 overflow-y-auto">
        {selectedRequest ? (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-2xl font-bold ${darkMode ? 'text-light_text' : 'text-gray-800'}`}>{selectedRequest.subject}</h2>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                selectedRequest.status === 'Abierto' ? 'bg-blue-100 text-blue-800' :
                selectedRequest.status === 'Pendiente' ? 'bg-yellow-100 text-yellow-800' :
                selectedRequest.status === 'Respondido' ? 'bg-purple-100 text-purple-800' :
                'bg-green-100 text-green-800'
              }`}>
                {selectedRequest.status}
              </span>
            </div>
            <p className={`text-sm mb-2 ${darkMode ? 'text-light_text' : 'text-gray-600'}`}>De: {selectedRequest.userEmail} - Fecha: {selectedRequest.createdAt.toLocaleDateString()}</p>

            {/* Historial de Conversación */}
            <div className={`${darkMode ? 'bg-dark_bg border-dark_border' : 'bg-gray-50'} p-4 rounded-lg shadow-inner mb-4 h-64 overflow-y-auto border`}>
              {selectedRequest.conversation.map((msg, index) => (
                <div key={index} className={`mb-3 ${msg.sender === 'admin' ? 'text-right' : 'text-left'}`}>
                  <span className={`inline-block p-2 rounded-lg text-sm ${
                    msg.sender === 'admin' ? 'bg-blue-100 text-blue-800' : (darkMode ? 'bg-dark_border text-light_text' : 'bg-gray-200 text-gray-800')
                  }`}>
                    {msg.text}
                  </span>
                  <p className={`text-xxs mt-1 ${darkMode ? 'text-light_text' : 'text-gray-500'}`}>{new Date(msg.timestamp).toLocaleString()}</p>
                </div>
              ))}
            </div>

            {/* Área de Respuesta del Administrador */}
            <div className={`${darkMode ? 'bg-dark_card border-dark_border' : 'bg-white'} p-4 rounded-lg shadow-md border`}>
              <h3 className={`text-lg font-semibold mb-3 ${darkMode ? 'text-light_text' : 'text-gray-800'}`}>Responder</h3>
              <textarea
                rows="3"
                className={`w-full p-2 rounded-md text-sm focus:outline-none focus:border-yellow-500 mb-3 ${darkMode ? 'bg-dark_bg border-dark_border text-light_text' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                placeholder="Escribe tu respuesta aquí..."
                value={adminReply}
                onChange={(e) => setAdminReply(e.target.value)}
              ></textarea>
              <div className="flex justify-end space-x-2">
                <Button
                  onClick={handleSendReply}
                  variant="primary"
                >
                  Enviar Respuesta
                </Button>
                <Button
                  onClick={handleCloseRequest}
                  variant="success"
                >
                  Cerrar Solicitud
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className={`flex items-center justify-center h-full text-lg ${darkMode ? 'text-light_text' : 'text-gray-600'}`}>
            Selecciona una solicitud para ver los detalles.
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactRequestsManagement;
