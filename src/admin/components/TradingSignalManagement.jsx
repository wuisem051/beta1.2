import React, { useContext, useEffect, useState } from 'react';
import { ThemeContext } from '../../context/ThemeContext';
import { db } from '../../services/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useError } from '../../context/ErrorContext';
import { useAuth } from '../../context/AuthContext'; // Importar useAuth
import { SolidSectionStyled, CardStyled, InputStyled, SelectStyled, TextareaStyled } from '../../user/styles/StyledComponents'; // Reutilizar componentes estilizados
import styles from '../../user/pages/UserPanel.module.css'; // Reutilizar estilos del UserPanel

const TradingSignalManagement = () => {
  const { darkMode } = useContext(ThemeContext);
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

  // Estados para la edición
  const [editingSignalId, setEditingSignalId] = useState(null);
  const [editAsset, setEditAsset] = useState('');
  const [editType, setEditType] = useState('');
  const [editEntryPrice, setEditEntryPrice] = useState('');
  const [editTakeProfit, setEditTakeProfit] = useState('');
  const [editStopLoss, setEditStopLoss] = useState('');
  const [editNotes, setEditNotes] = useState('');

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
      await addDoc(collection(db, 'tradingSignals'), {
        asset,
        type,
        entryPrice: parseFloat(entryPrice),
        takeProfit: parseFloat(takeProfit),
        stopLoss: parseFloat(stopLoss),
        notes,
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
        notes: editNotes,
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
    <SolidSectionStyled theme={darkMode ? 'dark' : 'light'} className={styles.settingsContent}>
      <h1 className={styles.pageTitle}>Gestión de Señales de Trading</h1>
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingText}>Cargando señales...</div>
        </div>
      )}
      {isSubmitting && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingText}>Procesando...</div>
        </div>
      )}

      {/* Formulario para añadir nueva señal */}
      <CardStyled theme={darkMode ? 'dark' : 'light'} className={styles.sectionCard}>
        <h2 className={styles.sectionTitle}>Añadir Nueva Señal</h2>
        <form onSubmit={handleAddSignal} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="asset" className={styles.formLabel}>Activo</label>
            <InputStyled
              theme={darkMode ? 'dark' : 'light'}
              type="text"
              id="asset"
              value={asset}
              onChange={(e) => setAsset(e.target.value)}
              className={styles.formInput}
              placeholder="Ej: BTC/USD"
              required
              disabled={isSubmitting}
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="type" className={styles.formLabel}>Tipo de Señal</label>
            <SelectStyled
              theme={darkMode ? 'dark' : 'light'}
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className={styles.formSelect}
              disabled={isSubmitting}
            >
              <option value="Compra">Compra</option>
              <option value="Venta">Venta</option>
            </SelectStyled>
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="entryPrice" className={styles.formLabel}>Precio de Entrada</label>
            <InputStyled
              theme={darkMode ? 'dark' : 'light'}
              type="number"
              id="entryPrice"
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              step="any"
              className={styles.formInput}
              placeholder="Ej: 30000.00"
              required
              disabled={isSubmitting}
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="takeProfit" className={styles.formLabel}>Precio de Salida (Take Profit)</label>
            <InputStyled
              theme={darkMode ? 'dark' : 'light'}
              type="number"
              id="takeProfit"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              step="any"
              className={styles.formInput}
              placeholder="Ej: 31000.00"
              required
              disabled={isSubmitting}
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="stopLoss" className={styles.formLabel}>Stop Loss</label>
            <InputStyled
              theme={darkMode ? 'dark' : 'light'}
              type="number"
              id="stopLoss"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              step="any"
              className={styles.formInput}
              placeholder="Ej: 29500.00"
              required
              disabled={isSubmitting}
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="notes" className={styles.formLabel}>Notas (Opcional)</label>
            <TextareaStyled
              theme={darkMode ? 'dark' : 'light'}
              id="notes"
              rows="3"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={styles.replyTextarea}
              placeholder="Información adicional sobre la señal..."
              disabled={isSubmitting}
            ></TextareaStyled>
          </div>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : 'Añadir Señal'}
          </button>
        </form>
      </CardStyled>

      {/* Lista de Señales Existentes */}
      <CardStyled theme={darkMode ? 'dark' : 'light'} className={styles.sectionCard}>
        <h2 className={styles.sectionTitle}>Señales de Trading Existentes</h2>
        {signals.length === 0 && !isLoading ? (
          <p className={styles.noDataText}>No hay señales de trading registradas.</p>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead className={`${darkMode ? styles.darkTableHead : styles.lightTableHead}`}>
                <tr>
                  <th className={styles.tableHeader}>Activo</th>
                  <th className={styles.tableHeader}>Tipo</th>
                  <th className={styles.tableHeader}>Entrada</th>
                  <th className={styles.tableHeader}>Take Profit</th>
                  <th className={styles.tableHeader}>Stop Loss</th>
                  <th className={styles.tableHeader}>Notas</th>
                  <th className={styles.tableHeader}>Fecha</th>
                  <th className={styles.tableHeader}>%</th> {/* Nueva columna para el porcentaje */}
                  <th className={styles.tableHeader}>Acciones</th>
                </tr>
              </thead>
              <tbody className={`${darkMode ? styles.darkTableBody : styles.lightTableBody}`}>
                {signals.map(signal => (
                  <tr key={signal.id}>
                    {editingSignalId === signal.id ? (
                      <>
                        <td className={styles.tableCell}>
                          <InputStyled theme={darkMode ? 'dark' : 'light'} type="text" value={editAsset} onChange={(e) => setEditAsset(e.target.value)} disabled={isSubmitting} />
                        </td>
                        <td className={styles.tableCell}>
                          <SelectStyled theme={darkMode ? 'dark' : 'light'} value={editType} onChange={(e) => setEditType(e.target.value)} disabled={isSubmitting}>
                            <option value="Compra">Compra</option>
                            <option value="Venta">Venta</option>
                          </SelectStyled>
                        </td>
                        <td className={styles.tableCell}>
                          <InputStyled theme={darkMode ? 'dark' : 'light'} type="number" step="any" value={editEntryPrice} onChange={(e) => setEditEntryPrice(e.target.value)} disabled={isSubmitting} />
                        </td>
                        <td className={styles.tableCell}>
                          <InputStyled theme={darkMode ? 'dark' : 'light'} type="number" step="any" value={editTakeProfit} onChange={(e) => setEditTakeProfit(e.target.value)} disabled={isSubmitting} />
                        </td>
                        <td className={styles.tableCell}>
                          <InputStyled theme={darkMode ? 'dark' : 'light'} type="number" step="any" value={editStopLoss} onChange={(e) => setEditStopLoss(e.target.value)} disabled={isSubmitting} />
                        </td>
                        <td className={styles.tableCell}>
                          <TextareaStyled theme={darkMode ? 'dark' : 'light'} rows="1" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} disabled={isSubmitting} />
                        </td>
                        <td className={styles.tableCell}>{signal.createdAt.toLocaleDateString()}</td>
                        <td className={styles.tableCell}>
                          {calculatePercentage(editType, editEntryPrice, editTakeProfit)}
                        </td>
                        <td className={styles.tableCellActions}>
                          <button onClick={handleUpdateSignal} className={styles.submitButton} disabled={isSubmitting}>Guardar</button>
                          <button onClick={() => setEditingSignalId(null)} className={styles.deleteButton} disabled={isSubmitting}>Cancelar</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className={styles.tableCell}>{signal.asset}</td>
                        <td className={`${styles.tableCell} ${signal.type === 'Compra' ? styles.signalBuy : styles.signalSell}`}>{signal.type}</td>
                        <td className={styles.tableCell}>{signal.entryPrice}</td>
                        <td className={styles.tableCell}>{signal.takeProfit}</td>
                        <td className={styles.tableCell}>{signal.stopLoss}</td>
                        <td className={styles.tableCell}>{signal.notes}</td>
                        <td className={styles.tableCell}>{signal.createdAt.toLocaleDateString()}</td>
                        <td className={styles.tableCell}>
                          {calculatePercentage(signal.type, signal.entryPrice, signal.takeProfit)}
                        </td>
                        <td className={styles.tableCellActions}>
                          <button onClick={() => handleEditClick(signal)} className={styles.editButton} disabled={isSubmitting}>Editar</button>
                          <button onClick={() => handleDeleteSignal(signal.id)} className={styles.deleteButton} disabled={isSubmitting}>Eliminar</button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardStyled>
    </SolidSectionStyled>
  );
};

export default TradingSignalManagement;
