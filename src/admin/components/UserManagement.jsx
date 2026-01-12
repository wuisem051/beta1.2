import React, { useState, useEffect } from 'react'; // Importar React y hooks necesarios
import { db, auth } from '../../services/firebase'; // Importar la instancia de Firebase Firestore y Auth
import { collection, query, onSnapshot, doc, getDoc, setDoc, updateDoc, deleteDoc, where, getDocs } from 'firebase/firestore';
import { createUserWithEmailAndPassword, updateEmail, updatePassword, deleteUser, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { ThemeContext } from '../../context/ThemeContext'; // Importar ThemeContext
import { useError } from '../../context/ErrorContext'; // Importar useError

const UserManagement = () => {
  const { showError, showSuccess } = useError(); // Usar el contexto de errores
  const [users, setUsers] = useState([]);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('user');
  const [editingUser, setEditingUser] = useState(null);
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editBalanceUSD, setEditBalanceUSD] = useState(0);
  const [editBalanceBTC, setEditBalanceBTC] = useState(0);
  const [editBalanceLTC, setEditBalanceLTC] = useState(0);
  const [editBalanceDOGE, setEditBalanceDOGE] = useState(0);
  const [editBalanceUSDTTRC20, setEditBalanceUSDTTRC20] = useState(0); // Corregido a balanceUSDTTRC20
  const [editBalanceTRX, setEditBalanceTRX] = useState(0); // Añadido TRX
  const [editBalanceVES, setEditBalanceVES] = useState(0); // Nuevo estado para VES
  const [addUSDTAmount, setAddUSDTAmount] = useState(''); // Estado para añadir/restar USDT
  const [addTRXAmount, setAddTRXAmount] = useState(''); // Estado para añadir/restar TRX
  const [addVESAmount, setAddVESAmount] = useState(''); // Estado para añadir/restar VES
  const [addBTCAmount, setAddBTCAmount] = useState('');
  const [addLTCAmount, setAddLTCAmount] = useState('');
  const [addDOGEAmount, setAddDOGEAmount] = useState('');
  const [editVipStatus, setEditVipStatus] = useState(''); // Nuevo estado para VIP Status
  const [editVipExpiry, setEditVipExpiry] = useState(''); // Nuevo estado para VIP Expiry
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
        balanceBTC: 0,
        balanceLTC: 0,
        balanceDOGE: 0,
        balanceVES: 0,
        balanceUSDTTRC20: 0,
        balanceTRX: 0,
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
    setEditBalanceUSD(user.balanceUSD || 0);
    setEditBalanceBTC(user.balanceBTC || 0);
    setEditBalanceLTC(user.balanceLTC || 0);
    setEditBalanceDOGE(user.balanceDOGE || 0);
    setEditBalanceUSDTTRC20(user.balanceUSDTTRC20 || 0); // Corregido field name
    setEditBalanceTRX(user.balanceTRX || 0); // Inicializar TRX
    setEditBalanceVES(user.balanceVES || 0); // Inicializar VES
    setAddUSDTAmount(''); // Resetear al abrir edición
    setAddTRXAmount(''); // Resetear al abrir edición
    setAddVESAmount(''); // Resetear al abrir edición
    setAddBTCAmount('');
    setAddLTCAmount('');
    setAddDOGEAmount('');
    setEditVipStatus(user.vipStatus || 'none');
    setEditVipExpiry(user.vipExpiry ? (user.vipExpiry.toDate ? user.vipExpiry.toDate().toISOString().substring(0, 10) : user.vipExpiry.substring(0, 10)) : '');
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
        balanceBTC: parseFloat(editBalanceBTC) + (addBTCAmount !== '' ? parseFloat(addBTCAmount) : 0),
        balanceLTC: parseFloat(editBalanceLTC) + (addLTCAmount !== '' ? parseFloat(addLTCAmount) : 0),
        balanceDOGE: parseFloat(editBalanceDOGE) + (addDOGEAmount !== '' ? parseFloat(addDOGEAmount) : 0),
        balanceUSDTTRC20: parseFloat(editBalanceUSDTTRC20) + (addUSDTAmount !== '' ? parseFloat(addUSDTAmount) : 0),
        balanceTRX: parseFloat(editBalanceTRX) + (addTRXAmount !== '' ? parseFloat(addTRXAmount) : 0),
        balanceVES: parseFloat(editBalanceVES) + (addVESAmount !== '' ? parseFloat(addVESAmount) : 0),
        vipStatus: editVipStatus,
        vipExpiry: editVipExpiry ? new Date(editVipExpiry) : null,
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
    <div className="p-6 rounded-2xl shadow-xl space-y-8" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>
      <div className="flex justify-between items-center border-b border-slate-700 pb-4">
        <h2 className="text-3xl font-bold text-white flex items-center gap-2">
          <span className="bg-blue-500/10 p-2 rounded-lg text-lg">👥</span>
          Gestión de Usuarios
        </h2>
      </div>

      {/* Formulario para Añadir Usuario */}
      <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 shadow-lg">
        <h3 className="text-xl font-semibold text-blue-400 mb-6 flex items-center gap-2">
          <span className="bg-blue-500/10 p-2 rounded-lg">👤</span>
          Añadir Nuevo Usuario
        </h3>
        <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="newUserEmail" className="text-sm font-medium text-slate-400">Email</label>
            <input
              type="email"
              id="newUserEmail"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all placeholder:text-slate-600"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="newUserPassword" className="text-sm font-medium text-slate-400">Contraseña</label>
            <input
              type="password"
              id="newUserPassword"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all placeholder:text-slate-600"
              value={newUserPassword}
              onChange={(e) => setNewUserPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            className="md:col-span-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-6 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
          >
            🚀 Crear Usuario
          </button>
        </form>
      </div>

      {/* Lista de Usuarios */}
      <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 shadow-lg">
        <h3 className="text-xl font-semibold text-blue-400 mb-6 flex items-center gap-2">
          <span className="bg-blue-500/10 p-2 rounded-lg">📋</span>
          Usuarios Existentes
        </h3>
        {users.length === 0 ? (
          <p className="text-center text-slate-500 py-8 italic">No hay usuarios registrados.</p>
        ) : (
          <>
            {/* Sección de Operaciones Masivas */}
            <div className="mb-6 p-4 rounded-xl bg-slate-900/50 border border-slate-700 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-xs font-bold ring-1 ring-blue-500/30">
                  {selectedUserIds.length} usuario(s) seleccionado(s)
                </span>
              </div>
              <button
                onClick={handleMassDeleteUsers}
                className="bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white border border-red-600/30 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={selectedUserIds.length === 0}
              >
                🗑️ Eliminar Seleccionados
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-700">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/50">
                    <th className="px-6 py-4 border-b border-slate-700">
                      <input
                        type="checkbox"
                        className="form-checkbox h-4 w-4 text-blue-500 bg-slate-900 border-slate-700 rounded transition-all cursor-pointer"
                        onChange={handleSelectAllUsers}
                        checked={selectedUserIds.length === users.length && users.length > 0}
                      />
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">Email</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">ID Usuario</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">Rol</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">VIP Status</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          className="form-checkbox h-4 w-4 text-blue-500 bg-slate-900 border-slate-700 rounded transition-all cursor-pointer"
                          checked={selectedUserIds.includes(user.id)}
                          onChange={() => handleSelectUser(user.id)}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{user.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 font-mono text-xs">{user.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${user.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-700'}`}>
                          {user.role || 'user'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {user.vipStatus && user.vipStatus !== 'none' ? (
                          <div className="flex flex-col">
                            <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase w-fit">
                              {user.vipStatus}
                            </span>
                            <span className="text-[10px] text-slate-500 mt-1">
                              EXP: {user.vipExpiry ? (user.vipExpiry.toDate ? user.vipExpiry.toDate().toLocaleDateString() : new Date(user.vipExpiry).toLocaleDateString()) : 'N/A'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-600 text-[10px] uppercase font-bold italic">Básico</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEditClick(user)}
                            className="bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-bold border border-blue-600/30 transition-all"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user)}
                            className="bg-red-900/30 hover:bg-red-900 text-red-400 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                          >
                            Eliminar
                          </button>
                        </div>
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
        <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl p-8 border border-slate-700 shadow-2xl space-y-6">
          <div className="flex justify-between items-center border-b border-slate-700 pb-4">
            <h3 className="text-2xl font-bold text-white flex items-center gap-2">
              <span className="bg-blue-500/10 p-2 rounded-lg text-lg">✏️</span>
              Editar Usuario: <span className="text-blue-400">{editingUser.email}</span>
            </h3>
            <button onClick={() => setEditingUser(null)} className="text-slate-500 hover:text-white transition-colors">✕</button>
          </div>

          <form onSubmit={handleUpdateUser} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="editEmail" className="text-sm font-medium text-slate-400">Email</label>
              <input
                type="email"
                id="editEmail"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="editRole" className="text-sm font-medium text-slate-400">Rol de Usuario</label>
              <select
                id="editRole"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
              >
                <option value="user">Usuario Estándar</option>
                <option value="admin">Administrador del Sitio</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label htmlFor="editPassword" className="text-sm font-medium text-slate-400">Nueva Contraseña (Opcional)</label>
              <input
                type="password"
                id="editPassword"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all placeholder:text-slate-600"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                placeholder="Dejar en blanco para mantener la actual"
              />
            </div>

            <div className="md:col-span-2 border-t border-slate-700 pt-6 mt-2">
              <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Gestión de Balances y VIP</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label htmlFor="addUSDTAmount" className="text-xs font-bold text-slate-400">Modificar Saldo USDT</label>
                  <input
                    type="number"
                    id="addUSDTAmount"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-green-500/50 outline-none transition-all text-sm"
                    value={addUSDTAmount}
                    onChange={(e) => setAddUSDTAmount(e.target.value)}
                    placeholder="Ej: 50 o -25"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="addTRXAmount" className="text-xs font-bold text-slate-400">Modificar Saldo TRX</label>
                  <input
                    type="number"
                    id="addTRXAmount"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all text-sm"
                    value={addTRXAmount}
                    onChange={(e) => setAddTRXAmount(e.target.value)}
                    placeholder="Ej: 10"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="addVESAmount" className="text-xs font-bold text-slate-400">Modificar Saldo VES</label>
                  <input
                    type="number"
                    id="addVESAmount"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-green-500/50 outline-none transition-all text-sm"
                    value={addVESAmount}
                    onChange={(e) => setAddVESAmount(e.target.value)}
                    placeholder="Ej: 1000"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="addBTCAmount" className="text-xs font-bold text-slate-400">Modificar Saldo BTC</label>
                  <input
                    type="number"
                    id="addBTCAmount"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-amber-500/50 outline-none transition-all text-sm"
                    value={addBTCAmount}
                    onChange={(e) => setAddBTCAmount(e.target.value)}
                    placeholder="Ej: 0.001"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="addLTCAmount" className="text-xs font-bold text-slate-400">Modificar Saldo LTC</label>
                  <input
                    type="number"
                    id="addLTCAmount"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-400/50 outline-none transition-all text-sm"
                    value={addLTCAmount}
                    onChange={(e) => setAddLTCAmount(e.target.value)}
                    placeholder="Ej: 1"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="addDOGEAmount" className="text-xs font-bold text-slate-400">Modificar Saldo DOGE</label>
                  <input
                    type="number"
                    id="addDOGEAmount"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-yellow-500/50 outline-none transition-all text-sm"
                    value={addDOGEAmount}
                    onChange={(e) => setAddDOGEAmount(e.target.value)}
                    placeholder="Ej: 100"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="editVipStatus" className="text-xs font-bold text-slate-400">Plan VIP</label>
                  <select
                    id="editVipStatus"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-amber-500/50 outline-none transition-all text-sm"
                    value={editVipStatus}
                    onChange={(e) => setEditVipStatus(e.target.value)}
                  >
                    <option value="none">Ninguno</option>
                    <option value="vip-standard">VIP Bronze</option>
                    <option value="vip-gold">VIP Gold</option>
                    <option value="vip-diamond">VIP Diamond</option>
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label htmlFor="editVipExpiry" className="text-xs font-bold text-slate-400">Fecha de Expiración VIP</label>
                  <input
                    type="date"
                    id="editVipExpiry"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-amber-500/50 outline-none transition-all text-sm"
                    value={editVipExpiry}
                    onChange={(e) => setEditVipExpiry(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="md:col-span-2 flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-8 rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-10 rounded-xl shadow-lg shadow-blue-900/20 transition-all"
              >
                💾 Guardar Cambios
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
