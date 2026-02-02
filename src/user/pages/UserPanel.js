import React, { useState, useEffect, useRef, useContext, useMemo } from 'react'; // Importar useContext y useMemo
import candadoIcon from '../../imagens/candado.png';
import { useAuth } from '../../context/AuthContext';
import { ThemeContext } from '../../context/ThemeContext'; // Importar ThemeContext
import { useNavigate, Routes, Route, useLocation } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import Chart from 'chart.js/auto';
import { countMinersByUser } from '../../utils/miners';
import { db, auth, storage } from '../../services/firebase'; // Importar db, auth y storage desde firebase.js
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc, setDoc, addDoc, deleteDoc, getDocs, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import CollectiveFundContent from '../components/CollectiveFundContent'; // Importar CollectiveFundContent
import BonusContent from '../components/BonusContent'; // Importar BonusContent
import WalletHub from '../components/WalletHub'; // Importar WalletHub unificado
import TradingPortfolioContent from '../components/TradingPortfolioContent'; // Importar TradingPortfolioContent
import ExchangeContent from '../components/ExchangeContent'; // Importar ExchangeContent
import P2P_MarketplacePage from '../pages/P2P_MarketplacePage'; // Importar P2P_MarketplacePage
import Sidebar from '../../common/layout/Sidebar'; // Importar Sidebar
import Navbar from '../components/Navbar'; // Importar Navbar
import MainContent from '../components/MainContent'; // Importar MainContent
import ErrorMessage from '../components/ErrorMessage'; // Importar ErrorMessage
import PerformanceStatsSection from '../components/PerformanceStatsSection'; // Importar PerformanceStatsSection
import StatsSection from '../components/StatsSection'; // Importar StatsSection
import styles from './UserPanel.module.css'; // Importar estilos CSS Modules
import useFormValidation from '../../hooks/useFormValidation'; // Importar useFormValidation
import { useError } from '../../context/ErrorContext'; // Importar useError
import minersData from '../../data/miners'; // Importar la lista de mineros
import VIPPlanDisplay from '../components/VIPPlanDisplay';
import { FaHistory, FaUserCircle, FaRegEye, FaRegEyeSlash, FaCrown, FaGem, FaRegClock } from 'react-icons/fa';

import UpdatesContent from '../components/UpdatesContent';
import CryptoMarketMonitor from '../components/CryptoMarketMonitor';

// Componentes de las sub-secciones


