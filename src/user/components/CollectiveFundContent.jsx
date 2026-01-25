import React, { useContext, useState, useEffect } from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { ThemeContext } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
  doc,
  runTransaction
} from 'firebase/firestore';
import styles from '../pages/UserPanel.module.css';

ChartJS.register(ArcElement, Tooltip, Legend);

const CollectiveFundContent = () => {
  const { darkMode } = useContext(ThemeContext);
  const { currentUser } = useAuth();
  const [contributions, setContributions] = useState([]);
  const [depositAmount, setDepositAmount] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch recent contributions
  useEffect(() => {
    const q = query(
      collection(db, 'collectiveFundContributions'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setContributions(fetched);
    });

    return () => unsubscribe();
  }, []);

  const handleDeposit = async (e) => {
    e.preventDefault();
    if (!depositAmount || isNaN(depositAmount) || parseFloat(depositAmount) <= 0) {
      setError('Por favor ingresa un monto válido.');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const amount = parseFloat(depositAmount);
      const userRef = doc(db, 'users', currentUser.uid);

      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error("User does not exist!");

        const currentBalance = userDoc.data().balanceUSD || 0;
        if (currentBalance < amount) {
          throw new Error("Saldo insuficiente.");
        }

        // Deduct balance
        transaction.update(userRef, {
          balanceUSD: currentBalance - amount
        });

        // Add contribution record
        const contributionRef = collection(db, 'collectiveFundContributions');
        const newContribution = {
          userId: currentUser.uid,
          username: userDoc.data().username || userDoc.data().displayName || 'Usuario Privado',
          amount: amount,
          createdAt: serverTimestamp()
        };
        transaction.set(doc(contributionRef), newContribution);
      });

      setSuccess(`¡Gracias! Has aportado $${amount} al fondo colectivo.`);
      setDepositAmount('');
      setIsModalOpen(false);
    } catch (err) {
      console.error("Error in deposit transaction:", err);
      setError(err.message || 'Error al procesar el depósito.');
    } finally {
      setIsLoading(false);
    }
  };

  const data = {
    labels: ['Fondo Desarrollo', 'Trading/Inversiones', 'Fondo Usuarios'],
    datasets: [
      {
        data: [30, 50, 20],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(16, 185, 129, 0.8)',
        ],
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 2,
        hoverOffset: 15,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#e2e8f0',
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle',
          font: {
            size: 12,
            weight: '700',
            family: "'Inter', sans-serif",
          },
        },
      },
      tooltip: {
        backgroundColor: darkMode ? '#1e293b' : '#ffffff',
        titleColor: darkMode ? '#f1f5f9' : '#0f172a',
        bodyColor: darkMode ? '#f1f5f9' : '#0f172a',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
      },
      datalabels: {
        color: '#fff',
        font: {
          size: 14,
          weight: '800',
        },
        formatter: (value, context) => {
          const total = context.chart.data.datasets[0].data.reduce((sum, val) => sum + val, 0);
          return ((value / total) * 100).toFixed(0) + '%';
        },
        dropShadow: {
          enabled: true,
          color: 'rgba(0,0,0,0.5)',
          blur: 4
        }
      },
    },
  };

  return (
    <div className={styles.dashboardContent}>
      <h1 className={styles.mainContentTitle}>Fondo Colectivo</h1>
      <p className={styles.statTitle} style={{ marginBottom: '2rem' }}>
        Participa en inversiones conjuntas y obtén rendimientos gestionados por profesionales.
      </p>

      <div className="flex justify-center mb-8">
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-blue-600/20"
        >
          Participar en el Fondo
        </button>
      </div>

      {success && <p className="text-green-500 font-bold text-center mb-4">{success}</p>}
      {error && <p className="text-red-500 font-bold text-center mb-4">{error}</p>}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-black text-white mb-4 uppercase tracking-tighter">Aportar al Fondo</h2>
            <form onSubmit={handleDeposit} className="space-y-6">
              <div>
                <label className="block text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">Monto (USD)</label>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500/50 transition-all font-mono"
                  disabled={isLoading}
                />
              </div>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-slate-800 text-slate-400 rounded-xl font-bold hover:bg-slate-700 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition-all disabled:opacity-50"
                >
                  {isLoading ? 'Procesando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        <div className={styles.sectionCard}>
          <h2 className={styles.sectionTitle} style={{ textAlign: 'center', marginBottom: '2rem' }}>Distribución de Fondos</h2>
          <div className={styles.chartContainer} style={{ height: '350px', position: 'relative' }}>
            <Pie data={data} options={options} plugins={[ChartDataLabels]} />
          </div>
        </div>

        <div className={styles.sectionCard}>
          <h2 className={styles.sectionTitle} style={{ textAlign: 'center', marginBottom: '2rem' }}>Aportes Recientes</h2>
          <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
            {contributions.length === 0 ? (
              <p className="text-slate-500 text-center italic">No hay aportes registrados.</p>
            ) : (
              contributions.map((c) => (
                <div key={c.id} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 font-black text-xs">
                      {c.username ? c.username[0].toUpperCase() : 'U'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{c.username}</p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {c.createdAt?.toDate ? c.createdAt.toDate().toLocaleString() : 'Reciente'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-400 font-black tracking-tighter text-lg">+${c.amount.toFixed(2)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className={styles.sectionCard} style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className={styles.summaryCard}>
            <p className={styles.statTitle}>Capital Total</p>
            <p className={styles.statsValueGreen}>$1,250,000</p>
          </div>
          <div className={styles.summaryCard}>
            <p className={styles.statTitle}>Rendimiento 30d</p>
            <p className={styles.statsValueBlue}>+12.4%</p>
          </div>
          <div className={styles.summaryCard}>
            <p className={styles.statTitle}>Miembros</p>
            <p className={styles.statsTitle} style={{ marginBottom: 0 }}>2,450</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollectiveFundContent;
