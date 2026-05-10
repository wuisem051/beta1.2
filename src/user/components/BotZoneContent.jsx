import React, { useState, useContext, useEffect, useRef, useCallback } from 'react';
import { ThemeContext } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import {
    collection, addDoc, query, where, onSnapshot,
    serverTimestamp, doc, updateDoc, deleteDoc, getDoc
} from 'firebase/firestore';

// ─── SVG Icons & Components ──────────────────────────────────────
const Ico = ({ d, vb = '0 0 24 24', fill = 'none', sw = '1.8', cls = 'w-5 h-5' }) => (
    <svg viewBox={vb} fill={fill} stroke={fill === 'none' ? 'currentColor' : 'none'} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" className={cls}>{d}</svg>
);
const IconGrid = () => <Ico d={<><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></>} />;
const IconDCA = () => <Ico d={<><path d="M3 17l4-8 4 4 4-6 4 5" /><path d="M21 21H3" /></>} />;
const IconArb = () => <Ico d={<><path d="M7 16V4m0 0L3 8m4-4l4 4" /><path d="M17 8v12m0 0l4-4m-4 4l-4-4" /></>} />;
const IconMart = () => <Ico d={<><path d="M3 20h18M5 20V10l4-4 4 6 4-8v16" /></>} />;
const IconRebal = () => <Ico d={<><circle cx="12" cy="12" r="9" /><path d="M12 3v9l6 3" /></>} />;
const IconInf = () => <Ico d={<><path d="M12 12c-2-2.5-4-4-6-4a4 4 0 0 0 0 8c2 0 4-1.5 6-4zm0 0c2 2.5 4 4 6 4a4 4 0 0 0 0-8c-2 0-4 1.5-6 4z" /></>} />;
const IconPlay = () => <Ico vb="0 0 24 24" fill="currentColor" sw="0" cls="w-4 h-4" d={<path d="M8 5v14l11-7z" />} />;
const IconPause = () => <Ico vb="0 0 24 24" fill="currentColor" sw="0" cls="w-4 h-4" d={<rect x="6" y="6" width="12" height="12" rx="2" />} />;
const IconTrash = () => <Ico cls="w-4 h-4" d={<><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></>} />;
const IconChevron = () => <Ico cls="w-4 h-4" sw="2.5" d={<path d="m9 18 6-6-6-6" />} />;
const IconEye = () => <Ico cls="w-3.5 h-3.5" d={<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>} />;

