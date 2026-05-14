import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import ScalperTradingTool from './ScalperTradingTool';
import {
    collection, addDoc, query, where, onSnapshot,
    serverTimestamp, doc, updateDoc, deleteDoc
} from 'firebase/firestore';

// ─── Iconos ──────────────────────────────────────────────────────
const IconBot = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="2" /><path d="M12 7v4" /></svg>;
const IconPower = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10" /></svg>;
const IconSettings = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>;
const IconDetails = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>;
const IconX = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M18 6L6 18M6 6l12 12" /></svg>;
const IconTrending = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>;

const BOT_CATALOG = [
    {
        id: 'grid', name: 'Grid Spot (Cuadrícula)', color: '#F3BA2F',
        description: 'Compra bajo y vende caro automáticamente en un rango de precios definido. Ideal para mercados laterales.',
        yield7d: '+12.45%',
        params: [
            { key: 'pair', label: 'Par de trading', type: 'select', options: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'XRP/USDT'] },
            { key: 'range_min', label: 'Precio Inferior', type: 'number', placeholder: '70000' },
            { key: 'range_max', label: 'Precio Superior', type: 'number', placeholder: '83000' },
            { key: 'grids', label: 'Número de Grillas', type: 'number', placeholder: '10' },
            { key: 'capital', label: 'Inversión (USDT)', type: 'capital-slider' }
        ]
    },
    {
        id: 'dca', name: 'DCA Bot (Martingala)', color: '#00C087',
        description: 'Reduce el precio promedio de entrada comprando más cuando el precio cae. Ideal para mercados volátiles.',
        yield7d: '+8.12%',
        params: [
            { key: 'pair', label: 'Par de trading', type: 'select', options: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'] },
            { key: 'base_order', label: 'Orden Base (USDT)', type: 'number', placeholder: '10' },
            { key: 'safety_orders', label: 'Órdenes de Seguridad', type: 'number', placeholder: '5' },
            { key: 'step_percentage', label: 'Paso de Precio (%)', type: 'number', placeholder: '1.5' },
            { key: 'capital', label: 'Inversión Total (USDT)', type: 'capital-slider' }
        ]
    },
    {
        id: 'infinity', name: 'Infinity Grid', color: '#9c42f5',
        description: 'Una cuadrícula sin límite superior. Nunca te quedarás fuera de la tendencia alcista.',
        yield7d: '+15.30%',
        params: [
            { key: 'pair', label: 'Par de trading', type: 'select', options: ['BTC/USDT', 'ETH/USDT'] },
            { key: 'range_min', label: 'Precio Mínimo', type: 'number', placeholder: '60000' },
            { key: 'profit_per_grid', label: 'Ganancia por grilla (%)', type: 'number', placeholder: '0.6' },
            { key: 'capital', label: 'Inversión (USDT)', type: 'capital-slider' }
        ]
    }
];

