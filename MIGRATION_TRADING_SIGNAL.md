# Guía de Migración: Sección "Señal Trading"

Este documento detalla los pasos necesarios para migrar la nueva sección "Señal Trading" a una versión anterior de la aplicación. Asegúrate de seguir cada paso cuidadosamente.

## 1. Nuevos Archivos de Componentes

Crea los siguientes archivos en las rutas especificadas con el contenido proporcionado:

### `src/user/components/TradingSignal.jsx`

```jsx
import React, { useContext, useEffect, useState } from 'react';
import { ThemeContext } from '../../context/ThemeContext';
import { SolidSectionStyled, CardStyled } from '../styles/StyledComponents';
import { db } from '../../services/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { useError } from '../../context/ErrorContext';
import styles from '../pages/UserPanel.module.css'; // Reutilizar estilos del UserPanel

const TradingSignal = () => {
  const { darkMode } = useContext(ThemeContext);
  const { showError } = useError();
  const [signals, setSignals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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

  return (
    <SolidSectionStyled theme={darkMode ? 'dark' : 'light'} className={styles.settingsContent}>
      <h1 className={styles.pageTitle}>Señales de Trading</h1>
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingText}>Cargando señales...</div>
        </div>
      )}
      {signals.length === 0 && !isLoading ? (
        <CardStyled theme={darkMode ? 'dark' : 'light'} className={styles.sectionCard}>
          <p className={styles.noDataText}>No hay señales de trading disponibles en este momento.</p>
        </CardStyled>
      ) : (
        <div className={styles.settingsGrid}>
          {signals.map(signal => (
            <CardStyled key={signal.id} theme={darkMode ? 'dark' : 'light'} className={styles.sectionCard}>
              <h2 className={`${styles.sectionTitle} ${signal.type === 'Compra' ? styles.signalBuy : styles.signalSell}`}>
                {signal.type === 'Compra' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-green_check" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-red_error" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"/></svg>
                )}
                Señal de {signal.type}
              </h2>
              <p className={styles.formLabel}><strong>Activo:</strong> {signal.asset}</p>
              <p className={styles.formLabel}><strong>Precio de Entrada:</strong> {signal.entryPrice}</p>
              <p className={styles.formLabel}><strong>Precio de Salida (Take Profit):</strong> {signal.takeProfit}</p>
              <p className={styles.formLabel}><strong>Stop Loss:</strong> {signal.stopLoss}</p>
              <p className={styles.formLabel}><strong>Notas:</strong> {signal.notes}</p>
              <p className={styles.formLabel}><strong>Fecha:</strong> {signal.createdAt.toLocaleString()}</p>
            </CardStyled>
          ))}
        </div>
      )}
    </SolidSectionStyled>
  );
};

export default TradingSignal;
```

### `src/admin/components/TradingSignalManagement.jsx`

```jsx
import React, { useContext, useEffect, useState } from 'react';
import { ThemeContext } from '../../context/ThemeContext';
import { db } from '../../services/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useError } from '../../context/ErrorContext';
import { SolidSectionStyled, CardStyled, InputStyled, SelectStyled, TextareaStyled } from '../../user/styles/StyledComponents'; // Reutilizar componentes estilizados
import styles from '../../user/pages/UserPanel.module.css'; // Reutilizar estilos del UserPanel

const TradingSignalManagement = () => {
  const { darkMode } = useContext(ThemeContext);
  const { showError, showSuccess } = useError();
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
```

## 2. Modificaciones en Archivos Existentes

### `src/user/pages/UserPanel.js`

Añade la importación de `TradingSignal` y la nueva ruta:

