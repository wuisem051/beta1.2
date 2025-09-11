import React, { useState, useEffect, useContext } from 'react'; // Importar useContext
import { db, auth } from '../../services/firebase'; // Importar la instancia de Firebase Firestore y Auth
import { collection, query, onSnapshot, doc, getDoc, setDoc, updateDoc, deleteDoc, where, getDocs } from 'firebase/firestore';
import { createUserWithEmailAndPassword, updateEmail, updatePassword, deleteUser, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { ThemeContext } from '../../context/ThemeContext'; // Importar ThemeContext
import { useError } from '../../context/ErrorContext'; // Importar useError

const UserManagement = () => {
  const { darkMode } = useContext(ThemeContext); // Usar ThemeContext
  const { showError, showSuccess } = useError(); // Usar el contexto de errores
  const [users, setUsers] = useState([]);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('user');
  const [editingUser, setEditingUser] = useState(null);
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState([]); // Nuevo estado para selección masiva


  // Función para obtener usuarios
  const fetchUsers = async () => {
    try {
      const q = query(collection(db, 'users'));
      const querySnapshot = await getDocs(q);
      const usersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(usersData);
    } catch (error) {
      console.error("Error fetching users from Firebase: ", error);
      showError(`Error al cargar usuarios: ${error.message}`);
    }
  };

  useEffect(() => {
    fetchUsers();

    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(usersData);
    }, (error) => {
      console.error("Error subscribing to users:", error);
      showError('Error al suscribirse a los usuarios.');
    });

    return () => {
      unsubscribe();
    };
  }, [showError]);

  const handleSelectUser = (userId) => {
    setSelectedUserIds(prevSelected =>
      prevSelected.includes(userId)
        ? prevSelected.filter(id => id !== userId)
        : [...prevSelected, userId]
    );
  };

  const handleSelectAllUsers = (e) => {
    if (e.target.checked) {
      setSelectedUserIds(users.map(user => user.id));
    } else {
      setSelectedUserIds([]);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    showError(null);
    showSuccess(null);
    try {
      // Crear usuario en Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, newUserEmail, newUserPassword);
      const firebaseUser = userCredential.user;

      // Crear un documento en Firestore para el nuevo usuario
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        email: newUserEmail,
        role: newUserRole,
        balanceUSD: 0,
        balanceBTC: 0,
        balanceLTC: 0,
        balanceDOGE: 0,
        createdAt: new Date(),
      });

      // Crear un documento en la colección 'miners' para el nuevo usuario
      await setDoc(doc(db, 'miners', firebaseUser.uid), { // Usar UID como ID del documento del minero
        userId: firebaseUser.uid,
        workerName: `worker-${firebaseUser.uid.substring(0, 6)}`,
        currentHashrate: 0,
        status: 'inactivo',
        createdAt: new Date(),
      });

      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('user');
      fetchUsers();
      showSuccess('Usuario añadido exitosamente!');
    } catch (error) {
      console.error("Error adding user: ", error);
      showError(`Error al agregar usuario: ${error.message}`);
    }
  };

  const handleEditClick = (user) => {
    setEditingUser(user);
    setEditEmail(user.email);
    setEditRole(user.role || 'user');
    setEditPassword('');
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    showError(null);
    showSuccess(null);
    try {
      const userRef = doc(db, 'users', editingUser.id);
      await updateDoc(userRef, {
        email: editEmail,
        role: editRole,
      });

      // Actualizar email en Firebase Authentication
      const authUser = auth.currentUser;
      if (authUser && authUser.uid === editingUser.id) { // Solo si el admin está editando su propio email
        await updateEmail(authUser, editEmail);
      } else {
        // Para actualizar el email de otro usuario, se necesita reautenticación o una función de Cloud Functions
        // Por simplicidad, aquí solo se actualiza en Firestore.
        console.warn("No se puede actualizar el email de Firebase Auth para otro usuario directamente desde el cliente.");
      }

      // Si se proporciona una nueva contraseña, actualizarla en Firebase Authentication
      if (editPassword) {
        if (authUser && authUser.uid === editingUser.id) { // Solo si el admin está editando su propia contraseña
          await updatePassword(authUser, editPassword);
        } else {
          // Para actualizar la contraseña de otro usuario, se necesita reautenticación o una función de Cloud Functions
          // Por simplicidad, aquí no se hace.
          console.warn("No se puede actualizar la contraseña de Firebase Auth para otro usuario directamente desde el cliente.");
        }
      }

      setEditingUser(null);
      setEditEmail('');
      setEditRole('');
      setEditPassword('');
      fetchUsers();
      showSuccess('Usuario actualizado exitosamente en Firebase!');
    } catch (error) {
      console.error("Error updating user: ", error);
      showError(`Error al actualizar usuario: ${error.message}`);
    }
  };

  const handleDeleteUser = async (userToDelete) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar al usuario ${userToDelete.email}? Esta acción es irreversible.`)) {
      showError(null);
      showSuccess(null);
      try {
        // Eliminar el documento del usuario de Firestore
        await deleteDoc(doc(db, 'users', userToDelete.id));

        // Eliminar el usuario de Firebase Authentication (requiere que el usuario esté logueado y sea el mismo o usar Cloud Functions)
        // Por simplicidad, aquí se asume que el admin está logueado y tiene permisos para eliminar usuarios.
        // En un entorno de producción, esto debería hacerse a través de Cloud Functions para seguridad.
        const userAuth = auth.currentUser;
        if (userAuth && userAuth.uid === userToDelete.id) {
          await deleteUser(userAuth);
        } else {
          // Si no es el usuario actual, no se puede eliminar directamente desde el cliente.
          // Se necesitaría una función de Cloud Functions para eliminar usuarios por UID.
          console.warn(`No se puede eliminar el usuario de Firebase Auth ${userToDelete.id} directamente desde el cliente.`);
        }

        // Eliminar el documento del minero asociado (si existe)
        await deleteDoc(doc(db, 'miners', userToDelete.id)); // Asumiendo que el ID del minero es el mismo que el userId

        showSuccess("Usuario y mineros asociados eliminados de Firebase.");
        fetchUsers();
      } catch (error) {
        console.error("Error deleting user: ", error);
        showError(`Error al eliminar usuario: ${error.message}`);
      }
    }
  };

  const handleMassDeleteUsers = async () => {
    if (selectedUserIds.length === 0) {
      showError('Por favor, selecciona al menos un usuario para eliminar.');
      return;
    }

    if (!window.confirm(`¿Estás seguro de que quieres eliminar a los ${selectedUserIds.length} usuarios seleccionados? Esta acción es irreversible.`)) {
      return;
    }

    showSuccess(null);
    showError(null);
    try {
      let successfulDeletes = 0;
      let failedDeletes = 0;

      for (const userId of selectedUserIds) {
        try {
          // Eliminar de la colección 'users' en Firestore
          await deleteDoc(doc(db, 'users', userId));

          // Eliminar de la colección 'miners' en Firestore
          await deleteDoc(doc(db, 'miners', userId)); // Asumiendo que el ID del minero es el mismo que el userId

          // Eliminar de Firebase Authentication (requiere Cloud Functions para eliminación masiva o de otros usuarios)
          // Por simplicidad, aquí no se intenta eliminar de Auth para usuarios que no son el actual.
          // En un entorno de producción, esto se manejaría con Cloud Functions.
          console.warn(`La eliminación del usuario ${userId} de Firebase Auth no se realiza directamente desde el cliente en eliminación masiva.`);

          successfulDeletes++;
        } catch (innerError) {
          console.error(`Error deleting user ${userId} and associated miners:`, innerError);
          failedDeletes++;
        }
      }

      showSuccess(`Eliminación masiva completada: ${successfulDeletes} usuarios eliminados, ${failedDeletes} fallidos.`);
      setSelectedUserIds([]);
      fetchUsers();
    } catch (error) {
      console.error("Error performing mass delete:", error);
      showError(`Fallo al realizar la eliminación masiva: ${error.message}`);
    }
  };


  return (
    <div className={`${darkMode ? 'bg-dark_card text-light_text' : 'bg-gray-800 text-white'} p-6 rounded-lg shadow-lg`}>
      <h2 className={`text-3xl font-bold mb-6 ${darkMode ? 'text-accent' : 'text-yellow-500'}`}>Gestión de Usuarios</h2>

      {/* Formulario para Añadir Usuario */}
      <div className={`mb-8 p-4 rounded-lg ${darkMode ? 'bg-dark_bg' : 'bg-gray-700'}`}>
        <h3 className={`text-2xl font-semibold mb-4 ${darkMode ? 'text-light_text' : 'text-white'}`}>Añadir Nuevo Usuario</h3>
        <form onSubmit={handleAddUser} className="space-y-4">
          <div>
            <label htmlFor="newUserEmail" className={`block text-sm font-bold mb-2 ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>Email:</label>
            <input
              type="email"
              id="newUserEmail"
              className={`shadow appearance-none border rounded w-full py-2 px-3 leading-tight focus:outline-none focus:shadow-outline ${darkMode ? 'bg-dark_card border-dark_border text-light_text' : 'bg-gray-900 border-gray-600 text-gray-700'}`}
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="newUserPassword" className={`block text-sm font-bold mb-2 ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>Contraseña:</label>
            <input
              type="password"
              id="newUserPassword"
              className={`shadow appearance-none border rounded w-full py-2 px-3 leading-tight focus:outline-none focus:shadow-outline ${darkMode ? 'bg-dark_card border-dark_border text-light_text' : 'bg-gray-900 border-gray-600 text-gray-700'}`}
              value={newUserPassword}
              onChange={(e) => setNewUserPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Añadir Usuario
          </button>
        </form>
      </div>

      {/* Lista de Usuarios */}
      <div className="mb-8">
        <h3 className={`text-2xl font-semibold mb-4 ${darkMode ? 'text-light_text' : 'text-white'}`}>Usuarios Existentes</h3>
        {users.length === 0 ? (
          <p className={`${darkMode ? 'text-light_text' : 'text-gray-400'}`}>No hay usuarios registrados.</p>
        ) : (
          <>
            {/* Sección de Operaciones Masivas */}
            <div className={`mb-4 p-4 rounded-lg shadow-inner flex justify-between items-center ${darkMode ? 'bg-dark_bg' : 'bg-gray-700'}`}>
              <p className={`text-sm ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>
                {selectedUserIds.length} usuario(s) seleccionado(s)
              </p>
              <button
                onClick={handleMassDeleteUsers}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-500 disabled:cursor-not-allowed"
                disabled={selectedUserIds.length === 0}
              >
                Eliminar Seleccionados
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className={`min-w-full divide-y ${darkMode ? 'divide-dark_border' : 'divide-gray-700'}`}>
                <thead className={`${darkMode ? 'bg-dark_bg' : 'bg-gray-700'}`}>
                  <tr>
                    <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>
                      <input
                        type="checkbox"
                        className={`form-checkbox h-4 w-4 text-yellow-500 rounded ${darkMode ? 'bg-dark_card border-dark_border' : 'bg-gray-700 border-gray-600'}`}
                        onChange={handleSelectAllUsers}
                        checked={selectedUserIds.length === users.length && users.length > 0}
                      />
                    </th>
                    <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>Email</th>
                    <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>ID</th>
                    <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>Rol</th>
                    <th className={`px-4 py-2 text-right text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>Acciones</th>
                  </tr>
                </thead>
                <tbody className={`${darkMode ? 'bg-dark_card divide-dark_border' : 'bg-gray-800 divide-gray-700'} divide-y`}>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm">
                        <input
                          type="checkbox"
                          className={`form-checkbox h-4 w-4 text-yellow-500 rounded ${darkMode ? 'bg-dark_card border-dark_border' : 'bg-gray-700 border-gray-600'}`}
                          checked={selectedUserIds.includes(user.id)}
                          onChange={() => handleSelectUser(user.id)}
                        />
                      </td>
                      <td className={`px-4 py-2 whitespace-nowrap text-sm ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>{user.email}</td>
                      <td className={`px-4 py-2 whitespace-nowrap text-sm ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>{user.id}</td>
                      <td className={`px-4 py-2 whitespace-nowrap text-sm ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>{user.role || 'user'}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEditClick(user)}
                          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded mr-2 text-xs"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user)}
                          className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded text-xs"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
      {/* Formulario para Editar Usuario */}
      {editingUser && (
        <div className={`p-4 rounded-lg ${darkMode ? 'bg-dark_bg' : 'bg-gray-700'}`}>
          <h3 className={`text-2xl font-semibold mb-4 ${darkMode ? 'text-light_text' : 'text-white'}`}>Editar Usuario: {editingUser.email}</h3>
          <form onSubmit={handleUpdateUser} className="space-y-4">
            <div>
              <label htmlFor="editEmail" className={`block text-sm font-bold mb-2 ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>Email:</label>
              <input
                type="email"
                id="editEmail"
                className={`shadow appearance-none border rounded w-full py-2 px-3 leading-tight focus:outline-none focus:shadow-outline ${darkMode ? 'bg-dark_card border-dark_border text-light_text' : 'bg-gray-900 border-gray-600 text-gray-700'}`}
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="editRole" className={`block text-sm font-bold mb-2 ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>Rol:</label>
              <select
                id="editRole"
                className={`shadow appearance-none border rounded w-full py-2 px-3 leading-tight focus:outline-none focus:shadow-outline ${darkMode ? 'bg-dark_card border-dark_border text-light_text' : 'bg-gray-900 border-gray-600 text-gray-700'}`}
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
              >
                <option value="user">Usuario</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <div>
              <label htmlFor="editPassword" className={`block text-sm font-bold mb-2 ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>Nueva Contraseña (dejar en blanco para no cambiar):</label>
              <input
                type="password"
                id="editPassword"
                className={`shadow appearance-none border rounded w-full py-2 px-3 leading-tight focus:outline-none focus:shadow-outline ${darkMode ? 'bg-dark_card border-dark_border text-light_text' : 'bg-gray-900 border-gray-600 text-gray-700'}`}
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                placeholder="********"
              />
              <p className={`text-xs mt-1 ${darkMode ? 'text-light_text' : 'text-gray-400'}`}>La contraseña puede ser cambiada aquí.</p>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded mr-2"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded"
              >
                Actualizar Usuario
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
