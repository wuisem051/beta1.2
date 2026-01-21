import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, getDocs, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { useError } from '../../context/ErrorContext';

const BalanceManagement = () => {
  const { showError, showSuccess } = useError();
  const [users, setUsers] = useState([]);

  // Individual Operation State
  const [selectedUserId, setSelectedUserId] = useState('');
  const [amountToAdd, setAmountToAdd] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [individualOperation, setIndividualOperation] = useState('add'); // 'add' or 'subtract'

  // Mass Operation State
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [massAmount, setMassAmount] = useState('');
  const [massCurrency, setMassCurrency] = useState('USD');
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
      const updatedUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(updatedUsers);
    }, (error) => {
      console.error("Error subscribing to users collection:", error);
      showError('Error al suscribirse a los cambios de usuarios.');
    });

    return () => unsubscribe();
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

  const executeBalanceUpdate = async (userId, amount, currency, operation) => {
    const userDoc = users.find(u => u.id === userId);
    if (!userDoc) throw new Error(`Usuario con ID ${userId} no encontrado.`);

    const userRef = doc(db, 'users', userId);

    if (operation === 'reset' && currency === 'ALL') {
      const resetData = {
        balanceUSD: 0,
        balanceUSDTTRC20: 0,
        balanceUSDTFiat: 0,
        balanceBTC: 0,
        balanceLTC: 0,
        balanceDOGE: 0,
        balanceTRX: 0,
        balanceVES: 0
      };
      await updateDoc(userRef, resetData);
      return 0;
    }

    let currencyField = `balance${currency}`;
    if (currency === 'USDT') currencyField = 'balanceUSDTTRC20';
    if (currency === 'USDTFiat') currencyField = 'balanceUSDTFiat';

    const currentBalance = parseFloat(userDoc[currencyField] || 0);
    let newBalance = currentBalance;

    if (operation === 'add') {
      newBalance = currentBalance + amount;
    } else if (operation === 'subtract') {
      if (currentBalance < amount) throw new Error(`Saldo insuficiente en ${currency} para el usuario ${userDoc.email}.`);
      newBalance = currentBalance - amount;
    } else if (operation === 'reset') {
      newBalance = 0;
    }

    await updateDoc(userRef, { [currencyField]: newBalance });
    return newBalance;
  };

  const handleIndividualSubmit = async (e) => {
    e.preventDefault();
    showSuccess(null);
    showError(null);

    if (!selectedUserId) return showError('Por favor, selecciona un usuario.');
    const amount = parseFloat(amountToAdd);
    if (isNaN(amount) || amount <= 0) return showError('Introduce una cantidad válida.');

    try {
      await executeBalanceUpdate(selectedUserId, amount, selectedCurrency, individualOperation);
      const userEmail = users.find(u => u.id === selectedUserId)?.email;
      showSuccess(`Balance ${individualOperation === 'add' ? 'añadido' : 'restado'} correctamente a ${userEmail}.`);
      setAmountToAdd('');
    } catch (err) {
      showError(err.message);
    }
  };

  const handleMassSubmit = async () => {
    showSuccess(null);
    showError(null);

    if (selectedUserIds.length === 0) return showError('Selecciona al menos un usuario.');

    const amount = parseFloat(massAmount);
    if (massOperation !== 'reset' && (isNaN(amount) || amount <= 0)) {
      return showError('Introduce una cantidad válida.');
    }

    if (massCurrency === 'ALL' && massOperation !== 'reset') {
      return showError('La opción "Todas las Monedas" solo es válida para Resetear.');
    }

    try {
      let successCount = 0;
      let failCount = 0;

      for (const userId of selectedUserIds) {
        try {
          await executeBalanceUpdate(userId, amount, massCurrency, massOperation);
          successCount++;
        } catch (error) {
          console.error(`Failed for user ${userId}:`, error);
          failCount++;
        }
      }

      showSuccess(`Operación masiva: ${successCount} exitosos, ${failCount} fallidos.`);
      setSelectedUserIds([]);
      setMassAmount('');
    } catch (err) {
      showError(`Error crítico: ${err.message}`);
    }
  };

  return (
    <div className="p-8 md:p-12 min-h-screen bg-[#020617] text-slate-200 space-y-12 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/5 pb-8 relative z-10">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tight flex items-center gap-4">
            <span className="bg-blue-600 w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-xl shadow-blue-500/20">💳</span>
            Gestión de Balance
          </h2>
          <p className="text-slate-500 font-bold mt-2 uppercase tracking-[0.2em] text-[10px]">Administración rápida de fondos y tesorería</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Card: Operación Individual */}
        <div className="bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/5 shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

          <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3 relative z-10">
            <span className="w-8 h-8 bg-blue-500/10 rounded-xl flex items-center justify-center text-sm text-blue-400">👤</span>
            Operación Individual
          </h3>

          <form onSubmit={handleIndividualSubmit} className="space-y-6 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Usuario Objetivo</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full bg-slate-950/50 border border-white/10 rounded-2xl px-4 py-3 text-white font-bold focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-inner text-xs"
                >
                  <option value="">Seleccionar Usuario</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.email}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Tipo de Operación</label>
                <div className="flex bg-slate-950/50 p-1 rounded-2xl border border-white/10">
                  <button
                    type="button"
                    onClick={() => setIndividualOperation('add')}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${individualOperation === 'add' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                  >
                    Añadir
                  </button>
                  <button
                    type="button"
                    onClick={() => setIndividualOperation('subtract')}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${individualOperation === 'subtract' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                  >
                    Restar
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Moneda</label>
                <select
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                  className="w-full bg-slate-950/50 border border-white/10 rounded-2xl px-4 py-3 text-white font-bold focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-inner text-xs"
                >
                  <option value="USD">USD (Dólar)</option>
                  <option value="USDT">USDT (TRC20)</option>
                  <option value="USDTFiat">USDT (Fiat)</option>
                  <option value="BTC">BTC (Bitcoin)</option>
                  <option value="LTC">LTC (Litecoin)</option>
                  <option value="DOGE">DOGE (Dogecoin)</option>
                  <option value="TRX">TRX (Tron)</option>
                  <option value="VES">VES (Bolívares)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Monto</label>
                <input
                  type="number"
                  value={amountToAdd}
                  onChange={(e) => setAmountToAdd(e.target.value)}
                  step="any"
                  placeholder="0.00"
                  className="w-full bg-slate-950/50 border border-white/10 rounded-2xl px-4 py-3 text-white font-bold focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-700 shadow-inner text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              className={`w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl transition-all transform active:scale-95 ${individualOperation === 'add' ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20' : 'bg-red-600 hover:bg-red-500 text-white shadow-red-500/20'}`}
            >
              Confirmar Operación
            </button>
          </form>
        </div>

        {/* Card: Operación Masiva */}
        <div className="bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/5 shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

          <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3 relative z-10">
            <span className="w-8 h-8 bg-purple-500/10 rounded-xl flex items-center justify-center text-sm text-purple-400">⚡</span>
            Carga Masiva
            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded-lg ml-auto">
              {selectedUserIds.length} Seleccionados
            </span>
          </h3>

          <div className="space-y-6 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Acción Global</label>
                <select
                  value={massOperation}
                  onChange={(e) => setMassOperation(e.target.value)}
                  className="w-full bg-slate-950/50 border border-white/10 rounded-2xl px-4 py-3 text-white font-bold focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all shadow-inner text-xs"
                >
                  <option value="add">Añadir a Todos</option>
                  <option value="subtract">Restar a Todos</option>
                  <option value="reset">Resetear a CERO</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Moneda Global</label>
                <select
                  value={massCurrency}
                  onChange={(e) => setMassCurrency(e.target.value)}
                  className="w-full bg-slate-950/50 border border-white/10 rounded-2xl px-4 py-3 text-white font-bold focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all shadow-inner text-xs"
                >
                  <option value="USD">USD</option>
                  <option value="USDT">USDT TRC20</option>
                  <option value="USDTFiat">USDT Fiat</option>
                  <option value="BTC">BTC</option>
                  <option value="LTC">LTC</option>
                  <option value="DOGE">DOGE</option>
                  <option value="TRX">TRX</option>
                  <option value="VES">VES</option>
                  <option value="ALL" disabled={massOperation !== 'reset'}>★ TODAS LAS MONEDAS ★</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Monto Global</label>
              <input
                type="number"
                value={massAmount}
                onChange={(e) => setMassAmount(e.target.value)}
                disabled={massOperation === 'reset' || massCurrency === 'ALL'}
                step="any"
                placeholder={massOperation === 'reset' || massCurrency === 'ALL' ? "No aplica" : "0.00"}
                className={`w-full bg-slate-950/50 border border-white/10 rounded-2xl px-4 py-3 text-white font-bold focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all placeholder:text-slate-700 shadow-inner text-xs ${massOperation === 'reset' || massCurrency === 'ALL' ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
            </div>

            <button
              onClick={handleMassSubmit}
              disabled={selectedUserIds.length === 0}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-black py-4 px-8 rounded-2xl shadow-xl shadow-purple-500/20 transition-all uppercase text-[10px] tracking-[0.2em] border border-purple-400/30 transform active:scale-95"
            >
              Ejecutar Cambios Masivos
            </button>
          </div>
        </div>
      </div>

      {/* User Table */}
      <div className="bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-10 border border-white/5 shadow-2xl relative">
        <div className="overflow-x-auto rounded-[2rem] border border-white/5 bg-slate-900/20 backdrop-blur-sm shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/50">
                <th className="px-8 py-6 w-16">
                  <input
                    type="checkbox"
                    className="form-checkbox h-5 w-5 text-blue-500 bg-slate-900 border-white/10 rounded-lg transition-all cursor-pointer"
                    onChange={handleSelectAllUsers}
                    checked={selectedUserIds.length === users.length && users.length > 0}
                  />
                </th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Usuario</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Saldos USD/USDT</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Fiat (VES)</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Cripto (Ref)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((user) => (
                <tr key={user.id} className={`hover:bg-white/[0.02] transition-colors group ${selectedUserIds.includes(user.id) ? 'bg-blue-600/5' : ''}`}>
                  <td className="px-8 py-6">
                    <input
                      type="checkbox"
                      className="form-checkbox h-5 w-5 text-blue-500 bg-slate-900 border-white/10 rounded-lg transition-all cursor-pointer"
                      checked={selectedUserIds.includes(user.id)}
                      onChange={() => handleSelectUser(user.id)}
                    />
                  </td>
                  <td className="px-6 py-6 font-bold text-sm text-white group-hover:text-blue-400 transition-colors">
                    {user.email}
                    <div className="text-[9px] text-slate-600 font-mono mt-1">{user.id}</div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex flex-col gap-1">
                      <span className="text-blue-400 font-black text-[10px] bg-blue-500/5 px-2 py-1 rounded border border-blue-500/10 w-fit">
                        USD: ${(user.balanceUSD || 0).toLocaleString()}
                      </span>
                      <span className="text-green-400 font-black text-[10px] bg-green-500/5 px-2 py-1 rounded border border-green-500/10 w-fit">
                        TRC20: ${(user.balanceUSDTTRC20 || 0).toLocaleString()}
                      </span>
                      <span className="text-emerald-400 font-black text-[10px] bg-emerald-500/5 px-2 py-1 rounded border border-emerald-500/10 w-fit">
                        Fiat: ${(user.balanceUSDTFiat || 0).toLocaleString()}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <span className="text-yellow-500 font-black text-xs bg-yellow-500/5 px-2 py-1 rounded border border-yellow-500/10">
                      Bs. {(user.balanceVES || 0).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-6 text-xs text-slate-400 font-medium">
                    <div className="flex flex-col gap-1 text-[10px]">
                      <span>₿ {(user.balanceBTC || 0).toFixed(8)} BTC</span>
                      <span>Ł {(user.balanceLTC || 0).toFixed(6)} LTC</span>
                      <span>Ð {(user.balanceDOGE || 0).toFixed(2)} DOGE</span>
                      <span>⚡ {(user.balanceTRX || 0).toLocaleString()} TRX</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BalanceManagement;