// ─── Bot Catalog ─────────────────────────────────────────────────
const BOT_CATALOG = [
    {
        id: 'grid', name: 'Cuadrícula de spot', icon: <IconGrid />, color: '#F3BA2F',
        description: 'Compra bajo y vende alto. Disponibilidad continua en rangos definidos.',
        category: 'spot', stats: { risk: 'Bajo', capital: 20 },
        params: [
            { key: 'pair', label: 'Par de trading', type: 'select', options: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT'] },
            { key: 'range', label: 'Rango de precios', type: 'dual-number', labels: ['Inferior', 'Superior'] },
            { key: 'grids', label: 'Número de cuadrículas', type: 'number', placeholder: '2-170' },
            { key: 'investment', label: 'Inversión (USDT)', type: 'capital-slider' }
        ]
    },
    {
        id: 'dca', name: 'DCA de spot', icon: <IconDCA />, color: '#00C087',
        description: 'Coste de entrada medio más bajo, ganancias por cambios en la tendencia.',
        category: 'spot', stats: { risk: 'Muy Bajo', capital: 10 },
        params: [
            { key: 'pair', label: 'Par de trading', type: 'select', options: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'] },
            { key: 'interval', label: 'Intervalo de tiempo', type: 'select', options: ['Cada hora', 'Cada 4 horas', 'Diario', 'Semanal'] },
            { key: 'amount', label: 'Inversión por orden', type: 'number', placeholder: 'Mín. 10 USDT' },
            { key: 'tp', label: 'Take profit por ciclo (%)', type: 'number', placeholder: 'Ej: 1.00' }
        ]
    },
    {
        id: 'rebalance', name: 'Bot de reequilibrio', icon: <IconRebal />, color: '#60a5fa',
        description: 'Estrategia inteligente para una cartera con distintas monedas.',
        category: 'spot', stats: { risk: 'Bajo', capital: 100 },
        params: [
            { key: 'assets', label: 'Monedas y pesos', type: 'text', placeholder: 'BTC 50, ETH 50' },
            { key: 'threshold', label: 'Umbral de reequilibrio (%)', type: 'number', placeholder: '1-5%' },
            { key: 'capital', label: 'Inversión total', type: 'capital-slider' }
        ]
    },
    {
        id: 'martingale', name: 'Martingale bot', icon: <IconMart />, color: '#fbbf24',
        description: 'Promediación de costo con multiplicador en caídas.',
        category: 'spot', stats: { risk: 'Medio', capital: 50 },
        params: [
            { key: 'pair', label: 'Par de trading', type: 'select', options: ['BTC/USDT', 'ETH/USDT'] },
            { key: 'multiplier', label: 'Multiplicador de posición', type: 'number', placeholder: 'Ej: 2' },
            { key: 'capital', label: 'Monto inicial', type: 'number' }
        ]
    }
];

// ─── Small Components ───────────────────────────────────────────
const StatItem = ({ label, value, sub, color = 'var(--text-main)' }) => (
    <div className="flex flex-col">
        <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-40">{label}</span>
            {label.includes('Saldo') && <IconEye />}
        </div>
        <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight" style={{ color }}>{value}</span>
            {sub && <span className="text-xs font-bold" style={{ color: sub.startsWith('+') ? '#00C087' : '#5e6673' }}>{sub}</span>}
        </div>
    </div>
);

const TradingViewMini = ({ pair }) => {
    const container = useRef();
    useEffect(() => {
        const symbol = pair ? pair.replace('/', '').toUpperCase() : 'BTCUSDT';
        const script = document.createElement("script");
        script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
        script.type = "text/javascript";
        script.async = true;
        script.innerHTML = JSON.stringify({
            "autosize": true,
            "symbol": `BINANCE:${symbol}`,
            "interval": "15",
            "timezone": "Etc/UTC",
            "theme": "dark",
            "style": "1",
            "locale": "es",
            "enable_publishing": false,
            "hide_top_toolbar": true,
            "allow_symbol_change": false,
            "save_image": false,
            "calendar": false,
            "support_host": "https://www.tradingview.com"
        });
        if (container.current) {
            container.current.innerHTML = '';
            container.current.appendChild(script);
        }
    }, [pair]);

    return (
        <div className="tradingview-widget-container h-full w-full rounded-2xl overflow-hidden border border-white/5" ref={container}>
            <div className="tradingview-widget-container__widget h-full w-full"></div>
        </div>
    );
};

// ─── Bot Zone Content ─────────────────────────────────────────────
const BotZoneContent = () => {
    const { currentUser } = useAuth();
    const [tab, setTab] = useState('catalog'); // 'catalog' | 'active' | 'config'
    const [selectedBot, setSelectedBot] = useState(null);
    const [botMode, setBotMode] = useState('demo');
    const [instances, setInstances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userBalanceUSD, setUserBalanceUSD] = useState(0);
    const [notification, setNotification] = useState(null);
    const [catFilter, setCatFilter] = useState('todo');

    const notify = useCallback((msg, type = 'success') => {
        setNotification({ msg, type });
        setTimeout(() => setNotification(null), 3500);
    }, []);

    useEffect(() => {
        if (!currentUser?.uid) return;
        const userRef = doc(db, 'users', currentUser.uid);
        const unsub = onSnapshot(userRef, snap => {
            if (snap.exists()) setUserBalanceUSD(parseFloat(snap.data().balanceUSD || 0));
        });
        return () => unsub();
    }, [currentUser]);

    useEffect(() => {
        if (!currentUser?.uid) { setLoading(false); return; }
        const q = query(collection(db, 'userBots'), where('userId', '==', currentUser.uid));
        const unsub = onSnapshot(q, snap => {
            setInstances(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        }, (err) => {
            console.error("Bots listen error:", err);
            setLoading(false);
        });
        return () => unsub();
    }, [currentUser]);

    const handleOpenConfig = (bot, mode = 'demo') => {
        setSelectedBot(bot);
        setBotMode(mode);
        setTab('config');
    };

    const handleSaveBot = async (config) => {
        try {
            const capital = parseFloat(config.capital || config.investment || config.amount || 0);
            if (botMode === 'real' && capital > userBalanceUSD) throw new Error('Fondos insuficientes');

            await addDoc(collection(db, 'userBots'), {
                userId: currentUser.uid,
                botId: selectedBot.id,
                botName: selectedBot.name,
                config,
                mode: botMode,
                status: 'running',
                createdAt: serverTimestamp(),
            });

            if (botMode === 'real' && capital > 0) {
                await updateDoc(doc(db, 'users', currentUser.uid), { balanceUSD: userBalanceUSD - capital });
            }

            setTab('active');
            setSelectedBot(null);
            notify(`🚀 Bot ${selectedBot.name} activado en modo ${botMode.toUpperCase()}`);
        } catch (err) {
            notify(`❌ ${err.message}`, 'error');
        }
    };

    const handleDelete = async (id) => {
        const inst = instances.find(i => i.id === id);
        await deleteDoc(doc(db, 'userBots', id));
        if (inst?.mode === 'real' && inst?.config?.capital) {
            await updateDoc(doc(db, 'users', currentUser.uid), { balanceUSD: userBalanceUSD + parseFloat(inst.config.capital) });
        }
        notify('🗑 Bot detenido y capital liberado');
    };

    return (
        <div className="w-full min-h-screen bg-[#0b0e11] text-[#eaecef] p-4 md:p-8 font-sans">
            {/* Header / Stats */}
            {tab !== 'config' && (
                <div className="max-w-[1280px] mx-auto mb-12 animate-in fade-in duration-700">
                    <h1 className="text-4xl font-black mb-10 tracking-tight text-white">Bots de trading</h1>

                    <div className="flex flex-col lg:flex-row justify-between gap-8">
                        <div className="flex flex-wrap gap-12 items-start">
                            <StatItem label="Saldo total" value={`$${userBalanceUSD.toLocaleString()}`} />
                            <StatItem label="PnL de hoy" value="+$0.51" sub="(+0.22%)" color="#00C087" />
                            <StatItem label="Mis bots" value={instances.length} sub={<span onClick={() => setTab('active')} className="cursor-pointer hover:text-white underline">Ver todos</span>} />
                        </div>

                        {/* Banner Card */}
                        <div className="flex-1 max-w-md bg-[#1e2329] rounded-3xl p-6 flex justify-between items-center border border-white/5 relative overflow-hidden group">
                            <div className="relative z-10">
                                <h3 className="text-lg font-bold mb-4">Descubre nuestros bots de trading</h3>
                                <button className="text-[11px] font-bold text-[#F3BA2F] hover:underline flex items-center gap-1">
                                    Más información <IconChevron />
                                </button>
                            </div>
                            <div className="relative z-10 w-20 h-20 flex items-center justify-center bg-[#F3BA2F]/10 rounded-full">
                                <div className="text-[#F3BA2F]">
                                    <IconInf />
                                </div>
                            </div>
                            {/* Decorative glow */}
                            <div className="absolute -right-10 -top-10 w-40 h-40 bg-[#F3BA2F]/5 blur-3xl rounded-full" />
                        </div>
                    </div>
                </div>
            )}

            {/* Navigation Tabs */}
            {tab !== 'config' && (
                <div className="max-w-[1280px] mx-auto mb-8 flex justify-between items-end border-b border-white/5">
                    <div className="flex gap-8">
                        {['catalog', 'active'].map(t => (
                            <button key={t} onClick={() => setTab(t)}
                                className={`pb-4 text-sm font-bold uppercase tracking-widest transition-all relative ${tab === t ? 'text-[#F3BA2F]' : 'text-[#848e9c]'}`}>
                                {t === 'catalog' ? 'Centro de bots' : 'Mis bots operativos'}
                                {tab === t && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F3BA2F]" />}
                            </button>
                        ))}
                    </div>

                    {tab === 'catalog' && (
                        <div className="flex gap-6 pb-4">
                            {['todo', 'spot', 'futuros'].map(f => (
                                <button key={f} onClick={() => setCatFilter(f)}
                                    className={`text-[11px] font-black uppercase tracking-widest ${catFilter === f ? 'text-white' : 'text-[#848e9c]'}`}>
                                    {f}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Content: Catalog */}
            {tab === 'catalog' && (
                <div className="max-w-[1280px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {BOT_CATALOG.filter(b => catFilter === 'todo' || b.category === catFilter).map(bot => (
                        <div key={bot.id} className="bg-[#1e2329] border border-white/5 hover:border-white/20 transition-all rounded-2xl p-6 group cursor-pointer"
                            onClick={() => handleOpenConfig(bot)}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 text-white/80 group-hover:bg-[#F3BA2F]/10 group-hover:text-[#F3BA2F] transition-colors">
                                    {bot.icon}
                                </div>
                                <h3 className="font-bold text-sm tracking-tight">{bot.name}</h3>
                            </div>
                            <p className="text-[10px] text-[#848e9c] leading-relaxed mb-6 h-8 line-clamp-2">
                                {bot.description}
                            </p>
                            <div className="flex justify-between items-center pt-4 border-t border-white/5">
                                <span className="text-[9px] font-black uppercase tracking-widest text-[#F3BA2F]">Explorar →</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Content: Active Bots */}
            {tab === 'active' && (
                <div className="max-w-[1280px] mx-auto animate-in fade-in duration-500">
                    {instances.length === 0 ? (
                        <div className="text-center py-32 bg-[#1e2329] rounded-3xl border border-white/5">
                            <h2 className="text-xl font-bold mb-2">No tienes bots activos</h2>
                            <p className="text-sm text-[#848e9c] mb-8">Elige una estrategia del catálogo para empezar.</p>
                            <button onClick={() => setTab('catalog')} className="px-8 py-3 bg-[#F3BA2F] text-black font-bold text-xs uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all">
                                Ir al catálogo
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {instances.map(inst => {
                                const bot = BOT_CATALOG.find(b => b.id === inst.botId) || {};
                                return (
                                    <div key={inst.id} className="bg-[#1e2329] border border-white/5 rounded-3xl p-6">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#F3BA2F]/10 text-[#F3BA2F]">
                                                    {bot.icon || <IconGrid />}
                                                </div>
                                                <div>
                                                    <h3 className="font-black italic uppercase tracking-tighter">{inst.botName}</h3>
                                                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${inst.mode === 'real' ? 'bg-green-500/10 text-green-400' : 'bg-sky-500/10 text-sky-400'}`}>
                                                        {inst.mode === 'real' ? 'Real Money' : 'Demo Mode'}
                                                    </span>
                                                </div>
                                            </div>
                                            <button onClick={() => handleDelete(inst.id)} className="p-2 hover:bg-red-500/10 hover:text-red-400 rounded-lg text-white/20 transition-all">
                                                <IconTrash />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-3 gap-3 mb-6">
                                            <div className="bg-black/20 p-4 rounded-2xl">
                                                <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">Inversión</p>
                                                <p className="font-bold text-xs">${inst.config?.capital || inst.config?.investment || '0'}</p>
                                            </div>
                                            <div className="bg-black/20 p-4 rounded-2xl">
                                                <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">PnL</p>
                                                <p className="font-bold text-xs text-[#00C087]">+2.45%</p>
                                            </div>
                                            <div className="bg-black/20 p-4 rounded-2xl">
                                                <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">Par</p>
                                                <p className="font-bold text-xs">{inst.config?.pair || '—'}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <div className="h-1.5 flex-1 bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full bg-[#F3BA2F] animate-pulse" style={{ width: '65%' }} />
                                            </div>
                                            <span className="text-[9px] font-black uppercase text-[#F3BA2F]">Live Tracking</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Content: Configuration View (Inspired by Binance Full Trading Page) */}
            {tab === 'config' && selectedBot && (
                <div className="h-[calc(100vh-60px)] flex flex-col animate-in fade-in slide-in-from-right-4 duration-500">
                    {/* Config Navbar */}
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setTab('catalog')} className="p-2 hover:bg-white/5 rounded-full">
                                <Ico vb="0 0 24 24" sw="2.5" d={<path d="M15 18l-6-6 6-6" />} />
                            </button>
                            <div className="flex items-center gap-3">
                                <div className="text-[#F3BA2F]"> {selectedBot.icon} </div>
                                <h2 className="text-xl font-bold">{selectedBot.name}</h2>
                            </div>
                        </div>
                        <ModeToggle mode={botMode} onChange={setBotMode} />
                    </div>

                    <div className="flex-1 flex gap-4 overflow-hidden">
                        {/* Left: Chart */}
                        <div className="flex-[3] bg-[#1e2329] rounded-3xl overflow-hidden border border-white/5 min-h-[400px]">
                            <TradingViewMini pair={selectedBot.params.find(p => p.key === 'pair')?.options[0] || 'BTC/USDT'} />
                        </div>

                        {/* Right: Config Panel */}
                        <div className="flex-1 max-w-[400px] bg-[#1e2329] rounded-3xl border border-white/5 overflow-y-auto custom-scrollbar p-6">
                            <div className="flex gap-2 mb-8 bg-black/20 p-1 rounded-xl">
                                {['Manual', 'IA', 'Popular'].map(m => (
                                    <button key={m} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${m === 'Manual' ? 'bg-[#2b3139] text-[#F3BA2F]' : 'text-[#848e9c]'}`}>
                                        {m}
                                    </button>
                                ))}
                            </div>

                            <form onSubmit={(e) => {
                                e.preventDefault();
                                const formData = new FormData(e.target);
                                handleSaveBot(Object.fromEntries(formData));
                            }} className="space-y-6">
                                {selectedBot.params.map(p => (
                                    <div key={p.key} className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[#848e9c]">{p.label}</label>
                                            {p.key === 'range' && <span className="text-[9px] text-[#F3BA2F] cursor-pointer hover:underline">Autorellenar</span>}
                                        </div>

                                        {p.type === 'select' ? (
                                            <select name={p.key} className="w-full bg-[#2b3139] border border-white/5 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-[#F3BA2F]/40">
                                                {p.options.map(o => <option key={o} value={o}>{o}</option>)}
                                            </select>
                                        ) : p.type === 'dual-number' ? (
                                            <div className="flex gap-2">
                                                {p.labels.map((l, i) => (
                                                    <div key={l} className="flex-1 relative">
                                                        <input type="number" required name={`${p.key}_${i === 0 ? 'min' : 'max'}`} placeholder={l}
                                                            className="w-full bg-[#2b3139] border border-white/5 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-[#F3BA2F]/40" />
                                                    </div>
                                                ))}
                                            </div>
                                        ) : p.type === 'capital-slider' ? (
                                            <div className="space-y-3">
                                                <input type="number" name="capital" placeholder="Monto en USDT" required
                                                    className="w-full bg-[#2b3139] border border-white/5 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-[#F3BA2F]/40" />
                                                <div className="flex justify-between gap-1">
                                                    {[25, 50, 75, 100].map(per => (
                                                        <button type="button" key={per} onClick={() => { }} className="flex-1 py-1.5 rounded-lg bg-white/5 text-[9px] font-black hover:bg-white/10 transition-colors">
                                                            {per}%
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="flex justify-between text-[9px] font-bold text-[#848e9c]">
                                                    <span>Disponible</span>
                                                    <span className="text-[#00C087]">${userBalanceUSD.toFixed(2)} USDT</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <input type={p.type} name={p.key} placeholder={p.placeholder} required
                                                className="w-full bg-[#2b3139] border border-white/5 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-[#F3BA2F]/40" />
                                        )}
                                    </div>
                                ))}

                                <div className="pt-4">
                                    <button type="submit" className="w-full py-4 bg-[#F3BA2F] text-black font-black uppercase italic tracking-widest rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-[#F3BA2F]/10">
                                        Crear {selectedBot.name}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {notification && (
                <div className="fixed bottom-10 right-10 z-[1000] px-8 py-4 bg-[#1e2329] border border-[#F3BA2F]/50 text-[#F3BA2F] rounded-2xl font-black text-sm shadow-2xl animate-in slide-in-from-right-4 duration-300">
                    {notification.msg}
                </div>
            )}
        </div>
    );
};

const ModeToggle = ({ mode, onChange }) => (
    <div className="flex gap-1 p-1 bg-black/20 rounded-xl">
        <button onClick={() => onChange('demo')}
            className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${mode === 'demo' ? 'bg-[#2b3139] text-[#38bdf8] border border-[#38bdf820]' : 'text-[#848e9c]'}`}>
            Demo
        </button>
        <button onClick={() => onChange('real')}
            className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${mode === 'real' ? 'bg-[#2b3139] text-[#00C087] border border-[#00C08720]' : 'text-[#848e9c]'}`}>
            Real
        </button>
    </div>
);

export default BotZoneContent;