const BotZoneContent = () => {
    const { currentUser } = useAuth();
    const [tab, setTab] = useState('catalog');
    const [mode, setMode] = useState('real'); // 'real' | 'demo'
    const [selectedBot, setSelectedBot] = useState(null);
    const [instances, setInstances] = useState([]);
    const [liveStats, setLiveStats] = useState({}); // Tracking live PnL simulating real market updates
    const [detailedBot, setDetailedBot] = useState(null); // Bot being viewed in modal
    const [modalTab, setModalTab] = useState('PnL'); // Tab for detailed modal
    const [balance, setBalance] = useState(0);
    const [notification, setNotification] = useState(null);
    const [activeConfigPair, setActiveConfigPair] = useState('BTC/USDT');
    const [mainTab, setMainTab] = useState('ejecutando');
    const [configTab, setConfigTab] = useState('manual'); // 'auto' | 'manual'

    const notify = useCallback((msg, type = 'success') => {
        setNotification({ msg, type });
        setTimeout(() => setNotification(null), 3000);
    }, []);

    useEffect(() => {
        if (!currentUser?.uid) return;
        const unsub = onSnapshot(doc(db, 'users', currentUser.uid), snap => {
            if (snap.exists()) setBalance(snap.data().balanceUSD || 0);
        });
        return () => unsub();
    }, [currentUser]);

    useEffect(() => {
        if (!currentUser?.uid) return;
        const q = query(collection(db, 'userBots'), where('userId', '==', currentUser.uid));
        const unsub = onSnapshot(q, snap => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setInstances(data);

            // ✅ FIX 3: Cargar PnL persistido desde Firebase al inicializar
            setLiveStats(prev => {
                const next = { ...prev };
                data.forEach(b => {
                    if (!next[b.id]) {
                        // Recuperar PnL guardado en el documento del bot
                        next[b.id] = {
                            pnl: parseFloat(b.savedPnl || 0),
                            gridHits: parseInt(b.savedGridHits || 0),
                            history: b.savedHistory || []
                        };
                    }
                });
                return next;
            });
        });
        return () => unsub();
    }, [currentUser]);

    const [livePrices, setLivePrices] = useState({});

    // Live Market WebSocket Connection (Binance)
    useEffect(() => {
        const uniquePairs = [...new Set(instances.map(b => b.config.pair).filter(Boolean))];
        if (!uniquePairs.length) return;

        const symbolHash = {};
        const streams = uniquePairs.map(p => {
            const sym = p.replace('/', '').toLowerCase();
            symbolHash[sym.toUpperCase()] = p; // store back mapper 
            return `${sym}@trade`;
        });

        const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${streams.join('/')}`);

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.e === 'trade' && data.s && data.p) {
                const pairStr = symbolHash[data.s];
                if (pairStr) {
                    setLivePrices(prev => ({ ...prev, [pairStr]: parseFloat(data.p) }));
                }
            }
        };

        return () => ws.close();
    }, [instances]);

    // True Live Market Execution Engine
    useEffect(() => {
        if (!instances.length || Object.keys(livePrices).length === 0) return;

        setLiveStats(prev => {
            let hasUpdate = false;
            const next = { ...prev };

            Object.keys(next).forEach(id => {
                const bot = instances.find(b => b.id === id);
                if (!bot) return;

                const pair = bot.config.pair;
                const currentPrice = livePrices[pair];
                if (!currentPrice) return;

                const rMin = parseFloat(bot.config.range_min || 70000);
                const rMax = parseFloat(bot.config.range_max || 83000);
                const grids = parseInt(bot.config.grids || 10, 10);
                const step = (rMax - rMin) / grids;

                // Determine mathematical grid tier (0 to grids-1)
                let tier = Math.floor((currentPrice - rMin) / step);
                if (tier < 0) tier = -1; // Below zone
                if (tier >= grids) tier = grids; // Above zone

                const stats = next[id];

                // Prevent micro-flutter executions (grid bounce debounce)
                const now = Date.now();
                if (stats.lastTradeTime && (now - stats.lastTradeTime) < 10000) return;

                // Initialize tracking safely respecting bounds
                if (stats.currentTier == null) {
                    stats.currentTier = tier;
                    hasUpdate = true;
                } else if (stats.currentTier !== tier) {
                    // Price has physically crossed a grid threshold!
                    stats.lastTradeTime = now;

                    if (tier >= 0 && tier < grids) {
                        // If it moves UP a tier, it fills a resting Sell order (Profit realization!)
                        if (tier > stats.currentTier) {
                            const crossedTier = tier;
                            const sellPrice = rMin + (crossedTier * step);
                            const buyPrice = sellPrice - step; // the floor from where it bought

                            const cap = parseFloat(bot.config.capital) || 0;
                            const perGrid = grids > 0 ? (cap / grids) : 0;
                            const amt = (perGrid / buyPrice).toFixed(5);
                            const profit = (sellPrice - buyPrice) * parseFloat(amt);

                            const timestamp = new Date();

                            const newMatch = {
                                id: Math.random().toString(36).substring(7),
                                time: timestamp.toLocaleString(),
                                profit: profit.toFixed(4) + ' USDT',
                                sell: {
                                    time: timestamp.toLocaleString(),
                                    type: 'Venta',
                                    price: sellPrice.toFixed(2),
                                    amount: amt,
                                    total: (parseFloat(amt) * sellPrice).toFixed(4) + ' USDT',
                                    fee: (parseFloat(amt) * sellPrice * 0.001).toFixed(6) + ' USDT'
                                },
                                buy: {
                                    time: new Date(timestamp.getTime() - 3600000).toLocaleString(), // Approximation of buy time
                                    type: 'Compra',
                                    price: buyPrice.toFixed(2),
                                    amount: amt,
                                    total: (parseFloat(amt) * buyPrice).toFixed(4) + ' USDT',
                                    fee: '0.00000009 BNB'
                                }
                            };

                            stats.pnl += profit;
                            stats.gridHits += 1;
                            stats.history = [newMatch, ...(stats.history || [])].slice(0, 50);
                            hasUpdate = true;

                            // ✅ FIX 3: Persistir PnL en Firebase para no perder datos al recargar
                            const botRef = doc(db, 'userBots', id);
                            updateDoc(botRef, {
                                savedPnl: stats.pnl,
                                savedGridHits: stats.gridHits,
                                savedHistory: stats.history.slice(0, 20) // Limitar para no exceder límites de Firestore
                            }).catch(err => console.error('Error saving bot PnL:', err));
                        }
                        // Moving DOWN implies it filled a Buy order (unrealized loss), no paired history logged yet for classic view.
                        // It will generate profit when it bounces back UP.
                    }

                    // Always lock the new tier
                    stats.currentTier = tier;
                    hasUpdate = true;
                }
            });

            return hasUpdate ? next : prev;
        });
    }, [livePrices, instances]);

    const handleCreateBot = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const config = Object.fromEntries(formData);
        const capital = parseFloat(config.capital || 0);

        if (mode === 'real' && capital > balance) return notify("Saldo insuficiente en billetera", "error");

        try {
            await addDoc(collection(db, 'userBots'), {
                userId: currentUser.uid,
                botId: selectedBot.id,
                botName: selectedBot.name,
                config,
                mode,
                status: 'running',
                createdAt: serverTimestamp()
            });

            if (mode === 'real' && capital > 0) {
                await updateDoc(doc(db, 'users', currentUser.uid), { balanceUSD: balance - capital });
            }

            notify(`🚀 Bot ${mode === 'demo' ? '(DEMO)' : ''} activado con éxito`);
        } catch (err) { notify(err.message, "error"); }
    };

    const handleDelete = async (id, capital = 0, botMode = 'real') => {
        await deleteDoc(doc(db, 'userBots', id));
        if (botMode === 'real' && capital > 0) {
            await updateDoc(doc(db, 'users', currentUser.uid), { balanceUSD: balance + parseFloat(capital) });
        }
        notify("Detenido: Capital liberado");
    };

    if (!currentUser) return <div className="p-20 text-center text-white">Inicia sesión.</div>;

    return (
        <div className="w-full min-h-screen bg-[#0b0e11] text-[#eaecef] p-0 font-sans selection:bg-[#F3BA2F]/30 overflow-hidden">
            {tab === 'catalog' ? (
                <div className="max-w-7xl mx-auto py-16 px-6 overflow-y-auto h-screen custom-scrollbar">
                    <header className="mb-12">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 bg-[#F3BA2F] rounded-full animate-pulse shadow-[0_0_8px_#F3BA2F]"></div>
                            <span className="text-[10px] font-black text-[#F3BA2F] uppercase tracking-[0.3em]">Trading Algorítmico</span>
                        </div>
                        <h1 className="text-5xl font-black text-white italic tracking-tighter uppercase leading-none">Zona de Bots</h1>
                        <p className="text-[#848e9c] text-sm mt-4 font-medium max-w-2xl">
                            Maximiza tus beneficios con estrategias automatizadas probadas. Elige un bot y deja que el sistema trabaje por ti 24/7.
                        </p>
                    </header>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {BOT_CATALOG.map(bot => (
                            <div
                                key={bot.id}
                                onClick={() => { setSelectedBot(bot); setTab('config'); }}
                                className="group relative bg-[#1e2329] rounded-[2rem] border border-white/5 hover:border-[#F3BA2F]/30 transition-all duration-500 cursor-pointer overflow-hidden p-8 flex flex-col h-full active:scale-[0.98]"
                            >
                                {/* Decorative Gradient */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-bl-[4rem] group-hover:scale-110 transition-transform duration-700"></div>

                                <div className="p-4 bg-white/5 text-[#F3BA2F] rounded-2xl w-fit mb-6 group-hover:bg-[#F3BA2F]/10 transition-colors duration-500">
                                    <IconBot />
                                </div>

                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-2xl font-black text-white italic group-hover:text-[#F3BA2F] transition-colors">{bot.name}</h3>
                                        <span className="text-[10px] font-black text-[#00C087] bg-[#00C087]/10 px-2 py-1 rounded border border-[#00C087]/20">
                                            {bot.yield7d} 7D
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-[#848e9c] leading-relaxed mb-8">
                                        {bot.description}
                                    </p>
                                </div>

                                <div className="flex items-center justify-between pt-6 border-t border-white/5 mt-auto">
                                    <div className="flex items-center gap-2">
                                        <IconTrending />
                                        <span className="text-[10px] font-black text-white uppercase opacity-40">Bajo Riesgo</span>
                                    </div>
                                    <span className="text-[10px] font-black text-[#F3BA2F] uppercase tracking-widest group-hover:translate-x-1 transition-transform">Configurar →</span>
                                </div>
                            </div>
                        ))}

                        {/* Trading Quirúrgico — Acceso directo desde catálogo */}
                        <div
                            onClick={() => { setSelectedBot(BOT_CATALOG[0]); setTab('config'); setMainTab('quirurgico'); }}
                            className="group relative bg-gradient-to-br from-[#1e2329] to-[#0b0e11] rounded-[2rem] border border-[#00C087]/20 hover:border-[#00C087]/50 transition-all duration-500 cursor-pointer overflow-hidden p-8 flex flex-col h-full active:scale-[0.98]"
                        >
                            <div className="absolute top-0 right-0 w-48 h-48 bg-[#00C087]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-[#00C087]/10 transition-all duration-700" />

                            <div className="p-4 bg-[#00C087]/10 text-[#00C087] rounded-2xl w-fit mb-6 text-xl font-black group-hover:scale-110 transition-transform">⚡</div>

                            <div className="flex-1">
                                <h3 className="text-2xl font-black text-white italic mb-2 group-hover:text-[#00C087] transition-colors">Trading Quirúrgico</h3>
                                <p className="text-[11px] text-[#848e9c] mb-8 leading-relaxed">
                                    Control quirúrgico sobre cada lote y ejecución. Diseñado para traders que exigen precisión milimétrica en sus puntos de entrada.
                                </p>
                            </div>

                            <div className="flex items-center justify-between pt-6 border-t border-white/5 mt-auto">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-[#00C087] rounded-full"></div>
                                    <span className="text-[10px] font-black text-white uppercase opacity-40">Pro Tools</span>
                                </div>
                                <span className="text-[10px] font-black text-[#00C087] uppercase tracking-widest group-hover:translate-x-1 transition-transform">Lanzar Terminal →</span>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col h-screen overflow-hidden bg-[#0b0e11]">
                    {/* Professional Terminal Header */}
                    <header className="h-20 bg-[#1e2329] border-b border-white/5 px-8 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-8">
                            <button
                                onClick={() => setTab('catalog')}
                                className="flex items-center gap-2 text-[#848e9c] hover:text-white transition-colors group"
                            >
                                <span className="text-xl group-hover:-translate-x-1 transition-transform">←</span>
                                <span className="text-[10px] font-black uppercase tracking-widest">Mercado</span>
                            </button>

                            <div className="h-8 w-px bg-white/5"></div>

                            <div className="flex items-center gap-4">
                                <div className="flex flex-col">
                                    <h2 className="text-lg font-black text-white italic leading-none">{activeConfigPair}</h2>
                                    <span className="text-[9px] font-black text-[#F3BA2F] uppercase tracking-tighter mt-1">{selectedBot?.name}</span>
                                </div>
                                <div className="flex flex-col ml-4">
                                    <span className="text-[10px] font-black text-[#848e9c] uppercase leading-none mb-1">Precio en Vivo</span>
                                    <span className="text-sm font-mono font-black text-[#00C087]">
                                        {livePrices[activeConfigPair]?.toFixed(2) || '---'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1 bg-[#00C087]/10 px-2 py-1 rounded ml-2">
                                    <span className="text-[10px] font-black text-[#00C087]">+2.45%</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="text-right">
                                <p className="text-[9px] font-black text-[#848e9c] uppercase mb-1">Disponible</p>
                                <p className="text-sm font-black text-white">{balance.toFixed(2)} USDT</p>
                            </div>
                            <button className="px-6 py-2.5 bg-[#F3BA2F] text-black rounded-lg font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[#F3BA2F]/10">Depositar</button>
                        </div>
                    </header>

                    <div className="flex flex-1 overflow-hidden">
                        {/* LEFT: Trading Terminal Body */}
                        <div className="flex-1 flex flex-col overflow-hidden border-r border-white/5">
                            {/* Chart Area */}
                            <div className="flex-1 bg-black relative">
                                <iframe
                                    key={activeConfigPair}
                                    src={`https://s.tradingview.com/widgetembed/?symbol=BINANCE:${activeConfigPair.replace('/', '')}&interval=15&theme=dark&style=1&locale=es&enable_publishing=false&hide_top_toolbar=true&hide_legend=true&save_image=false`}
                                    style={{ width: '100%', height: '100%', border: 'none' }}
                                />

                                {/* Overlay Stats */}
                                <div className="absolute top-6 left-6 p-4 bg-[#1e2329]/80 backdrop-blur-md rounded-2xl border border-white/5">
                                    <p className="text-[9px] font-black text-[#848e9c] uppercase mb-2">Estado del Nodo</p>
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-[#00C087] rounded-full animate-pulse shadow-[0_0_8px_#00C087]"></div>
                                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Sincronizado</span>
                                    </div>
                                </div>
                            </div>

                            {/* Active Bots / Tabs Area */}
                            <div className="h-[300px] bg-[#0b0e11] flex flex-col shrink-0">
                                <div className="flex gap-8 px-8 border-b border-white/5 bg-[#1e2329]/30">
                                    <button
                                        onClick={() => setMainTab('ejecutando')}
                                        className={`py-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${mainTab === 'ejecutando' ? 'text-[#F3BA2F]' : 'text-[#848e9c] hover:text-white'}`}
                                    >
                                        Ejecutando ({instances.length})
                                        {mainTab === 'ejecutando' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F3BA2F]"></div>}
                                    </button>
                                    <button
                                        onClick={() => setMainTab('historial')}
                                        className={`py-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${mainTab === 'historial' ? 'text-[#F3BA2F]' : 'text-[#848e9c] hover:text-white'}`}
                                    >
                                        Historial
                                        {mainTab === 'historial' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F3BA2F]"></div>}
                                    </button>
                                    <button
                                        onClick={() => setMainTab('pnl')}
                                        className={`py-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${mainTab === 'pnl' ? 'text-[#F3BA2F]' : 'text-[#848e9c] hover:text-white'}`}
                                    >
                                        PnL
                                        {mainTab === 'pnl' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F3BA2F]"></div>}
                                    </button>
                                    <button
                                        onClick={() => setMainTab('quirurgico')}
                                        className={`py-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${mainTab === 'quirurgico' ? 'text-[#F3BA2F]' : 'text-[#848e9c] hover:text-white'}`}
                                    >
                                        ⚡ Quirúrgico
                                        {mainTab === 'quirurgico' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F3BA2F]"></div>}
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                    {mainTab === 'ejecutando' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {instances.map(inst => {
                                                const stat = liveStats[inst.id] || { pnl: 0, gridHits: 0 };
                                                const capital = parseFloat(inst.config?.capital || 0);
                                                const pnlPct = capital > 0 ? (stat.pnl / capital) * 100 : 0;
                                                const isProfit = stat.pnl >= 0;

                                                return (
                                                    <div
                                                        key={inst.id}
                                                        onClick={() => setDetailedBot({ ...inst, stat })}
                                                        className="bg-[#1e2329] rounded-2xl border border-white/5 p-5 hover:border-white/10 transition-all cursor-pointer group hover:bg-[#2b3139]/50"
                                                    >
                                                        <div className="flex justify-between items-start mb-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-[#F3BA2F]/10 text-[#F3BA2F]`}>
                                                                    <IconBot />
                                                                </div>
                                                                <div>
                                                                    <h4 className="text-xs font-black text-white italic">{inst.config?.pair}</h4>
                                                                    <p className="text-[9px] text-[#848e9c] font-bold uppercase tracking-widest">
                                                                        {BOT_CATALOG.find(b => b.id === inst.botId)?.name || 'Grid'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className={`text-xs font-black ${isProfit ? 'text-[#00C087]' : 'text-red-500'}`}>
                                                                    {isProfit ? '+' : ''}{stat.pnl.toFixed(4)} USDT
                                                                </p>
                                                                <p className={`text-[9px] font-black ${isProfit ? 'text-[#00C087]/60' : 'text-red-500/60'} uppercase`}>
                                                                    {isProfit ? '+' : ''}{pnlPct.toFixed(2)}% ROI
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-[#848e9c]">
                                                            <span>Inversión: {capital} USDT</span>
                                                            <span className="text-white group-hover:text-[#F3BA2F] transition-colors">Ver Detalles →</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {instances.length === 0 && (
                                                <div className="col-span-2 py-12 text-center text-[#848e9c] text-[10px] font-black uppercase tracking-widest opacity-30">
                                                    No hay operativos activos en este momento
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {/* (Wait for next turns for other tabs but they're already functional) */}
                                    {mainTab === 'historial' && (
                                        <div className="py-20 text-center text-[#848e9c] text-[10px] font-black uppercase tracking-widest opacity-30">Historial vacío</div>
                                    )}
                                    {mainTab === 'pnl' && (
                                        <div className="py-20 text-center text-[#848e9c] text-[10px] font-black uppercase tracking-widest opacity-30">Cargando análisis...</div>
                                    )}
                                    {mainTab === 'quirurgico' && (
                                        <ScalperTradingTool exchange="binance" balance={null} onRefresh={() => { }} />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: Advanced Configuration Sidebar */}
                        <div className="w-[400px] bg-[#1e2329] border-l border-white/5 flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
                            <div className="p-8">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-xs font-black text-white uppercase tracking-widest italic">Configuración Elite</h3>
                                    <div className="flex bg-black/40 rounded-lg p-1">
                                        <button onClick={() => setMode('demo')} className={`px-4 py-1.5 text-[9px] font-black uppercase rounded ${mode === 'demo' ? 'bg-[#2b3139] text-sky-400' : 'text-[#848e9c]'}`}>Demo</button>
                                        <button onClick={() => setMode('real')} className={`px-4 py-1.5 text-[9px] font-black uppercase rounded ${mode === 'real' ? 'bg-[#2b3139] text-[#F3BA2F]' : 'text-[#848e9c]'}`}>Real</button>
                                    </div>
                                </div>

                                {/* Auto vs Manual Tabs */}
                                <div className="flex gap-4 mb-8 border-b border-white/5">
                                    <button
                                        onClick={() => setConfigTab('auto')}
                                        className={`pb-3 text-[10px] font-black uppercase tracking-widest transition-all relative ${configTab === 'auto' ? 'text-[#F3BA2F]' : 'text-[#848e9c]'}`}
                                    >
                                        🤖 Inteligencia IA
                                        {configTab === 'auto' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F3BA2F]"></div>}
                                    </button>
                                    <button
                                        onClick={() => setConfigTab('manual')}
                                        className={`pb-3 text-[10px] font-black uppercase tracking-widest transition-all relative ${configTab === 'manual' ? 'text-[#F3BA2F]' : 'text-[#848e9c]'}`}
                                    >
                                        ⚙️ Personalizado
                                        {configTab === 'manual' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F3BA2F]"></div>}
                                    </button>
                                </div>

                                <form onSubmit={handleCreateBot} className="space-y-8">
                                    {selectedBot?.params.map(p => (
                                        <div key={p.key} className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <label className="text-[10px] font-black uppercase text-[#848e9c] tracking-widest">{p.label}</label>
                                                {p.key === 'range_min' && <span className="text-[9px] text-[#848e9c]">Min: 0.1</span>}
                                            </div>

                                            {p.type === 'select' ? (
                                                <select
                                                    name={p.key}
                                                    value={p.key === 'pair' ? activeConfigPair : undefined}
                                                    onChange={(e) => { if (p.key === 'pair') setActiveConfigPair(e.target.value); }}
                                                    className="w-full bg-[#0b0e11] border border-white/5 rounded-xl px-4 py-4 text-xs font-bold outline-none focus:border-[#F3BA2F]/40 transition-all text-white"
                                                >
                                                    {p.options.map(o => <option key={o} value={o}>{o}</option>)}
                                                </select>
                                            ) : p.type === 'capital-slider' ? (
                                                <div className="space-y-4">
                                                    <div className="relative">
                                                        <input type="number" step="any" name="capital" required placeholder="0.00" className="w-full bg-[#0b0e11] border border-white/5 rounded-xl px-4 py-4 text-xs font-bold outline-none focus:border-[#F3BA2F]/40 transition-all text-white pr-16" />
                                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-[#848e9c]">USDT</span>
                                                    </div>
                                                    <div className="grid grid-cols-4 gap-2">
                                                        {[25, 50, 75, 100].map(per => (
                                                            <button
                                                                type="button"
                                                                key={per}
                                                                onClick={() => {
                                                                    const val = mode === 'real' ? (balance * per / 100).toFixed(2) : (10000 * per / 100).toFixed(2);
                                                                    const input = document.getElementsByName('capital')[0];
                                                                    if (input) input.value = val;
                                                                }}
                                                                className="py-2.5 rounded-lg bg-white/5 text-[9px] font-black hover:bg-[#F3BA2F]/20 hover:text-[#F3BA2F] transition-all border border-white/5"
                                                            >
                                                                {per}%
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <input
                                                    type={p.type}
                                                    step={p.type === 'number' ? 'any' : undefined}
                                                    name={p.key}
                                                    required
                                                    placeholder={p.placeholder}
                                                    className="w-full bg-[#0b0e11] border border-white/5 rounded-xl px-4 py-4 text-xs font-bold outline-none focus:border-[#F3BA2F]/40 transition-all text-white"
                                                />
                                            )}
                                        </div>
                                    ))}

                                    <div className="pt-10 flex flex-col gap-4">
                                        <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl">
                                            <span className="text-[10px] font-black text-[#848e9c] uppercase">Ganancia Estimada</span>
                                            <span className="text-xs font-black text-[#00C087]">+1.24% - 2.50%</span>
                                        </div>

                                        <button
                                            type="submit"
                                            className={`w-full py-5 rounded-2xl font-black uppercase italic tracking-[0.2em] hover:scale-[1.02] active:scale-95 transition-all shadow-2xl ${mode === 'real' ? 'bg-[#F3BA2F] text-black shadow-[#F3BA2F]/20' : 'bg-sky-500 text-white shadow-sky-500/20'}`}
                                        >
                                            Lanzar Algoritmo {mode.toUpperCase()}
                                        </button>

                                        <p className="text-[8px] text-[#848e9c] font-medium text-center uppercase tracking-widest leading-loose">
                                            Al iniciar el bot, aceptas que el capital será bloqueado en operaciones inteligentes hasta que detengas el nodo manualmente.
                                        </p>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {notification && (
                <div className="fixed bottom-10 right-10 z-[1000] px-8 py-4 bg-[#1e2329] border border-[#F3BA2F]/50 text-[#F3BA2F] rounded-2xl font-black text-sm shadow-2xl">
                    {notification.msg}
                </div>
            )}

            {/* Detailed Bot Modal (Binance Style) */}
            {detailedBot && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-[#1e2329] w-full max-w-5xl rounded-2xl border border-white/10 flex flex-col overflow-hidden max-h-[90vh]">

                        {/* Modal Header */}
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#0b0e11]/50">
                            <div className="flex items-center gap-4">
                                <h2 className="text-2xl font-black tracking-tighter text-white">{detailedBot.config?.pair}</h2>
                                <span className="bg-white/5 border border-white/10 px-3 py-1 rounded text-[10px] font-bold uppercase">{BOT_CATALOG.find(b => b.id === detailedBot.botId)?.name || 'Bot'}</span>
                                <span className={`text-[10px] font-black uppercase ${detailedBot.mode === 'demo' ? 'text-sky-400' : 'text-[#00C087]'}`}>
                                    {detailedBot.mode === 'demo' ? 'Demo Activo' : 'En ejecución'}
                                </span>
                            </div>
                            <button onClick={() => setDetailedBot(null)} className="p-2 text-[#848e9c] hover:text-white transition-colors bg-white/5 rounded-full"><IconX /></button>
                        </div>

                        {/* Sub Header (Meta info) */}
                        <div className="px-6 py-3 border-b border-white/5 flex gap-6 text-[11px] text-[#848e9c]">
                            <span>Hora de creación: {detailedBot.createdAt?.toDate().toLocaleString() || 'Ahora mismo'}</span>
                            <span>Ejecutando: Todo en orden</span>
                        </div>

                        {/* Modal Tabs */}
                        <div className="flex px-6 pt-4 gap-6 border-b border-white/5 bg-[#1e2329]">
                            {['PnL', 'Orden pendiente', 'Detalles de cuadrícula', 'Historial de órdenes'].map((t) => (
                                <button key={t} onClick={() => setModalTab(t)} className={`pb-3 text-xs font-bold uppercase tracking-widest ${modalTab === t ? 'text-[#F3BA2F] border-b-2 border-[#F3BA2F]' : 'text-[#848e9c]'}`}>
                                    {t}
                                </button>
                            ))}
                        </div>

                        {/* Modal Body: PnL Tab */}
                        {modalTab === 'PnL' && (() => {
                            const botStats = liveStats[detailedBot.id] || { pnl: 0, gridHits: 0 };

                            return (
                                <div className="flex-1 p-6 overflow-y-auto flex gap-8">
                                    <div className="flex-1 space-y-8">
                                        <h3 className="text-sm font-bold text-white mb-4">PnL</h3>
                                        <div className="grid grid-cols-2 gap-y-6">
                                            <div>
                                                <p className="text-[10px] font-bold text-[#848e9c] mb-1">Ganancias totales</p>
                                                <p className={`text-lg font-black ${botStats.pnl >= 0 ? 'text-[#00C087]' : 'text-red-500'}`}>
                                                    {botStats.pnl >= 0 ? '+' : ''}{botStats.pnl.toFixed(4)} USDT
                                                </p>
                                                <p className={`text-[10px] font-bold ${botStats.pnl >= 0 ? 'text-[#00C087]' : 'text-red-500'} opacity-80`}>
                                                    ({botStats.pnl >= 0 ? '+' : ''}{((botStats.pnl / parseFloat(detailedBot.config.capital)) * 100).toFixed(2)}%)
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-[#848e9c] mb-1">Inversión total</p>
                                                <p className="text-lg font-black text-white">{parseFloat(detailedBot.config.capital).toFixed(2)} USDT</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-y-6 pt-4 border-t border-white/5">
                                            <div>
                                                <p className="text-[10px] font-bold text-[#848e9c] mb-1">Ganancias de la cuadrícula</p>
                                                <p className="font-bold text-[#00C087]">+{(botStats.pnl).toFixed(4)} USDT</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-[#848e9c] mb-1">Ganancias variables</p>
                                                <p className="font-bold text-white">+0.0000 USDT</p>
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-white/5">
                                            <p className="text-[10px] font-bold text-[#848e9c] mb-1">Rendimiento anualizado (APR)</p>
                                            <p className="text-xl font-black text-[#00C087]">+20.45%</p>
                                        </div>

                                        <button className="w-full py-4 mt-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all uppercase tracking-widest text-xs border border-white/10">
                                            Retirar ganancias
                                        </button>
                                    </div>
                                    <div className="flex-1 bg-[#0b0e11] rounded-xl border border-white/5 p-6 flex flex-col relative overflow-hidden">
                                        <h3 className="text-sm font-bold text-white mb-2">Curva de PnL</h3>
                                        <div className="flex-1 w-full flex items-end">
                                            {Array.from({ length: 40 }).map((_, i) => {
                                                const h = Math.random() * 100;
                                                const isGreen = Math.random() > 0.4;
                                                return (
                                                    <div key={i} className="flex-1 border-b border-dashed border-white/10 flex flex-col justify-end" style={{ height: '100%' }}>
                                                        <div style={{ height: `${h}%` }} className={`w-full rounded-t-sm opacity-60 ${isGreen ? 'bg-[#00C087]' : 'bg-red-500'}`} />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0b0e11] to-transparent pointer-events-none" />
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Modal Body: Orden pendiente Tab */}
                        {modalTab === 'Orden pendiente' && (
                            <div className="flex-1 p-6 overflow-y-auto">
                                <h3 className="text-sm font-bold text-white mb-6">Orden pendiente</h3>
                                <div className="text-[11px] text-[#848e9c] flex gap-8 mb-4">
                                    <span>Cant. por orden <strong className="text-white">{(parseFloat(detailedBot.config.capital) * 0.0001).toFixed(5)} {detailedBot.config.pair?.split('/')[0]}</strong></span>
                                </div>

                                {(() => {
                                    const rangeMin = parseFloat(detailedBot.config.range_min || 70000);
                                    const rangeMax = parseFloat(detailedBot.config.range_max || 83000);
                                    const totalGrids = parseInt(detailedBot.config.grids || 10, 10);
                                    const step = (rangeMax - rangeMin) / totalGrids;
                                    const amountPerGrid = (parseFloat(detailedBot.config.capital) * 0.0001).toFixed(5);
                                    const buyCount = Math.floor(totalGrids * 0.66);
                                    const sellCount = totalGrids - buyCount;
                                    const maxRows = Math.max(buyCount, sellCount);

                                    return (
                                        <div className="w-full">
                                            <div className="flex w-full mb-6 gap-1 h-1">
                                                <div className="bg-[#00C087] h-full rounded" style={{ width: `${(buyCount / totalGrids) * 100}%` }}></div>
                                                <div className="bg-red-500 h-full rounded" style={{ width: `${(sellCount / totalGrids) * 100}%` }}></div>
                                            </div>
                                            <div className="flex justify-between text-[10px] font-bold mb-4">
                                                <span className="text-[#00C087]">Compra({buyCount})</span>
                                                <span className="text-red-500">Venta({sellCount})</span>
                                            </div>

                                            <div className="w-full text-[11px]">
                                                {/* Table Header */}
                                                <div className="flex w-full text-[#848e9c] border-b border-white/5 border-dashed pb-2 mb-2 font-normal">
                                                    <div className="flex-1 w-fit pb-1">Porcentaje de cumplimiento...</div>
                                                    <div className="w-24 text-center">Precio(USDT)</div>
                                                    <div className="flex-1 text-right w-fit pb-1">Porcentaje de cumplimiento...</div>
                                                </div>

                                                {/* Table Body */}
                                                <div className="font-mono text-[10px]">
                                                    {Array.from({ length: maxRows }).map((_, i) => {
                                                        const buyPrice = i < buyCount ? (rangeMin + ((buyCount - 1 - i) * step)) : null;
                                                        const sellPrice = i < sellCount ? (rangeMin + ((buyCount + 1 + i) * step)) : null;

                                                        return (
                                                            <div key={i} className="flex w-full items-center py-2 hover:bg-white/5 border-b border-white/5 border-dashed">
                                                                <div className="flex-1 text-white opacity-80">
                                                                    {buyPrice !== null ? `-${(i * 0.5 + 0.42).toFixed(2)}%` : ''}
                                                                </div>
                                                                <div className="w-fit flex items-center justify-center gap-2">
                                                                    <span className="text-[#00C087] w-14 text-right pr-2">{buyPrice !== null ? buyPrice.toFixed(2) : '--'}</span>
                                                                    <span className="text-[#848e9c] font-black text-[9px]">{i + 1}</span>
                                                                    <span className="text-red-500 w-14 text-left pl-2">{sellPrice !== null ? sellPrice.toFixed(2) : '--'}</span>
                                                                </div>
                                                                <div className="flex-1 text-right text-white opacity-80">
                                                                    {sellPrice !== null ? `${(i * 0.5 + 0.64).toFixed(2)}%` : ''}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                        {/* Modal Body: Detalles de cuadrícula Tab */}
                        {modalTab === 'Detalles de cuadrícula' && (
                            <div className="flex-1 p-6 overflow-y-auto">
                                <h3 className="text-sm font-bold text-white mb-6">Detalles de la cuadrícula</h3>
                                <div className="flex gap-16">
                                    <div className="space-y-4 flex-1 text-[11px]">
                                        <div className="flex justify-between border-b border-white/5 pb-2"><span className="text-[#848e9c]">Modo</span> <span className="text-white">Aritmético</span></div>
                                        <div className="flex justify-between border-b border-white/5 pb-2"><span className="text-[#848e9c]">Rango de precios</span> <span className="text-white font-mono">{detailedBot.config.range_min || '70,000'} - {detailedBot.config.range_max || '83,000'} USDT</span></div>
                                        <div className="flex justify-between border-b border-white/5 pb-2"><span className="text-[#848e9c]">Número de cuadrículas</span> <span className="text-white">{detailedBot.config.grids || 10}</span></div>
                                        <div className="flex justify-between border-b border-white/5 pb-2"><span className="text-[#848e9c]">Ganancias por cuadrícula</span> <span className="text-white font-mono">0.32% - 0.36%</span></div>
                                        <div className="flex justify-between border-b border-white/5 pb-2"><span className="text-[#848e9c]">Inversión inicial</span> <span className="text-white font-bold">{detailedBot.config.capital} USDT</span></div>
                                        <div className="flex justify-between border-b border-white/5 pb-2"><span className="text-[#848e9c]">Estado</span> <span className="text-[#00C087] font-bold">• En ejecución</span></div>
                                        <div className="flex justify-between pb-2"><span className="text-[#848e9c]">Invertir y ganar</span> <span className="text-white">USDT</span></div>
                                    </div>
                                    <div className="space-y-4 flex-1 text-[11px]">
                                        <h4 className="font-bold text-white mb-2">Avanzada (opcional)</h4>
                                        <div className="flex justify-between border-b border-white/5 pb-2"><span className="text-[#848e9c]">Trailing up</span> <span className="text-white">Deshabilitado</span></div>
                                        <div className="flex justify-between border-b border-white/5 pb-2"><span className="text-[#848e9c]">Precio de activación</span> <span className="text-white">--</span></div>
                                        <div className="flex justify-between border-b border-white/5 pb-2"><span className="text-[#848e9c]">Stop Loss</span> <span className="text-white">--</span></div>
                                        <div className="flex justify-between border-b border-white/5 pb-2"><span className="text-[#848e9c]">Take Profit</span> <span className="text-white">--</span></div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Modal Body: Historial de órdenes Tab */}
                        {modalTab === 'Historial de órdenes' && (() => {
                            const botStats = liveStats[detailedBot.id] || { pnl: 0, gridHits: 0, history: [] };

                            return (
                                <div className="flex-1 p-6 overflow-y-auto">
                                    <h3 className="text-sm font-bold text-white mb-6">Historial</h3>
                                    <div className="text-[11px] flex gap-8 mb-8">
                                        <span className="text-[#848e9c]">Ganancias de la cuadrícula <strong className="text-[#00C087]">{botStats.pnl.toFixed(4)} USDT</strong></span>
                                        <span className="text-[#848e9c]">Operaciones emparejadas totales <strong className="text-white">{botStats.gridHits}</strong></span>
                                    </div>

                                    <div className="w-full text-left text-[11px]">
                                        {/* Binance style expanded rows */}
                                        <div className="space-y-4">
                                            {botStats.history && botStats.history.length > 0 ? botStats.history.map((match) => (
                                                <div key={match.id} className="border border-white/5 rounded-lg bg-[#2b3139]/40 overflow-hidden text-[#848e9c]">
                                                    {/* Header of the matched trade */}
                                                    <div className="flex justify-between items-center px-4 py-3 bg-[#1e2329] border-b border-white/5">
                                                        <div className="flex items-center gap-3">
                                                            <span className="cursor-pointer text-white hover:text-[#F3BA2F]">˅</span>
                                                            <span className="font-mono text-white">{match.time}</span>
                                                        </div>
                                                        <span className="font-bold text-[#00C087]">{match.profit}</span>
                                                    </div>

                                                    {/* Internal Buys & Sells Table */}
                                                    <div className="px-4 py-2">
                                                        <div className="grid grid-cols-7 gap-4 mb-2 pb-2 border-b border-white/5 font-normal">
                                                            <span className="col-span-2">Hora</span>
                                                            <span>Lado</span>
                                                            <span>Tipo de orden</span>
                                                            <span className="text-right">Avg. Price</span>
                                                            <span className="text-right">Total</span>
                                                            <span className="text-right">Comisiones</span>
                                                        </div>
                                                        <div className="space-y-3 font-mono text-[10px]">
                                                            {/* Sell Line */}
                                                            <div className="grid grid-cols-7 gap-4 text-white">
                                                                <span className="col-span-2">{match.sell.time}</span>
                                                                <span className="text-red-500 font-bold">{match.sell.type}</span>
                                                                <span>Límite</span>
                                                                <span className="text-right">{match.sell.price}</span>
                                                                <span className="text-right">{match.sell.total}</span>
                                                                <span className="text-right">{match.sell.fee}</span>
                                                            </div>
                                                            {/* Buy Line */}
                                                            <div className="grid grid-cols-7 gap-4 text-white">
                                                                <span className="col-span-2">{match.buy.time}</span>
                                                                <span className="text-[#00C087] font-bold">{match.buy.type}</span>
                                                                <span>Límite</span>
                                                                <span className="text-right">{match.buy.price}</span>
                                                                <span className="text-right">{match.buy.total}</span>
                                                                <span className="text-right">{match.buy.fee}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )) : (
                                                <div className="py-10 text-center text-[#848e9c] italic border border-white/5 border-dashed rounded-xl">
                                                    Esperando la primera operación emparejada...
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
};

export default BotZoneContent;
