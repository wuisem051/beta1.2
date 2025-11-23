import React, { useState, useEffect, useRef, useContext, useMemo } from 'react'; // Importar useContext y useMemo
import { useAuth } from '../../context/AuthContext';
import { ThemeContext } from '../../context/ThemeContext'; // Importar ThemeContext
import { useNavigate, Routes, Route, useLocation } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import Chart from 'chart.js/auto';
import { countMinersByUser } from '../../utils/miners';
import { db, auth } from '../../services/firebase'; // Importar db y auth desde firebase.js
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc, setDoc, addDoc, deleteDoc, getDocs, orderBy } from 'firebase/firestore';
import { updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import UserPoolArbitrage from '../components/UserPoolArbitrage'; // Importar UserPoolArbitrage
import TradingSignal from '../components/TradingSignal'; // Importar TradingSignal
import TradingPanel from '../components/TradingPanel'; // Importar TradingPanel
import WalletDisplay from '../components/WalletDisplay'; // Importar WalletDisplay
import P2P_MarketplacePage from '../pages/P2P_MarketplacePage'; // Importar P2P_MarketplacePage
import Sidebar from '../../common/layout/Sidebar'; // Importar Sidebar
import MainContent from '../components/MainContent'; // Importar MainContent
import ErrorMessage from '../components/ErrorMessage'; // Importar ErrorMessage
import StatsSection from '../components/StatsSection'; // Importar StatsSection
import PerformanceStatsSection from '../components/PerformanceStatsSection'; // Importar PerformanceStatsSection
import styles from './UserPanel.module.css'; // Importar estilos CSS Modules
import useFormValidation from '../../hooks/useFormValidation'; // Importar useFormValidation
import { useError } from '../../context/ErrorContext'; // Importar useError

// Componentes de las sub-secciones
const DashboardContent = ({ userMiners, chartData, userBalances, paymentRate, btcToUsdRate, totalHashratePool, poolCommission, paymentsHistory, withdrawalsHistory, styles, totalHashrate, estimatedDailyUSD, activeMinersAllUsers, pricePerTHs }) => {
  const { darkMode } = useContext(ThemeContext); // Usar ThemeContext

  console.log("DashboardContent: Renderizando con props:", { userMiners, chartData, userBalances, paymentRate, btcToUsdRate, totalHashratePool, poolCommission, paymentsHistory, withdrawalsHistory, totalHashrate, estimatedDailyUSD });

  const estimatedDailyBTC = useMemo(() => {
    return btcToUsdRate > 0 ? estimatedDailyUSD / btcToUsdRate : 0;
  }, [estimatedDailyUSD, btcToUsdRate]);

  const userPercentageOfPool = useMemo(() => {
    return totalHashratePool > 0 ? (totalHashrate / totalHashratePool) * 100 : 0;
  }, [totalHashrate, totalHashratePool]);

  // Obtener el último pago o retiro
  const lastPayment = paymentsHistory.length > 0 ? paymentsHistory[0] : null;
  const lastWithdrawal = withdrawalsHistory.length > 0 ? withdrawalsHistory[0] : null;

  let lastTransactionInfo = "No hay historial";
  if (lastPayment && lastWithdrawal) {
    if (lastPayment.createdAt > lastWithdrawal.createdAt) {
      lastTransactionInfo = `Pago: ${lastPayment.amount.toFixed(8)} ${lastPayment.currency} (${lastPayment.createdAt.toLocaleDateString()})`;
    } else {
      lastTransactionInfo = `Retiro: ${lastWithdrawal.amount.toFixed(8)} ${lastWithdrawal.currency} (${lastWithdrawal.createdAt.toLocaleDateString()})`;
    }
  } else if (lastPayment) {
    lastTransactionInfo = `Pago: ${lastPayment.amount.toFixed(8)} ${lastPayment.currency} (${lastPayment.createdAt.toLocaleDateString()})`;
  } else if (lastWithdrawal) {
    lastTransactionInfo = `Retiro: ${lastWithdrawal.amount.toFixed(8)} ${lastWithdrawal.currency} (${lastWithdrawal.createdAt.toLocaleDateString()})`;
  }

  return (
    <div className={styles.dashboardContent}>
      <div className={styles.statsGrid}>
        {/* Tu Hashrate */}
        <div className={`${styles.statCard} ${darkMode ? styles.dark : styles.light}`}>
          <h3 className={styles.statTitle}>Tu Hashrate</h3>
          <p className={styles.statValueBlue}>{totalHashrate.toFixed(2)} TH/s</p>
          <div className={styles.statIconBlue}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue_link" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          </div>
        </div>
        {/* Ganancia Estimada Diaria */}
        <div className={`${styles.statCard} ${darkMode ? styles.dark : styles.light}`}>
          <h3 className={styles.statTitle}>Ganancia Estimada Diaria</h3>
          <p className={styles.statValueGreen}>${estimatedDailyUSD.toFixed(2)}</p>
          <div className={styles.statIconGreen}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green_check" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V3a1 1 0 00-1-1H4a1 1 0 00-1 1v18a1 1 0 001 1h12a1 1 0 001-1v-5m-1-10v4m-4 0h4"/></svg>
          </div>
        </div>
        {/* Tasa de Pago */}
        <div className={`${styles.statCard} ${darkMode ? styles.dark : styles.light}`}>
          <h3 className={styles.statTitle}>Tasa de Pago</h3>
          <p className={styles.statValueAccent}>${paymentRate.toFixed(2)}/TH/s</p>
          <div className={styles.statIconAccent}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
          </div>
        </div>
      </div>

      <PerformanceStatsSection /> {/* Añadir PerformanceStatsSection */}
      <StatsSection totalHashrate={totalHashratePool} activeMiners={activeMinersAllUsers} pricePerTHs={pricePerTHs} /> {/* Añadir StatsSection */}

      <div className={styles.chartAndStatsGrid}>
        {/* Rendimiento Histórico */}
        <div className={`${styles.chartCard} ${darkMode ? styles.dark : styles.light}`}>
          <h3 className={styles.chartTitle}>Rendimiento Histórico</h3>
          <div className={styles.chartContainer}>
            {userMiners.length > 0 ? (
              <Bar data={chartData} options={{ maintainAspectRatio: false }} />
            ) : (
              <p className={styles.noDataText}>No hay datos de rendimiento disponibles.</p>
            )}
          </div>
        </div>

        {/* Estadísticas de la Pool */}
        <div className={`${styles.statsCard} ${darkMode ? styles.dark : styles.light}`}>
          <h3 className={styles.statsTitle}>Estadísticas de la Pool</h3>
          <div className={styles.statsList}>
            <div className={styles.statsItem}>
              <span>Comisión de la Pool:</span>
              <span className={styles.statsValueRed}>{poolCommission.toFixed(1)}%</span>
            </div>
            <div className={styles.statsItem}>
              <span>Última Transacción:</span>
              <span className={styles.statsValueGreen}>{lastTransactionInfo}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MiningInfoContent = ({ currentUser, userMiners, setUserMiners, styles }) => {
  const { darkMode } = useContext(ThemeContext); // Usar ThemeContext
  const { showError, showSuccess } = useError(); // Usar el contexto de errores
  const [poolUrl, setPoolUrl] = useState('stratum+tcp://bitcoinpool.com:4444');
  const [port, setPort] = useState('4444');
  const [defaultWorkerName, setDefaultWorkerName] = useState('worker1');
  const miningPassword = 'x';
  const [isLoading, setIsLoading] = useState(false); // Estado de carga

  const initialMinerState = {
    newMinerThs: '',
  };

  const validateMinerForm = (values) => {
    const errors = {};
    if (!values.newMinerThs) {
      errors.newMinerThs = 'El poder de minado es requerido.';
    } else if (isNaN(parseFloat(values.newMinerThs)) || parseFloat(values.newMinerThs) <= 0) {
      errors.newMinerThs = 'Por favor, introduce una cantidad válida de TH/s.';
    }
    return errors;
  };

  const {
    values: minerValues,
    handleChange: handleMinerChange,
    handleSubmit: handleMinerSubmit,
    errors: minerErrors,
    isSubmitting: isMinerSubmitting,
    setValues: setMinerValues,
    setErrors: setMinerErrors,
    setSubmitting: setMinerSubmitting,
  } = useFormValidation(initialMinerState, validateMinerForm);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    showSuccess('Copiado al portapapeles!');
  };

  useEffect(() => {
    const fetchPoolConfigAndMiners = async () => {
      try {
        // Cargar configuración del Pool desde Firebase
        const poolConfigRef = doc(db, 'settings', 'poolConfig');
        const poolConfigSnap = await getDoc(poolConfigRef);
        if (poolConfigSnap.exists()) {
          const poolConfigData = poolConfigSnap.data();
          setPoolUrl(poolConfigData.url || 'stratum+tcp://bitcoinpool.com:4444');
          setPort(poolConfigData.port || '4444');
          setDefaultWorkerName(poolConfigData.defaultWorkerName || 'worker1');
        }

        // Escuchar cambios en los mineros del usuario
        if (currentUser && currentUser.uid) {
          const q = query(collection(db, 'miners'), where('userId', '==', currentUser.uid));
          const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedMiners = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUserMiners(fetchedMiners);
          }, (err) => {
            console.error("Error fetching mining info from Firebase:", err);
            showError('Fallo al cargar la información de minería.');
          });

          return () => {
            unsubscribe();
          };
        } else {
          setUserMiners([]);
        }
      } catch (err) {
        console.error("Error fetching mining info:", err);
        showError('Fallo al cargar la información de minería.');
      }
    };
    fetchPoolConfigAndMiners();
  }, [currentUser, setUserMiners, showError]);

  useEffect(() => {
    if (isMinerSubmitting) {
      if (Object.keys(minerErrors).length === 0) {
        handleAddMinerSubmit();
      }
      setMinerSubmitting(false);
    }
  }, [isMinerSubmitting, minerErrors]);

  const handleAddMinerSubmit = async () => {
    setIsLoading(true);

    if (!currentUser || !currentUser.uid) {
      showError('Debes iniciar sesión para añadir un minero.');
      setIsLoading(false);
      return;
    }

    try {
      const newMinerRef = await addDoc(collection(db, 'miners'), {
        userId: currentUser.uid,
        workerName: defaultWorkerName || `worker-${Math.random().toString(36).substring(2, 8)}`,
        currentHashrate: parseFloat(minerValues.newMinerThs),
        status: 'activo',
        createdAt: new Date(),
      });

      console.log("Minero añadido a Firebase:", newMinerRef.id);
      showSuccess('Minero añadido exitosamente!');
      setMinerValues(initialMinerState); // Limpiar el formulario
      setMinerErrors({}); // Limpiar errores
    } catch (err) {
      console.error("Error al añadir minero:", err);
      showError(`Fallo al añadir minero: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMiner = async (minerId) => {
    if (!currentUser || !currentUser.uid) {
      showError('Debes iniciar sesión para eliminar un minero.');
      return;
    }
    if (window.confirm('¿Estás seguro de que quieres eliminar este minero?')) {
      setIsLoading(true);
      try {
        await deleteDoc(doc(db, 'miners', minerId));
        showSuccess('Minero eliminado exitosamente.');
      } catch (err) {
        console.error("Error al eliminar minero:", err);
        showError(`Fallo al eliminar minero: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className={styles.miningInfoContent}>
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingText}>Procesando...</div>
        </div>
      )}
      {/* Los mensajes de error y éxito ahora se manejan globalmente */}

      {/* Sección: Añadir Nuevo Minero */}
      <div className={`${styles.sectionCard} ${darkMode ? styles.dark : styles.light}`}>
        <h2 className={styles.sectionTitle}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
          Añadir Nuevo Minero
        </h2>
        <form onSubmit={handleMinerSubmit} className={styles.form}>
          <div>
            <label htmlFor="newMinerThs" className={styles.formLabel}>Poder de Minado (TH/s):</label>
            <input
              type="number"
              id="newMinerThs"
              name="newMinerThs"
              value={minerValues.newMinerThs}
              onChange={handleMinerChange}
              step="0.01"
              className={`${styles.formInput} ${darkMode ? styles.darkInput : styles.lightInput}`}
              placeholder="Ej: 100.5"
              required
            />
            {minerErrors.newMinerThs && <p className={styles.errorText}>{minerErrors.newMinerThs}</p>}
          </div>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={isLoading || isMinerSubmitting}
          >
            {isLoading || isMinerSubmitting ? (
              <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
            )}
            {isLoading || isMinerSubmitting ? 'Añadiendo...' : 'Añadir Minero'}
          </button>
        </form>
      </div>

      {/* Sección: Mineros Activos */}
      <div className={`${styles.sectionCard} ${darkMode ? styles.dark : styles.light}`}>
        <h2 className={styles.sectionTitle}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-green_check" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
          Mis Mineros Activos
        </h2>
        {userMiners.length === 0 ? (
          <p className={styles.noMinersText}>No tienes mineros activos. ¡Añade uno para empezar a minar!</p>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead className={`${darkMode ? styles.darkTableHead : styles.lightTableHead}`}>
                <tr>
                  <th className={styles.tableHeader}>Nombre del Worker</th>
                  <th className={styles.tableHeader}>TH/s</th>
                  <th className={styles.tableHeader}>Acciones</th>
                </tr>
              </thead>
              <tbody className={`${darkMode ? styles.darkTableBody : styles.lightTableBody}`}>
                {userMiners.map((miner) => (
                  <tr key={miner.id}>
                    <td className={styles.tableCell}>
                      <div className={styles.workerNameContainer}>
                        <input type="text" value={miner.workerName} readOnly className={`${styles.workerNameInput} ${darkMode ? styles.darkInput : styles.lightInput}`} />
                        <button onClick={() => handleCopy(miner.workerName)} className={styles.copyButton}>📋</button>
                      </div>
                    </td>
                    <td className={styles.tableCell}>{(miner.currentHashrate || 0).toFixed(2)}</td>
                    <td className={styles.tableCellActions}>
                      <button
                        onClick={() => handleDeleteMiner(miner.id)}
                        className={styles.deleteButton}
                        disabled={isLoading}
                      >
                        {isLoading ? 'Eliminando...' : 'Eliminar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Instrucciones de Configuración del Pool Estándar */}
      <div className={`${styles.poolConfigSection} ${darkMode ? styles.dark : styles.light}`}>
        <h3 className={styles.poolConfigTitle}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue_link" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          Instrucciones de Conexión (Pool Estándar)
        </h3>
        <p className={styles.poolConfigDescription}>Usa esta información para configurar tu minero con nuestra pool principal.</p>
        <div className={styles.poolConfigGrid}>
          <div>
            <h4 className={styles.poolConfigSubtitle}>Detalles de Conexión:</h4>
            <ul className={styles.poolConfigList}>
              <li>URL del Pool: {poolUrl} <button onClick={() => handleCopy(poolUrl)} className={styles.copyButton}>📋</button></li>
              <li>Puerto: {port} <button onClick={() => handleCopy(port)} className={styles.copyButton}>📋</button></li>
              <li>Contraseña de Minería: {miningPassword} <button onClick={() => handleCopy(miningPassword)} className={styles.copyButton}>📋</button></li>
            </ul>
          </div>
          <div>
            <h4 className={styles.poolConfigSubtitle}>Ejemplo de Configuración:</h4>
            <pre className={`${styles.codeBlock} ${darkMode ? styles.darkCodeBlock : styles.lightCodeBlock}`}>
              <code>
                URL: {poolUrl} <br />
                Usuario: {defaultWorkerName} <br />
                Contraseña: {miningPassword}
              </code>
            </pre>
            <p className={styles.workerNameHint}>El nombre de worker por defecto es: {defaultWorkerName}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const PaymentsContent = ({ currentUser, styles }) => {
  const { darkMode } = useContext(ThemeContext); // Usar ThemeContext
  const { showError } = useError(); // Usar el contexto de errores
  const [paymentsHistory, setPaymentsHistory] = useState([]);

  useEffect(() => {
    if (!currentUser || !currentUser.uid) {
      setPaymentsHistory([]);
      return;
    }

    const q = query(
      collection(db, 'payments'),
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt.toDate(),
        }));
        setPaymentsHistory(data);
      } catch (fetchError) {
        console.error("Error fetching payments history from Firebase:", fetchError);
        showError('Error al cargar el historial de pagos.');
      }
    }, (err) => {
      console.error("Error subscribing to payments:", err);
      showError('Error al suscribirse al historial de pagos.');
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser, showError]);

  return (
    <div className={styles.paymentsContent}>
      <h1 className={styles.pageTitle}>Historial de Pagos</h1>
      {/* Los mensajes de error y éxito ahora se manejan globalmente */}

      <div className={`${styles.sectionCard} ${darkMode ? styles.dark : styles.light}`}>
        <h2 className={styles.sectionTitle}>Pagos Recibidos</h2>
        {paymentsHistory.length === 0 ? (
          <p className={styles.noDataText}>No hay pagos registrados.</p>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead className={`${darkMode ? styles.darkTableHead : styles.lightTableHead}`}>
                <tr>
                  <th className={styles.tableHeader}>Fecha</th>
                  <th className={styles.tableHeader}>Cantidad</th>
                  <th className={styles.tableHeader}>Moneda</th>
                  <th className={styles.tableHeader}>Estado</th>
                </tr>
              </thead>
              <tbody className={`${darkMode ? styles.darkTableBody : styles.lightTableBody}`}>
                {paymentsHistory.map((payment) => (
                  <tr key={payment.id}>
                    <td className={styles.tableCell}>
                      {payment.createdAt.toLocaleDateString()}
                    </td>
                    <td className={styles.tableCell}>
                      {payment.amount.toFixed(8)} {payment.currency}
                    </td>
                    <td className={styles.tableCell}>
                      {payment.currency}
                    </td>
                    <td className={styles.tableCell}>
                      <span className={`${styles.statusBadge} ${
                        payment.status === 'Pendiente' ? styles.statusPending :
                        payment.status === 'Completado' ? styles.statusCompleted :
                        styles.statusError
                      }`}>
                        {payment.status}
                      </span>
                    </td>
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

const WithdrawalsContent = ({ minPaymentThresholds, userPaymentAddresses, styles }) => {
  const { darkMode } = useContext(ThemeContext); // Usar ThemeContext
  const { showError, showSuccess } = useError(); // Usar el contexto de errores
  const { currentUser } = useAuth();
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('BTC');
  const [walletAddress, setWalletAddress] = useState('');
  const [binanceId, setBinanceId] = useState('');
  const [useBinancePay, setUseBinancePay] = useState(false);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [userBalances, setUserBalances] = useState({
    balanceUSD: 0,
    balanceBTC: 0,
    balanceLTC: 0,
    balanceDOGE: 0,
    balanceVES: 0, // Añadir balanceVES
  });
  const [withdrawalsHistory, setWithdrawalsHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false); // Estado de carga
  const [selectedAddress, setSelectedAddress] = useState(''); // Nuevo estado para la dirección seleccionada

  // Efecto para inicializar y actualizar la dirección seleccionada y los campos manuales
  useEffect(() => {
    const balanceKey = `balance${currency}`;
    setAvailableBalance(userBalances[balanceKey] || 0);

    const savedAddressForCurrency = userPaymentAddresses[currency];

    if (selectedAddress === 'new') {
      // Si se selecciona "Ingresar nueva dirección", limpiar los campos
      setWalletAddress('');
      setBinanceId('');
      setUseBinancePay(currency === 'USD');
    } else if (savedAddressForCurrency && selectedAddress === savedAddressForCurrency) {
      // Si hay una dirección guardada y está seleccionada
      if (currency === 'USD') {
        setBinanceId(savedAddressForCurrency);
        setWalletAddress('');
        setUseBinancePay(true);
      } else {
        setWalletAddress(savedAddressForCurrency);
        setBinanceId('');
        setUseBinancePay(false);
      }
    } else {
      // Si no hay dirección guardada o la seleccionada no coincide, establecer "new"
      setSelectedAddress('new');
      setWalletAddress('');
      setBinanceId('');
      setUseBinancePay(currency === 'USD');
    }
  }, [userBalances, currency, userPaymentAddresses, selectedAddress]);

  useEffect(() => {
    const fetchWithdrawalData = async () => {
      if (!currentUser || !currentUser.uid) {
        setWithdrawalsHistory([]);
        setUserBalances({
          balanceUSD: 0,
          balanceBTC: 0,
          balanceLTC: 0,
          balanceDOGE: 0,
          balanceVES: 0,
        });
        return;
      }

      try {
        // Cargar balances del usuario desde Firebase
        const userDocRef = doc(db, 'users', currentUser.uid);
        const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            setUserBalances({
              balanceUSD: userData.balanceUSD || 0,
              balanceBTC: userData.balanceBTC || 0,
              balanceLTC: userData.balanceLTC || 0,
              balanceDOGE: userData.balanceDOGE || 0,
              balanceVES: userData.balanceVES || 0, // Añadir balanceVES
            });
          }
        }, (err) => {
          console.error("Error subscribing to user balances:", err);
          showError('Error al configurar el listener de balances.');
        });

        // Cargar historial de retiros del usuario desde Firebase
        const q = query(
          collection(db, 'withdrawals'),
          where('userId', '==', currentUser.uid),
          orderBy('createdAt', 'desc')
        );
        const unsubscribeWithdrawals = onSnapshot(q, (snapshot) => {
          const fetchedWithdrawals = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt.toDate(),
          }));
          setWithdrawalsHistory(fetchedWithdrawals);
        }, (err) => {
          console.error("Error subscribing to withdrawals:", err);
          showError('Error al configurar el listener de retiros.');
        });

        return () => {
          unsubscribeUser();
          unsubscribeWithdrawals();
        };
      } catch (err) {
        console.error("Error setting up listeners:", err);
        showError('Error al configurar los listeners de datos.');
      }
    };

    fetchWithdrawalData();
  }, [currentUser, showError]); // Eliminado 'currency' de las dependencias para evitar bucles con el useEffect de arriba

  const handleSubmitWithdrawal = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (!currentUser || !currentUser.uid || !currentUser.email) {
      showError('Debes iniciar sesión para solicitar un retiro.');
      setIsLoading(false);
      return;
    }

    const withdrawalAmount = parseFloat(amount);
    if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
      showError('Por favor, introduce una cantidad válida.');
      setIsLoading(false);
      return;
    }
    const currentMinThreshold = minPaymentThresholds[currency] || 0;
    if (withdrawalAmount < currentMinThreshold) {
      showError(`La cantidad mínima de retiro es ${currentMinThreshold.toFixed(currency === 'USD' ? 2 : 8)} ${currency}.`);
      setIsLoading(false);
      return;
    }
    const currentBalanceForCurrency = userBalances[`balance${currency}`] || 0;
    if (withdrawalAmount > currentBalanceForCurrency) {
      showError(`Fondos insuficientes para realizar el retiro en ${currency}.`);
      setIsLoading(false);
      return;
    }

    let method = '';
    let addressOrId = '';

    if (selectedAddress && selectedAddress !== 'new') {
      // Usar la dirección seleccionada de las guardadas
      addressOrId = selectedAddress;
      method = (currency === 'USD' && useBinancePay) ? 'Binance Pay' : 'Wallet';
    } else {
      // Usar la dirección ingresada manualmente
      if (useBinancePay) {
        if (!binanceId.trim()) {
          showError('Por favor, introduce tu Email o ID de Binance.');
          setIsLoading(false);
          return;
        }
        method = 'Binance Pay';
        addressOrId = binanceId.trim();
      } else {
        if (!walletAddress.trim()) {
          showError('Por favor, introduce tu Dirección de Wallet.');
          setIsLoading(false);
          return;
        }
        method = 'Wallet';
        addressOrId = walletAddress.trim();
      }
    }

    try {
      await addDoc(collection(db, 'withdrawals'), {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        amount: withdrawalAmount,
        currency: currency,
        method: method,
        addressOrId: addressOrId,
        status: 'Pendiente',
        createdAt: new Date(),
      });

      // Actualizar el balance del usuario en la tabla 'users'
      const balanceKey = `balance${currency}`;
      const newBalance = currentBalanceForCurrency - withdrawalAmount;

      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, { [balanceKey]: newBalance });

      showSuccess('Solicitud de retiro enviada exitosamente. Será procesada a la brevedad.');
      setAmount('');
      setWalletAddress('');
      setBinanceId('');
      setUseBinancePay(false);
    } catch (err) {
      console.error("Error submitting withdrawal:", err);
      showError(`Fallo al enviar la solicitud de retiro: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.withdrawalsContent}>
      <h1 className={styles.pageTitle}>Retiros</h1>
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingText}>Procesando...</div>
        </div>
      )}
      {/* Los mensajes de error y éxito ahora se manejan globalmente */}

      <div className={styles.withdrawalGrid}>
        {/* Solicitar Retiro */}
        <div className={`${styles.sectionCard} ${darkMode ? styles.dark : styles.light}`}>
          <h2 className={styles.sectionTitle}>Solicitar Retiro</h2>
          <form onSubmit={handleSubmitWithdrawal}>
            <div className={styles.formGroup}>
              <label htmlFor="amount" className={styles.formLabel}>Cantidad</label>
              <input
                type="number"
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                step="any"
                className={`${styles.formInput} ${darkMode ? styles.darkInput : styles.lightInput}`}
                placeholder="0.00000000"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="currency" className={styles.formLabel}>Moneda</label>
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className={`${styles.formSelect} ${darkMode ? styles.darkInput : styles.lightInput}`}
              >
                <option value="BTC">Bitcoin (BTC)</option>
                <option value="DOGE">Dogecoin (DOGE)</option>
                <option value="LTC">Litecoin (LTC)</option>
                <option value="USD">USD</option>
                <option value="VES">Bolívar Soberano (VES)</option> {/* Añadir VES */}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="savedAddress" className={styles.formLabel}>Dirección de Retiro ({currency})</label>
              <select
                id="savedAddress"
                value={selectedAddress}
                onChange={(e) => {
                  const newSelectedAddress = e.target.value;
                  setSelectedAddress(newSelectedAddress);
                }}
                className={`${styles.formSelect} ${darkMode ? styles.darkInput : styles.lightInput}`}
                disabled={isLoading}
              >
                {userPaymentAddresses[currency] && (
                  <option value={userPaymentAddresses[currency]}>
                    {userPaymentAddresses[currency]} (Guardada)
                  </option>
                )}
                <option value="new">Ingresar nueva dirección</option>
              </select>
            </div>

            {/* Campos de entrada manual */}
            <div className={styles.formGroup}>
              <label htmlFor="walletAddress" className={styles.formLabel}>Dirección de Wallet (Manual)</label>
              <input
                type="text"
                id="walletAddress"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                className={`${styles.formInput} ${darkMode ? styles.darkInput : styles.lightInput}`}
                placeholder={currency === 'BTC' ? 'bc1q...' : currency === 'LTC' ? 'ltc1q...' : currency === 'DOGE' ? 'D...' : ''}
                disabled={isLoading || selectedAddress !== 'new' || useBinancePay}
                required={selectedAddress === 'new' && !useBinancePay}
              />
            </div>

            <div className={styles.orSeparator}>O usar Binance Pay</div>

            <div className={styles.formGroup}>
              <label htmlFor="binanceId" className={styles.formLabel}>Email o ID de Binance (Manual)</label>
              <input
                type="text"
                id="binanceId"
                value={binanceId}
                onChange={(e) => setBinanceId(e.target.value)}
                className={`${styles.formInput} ${darkMode ? styles.darkInput : styles.lightInput}`}
                placeholder="ejemplo@binance.com o 123456789"
                disabled={isLoading || selectedAddress !== 'new' || !useBinancePay}
                required={selectedAddress === 'new' && useBinancePay}
              />
            </div>
            <div className={styles.checkboxGroup}>
              <input
                type="checkbox"
                id="useBinancePay"
                checked={useBinancePay}
                onChange={(e) => {
                  setUseBinancePay(e.target.checked);
                  // Limpiar el otro campo cuando se cambia el método
                  if (e.target.checked) {
                    setWalletAddress('');
                  } else {
                    setBinanceId('');
                  }
                }}
                className={styles.checkbox}
                disabled={isLoading || selectedAddress !== 'new'}
              />
              <label htmlFor="useBinancePay" className={styles.checkboxLabel}>Usar Binance Pay en lugar de dirección de wallet</label>
            </div>

            <div className={styles.balanceInfo}>
              <span>Balance disponible: {availableBalance.toFixed(currency === 'USD' ? 2 : 8)} {currency}</span>
              <span>Umbral mínimo: {(minPaymentThresholds[currency] || 0).toFixed(currency === 'USD' ? 2 : 8)} {currency}</span>
            </div>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={isLoading}
            >
              {isLoading ? (
                <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : 'Solicitar Retiro'}
            </button>
          </form>
        </div>

        {/* Historial de Retiros */}
        <div className={`${styles.sectionCard} ${darkMode ? styles.dark : styles.light}`}>
          <h2 className={styles.sectionTitle}>Historial de Retiros</h2>
          {withdrawalsHistory.length === 0 ? (
            <p className={styles.noDataText}>No hay retiros registrados.</p>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead className={`${darkMode ? styles.darkTableHead : styles.lightTableHead}`}>
                  <tr>
                    <th className={styles.tableHeader}>Fecha</th>
                    <th className={styles.tableHeader}>Cantidad</th>
                    <th className={styles.tableHeader}>Método</th>
                    <th className={styles.tableHeader}>Estado</th>
                  </tr>
                </thead>
                <tbody className={`${darkMode ? styles.darkTableBody : styles.lightTableBody}`}>
                  {withdrawalsHistory.map((withdrawal) => (
                    <tr key={withdrawal.id}>
                      <td className={styles.tableCell}>
                        {withdrawal.createdAt.toLocaleDateString()}
                      </td>
                      <td className={styles.tableCell}>
                        {withdrawal.amount.toFixed(8)} {withdrawal.currency}
                      </td>
                      <td className={styles.tableCell}>
                        {withdrawal.currency}
                      </td>
                      <td className={styles.tableCell}>
                        <span className={`${styles.statusBadge} ${
                          withdrawal.status === 'Pendiente' ? styles.statusPending :
                          withdrawal.status === 'Completado' ? styles.statusCompleted :
                          styles.statusError
                        }`}>
                          {withdrawal.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ContactSupportContent = ({ onUnreadCountChange, styles }) => {
  const { darkMode } = useContext(ThemeContext); // Usar ThemeContext
  const { showError, showSuccess } = useError(); // Usar el contexto de errores
  const { currentUser } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [subject, setSubject] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [isLoading, setIsLoading] = useState(false); // Estado de carga

  useEffect(() => {
    if (!currentUser || !currentUser.uid) {
      setTickets([]);
      if (onUnreadCountChange) {
        onUnreadCountChange(0);
      }
      return;
    }

    const q = query(
      collection(db, 'contactRequests'),
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const fetchedTickets = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt.toDate(),
          updatedAt: doc.data().updatedAt.toDate(),
        }));
        setTickets(fetchedTickets);

        const unreadCount = fetchedTickets.filter(ticket =>
          ticket.status === 'Respondido' &&
          ticket.conversation.some(msg => msg.sender === 'admin' && !msg.readByUser)
        ).length;
        if (onUnreadCountChange) {
          onUnreadCountChange(unreadCount);
        }

        if (selectedTicket) {
          const updatedSelected = fetchedTickets.find(t => t.id === selectedTicket.id);
          setSelectedTicket(updatedSelected || null);
        }
      } catch (fetchError) {
        console.error("Error al cargar tickets desde Firebase:", fetchError);
        showError('Error al cargar tus solicitudes de soporte.');
      }
    }, (err) => {
      console.error("Error subscribing to contact requests:", err);
      showError('Error al suscribirse a las solicitudes de soporte.');
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser, selectedTicket, onUnreadCountChange, showError]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (!messageContent.trim()) {
      showError('El mensaje no puede estar vacío.');
      setIsLoading(false);
      return;
    }

    if (!currentUser || !currentUser.uid || !currentUser.email) {
      showError('Debes iniciar sesión para enviar un mensaje.');
      setIsLoading(false);
      return;
    }

    try {
      if (selectedTicket) {
        const newConversation = [...selectedTicket.conversation, {
          sender: 'user',
          text: messageContent,
          timestamp: new Date(),
        }];
        const ticketRef = doc(db, 'contactRequests', selectedTicket.id);
        await updateDoc(ticketRef, {
          conversation: newConversation,
          status: 'Pendiente',
          updatedAt: new Date(),
        });
        showSuccess('Tu respuesta ha sido enviada.');
      } else {
        if (!subject.trim()) {
          showError('Por favor, introduce un asunto para tu nueva consulta.');
          setIsLoading(false);
          return;
        }
        await addDoc(collection(db, 'contactRequests'), {
          userId: currentUser.uid,
          userEmail: currentUser.email,
          subject: subject,
          status: 'Abierto',
          createdAt: new Date(),
          updatedAt: new Date(),
          conversation: [{
            sender: 'user',
            text: messageContent,
            timestamp: new Date(),
          }],
        });
        showSuccess('Tu nueva consulta ha sido enviada. Te responderemos a la brevedad.');
        setSubject('');
      }
      setMessageContent('');
    } catch (err) {
      console.error("Error al enviar mensaje a Firebase:", err);
      showError(`Fallo al enviar mensaje: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTicket = async (ticket) => {
    setSelectedTicket(ticket);
    setSubject(ticket.subject);
    setMessageContent('');
    // Limpiar mensajes de error/éxito al seleccionar un nuevo ticket
    showError(null);
    showSuccess(null);

    if (ticket.status === 'Respondido' && ticket.conversation.some(msg => msg.sender === 'admin' && !msg.readByUser)) {
      const updatedConversation = ticket.conversation.map(msg =>
        msg.sender === 'admin' ? { ...msg, readByUser: true } : msg
      );
      try {
        const ticketRef = doc(db, 'contactRequests', ticket.id);
        await updateDoc(ticketRef, { conversation: updatedConversation });
      } catch (fetchError) {
        console.error("Error al marcar mensajes como leídos en Firebase:", fetchError);
        showError('Error al actualizar el estado de lectura del ticket.');
      }
    }
  };

  const handleNewTicket = () => {
      setSelectedTicket(null);
      setSubject('');
      setMessageContent('');
      // Limpiar mensajes de error/éxito al crear un nuevo ticket
      showError(null);
      showSuccess(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Abierto': return styles.statusOpen;
      case 'Pendiente': return styles.statusPending;
      case 'Respondido': return styles.statusResponded;
      case 'Cerrado': return styles.statusClosed;
      default: return styles.statusDefault;
    }
  };

  return (
    <div className={styles.contactSupportContainer}>
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingText}>Procesando...</div>
        </div>
      )}
      {/* Los mensajes de error y éxito ahora se manejan globalmente */}

      {/* Lista de Tickets */}
      <div className={`${styles.ticketListPanel} ${darkMode ? styles.dark : styles.light}`}>
        <div className={styles.ticketListHeader}>
          <h2 className={styles.ticketListTitle}>Mis Solicitudes</h2>
          <button
            onClick={handleNewTicket}
            className={styles.newTicketButton}
            disabled={isLoading}
          >
            + Nueva Consulta
          </button>
        </div>
        {tickets.length === 0 ? (
          <p className={styles.noTicketsText}>No tienes solicitudes de soporte aún.</p>
        ) : (
          <ul>
            {tickets.map(ticket => (
              <li
                key={ticket.id}
                className={`${styles.ticketListItem} ${
                  selectedTicket && selectedTicket.id === ticket.id
                    ? styles.selectedTicket
                    : (darkMode ? styles.darkListItem : styles.lightListItem)
                }`}
                onClick={() => handleSelectTicket(ticket)}
              >
                <p className={styles.ticketSubject}>{ticket.subject}</p>
                <p className={styles.ticketLastMessage}>{ticket.conversation[ticket.conversation.length - 1]?.text}</p>
                <div className={styles.ticketMeta}>
                  <span>{ticket.createdAt.toLocaleDateString()}</span>
                  <span className={`${styles.statusBadge} ${getStatusColor(ticket.status)}`}>
                    {ticket.status}
                  </span>
                  {ticket.status === 'Respondido' && ticket.conversation.some(msg => msg.sender === 'admin' && !msg.readByUser) && (
                    <span className={styles.newBadge}>
                      Nuevo
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Detalles de la Solicitud y Formulario de Respuesta */}
      <div className={`${styles.ticketDetailPanel} ${darkMode ? styles.dark : styles.light}`}>
        {selectedTicket ? (
          <div>
            <div className={styles.ticketDetailHeader}>
              <h2 className={styles.ticketDetailTitle}>{selectedTicket.subject}</h2>
              <span className={`${styles.statusBadge} ${getStatusColor(selectedTicket.status)}`}>
                {selectedTicket.status}
              </span>
            </div>
            <p className={styles.ticketDetailDate}>
              Enviado el: {selectedTicket.createdAt.toLocaleString()}
            </p>

            {/* Historial de Conversación */}
            <div className={`${styles.conversationHistory} ${darkMode ? styles.darkInnerCard : styles.lightInnerCard}`}>
              {selectedTicket.conversation.map((msg, index) => (
                <div key={index} className={`${styles.messageContainer} ${msg.sender === 'admin' ? styles.adminMessage : styles.userMessage}`}>
                  <span className={`${styles.messageBubble} ${
                    msg.sender === 'admin' ? styles.adminBubble : (darkMode ? styles.darkUserBubble : styles.lightUserBubble)
                  }`}>
                    {msg.text}
                  </span>
                  <p className={styles.messageMeta}>
                    {msg.sender === 'admin' ? 'Admin' : 'Tú'} - {new Date(msg.timestamp).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>

            {/* Área de Respuesta del Usuario */}
            <div className={`${styles.replySection} ${darkMode ? styles.darkInnerCard : styles.lightInnerCard}`}>
              <h3 className={styles.replyTitle}>Responder a este Ticket</h3>
              <textarea
                rows="4"
                className={`${styles.replyTextarea} ${darkMode ? styles.darkInput : styles.lightInput}`}
                placeholder="Escribe tu respuesta aquí..."
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                required
                disabled={isLoading}
              ></textarea>
              <button
                onClick={handleSendMessage}
                className={styles.submitButton}
                disabled={isLoading}
              >
                {isLoading ? (
                  <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                ) : 'Enviar Respuesta'}
              </button>
            </div>
          </div>
        ) : (
          <div className={`${styles.newTicketFormContainer} ${darkMode ? styles.darkInnerCard : styles.lightInnerCard}`}>
            <h2 className={styles.newTicketFormTitle}>Envía una Nueva Consulta</h2>
            <form onSubmit={handleSendMessage}>
              <div className={styles.formGroup}>
                <label htmlFor="subject" className={styles.formLabel}>Asunto</label>
                <input
                  type="text"
                  id="subject"
                  className={`${styles.formInput} ${darkMode ? styles.darkInput : styles.lightInput}`}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="messageContent" className={styles.formLabel}>Mensaje</label>
                <textarea
                  id="messageContent"
                  rows="5"
                  className={`${styles.replyTextarea} ${darkMode ? styles.darkInput : styles.lightInput}`}
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  required
                  disabled={isLoading}
                ></textarea>
              </div>
              <button
                type="submit"
                className={styles.submitButton}
                disabled={isLoading}
              >
                {isLoading ? (
                  <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                ) : 'Enviar Nueva Consulta'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

const ReferralsContent = ({ styles }) => {
  const { darkMode } = useContext(ThemeContext); // Usar ThemeContext
  return (
    <div className={`${styles.referralsContent} ${darkMode ? styles.dark : styles.light}`}>
      <h2 className={styles.pageTitle}>Referidos</h2>
      <p className={styles.developmentText}>Sección en desarrollo</p>
      <p className={styles.developmentSubText}>Pronto podrás gestionar tus referidos y ganancias aquí.</p>
    </div>
  );
};

const SettingsContent = ({ styles }) => {
  const { darkMode } = useContext(ThemeContext); // Usar ThemeContext
  const { showError, showSuccess } = useError(); // Usar el contexto de errores
  const { currentUser } = useAuth();
  const [contactEmail, setContactEmail] = useState(currentUser?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [paymentAddresses, setPaymentAddresses] = useState({
    BTC: '',
    DOGE: '',
    LTC: '',
    USD: '', // Añadir USD si se permite guardar direcciones para USD
    VES: '', // Añadir VES
  });
  const [receivePaymentNotifications, setReceivePaymentNotifications] = useState(false);
  const [receiveLoginAlerts, setReceiveLoginAlerts] = useState(false);
  const [twoFactorAuthEnabled, setTwoFactorAuthEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Estado de carga

  useEffect(() => {
    const fetchUserSettings = async () => {
      if (currentUser && currentUser.uid) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            const userData = docSnap.data();
            setPaymentAddresses(userData.paymentAddresses || { BTC: '', DOGE: '', LTC: '', USD: '', VES: '' });
            setReceivePaymentNotifications(userData.receivePaymentNotifications || false);
            setReceiveLoginAlerts(userData.receiveLoginAlerts || false);
            setTwoFactorAuthEnabled(userData.twoFactorAuthEnabled || false);
          }
        } catch (userError) {
          console.error("Error fetching user settings from Firebase:", userError);
          showError('Error al cargar la configuración del usuario.');
        }
      }
    };
    fetchUserSettings();
  }, [currentUser, showError]);

  const handlePaymentAddressChange = (currency, address) => {
    setPaymentAddresses(prev => ({
      ...prev,
      [currency]: address
    }));
  };

  const handleUpdateAccount = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (!currentUser || !currentUser.uid) {
      showError('No hay usuario autenticado.');
      setIsLoading(false);
      return;
    }

    if (newPassword && newPassword !== confirmNewPassword) {
      showError('Las nuevas contraseñas no coinciden.');
      setIsLoading(false);
      return;
    }

    try {
      // Reautenticar al usuario si se va a cambiar la contraseña o el email
      if (currentPassword && (newPassword || contactEmail !== currentUser.email)) {
        const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
        await reauthenticateWithCredential(currentUser, credential);
      }

      if (contactEmail !== currentUser.email) {
        await updateEmail(currentUser, contactEmail);
        showSuccess('Email actualizado exitosamente.');
      }

      if (newPassword) {
        await updatePassword(currentUser, newPassword);
        showSuccess('Contraseña actualizada exitosamente.');
        setNewPassword('');
        setConfirmNewPassword('');
        setCurrentPassword('');
      }

      if (!newPassword && contactEmail === currentUser.email) {
        showSuccess('Configuración de cuenta actualizada exitosamente.');
      }

    } catch (err) {
      console.error("Error al actualizar la cuenta:", err);
      showError(`Fallo al actualizar la cuenta: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAddresses = async () => {
    setIsLoading(true);
    if (!currentUser || !currentUser.uid) {
      showError('No hay usuario autenticado.');
      setIsLoading(false);
      return;
    }
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, {
        paymentAddresses: paymentAddresses,
      });
      showSuccess('Direcciones de pago guardadas exitosamente.');
    } catch (err) {
      console.error("Error al guardar direcciones en Firebase:", err);
      showError(`Fallo al guardar direcciones: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveNotifications = async () => {
    setIsLoading(true);
    if (!currentUser || !currentUser.uid) {
      showError('No hay usuario autenticado.');
      setIsLoading(false);
      return;
    }
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, {
        receivePaymentNotifications: receivePaymentNotifications,
        receiveLoginAlerts: receiveLoginAlerts,
      });
      showSuccess('Preferencias de notificación guardadas exitosamente.');
    } catch (err) {
      console.error("Error al guardar preferencias de notificación en Firebase:", err);
      showError(`Fallo al guardar preferencias de notificación: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleTwoFactorAuth = async () => {
    setIsLoading(true);
    if (!currentUser || !currentUser.uid) {
      showError('No hay usuario autenticado.');
      setIsLoading(false);
      return;
    }
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, {
        twoFactorAuthEnabled: !twoFactorAuthEnabled,
      });
      setTwoFactorAuthEnabled(prev => !prev);
      showSuccess(`Autenticación de dos factores ${!twoFactorAuthEnabled ? 'activada' : 'desactivada'} exitosamente.`);
    } catch (err) {
      console.error("Error al cambiar 2FA en Firebase:", err);
      showError(`Fallo al cambiar autenticación de dos factores: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.settingsContent}>
      <h1 className={styles.pageTitle}>Configuración</h1>
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingText}>Procesando...</div>
        </div>
      )}
      {/* Los mensajes de error y éxito ahora se manejan globalmente */}

      <div className={styles.settingsGrid}>
        {/* Configuración de Cuenta */}
        <div className={`${styles.sectionCard} ${darkMode ? styles.dark : styles.light}`}>
          <h2 className={styles.sectionTitle}>Configuración de Cuenta</h2>
          <form onSubmit={handleUpdateAccount}>
            <div className={styles.formGroup}>
              <label htmlFor="contact-email" className={styles.formLabel}>Email de Contacto</label>
              <input
                type="email"
                id="contact-email"
                className={`${styles.formInput} ${darkMode ? styles.darkInput : styles.lightInput}`}
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="current-password" className={styles.formLabel}>Contraseña Actual</label>
              <input
                type="password"
                id="current-password"
                className={`${styles.formInput} ${darkMode ? styles.darkInput : styles.lightInput}`}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="new-password" className={styles.formLabel}>Nueva Contraseña</label>
              <input
                type="password"
                id="new-password"
                className={`${styles.formInput} ${darkMode ? styles.darkInput : styles.lightInput}`}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="confirm-new-password" className={styles.formLabel}>Confirmar Contraseña</label>
              <input
                type="password"
                id="confirm-new-password"
                className={`${styles.formInput} ${darkMode ? styles.darkInput : styles.lightInput}`}
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={isLoading}
            >
              {isLoading ? (
                <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : 'Actualizar Configuración'}
            </button>
          </form>
        </div>

        {/* Seguridad y Direcciones de Pago */}
        <div className={`${styles.sectionCard} ${darkMode ? styles.dark : styles.light}`}>
          <h2 className={styles.sectionTitle}>Seguridad</h2>
          <div className={styles.twoFactorAuth}>
            <span className={styles.twoFactorAuthLabel}>Autenticación de Dos Factores</span>
            <div className={styles.twoFactorAuthControls}>
              <span className={styles.developmentTextSmall}>En Desarrollo</span>
              <button
                onClick={handleToggleTwoFactorAuth}
                className={`${styles.disabledButton} ${darkMode ? styles.darkDisabledButton : styles.lightDisabledButton}`}
                disabled={true || isLoading} // Deshabilitar el botón
              >
                Activar
              </button>
            </div>
          </div>

          <h2 className={styles.sectionTitle}>Direcciones de Pago Predeterminadas</h2>
          <div className={styles.formGroup}>
            <label htmlFor="bitcoin-address" className={styles.formLabel}>Bitcoin (BTC)</label>
            <input
              type="text"
              id="bitcoin-address"
              className={`${styles.formInput} ${darkMode ? styles.darkInput : styles.lightInput}`}
              value={paymentAddresses.BTC}
              onChange={(e) => handlePaymentAddressChange('BTC', e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="dogecoin-address" className={styles.formLabel}>Dogecoin (DOGE)</label>
            <input
              type="text"
              id="dogecoin-address"
              className={`${styles.formInput} ${darkMode ? styles.darkInput : styles.lightInput}`}
              value={paymentAddresses.DOGE}
              onChange={(e) => handlePaymentAddressChange('DOGE', e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="litecoin-address" className={styles.formLabel}>Litecoin (LTC)</label>
            <input
              type="text"
              id="litecoin-address"
              className={`${styles.formInput} ${darkMode ? styles.darkInput : styles.lightInput}`}
              value={paymentAddresses.LTC}
              onChange={(e) => handlePaymentAddressChange('LTC', e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="usd-address" className={styles.formLabel}>USD (Binance Pay ID/Email)</label>
            <input
              type="text"
              id="usd-address"
              className={`${styles.formInput} ${darkMode ? styles.darkInput : styles.lightInput}`}
              value={paymentAddresses.USD}
              onChange={(e) => handlePaymentAddressChange('USD', e.target.value)}
              disabled={isLoading}
              placeholder="Email o ID de Binance para USD"
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="ves-address" className={styles.formLabel}>Bolívar Soberano (VES) (Binance Pay ID/Email)</label>
            <input
              type="text"
              id="ves-address"
              className={`${styles.formInput} ${darkMode ? styles.darkInput : styles.lightInput}`}
              value={paymentAddresses.VES}
              onChange={(e) => handlePaymentAddressChange('VES', e.target.value)}
              disabled={isLoading}
              placeholder="Email o ID de Binance para VES"
            />
          </div>
          <button
            onClick={handleSaveAddresses}
            className={styles.submitButton}
            disabled={isLoading}
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ) : 'Guardar Direcciones'}
          </button>

          {/* Notificaciones */}
          <h2 className={styles.sectionTitle}>Notificaciones</h2>
          <div className={styles.checkboxGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                className={`${styles.checkbox} ${styles.disabledCheckbox}`}
                checked={false} // Siempre false ya que está en desarrollo
                onChange={() => {}} // No permitir cambios
                disabled={true || isLoading} // Deshabilitar el checkbox
              />
              <span className={styles.developmentTextSmall}>Recibir notificaciones de pagos por email (En Desarrollo)</span>
            </label>
          </div>
          <div className={styles.checkboxGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                className={`${styles.checkbox} ${styles.disabledCheckbox}`}
                checked={false} // Siempre false ya que está en desarrollo
                onChange={() => {}} // No permitir cambios
                disabled={true || isLoading} // Deshabilitar el checkbox
              />
              <span className={styles.developmentTextSmall}>Recibir alertas de inicio de sesión (En Desarrollo)</span>
            </label>
          </div>
          <button
            onClick={handleSaveNotifications}
            className={`${styles.disabledButton} ${darkMode ? styles.darkDisabledButton : styles.lightDisabledButton}`}
            disabled={true || isLoading} // Deshabilitar el botón
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ) : 'Guardar Preferencias'}
          </button>
        </div>
      </div>
    </div>
  );
};


const UserPanel = () => {
  const { currentUser, logout } = useAuth();
  const { darkMode } = useContext(ThemeContext); // Usar ThemeContext
  const navigate = useNavigate();
  const [userMiners, setUserMiners] = useState([]);
  const [unreadTicketsCount, setUnreadTicketsCount] = useState(0);
  const [newTradingSignalsCount, setNewTradingSignalsCount] = useState(0); // Nuevo estado para el conteo de señales de trading
  const [userBalances, setUserBalances] = useState({
    balanceUSD: 0,
    balanceBTC: 0,
    balanceLTC: 0,
    balanceDOGE: 0,
    balanceVES: 0, // Añadir balanceVES
  });
  const [paymentRate, setPaymentRate] = useState(0.00); // Nuevo estado para la tasa de pago
  const [btcToUsdRate, setBtcToUsdRate] = useState(20000); // Nuevo estado para la tasa de BTC a USD, valor por defecto
  const [minPaymentThresholds, setMinPaymentThresholds] = useState({ // Nuevo estado para los umbrales mínimos de retiro por moneda
    BTC: 0.001,
    DOGE: 100,
    LTC: 0.01,
    USD: 10,
    VES: 1, // Añadir umbral para VES
  });
  const [totalHashratePool, setTotalHashratePool] = useState(0); // Nuevo estado para el hashrate total de la pool
  const [activeMinersAllUsers, setActiveMinersAllUsers] = useState(0); // Nuevo estado para mineros activos de la pool
  const [poolCommission, setPoolCommission] = useState(0); // Nuevo estado para la comisión de la pool
  const [paymentsHistory, setPaymentsHistory] = useState([]); // Estado para el historial de pagos
  const [withdrawalsHistory, setWithdrawalsHistory] = useState([]); // Estado para el historial de retiros
  const [userPaymentAddresses, setUserPaymentAddresses] = useState({}); // Nuevo estado para las direcciones de pago del usuario


  const handleUnreadCountChange = (count) => {
    setUnreadTicketsCount(count);
  };

  // Función para marcar las señales de trading como leídas
  const markTradingSignalsAsRead = () => {
    localStorage.setItem('lastViewedTradingSignals', new Date().toISOString());
    setNewTradingSignalsCount(0);
  };

  const demoUser = { email: 'demo@example.com' };
  const displayUser = currentUser || demoUser;

  console.log("UserPanel: currentUser", currentUser);
  console.log("UserPanel: userMiners", userMiners);
  console.log("UserPanel: userBalances", userBalances);
  console.log("UserPanel: paymentRate", paymentRate);
  console.log("UserPanel: btcToUsdRate", btcToUsdRate);
  console.log("UserPanel: totalHashratePool", totalHashratePool);
  console.log("UserPanel: poolCommission", poolCommission);
  console.log("UserPanel: paymentsHistory", paymentsHistory);
  console.log("UserPanel: withdrawalsHistory", withdrawalsHistory);
  console.log("UserPanel: userPaymentAddresses", userPaymentAddresses);


  const totalHashrate = useMemo(() => {
    return userMiners.reduce((sum, miner) => sum + (miner.currentHashrate || 0), 0);
  }, [userMiners]);

  const estimatedDailyUSD = useMemo(() => {
    return totalHashrate * paymentRate;
  }, [totalHashrate, paymentRate]);

  const chartData = useMemo(() => ({
    labels: ['Hashrate Total (TH/s)', 'Ganancia Diaria Estimada (USD)'],
    datasets: [{
      label: 'Rendimiento Actual',
      data: [totalHashrate, estimatedDailyUSD],
      backgroundColor: [
        'rgba(54, 162, 235, 0.5)', // Color para Hashrate
        'rgba(75, 192, 192, 0.5)'  // Color para Ganancia
      ],
      borderColor: [
        'rgba(54, 162, 235, 1)',
        'rgba(75, 192, 192, 1)'
      ],
      borderWidth: 1
    }]
  }), [totalHashrate, estimatedDailyUSD]);

  // Suscripción para mineros del usuario
  useEffect(() => {
    if (!currentUser?.uid) {
      setUserMiners([]);
      return;
    }
    console.log("UserPanel: Configurando suscripción para mineros del usuario:", currentUser.uid);
    const minersQuery = query(collection(db, "miners"), where("userId", "==", currentUser.uid));
    const unsubscribe = onSnapshot(minersQuery, (snapshot) => {
      const fetchedMiners = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUserMiners(fetchedMiners);
    }, (error) => {
      console.error("UserPanel: Error en la suscripción de mineros:", error);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Suscripción para todos los mineros (para hashrate total de la pool)
  useEffect(() => {
    console.log("UserPanel: Configurando suscripción para todos los mineros.");
    const allMinersQuery = collection(db, "miners");
    const unsubscribe = onSnapshot(allMinersQuery, (snapshot) => {
      let totalHash = 0;
      let activeCount = 0;
      snapshot.docs.forEach(doc => {
        const miner = doc.data();
        totalHash += miner.currentHashrate || 0;
        activeCount += 1; // Asumimos que todos los mineros en la colección son activos para este conteo
      });
      setTotalHashratePool(totalHash);
      setActiveMinersAllUsers(activeCount);
    }, (error) => {
      console.error("UserPanel: Error en la suscripción de todos los mineros:", error);
    });
    return () => unsubscribe();
  }, []); // No depende de currentUser, ya que es para todos los mineros

  // Suscripción para balances del usuario
  useEffect(() => {
    if (!currentUser?.uid) {
      setUserBalances({
        balanceUSD: 0,
        balanceBTC: 0,
        balanceLTC: 0,
        balanceDOGE: 0,
        balanceVES: 0,
      });
      return;
    }
    console.log("UserPanel: Configurando suscripción para balances del usuario:", currentUser.uid);
    const userDocRef = doc(db, "users", currentUser.uid);
    const unsubscribe = onSnapshot(userDocRef, async (docSnapshot) => { // <-- Hacemos la función async aquí
      if (docSnapshot.exists()) {
        const userData = docSnapshot.data();
        setUserBalances({
          balanceUSD: userData.balanceUSD || 0,
          balanceBTC: userData.balanceBTC || 0,
          balanceLTC: userData.balanceLTC || 0,
          balanceDOGE: userData.balanceDOGE || 0,
          balanceVES: userData.balanceVES || 0, // Añadir balanceVES
        });
        setUserPaymentAddresses(userData.paymentAddresses || {}); // Actualizar direcciones de pago
        console.log(`UserPanel: Datos de usuario y direcciones de pago cargados para ${currentUser.uid}.`);
      } else {
        console.log(`UserPanel: Documento de usuario no existe en Firestore (${currentUser.uid}). Creando uno nuevo...`);
        try { // Añadimos el bloque try-catch completo
          await setDoc(userDocRef, {
            balanceUSD: 0,
            balanceBTC: 0,
            balanceLTC: 0,
            balanceDOGE: 0,
            balanceVES: 0, // Añadir balanceVES
            role: 'user',
            email: currentUser.email,
            paymentAddresses: {}, // Inicializar paymentAddresses
          });

          console.log(`UserPanel: Documento de usuario creado exitosamente en Firestore para ${currentUser.uid}.`);
          setUserBalances({
            balanceUSD: 0,
            balanceBTC: 0,
            balanceLTC: 0,
            balanceDOGE: 0,
            balanceVES: 0, // Añadir balanceVES
          });
          setUserPaymentAddresses({});
        } catch (insertError) {
          console.error(`UserPanel: Error al crear el documento de usuario en Firestore para ${currentUser.uid}:`, insertError);
        }
      }
    }, (error) => {
      console.error(`UserPanel: Error en la suscripción de balances del usuario para ${currentUser.uid}:`, error);
    });
    return () => unsubscribe();
  }, [currentUser, db]);

  // Suscripción para configuración de la pool
  useEffect(() => {
    console.log("UserPanel: Configurando suscripción para poolConfig.");
    const poolConfigQuery = query(collection(db, "settings"), where("key", "==", "poolConfig"));
    const unsubscribe = onSnapshot(poolConfigQuery, (snapshot) => {
      const settingsData = snapshot.docs.length > 0 ? snapshot.docs[0].data() : {};
      setPaymentRate(settingsData.obsoletePrice || 0.00);
      setBtcToUsdRate(settingsData.btcToUsdRate || 20000);
      setPoolCommission(settingsData.commission || 0);
    }, (error) => {
      console.error("UserPanel: Error en la suscripción de poolConfig:", error);
    });
    return () => unsubscribe();
  }, []);

  // Suscripción para configuración de pagos
  useEffect(() => {
    console.log("UserPanel: Configurando suscripción para paymentConfig.");
    const paymentConfigQuery = query(collection(db, "settings"), where("key", "==", "paymentConfig"));
    const unsubscribe = onSnapshot(paymentConfigQuery, (snapshot) => {
      const settingsData = snapshot.docs.length > 0 ? snapshot.docs[0].data() : {};
      setMinPaymentThresholds({
        BTC: settingsData.minPaymentThresholdBTC || 0.00000001,
        DOGE: settingsData.minPaymentThresholdDOGE || 100,
        LTC: settingsData.minPaymentThresholdLTC || 0.01,
        USD: settingsData.minPaymentThresholdUSD || 10,
        VES: settingsData.minPaymentThresholdVES || 1, // Añadir VES
      });
    }, (error) => {
      console.error("UserPanel: Error en la suscripción de paymentConfig:", error);
    });
    return () => unsubscribe();
  }, []);

  // Suscripción para historial de pagos
  useEffect(() => {
    if (!currentUser?.uid) {
      setPaymentsHistory([]);
      return;
    }
    console.log("UserPanel: Configurando suscripción para historial de pagos.");
    const paymentsQuery = query(collection(db, "payments"), where("userId", "==", currentUser.uid), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(paymentsQuery, (snapshot) => {
      const fetchedPayments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt.toDate() }));
      setPaymentsHistory(fetchedPayments);
    }, (error) => {
      console.error("UserPanel: Error en la suscripción de pagos:", error);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Suscripción para nuevas señales de trading
  useEffect(() => {
    console.log("UserPanel: Configurando suscripción para señales de trading.");
    const tradingSignalsQuery = query(collection(db, "tradingSignals"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(tradingSignalsQuery, (snapshot) => {
      const lastViewedTimestamp = localStorage.getItem('lastViewedTradingSignals');
      let newSignals = 0;
      if (lastViewedTimestamp) {
        const lastViewedDate = new Date(lastViewedTimestamp);
        snapshot.docs.forEach(doc => {
          const signal = doc.data();
          if (signal.createdAt.toDate() > lastViewedDate) {
            newSignals++;
          }
        });
      } else {
        // Si no hay marca de tiempo, todas las señales son nuevas hasta que se visiten
        newSignals = snapshot.docs.length;
      }
      setNewTradingSignalsCount(newSignals);
    }, (error) => {
      console.error("UserPanel: Error en la suscripción de señales de trading:", error);
    });
    return () => unsubscribe();
  }, []);

  // Efecto para marcar señales como leídas al navegar a la ruta de señales
  const location = useLocation();
  useEffect(() => {
    if (location.pathname.includes('/user-panel/trading-signal')) {
      markTradingSignalsAsRead();
    }
  }, [location.pathname]);

  // Efecto para actualizar lastSeen del usuario
  useEffect(() => {
    if (!currentUser?.uid) return;

    const userDocRef = doc(db, 'users', currentUser.uid);

    // Función para actualizar lastSeen
    const updateLastSeen = async () => {
      try {
        await updateDoc(userDocRef, {
          lastSeen: new Date(), // Usar un objeto Date estándar o serverTimestamp
        });
        console.log("lastSeen actualizado para:", currentUser.uid);
      } catch (error) {
        console.error("Error al actualizar lastSeen:", error);
      }
    };

    // Actualizar lastSeen inmediatamente al cargar el componente
    updateLastSeen();

    // Establecer un intervalo para actualizar lastSeen periódicamente (ej. cada 5 minutos)
    const intervalId = setInterval(updateLastSeen, 5 * 60 * 1000); // 5 minutos

    // Limpiar el intervalo al desmontar el componente
    return () => clearInterval(intervalId);
  }, [currentUser?.uid, db]);

  // Efecto para manejar la actualización de lastSeen cuando el usuario cierra la pestaña o navega fuera
  useEffect(() => {
    if (!currentUser?.uid) return;
    const userDocRef = doc(db, 'users', currentUser.uid);

    const handleBeforeUnload = async () => {
      // Intentar actualizar lastSeen justo antes de que la página se descargue
      // Nota: Esto es un "best effort" y no siempre funciona de forma confiable en todos los navegadores.
      // Firebase serverTimestamp es más robusto para estados de sesión.
      try {
        await updateDoc(userDocRef, {
          lastSeen: new Date(), // Se enviará con la hora de cierre
        });
        console.log("lastSeen actualizado al cerrar/navegar para:", currentUser.uid);
      } catch (error) {
        console.error("Error al actualizar lastSeen en beforeunload:", error);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentUser?.uid, db]);

  async function handleLogout() {
    try {
      await logout();
      navigate('/login');
    } catch {
      console.error("Fallo al cerrar sesión");
    }
  }

  return (
    <div className={styles.userPanelContainer}>
      <Sidebar 
        unreadTicketsCount={unreadTicketsCount} 
        newTradingSignalsCount={newTradingSignalsCount} // Pasar el conteo de nuevas señales
        markTradingSignalsAsRead={markTradingSignalsAsRead} // Pasar la función para marcar como leídas
        displayUser={displayUser} 
      />
      <MainContent>
        <header className={styles.mainContentHeader}>
            <h1 className={styles.mainContentTitle}>Dashboard</h1>
        </header>
        
        <Routes>
          <Route path="dashboard/*" element={<DashboardContent userMiners={userMiners} chartData={chartData} userBalances={userBalances} paymentRate={paymentRate} btcToUsdRate={btcToUsdRate} totalHashratePool={totalHashratePool} poolCommission={poolCommission} paymentsHistory={paymentsHistory} withdrawalsHistory={withdrawalsHistory} styles={styles} totalHashrate={totalHashrate} estimatedDailyUSD={estimatedDailyUSD} activeMinersAllUsers={activeMinersAllUsers} pricePerTHs={paymentRate} />} />
          <Route path="mining-info/*" element={<MiningInfoContent currentUser={currentUser} userMiners={userMiners} setUserMiners={setUserMiners} styles={styles} />} />
          <Route path="withdrawals/*" element={<WithdrawalsContent minPaymentThresholds={minPaymentThresholds} userPaymentAddresses={userPaymentAddresses} styles={styles} />} />
          <Route path="contact-support/*" element={<ContactSupportContent onUnreadCountChange={handleUnreadCountChange} styles={styles} />} />
          <Route path="referrals/*" element={<ReferralsContent styles={styles} />} />
          <Route path="pool-arbitrage/*" element={<UserPoolArbitrage />} />
          <Route path="trading-signal/*" element={<TradingSignal />} /> {/* Nueva ruta para Señal Trading */}
          <Route path="trading-panel/*" element={<TradingPanel />} /> {/* Nueva ruta para el Panel de Trading */}
          <Route path="my-wallet/*" element={<WalletDisplay currentUser={currentUser} />} /> {/* Nueva ruta para Mi Billetera */}
          <Route path="p2p-marketplace/*" element={<P2P_MarketplacePage />} /> {/* Nueva ruta para el Mercado P2P */}
          <Route path="settings/*" element={<SettingsContent styles={styles} />} />
          {/* Ruta por defecto */}
          <Route path="/*" element={<DashboardContent userMiners={userMiners} chartData={chartData} userBalances={userBalances} paymentRate={paymentRate} btcToUsdRate={btcToUsdRate} totalHashratePool={totalHashratePool} poolCommission={poolCommission} paymentsHistory={paymentsHistory} withdrawalsHistory={withdrawalsHistory} styles={styles} totalHashrate={totalHashrate} estimatedDailyUSD={estimatedDailyUSD} activeMinersAllUsers={activeMinersAllUsers} pricePerTHs={paymentRate} />} />
        </Routes>
      </MainContent>
    </div>
  );
};

export default UserPanel;
