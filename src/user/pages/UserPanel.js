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
import { FaHistory } from 'react-icons/fa';

import UpdatesContent from '../components/UpdatesContent';

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
            <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
              {messages.map((msg, index) => {
                const isMe = msg.userId === currentUser.uid || msg.senderId === currentUser.uid;
                const isAdmin = msg.role === 'admin';
                const showAvatar = index === 0 || messages[index - 1].userId !== msg.userId;

                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group/msg animate-in slide-in-from-bottom-2 duration-300`} style={{ animationDelay: `${index * 50}ms` }}>
                    <div className={`flex gap-4 max-w-[85%] md:max-w-[70%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                      {/* Avatar */}
                      <div className="flex-shrink-0 mt-auto mb-1">
                        {showAvatar ? (
                          <div className={`w-10 h-10 rounded-2xl overflow-hidden border-2 transition-all duration-300 ${isAdmin ? 'border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : isMe ? 'border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'border-white/10'}`}>
                            {msg.userAvatar ? (
                              <img src={msg.userAvatar} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                              <div className={`w-full h-full flex items-center justify-center text-xs font-black text-white ${isAdmin ? 'bg-gradient-to-tr from-amber-600 to-yellow-400' : 'bg-slate-800'}`}>
                                {msg.userName ? msg.userName[0].toUpperCase() : '?'}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="w-10" />
                        )}
                      </div>

                      <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        {/* Header del mensaje (Solo si es el primer mensaje del bloque) */}
                        {showAvatar && (
                          <div className={`flex items-center gap-2 mb-1.5 px-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                            <span className={`text-[10px] font-black uppercase tracking-widest ${isAdmin ? 'text-amber-500' : isMe ? 'text-blue-400' : 'text-slate-400'}`}>
                              {isAdmin ? '🛡️ TEAM TRADER ELITE' : msg.userName || 'Usuario VIP'}
                            </span>
                            <span className="text-[8px] text-slate-600 font-bold">{msg.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        )}

                        {/* Burbuja */}
                        <div className={`relative px-6 py-4 rounded-[1.8rem] shadow-2xl transition-all duration-300 ${isAdmin
                          ? 'bg-gradient-to-br from-amber-500/20 to-amber-600/10 text-white border border-amber-500/30 backdrop-blur-xl'
                          : isMe
                            ? 'bg-blue-600 text-white border-t border-white/20'
                            : 'bg-slate-900/80 backdrop-blur-md text-slate-200 border border-white/5'
                          } ${isMe ? 'rounded-br-none' : 'rounded-bl-none'}`}>
                          <p className="text-sm leading-relaxed font-medium whitespace-pre-wrap">{msg.text}</p>

                          {/* Glow effect for hover */}
                          <div className={`absolute inset-0 rounded-[1.8rem] transition-opacity duration-300 opacity-0 group-hover/msg:opacity-100 pointer-events-none ${isAdmin ? 'shadow-[0_0_30px_rgba(245,158,11,0.2)]' : isMe ? 'shadow-[0_0_30px_rgba(59,130,246,0.3)]' : 'shadow-[0_0_30px_rgba(255,255,255,0.05)]'}`}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={scrollRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-8 bg-slate-950/80 backdrop-blur-3xl border-t border-white/5">
          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-end gap-4">
            <div className="flex-1 relative group">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                placeholder={activeTab === 'public' ? "Escribe a la comunidad elite..." : "Consulta con un especialista elite..."}
                className="w-full bg-slate-900/50 border border-white/10 rounded-[1.5rem] px-8 py-5 pr-16 text-sm text-white focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all resize-none min-h-[60px] max-h-[150px] shadow-inner"
                rows="1"
                style={{ height: 'auto' }}
              />
              <div className="absolute right-4 bottom-4">
                <span className={`text-[8px] font-black uppercase tracking-tighter ${newMessage.length > 250 ? 'text-amber-500' : 'text-slate-600'}`}>
                  {newMessage.length} / 300
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={!newMessage.trim() || isLoading}
              className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 transform active:scale-90 ${newMessage.trim() ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/30' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current rotate-45 transform -translate-y-0.5 translate-x-0.5">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </form>
          <div className="mt-4 flex justify-center">
            <p className="text-[8px] text-slate-500 font-black uppercase tracking-[0.3em] flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              HUB CIFRADO DE PUNTA A PUNTA
            </p>
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
    if (userBalances.vipStatus !== 'active' || !userBalances.vipExpiry) {
      return false;
    }
    const now = new Date();
    const expiry = userBalances.vipExpiry.toDate ? userBalances.vipExpiry.toDate() : new Date(userBalances.vipExpiry);
    return expiry > now;
  }, [userBalances.vipStatus, userBalances.vipExpiry]);

  const [signals, setSignals] = useState([]);
  const [isLoadingSignals, setIsLoadingSignals] = useState(false);
  const [totalProfit, setTotalProfit] = useState(0);

  // Fetch Trading History and Arbitrage Earnings for Total Profit
  useEffect(() => {
    if (!currentUser?.uid) return;

    let unsubscribeTrading = () => { };
    let unsubscribeArbitrage = () => { };

    const arbitrageQuery = query(
      collection(db, 'userArbitragePools'),
      where('userId', '==', currentUser.uid)
    );

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

    return () => {
      unsubscribeTrading();
      unsubscribeArbitrage();
    };
  }, [currentUser, isVIP]);

  // Fetch signals logic
  useEffect(() => {
    setIsLoadingSignals(true);
    const q = query(collection(db, 'tradingSignals'), orderBy('createdAt', 'desc'), limit(3));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedSignals = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
      })).filter(s => s.status !== 'Exitosa' && s.status !== 'Finalizada');
      setSignals(fetchedSignals);
      setIsLoadingSignals(false);
    }, (err) => {
      console.error("Error fetching signals for dashboard:", err);
      setIsLoadingSignals(false);
    });
    return () => unsubscribe();
  }, []);

  const vipStatusLabel = useMemo(() => {
    const status = userBalances.vipStatus || 'none';
    if (status === 'none') return 'Usuario habitual';
    if (userBalances.vipPlanName) return `VIP-${userBalances.vipPlanName}`;
    return status.charAt(0).toUpperCase() + status.slice(1);
  }, [userBalances.vipStatus, userBalances.vipPlanName]);

  return (
    <div
      className={styles.dashboardContent}
      style={{
        maxWidth: isSidebarHidden ? '98%' : `${dashboardMaxWidth}px`,
        margin: '0 auto',
        padding: '2rem 1rem'
      }}
    >
      {/* Profile Header */}
      <div className="flex flex-col md:flex-row items-center gap-6 mb-8 p-6 bg-[#1e2329] rounded-2xl border border-white/5">
        <div className="w-20 h-20 rounded-full bg-[#fcd535] flex items-center justify-center overflow-hidden border-4 border-[#2b3139]">
          {userBalances.profilePhotoUrl ? (
            <img src={userBalances.profilePhotoUrl} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#1e2329" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
          )}
        </div>
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-xl font-bold text-white mb-1">{userBalances.displayName || userBalances.username || currentUser?.email}</h2>
          <div className="flex flex-wrap justify-center md:justify-start gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1">UID: <span className="text-white">{currentUser?.uid?.substring(0, 8)}</span></span>
            <span className="flex items-center gap-1">Nivel VIP: <span className="text-[#fcd535]">{vipStatusLabel}</span></span>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="text-center">
            <p className="text-[10px] text-slate-500 uppercase font-black mb-1">Siguiendo</p>
            <p className="text-lg font-bold text-white">3</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-slate-500 uppercase font-black mb-1">Seguidores</p>
            <p className="text-lg font-bold text-white">28</p>
          </div>
        </div>
      </div>

      {/* Balance Card Section */}
      <div className="bg-[#1e2329] p-8 rounded-2xl border border-white/5 mb-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-slate-400">Balance estimado</span>
              <button onClick={() => setShowBalance(!showBalance)} className="text-slate-500 hover:text-white transition-colors">
                {showBalance ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                )}
              </button>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white">
                {showBalance ? (userBalances.balanceUSD + (parseFloat(userBalances.balanceBTC) * 100000 || 0)).toLocaleString() : '******'}
              </span>
              <span className="text-lg font-bold text-slate-400">USDT <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="inline ml-1"><polyline points="6 9 12 15 18 9"></polyline></svg></span>
            </div>
            <p className="text-sm text-slate-500 mt-1">≈ {showBalance ? (userBalances.balanceUSD + (parseFloat(userBalances.balanceBTC) * 100000 || 0)).toFixed(2) : '******'} $</p>
            <div className="flex items-center gap-2 mt-4">
              <span className="text-xs text-slate-400">PnL de hoy</span>
              <span className={`text-xs font-bold ${totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(2)} $({((totalProfit / Math.max(1, userBalances.balanceUSD)) * 100).toFixed(2)}%)
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate('/user/deposits')} className="px-4 py-2 bg-[#2b3139] hover:bg-[#363d47] text-white text-xs font-bold rounded-lg transition-colors">Depositar</button>
            <button onClick={() => navigate('/user/withdrawals')} className="px-4 py-2 bg-[#2b3139] hover:bg-[#363d47] text-white text-xs font-bold rounded-lg transition-colors">Retirar</button>
            <button onClick={() => navigate('/user/exchange')} className="px-4 py-2 bg-[#2b3139] hover:bg-[#363d47] text-white text-xs font-bold rounded-lg transition-colors">Efectivo</button>
          </div>
        </div>

        {/* Mini Chart Mockup using SVG to emulate the line in image */}
        <div className="h-20 w-full mt-8 flex items-end opacity-50">
          <svg className="w-full h-full" viewBox="0 0 400 100" preserveAspectRatio="none">
            <path d="M0 80 Q 50 70, 100 85 T 200 60 T 300 90 T 400 40" fill="none" stroke="#fcd535" strokeWidth="2" />
            <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#fcd535" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#fcd535" stopOpacity="0" />
            </linearGradient>
            <path d="M0 80 Q 50 70, 100 85 T 200 60 T 300 90 T 400 40 L 400 100 L 0 100 Z" fill="url(#chartGradient)" />
          </svg>
        </div>
      </div>

      {/* Markets Section */}
      <div className="bg-[#1e2329] p-6 rounded-2xl border border-white/5">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-white">Mercados</h3>
          <button onClick={() => navigate('/user/miners')} className="text-xs text-slate-400 hover:text-[#fcd535] transition-colors flex items-center gap-1">
            Más <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>

        {/* Tabs mockup */}
        <div className="flex gap-6 border-b border-white/5 mb-6 overflow-x-auto no-scrollbar">
          <button className="pb-4 text-sm font-bold text-[#fcd535] border-b-2 border-[#fcd535] whitespace-nowrap">Holding</button>
          <button className="pb-4 text-sm font-bold text-slate-500 hover:text-white transition-colors whitespace-nowrap">Populares</button>
          <button className="pb-4 text-sm font-bold text-slate-500 hover:text-white transition-colors whitespace-nowrap">Nueva inclusión</button>
          <button className="pb-4 text-sm font-bold text-slate-500 hover:text-white transition-colors whitespace-nowrap">Favoritos</button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-4 text-[10px] text-slate-500 font-bold uppercase tracking-wider px-2">
            <span>Moneda</span>
            <span className="text-right">Importe</span>
            <span className="text-right">Precio</span>
            <span className="text-right">Cambio 24h</span>
          </div>

          {isLoadingSignals ? (
            <div className="text-center py-8 text-slate-500">Cargando mercados...</div>
          ) : signals.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No hay activos activos.</div>
          ) : (
            signals.map(signal => (
              <div key={signal.id} className="grid grid-cols-4 items-center p-3 hover:bg-white/5 rounded-xl transition-colors cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-[10px] text-[#fcd535]">
                    {signal.asset.substring(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{signal.asset}</p>
                    <p className="text-[10px] text-slate-500">USDT</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-white">{signal.maxInvestment || '0.00'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-white">{signal.entryPrice}</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-bold ${signal.type === 'Compra' ? 'text-green-500' : 'text-red-500'}`}>
                    {signal.type === 'Compra' ? '+' : '-'}{calculateProfitPercentage(signal.type, signal.entryPrice, signal.takeProfit)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};


// PaymentsContent and WithdrawalsContent were removed and unified into WalletHub.jsx

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
    <div className={`${styles.settingsContent} max-w-6xl mx-auto`}>
      <header className="mb-8">
        <h1 className={styles.pageTitle}>Panel de Configuración</h1>
        <p className="text-slate-400 text-sm mt-1">Gestiona tu identidad, seguridad y preferencias visuales.</p>
      </header>

      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingText}>Procesando...</div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Modern Sidebar Tabs */}
        <aside className="w-full lg:w-64 flex flex-row lg:flex-col gap-2 p-1 bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-2xl lg:sticky lg:top-4 z-10 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 whitespace-nowrap group ${activeTab === tab.id
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20 shadow-lg shadow-blue-600/5'
                : 'text-slate-500 hover:bg-white/5 hover:text-slate-300 border border-transparent'
                }`}
            >
              <span className={`transition-transform duration-300 ${activeTab === tab.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                {tab.icon}
              </span>
              <span className="text-xs font-bold uppercase tracking-wider">{tab.label}</span>
            </button>
          ))}
        </aside>

        {/* Tab Content Area */}
        <div className="flex-1 w-full min-h-[600px] animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeTab === 'profile' && (
            <div className={`${styles.sectionCard} ${darkMode ? styles.dark : styles.light} !m-0 !w-full border-white/5 bg-slate-900/20`}>
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 rounded-2xl bg-blue-600/10 text-blue-500">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                </div>
                <div>
                  <h2 className={styles.sectionTitle} style={{ margin: 0 }}>Perfil Público</h2>
                  <p className="text-xs text-slate-500 mt-1">Cómo te ven otros miembros de la plataforma.</p>
                </div>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="flex flex-col items-center p-8 bg-slate-900/40 rounded-3xl border border-white/5 mb-8">
                  <div className="relative group cursor-pointer" onClick={() => document.getElementById('profile-photo-input').click()}>
                    <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-blue-500/20 bg-slate-800 flex items-center justify-center shadow-2xl transition-transform group-hover:scale-105">
                      {profilePhotoUrl ? (
                        <img src={profilePhotoUrl} alt="Perfil" className="w-full h-full object-cover" />
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                      )}
                    </div>
                    <div className="absolute inset-0 bg-blue-600/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm">
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
                  <div className="mt-4 text-center">
                    <p className="text-xs font-bold text-slate-300">Subir Propio</p>
                    <p className="text-[10px] text-slate-500 mt-1">Formatos: .png, .gif</p>
                  </div>
                </div>

                <div className="bg-slate-900/40 p-6 rounded-3xl border border-white/5 mb-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-purple-600/10 text-purple-400">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" /></svg>
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-white">Paquete de Avatares Premium</h3>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                    {availableAvatars.map((avatar) => (
                      <button
                        key={avatar.id}
                        type="button"
                        onClick={() => handleSelectAvatar(avatar.url)}
                        className={`group relative aspect-square rounded-2xl overflow-hidden border-2 transition-all duration-300 ${profilePhotoUrl === avatar.url
                          ? 'border-blue-500 shadow-lg shadow-blue-600/20 scale-105'
                          : 'border-white/5 hover:border-white/20 hover:scale-105'
                          }`}
                        title={avatar.label}
                      >
                        <img src={avatar.url} alt={avatar.label} className="w-full h-full object-cover" />
                        {profilePhotoUrl === avatar.url && (
                          <div className="absolute inset-0 bg-blue-600/20 flex items-center justify-center">
                            <div className="bg-blue-600 rounded-full p-1 shadow-lg">
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                            </div>
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-slate-900/80 backdrop-blur-sm py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-[8px] font-black text-white uppercase text-center truncate px-1">{avatar.label}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className={styles.formGroup}>
                    <label htmlFor="username" className={styles.formLabel}>Nombre de Usuario (@)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">@</span>
                      <input
                        type="text"
                        id="username"
                        className={`${styles.formInput} ${darkMode ? styles.darkInput : styles.lightInput} !pl-10 !bg-slate-900/20 !border-white/5 focus:!border-blue-500/50 transition-all`}
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="ej: juan_perez"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="displayName" className={styles.formLabel}>Nombre de Visualización</label>
                    <input
                      type="text"
                      id="displayName"
                      className={`${styles.formInput} ${darkMode ? styles.darkInput : styles.lightInput} !bg-slate-900/20 !border-white/5 focus:!border-blue-500/50 transition-all`}
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Tu nombre real o alias"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="bio" className={styles.formLabel}>Biografía</label>
                  <textarea
                    id="bio"
                    className={`${styles.formInput} ${darkMode ? styles.darkInput : styles.lightInput} !bg-slate-900/20 !border-white/5 focus:!border-blue-500/50 transition-all min-h-[120px] pt-4`}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Cuéntanos un poco sobre ti..."
                    disabled={isLoading}
                  />
                </div>

                <button
                  type="submit"
                  className={`${styles.submitButton} !w-full !py-4 !rounded-2xl !bg-blue-600 hover:!bg-blue-500 !shadow-xl !shadow-blue-600/20 !border-none !text-xs !font-black !uppercase !tracking-widest transition-all active:scale-95`}
                  disabled={isLoading}
                >
                  {isLoading ? 'Actualizando...' : 'Guardar Cambios de Perfil'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'account' && (
            <div className={`${styles.sectionCard} ${darkMode ? styles.dark : styles.light} !m-0 !w-full border-white/5 bg-slate-900/20`}>
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 rounded-2xl bg-amber-600/10 text-amber-500">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                </div>
                <div>
                  <h2 className={styles.sectionTitle} style={{ margin: 0 }}>Seguridad y Cuenta</h2>
                  <p className="text-xs text-slate-500 mt-1">Protege tu cuenta y gestiona tus credenciales.</p>
                </div>
              </div>

              <form onSubmit={handleUpdateAccount} className="space-y-8">
                <div className="space-y-6">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-white/5 pb-2">Información de Acceso</h3>
                  <div className={styles.formGroup}>
                    <label htmlFor="contact-email" className={styles.formLabel}>Email de Contacto</label>
                    <input
                      type="email"
                      id="contact-email"
                      className={`${styles.formInput} ${darkMode ? styles.darkInput : styles.lightInput} !bg-slate-900/20 !border-white/5`}
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-white/5 pb-2">Cambiar Contraseña</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className={styles.formGroup}>
                      <label htmlFor="current-password" className={styles.formLabel}>Contraseña Actual</label>
                      <input
                        type="password"
                        id="current-password"
                        className={`${styles.formInput} ${darkMode ? styles.darkInput : styles.lightInput} !bg-slate-900/20 !border-white/5`}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Requerido para cambios"
                        disabled={isLoading}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor="new-password" className={styles.formLabel}>Nueva Contraseña</label>
                      <input
                        type="password"
                        id="new-password"
                        className={`${styles.formInput} ${darkMode ? styles.darkInput : styles.lightInput} !bg-slate-900/20 !border-white/5`}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Dejar vacío para no cambiar"
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-white/5 pb-2">Seguridad Avanzada</h3>
                  <div className="flex items-center justify-between p-6 bg-slate-900/40 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-200 uppercase tracking-wide">Autenticación 2FA</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Añade una capa extra de seguridad.</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-[9px] font-black text-amber-500/80 bg-amber-500/10 px-2 py-0.5 rounded-full uppercase">En Desarrollo</span>
                      <button
                        type="button"
                        onClick={handleToggleTwoFactorAuth}
                        className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all ${twoFactorAuthEnabled
                          ? 'bg-red-500/20 text-red-400 border border-red-500/10'
                          : 'bg-blue-600/20 text-blue-400 border border-blue-500/10'
                          } opacity-50 cursor-not-allowed`}
                        disabled={true}
                      >
                        {twoFactorAuthEnabled ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className={`${styles.submitButton} !w-full !py-4 !rounded-2xl !bg-slate-100 !text-slate-900 hover:!bg-white !shadow-xl !shadow-white/5 !border-none !text-xs !font-black !uppercase !tracking-widest transition-all active:scale-95`}
                  disabled={isLoading}
                >
                  {isLoading ? 'Actualizando...' : 'Actualizar Configuración de Cuenta'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className={`${styles.sectionCard} ${darkMode ? styles.dark : styles.light} !m-0 !w-full border-white/5 bg-slate-900/20`}>
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 rounded-2xl bg-emerald-600/10 text-emerald-500">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>
                </div>
                <div>
                  <h2 className={styles.sectionTitle} style={{ margin: 0 }}>Pagos y Billeteras</h2>
                  <p className="text-xs text-slate-500 mt-1">Donde recibirás tus ganancias y retiros.</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(paymentAddresses).map(([currency, address]) => (
                    <div key={currency} className="p-6 bg-slate-900/40 rounded-2xl border border-white/5 hover:border-blue-500/20 transition-all group">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-300 border border-white/5">
                            {currency}
                          </div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dirección {currency}</p>
                        </div>
                      </div>
                      <input
                        type="text"
                        className={`${styles.formInput} ${darkMode ? styles.darkInput : styles.lightInput} !bg-slate-900/40 !border-white/5 !text-xs !py-3 !px-4 focus:!border-blue-500/30`}
                        value={address}
                        onChange={(e) => handlePaymentAddressChange(currency, e.target.value)}
                        placeholder={`Ingresa tu wallet de ${currency}`}
                        disabled={isLoading}
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-8 p-6 bg-blue-600/5 rounded-2xl border border-blue-500/10 flex items-start gap-4">
                  <div className="text-blue-500 mt-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                  </div>
                  <p className="text-[10px] text-slate-400 italic">
                    Asegúrate de que las direcciones sean correctas. No nos hacemos responsables por fondos enviados a billeteras erróneas proporcionadas por el usuario.
                  </p>
                </div>

                <button
                  onClick={handleSaveAddresses}
                  className={`${styles.submitButton} !w-full !py-4 !rounded-2xl !bg-emerald-600 hover:!bg-emerald-500 !shadow-xl !shadow-emerald-600/20 !border-none !text-xs !font-black !uppercase !tracking-widest transition-all active:scale-95 mt-4`}
                  disabled={isLoading}
                >
                  {isLoading ? 'Guardando...' : 'Guardar Direcciones de Pago'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className={`${styles.sectionCard} ${darkMode ? styles.dark : styles.light} !m-0 !w-full border-white/5 bg-slate-900/20`}>
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 rounded-2xl bg-indigo-600/10 text-indigo-500">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" /></svg>
                </div>
                <div>
                  <h2 className={styles.sectionTitle} style={{ margin: 0 }}>Personalización Visual</h2>
                  <p className="text-xs text-slate-500 mt-1">Ajusta cómo se ve tu Dashboard de trading.</p>
                </div>
              </div>



              {/* Ancho Máximo Dashboard */}
              <div className="col-span-1 md:col-span-2 p-8 bg-slate-900/40 rounded-3xl border border-white/5">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ancho Máximo del Panel</p>
                    <p className="text-xl font-black text-indigo-400 mt-1">{localDashboardWidth}px</p>
                  </div>
                  <div className="px-3 py-1 bg-indigo-600/10 rounded-full border border-indigo-500/20">
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter">
                      {localDashboardWidth > 1920 ? 'Ultra Wide' : localDashboardWidth > 1400 ? 'Cinema' : 'Standard'}
                    </span>
                  </div>
                </div>
                <input
                  type="range"
                  min="800"
                  max="2560"
                  step="20"
                  value={localDashboardWidth}
                  onChange={(e) => setLocalDashboardWidth(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between mt-4">
                  <span className="text-[9px] font-bold text-slate-600 uppercase">Compacto</span>
                  <span className="text-[9px] font-bold text-slate-600 uppercase">Máximo (2.5K)</span>
                </div>
              </div>


              <div className="mt-8">
                <button
                  onClick={handleUpdateAccount} // Reusing account update logic as it includes preferences
                  className={`${styles.submitButton} !w-full !py-4 !rounded-2xl !bg-indigo-600 hover:!bg-indigo-500 !shadow-xl !shadow-indigo-600/20 !border-none !text-xs !font-black !uppercase !tracking-widest transition-all active:scale-95`}
                  disabled={isLoading}
                >
                  {isLoading ? 'Guardando...' : 'Aplicar Preferencias de Visualización'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className={`${styles.sectionCard} ${darkMode ? styles.dark : styles.light} !m-0 !w-full border-white/5 bg-slate-900/20`}>
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 rounded-2xl bg-rose-600/10 text-rose-500">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                </div>
                <div>
                  <h2 className={styles.sectionTitle} style={{ margin: 0 }}>Notificaciones</h2>
                  <p className="text-xs text-slate-500 mt-1">Cómo quieres mantenerte informado.</p>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { id: 'pay_notify', label: 'Notificaciones de Pagos', desc: 'Recibe un aviso por cada depósito o retiro procesado.', state: receivePaymentNotifications, setter: setReceivePaymentNotifications },
                  { id: 'login_notify', label: 'Alertas de Inicio de Sesión', desc: 'Te avisamos cuando alguien accede a tu cuenta.', state: receiveLoginAlerts, setter: setReceiveLoginAlerts },
                  { id: 'signals_notify', label: 'Nuevas Señales de Trading', desc: 'No te pierdas ninguna oportunidad de inversión.', state: receiveSignalsNotifications, setter: setReceiveSignalsNotifications, locked: !isVIP },
                ].map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-6 bg-slate-900/40 rounded-3xl border border-white/5 group hover:border-white/10 transition-all">
                    <div className="flex-1 pr-8">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-xs font-bold text-slate-200 uppercase tracking-wide">{item.label}</p>
                        {item.locked && <span className="text-[8px] font-black text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded uppercase">PRO / VIP</span>}
                      </div>
                      <p className="text-[10px] text-slate-500">{item.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={item.state}
                        onChange={() => !item.locked && item.setter(!item.state)}
                        disabled={item.locked || isLoading}
                      />
                      <div className="w-12 h-6 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-slate-500 peer-checked:after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-20 transition-all"></div>
                    </label>
                  </div>
                ))}

                <div className="mt-8">
                  <button
                    onClick={handleSaveNotifications}
                    className={`${styles.submitButton} !w-full !py-4 !rounded-2xl !bg-rose-600 hover:!bg-rose-500 !shadow-xl !shadow-rose-600/20 !border-none !text-xs !font-black !uppercase !tracking-widest transition-all active:scale-95`}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Guardando...' : 'Guardar Preferencias de Notificación'}
                  </button>
                </div>
              </div>
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
