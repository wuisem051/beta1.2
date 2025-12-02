import React, { useContext, useState, useEffect, useMemo } from 'react';
import { ThemeContext } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore';
import styles from '../pages/UserPanel.module.css'; // Reutilizamos los estilos del UserPanel

const MiningPortfolioContent = () => {
  const { darkMode } = useContext(ThemeContext);
  const { currentUser } = useAuth();
  const [userMiners, setUserMiners] = useState([]);
  const [totalHashratePool, setTotalHashratePool] = useState(0);
  const [paymentRate, setPaymentRate] = useState(0);
  const [btcToUsdRate, setBtcToUsdRate] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!currentUser?.uid) {
      setError('Debes iniciar sesión para ver tu portafolio de minería.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribeMiners = onSnapshot(query(collection(db, "miners"), where("userId", "==", currentUser.uid)), (snapshot) => {
      const fetchedMiners = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUserMiners(fetchedMiners);
    }, (err) => {
      console.error("Error fetching user miners:", err);
      setError('Error al cargar tus mineros.');
      setLoading(false);
    });

    const unsubscribePoolConfig = onSnapshot(doc(db, "settings", "poolConfig"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPaymentRate(data.obsoletePrice || 0);
        setBtcToUsdRate(data.btcToUsdRate || 0);
      }
    }, (err) => {
      console.error("Error fetching pool config:", err);
      setError('Error al cargar la configuración de la pool.');
      setLoading(false);
    });

    const unsubscribeAllMiners = onSnapshot(collection(db, "miners"), (snapshot) => {
      let totalHash = 0;
      snapshot.docs.forEach(doc => {
        totalHash += doc.data().currentHashrate || 0;
      });
      setTotalHashratePool(totalHash);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching all miners for pool hashrate:", err);
      setError('Error al cargar el hashrate total de la pool.');
      setLoading(false);
    });

    return () => {
      unsubscribeMiners();
      unsubscribePoolConfig();
      unsubscribeAllMiners();
    };
  }, [currentUser]);

  const totalUserHashrate = useMemo(() => {
    return userMiners.reduce((sum, miner) => sum + (miner.currentHashrate || 0), 0);
  }, [userMiners]);

  const estimatedDailyUSD = useMemo(() => {
    return totalUserHashrate * paymentRate;
  }, [totalUserHashrate, paymentRate]);

  const userPercentageOfPool = useMemo(() => {
    return totalHashratePool > 0 ? (totalUserHashrate / totalHashratePool) * 100 : 0;
  }, [totalUserHashrate, totalHashratePool]);

  if (loading) {
    return (
      <div className={styles.miningPortfolioContent}>
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingText}>Cargando portafolio...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${styles.miningPortfolioContent} ${darkMode ? styles.dark : styles.light}`}>
        <h1 className={styles.pageTitle}>Portafolio de Minería</h1>
        <p className={styles.errorText}>{error}</p>
      </div>
    );
  }

  return (
    <div className={`${styles.miningPortfolioContent} ${darkMode ? styles.dark : styles.light}`}>
      <h1 className={styles.pageTitle}>Mi Portafolio de Minería</h1>

      <div className={styles.statsGrid}>
        {/* Tu Hashrate Total */}
        <div className={`${styles.statCard} ${darkMode ? styles.dark : styles.light}`}>
          <h3 className={styles.statTitle}>Tu Hashrate Total</h3>
          <p className={styles.statValueBlue}>{totalUserHashrate.toFixed(2)} TH/s</p>
          <div className={styles.statIconBlue}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue_link" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          </div>
        </div>

        {/* Ganancia Diaria Estimada */}
        <div className={`${styles.statCard} ${darkMode ? styles.dark : styles.light}`}>
          <h3 className={styles.statTitle}>Ganancia Diaria Estimada</h3>
          <p className={styles.statValueGreen}>${estimatedDailyUSD.toFixed(2)} USD</p>
          <div className={styles.statIconGreen}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green_check" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V3a1 1 0 00-1-1H4a1 1 0 00-1 1v18a1 1 0 001 1h12a1 1 0 001-1v-5m-1-10v4m-4 0h4"/></svg>
          </div>
        </div>

        {/* Porcentaje de la Pool */}
        <div className={`${styles.statCard} ${darkMode ? styles.dark : styles.light}`}>
          <h3 className={styles.statTitle}>% de la Pool</h3>
          <p className={styles.statValueAccent}>{userPercentageOfPool.toFixed(4)}%</p>
          <div className={styles.statIconAccent}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"/></svg>
          </div>
        </div>
      </div>

      <div className={`${styles.sectionCard} ${darkMode ? styles.dark : styles.light} mt-8`}>
        <h2 className={styles.sectionTitle}>Mineros Adquiridos</h2>
        {userMiners.length === 0 ? (
          <p className={styles.noMinersText}>Aún no tienes mineros en tu portafolio. ¡Adquiere uno en la Tienda de Mineros!</p>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead className={`${darkMode ? styles.darkTableHead : styles.lightTableHead}`}>
                <tr>
                  <th className={styles.tableHeader}>ID Minero</th>
                  <th className={styles.tableHeader}>Worker Name</th>
                  <th className={styles.tableHeader}>Hashrate (TH/s)</th>
                  <th className={styles.tableHeader}>Estado</th>
                  <th className={styles.tableHeader}>Fecha Adquisición</th>
                </tr>
              </thead>
              <tbody className={`${darkMode ? styles.darkTableBody : styles.lightTableBody}`}>
                {userMiners.map((miner) => (
                  <tr key={miner.id}>
                    <td className={styles.tableCell}>{miner.id.substring(0, 6)}...</td>
                    <td className={styles.tableCell}>{miner.workerName}</td>
                    <td className={styles.tableCell}>{miner.currentHashrate.toFixed(2)}</td>
                    <td className={styles.tableCell}>
                      <span className={`${styles.statusBadge} ${miner.status === 'activo' ? styles.statusCompleted : styles.statusPending}`}>
                        {miner.status}
                      </span>
                    </td>
                    <td className={styles.tableCell}>{miner.createdAt.toDate().toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Aquí podrías añadir más secciones si fuera necesario, como gráficos de rendimiento individual, etc. */}
    </div>
  );
};

export default MiningPortfolioContent;
