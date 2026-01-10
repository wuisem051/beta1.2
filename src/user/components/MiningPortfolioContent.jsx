import React, { useContext, useState, useEffect, useMemo } from 'react';
import { ThemeContext } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore';
import styles from '../pages/UserPanel.module.css'; // Reutilizamos los estilos del UserPanel

const TradingPortfolioContent = () => {
  const { darkMode } = useContext(ThemeContext);
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Mock data for trading operations
  const mockOperations = [
    { id: '1', date: '2023-11-20', pair: 'BTC/USDT', type: 'Long', result: 'Exitosa', profit: '+150.50', status: 'completed' },
    { id: '2', date: '2023-11-21', pair: 'ETH/USDT', type: 'Short', result: 'Fallida', profit: '-45.20', status: 'failed' },
    { id: '3', date: '2023-11-22', pair: 'SOL/USDT', type: 'Long', result: 'Exitosa', profit: '+89.00', status: 'completed' },
    { id: '4', date: '2023-11-23', pair: 'BNB/USDT', type: 'Long', result: 'Exitosa', profit: '+210.15', status: 'completed' },
    { id: '5', date: '2023-11-24', pair: 'ADA/USDT', type: 'Short', result: 'Fallida', profit: '-30.00', status: 'failed' },
  ];

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const stats = useMemo(() => {
    const total = mockOperations.length;
    const successful = mockOperations.filter(op => op.result === 'Exitosa').length;
    const profit = mockOperations.reduce((sum, op) => sum + parseFloat(op.profit), 0);
    const successRate = (successful / total) * 100;
    return { total, profit, successRate };
  }, [mockOperations]);

  if (loading) {
    return (
      <div className={styles.miningPortfolioContent}>
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingText}>Cargando portafolio de trading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.miningPortfolioContent} ${darkMode ? styles.dark : styles.light}`}>
      <h1 className={styles.pageTitle}>Mi Portafolio de Trading</h1>
      <p className={styles.descriptionText} style={{ marginBottom: '2rem', opacity: 0.8 }}>
        Seguimiento de tus operaciones de trading: éxitos, fallos y rendimiento acumulado.
      </p>

      <div className={styles.statsGrid}>
        {/* Operaciones Totales */}
        <div className={`${styles.statCard} ${darkMode ? styles.dark : styles.light}`}>
          <h3 className={styles.statTitle}>Operaciones Totales</h3>
          <p className={styles.statValueBlue}>{stats.total}</p>
          <div className={styles.statIconBlue}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue_link" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          </div>
        </div>

        {/* P/L Total (USD) */}
        <div className={`${styles.statCard} ${darkMode ? styles.dark : styles.light}`}>
          <h3 className={styles.statTitle}>P/L Total (USD)</h3>
          <p className={stats.profit >= 0 ? styles.statValueGreen : styles.statValueRed}>
            {stats.profit >= 0 ? '+' : ''}{stats.profit.toFixed(2)} USD
          </p>
          <div className={stats.profit >= 0 ? styles.statIconGreen : styles.statIconRed}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V3a1 1 0 00-1-1H4a1 1 0 00-1 1v18a1 1 0 001 1h12a1 1 0 001-1v-5m-1-10v4m-4 0h4" /></svg>
          </div>
        </div>

        {/* Tasa de Éxito */}
        <div className={`${styles.statCard} ${darkMode ? styles.dark : styles.light}`}>
          <h3 className={styles.statTitle}>Tasa de Éxito</h3>
          <p className={styles.statValueAccent}>{stats.successRate.toFixed(1)}%</p>
          <div className={styles.statIconAccent}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
          </div>
        </div>
      </div>

      <div className={`${styles.sectionCard} ${darkMode ? styles.dark : styles.light} mt-8`}>
        <h2 className={styles.sectionTitle}>Historial de Operaciones</h2>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead className={`${darkMode ? styles.darkTableHead : styles.lightTableHead}`}>
              <tr>
                <th className={styles.tableHeader}>Fecha</th>
                <th className={styles.tableHeader}>Par</th>
                <th className={styles.tableHeader}>Tipo</th>
                <th className={styles.tableHeader}>Resultado</th>
                <th className={styles.tableHeader}>Ganancia/Pérdida</th>
              </tr>
            </thead>
            <tbody className={`${darkMode ? styles.darkTableBody : styles.lightTableBody}`}>
              {mockOperations.map((op) => (
                <tr key={op.id}>
                  <td className={styles.tableCell}>{op.date}</td>
                  <td className={styles.tableCell}>{op.pair}</td>
                  <td className={styles.tableCell}>{op.type}</td>
                  <td className={styles.tableCell}>
                    <span className={`${styles.statusBadge} ${op.result === 'Exitosa' ? styles.statusCompleted : styles.statusError}`}>
                      {op.result}
                    </span>
                  </td>
                  <td className={`${styles.tableCell} ${parseFloat(op.profit) >= 0 ? 'text-green-500 font-bold' : 'text-red-500 font-bold'}`}>
                    {op.profit} USD
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

export default TradingPortfolioContent;
