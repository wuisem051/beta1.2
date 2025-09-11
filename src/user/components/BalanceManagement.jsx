import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase'; // Importar Firebase Firestore
import { collection, getDocs, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import { useError } from '../../context/ErrorContext'; // Importar useError

const BalanceManagement = () => {
  const { theme } = useTheme();
  const { showError, showSuccess } = useError(); // Usar el contexto de errores
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(''); // Para operaciones individuales
  const [selectedUserIds, setSelectedUserIds] = useState([]); // Para operaciones masivas
  const [amountToAdd, setAmountToAdd] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [massAmount, setMassAmount] = useState(''); // Cantidad para operaciones masivas
  const [massCurrency, setMassCurrency] = useState('USD'); // Moneda para operaciones masivas
  const [massOperation, setMassOperation] = useState('add'); // 'add', 'subtract', 'reset'

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const records = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsers(records);
      } catch (error) {
        console.error("Error fetching users from Firebase:", error);
        showError('Error al cargar la lista de usuarios.');
      }
    };

    fetchUsers();

    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      console.log("BalanceManagement: Firebase suscripción - Evento recibido.");
      const updatedUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(updatedUsers);
    }, (error) => {
      console.error("Error subscribing to users collection:", error);
      showError('Error al suscribirse a los cambios de usuarios.');
    });

    return () => {
      unsubscribe(); // Desuscribirse de los cambios de Firebase
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

  const handleAddBalance = async (e) => {
    e.preventDefault();
    showSuccess(null);
    showError(null);

    if (!selectedUserId) {
      showError('Por favor, selecciona un usuario.');
      return;
    }
    const amount = parseFloat(amountToAdd);
    if (isNaN(amount) || amount <= 0) {
      showError('Por favor, introduce una cantidad válida y positiva.');
      return;
    }

    try {
      const selectedUser = users.find(user => user.id === selectedUserId);
      
      if (selectedUser) {
        const currencyField = `balance${selectedCurrency}`;
        const currentBalance = selectedUser[currencyField] || 0;
        const newBalance = currentBalance + amount;
        
        const userRef = doc(db, 'users', selectedUserId);
        await updateDoc(userRef, { [currencyField]: newBalance });

        showSuccess(`Se han añadido ${amount.toFixed(8)} ${selectedCurrency} al balance de ${selectedUser.email}. Nuevo balance: ${newBalance.toFixed(8)} ${selectedCurrency}`);
        setAmountToAdd('');
      } else {
        showError('Usuario no encontrado.');
      }
    } catch (err) {
      console.error("Error adding balance to Firebase:", err);
      showError(`Fallo al añadir balance: ${err.message}`);
    }
  };

  const handleSubtractBalance = async (e) => {
    e.preventDefault();
    showSuccess(null);
    showError(null);

    if (!selectedUserId) {
      showError('Por favor, selecciona un usuario.');
      return;
    }
    const amount = parseFloat(amountToAdd);
    if (isNaN(amount) || amount <= 0) {
      showError('Por favor, introduce una cantidad válida y positiva para restar.');
      return;
    }

    try {
      const selectedUser = users.find(user => user.id === selectedUserId);
      
      if (selectedUser) {
        const currencyField = `balance${selectedCurrency}`;
        const currentBalance = selectedUser[currencyField] || 0;
        if (currentBalance < amount) {
          showError(`No se puede restar una cantidad mayor al balance actual en ${selectedCurrency}.`);
          return;
        }
        const newBalance = currentBalance - amount;
        
        const userRef = doc(db, 'users', selectedUserId);
        await updateDoc(userRef, { [currencyField]: newBalance });

        showSuccess(`Se han restado ${amount.toFixed(8)} ${selectedCurrency} del balance de ${selectedUser.email}. Nuevo balance: ${newBalance.toFixed(8)} ${selectedCurrency}`);
        setAmountToAdd('');
      } else {
        showError('Usuario no encontrado.');
      }
    } catch (err) {
      console.error("Error subtracting balance from Firebase:", err);
      showError(`Fallo al restar balance: ${err.message}`);
    }
  };

  const handleMassBalanceUpdate = async () => {
    showSuccess(null);
    showError(null);

    if (selectedUserIds.length === 0) {
      showError('Por favor, selecciona al menos un usuario para la operación masiva.');
      return;
    }

    const amount = parseFloat(massAmount);
    if (massOperation !== 'reset' && (isNaN(amount) || amount <= 0)) {
      showError('Por favor, introduce una cantidad válida y positiva para la operación masiva.');
      return;
    }

    try {
      let successfulUpdates = 0;
      let failedUpdates = 0;

      for (const userId of selectedUserIds) {
        const userDoc = users.find(u => u.id === userId);

        if (!userDoc) {
          console.warn(`Usuario con ID ${userId} no encontrado, saltando.`);
          failedUpdates++;
          continue;
        }

        const currencyField = `balance${massCurrency}`;
        let newBalance = 0;

        if (massOperation === 'reset') {
          newBalance = 0;
        } else {
          const currentBalance = userDoc[currencyField] || 0;
          if (massOperation === 'add') {
            newBalance = currentBalance + amount;
          } else if (massOperation === 'subtract') {
            if (currentBalance < amount) {
              console.warn(`No se puede restar ${amount} de ${userDoc.email} (${currentBalance} ${massCurrency}). Saldo insuficiente.`);
              failedUpdates++;
              continue;
            }
            newBalance = currentBalance - amount;
          }
        }
        
        try {
          const userRef = doc(db, 'users', userId);
          await updateDoc(userRef, { [currencyField]: newBalance });
          successfulUpdates++;
        } catch (updateError) {
          console.error(`Error updating balance for user ${userId}:`, updateError);
          failedUpdates++;
        }
      }

      showSuccess(`Operación masiva completada: ${successfulUpdates} usuarios actualizados, ${failedUpdates} fallidos.`);
      setSelectedUserIds([]);
      setMassAmount('');
    } catch (err) {
      console.error("Error performing mass balance update in Firebase:", err);
      showError(`Fallo al realizar la operación masiva: ${err.message}`);
    }
  };

  return (
    <div className={`${theme.background} ${theme.text} p-6 rounded-lg shadow-md`}>
      <h2 className="text-2xl font-semibold mb-4">Gestión de Balance de Usuarios</h2>
      {/* Los mensajes de error y éxito ahora se manejan globalmente */}

      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-3">Añadir Balance</h3>
        <form onSubmit={handleAddBalance} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label htmlFor="userSelectAdd" className="block text-sm font-medium mb-1">Seleccionar Usuario:</label>
            <select
              id="userSelectAdd"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className={`${theme.inputBackground} ${theme.text} border-gray-600 rounded-md shadow-sm sm:text-sm p-2 w-full`}
            >
              <option value="">Selecciona un usuario</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>{user.email}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="currencySelectAdd" className="block text-sm font-medium mb-1">Moneda:</label>
            <select
              id="currencySelectAdd"
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              className={`${theme.inputBackground} ${theme.text} border-gray-600 rounded-md shadow-sm sm:text-sm p-2 w-full`}
            >
              <option value="USD">USD</option>
              <option value="BTC">BTC</option>
              <option value="LTC">LTC</option>
              <option value="DOGE">DOGE</option>
            </select>
          </div>
          <div>
            <label htmlFor="amountToAdd" className="block text-sm font-medium mb-1">Cantidad a Añadir ({selectedCurrency}):</label>
            <input
              type="number"
              id="amountToAdd"
              value={amountToAdd}
              onChange={(e) => setAmountToAdd(e.target.value)}
              step={selectedCurrency === 'USD' ? "0.01" : "0.00000001"}
              className={`${theme.inputBackground} ${theme.text} border-gray-600 rounded-md shadow-sm sm:text-sm p-2 w-full`}
              placeholder={`Ej: ${selectedCurrency === 'USD' ? '100.00' : '0.001'}`}
              required
            />
          </div>
          <div>
            <button
              type="submit"
              className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Añadir Balance
            </button>
          </div>
        </form>
      </div>

      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-3">Restar Balance</h3>
        <form onSubmit={handleSubtractBalance} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label htmlFor="userSelectSubtract" className="block text-sm font-medium mb-1">Seleccionar Usuario:</label>
            <select
              id="userSelectSubtract"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className={`${theme.inputBackground} ${theme.text} border-gray-600 rounded-md shadow-sm sm:text-sm p-2 w-full`}
            >
              <option value="">Selecciona un usuario</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>{user.email}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="currencySelectSubtract" className="block text-sm font-medium mb-1">Moneda:</label>
            <select
              id="currencySelectSubtract"
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              className={`${theme.inputBackground} ${theme.text} border-gray-600 rounded-md shadow-sm sm:text-sm p-2 w-full`}
            >
              <option value="USD">USD</option>
              <option value="BTC">BTC</option>
              <option value="LTC">LTC</option>
              <option value="DOGE">DOGE</option>
            </select>
          </div>
          <div>
            <label htmlFor="amountToSubtract" className="block text-sm font-medium mb-1">Cantidad a Restar ({selectedCurrency}):</label>
            <input
              type="number"
              id="amountToSubtract"
              value={amountToAdd}
              onChange={(e) => setAmountToAdd(e.target.value)}
              step={selectedCurrency === 'USD' ? "0.01" : "0.00000001"}
              className={`${theme.inputBackground} ${theme.text} border-gray-600 rounded-md shadow-sm sm:text-sm p-2 w-full`}
              placeholder={`Ej: ${selectedCurrency === 'USD' ? '50.00' : '0.0005'}`}
              required
            />
          </div>
          <div>
            <button
              type="submit"
              className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Restar Balance
            </button>
          </div>
        </form>
      </div>

      {/* Sección: Operaciones Masivas de Balance */}
      <div className={`mb-6 p-4 ${theme.backgroundAlt} rounded-lg shadow-inner`}>
        <h3 className="text-xl font-semibold mb-3">Operaciones Masivas de Balance</h3>
        <p className={`${theme.textSoft} text-sm mb-4`}>Aplica cambios de balance a los usuarios seleccionados en la tabla de abajo.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label htmlFor="massOperation" className="block text-sm font-medium mb-1">Operación:</label>
            <select
              id="massOperation"
              value={massOperation}
              onChange={(e) => setMassOperation(e.target.value)}
              className={`${theme.inputBackground} ${theme.text} border-gray-600 rounded-md shadow-sm sm:text-sm p-2 w-full`}
            >
              <option value="add">Añadir</option>
              <option value="subtract">Restar</option>
              <option value="reset">Resetear a 0</option>
            </select>
          </div>
          <div>
            <label htmlFor="massCurrency" className="block text-sm font-medium mb-1">Moneda:</label>
            <select
              id="massCurrency"
              value={massCurrency}
              onChange={(e) => setMassCurrency(e.target.value)}
              className={`${theme.inputBackground} ${theme.text} border-gray-600 rounded-md shadow-sm sm:text-sm p-2 w-full`}
              disabled={massOperation === 'reset'}
            >
              <option value="USD">USD</option>
              <option value="BTC">BTC</option>
              <option value="LTC">LTC</option>
              <option value="DOGE">DOGE</option>
            </select>
          </div>
          <div>
            <label htmlFor="massAmount" className="block text-sm font-medium mb-1">Cantidad ({massCurrency}):</label>
            <input
              type="number"
              id="massAmount"
              value={massAmount}
              onChange={(e) => setMassAmount(e.target.value)}
              step={massCurrency === 'USD' ? "0.01" : "0.00000001"}
              className={`${theme.inputBackground} ${theme.text} border-gray-600 rounded-md shadow-sm sm:text-sm p-2 w-full`}
              placeholder={`Ej: ${massCurrency === 'USD' ? '100.00' : '0.001'}`}
              disabled={massOperation === 'reset'}
              required={massOperation !== 'reset'}
            />
          </div>
          <div>
            <button
              onClick={handleMassBalanceUpdate}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed"
              disabled={selectedUserIds.length === 0}
            >
              Aplicar a {selectedUserIds.length} Usuarios
            </button>
          </div>
        </div>
        {selectedUserIds.length > 0 && (
          <p className={`${theme.textSoft} text-sm mt-3`}>Usuarios seleccionados: {selectedUserIds.length}</p>
        )}
      </div>

      <h3 className="text-xl font-semibold mb-3">Balances Actuales de Usuarios</h3>
      {users.length === 0 ? (
        <p className={`${theme.textSoft} text-center py-8`}>No hay usuarios registrados.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className={`min-w-full divide-y ${theme.borderColor}`}>
            <thead className={`${theme.tableHeaderBackground}`}>
              <tr>
                <th className={`px-6 py-3 text-left text-xs font-medium ${theme.textSoft} uppercase tracking-wider`}>
                  <input
                    type="checkbox"
                    className={`form-checkbox h-4 w-4 text-yellow-500 ${theme.inputBackground} ${theme.borderColor} rounded`}
                    onChange={handleSelectAllUsers}
                    checked={selectedUserIds.length === users.length && users.length > 0}
                  />
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${theme.textSoft} uppercase tracking-wider`}>Email de Usuario</th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${theme.textSoft} uppercase tracking-wider`}>ID de Usuario (UID)</th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${theme.textSoft} uppercase tracking-wider`}>Balance (USD)</th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${theme.textSoft} uppercase tracking-wider`}>Balance (BTC)</th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${theme.textSoft} uppercase tracking-wider`}>Balance (LTC)</th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${theme.textSoft} uppercase tracking-wider`}>Balance (DOGE)</th>
              </tr>
            </thead>
            <tbody className={`${theme.background} divide-y ${theme.borderColor}`}>
              {users.map((user) => (
                <tr key={user.id}>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme.textSoft}`}>
                    <input
                      type="checkbox"
                      className={`form-checkbox h-4 w-4 text-yellow-500 ${theme.inputBackground} ${theme.borderColor} rounded`}
                      checked={selectedUserIds.includes(user.id)}
                      onChange={() => handleSelectUser(user.id)}
                    />
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme.textSoft}`}>{user.email}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme.textSoft}`}>{user.id}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme.textSoft}`}>
                    ${(user.balanceUSD || 0).toFixed(2)}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme.textSoft}`}>
                    {(user.balanceBTC || 0).toFixed(8)} BTC
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme.textSoft}`}>
                    {(user.balanceLTC || 0).toFixed(8)} LTC
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme.textSoft}`}>
                    {(user.balanceDOGE || 0).toFixed(8)} DOGE
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

export default BalanceManagement;
