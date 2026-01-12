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
  const [addUSDAmount, setAddUSDAmount] = useState(''); // Estado para añadir/restar USD General
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
    setAddUSDAmount(''); // Resetear USD General
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
        balanceUSD: parseFloat(editBalanceUSD) + (addUSDAmount !== '' ? parseFloat(addUSDAmount) : 0),
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
    <div className="p-8 md:p-12 min-h-screen bg-[#020617] text-slate-200 space-y-12 relative overflow-hidden">
      {/* Background Decorative Glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/5 pb-8 relative z-10">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tight flex items-center gap-4">
            <span className="bg-blue-600 w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-xl shadow-blue-500/20">👥</span>
            Gestión Elite de Usuarios
          </h2>
          <p className="text-slate-500 font-bold mt-2 uppercase tracking-[0.2em] text-[10px]">Control total de suscripciones, balances y membresías VIP</p>
        </div>
      </div>

      {/* Formulario para Añadir Usuario */}
      <div className="bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-10 border border-white/5 shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

        <h3 className="text-xl font-black text-white mb-8 flex items-center gap-3 relative z-10">
          <span className="w-8 h-8 bg-blue-500/10 rounded-xl flex items-center justify-center text-sm text-blue-400">👤</span>
          Registrar Nuevo Socio VIP
        </h3>

        <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
          <div className="space-y-3">
            <label htmlFor="newUserEmail" className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Dirección de Email</label>
            <input
              type="email"
              id="newUserEmail"
              className="w-full bg-slate-950/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-700 shadow-inner"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              placeholder="socio@elite-trading.com"
              required
            />
          </div>
          <div className="space-y-3">
            <label htmlFor="newUserPassword" className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Contraseña de Acceso</label>
            <input
              type="password"
              id="newUserPassword"
              className="w-full bg-slate-950/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-700 shadow-inner"
              value={newUserPassword}
              onChange={(e) => setNewUserPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 px-8 rounded-2xl shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center gap-3 uppercase text-[10px] tracking-[0.2em] border border-blue-400/30 transform active:scale-95"
            >
              🚀 Crear Cuenta Elite
            </button>
          </div>
        </form>
      </div>

      {/* Lista de Usuarios */}
      <div className="bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-10 border border-white/5 shadow-2xl relative">
        <h3 className="text-xl font-black text-white mb-8 flex items-center gap-3">
          <span className="w-8 h-8 bg-blue-500/10 rounded-xl flex items-center justify-center text-sm text-blue-400">📋</span>
          Directorio de Usuarios Activos
        </h3>
        {users.length === 0 ? (
          <p className="text-center text-slate-500 py-8 italic">No hay usuarios registrados.</p>
        ) : (
          <>
            {/* Sección de Operaciones Masivas */}
            <div className="mb-6 p-4 rounded-2xl bg-slate-900/40 backdrop-blur-md border border-white/5 flex flex-wrap justify-between items-center gap-4 shadow-xl">
              <div className="flex items-center gap-4">
                <div className="flex -space-x-2">
                  {selectedUserIds.slice(0, 3).map(id => (
                    <div key={id} className="w-8 h-8 rounded-full bg-blue-600 border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold">
                      {users.find(u => u.id === id)?.email[0].toUpperCase()}
                    </div>
                  ))}
                  {selectedUserIds.length > 3 && (
                    <div className="w-8 h-8 rounded-full bg-slate-700 border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold">
                      +{selectedUserIds.length - 3}
                    </div>
                  )}
                </div>
                <span className="text-sm font-bold text-slate-300">
                  {selectedUserIds.length} Usuarios Seleccionados
                </span>
              </div>
              <button
                onClick={handleMassDeleteUsers}
                className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 px-6 py-2.5 rounded-xl text-xs font-black transition-all disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-wider"
                disabled={selectedUserIds.length === 0}
              >
                Eliminar Permanentemente
              </button>
            </div>

            <div className="overflow-x-auto rounded-[2rem] border border-white/5 bg-slate-900/20 backdrop-blur-sm shadow-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/50">
                    <th className="px-8 py-6">
                      <input
                        type="checkbox"
                        className="form-checkbox h-5 w-5 text-blue-500 bg-slate-900 border-white/10 rounded-lg transition-all cursor-pointer focus:ring-offset-slate-900"
                        onChange={handleSelectAllUsers}
                        checked={selectedUserIds.length === users.length && users.length > 0}
                      />
                    </th>
                    <th className="px-6 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Identidad y Rol</th>
                    <th className="px-6 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Suscripción VIP</th>
                    <th className="px-6 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Balances Principales</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-8 py-6">
                        <input
                          type="checkbox"
                          className="form-checkbox h-5 w-5 text-blue-500 bg-slate-900 border-white/10 rounded-lg transition-all cursor-pointer focus:ring-offset-slate-900"
                          checked={selectedUserIds.includes(user.id)}
                          onChange={() => handleSelectUser(user.id)}
                        />
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{user.email}</span>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${user.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.1)]' : 'bg-slate-500/10 text-slate-500 border-slate-700'}`}>
                              {user.role || 'user'}
                            </span>
                            <span className="text-[10px] text-slate-600 font-mono italic">#{user.id.substring(0, 8)}...</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        {user.vipStatus && user.vipStatus !== 'none' ? (
                          <div className="flex flex-col gap-1.5">
                            <span className="bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-lg shadow-amber-500/10 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter w-fit border border-amber-400/30">
                              ⭐ {user.vipStatus}
                            </span>
                            <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-bold px-1">
                              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                              ACTIVO HASTA: {user.vipExpiry ? (user.vipExpiry.toDate ? user.vipExpiry.toDate().toLocaleDateString() : new Date(user.vipExpiry).toLocaleDateString()) : 'N/A'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-600 text-[10px] uppercase font-black tracking-widest bg-slate-800/50 px-3 py-1.5 rounded-xl border border-white/5">Básico</span>
                        )}
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex flex-wrap gap-2">
                          <div className="flex items-center gap-1.5 bg-blue-500/5 border border-blue-500/10 px-2 py-1 rounded-lg">
                            <span className="text-[10px]">💵</span>
                            <span className="text-blue-400 text-xs font-black">${(user.balanceUSD || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-1.5 bg-green-500/5 border border-green-500/10 px-2 py-1 rounded-lg">
                            <span className="text-[10px]">₮</span>
                            <span className="text-green-400 text-xs font-black">${(user.balanceUSDTTRC20 || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-1.5 bg-amber-500/5 border border-amber-500/10 px-2 py-1 rounded-lg">
                            <span className="text-[10px]">₿</span>
                            <span className="text-amber-500 text-xs font-black">{(user.balanceBTC || 0).toFixed(6)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-3 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEditClick(user)}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all border border-blue-400/30"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user)}
                            className="bg-slate-800 hover:bg-red-600 text-slate-400 hover:text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/5 transition-all"
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-[0_32px_128px_-12px_rgba(0,0,0,0.8)] relative group overflow-x-hidden">
            {/* Glow decorativo */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none group-hover:bg-blue-600/20 transition-all duration-700"></div>

            <div className="p-8 md:p-12 space-y-10">
              <div className="flex justify-between items-start border-b border-white/5 pb-8">
                <div>
                  <h3 className="text-3xl font-black text-white tracking-tight flex items-center gap-4">
                    <span className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-xl shadow-lg shadow-blue-500/20">✏️</span>
                    Configuración de Usuario
                  </h3>
                  <p className="text-slate-500 font-bold mt-2 uppercase tracking-[0.15em] text-[10px]">Editando: <span className="text-blue-400">{editingUser.email}</span></p>
                </div>
                <button
                  onClick={() => setEditingUser(null)}
                  className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all border border-white/5"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleUpdateUser} className="space-y-12">
                {/* Información Básica */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Email de Acceso</label>
                    <input
                      type="email"
                      className="w-full bg-slate-950/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-700 shadow-inner"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Rol Administrativo</label>
                    <div className="relative">
                      <select
                        className="w-full bg-slate-950/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none shadow-inner"
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                      >
                        <option value="user">Usuario Estándar</option>
                        <option value="admin">Administrador del Sitio</option>
                      </select>
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">▼</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Seguridad (Password)</label>
                    <input
                      type="password"
                      className="w-full bg-slate-950/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-700 shadow-inner"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder="Dejar vacío para no cambiar"
                    />
                  </div>
                </div>

                {/* Gestión de Balances Dinámica */}
                <div className="space-y-8">
                  <div className="flex items-center gap-4">
                    <h4 className="text-xs font-black text-white uppercase tracking-[0.2em] whitespace-nowrap">Gestión de Tesorería</h4>
                    <div className="h-px bg-white/5 w-full"></div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* USD General */}
                    <div className="bg-slate-950/50 p-6 rounded-[2rem] border border-blue-500/20 group/card hover:border-blue-500/40 transition-all shadow-xl">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-2xl">💵</span>
                        <div className="text-right">
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Saldo USD actual</p>
                          <p className="text-sm font-black text-blue-400">${editBalanceUSD.toLocaleString()}</p>
                        </div>
                      </div>
                      <input
                        type="number"
                        className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-white font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all text-xs"
                        value={addUSDAmount}
                        onChange={(e) => setAddUSDAmount(e.target.value)}
                        placeholder="± Añadir/Restar"
                      />
                    </div>

                    {/* USDT */}
                    <div className="bg-slate-950/50 p-6 rounded-[2rem] border border-green-500/20 group/card hover:border-green-500/40 transition-all shadow-xl">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-2xl">₮</span>
                        <div className="text-right">
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Saldo USDT actual</p>
                          <p className="text-sm font-black text-green-400">${editBalanceUSDTTRC20.toLocaleString()}</p>
                        </div>
                      </div>
                      <input
                        type="number"
                        className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-white font-bold focus:ring-2 focus:ring-green-500 outline-none transition-all text-xs"
                        value={addUSDTAmount}
                        onChange={(e) => setAddUSDTAmount(e.target.value)}
                        placeholder="± Añadir/Restar"
                      />
                    </div>

                    {/* BTC */}
                    <div className="bg-slate-950/50 p-6 rounded-[2rem] border-amber-500/20 group/card border hover:border-amber-500/40 transition-all shadow-xl">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-2xl">₿</span>
                        <div className="text-right">
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Saldo BTC actual</p>
                          <p className="text-sm font-black text-amber-500">{editBalanceBTC.toFixed(6)}</p>
                        </div>
                      </div>
                      <input
                        type="number"
                        className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-white font-bold focus:ring-2 focus:ring-amber-500 outline-none transition-all text-xs"
                        value={addBTCAmount}
                        onChange={(e) => setAddBTCAmount(e.target.value)}
                        placeholder="± Añadir/Restar"
                      />
                    </div>

                    {/* TRX */}
                    <div className="bg-slate-950/50 p-6 rounded-[2rem] border-red-500/20 group/card border hover:border-red-500/40 transition-all shadow-xl">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-2xl">⚡</span>
                        <div className="text-right">
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Saldo TRX actual</p>
                          <p className="text-sm font-black text-red-500">{editBalanceTRX.toLocaleString()}</p>
                        </div>
                      </div>
                      <input
                        type="number"
                        className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-white font-bold focus:ring-2 focus:ring-red-500 outline-none transition-all text-xs"
                        value={addTRXAmount}
                        onChange={(e) => setAddTRXAmount(e.target.value)}
                        placeholder="± Añadir/Restar"
                      />
                    </div>
                  </div>

                  {/* Segunda Fila de Balances */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* VES */}
                    <div className="bg-slate-950/50 p-6 rounded-[2rem] border-blue-400/10 group/card border hover:border-blue-400/30 transition-all shadow-xl">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-2xl">🇻🇪</span>
                        <div className="text-right">
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Saldo VES actual</p>
                          <p className="text-sm font-black text-blue-300">{editBalanceVES.toLocaleString()} BS</p>
                        </div>
                      </div>
                      <input
                        type="number"
                        className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-white font-bold focus:ring-2 focus:ring-blue-400 outline-none transition-all text-xs"
                        value={addVESAmount}
                        onChange={(e) => setAddVESAmount(e.target.value)}
                        placeholder="± Añadir/Restar"
                      />
                    </div>

                    {/* LTC */}
                    <div className="bg-slate-950/50 p-6 rounded-[2rem] border-blue-400/10 group/card border hover:border-blue-400/30 transition-all shadow-xl">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-2xl">Ł</span>
                        <div className="text-right">
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Saldo LTC actual</p>
                          <p className="text-sm font-black text-slate-300">{editBalanceLTC.toFixed(6)}</p>
                        </div>
                      </div>
                      <input
                        type="number"
                        className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-white font-bold focus:ring-2 focus:ring-slate-400 outline-none transition-all text-xs"
                        value={addLTCAmount}
                        onChange={(e) => setAddLTCAmount(e.target.value)}
                        placeholder="± Añadir/Restar"
                      />
                    </div>

                    {/* DOGE */}
                    <div className="bg-slate-950/50 p-6 rounded-[2rem] border-yellow-500/10 group/card border hover:border-yellow-500/30 transition-all shadow-xl">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-2xl">🐕</span>
                        <div className="text-right">
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Saldo DOGE actual</p>
                          <p className="text-sm font-black text-yellow-500">{editBalanceDOGE.toLocaleString()}</p>
                        </div>
                      </div>
                      <input
                        type="number"
                        className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-white font-bold focus:ring-2 focus:ring-yellow-500 outline-none transition-all text-xs"
                        value={addDOGEAmount}
                        onChange={(e) => setAddDOGEAmount(e.target.value)}
                        placeholder="± Añadir/Restar"
                      />
                    </div>
                  </div>
                </div>

                {/* Status VIP */}
                <div className="space-y-8">
                  <div className="flex items-center gap-4">
                    <h4 className="text-xs font-black text-white uppercase tracking-[0.2em] whitespace-nowrap">Exclusividad VIP</h4>
                    <div className="h-px bg-white/5 w-full"></div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-amber-500/[0.03] p-8 rounded-[2rem] border border-amber-500/10">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-amber-500/70 uppercase tracking-widest px-1">Plan de Suscripción</label>
                      <select
                        className="w-full bg-slate-950/50 border border-amber-500/20 rounded-2xl px-6 py-4 text-white font-bold focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all"
                        value={editVipStatus}
                        onChange={(e) => setEditVipStatus(e.target.value)}
                      >
                        <option value="none">Ninguno (Básico)</option>
                        <option value="vip-standard">Elite Bronze</option>
                        <option value="vip-gold">Elite Gold</option>
                        <option value="vip-diamond">Elite Diamond</option>
                      </select>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-amber-500/70 uppercase tracking-widest px-1">Expiración del Servicio</label>
                      <input
                        type="date"
                        className="w-full bg-slate-950/50 border border-amber-500/20 rounded-2xl px-6 py-4 text-white font-bold focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all"
                        value={editVipExpiry}
                        onChange={(e) => setEditVipExpiry(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Acciones Finales */}
                <div className="flex flex-col md:flex-row justify-end gap-4 pt-8 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="w-full md:w-auto bg-slate-800 hover:bg-slate-700 text-slate-300 font-black py-4 px-10 rounded-2xl transition-all uppercase text-[10px] tracking-[0.2em]"
                  >
                    Cancelar Operación
                  </button>
                  <button
                    type="submit"
                    className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-black py-4 px-12 rounded-2xl shadow-2xl shadow-blue-500/20 transition-all uppercase text-[10px] tracking-[0.2em] transform active:scale-95 border border-blue-400/30"
                  >
                    💾 Confirmar Cambios
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
