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

  // Configuración de Estadísticas
  const [config, setConfig] = useState({
    displayMode: 'manual',
    manualCapital: 1250000,
    manualYield: 12.4,
    manualMembers: 2450
  });

  const [realStats, setRealStats] = useState({
    capital: 0,
    members: 0
  });

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

  // Fetch real-time config
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'siteSettings', 'collectiveFund'), (docSnap) => {
      if (docSnap.exists()) {
        setConfig(docSnap.data());
      }
    });
    return () => unsub();
  }, []);

  // Calculate real stats from ALL contributions
  useEffect(() => {
    const q = query(collection(db, 'collectiveFundContributions'));
    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => d.data());
      const totalCapital = docs.reduce((sum, d) => sum + (d.amount || 0), 0);
      const uniqueMembers = new Set(docs.map(d => d.userId)).size;
      setRealStats({ capital: totalCapital, members: uniqueMembers });
    });
    return () => unsub();
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
    <div className={`${styles.dashboardContent} animate-in fade-in duration-700`}>
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-6">
        <div>
          <h1 className="text-3xl font-black text-white italic tracking-tight mb-2 uppercase">Fondo Colectivo</h1>
          <p className="text-sm text-slate-500 font-bold uppercase tracking-widest max-w-xl">
            Participa en inversiones conjuntas y obtén rendimientos gestionados por profesionales de la industria.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-10 py-5 bg-[#fcd535] hover:bg-[#f0b90b] text-[#0b0e11] rounded-2xl font-black uppercase tracking-[0.2em] transition-all shadow-2xl shadow-[#fcd535]/10 active:scale-95 text-xs"
        >
          Participar ahora
        </button>
      </div>

      {success && (
        <div className="mb-8 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-4 animate-in zoom-in duration-300">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white"><FaCheckCircle /></div>
          <p className="text-emerald-500 font-black text-xs uppercase tracking-widest">{success}</p>
        </div>
      )}

      {error && (
        <div className="mb-8 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-4 animate-in zoom-in duration-300">
          <div className="w-8 h-8 bg-rose-500 rounded-lg flex items-center justify-center text-white"><FaExclamationTriangle /></div>
          <p className="text-rose-500 font-black text-xs uppercase tracking-widest">{error}</p>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
          <div className="bg-[#1e2329] border border-white/5 rounded-[40px] p-8 md:p-12 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300">
            <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter italic">Aportar Capital</h2>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-10">Los fondos se transfieren de tu balance USD</p>

            <form onSubmit={handleDeposit} className="space-y-8">
              <div>
                <label className="block text-[10px] text-slate-500 font-black uppercase tracking-widest mb-3 ml-2">Monto del Aporte (USD)</label>
                <div className="relative group">
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-[#12161c] border border-white/5 rounded-3xl px-8 py-6 text-white text-3xl font-black outline-none focus:border-blue-500 transition-all font-mono shadow-inner"
                    disabled={isLoading}
                    required
                  />
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-700 font-black text-sm">$</div>
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-5 bg-[#12161c] text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-[#1e2329] transition-all flex-1 border border-white/5"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex-1 shadow-2xl shadow-blue-600/30 active:scale-95 disabled:opacity-50"
                >
                  {isLoading ? 'Enviando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-12">
        <div className="lg:col-span-3 bg-[#1e2329] p-8 rounded-[40px] border border-white/5 shadow-2xl">
          <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.4em] mb-10 italic">Distribución Global de Fondos</h2>
          <div className="h-[400px] relative">
            <Pie data={data} options={options} plugins={[ChartDataLabels]} />
          </div>
        </div>

        <div className="lg:col-span-2 bg-[#1e2329] p-8 rounded-[40px] border border-white/5 shadow-2xl flex flex-col">
          <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.4em] mb-10 italic text-center">Últimas Participaciones</h2>
          <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar no-scrollbar">
            {contributions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 opacity-20">
                <FaRegClock size={40} className="mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest">Esperando datos...</p>
              </div>
            ) : (
              contributions.map((c) => (
                <div key={c.id} className="flex justify-between items-center p-5 bg-[#12161c] rounded-2xl border border-white/5 hover:bg-white/[0.02] transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-400 font-black text-sm border border-blue-500/20 group-hover:scale-110 transition-transform">
                      {c.username ? c.username[0].toUpperCase() : 'U'}
                    </div>
                    <div>
                      <p className="text-xs font-black text-white uppercase tracking-tight">{c.username}</p>
                      <p className="text-[9px] text-slate-600 font-black uppercase tracking-tighter">
                        {c.createdAt?.toDate ? c.createdAt.toDate().toLocaleDateString([], { day: '2-digit', month: '2-digit' }) : 'Reciente'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-500 font-black tracking-tighter text-base leading-none mb-1">+${c.amount.toLocaleString()}</p>
                    <div className="w-1 h-1 bg-emerald-500 rounded-full ml-auto"></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-[#1e2329] p-2 rounded-[40px] border border-white/5 shadow-2xl overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/5">
          <div className="p-10 text-center hover:bg-white/[0.01] transition-colors group">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Capital Estratégico</p>
            <p className="text-3xl lg:text-4xl font-black text-white italic tracking-tighter group-hover:scale-105 transition-transform duration-500">
              ${(config.displayMode === 'real' ? realStats.capital : config.manualCapital).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <div className="mt-4 px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[8px] font-black rounded-full inline-block border border-emerald-500/20">AUDITADO</div>
          </div>

          <div className="p-10 text-center hover:bg-white/[0.01] transition-colors group">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">ROI Proyectado (30D)</p>
            <p className="text-3xl lg:text-4xl font-black text-blue-400 italic tracking-tighter group-hover:scale-105 transition-transform duration-500">
              {config.displayMode === 'real' ? '+12.4' : config.manualYield}%
            </p>
            <div className="mt-4 px-3 py-1 bg-blue-500/10 text-blue-400 text-[8px] font-black rounded-full inline-block border border-blue-500/20">RENDIMIENTO</div>
          </div>

          <div className="p-10 text-center hover:bg-white/[0.01] transition-colors group">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Miembros Activos</p>
            <p className="text-3xl lg:text-4xl font-black text-white italic tracking-tighter group-hover:scale-105 transition-transform duration-500">
              {(config.displayMode === 'real' ? realStats.members : config.manualMembers).toLocaleString()}
            </p>
            <div className="mt-4 px-3 py-1 bg-slate-500/10 text-slate-400 text-[8px] font-black rounded-full inline-block border border-white/5 uppercase">Global</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollectiveFundContent;