```diff
------- SEARCH
import UserPoolArbitrage from '../components/UserPoolArbitrage'; // Importar UserPoolArbitrage
import Sidebar from '../../common/layout/Sidebar'; // Importar Sidebar
import MainContent from '../components/MainContent'; // Importar MainContent
import ErrorMessage from '../components/ErrorMessage'; // Importar ErrorMessage
import StatsSection from '../components/StatsSection'; // Importar StatsSection
import PerformanceStatsSection from '../components/PerformanceStatsSection'; // Importar PerformanceStatsSection
import styles from './UserPanel.module.css'; // Importar estilos CSS Modules
import useFormValidation from '../../hooks/useFormValidation'; // Importar useFormValidation
import { useError } from '../../context/ErrorContext'; // Importar useError
import { SolidSectionStyled, CardStyled, InputStyled, SelectStyled, TextareaStyled } from '../styles/StyledComponents'; // Importar componentes estilizados
=======
import UserPoolArbitrage from '../components/UserPoolArbitrage'; // Importar UserPoolArbitrage
import TradingSignal from '../components/TradingSignal'; // Importar TradingSignal
import Sidebar from '../../common/layout/Sidebar'; // Importar Sidebar
import MainContent from '../components/MainContent'; // Importar MainContent
import ErrorMessage from '../components/ErrorMessage'; // Importar ErrorMessage
import StatsSection from '../components/StatsSection'; // Importar StatsSection
import PerformanceStatsSection from '../components/PerformanceStatsSection'; // Importar PerformanceStatsSection
import styles from './UserPanel.module.css'; // Importar estilos CSS Modules
import useFormValidation from '../../hooks/useFormValidation'; // Importar useFormValidation
import { useError } from '../../context/ErrorContext'; // Importar useError
import { SolidSectionStyled, CardStyled, InputStyled, SelectStyled, TextareaStyled } from '../styles/StyledComponents'; // Importar componentes estilizados
+++++++ REPLACE

------- SEARCH
          <Route path="referrals/*" element={<ReferralsContent styles={styles} />} />
          <Route path="pool-arbitrage/*" element={<UserPoolArbitrage />} />
          <Route path="settings/*" element={<SettingsContent styles={styles} />} />
          {/* Ruta por defecto */}
=======
          <Route path="referrals/*" element={<ReferralsContent styles={styles} />} />
          <Route path="pool-arbitrage/*" element={<UserPoolArbitrage />} />
          <Route path="trading-signal/*" element={<TradingSignal />} /> {/* Nueva ruta para Señal Trading */}
          <Route path="settings/*" element={<SettingsContent styles={styles} />} />
          {/* Ruta por defecto */}
+++++++ REPLACE
```

### `src/common/layout/Sidebar.jsx`

Añade el nuevo enlace en la barra lateral para la sección "Señal Trading":

```diff
------- SEARCH
          <li className="mb-0.5">
            <Link
              to={`${basePath}/pool-arbitrage`}
              className={`flex items-center py-1.5 px-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                useMatch(`${basePath}/pool-arbitrage`) 
                  ? 'bg-accent text-white' 
                  : `${theme.textSoft} hover:${theme.background} hover:${theme.text}`
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-2 ${useMatch(`${basePath}/pool-arbitrage`) ? 'text-white' : theme.textSoft}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>
              Pools de Arbitraje
            </Link>
          </li>
