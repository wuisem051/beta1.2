import React, { useContext, useEffect, useState } from 'react';
import { ThemeContext } from '../../context/ThemeContext';
import { db, storage } from '../../services/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useError } from '../../context/ErrorContext';
import { useAuth } from '../../context/AuthContext'; // Importar useAuth
import { SolidSectionStyled, CardStyled, InputStyled, SelectStyled, TextareaStyled } from '../../user/styles/StyledComponents'; // Reutilizar componentes estilizados
import styles from '../../user/pages/UserPanel.module.css'; // Reutilizar estilos del UserPanel

const TradingSignalManagement = () => {
  const { showError, showSuccess } = useError();
  const { currentUser } = useAuth(); // Obtener el usuario actual
  const [signals, setSignals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados para el formulario de nueva señal
  const [asset, setAsset] = useState('');
  const [type, setType] = useState('Compra'); // 'Compra' o 'Venta'
  const [entryPrice, setEntryPrice] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [notes, setNotes] = useState('');
  const [maxInvestment, setMaxInvestment] = useState('100'); // Valor por defecto solicitado
  const [stopLossPercentage, setStopLossPercentage] = useState('');
  const [imageFile, setImageFile] = useState(null);

  // Estados para la edición
  const [editingSignalId, setEditingSignalId] = useState(null);
  const [editAsset, setEditAsset] = useState('');
  const [editType, setEditType] = useState('');
  const [editEntryPrice, setEditEntryPrice] = useState('');
  const [editTakeProfit, setEditTakeProfit] = useState('');
  const [editStopLoss, setEditStopLoss] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editMaxInvestment, setEditMaxInvestment] = useState('');
  const [editStopLossPercentage, setEditStopLossPercentage] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editCreatedAt, setEditCreatedAt] = useState('');

  // Función para calcular el porcentaje de ganancia/pérdida
  const calculatePercentage = (type, entry, takeProfit) => {
    const entryNum = parseFloat(entry);
    const tpNum = parseFloat(takeProfit);

    if (isNaN(entryNum) || isNaN(tpNum) || entryNum === 0) {
      return 'N/A';
    }

    let percentage;
    if (type === 'Compra') {
      percentage = ((tpNum - entryNum) / entryNum) * 100;
    } else { // Venta
      percentage = ((entryNum - tpNum) / entryNum) * 100;
    }
    return percentage.toFixed(2) + '%';
  };

  // Función para calcular precio de SL basado en %
  const calculateSLPrice = (type, entry, percentage) => {
    const entryNum = parseFloat(entry);
    const percNum = parseFloat(percentage);
    if (isNaN(entryNum) || isNaN(percNum)) return '';

    if (type === 'Compra') {
      return (entryNum * (1 - percNum / 100)).toFixed(8);
    } else {
      return (entryNum * (1 + percNum / 100)).toFixed(8);
    }
  };

  // Función para calcular % de SL basado en precio
  const calculateSLPercentage = (type, entry, slPrice) => {
    const entryNum = parseFloat(entry);
    const slNum = parseFloat(slPrice);
    if (isNaN(entryNum) || isNaN(slNum) || entryNum === 0) return '';

    let percentage;
    if (type === 'Compra') {
      percentage = ((entryNum - slNum) / entryNum) * 100;
    } else {
      percentage = ((slNum - entryNum) / entryNum) * 100;
    }
    return Math.abs(percentage).toFixed(2);
  };

  useEffect(() => {
    const q = query(collection(db, 'tradingSignals'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedSignals = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
      }));
      setSignals(fetchedSignals);
      setIsLoading(false);
    }, (err) => {
      console.error("Error fetching trading signals:", err);
      showError('Error al cargar las señales de trading.');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [showError]);

  const handleAddSignal = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!currentUser || !currentUser.uid) { // Verificar autenticación
      showError('Debes iniciar sesión para añadir una señal de trading.');
      setIsSubmitting(false);
      return;
    }

    if (!asset || !entryPrice || !takeProfit || !stopLoss) {
      showError('Todos los campos de la señal son obligatorios.');
      setIsSubmitting(false);
      return;
    }

    try {
      let imageUrl = '';
      if (imageFile) {
        const storageRef = ref(storage, `trading-signals/${Date.now()}_${imageFile.name}`);
        const snapshot = await uploadBytes(storageRef, imageFile);
        imageUrl = await getDownloadURL(snapshot.ref);
      }

      await addDoc(collection(db, 'tradingSignals'), {
        asset,
        type,
        entryPrice: parseFloat(entryPrice),
        takeProfit: parseFloat(takeProfit),
        stopLoss: parseFloat(stopLoss),
        stopLossPercentage: parseFloat(stopLossPercentage) || 0,
        maxInvestment: parseFloat(maxInvestment) || 0,
        status: 'Activa',
        notes,
        imageUrl,
        createdAt: new Date(),
      });
      showSuccess('Señal de trading añadida exitosamente.');
      // Limpiar formulario
      setAsset('');
      setType('Compra');
      setEntryPrice('');
      setTakeProfit('');
      setStopLoss('');
      setNotes('');
      setImageFile(null);
      // Resetear el input de archivo manualmente si es necesario
      const fileInput = document.getElementById('signalImage');
      if (fileInput) fileInput.value = '';
    } catch (err) {
      console.error("Error adding trading signal:", err);
      showError(`Fallo al añadir señal: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (signal) => {
    setEditingSignalId(signal.id);
    setEditAsset(signal.asset);
    setEditType(signal.type);
    setEditEntryPrice(signal.entryPrice);
    setEditTakeProfit(signal.takeProfit);
    setEditStopLoss(signal.stopLoss);
    setEditNotes(signal.notes);
    setEditMaxInvestment(signal.maxInvestment || '');
    setEditStopLossPercentage(signal.stopLossPercentage || '');
    setEditImageUrl(signal.imageUrl || '');
    setEditCreatedAt(signal.createdAt.toISOString().split('T')[0]);
  };

  const handleUpdateSignal = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!currentUser || !currentUser.uid) { // Verificar autenticación
      showError('Debes iniciar sesión para actualizar una señal de trading.');
      setIsSubmitting(false);
      return;
    }

    if (!editAsset || !editEntryPrice || !editTakeProfit || !editStopLoss) {
      showError('Todos los campos de la señal son obligatorios.');
      setIsSubmitting(false);
      return;
    }

    try {
      const signalRef = doc(db, 'tradingSignals', editingSignalId);
      await updateDoc(signalRef, {
        asset: editAsset,
        type: editType,
        entryPrice: parseFloat(editEntryPrice),
        takeProfit: parseFloat(editTakeProfit),
        stopLoss: parseFloat(editStopLoss),
        stopLossPercentage: parseFloat(editStopLossPercentage) || 0,
        maxInvestment: parseFloat(editMaxInvestment) || 0,
        notes: editNotes,
        imageUrl: editImageUrl,
        createdAt: new Date(editCreatedAt),
      });
      showSuccess('Señal de trading actualizada exitosamente.');
      setEditingSignalId(null); // Salir del modo edición
    } catch (err) {
      console.error("Error updating trading signal:", err);
      showError(`Fallo al actualizar señal: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseSignal = async (signal, result) => {
    if (!currentUser || !currentUser.uid) {
      showError('Debes iniciar sesión.');
      return;
    }

    const confirmMsg = `¿Cerrar esta señal como ${result}? Se moverá al historial de operaciones.`;
    if (window.confirm(confirmMsg)) {
      setIsSubmitting(true);
      try {
        // 1. Añadir al historial de operaciones
        await addDoc(collection(db, 'tradingHistory'), {
          date: new Date().toISOString().split('T')[0],
          pair: signal.asset,
          type: signal.type === 'Compra' ? 'Long' : 'Short',
          result: result,
          profit: result === 'Exitosa' ? parseFloat(signal.maxInvestment) * 0.15 : -parseFloat(signal.maxInvestment) * (signal.stopLossPercentage / 100), // Estimado de profit
          createdAt: new Date(),
          originalSignalId: signal.id
        });

        // 2. Eliminar de señales activas
        await deleteDoc(doc(db, 'tradingSignals', signal.id));

        showSuccess(`Señal cerrada como ${result} y movida al historial.`);
      } catch (err) {
        console.error("Error closing signal:", err);
        showError(`Error al cerrar señal: ${err.message}`);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleDeleteSignal = async (id) => {
    if (!currentUser || !currentUser.uid) { // Verificar autenticación
      showError('Debes iniciar sesión para eliminar una señal de trading.');
      return;
    }
    if (window.confirm('¿Estás seguro de que quieres eliminar esta señal de trading?')) {
      setIsSubmitting(true);
      try {
        await deleteDoc(doc(db, 'tradingSignals', id));
        showSuccess('Señal de trading eliminada exitosamente.');
      } catch (err) {
        console.error("Error deleting trading signal:", err);
        showError(`Fallo al eliminar señal: ${err.message}`);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="p-6 rounded-2xl shadow-xl space-y-8" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>
      <h1 className="text-3xl font-bold text-white border-b border-slate-700 pb-4">Gestión de Señales de Trading</h1>

      {isLoading && (
        <div className="flex justify-center p-8">
          <div className="animate-pulse text-slate-400 text-lg">Cargando señales...</div>
        </div>
      )}
      {isSubmitting && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-slate-800 p-6 rounded-2xl shadow-2xl flex items-center gap-4">
            <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-white font-medium">Procesando...</span>
          </div>
        </div>
      )}

      {/* Formulario para añadir nueva señal */}
      <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 shadow-lg">
        <h2 className="text-xl font-semibold text-blue-400 mb-6 flex items-center gap-2">
          <span className="bg-blue-500/10 p-2 rounded-lg">➕</span> Añadir Nueva Señal
        </h2>
        <form onSubmit={handleAddSignal} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="asset" className="text-sm font-medium text-slate-400">Activo</label>
            <input
              type="text"
              id="asset"
              value={asset}
              onChange={(e) => setAsset(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all placeholder:text-slate-600"
              placeholder="Ej: BTC/USD"
              required
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="type" className="text-sm font-medium text-slate-400">Tipo de Señal</label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
              disabled={isSubmitting}
            >
              <option value="Compra">Compra</option>
              <option value="Venta">Venta</option>
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="entryPrice" className="text-sm font-medium text-slate-400">Precio de Entrada</label>
            <input
              type="number"
              id="entryPrice"
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              step="any"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
              placeholder="Ej: 30000.00"
              required
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="takeProfit" className="text-sm font-medium text-slate-400">Precio de Salida (Take Profit)</label>
            <input
              type="number"
              id="takeProfit"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              step="any"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
              placeholder="Ej: 31000.00"
              required
              disabled={isSubmitting}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 col-span-full">
            <div className="space-y-2">
              <label htmlFor="maxInvestment" className="text-sm font-medium text-slate-400">Inversión Máxima (USD)</label>
              <input
                type="number"
                id="maxInvestment"
                value={maxInvestment}
                onChange={(e) => setMaxInvestment(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all placeholder:text-slate-600"
                placeholder="Ej: 100"
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="stopLossPercentage" className="text-sm font-medium text-slate-400">Stop Loss (%)</label>
              <input
                type="number"
                id="stopLossPercentage"
                value={stopLossPercentage}
                onChange={(e) => {
                  setStopLossPercentage(e.target.value);
                  const slPrice = calculateSLPrice(type, entryPrice, e.target.value);
                  setStopLoss(slPrice);
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all placeholder:text-slate-600"
                placeholder="Ej: 5"
                disabled={isSubmitting}
              />
            </div>
          </div>
          <div className="space-y-2 col-span-full">
            <label htmlFor="stopLoss" className="text-sm font-medium text-slate-400">Precio Stop Loss</label>
            <input
              type="number"
              id="stopLoss"
              value={stopLoss}
              onChange={(e) => {
                setStopLoss(e.target.value);
                const slPerc = calculateSLPercentage(type, entryPrice, e.target.value);
                setStopLossPercentage(slPerc);
              }}
              step="any"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all placeholder:text-slate-600"
              placeholder="Ej: 29500.00"
              required
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2 col-span-full">
            <label htmlFor="notes" className="text-sm font-medium text-slate-400">Notas (Opcional)</label>
            <textarea
              id="notes"
              rows="3"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all placeholder:text-slate-600"
              placeholder="Información adicional sobre la señal..."
              disabled={isSubmitting}
            ></textarea>
          </div>
          <div className="space-y-2 col-span-full">
            <label htmlFor="signalImage" className="text-sm font-medium text-slate-400">Captura de Pantalla/Imagen (Opcional)</label>
            <input
              type="file"
              id="signalImage"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files[0])}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none"
              disabled={isSubmitting}
            />
          </div>
          <button
            type="submit"
            className="col-span-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-6 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : '🚀 Añadir Señal'}
          </button>
        </form>
      </div>

      {/* Lista de Señales Existentes */}
      <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700 shadow-lg">
        <h2 className="text-lg font-semibold text-blue-400 mb-3 flex items-center gap-2">
          <span className="bg-blue-500/10 p-1.5 rounded-lg text-sm">📊</span> Señales de Trading Existentes
        </h2>
        {signals.length === 0 && !isLoading ? (
          <p className="text-center text-slate-500 py-6 text-sm">No hay señales de trading registradas.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-700">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-900/50">
                  <th className="px-2 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">Activo</th>
                  <th className="px-2 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">Tipo</th>
                  <th className="px-2 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">Entrada</th>
                  <th className="px-2 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">Max Inv</th>
                  <th className="px-2 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">SL %</th>
                  <th className="px-2 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">Take Profit</th>
                  <th className="px-2 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">Stop Loss</th>
                  <th className="px-2 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">Imagen</th>
                  <th className="px-2 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">Fecha</th>
                  <th className="px-2 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">% Potencial</th>
                  <th className="px-2 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {signals.map(signal => (
                  <tr key={signal.id} className="hover:bg-slate-700/30 transition-colors">
                    {editingSignalId === signal.id ? (
                      <>
                        <td className="px-2 py-2">
                          <input type="text" value={editAsset} onChange={(e) => setEditAsset(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-white text-xs" disabled={isSubmitting} />
                        </td>
                        <td className="px-2 py-2">
                          <select value={editType} onChange={(e) => setEditType(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-white text-xs" disabled={isSubmitting}>
                            <option value="Compra">Compra</option>
                            <option value="Venta">Venta</option>
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" step="any" value={editEntryPrice} onChange={(e) => {
                            setEditEntryPrice(e.target.value);
                            const slPrice = calculateSLPrice(editType, e.target.value, editStopLossPercentage);
                            setEditStopLoss(slPrice);
                          }} className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-white text-xs" disabled={isSubmitting} />
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" value={editMaxInvestment} onChange={(e) => setEditMaxInvestment(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-white text-xs" disabled={isSubmitting} />
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" value={editStopLossPercentage} onChange={(e) => {
                            setEditStopLossPercentage(e.target.value);
                            const slPrice = calculateSLPrice(editType, editEntryPrice, e.target.value);
                            setEditStopLoss(slPrice);
                          }} className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-white text-xs" disabled={isSubmitting} />
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" step="any" value={editTakeProfit} onChange={(e) => setEditTakeProfit(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-white text-xs" disabled={isSubmitting} />
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" step="any" value={editStopLoss} onChange={(e) => {
                            setEditStopLoss(e.target.value);
                            const slPerc = calculateSLPercentage(editType, editEntryPrice, e.target.value);
                            setEditStopLossPercentage(slPerc);
                          }} className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-white text-xs" disabled={isSubmitting} />
                        </td>
                        <td className="px-2 py-2">
                          <input type="text" value={editImageUrl} onChange={(e) => setEditImageUrl(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-white text-xs" placeholder="URL de imagen" disabled={isSubmitting} />
                        </td>
                        <td className="px-2 py-2">
                          <input type="date" value={editCreatedAt} onChange={(e) => setEditCreatedAt(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-white text-xs" disabled={isSubmitting} />
                        </td>
                        <td className="px-2 py-2 text-blue-400 font-bold text-xs">
                          {calculatePercentage(editType, editEntryPrice, editTakeProfit)}
                        </td>
                        <td className="px-2 py-2 space-x-1">
                          <button onClick={handleUpdateSignal} className="bg-green-600 hover:bg-green-500 text-white px-2 py-0.5 rounded text-xs transition-colors" disabled={isSubmitting}>✓</button>
                          <button onClick={() => setEditingSignalId(null)} className="bg-slate-600 hover:bg-slate-500 text-white px-2 py-0.5 rounded text-xs transition-colors" disabled={isSubmitting}>✕</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-2 py-2 font-medium text-white text-xs">{signal.asset}</td>
                        <td className="px-2 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${signal.type === 'Compra' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                            {signal.type}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-slate-300 font-mono text-xs">{signal.entryPrice}</td>
                        <td className="px-2 py-2 text-white font-semibold text-xs">${signal.maxInvestment || 0}</td>
                        <td className="px-2 py-2 text-red-500 font-bold text-xs">{signal.stopLossPercentage || 0}%</td>
                        <td className="px-2 py-2 text-green-500 font-mono font-bold text-xs">{signal.takeProfit}</td>
                        <td className="px-2 py-2 text-red-500 font-mono text-xs">{signal.stopLoss}</td>
                        <td className="px-2 py-2 text-slate-400 max-w-xs text-xs truncate">{signal.notes}</td>
                        <td className="px-4 py-4">
                          {signal.imageUrl ? (
                            <a href={signal.imageUrl} target="_blank" rel="noopener noreferrer">
                              <img src={signal.imageUrl} alt="signal" className="h-10 w-10 object-cover rounded-lg border border-slate-700 hover:scale-150 transition-transform cursor-pointer" />
                            </a>
                          ) : <span className="text-slate-600 text-xs italic">N/A</span>}
                        </td>
                        <td className="px-4 py-4 text-slate-400 text-sm whitespace-nowrap">{signal.createdAt.toLocaleDateString()}</td>
                        <td className="px-4 py-4 text-blue-400 font-bold">
                          {calculatePercentage(signal.type, signal.entryPrice, signal.takeProfit)}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-2">
                            <button onClick={() => handleCloseSignal(signal, 'Exitosa')} className="w-full bg-green-600/20 hover:bg-green-600 text-green-500 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold border border-green-600/30 transition-all">¡Completada! ✓</button>
                            <button onClick={() => handleCloseSignal(signal, 'Fallida')} className="w-full bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold border border-red-600/30 transition-all">Fallida ✗</button>
                            <div className="flex gap-2">
                              <button onClick={() => handleEditClick(signal)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded text-[10px] transition-colors" disabled={isSubmitting}>Ajustar</button>
                              <button onClick={() => handleDeleteSignal(signal.id)} className="flex-1 bg-red-900/30 hover:bg-red-900 text-red-400 hover:text-white px-2 py-1 rounded text-[10px] transition-colors" disabled={isSubmitting}>Borrar</button>
                            </div>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TradingSignalManagement;