const VIPChatContent = ({ styles, userBalances }) => {
  const { darkMode } = useContext(ThemeContext);
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('public');
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef();

  const isVIP = useMemo(() => {
    if (!userBalances.vipStatus || userBalances.vipStatus === 'none') return false;
    if (!userBalances.vipExpiry) return false;
    const now = new Date();
    const expiry = userBalances.vipExpiry.toDate ? userBalances.vipExpiry.toDate() : new Date(userBalances.vipExpiry);
    return expiry > now;
  }, [userBalances.vipStatus, userBalances.vipExpiry]);

  useEffect(() => {
    if (!isVIP) return;
    setIsLoading(true);
    let q;
    if (activeTab === 'public') {
      q = query(collection(db, 'vipChat'), orderBy('createdAt', 'desc'), limit(50));
    } else {
      q = query(collection(db, 'privateVipMessages'), where('userId', '==', currentUser.uid), orderBy('createdAt', 'desc'), limit(50));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })).reverse();
      setMessages(fetchedMessages);
      setIsLoading(false);
    }, (error) => {
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [isVIP, activeTab, currentUser.uid]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;
    try {
      const collectionName = activeTab === 'public' ? 'vipChat' : 'privateVipMessages';
      await addDoc(collection(db, collectionName), {
        text: newMessage,
        userId: currentUser.uid,
        username: userBalances.username || 'Usuario',
        displayName: userBalances.displayName || 'Usuario',
        profilePhotoUrl: userBalances.profilePhotoUrl || '',
        isAdmin: false,
        createdAt: serverTimestamp(),
      });
      setNewMessage('');
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isVIP) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-10 bg-[#1e2329] rounded-[40px] border border-white/5 shadow-2xl">
        <div className="w-20 h-20 bg-[#fcd535]/10 rounded-full flex items-center justify-center text-[#fcd535] mb-6 border border-[#fcd535]/20 animate-pulse">
          <FaGem size={40} />
        </div>
        <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-4">Acceso Reservado Elite</h2>
        <p className="max-w-md text-slate-500 font-bold uppercase tracking-widest text-sm leading-relaxed">
          Esta frecuencia de comunicación está cifrada y reservada para miembros VIP. Adquiere un cupo mensul para desbloquear señales y soporte directo.
        </p>
        <button onClick={() => window.location.hash = '/user/plan-trading'} className="mt-8 px-10 py-4 bg-[#fcd535] text-black rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all text-xs shadow-2xl shadow-[#fcd535]/10">Adquirir VIP</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-[#1e2329] rounded-[40px] border border-white/5 overflow-hidden shadow-2xl">
      <div className="p-6 border-b border-white/5 bg-white/[0.01] flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">COMUNIDAD ELITE VIP</h2>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Canal Directo con Traders Expertos</p>
        </div>
        <div className="flex bg-[#12161c] p-1 rounded-xl border border-white/5">
          <button onClick={() => setActiveTab('public')} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'public' ? 'bg-[#2b3139] text-[#fcd535]' : 'text-slate-500'}`}>General</button>
          <button onClick={() => setActiveTab('private')} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'private' ? 'bg-[#2b3139] text-[#fcd535]' : 'text-slate-500'}`}>Soporte Directo</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
        {messages.map((msg, idx) => {
          const isMe = msg.userId === currentUser.uid;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex gap-4 max-w-[80%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className="w-10 h-10 rounded-xl bg-white/5 flex-shrink-0 flex items-center justify-center overflow-hidden border border-white/10 shadow-lg">
                  {msg.profilePhotoUrl ? <img src={msg.profilePhotoUrl} className="w-full h-full object-cover" /> : <FaUserCircle className="text-slate-600 text-2xl" />}
                </div>
                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{msg.displayName || msg.username}</span>
                  <div className={`px-6 py-4 rounded-3xl text-sm font-bold shadow-xl ${isMe ? 'bg-[#fcd535] text-black rounded-tr-none' : 'bg-[#12161c] text-white border border-white/5 rounded-tl-none'}`}>
                    {msg.text}
                  </div>
                  <span className="text-[8px] text-slate-600 font-black mt-1 uppercase tracking-tighter">{msg.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      <div className="p-8 bg-white/[0.01] border-t border-white/5">
        <form onSubmit={handleSendMessage} className="flex gap-4 items-end">
          <div className="flex-1 relative">
            <textarea
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              placeholder="Escribe un mensaje en el hub VIP..."
              className="w-full bg-[#12161c] border border-white/5 rounded-3xl px-8 py-5 text-white text-sm font-bold outline-none focus:border-[#fcd535]/30 transition-all resize-none min-h-[60px]"
              rows="1"
            />
          </div>
          <button type="submit" disabled={!newMessage.trim()} className="w-14 h-14 bg-[#fcd535] rounded-2xl flex items-center justify-center text-black shadow-xl shadow-[#fcd535]/10 active:scale-95 disabled:opacity-50 transition-all">
            <svg viewBox="0 0 24 24" className="w-6 h-6 rotate-45"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="currentColor" /></svg>
          </button>
        </form>
      </div>
    </div>
  );
};

const CopyTraderContent = ({ styles, userBalances }) => {
  const { darkMode } = useContext(ThemeContext);
  const [signals, setSignals] = useState([]);
  const [isLoadingSignals, setIsLoadingSignals] = useState(false);

  const isVIP = useMemo(() => {
    if (!userBalances.vipStatus || userBalances.vipStatus === 'none') return false;
    if (!userBalances.vipExpiry) return false;

    const now = new Date();
    const expiry = userBalances.vipExpiry.toDate ? userBalances.vipExpiry.toDate() : new Date(userBalances.vipExpiry);
    return expiry > now;
  }, [userBalances]);

  useEffect(() => {
    if (!isVIP) return;

    setIsLoadingSignals(true);
    const q = query(collection(db, 'tradingSignals'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedSignals = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
      }));
      setSignals(fetchedSignals);
      setIsLoadingSignals(false);
    }, (err) => {
      console.error("Error fetching signals for user:", err);
      setIsLoadingSignals(false);
    });

    return () => unsubscribe();
  }, [isVIP]);

  // Función para calcular el porcentaje de ganancia potencial
  const calculateProfitPercentage = (type, entryPrice, takeProfit) => {
    const entry = parseFloat(entryPrice);
    const tp = parseFloat(takeProfit);

    if (isNaN(entry) || isNaN(tp) || entry === 0) {
      return 'N/A';
    }

    let percentage;
    if (type === 'Compra') {
      percentage = ((tp - entry) / entry) * 100;
    } else { // Venta
      percentage = ((entry - tp) / entry) * 100;
    }

    return percentage.toFixed(2) + '%';
  };

  return (
    <div className={styles.dashboardContent}>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className={styles.mainContentTitle} style={{ marginBottom: '0.5rem' }}>Señales de Trading</h1>
          <p className={styles.statTitle}>Sigue nuestras operaciones en tiempo real. Sección exclusiva para miembros VIP.</p>
        </div>
        <button
          onClick={() => navigate('/user/mining-portfolio')}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600/10 border border-blue-500/20 rounded-xl text-[10px] font-black text-blue-400 uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all duration-300 shadow-xl shadow-blue-600/5 group"
        >
          <FaHistory className="transition-transform group-hover:rotate-[-20deg]" />
          Ver Historial Completo
        </button>
      </div>

      {!isVIP ? (
        <div className={styles.sectionCard} style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div className="flex flex-col items-center justify-center space-y-4 opacity-60">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            <p className="text-xl font-bold" style={{ color: '#f1f5f9' }}>Contenido exclusivo para miembros VIP</p>
            <p className={styles.statTitle}>Aquí aparecerán nuestras entradas de Binance. Adquiere un Cupo VIP en la sección "Plan Trading" para desbloquear esta sección.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {isLoadingSignals ? (
            <div className={styles.noDataText}>Cargando señales en tiempo real...</div>
          ) : signals.length === 0 ? (
            <div className={styles.noDataText}>No hay señales activas en este momento. Esté atento a las notificaciones.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {signals.filter(s => ['Activa', 'En espera'].includes(s.status)).map(signal => (
                <div key={signal.id} className={styles.signalCard} style={{ borderColor: signal.type === 'Compra' ? 'var(--green-check)' : 'var(--red-error)' }}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className={styles.statsTitle}>{signal.asset}</h3>
                      <div className="flex gap-2 items-center">
                        <span className={styles.statusBadge} style={{ background: signal.type === 'Compra' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: signal.type === 'Compra' ? 'var(--green-check)' : 'var(--red-error)' }}>
                          {signal.type}
                        </span>
                        <span className={styles.statusBadge} style={{ background: signal.status === 'En espera' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: signal.status === 'En espera' ? '#f59e0b' : 'var(--green-check)', border: signal.status === 'En espera' ? '1px solid rgba(245, 158, 11, 0.2)' : 'none' }}>
                          {signal.status || 'Activa'}
                        </span>
                        <span className={styles.statusBadge} style={{ background: 'rgba(234, 179, 8, 0.1)', color: '#eab308', border: '1px solid rgba(234, 179, 8, 0.2)', fontSize: '10px', fontWeight: 'bold' }}>
                          VIP EXCLUSIVO
                        </span>
                      </div>
                    </div>
                    <span className={styles.statTitle}>{signal.createdAt.toLocaleDateString()}</span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className={styles.summaryCard} style={{ padding: '0.75rem' }}>
                      <p className={styles.statTitle} style={{ fontSize: '10px' }}>Inversión Máx</p>
                      <p className={styles.statsTitle} style={{ marginBottom: 0 }}>${signal.maxInvestment || 100}</p>
                    </div>
                    <div className={styles.summaryCard} style={{ padding: '0.75rem' }}>
                      <p className={styles.statTitle} style={{ fontSize: '10px' }}>Entrada</p>
                      <p className={styles.statsTitle} style={{ marginBottom: 0 }}>{signal.entryPrice}</p>
                    </div>
                    <div className={styles.summaryCard} style={{ padding: '0.75rem', background: 'rgba(16, 185, 129, 0.05)' }}>
                      <p className={styles.statTitle} style={{ fontSize: '10px' }}>T. Profit</p>
                      <p className={styles.statsValueGreen} style={{ marginBottom: 0, fontSize: '13px' }}>{signal.takeProfit}</p>
                      <p className={styles.statsValueGreen} style={{ marginBottom: 0, fontSize: '11px', marginTop: '2px' }}>({calculateProfitPercentage(signal.type, signal.entryPrice, signal.takeProfit)})</p>
                    </div>
                    <div className={styles.summaryCard} style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.05)' }}>
                      <p className={styles.statTitle} style={{ fontSize: '10px' }}>S. Loss ({signal.stopLossPercentage || 0}%)</p>
                      <p className={styles.statsValueRed} style={{ marginBottom: 0 }}>{signal.stopLoss}</p>
                    </div>
                  </div>

                  {signal.notes && (
                    <p className={styles.statTitle} style={{ borderLeft: '2px solid var(--accent)', paddingLeft: '1rem', fontStyle: 'italic' }}>
                      {signal.notes}
                    </p>
                  )}

                  {signal.imageUrl && (
                    <div className="mt-4 rounded-xl overflow-hidden border border-white border-opacity-10">
                      <a href={signal.imageUrl} target="_blank" rel="noopener noreferrer">
                        <img src={signal.imageUrl} alt="Analysis" className="w-full h-48 object-cover hover:scale-105 transition-transform duration-500" />
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const PlanTradingContent = ({ styles }) => {
  const [vipPlans, setVipPlans] = useState([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'vipPlans'), (snapshot) => {
      const plansData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setVipPlans(plansData);
      setIsLoadingPlans(false);
    }, (error) => {
      console.error("Error fetching VIP plans for user:", error);
      setIsLoadingPlans(false);
    });

    return () => unsubscribe();
  }, []);

  const handlePlanPurchased = () => {
    console.log("Plan VIP adquirido. Las suscripciones de Firestore se encargarán de las actualizaciones.");
  };

  return (
    <div className={styles.dashboardContent}>
      <h1 className={styles.mainContentTitle}>Plan Trading</h1>
      <p className={styles.statTitle} style={{ marginBottom: '2rem' }}>Adquiere tu Cupo VIP Mensual para acceder a señales exclusivas y soporte prioritario.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-12">
        {isLoadingPlans ? (
          <div className={styles.noDataText}>Cargando planes VIP...</div>
        ) : vipPlans.length === 0 ? (
          <div className={styles.noDataText}>No hay planes VIP configurados.</div>
        ) : (
          vipPlans.map(plan => (
            <VIPPlanDisplay key={plan.id} plan={plan} onPlanPurchased={handlePlanPurchased} />
          ))
        )}
      </div>

      <div className={styles.sectionCard}>
        <h2 className={styles.sectionTitle}>¿Qué incluye el Cupo VIP?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="flex gap-3 items-start">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
            </div>
            <div>
              <p className="font-bold text-white text-sm">Señales en Tiempo Real</p>
              <p className="text-xs text-slate-400">Entradas y salidas de mercado enviadas directamente a tu panel.</p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <div className="p-2 rounded-lg bg-green-500/10 text-green-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></svg>
            </div>
            <div>
              <p className="font-bold text-white text-sm">Análisis Técnico</p>
              <p className="text-xs text-slate-400">Gráficos y explicaciones detalladas de cada operación sugerida.</p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
            </div>
            <div>
              <p className="font-bold text-white text-sm">Soporte Prioritario</p>
              <p className="text-xs text-slate-400">Atención personalizada para resolver dudas sobre tus operaciones.</p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
            </div>
            <div>
              <p className="font-bold text-white text-sm">Gestión de Riesgo</p>
              <p className="text-xs text-slate-400">Recomendaciones de inversión máxima y stop loss para proteger tu capital.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// DashboardContent stripped of chart logic
const DashboardContent = ({ userBalances, styles, paymentsHistory, withdrawalsHistory, dashboardMaxWidth, onDashboardWidthChange, isSidebarHidden = false }) => {
  const { darkMode } = useContext(ThemeContext);
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [showBalance, setShowBalance] = useState(true);

  const isVIP = useMemo(() => {
    if (userBalances.vipStatus !== 'active' || !userBalances.vipExpiry) return false;
    const now = new Date();
    const expiry = userBalances.vipExpiry.toDate ? userBalances.vipExpiry.toDate() : new Date(userBalances.vipExpiry);
    return expiry > now;
  }, [userBalances.vipStatus, userBalances.vipExpiry]);

  const [totalProfit, setTotalProfit] = useState(0);

  useEffect(() => {
    if (!currentUser?.uid) return;
    let unsubscribeTrading = () => { };
    let unsubscribeArbitrage = () => { };
    const arbitrageQuery = query(collection(db, 'userArbitragePools'), where('userId', '==', currentUser.uid));
    unsubscribeArbitrage = onSnapshot(arbitrageQuery, (arbitrageSnapshot) => {
      const arbProfit = arbitrageSnapshot.docs.reduce((sum, doc) => sum + (parseFloat(doc.data().earnings) || 0), 0);
      if (isVIP) {
        const tradingQuery = query(collection(db, 'tradingHistory'));
        unsubscribeTrading = onSnapshot(tradingQuery, (tradingSnapshot) => {
          const tradingProfit = tradingSnapshot.docs.reduce((sum, doc) => sum + (parseFloat(doc.data().profit) || 0), 0);
          setTotalProfit(arbProfit + tradingProfit);
        });
      } else {
        setTotalProfit(arbProfit);
      }
    });
    return () => { unsubscribeTrading(); unsubscribeArbitrage(); };
  }, [currentUser, isVIP]);

  const vipStatusLabel = useMemo(() => {
    const status = userBalances.vipStatus || 'none';
    if (status === 'none') return 'Nivel 0';
    if (userBalances.vipPlanName) return `ELITE ${userBalances.vipPlanName}`;
    return status.toUpperCase();
  }, [userBalances.vipStatus, userBalances.vipPlanName]);

  const totalEquity = useMemo(() => {
    return userBalances.balanceUSD + (parseFloat(userBalances.balanceBTC) * 100000 || 0);
  }, [userBalances]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto px-4 py-8">
      {/* Premium Profile Slot */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        <div className="lg:col-span-2 bg-[#1e2329] p-10 rounded-[40px] border border-white/5 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#fcd535]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

          <div className="relative flex flex-col md:flex-row items-center gap-8">
            <div className="w-24 h-24 rounded-full bg-[#fcd535] p-1 shadow-2xl">
              <div className="w-full h-full rounded-full overflow-hidden border-4 border-[#1e2329] bg-[#12161c] flex items-center justify-center">
                {userBalances.profilePhotoUrl ? <img src={userBalances.profilePhotoUrl} className="w-full h-full object-cover" /> : <FaUserCircle size={48} className="text-slate-700" />}
              </div>
            </div>

            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-wrap justify-center md:justify-start items-center gap-3 mb-2">
                <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter">{userBalances.displayName || userBalances.username || 'Inversor Global'}</h1>
                <span className="px-3 py-1 bg-[#fcd535] text-black text-[9px] font-black rounded-lg uppercase tracking-widest">{vipStatusLabel}</span>
              </div>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-6 flex items-center justify-center md:justify-start gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                Identidad Verificada • ID: {currentUser?.uid?.substring(0, 12).toUpperCase()}
              </p>

              <div className="flex flex-wrap justify-center md:justify-start gap-10">
                <div>
                  <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mb-1">Rango Global</p>
                  <p className="text-lg font-black text-white italic tracking-tighter">ELITE VIP</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mb-1">Activos Seguidores</p>
                  <p className="text-lg font-black text-[#fcd535] italic tracking-tighter">3.2K+</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#fcd535] p-1 rounded-[40px] shadow-2xl">
          <div className="w-full h-full bg-[#1e2329] rounded-[38px] p-10 flex flex-col justify-between border border-white/5 hover:bg-[#2b3139] transition-all cursor-pointer group">
            <div>
              <div className="flex justify-between items-center mb-6">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Balance Estimado</span>
                <button onClick={() => setShowBalance(!showBalance)} className="text-[#fcd535]">
                  {showBalance ? <FaRegEye size={18} /> : <FaRegEyeSlash size={18} />}
                </button>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-black text-white italic tracking-tighter">
                  {showBalance ? totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '********'}
                </p>
                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">USDT</span>
              </div>
              <p className="text-xs text-slate-600 font-bold mt-2">≈ {showBalance ? totalEquity.toFixed(2) : '********'} USD</p>
            </div>

            <div className="mt-8 pt-6 border-t border-white/5 flex gap-4">
              <button onClick={() => navigate('/user/deposits')} className="flex-1 py-3 bg-[#fcd535] text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all">Depositar</button>
              <button onClick={() => navigate('/user/withdrawals')} className="flex-1 py-3 bg-[#12161c] text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-black transition-all border border-white/5">Retirar</button>
            </div>
          </div>
        </div>
      </div>

      {/* Market Watch Section */}
      <CryptoMarketMonitor />
    </div>
  );
};


// PaymentsContent and WithdrawalsContent were removed and unified into WalletHub.jsx

const ContactSupportContent = ({ onUnreadCountChange, styles }) => {
  const { darkMode } = useContext(ThemeContext);
  const { currentUser } = useAuth();
  const { showError, showSuccess } = useError();
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [subject, setSubject] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'contactRequests'), where('userId', '==', currentUser.uid), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTickets = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      }));
      setTickets(fetchedTickets);
      const unreadCount = fetchedTickets.filter(t => t.status === 'Respondido' && t.conversation.some(msg => msg.sender === 'admin' && !msg.readByUser)).length;
      onUnreadCountChange(unreadCount);
      if (selectedTicket) {
        const updated = fetchedTickets.find(t => t.id === selectedTicket.id);
        if (updated) setSelectedTicket(updated);
      }
    });
    return () => unsubscribe();
  }, [currentUser, onUnreadCountChange, selectedTicket]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageContent.trim()) return;
    setIsLoading(true);
    try {
      if (selectedTicket) {
        const newConversation = [...selectedTicket.conversation, { sender: 'user', text: messageContent, timestamp: new Date() }];
        await updateDoc(doc(db, 'contactRequests', selectedTicket.id), { conversation: newConversation, status: 'Pendiente', updatedAt: new Date() });
        showSuccess('Respuesta enviada al nodo de soporte.');
      } else {
        if (!subject.trim()) { showError('Define un asunto para la consulta.'); setIsLoading(false); return; }
        await addDoc(collection(db, 'contactRequests'), {
          userId: currentUser.uid,
          userEmail: currentUser.email,
          subject,
          status: 'Abierto',
          createdAt: new Date(),
          updatedAt: new Date(),
          conversation: [{ sender: 'user', text: messageContent, timestamp: new Date() }],
        });
        showSuccess('Nueva solicitud de soporte generada.');
        setSubject('');
      }
      setMessageContent('');
    } catch (err) {
      showError(`Error de red: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTicket = async (ticket) => {
    setSelectedTicket(ticket);
    const hasUnread = ticket.conversation.some(msg => msg.sender === 'admin' && !msg.readByUser);
    if (hasUnread) {
      const updated = ticket.conversation.map(msg => msg.sender === 'admin' ? { ...msg, readByUser: true } : msg);
      await updateDoc(doc(db, 'contactRequests', ticket.id), { conversation: updated });
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-140px)] gap-6 animate-in fade-in duration-500">
      <div className="w-full lg:w-[400px] bg-[#1e2329] rounded-[40px] border border-white/5 flex flex-col overflow-hidden shadow-2xl relative">
        <div className="p-8 border-b border-white/5 bg-white/[0.01]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">Mis Solicitudes</h2>
            <button onClick={() => setSelectedTicket(null)} className="p-2 bg-[#fcd535]/10 text-[#fcd535] rounded-xl hover:bg-[#fcd535]/20 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
          </div>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Soporte Técnico Especializado</p>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
          {tickets.length === 0 ? (
            <div className="text-center py-20 opacity-20"><FaRegClock size={40} className="mx-auto mb-4" /><p className="text-[10px] font-black uppercase tracking-widest">Sin solicitudes activas</p></div>
          ) : (
            tickets.map(t => (
              <div key={t.id} onClick={() => handleSelectTicket(t)} className={`p-6 rounded-[2rem] border transition-all cursor-pointer group relative overflow-hidden ${selectedTicket?.id === t.id ? 'bg-[#2b3139] border-[#fcd535]/30' : 'bg-[#12161c] border-white/5 hover:border-white/10'}`}>
                <div className="flex justify-between items-start mb-3">
                  <p className={`text-xs font-black uppercase tracking-tight ${selectedTicket?.id === t.id ? 'text-[#fcd535]' : 'text-white'}`}>{t.subject}</p>
                  <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${t.status === 'Respondido' ? 'bg-emerald-500 text-black' : 'bg-slate-800 text-slate-400'}`}>{t.status}</span>
                </div>
                <p className="text-[10px] text-slate-500 line-clamp-1 font-bold lowercase mb-3">{t.conversation[t.conversation.length - 1].text}</p>
                <div className="flex justify-between items-center">
                  <span className="text-[8px] text-slate-700 font-black uppercase">{t.updatedAt.toLocaleDateString()}</span>
                  {t.status === 'Respondido' && t.conversation.some(msg => msg.sender === 'admin' && !msg.readByUser) && (<div className="w-2 h-2 bg-[#fcd535] rounded-full shadow-[0_0_10px_#fcd535] animate-pulse"></div>)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <div className="flex-1 bg-[#1e2329] rounded-[40px] border border-white/5 flex flex-col overflow-hidden shadow-2xl relative">
        {selectedTicket ? (
          <>
            <div className="p-8 border-b border-white/5 bg-white/[0.01]">
              <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-2">{selectedTicket.subject}</h2>
              <div className="flex items-center gap-4">
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">ID: {selectedTicket.id.substring(0, 8)}</span>
                <span className="w-1 h-1 bg-slate-800 rounded-full"></span>
                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Estado: {selectedTicket.status}</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar bg-[#12161c]/30">
              {selectedTicket.conversation.map((msg, idx) => {
                const isAdmin = msg.sender === 'admin';
                return (
                  <div key={idx} className={`flex ${isAdmin ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[75%] p-6 rounded-[2rem] text-sm font-bold shadow-xl ${isAdmin ? 'bg-slate-800 text-white rounded-tl-none border border-white/5' : 'bg-[#fcd535] text-black rounded-tr-none'}`}>
                      <p className="leading-relaxed">{msg.text}</p>
                      <p className={`text-[8px] mt-4 font-black uppercase tracking-tighter ${isAdmin ? 'text-slate-500' : 'text-black/50'}`}> {isAdmin ? '🛡️ Agente de Soporte' : 'Tu consulta'} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} </p>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="p-8 border-t border-white/5 bg-white/[0.02]">
              <form onSubmit={handleSendMessage} className="flex gap-4">
                <input type="text" value={messageContent} onChange={e => setMessageContent(e.target.value)} placeholder="Enviar respuesta al nodo de soporte..." className="flex-1 bg-[#12161c] border border-white/5 rounded-2xl px-6 py-4 text-white text-xs font-bold outline-none focus:border-[#fcd535]/30 transition-all" />
                <button type="submit" disabled={!messageContent.trim() || isLoading} className="px-8 py-4 bg-[#fcd535] text-black rounded-xl font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all shadow-lg active:scale-95 disabled:opacity-50">Enviar</button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12">
            <div className="w-full max-w-lg">
              <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-2">Nueva Consulta</h2>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-12">Nuestro equipo técnico responderá en menos de 24 horas</p>
              <form onSubmit={handleSendMessage} className="space-y-8">
                <div>
                  <label className="block text-[9px] font-black text-slate-600 uppercase tracking-widest mb-3 ml-2">Asunto Global</label>
                  <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Ej: Problemas con el retiro API" className="w-full bg-[#12161c] border border-white/5 rounded-2xl px-6 py-5 text-white text-xs font-black outline-none focus:border-[#fcd535]/30 transition-all shadow-inner" />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-600 uppercase tracking-widest mb-3 ml-2">Descripción Detallada</label>
                  <textarea rows="6" value={messageContent} onChange={e => setMessageContent(e.target.value)} placeholder="Describe tu incidencia con precisión..." className="w-full bg-[#12161c] border border-white/5 rounded-[2rem] px-6 py-5 text-white text-xs font-bold outline-none focus:border-[#fcd535]/30 transition-all shadow-inner resize-none" />
                </div>
                <button type="submit" className="w-full py-5 bg-[#fcd535] text-black rounded-[1.5rem] font-black uppercase tracking-widest text-xs hover:scale-105 transition-all shadow-2xl active:scale-95">Iniciar Solicitud de Soporte</button>
              </form>
            </div>
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

const SettingsContent = ({ styles, dashboardMaxWidth, onDashboardWidthChange, userBalances }) => {
  const { darkMode } = useContext(ThemeContext); // Usar ThemeContext
  const { showError, showSuccess } = useError(); // Usar el contexto de errores
  const { currentUser } = useAuth();
  const [localDashboardWidth, setLocalDashboardWidth] = useState(dashboardMaxWidth);
  const [isVIPSet, setIsVIPSet] = useState(false);
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
  const [receiveSignalsNotifications, setReceiveSignalsNotifications] = useState(false);
  const [twoFactorAuthEnabled, setTwoFactorAuthEnabled] = useState(false);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [profilePhotoFile, setProfilePhotoFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false); // Estado de carga

  const isVIP = useMemo(() => {
    if (!userBalances?.vipStatus || userBalances.vipStatus === 'none') return false;
    if (!userBalances.vipExpiry) return false;
    const now = new Date();
    const expiry = userBalances.vipExpiry.toDate ? userBalances.vipExpiry.toDate() : new Date(userBalances.vipExpiry);
    return expiry > now;
  }, [userBalances]);

  const availableAvatars = [
    { id: 'male-trader', url: '/avatars/male-trader.png', label: 'Trader Elite' },
    { id: 'female-trader', url: '/avatars/female-trader.png', label: 'Trader Pro' },
    { id: 'neon-robot', url: '/avatars/neon-robot.png', label: 'Cyber Bot' },
    { id: 'crypto-coin', url: '/avatars/crypto-coin.png', label: 'HODL Master' },
    { id: 'bull-market', url: '/avatars/bull-market.png', label: 'Bull Run' },
    { id: 'bear-market', url: '/avatars/bear-market.png', label: 'Bear Power' },
  ];

  const handleSelectAvatar = (url) => {
    setProfilePhotoUrl(url);
    setProfilePhotoFile(null);
    showSuccess('Avatar seleccionado. Recuerda guardar los cambios.');
  };

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
            setReceiveSignalsNotifications(userData.receiveSignalsNotifications || false);
            setTwoFactorAuthEnabled(userData.twoFactorAuthEnabled || false);
            setUsername(userData.username || '');
            setDisplayName(userData.displayName || '');
            setBio(userData.bio || '');
            setProfilePhotoUrl(userData.profilePhotoUrl || '');
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

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (!currentUser || !currentUser.uid) {
      showError('No hay usuario autenticado.');
      setIsLoading(false);
      return;
    }

    try {
      let finalPhotoUrl = profilePhotoUrl;

      // Subir foto si hay una nueva seleccionada
      if (profilePhotoFile) {
        const storageRef = ref(storage, `profilePhotos/${currentUser.uid}`);
        await uploadBytes(storageRef, profilePhotoFile);
        finalPhotoUrl = await getDownloadURL(storageRef);
      }

      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, {
        username: username,
        displayName: displayName,
        bio: bio,
        profilePhotoUrl: finalPhotoUrl,
      });

      setProfilePhotoUrl(finalPhotoUrl);
      setProfilePhotoFile(null);
      showSuccess('Perfil actualizado exitosamente.');
    } catch (err) {
      console.error("Error al actualizar el perfil:", err);
      showError(`Fallo al actualizar el perfil: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
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

      // Guardar preferencias si cambiaron
      if (localDashboardWidth !== dashboardMaxWidth) {
        onDashboardWidthChange(localDashboardWidth);
        showSuccess('Preferencias de visualización actualizadas correctamente.');
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
        receiveSignalsNotifications: receiveSignalsNotifications,
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

  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
    { id: 'profile', label: 'Mi Perfil', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg> },
    { id: 'account', label: 'Cuenta y Seguridad', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg> },
    { id: 'payments', label: 'Pagos y Billeteras', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg> },
    { id: 'appearance', label: 'Personalización', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" /></svg> },
    { id: 'notifications', label: 'Notificaciones', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg> },
  ];

  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-10 bg-[#0b0e11] min-h-screen animate-in fade-in duration-700">
      <header className="mb-12">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-[#fcd535]/10 rounded-2xl">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fcd535" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1V15a2 2 0 0 1-2-2 2 2 0 0 1 2-2v-.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2v.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
          </div>
          <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">Configuración del Nodo</h1>
        </div>
        <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] ml-1">Gestión de identidad y protocolos de seguridad • Sincronizado</p>
      </header>

      {isLoading && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[#fcd535]/10 border-t-[#fcd535] rounded-full animate-spin"></div>
            <p className="text-[10px] font-black text-[#fcd535] uppercase tracking-widest animate-pulse">Procesando Cambio...</p>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-10 items-start">
        {/* Modern Sidebar Tabs */}
        <aside className="w-full lg:w-[320px] flex flex-row lg:flex-col gap-3 p-2 bg-[#1e2329] border border-white/5 rounded-[2.5rem] lg:sticky lg:top-10 z-10 overflow-x-auto no-scrollbar shadow-2xl">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-4 px-6 py-5 rounded-[1.8rem] transition-all duration-500 whitespace-nowrap group relative overflow-hidden ${activeTab === tab.id
                ? 'bg-[#fcd535] text-[#0b0e11] shadow-xl shadow-[#fcd535]/10 scale-[1.02]'
                : 'text-slate-500 hover:text-white hover:bg-white/5'
                }`}
            >
              <div className={`transition-transform duration-500 ${activeTab === tab.id ? 'scale-110' : 'group-hover:scale-110 group-hover:text-[#fcd535]'}`}>
                {tab.icon}
              </div>
              <span className={`text-[11px] font-black uppercase tracking-widest ${activeTab === tab.id ? 'text-[#0b0e11]' : 'text-slate-400 group-hover:text-white'}`}>{tab.label}</span>
              {activeTab === tab.id && (
                <div className="absolute right-4 w-1.5 h-1.5 bg-[#0b0e11] rounded-full animate-pulse"></div>
              )}
            </button>
          ))}
        </aside>

        {/* Tab Content Area */}
        <div className="flex-1 w-full min-h-[700px] animate-in fade-in slide-in-from-right-4 duration-700">
          {activeTab === 'profile' && (
            <div className="bg-[#1e2329] rounded-[3rem] border border-white/5 p-10 lg:p-12 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-16 opacity-[0.02] pointer-events-none group-hover:opacity-[0.05] transition-opacity">
                <svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
              </div>

              <div className="relative z-10">
                <div className="flex items-center gap-6 mb-12">
                  <div className="p-4 bg-[#fcd535]/10 rounded-2xl border border-[#fcd535]/20">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fcd535" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Identidad Visual</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Sincroniza tu presencia en el nodo global</p>
                  </div>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-10">
                  <div className="flex flex-col items-center p-12 bg-[#0b0e11]/50 rounded-[3rem] border border-white/5 shadow-inner">
                    <div className="relative group cursor-pointer" onClick={() => document.getElementById('profile-photo-input').click()}>
                      <div className="w-32 h-32 rounded-full overflow-hidden border-[6px] border-[#1e2329] bg-[#1e2329] flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.5)] transition-all group-hover:scale-105 group-hover:border-[#fcd535]/30">
                        {profilePhotoUrl ? (
                          <img src={profilePhotoUrl} alt="Perfil" className="w-full h-full object-cover" />
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#2b3139" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                        )}
                      </div>
                      <div className="absolute inset-0 bg-[#fcd535]/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-[2px]">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                      </div>
                    </div>
                    <input type="file" id="profile-photo-input" hidden accept=".png,.gif,image/png,image/gif" onChange={(e) => setProfilePhotoFile(e.target.files[0])} />
                    <div className="mt-6 text-center">
                      <p className="text-[10px] font-black text-white uppercase tracking-[0.2em] mb-1">Actualizar Bio-Fotografía</p>
                      <p className="text-[9px] text-slate-600 font-bold uppercase tracking-wider">Formatos autorizados: PNG, GIF</p>
                    </div>
                  </div>

                  <div className="bg-[#0b0e11]/30 p-8 lg:p-10 rounded-[2.5rem] border border-white/5">
                    <div className="flex items-center gap-3 mb-8">
                      <div className="p-2.5 rounded-xl bg-[#fcd535]/10 border border-[#fcd535]/20">
                        <FaCrown size={20} className="text-[#fcd535]" />
                      </div>
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">Avatares Premium Sincronizados</h3>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-6">
                      {availableAvatars.map((avatar) => (
                        <button
                          key={avatar.id}
                          type="button"
                          onClick={() => handleSelectAvatar(avatar.url)}
                          className={`group relative aspect-square rounded-[1.5rem] overflow-hidden border-4 transition-all duration-500 ${profilePhotoUrl === avatar.url
                            ? 'border-[#fcd535] shadow-xl shadow-[#fcd535]/10 scale-110 z-10'
                            : 'border-white/5 hover:border-[#fcd535]/30 hover:scale-105'
                            }`}
                        >
                          <img src={avatar.url} alt={avatar.label} className="w-full h-full object-cover transition-transform duration-700 group-hover:rotate-3 group-hover:scale-110" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-500 uppercase ml-4 tracking-[0.15em]">Usuario del Nodo (@)</label>
                      <div className="relative group">
                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-[#fcd535] font-black text-lg">@</span>
                        <input
                          type="text"
                          className="w-full bg-[#0b0e11] border border-white/5 rounded-[1.5rem] pl-12 pr-6 py-5 text-white text-sm font-bold outline-none focus:border-[#fcd535]/40 transition-all shadow-inner"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="alias_elite"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-500 uppercase ml-4 tracking-[0.15em]">Nombre de Visualización</label>
                      <input
                        type="text"
                        className="w-full bg-[#0b0e11] border border-white/5 rounded-[1.5rem] px-6 py-5 text-white text-sm font-bold outline-none focus:border-[#fcd535]/40 transition-all shadow-inner"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Nombre Real o Pseudónimo"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-4 tracking-[0.15em]">Firma Biográfica</label>
                    <textarea
                      className="w-full bg-[#0b0e11] border border-white/5 rounded-[1.8rem] px-8 py-6 text-white text-sm font-bold outline-none focus:border-[#fcd535]/40 transition-all shadow-inner min-h-[150px] resize-none"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Describe tu trayectoria de inversión..."
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-6 bg-[#fcd535] text-[#0b0e11] rounded-[1.8rem] font-black uppercase tracking-[0.3em] text-[11px] shadow-2xl shadow-[#fcd535]/10 hover:scale-[1.01] active:scale-[0.98] transition-all"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Actualizando Nodo...' : 'Guardar Perfil Maestro'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'account' && (
            <div className="bg-[#1e2329] rounded-[3rem] border border-white/5 p-10 lg:p-12 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]">
              <div className="flex items-center gap-6 mb-12">
                <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Protocolos de Cuenta</h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Gestión de credenciales y seguridad de acceso</p>
                </div>
              </div>

              <form onSubmit={handleUpdateAccount} className="space-y-12">
                <div className="space-y-6">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#fcd535]/60 border-l-4 border-[#fcd535] pl-4">Enlace de Comunicación</h3>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-4 tracking-widest">Email de Acceso</label>
                    <input
                      type="email"
                      className="w-full bg-[#0b0e11] border border-white/5 rounded-2xl px-6 py-5 text-white font-bold outline-none focus:border-[#fcd535]/40 transition-all opacity-70"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      disabled={true}
                    />
                  </div>
                </div>

                <div className="space-y-8">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#fcd535]/60 border-l-4 border-[#fcd535] pl-4">Rotación de Cifrado (Contraseña)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-500 uppercase ml-4 tracking-widest">Contraseña Actual</label>
                      <input
                        type="password"
                        className="w-full bg-[#0b0e11] border border-white/5 rounded-2xl px-6 py-5 text-white font-bold outline-none focus:border-[#fcd535]/40 transition-all"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Confirmación Requerida"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-500 uppercase ml-4 tracking-widest">Nueva Contraseña</label>
                      <input
                        type="password"
                        className="w-full bg-[#0b0e11] border border-white/5 rounded-2xl px-6 py-5 text-white font-bold outline-none focus:border-emerald-500/40 transition-all"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Nueva Master Key"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-10 bg-[#0b0e11]/50 rounded-[2.5rem] border border-white/5 flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-blue-500/10 rounded-2xl border border-blue-500/20 flex items-center justify-center text-blue-400">
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white uppercase tracking-widest">Autenticación Multifactor (2FA)</h4>
                      <p className="text-[10px] text-slate-500 uppercase font-bold mt-1 tracking-tighter">Estado: Protocolo Pendiente de Integración</p>
                    </div>
                  </div>
                  <div className="px-6 py-2 bg-slate-800 rounded-full border border-white/5">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">En Mantenimiento</span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-6 bg-white text-[#0b0e11] rounded-[1.8rem] font-black uppercase tracking-[0.3em] text-[11px] shadow-2xl shadow-white/5 hover:bg-slate-100 transition-all active:scale-[0.98]"
                >
                  Actualizar Protocolos de Acceso
                </button>
              </form>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="bg-[#1e2329] rounded-[3rem] border border-white/5 p-10 lg:p-12 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]">
              <div className="flex items-center gap-6 mb-12">
                <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Terminales de Retiro</h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Configuración del nodo de liquidez personal</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {Object.entries(paymentAddresses).map(([currency, address]) => (
                  <div key={currency} className="bg-[#0b0e11]/50 p-8 rounded-[2rem] border border-white/5 group hover:border-[#fcd535]/30 transition-all">
                    <div className="flex justify-between items-center mb-6">
                      <span className="px-3 py-1 bg-[#1e2329] text-[#fcd535] rounded-lg text-[10px] font-black border border-white/5">{currency} Network</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    </div>
                    <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-3 block ml-2">Dirección de Destino</label>
                    <input
                      type="text"
                      className="w-full bg-[#12161c] border border-white/5 rounded-2xl px-5 py-4 text-white text-xs font-mono outline-none focus:border-[#fcd535]/40 transition-all font-bold"
                      value={address}
                      onChange={(e) => handlePaymentAddressChange(currency, e.target.value)}
                      placeholder={`bc1.. / 0x.. / @uid`}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-12 p-8 bg-blue-600/5 rounded-[2rem] border border-blue-500/10 flex items-start gap-4">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                </div>
                <p className="text-[10px] text-slate-500 font-bold leading-relaxed uppercase tracking-tighter italic">
                  Verifica la integridad de la dirección. El nodo global no procesa reversiones en redes descentralizadas.
                </p>
              </div>

              <button
                onClick={handleSaveAddresses}
                className="w-full py-6 bg-emerald-600 text-white rounded-[1.8rem] font-black uppercase tracking-[0.3em] text-[11px] shadow-2xl shadow-emerald-600/10 hover:bg-emerald-500 transition-all mt-10"
              >
                Inscribir Terminales de Pago
              </button>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="bg-[#1e2329] rounded-[3rem] border border-white/5 p-10 lg:p-12 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]">
              <div className="flex items-center gap-6 mb-12">
                <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" /></svg>
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Estética del Nodo</h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Calibración visual de la terminal de trading</p>
                </div>
              </div>

              <div className="bg-[#0b0e11]/50 p-10 rounded-[2.5rem] border border-white/5">
                <div className="flex items-center justify-between mb-10">
                  <div>
                    <h4 className="text-sm font-black text-white uppercase tracking-widest">Ampliación de Pantalla</h4>
                    <p className="text-[9px] text-slate-600 font-bold uppercase mt-1 tracking-widest">Dimensiones del layout central</p>
                  </div>
                  <div className="px-4 py-2 bg-indigo-600/10 border border-indigo-500/30 rounded-full">
                    <span className="text-xl font-black text-indigo-400 italic tracking-tighter">{localDashboardWidth}px</span>
                  </div>
                </div>

                <input
                  type="range"
                  min="800"
                  max="2560"
                  step="20"
                  value={localDashboardWidth}
                  onChange={(e) => setLocalDashboardWidth(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-full appearance-none cursor-pointer accent-[#fcd535] mb-6"
                />
                <div className="flex justify-between">
                  <span className="text-[9px] font-black text-slate-700 uppercase">Standard (800)</span>
                  <span className="text-[9px] font-black text-slate-700 uppercase">Ultra Cinema (2.5K)</span>
                </div>
              </div>

              <button
                onClick={handleUpdateAccount}
                className="w-full py-6 bg-indigo-600 text-white rounded-[1.8rem] font-black uppercase tracking-[0.3em] text-[11px] shadow-2xl shadow-indigo-600/10 transition-all mt-10 hover:bg-indigo-500"
              >
                Aplicar Perfil Estético
              </button>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="bg-[#1e2329] rounded-[3rem] border border-white/5 p-10 lg:p-12 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]">
              <div className="flex items-center gap-6 mb-12">
                <div className="p-4 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Protocolos de Alerta</h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Suscripción a telemetría del sistema</p>
                </div>
              </div>

              <div className="space-y-6">
                {[
                  { label: 'Transacciones Financieras', desc: 'Confirmaciones de flujo de activos en tiempo real.', state: receivePaymentNotifications, setter: setReceivePaymentNotifications },
                  { label: 'Integridad del Nodo', desc: 'Alertas críticas de inicio de sesión y acceso.', state: receiveLoginAlerts, setter: setReceiveLoginAlerts },
                  { label: 'Señales de Alta Frecuencia', desc: 'Oportunidades de entrada al nodo de trading.', state: receiveSignalsNotifications, setter: setReceiveSignalsNotifications, locked: !isVIP },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-8 bg-[#0b0e11]/50 rounded-[2.2rem] border border-white/5 group hover:border-[#fcd535]/20 transition-all">
                    <div className="flex-1 pr-10">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-xs font-black text-white uppercase tracking-[0.1em]">{item.label}</h4>
                        {item.locked && <span className="text-[8px] font-black text-black bg-[#fcd535] px-2 py-0.5 rounded-full uppercase italic">VIP Lock</span>}
                      </div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter leading-relaxed">{item.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={item.state} onChange={() => !item.locked && item.setter(!item.state)} disabled={item.locked} />
                      <div className="w-14 h-7 bg-slate-800 rounded-full peer peer-checked:bg-[#fcd535] transition-all after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-slate-500 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-7 peer-checked:after:bg-[#0b0e11] shadow-inner"></div>
                    </label>
                  </div>
                ))}
              </div>

              <button
                onClick={handleSaveNotifications}
                className="w-full py-6 bg-rose-600 text-white rounded-[1.8rem] font-black uppercase tracking-[0.3em] text-[11px] shadow-2xl shadow-rose-600/10 hover:bg-rose-500 transition-all mt-10"
              >
                Sincronizar Protocolos de Alerta
              </button>
            </div>
          )}
        </div>
      </div>
    </div >
  );
};


const UserPanel = () => {
  const { currentUser, logout } = useAuth();
  const { darkMode } = useContext(ThemeContext); // Usar ThemeContext
  const navigate = useNavigate();
  const location = useLocation(); // Agregar useLocation para react-router
  const [userMiners, setUserMiners] = useState([]);
  const [unreadTicketsCount, setUnreadTicketsCount] = useState(0);
  const [userBalances, setUserBalances] = useState({
    balanceUSD: 0,
    balanceBTC: 0,
    balanceLTC: 0,
    balanceDOGE: 0,
    balanceVES: 0,
    balanceUSDTTRC20: 0,
    balanceTRX: 0,
    vipStatus: 'none',
    vipExpiry: null,
  });
  const [isSidebarHidden, setIsSidebarHidden] = useState(false);
  const [dashboardMaxWidth, setDashboardMaxWidth] = useState(1600); // Default 1600px for wider charts
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

  const demoUser = { email: 'demo@example.com' };
  const displayUser = useMemo(() => {
    if (!currentUser) return demoUser;
    return {
      ...currentUser,
      ...userBalances // Incluye username, displayName, profilePhotoUrl, vipStatus
    };
  }, [currentUser, userBalances]);

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
    // Cálculo basado en depósito de plan de $25 y un 2% aprox por trade
    const planDeposit = 25;
    const tradeProfitPercent = 0.02;
    return planDeposit * tradeProfitPercent;
  }, []);

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
          balanceVES: userData.balanceVES || 0,
          balanceUSDTTRC20: userData.balanceUSDTTRC20 || 0,
          balanceTRX: userData.balanceTRX || 0,
          vipStatus: userData.vipStatus || 'none',
          vipExpiry: userData.vipExpiry || null,
          username: userData.username || '',
          displayName: userData.displayName || '',
          profilePhotoUrl: userData.profilePhotoUrl || '',
        });
        setDashboardMaxWidth(userData.preferences?.dashboardMaxWidth || 1600);
        setUserPaymentAddresses(userData.paymentAddresses || {}); // Actualizar direcciones de pago
        console.log(`UserPanel: Datos de usuario, perfil y direcciones cargados para ${currentUser.uid}.`);
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
            balanceUSDTTRC20: 0,
            balanceTRX: 0,
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



  const showNavbar = useMemo(() => {
    // Definimos explícitamente dónde SÍ debe aparecer el Navbar
    const allowedPaths = ['/user/miners', '/user/vip-chat'];

    // Y dónde definitivamente NO debe aparecer (por si acaso)
    const blockedPaths = [
      '/user/plan-trading',
      '/user/my-wallet',
      '/user/deposits',
      '/user/withdrawals',
      '/user/settings',
      '/user/mining-portfolio',
      '/user/dashboard'
    ];

    if (blockedPaths.some(path => location.pathname.startsWith(path))) return false;

    return allowedPaths.some(path =>
      location.pathname === path || location.pathname.startsWith(path + '/')
    );
  }, [location.pathname]);



  const handleUpdateDashboardWidth = async (newWidth) => {
    setDashboardMaxWidth(newWidth);
    if (currentUser?.uid) {
      const userDocRef = doc(db, 'users', currentUser.uid);
      await setDoc(userDocRef, {
        preferences: { dashboardMaxWidth: newWidth }
      }, { merge: true });
    }
  };

  return (
    <div className={styles.userPanelContainer} style={{ backgroundColor: 'var(--bg-main)' }}>
      <Sidebar
        unreadTicketsCount={unreadTicketsCount}
        displayUser={displayUser}
        isHidden={isSidebarHidden}
      />
      <MainContent style={{
        marginLeft: isSidebarHidden ? '0' : 'var(--sidebar-width, 16rem)',
        width: isSidebarHidden ? '100%' : 'calc(100% - var(--sidebar-width, 16rem))',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        {/* Toggle Sidebar Button - Modern & Floating */}
        <button
          onClick={() => setIsSidebarHidden(!isSidebarHidden)}
          className={`fixed top-24 z-[100] p-2 bg-slate-800/80 backdrop-blur-xl border border-white/10 rounded-r-xl shadow-2xl transition-all duration-300 hover:bg-blue-600 group ${isSidebarHidden ? 'left-0' : 'left-64'}`}
          title={isSidebarHidden ? 'Mostrar barra lateral' : 'Ocultar barra lateral'}
          style={{
            left: isSidebarHidden ? '0' : '16rem',
            transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s'
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20" height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform duration-500 ${isSidebarHidden ? '' : 'rotate-180'}`}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
        {showNavbar && <Navbar />} {/* Renderizar el Navbar condicionalmente */}

        <Routes>
          <Route path="dashboard/*" element={<DashboardContent chartData={chartData} userBalances={userBalances} styles={styles} paymentsHistory={paymentsHistory} withdrawalsHistory={withdrawalsHistory} estimatedDailyUSD={estimatedDailyUSD} dashboardMaxWidth={dashboardMaxWidth} onDashboardWidthChange={handleUpdateDashboardWidth} isSidebarHidden={isSidebarHidden} />} />
          <Route path="contact-support/*" element={<ContactSupportContent onUnreadCountChange={handleUnreadCountChange} styles={styles} />} />
          <Route path="referrals/*" element={<ReferralsContent styles={styles} />} />
          <Route path="mining-portfolio/*" element={<TradingPortfolioContent userBalances={userBalances} />} /> {/* Nueva ruta para Portafolio de Trading */}
          {/* Rutas Unificadas de Billetera */}
          <Route path="my-wallet/*" element={<WalletHub />} />
          <Route path="withdrawals/*" element={<WalletHub />} />
          <Route path="deposits/*" element={<WalletHub />} />

          <Route path="p2p-marketplace/*" element={<P2P_MarketplacePage userBalances={userBalances} />} /> {/* Nueva ruta para el Mercado P2P */}
          <Route path="collective-fund/*" element={<CollectiveFundContent />} /> {/* Nueva ruta para Fondo Colectivo */}
          <Route path="bonus/*" element={<BonusContent styles={styles} />} /> {/* Nueva ruta para Bonos */}
          <Route path="updates/*" element={<UpdatesContent styles={styles} />} /> {/* Nueva ruta para Actualizaciones */}
          <Route path="plan-trading/*" element={<PlanTradingContent styles={styles} />} /> {/* Nueva ruta para Plan Trading */}
          <Route path="vip-chat/*" element={<VIPChatContent styles={styles} userBalances={userBalances} />} /> {/* Nueva ruta para Chat VIP */}
          <Route path="miners/*" element={<CopyTraderContent styles={styles} userBalances={userBalances} />} /> {/* Nueva ruta para el Panel de Copy Trader */}
          <Route path="exchange/*" element={<ExchangeContent />} /> {/* Nueva ruta para Exchange API */}
          <Route path="settings/*" element={<SettingsContent styles={styles} dashboardMaxWidth={dashboardMaxWidth} onDashboardWidthChange={handleUpdateDashboardWidth} userBalances={userBalances} />} />
          {/* Ruta por defecto */}
          <Route path="/*" element={<DashboardContent chartData={chartData} userBalances={userBalances} styles={styles} paymentsHistory={paymentsHistory} withdrawalsHistory={withdrawalsHistory} estimatedDailyUSD={estimatedDailyUSD} dashboardMaxWidth={dashboardMaxWidth} onDashboardWidthChange={handleUpdateDashboardWidth} isSidebarHidden={isSidebarHidden} />} />
        </Routes>
      </MainContent>
    </div>
  );
};

export default UserPanel;
