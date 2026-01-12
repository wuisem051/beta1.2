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
import WalletDisplay from '../components/WalletDisplay'; // Importar WalletDisplay
import TradingPortfolioContent from '../components/TradingPortfolioContent'; // Importar TradingPortfolioContent
import DepositContent from '../components/DepositContent'; // Importar DepositContent
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
import TradingViewWidget from '../components/TradingViewWidget';

// Componentes de las sub-secciones


const VIPChatContent = ({ styles, userBalances }) => {
  const { darkMode } = useContext(ThemeContext);
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('public'); // 'public' or 'private'
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef();

  const isVIP = useMemo(() => {
    // Dev bypass for agent testing
    if (window.location.hostname === 'localhost' && currentUser?.uid === 'agent-dev-uid') return true;

    if (!userBalances.vipStatus || userBalances.vipStatus === 'none') return false;
    if (!userBalances.vipExpiry) return false;
    const now = new Date();
    const expiry = userBalances.vipExpiry.toDate ? userBalances.vipExpiry.toDate() : new Date(userBalances.vipExpiry);
    return expiry > now;
  }, [userBalances, currentUser?.uid]);

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
      console.error(`Error fetching ${activeTab} chat:`, error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [isVIP, activeTab, currentUser.uid]);

  const lastTabRef = useRef(activeTab);

  useEffect(() => {
    // Solo hacemos scroll automático si NO estamos cambiando de pestaña
    // O si es la primera carga de datos
    if (lastTabRef.current === activeTab) {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      // Si cambiamos de pestaña, nos aseguramos de que el scroll esté arriba
      const scrollContainer = scrollRef.current?.parentElement;
      if (scrollContainer) {
        scrollContainer.scrollTop = 0;
      }
      lastTabRef.current = activeTab;
    }
  }, [messages, activeTab]);

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

  if (!isVIP) {
    return (
      <div className={styles.dashboardContent}>
        <h1 className={styles.mainContentTitle}>Chat Privado VIP</h1>
        <div className={styles.sectionCard} style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div className="flex flex-col items-center justify-center space-y-4 opacity-60">
            <img src={candadoIcon} alt="Lock" className="w-16 h-16" />
            <p className="text-xl font-bold" style={{ color: '#f1f5f9' }}>Acceso Restringido</p>
            <p className={styles.statTitle}>Adquiere Nuestra Tarifa Vip y Disfruta de tus financias. Desbloquea el chat exclusivo con administradores y otros miembros VIP.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.dashboardContent} style={{ height: 'calc(100vh - 120px)', maxWidth: '100%', padding: '0 1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2">
        <div>
          <h1 className={styles.mainContentTitle} style={{ marginBottom: '0.1rem', fontSize: '2rem' }}>Comunidad Elite VIP</h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Conexión directa con Traders Expertos y Soporte Privado</p>
        </div>

        <div className="flex bg-slate-900/60 backdrop-blur-xl p-1 rounded-2xl border border-white/5 shadow-2xl relative overflow-hidden group">
          <div className={`absolute top-0 bottom-0 w-1/2 bg-blue-600/20 backdrop-blur-md rounded-xl transition-transform duration-500 ease-out ${activeTab === 'private' ? 'translate-x-full' : 'translate-x-0'}`}></div>
          <button
            onClick={() => setActiveTab('public')}
            className={`relative z-10 px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'public' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Chat Público
          </button>
          <button
            onClick={() => setActiveTab('private')}
            className={`relative z-10 px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'private' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Soporte Admin
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col bg-[#020617]/40 backdrop-blur-3xl rounded-[3rem] border border-white/10 shadow-[0_48px_100px_-12px_rgba(0,0,0,0.7)] relative group">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-600/[0.02] to-transparent pointer-events-none"></div>

        <div className="flex-1 overflow-y-auto p-4 md:p-10 space-y-6 scrollbar-hide custom-scrollbar">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 animate-pulse">Sincronizando Hub Elite...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-20 h-20 bg-slate-900/50 rounded-3xl flex items-center justify-center text-3xl mb-4 border border-white/5">💬</div>
              <p className="text-slate-400 font-bold mb-1">Sin mensajes aún</p>
              <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Inicia la conversación en el Hub VIP</p>
            </div>
          ) : (
            <div className="flex flex-col gap-8 max-w-5xl mx-auto w-full">
              {messages.map((msg, index) => {
                const isMe = msg.userId === currentUser.uid || msg.senderId === currentUser.uid;
                const isAdmin = msg.role === 'admin';

                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group/msg animate-in slide-in-from-bottom-2 duration-300`} style={{ animationDelay: `${index * 50}ms` }}>
                    <div className={`flex gap-4 max-w-[85%] md:max-w-[70%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                      {/* Avatar */}
                      <div className="flex-shrink-0 mt-auto mb-1">
                        <div className={`w-10 h-10 rounded-2xl overflow-hidden border-2 transition-all duration-300 ${isAdmin ? 'border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : isMe ? 'border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'border-white/10'}`}>
                          {msg.userAvatar ? (
                            <img src={msg.userAvatar} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <div className={`w-full h-full flex items-center justify-center text-xs font-black text-white ${isAdmin ? 'bg-gradient-to-tr from-amber-600 to-yellow-400' : 'bg-slate-800'}`}>
                              {msg.userName ? msg.userName[0].toUpperCase() : '?'}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        {showAvatar && (
                          <span className="text-[10px] mb-2 px-1 font-black uppercase tracking-[0.1em] flex items-center gap-1.5" style={{ color: msg.isAdmin ? '#3b82f6' : '#eab308' }}>
                            {msg.isAdmin && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>}
                            {msg.isAdmin ? 'TEAM TRADER ELITE' : (msg.displayName || msg.username)}
                          </span>
                        )}
                        <div className={`relative px-4 py-3 rounded-[1.5rem] text-sm font-medium leading-relaxed transition-all shadow-xl group-hover:shadow-2xl ${isMe
                          ? 'bg-gradient-to-r from-accent to-yellow-600 text-white rounded-tr-none'
                          : msg.isAdmin
                            ? 'bg-blue-600/90 backdrop-blur-md text-white rounded-tl-none border border-blue-400/30'
                            : 'bg-white/5 backdrop-blur-md text-slate-100 rounded-tl-none border border-white/10'
                          }`}>
                          {msg.text}
                          {/* Subtle time hover effect */}
                          <div className={`absolute -bottom-5 ${isMe ? 'right-0' : 'left-0'} opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-[9px] text-slate-500 font-bold whitespace-nowrap`}>
                            {msg.createdAt?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
          }
          <div ref={scrollRef} />
        </div>

        <div className="p-6 bg-slate-900/50 backdrop-blur-2xl border-t border-white/5">
          <form onSubmit={handleSendMessage} className="relative group">
            <input
              type="text"
              className="w-full bg-slate-950 border border-slate-700/50 rounded-2xl pl-6 pr-16 py-4 text-white font-medium focus:ring-4 focus:ring-accent/20 focus:border-accent outline-none transition-all placeholder:text-slate-600 shadow-inner group-hover:border-slate-500/50"
              placeholder={activeTab === 'public' ? "Comparte tu visión con la comunidad..." : "Escribe un mensaje privado al equipo de soporte..."}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
            />
            <button
              type="submit"
              className="absolute right-2 top-2 bottom-2 aspect-square bg-accent hover:bg-yellow-500 text-white flex items-center justify-center rounded-xl transition-all active:scale-95 shadow-lg shadow-accent/20"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="rotate-45 -translate-y-0.5 -translate-x-0.5">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polyline points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </form>
          <div className="mt-3 flex justify-between items-center px-2">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span> Conexión Segura de Grado Elite
            </p>
            <p className="text-[10px] text-slate-400 font-medium">Presiona Enter para enviar</p>
          </div>
        </div>
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
      <h1 className={styles.mainContentTitle}>Señales de Trading</h1>
      <p className={styles.statTitle} style={{ marginBottom: '2rem' }}>Sigue nuestras operaciones en tiempo real. Sección exclusiva para miembros VIP.</p>

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
              {signals.map(signal => (
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

const DashboardContent = ({ chartData, userBalances, styles, paymentsHistory, withdrawalsHistory, estimatedDailyUSD }) => {
  const { darkMode } = useContext(ThemeContext);

  const vipStatusLabel = useMemo(() => {
    const status = userBalances.vipStatus || 'none';
    if (status === 'none') return 'Sin Plan';
    return status.charAt(0).toUpperCase() + status.slice(1);
  }, [userBalances.vipStatus]);

  const lastTransactionInfo = useMemo(() => {
    const lastPayment = paymentsHistory.length > 0 ? paymentsHistory[0] : null;
    const lastWithdrawal = withdrawalsHistory.length > 0 ? withdrawalsHistory[0] : null;

    if (lastPayment && lastWithdrawal) {
      return lastPayment.createdAt > lastWithdrawal.createdAt
        ? `Recibido: ${lastPayment.amount.toFixed(8)} ${lastPayment.currency}`
        : `Retiro: ${lastWithdrawal.amount.toFixed(8)} ${lastWithdrawal.currency}`;
    } else if (lastPayment) {
      return `Recibido: ${lastPayment.amount.toFixed(8)} ${lastPayment.currency}`;
    } else if (lastWithdrawal) {
      return `Retiro: ${lastWithdrawal.amount.toFixed(8)} ${lastWithdrawal.currency}`;
    }
    return "Sin actividad";
  }, [paymentsHistory, withdrawalsHistory]);

  return (
    <div className={styles.dashboardContent}>
      <div className={styles.statsGrid}>
        {/* Miembro VIP */}
        <div className={styles.statCard}>
          <div className={styles.statIconBlue}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>
          </div>
          <h3 className={styles.statTitle}>Nivel de Cuenta</h3>
          <p className={styles.statValueBlue}>{vipStatusLabel}</p>
        </div>
        {/* Rendimiento Estimado */}
        <div className={styles.statCard}>
          <div className={styles.statIconGreen}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
          </div>
          <h3 className={styles.statTitle}>Retorno Estimado</h3>
          <p className={styles.statValueGreen}>${estimatedDailyUSD.toFixed(2)}</p>
        </div>
        {/* Señales Recientes */}
        <div className={styles.statCard}>
          <div className={styles.statIconAccent}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>
          </div>
          <h3 className={styles.statTitle}>Señales de Trading</h3>
          <p className={styles.statValueAccent}>Activas</p>
        </div>
      </div>

      {/* TradingView Charts */}
      <div className={styles.tradingViewGrid}>
        <div className={styles.tradingViewCard}>
          <h3 className={styles.statsTitle}>Gráfico BTC/USDT</h3>
          <div className={styles.tradingViewContainer}>
            <TradingViewWidget symbol="BTCUSDT" theme={darkMode ? "dark" : "light"} interval="15" />
          </div>
        </div>
        <div className={styles.tradingViewCard}>
          <h3 className={styles.statsTitle}>Gráfico ARPA/USDT</h3>
          <div className={styles.tradingViewContainer}>
            <TradingViewWidget symbol="ARPAUSDT" theme={darkMode ? "dark" : "light"} interval="15" />
          </div>
        </div>
      </div>

      <div className={styles.chartAndStatsGrid}>
        {/* Rendimiento Histórico */}
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Rendimiento de Mercado</h3>
          <div className={styles.chartContainer}>
            <Bar
              data={chartData}
              options={{
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    backgroundColor: darkMode ? '#1e293b' : '#ffffff',
                    titleColor: darkMode ? '#f1f5f9' : '#0f172a',
                    bodyColor: darkMode ? '#f1f5f9' : '#0f172a',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                  }
                },
                scales: {
                  y: { grid: { color: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' } },
                  x: { grid: { display: false } }
                }
              }}
            />
          </div>
        </div>

        {/* Estado de Cuenta */}
        <div className={styles.statsCard}>
          <h3 className={styles.statsTitle}>Estado de Cuenta</h3>
          <div className={styles.statsList}>
            <div className={styles.statsItem}>
              <span>Balance USD:</span>
              <span className={styles.statsValueGreen}>${userBalances.balanceUSD.toFixed(2)}</span>
            </div>
            <div className={styles.statsItem}>
              <span>Último Movimiento:</span>
              <span className={styles.statsValueBlue}>{lastTransactionInfo}</span>
            </div>
            <div className={styles.statsItem} style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--dark-border)' }}>
              <span>Cuenta Verificada</span>
              <span style={{ color: 'var(--green-check)' }}>Sí</span>
            </div>
            {userBalances.vipStatus !== 'none' && (
              <div className={styles.statsItem} style={{ borderTop: '1px solid var(--dark-border)', paddingTop: '1rem', marginTop: '1rem' }}>
                <span className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="var(--accent)" stroke="var(--accent)" strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                  Beneficios VIP:
                </span>
                <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>Activos</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


const PaymentsContent = ({ currentUser, styles }) => {
  const { darkMode } = useContext(ThemeContext);
  const { showError } = useError();
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

    return () => unsubscribe();
  }, [currentUser, showError]);

  return (
    <div className={styles.dashboardContent}>
      <h1 className={styles.mainContentTitle}>Historial de Pagos</h1>

      <div className={styles.sectionCard}>
        <h2 className={styles.sectionTitle}>Pagos Recibidos</h2>
        {paymentsHistory.length === 0 ? (
          <p className={styles.noDataText}>No hay pagos registrados.</p>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.tableHeader}>Fecha</th>
                  <th className={styles.tableHeader}>Cantidad</th>
                  <th className={styles.tableHeader}>Moneda</th>
                  <th className={styles.tableHeader}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {paymentsHistory.map((payment) => (
                  <tr key={payment.id}>
                    <td className={styles.tableCell}>
                      {payment.createdAt.toLocaleDateString()}
                    </td>
                    <td className={styles.tableCell} style={{ fontWeight: '700' }}>
                      {payment.amount.toFixed(8)} {payment.currency}
                    </td>
                    <td className={styles.tableCell}>
                      {payment.currency}
                    </td>
                    <td className={styles.tableCell}>
                      <span className={`${styles.statusBadge} ${payment.status === 'Pendiente' ? styles.statusPending :
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
  const { darkMode } = useContext(ThemeContext);
  const { showError, showSuccess } = useError();
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
    balanceVES: 0,
    balanceUSDTTRC20: 0,
    balanceTRX: 0,
  });
  const [withdrawalsHistory, setWithdrawalsHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState('');

  const withdrawOptions = [
    { value: 'BTC', label: 'Bitcoin (BTC)', icon: '₿', network: 'Bitcoin' },
    { value: 'USDTTRC20', label: 'USDT (TRC20)', icon: '💵', network: 'Tron (TRC20)' },
    { value: 'TRX', label: 'Tron (TRX)', icon: '🔴', network: 'Tron' },
    { value: 'LTC', label: 'Litecoin (LTC)', icon: '⚡', network: 'Litecoin' },
    { value: 'DOGE', label: 'Dogecoin (DOGE)', icon: '🐕', network: 'Dogecoin' },
    { value: 'USD', label: 'Dólares (USD)', icon: '🇺🇸', network: 'Binance Pay' },
    { value: 'VES', label: 'Bolívares (VES)', icon: '🇻🇪', network: 'Pago Móvil' }
  ];

  useEffect(() => {
    const balanceKey = `balance${currency}`;
    setAvailableBalance(userBalances[balanceKey] || 0);

    const savedAddressForCurrency = userPaymentAddresses[currency];

    if (selectedAddress === 'new') {
      setWalletAddress('');
      setBinanceId('');
      setUseBinancePay(currency === 'USD');
    } else if (savedAddressForCurrency && selectedAddress === savedAddressForCurrency) {
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

      const userDocRef = doc(db, 'users', currentUser.uid);
      const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const userData = docSnap.data();
          setUserBalances({
            balanceUSD: userData.balanceUSD || 0,
            balanceBTC: userData.balanceBTC || 0,
            balanceLTC: userData.balanceLTC || 0,
            balanceDOGE: userData.balanceDOGE || 0,
            balanceVES: userData.balanceVES || 0,
            balanceUSDTTRC20: userData.balanceUSDTTRC20 || 0,
            balanceTRX: userData.balanceTRX || 0,
          });
        }
      });

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
      });

      return () => {
        unsubscribeUser();
        unsubscribeWithdrawals();
      };
    };

    fetchWithdrawalData();
  }, [currentUser, showError]);

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
      addressOrId = selectedAddress;
      method = (currency === 'USD' && useBinancePay) ? 'Binance Pay' : 'Wallet';
    } else {
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

      const balanceKey = `balance${currency}`;
      const newBalance = currentBalanceForCurrency - withdrawalAmount;

      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, { [balanceKey]: newBalance });

      showSuccess('Solicitud de retiro enviada exitosamente.');
      setAmount('');
    } catch (err) {
      showError(`Fallo al enviar el retiro: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.dashboardContent}>
      <h1 className={styles.mainContentTitle}>Retiros de Fondos</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Formulario de Retiro */}
        <div className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>Solicitar Retiro</h2>

          <form onSubmit={handleSubmitWithdrawal} className="space-y-6">
            {/* Paso 1: Selección de Moneda */}
            <div className="mb-6">
              <label className={styles.formLabel}>Paso 1: Selecciona la Moneda</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {withdrawOptions.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setCurrency(option.value)}
                    className={`${styles.coinSelector} ${currency === option.value ? styles.coinSelectorActive : ''}`}
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-xl">{option.icon}</span>
                      <p className="font-bold text-white text-[10px] leading-tight">{option.label}</p>
                      <p className="text-[9px] text-slate-400">{option.network}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-blue-600/5 p-5 rounded-2xl border border-blue-500/20">
              <p className="text-sm font-bold text-blue-400 mb-4 flex items-center gap-2">
                <span>Paso 2: Detalles del Retiro</span>
                <span className="text-xs bg-blue-500/20 px-2 py-0.5 rounded-full">{currency}</span>
              </p>

              <div className="space-y-4">
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Cantidad a Retirar</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      step="any"
                      className={`${styles.formInput} ${darkMode ? styles.darkInput : styles.lightInput} !text-xl font-bold`}
                      placeholder="0.00"
                      required
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                      {currency}
                    </div>
                  </div>
                  <div className="flex justify-between mt-2 px-1">
                    <span className="text-[10px] text-slate-400">Disponible:</span>
                    <span className="text-[10px] font-bold text-green-400">
                      {availableBalance.toFixed((currency === 'USD' || currency === 'USDTTRC20') ? 2 : 8)} {currency}
                    </span>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Destino de los Fondos</label>
                  <select
                    value={selectedAddress}
                    onChange={(e) => setSelectedAddress(e.target.value)}
                    className={`${styles.formInput} ${darkMode ? styles.darkInput : styles.lightInput}`}
                  >
                    {userPaymentAddresses[currency] && (
                      <option value={userPaymentAddresses[currency]}>
                        {userPaymentAddresses[currency]} (Guardada)
                      </option>
                    )}
                    <option value="new">Ingresar nuevos datos</option>
                  </select>
                </div>

                {selectedAddress === 'new' && (
                  <div className="space-y-4 mt-2 p-4 bg-black/20 rounded-xl border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        checked={useBinancePay}
                        onChange={(e) => setUseBinancePay(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-600"
                        id="binance-pay-check"
                      />
                      <label htmlFor="binance-pay-check" className="text-sm text-slate-300 cursor-pointer">Usar Binance Pay / ID</label>
                    </div>

                    {!useBinancePay ? (
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Dirección de Wallet</label>
                        <input
                          type="text"
                          value={walletAddress}
                          onChange={(e) => setWalletAddress(e.target.value)}
                          className={`${styles.formInput} ${darkMode ? styles.darkInput : styles.lightInput} font-mono text-sm`}
                          placeholder="bc1q... / TL..."
                        />
                      </div>
                    ) : (
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Email o ID de Binance</label>
                        <input
                          type="text"
                          value={binanceId}
                          onChange={(e) => setBinanceId(e.target.value)}
                          className={`${styles.formInput} ${darkMode ? styles.darkInput : styles.lightInput} text-sm`}
                          placeholder="ejemplo@binance.com / 123456"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              className={`${styles.submitButton} !py-4 !text-lg shadow-lg shadow-blue-500/20 transition-transform active:scale-95`}
              disabled={isLoading}
            >
              {isLoading ? 'Procesando...' : '📤 Confirmar Solicitud de Retiro'}
            </button>
          </form>
        </div>

        {/* Historial de Retiros */}
        <div className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>Historial de Retiros</h2>
          {withdrawalsHistory.length === 0 ? (
            <p className={styles.noDataText}>No has realizado solicitudes de retiro aún.</p>
          ) : (
            <div className="space-y-3">
              {withdrawalsHistory.map((w) => (
                <div key={w.id} className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-white text-sm">
                        {w.amount.toFixed((w.currency === 'USD' || w.currency === 'USDTTRC20') ? 2 : 8)} {w.currency}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <p className="text-[10px] text-slate-500">{w.createdAt.toLocaleString()}</p>
                      <p className="text-[9px] text-slate-400 font-mono truncate max-w-[150px]">{w.addressOrId}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`${styles.statusBadge} !text-[10px] px-2 py-1 rounded-lg border`}
                      style={
                        w.status === 'Pendiente'
                          ? { background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.2)' }
                          : w.status === 'Completado' || w.status === 'Aprobado'
                            ? { background: 'rgba(16, 185, 129, 0.1)', color: 'var(--green-check)', borderColor: 'rgba(16, 185, 129, 0.2)' }
                            : { background: 'rgba(239, 68, 68, 0.1)', color: 'var(--red-error)', borderColor: 'rgba(239, 68, 68, 0.2)' }
                      }
                    >
                      {w.status}
                    </span>
                  </div>
                </div>
              ))}
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
        const newConversation = [...selectedTicket.conversation, { // Corregido: eliminar el conflicto aquí
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
                className={`${styles.ticketListItem} ${selectedTicket && selectedTicket.id === ticket.id
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
                  <span className={`${styles.messageBubble} ${msg.sender === 'admin' ? styles.adminBubble : (darkMode ? styles.darkUserBubble : styles.lightUserBubble)
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
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [profilePhotoFile, setProfilePhotoFile] = useState(null);
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
        {/* Perfil Público */}
        <div className={`${styles.sectionCard} ${darkMode ? styles.dark : styles.light}`}>
          <h2 className={styles.sectionTitle}>Perfil Público</h2>
          <form onSubmit={handleUpdateProfile}>
            <div className="flex flex-col items-center mb-6">
              <div className="relative group cursor-pointer" onClick={() => document.getElementById('profile-photo-input').click()}>
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-accent/20 bg-slate-800 flex items-center justify-center">
                  {profilePhotoUrl ? (
                    <img src={profilePhotoUrl} alt="Perfil" className="w-full h-full object-cover" />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                  )}
                </div>
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                </div>
              </div>
              <input
                type="file"
                id="profile-photo-input"
                hidden
                accept=".png,.gif,image/png,image/gif"
                onChange={(e) => setProfilePhotoFile(e.target.files[0])}
              />
              <p className="text-[10px] text-slate-500 mt-2">Formatos permitidos: .png, .gif</p>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="username" className={styles.formLabel}>Nombre de Usuario (@)</label>
              <input
                type="text"
                id="username"
                className={`${styles.formInput} ${darkMode ? styles.darkInput : styles.lightInput}`}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ej: juan_perez"
                disabled={isLoading}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="displayName" className={styles.formLabel}>Nombre de Visualización</label>
              <input
                type="text"
                id="displayName"
                className={`${styles.formInput} ${darkMode ? styles.darkInput : styles.lightInput}`}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Tu nombre real o alias"
                disabled={isLoading}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="bio" className={styles.formLabel}>Descripción / Biografía</label>
              <textarea
                id="bio"
                className={`${styles.formInput} ${darkMode ? styles.darkInput : styles.lightInput}`}
                style={{ height: '80px', paddingTop: '10px' }}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Cuéntanos un poco sobre ti..."
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={isLoading}
            >
              {isLoading ? 'Guardando...' : 'Guardar Perfil'}
            </button>
          </form>
        </div>
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
                onChange={() => { }} // No permitir cambios
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
                onChange={() => { }} // No permitir cambios
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

  const showNavbar = [
    '/user/miners',      // Ruta para "Señales Trading"
    '/user/plan-trading', // Ruta para "Plan Trading"
    '/user/vip-chat',     // Ruta para "Chat VIP"
  ].some(path => location.pathname.startsWith(path));

  return (
    <div className={styles.userPanelContainer} style={{ backgroundColor: 'var(--bg-main)' }}>
      <Sidebar
        unreadTicketsCount={unreadTicketsCount}
        displayUser={displayUser}
      />
      <MainContent>
        {showNavbar && <Navbar />} {/* Renderizar el Navbar condicionalmente */}

        <Routes>
          <Route path="dashboard/*" element={<DashboardContent chartData={chartData} userBalances={userBalances} styles={styles} paymentsHistory={paymentsHistory} withdrawalsHistory={withdrawalsHistory} estimatedDailyUSD={estimatedDailyUSD} />} />
          <Route path="withdrawals/*" element={<WithdrawalsContent minPaymentThresholds={minPaymentThresholds} userPaymentAddresses={userPaymentAddresses} styles={styles} />} />
          <Route path="contact-support/*" element={<ContactSupportContent onUnreadCountChange={handleUnreadCountChange} styles={styles} />} />
          <Route path="referrals/*" element={<ReferralsContent styles={styles} />} />
          <Route path="mining-portfolio/*" element={<TradingPortfolioContent />} /> {/* Nueva ruta para Portafolio de Trading */}
          <Route path="my-wallet/*" element={<WalletDisplay currentUser={currentUser} />} /> {/* Nueva ruta para Mi Billetera */}
          <Route path="deposits/*" element={<DepositContent />} /> {/* Nueva ruta para Depósitos */}
          <Route path="p2p-marketplace/*" element={<P2P_MarketplacePage userBalances={userBalances} />} /> {/* Nueva ruta para el Mercado P2P */}
          <Route path="collective-fund/*" element={<CollectiveFundContent />} /> {/* Nueva ruta para Fondo Colectivo */}
          <Route path="bonus/*" element={<BonusContent styles={styles} />} /> {/* Nueva ruta para Bonos */}
          <Route path="plan-trading/*" element={<PlanTradingContent styles={styles} />} /> {/* Nueva ruta para Plan Trading */}
          <Route path="vip-chat/*" element={<VIPChatContent styles={styles} userBalances={userBalances} />} /> {/* Nueva ruta para Chat VIP */}
          <Route path="miners/*" element={<CopyTraderContent styles={styles} userBalances={userBalances} />} /> {/* Nueva ruta para el Panel de Copy Trader */}
          <Route path="settings/*" element={<SettingsContent styles={styles} />} />
          {/* Ruta por defecto */}
          <Route path="/*" element={<DashboardContent chartData={chartData} userBalances={userBalances} styles={styles} paymentsHistory={paymentsHistory} withdrawalsHistory={withdrawalsHistory} estimatedDailyUSD={estimatedDailyUSD} />} />
        </Routes>
      </MainContent>
    </div>
  );
};

export default UserPanel;
