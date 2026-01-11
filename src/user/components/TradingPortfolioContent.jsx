import React, { useContext, useState, useEffect, useMemo } from 'react';
import { ThemeContext } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import styles from '../pages/UserPanel.module.css';

const TradingPortfolioContent = () => {
    const { darkMode } = useContext(ThemeContext);
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(true);

    const [operations, setOperations] = useState([]);

    useEffect(() => {
        const q = query(collection(db, 'tradingHistory'), orderBy('date', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setOperations(data);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching trading history:", err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const stats = useMemo(() => {
        const total = operations.length;
        const successful = operations.filter(op => op.result === 'Exitosa').length;
        const profit = operations.reduce((sum, op) => sum + (parseFloat(op.profit) || 0), 0);
        const successRate = total > 0 ? (successful / total) * 100 : 0;

        // Calculate T. Profit percentage (assuming a base capital, or as a percentage indicator)
        // If you have a specific base capital, replace 1000 with that value
        const profitPercentage = total > 0 ? (profit / total) * 10 : 0; // Simplified calculation

        return { total, profit, successRate, profitPercentage };
    }, [operations]);

    if (loading) {
        return (
            <div className={styles.dashboardContent}>
                <div className="flex flex-col items-center justify-center min-h-[400px]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
                    <p className="mt-4 font-bold opacity-60">Cargando portafolio de trading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.dashboardContent}>
            <h1 className={styles.mainContentTitle}>Mi Portafolio de Trading</h1>
            <p className={styles.statTitle} style={{ marginBottom: '2rem', textTransform: 'none' }}>
                Seguimiento de tus operaciones: éxitos, fallos y rendimiento acumulado en tiempo real.
            </p>

            <div className={styles.statsGrid}>
                {/* Operaciones Totales */}
                <div className={styles.statCard}>
                    <div className={styles.statIconBlue}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" /></svg>
                    </div>
                    <h3 className={styles.statTitle}>Operaciones Totales</h3>
                    <p className={styles.statValueBlue}>{stats.total}</p>
                </div>

                {/* P/L Total */}
                <div className={styles.statCard}>
                    <div className={stats.profit >= 0 ? styles.statIconGreen : styles.statIconAccent} style={{ background: stats.profit >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: stats.profit >= 0 ? 'var(--green-check)' : 'var(--red-error)' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1v22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                    </div>
                    <h3 className={styles.statTitle}>P/L Total (USD)</h3>
                    <p className={stats.profit >= 0 ? styles.statValueGreen : styles.statValueAccent} style={{ color: stats.profit >= 0 ? 'var(--green-check)' : 'var(--red-error)' }}>
                        {stats.profit >= 0 ? '+' : ''}{stats.profit.toFixed(2)}
                    </p>
                </div>

                {/* Tasa de Éxito */}
                <div className={styles.statCard}>
                    <div className={styles.statIconAccent}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                    </div>
                    <h3 className={styles.statTitle}>Tasa de Éxito</h3>
                    <p className={styles.statValueAccent}>{stats.successRate.toFixed(1)}%</p>
                </div>

                {/* T. Profit % */}
                <div className={styles.statCard}>
                    <div className={stats.profitPercentage >= 0 ? styles.statIconGreen : styles.statIconAccent} style={{ background: stats.profitPercentage >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: stats.profitPercentage >= 0 ? 'var(--green-check)' : 'var(--red-error)' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path><polyline points="1 6 2.5 6 2.5 18 4 18"></polyline><polyline points="20 6 21.5 6 21.5 18 23 18"></polyline></svg>
                    </div>
                    <h3 className={styles.statTitle}>T. Profit %</h3>
                    <p className={stats.profitPercentage >= 0 ? styles.statValueGreen : styles.statValueAccent} style={{ color: stats.profitPercentage >= 0 ? 'var(--green-check)' : 'var(--red-error)' }}>
                        {stats.profitPercentage >= 0 ? '+' : ''}{stats.profitPercentage.toFixed(2)}%
                    </p>
                </div>
            </div>

            <div className={styles.sectionCard}>
                <h2 className={styles.sectionTitle}>Historial de Operaciones</h2>
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th className={styles.tableHeader}>Fecha</th>
                                <th className={styles.tableHeader}>Par</th>
                                <th className={styles.tableHeader}>Tipo</th>
                                <th className={styles.tableHeader}>Resultado</th>
                                <th className={styles.tableHeader}>P/L (USD)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {operations.map((op) => (
                                <tr key={op.id}>
                                    <td className={styles.tableCell}>{op.date}</td>
                                    <td className={styles.tableCell} style={{ fontWeight: 'bold' }}>{op.pair}</td>
                                    <td className={styles.tableCell}>{op.type}</td>
                                    <td className={styles.tableCell}>
                                        <span className={`${styles.statusBadge} ${op.result === 'Exitosa' ? styles.statusCompleted : styles.statusError}`}>
                                            {op.result}
                                        </span>
                                    </td>
                                    <td className={styles.tableCell} style={{ fontWeight: '800', color: parseFloat(op.profit) >= 0 ? 'var(--green-check)' : 'var(--red-error)' }}>
                                        {op.profit}
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