=======
          <li className="mb-0.5">
            <Link
              to={`${basePath}/trading-signal`}
              className={`flex items-center py-1.5 px-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                useMatch(`${basePath}/trading-signal`) 
                  ? 'bg-accent text-white' 
                  : `${theme.textSoft} hover:${theme.background} hover:${theme.text}`
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-2 ${useMatch(`${basePath}/trading-signal`) ? 'text-white' : theme.textSoft}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M18 14v4h4m-9-1V5h-2M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
              Señal Trading
            </Link>
          </li>
          <li className="mb-0.5">
            <Link
              to={`${basePath}/pool-arbitrage`}
              className={`flex items-center py-1.5 px-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                useMatch(`${basePath}/pool-arbitrage`) 
                  ? 'bg-accent text-white' 
                  : `${theme.textSoft} hover:${theme.background} hover:${theme.text}`
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-2 ${useMatch(`${basePath}/pool-arbitrage`) ? 'text-white' : theme.textSoft}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>
              Pools de Arbitraje
            </Link>
          </li>
+++++++ REPLACE
```

### `src/admin/pages/AdminPanel.js`

Añade la importación de `TradingSignalManagement` y la nueva ruta en el panel de administración:

```diff
------- SEARCH
import WithdrawalRequestsManagement from '../components/WithdrawalRequestsManagement';
import BalanceManagement from '../../user/components/BalanceManagement';
import SiteSettingsContent from '../components/SiteSettingsContent'; // Importar el nuevo componente
=======
import WithdrawalRequestsManagement from '../components/WithdrawalRequestsManagement';
import BalanceManagement from '../../user/components/BalanceManagement';
import SiteSettingsContent from '../components/SiteSettingsContent'; // Importar el nuevo componente
import TradingSignalManagement from '../components/TradingSignalManagement'; // Importar el nuevo componente
+++++++ REPLACE

------- SEARCH
            </li>
            <li className="mb-0.5"> {/* Nuevo enlace para Configuración del Sitio */}
              <Link 
                to="/admin/site-settings" 
                className={`flex items-center py-1.5 rounded-lg text-sm font-medium ${
                  location.pathname === '/admin/site-settings' 
                    ? 'bg-accent text-white' 
                    : (darkMode ? 'text-light_text hover:bg-dark_border' : 'text-gray-300 hover:bg-gray-700')
                }`}
              >
                Configuración del Sitio
              </Link>
            </li>
          </ul>
        </nav>
=======
            </li>
            <li className="mb-0.5"> {/* Nuevo enlace para Gestión de Señales de Trading */}
              <Link 
                to="/admin/trading-signal-management" 
                className={`flex items-center py-1.5 rounded-lg text-sm font-medium ${
                  location.pathname === '/admin/trading-signal-management' 
                    ? 'bg-accent text-white' 
                    : (darkMode ? 'text-light_text hover:bg-dark_border' : 'text-gray-300 hover:bg-gray-700')
                }`}
              >
                Gestión de Señales Trading
              </Link>
            </li>
            <li className="mb-0.5"> {/* Nuevo enlace para Configuración del Sitio */}
              <Link 
                to="/admin/site-settings" 
                className={`flex items-center py-1.5 rounded-lg text-sm font-medium ${
                  location.pathname === '/admin/site-settings' 
                    ? 'bg-accent text-white' 
                    : (darkMode ? 'text-light_text hover:bg-dark_border' : 'text-gray-300 hover:bg-gray-700')
                }`}
              >
                Configuración del Sitio
              </Link>
            </li>
          </ul>
        </nav>
+++++++ REPLACE

------- SEARCH
          <Route path="balance-management" element={<BalanceManagement />} />
          <Route path="site-settings" element={<SiteSettingsContent />} /> {/* Nueva ruta para Configuración del Sitio */}
          {/* Ruta por defecto o dashboard overview */}
=======
          <Route path="balance-management" element={<BalanceManagement />} />
          <Route path="trading-signal-management" element={<TradingSignalManagement />} /> {/* Nueva ruta para Gestión de Señales de Trading */}
          <Route path="site-settings" element={<SiteSettingsContent />} /> {/* Nueva ruta para Configuración del Sitio */}
          {/* Ruta por defecto o dashboard overview */}
+++++++ REPLACE
```

## 3. Actualizaciones en Firebase/Firestore

### `firestore.rules`

Actualiza tus reglas de seguridad de Firestore para incluir la colección `tradingSignals`. Esto permitirá a los usuarios autenticados leer las señales y a los administradores gestionarlas (crear, actualizar, eliminar).

```diff
------- SEARCH
    match /contactRequests/{ticketId} {
      allow read, create, update: if request.auth != null && request.auth.uid == resource.data.userId;
      allow read, update: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Regla general para cualquier otra colección (denegar todo)
    match /{document=**} {
      allow read, write: if false;
    }
=======
    match /contactRequests/{ticketId} {
      allow read, create, update: if request.auth != null && request.auth.uid == resource.data.userId;
      allow read, update: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Reglas para señales de trading
    match /tradingSignals/{signalId} {
      allow read, list: if request.auth != null; // Los usuarios autenticados pueden leer las señales
      allow create, update, delete: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'; // Solo los administradores pueden crear, actualizar y eliminar
    }

    // Regla general para cualquier otra colección (denegar todo)
    match /{document=**} {
      allow read, write: if false;
    }
+++++++ REPLACE
```

### Colección `tradingSignals` en Firestore

No necesitas crear la colección manualmente; se creará automáticamente cuando se añada la primera señal desde el panel de administración. Asegúrate de que tu base de datos de Firestore esté configurada y accesible.

## 4. Estilos CSS

Los nuevos componentes `TradingSignal.jsx` y `TradingSignalManagement.jsx` reutilizan los estilos definidos en `src/user/pages/UserPanel.module.css`. Asegúrate de que este archivo CSS contenga las clases necesarias o de que tu configuración de Tailwind CSS (si la usas) esté correctamente integrada para que los estilos se apliquen.

Si necesitas estilos específicos para las señales de compra/venta, puedes añadir algo como esto a `src/user/pages/UserPanel.module.css`:

```css
/* src/user/pages/UserPanel.module.css */

.signalBuy {
  color: var(--green-check); /* Define esta variable en tu CSS global o tailwind.config.js */
}

.signalSell {
  color: var(--red-error); /* Define esta variable en tu CSS global o tailwind.config.js */
}

/* Otros estilos relevantes que puedan necesitarse */
.settingsContent {
  /* Asegúrate de que este estilo base exista y sea adecuado */
}

.pageTitle {
  /* Estilos para títulos de página */
}

.sectionCard {
  /* Estilos para las tarjetas de sección */
}

.sectionTitle {
  /* Estilos para títulos de sección */
}

.noDataText {
  /* Estilos para mensajes de "no hay datos" */
}

.settingsGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.formGroup {
  margin-bottom: 1rem;
}

.formLabel {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.formInput,
.formSelect,
.replyTextarea {
  width: 100%;
  padding: 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--border-color); /* Asegúrate de que --border-color esté definido */
  background-color: var(--input-bg); /* Asegúrate de que --input-bg esté definido */
  color: var(--text-color); /* Asegúrate de que --text-color esté definido */
}

.submitButton {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  background-color: var(--accent); /* Asegúrate de que --accent esté definido */
  color: white;
  font-weight: 600;
  transition: background-color 0.2s ease-in-out;
}

.submitButton:hover {
  background-color: var(--accent-dark); /* Asegúrate de que --accent-dark esté definido */
}

.tableContainer {
  overflow-x: auto;
}

.table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}

.tableHeader {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 2px solid var(--border-color);
}

.tableCell {
  padding: 0.75rem;
  border-bottom: 1px solid var(--border-color);
}

.tableCellActions {
  display: flex;
  gap: 0.5rem;
}

.editButton, .deleteButton {
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease-in-out;
}

.editButton {
  background-color: var(--blue-link);
  color: white;
}

.editButton:hover {
  background-color: darken(var(--blue-link), 10%);
}

.deleteButton {
  background-color: var(--red-error);
  color: white;
}

.deleteButton:hover {
  background-color: darken(var(--red-error), 10%);
}

.loadingOverlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.loadingText {
  color: white;
  font-size: 1.25rem;
}
```

Asegúrate de que las variables CSS como `--green-check`, `--red-error`, `--border-color`, `--input-bg`, `--text-color`, `--accent`, `--accent-dark` estén definidas en tu archivo CSS global o en la configuración de tu tema.

Con estos pasos, la sección "Señal Trading" debería estar completamente integrada en tu aplicación.
