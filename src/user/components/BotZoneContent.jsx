import React, { useState, useContext, useEffect, useRef, useCallback } from 'react';
import { ThemeContext } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import {
    collection, addDoc, query, where, onSnapshot,
    serverTimestamp, doc, updateDoc, deleteDoc, getDoc
} from 'firebase/firestore';

// ─── SVG Icons ───────────────────────────────────────────────────
const Ico = ({ d, vb = '0 0 24 24', fill = 'none', sw = '1.8', cls = 'w-5 h-5' }) => (
    <svg viewBox={vb} fill={fill} stroke={fill === 'none' ? 'currentColor' : 'none'} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" className={cls}>{d}</svg>
);
const IconBot = () => <Ico d={<><rect x="3" y="11" width="18" height="10" rx="3" /><circle cx="12" cy="5" r="2" /><line x1="12" y1="7" x2="12" y2="11" /><line x1="8" y1="15" x2="8" y2="17" /><line x1="16" y1="15" x2="16" y2="17" /></>} />;
const IconGrid = () => <Ico d={<><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></>} />;
const IconDCA = () => <Ico d={<><path d="M3 17l4-8 4 4 4-6 4 5" /><path d="M21 21H3" /></>} />;
const IconArb = () => <Ico d={<><path d="M7 16V4m0 0L3 8m4-4l4 4" /><path d="M17 8v12m0 0l4-4m-4 4l-4-4" /></>} />;
const IconMart = () => <Ico d={<><path d="M3 20h18M5 20V10l4-4 4 6 4-8v16" /></>} />;
const IconRebal = () => <Ico d={<><circle cx="12" cy="12" r="9" /><path d="M12 3v9l6 3" /></>} />;
const IconInf = () => <Ico d={<><path d="M12 12c-2-2.5-4-4-6-4a4 4 0 0 0 0 8c2 0 4-1.5 6-4zm0 0c2 2.5 4 4 6 4a4 4 0 0 0 0-8c-2 0-4 1.5-6 4z" /></>} />;
const IconPlay = () => <Ico vb="0 0 24 24" fill="currentColor" sw="0" cls="w-4 h-4" d={<path d="M8 5v14l11-7z" />} />;
const IconPause = () => <Ico vb="0 0 24 24" fill="currentColor" sw="0" cls="w-4 h-4" d={<rect x="6" y="6" width="12" height="12" rx="2" />} />;
const IconTrash = () => <Ico cls="w-4 h-4" d={<><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></>} />;
const IconWarn = () => <Ico cls="w-5 h-5 flex-shrink-0" d={<><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>} />;
const IconClose = () => <Ico cls="w-4 h-4" sw="2.5" d={<path d="M18 6 6 18M6 6l12 12" />} />;
const IconFlask = () => <Ico cls="w-4 h-4" d={<><path d="M9 3h6v8l3 9H6l3-9V3z" /><line x1="6" y1="12" x2="18" y2="12" /></>} />;
const IconLive = () => <Ico cls="w-4 h-4" d={<><circle cx="12" cy="12" r="3" /><path d="M6.3 6.3a8 8 0 0 0 0 11.4" /><path d="M17.7 6.3a8 8 0 0 1 0 11.4" /><path d="M3.5 3.5a14 14 0 0 0 0 17" /><path d="M20.5 3.5a14 14 0 0 1 0 17" /></>} />;

// ─── Bot Catalog ─────────────────────────────────────────────────
const BOT_CATALOG = [
    {
        id: 'grid', name: 'Grid Bot', icon: <IconGrid />, color: '#a78bfa', gradient: 'linear-gradient(135deg,#7c3aed22,#a78bfa11)', border: '#7c3aed40',
        tag: 'PIONEX STYLE', tagColor: '#7c3aed', strategy: 'Lateral / Ranging', risk: 'Bajo', estAPY: '15–80%', minCapital: 20,
        description: 'Coloca órdenes de compra y venta dentro de un rango. Ideal para mercados laterales.',
        params: [
            { key: 'pair', label: 'Par Spot', type: 'select', options: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'DOGE/USDT', 'XRP/USDT'] },
            { key: 'lowerPrice', label: 'Precio Inferior (USDT)', type: 'number', placeholder: 'Ej: 60000', min: 1 },
            { key: 'upperPrice', label: 'Precio Superior (USDT)', type: 'number', placeholder: 'Ej: 75000', min: 1 },
            { key: 'grids', label: 'Número de Grillas', type: 'number', placeholder: 'Ej: 20', min: 5, max: 200 },
            { key: 'capital', label: 'Capital (USDT)', type: 'number', placeholder: 'Ej: 100', min: 20 },
        ],
    },
    {
        id: 'dca', name: 'DCA Bot', icon: <IconDCA />, color: '#34d399', gradient: 'linear-gradient(135deg,#05966922,#34d39911)', border: '#05966940',
        tag: 'BINANCE STYLE', tagColor: '#059669', strategy: 'Tendencia alcista', risk: 'Muy Bajo', estAPY: '10–40%', minCapital: 10,
        description: 'Dollar Cost Averaging. Compra periódicamente para promediar el costo de entrada.',
        params: [
            { key: 'pair', label: 'Par Spot', type: 'select', options: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'AVAX/USDT'] },
            { key: 'interval', label: 'Intervalo', type: 'select', options: ['Cada hora', 'Cada 4 horas', 'Diario', 'Semanal'] },
            { key: 'amountPerOrder', label: 'Monto por Orden (USDT)', type: 'number', placeholder: 'Ej: 10', min: 10 },
            { key: 'takeProfit', label: 'Take Profit (%)', type: 'number', placeholder: 'Ej: 5', min: 0.1 },
        ],
    },
    {
        id: 'martingale', name: 'Martingale Bot', icon: <IconMart />, color: '#fbbf24', gradient: 'linear-gradient(135deg,#d9770622,#fbbf2411)', border: '#d9770640',
        tag: 'PIONEX STYLE', tagColor: '#d97706', strategy: 'Promediación', risk: 'Medio', estAPY: '20–120%', minCapital: 50,
        description: 'Aumenta la posición cuando baja el mercado, promediando para salir con ganancia en el rebote.',
        params: [
            { key: 'pair', label: 'Par Spot', type: 'select', options: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT'] },
            { key: 'initialAmount', label: 'Orden Inicial (USDT)', type: 'number', placeholder: 'Ej: 10', min: 10 },
            { key: 'multiplier', label: 'Multiplicador', type: 'number', placeholder: 'Ej: 2', min: 1.1, step: '0.1' },
            { key: 'maxOrders', label: 'Máx. Órdenes', type: 'number', placeholder: 'Ej: 5', min: 2, max: 10 },
            { key: 'takeProfit', label: 'Take Profit (%)', type: 'number', placeholder: 'Ej: 2', min: 0.1 },
        ],
    },
    {
        id: 'rebalance', name: 'Rebalancing Bot', icon: <IconRebal />, color: '#60a5fa', gradient: 'linear-gradient(135deg,#1d4ed822,#60a5fa11)', border: '#1d4ed840',
        tag: 'BINANCE STYLE', tagColor: '#1d4ed8', strategy: 'Portafolio', risk: 'Bajo', estAPY: '5–30%', minCapital: 100,
        description: 'Mantiene tu portafolio en porcentajes fijos rebalanceando automáticamente.',
        params: [
            { key: 'assets', label: 'Distribución (Ej: BTC 50%, ETH 50%)', type: 'text', placeholder: 'BTC 50%, ETH 50%' },
            { key: 'threshold', label: 'Umbral de Rebalanceo (%)', type: 'number', placeholder: 'Ej: 5', min: 1 },
            { key: 'capital', label: 'Capital Total (USDT)', type: 'number', placeholder: 'Ej: 500', min: 100 },
        ],
    },
    {
        id: 'infinity-grid', name: 'Infinity Grid', icon: <IconInf />, color: '#f472b6', gradient: 'linear-gradient(135deg,#be185d22,#f472b611)', border: '#be185d40',
        tag: 'PIONEX STYLE', tagColor: '#be185d', strategy: 'Alcista / Sin techo', risk: 'Medio', estAPY: '30–200%', minCapital: 30,
        description: 'Grid sin límite superior. Captura ganancias en mercados alcistas sin restricción de precio.',
        params: [
            { key: 'pair', label: 'Par Spot', type: 'select', options: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT'] },
            { key: 'lowerPrice', label: 'Precio Mínimo (USDT)', type: 'number', placeholder: 'Ej: 50000', min: 1 },
            { key: 'gridStep', label: 'Paso de Grilla (%)', type: 'number', placeholder: 'Ej: 1', min: 0.1, step: '0.1' },
            { key: 'capital', label: 'Capital (USDT)', type: 'number', placeholder: 'Ej: 200', min: 30 },
        ],
    },
    {
        id: 'arbitrage', name: 'Arbitrage Bot', icon: <IconArb />, color: '#38bdf8', gradient: 'linear-gradient(135deg,#0369a122,#38bdf811)', border: '#0369a140',
        tag: 'AVANZADO', tagColor: '#0369a1', strategy: 'Delta-Neutral', risk: 'Muy Bajo', estAPY: '8–25%', minCapital: 200,
        description: 'Explota diferencias de precio entre pares spot para ganancias sin exposición direccional.',
        params: [
            { key: 'baseAsset', label: 'Activo Base', type: 'select', options: ['BTC', 'ETH', 'SOL', 'BNB'] },
            { key: 'spread', label: 'Spread Mínimo (%)', type: 'number', placeholder: 'Ej: 0.2', min: 0.05, step: '0.01' },
            { key: 'capital', label: 'Capital por Ciclo (USDT)', type: 'number', placeholder: 'Ej: 200', min: 200 },
        ],
    },
];

// ─── Mode Toggle ─────────────────────────────────────────────────
const ModeToggle = ({ mode, onChange }) => (
    <div className="flex gap-1 p-1 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <button
            onClick={() => onChange('demo')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
            style={mode === 'demo'
                ? { background: 'linear-gradient(135deg,#0ea5e930,#38bdf830)', color: '#38bdf8', border: '1px solid #38bdf840' }
                : { color: 'var(--text-soft)', border: '1px solid transparent' }}
        >
            <IconFlask /> Demo
        </button>
        <button
            onClick={() => onChange('real')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
            style={mode === 'real'
                ? { background: 'linear-gradient(135deg,#16a34a30,#4ade8030)', color: '#4ade80', border: '1px solid #4ade8040' }
                : { color: 'var(--text-soft)', border: '1px solid transparent' }}
        >
            <IconLive /> Real
        </button>
    </div>
);

// ─── PnL Hook (ticking simulation) ───────────────────────────────
const useLivePnl = (instanceId, isRunning, mode) => {
    const [pnl, setPnl] = useState(() => (Math.random() * 3 - 0.5));
    const ref = useRef(pnl);
    useEffect(() => {
        if (!isRunning) return;
        const speed = mode === 'real' ? 6000 : 3000;
        const id = setInterval(() => {
            const delta = (Math.random() * 0.8 - 0.25);
            ref.current = Math.max(-15, Math.min(50, ref.current + delta));
            setPnl(+ref.current.toFixed(3));
        }, speed);
        return () => clearInterval(id);
    }, [isRunning, mode, instanceId]);
    return pnl;
};

// ─── Active Bot Card ──────────────────────────────────────────────
const ActiveBotCard = ({ instance, onToggle, onDelete }) => {
    const bot = BOT_CATALOG.find(b => b.id === instance.botId) || {};
    const isRunning = instance.status === 'running';
    const isReal = instance.mode === 'real';
    const pnl = useLivePnl(instance.id, isRunning, instance.mode);
    const pnlColor = pnl >= 0 ? '#4ade80' : '#f87171';
    const capital = parseFloat(instance.config?.capital || instance.config?.totalCapital || instance.config?.amountPerOrder || 0);
    const pnlUSD = ((pnl / 100) * capital).toFixed(2);

    return (
        <div className="relative rounded-[1.75rem] border overflow-hidden transition-all hover:scale-[1.01]"
            style={{ background: bot.gradient || 'var(--bg-card)', borderColor: isRunning ? (bot.border || '#ffffff20') : '#ffffff08' }}>
            {/* Top accent */}
            <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: isRunning ? bot.color : 'transparent' }} />
            {/* Mode badge */}
            <div className="absolute top-4 right-4">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[7px] font-black uppercase tracking-widest"
                    style={isReal
                        ? { background: '#16a34a20', color: '#4ade80', border: '1px solid #16a34a40' }
                        : { background: '#0ea5e920', color: '#38bdf8', border: '1px solid #0ea5e940' }}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'animate-pulse' : ''}`}
                        style={{ background: isReal ? '#4ade80' : '#38bdf8' }} />
                    {isReal ? 'REAL' : 'DEMO'}
                </span>
            </div>

            <div className="p-6">
                <div className="flex items-center gap-3 mb-4 pr-16">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center border"
                        style={{ background: `${bot.color}18`, borderColor: bot.border, color: bot.color }}>
                        {bot.icon || <IconBot />}
                    </div>
                    <div>
                        <p className="text-sm font-black uppercase italic tracking-tight" style={{ color: 'var(--text-main)' }}>{instance.botName}</p>
                        <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                            style={{ background: `${bot.tagColor}18`, color: bot.tagColor }}>{bot.tag}</span>
                    </div>
                </div>

                {/* Config chips */}
                <div className="grid grid-cols-2 gap-1.5 mb-4">
                    {instance.config && Object.entries(instance.config).slice(0, 4).map(([k, v]) => (
                        <div key={k} className="rounded-xl px-3 py-2" style={{ background: 'var(--bg-main)' }}>
                            <p className="text-[7px] font-black uppercase tracking-widest mb-0.5" style={{ color: 'var(--text-soft)' }}>{k}</p>
                            <p className="text-[10px] font-black truncate" style={{ color: 'var(--text-main)' }}>{v}</p>
                        </div>
                    ))}
                </div>

                {/* PnL live */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl mb-4"
                    style={{ background: `${pnlColor}10`, border: `1px solid ${pnlColor}25` }}>
                    <div>
                        <p className="text-[8px] font-black uppercase tracking-widest mb-0.5" style={{ color: 'var(--text-soft)' }}>
                            PnL {isReal ? '(Real)' : '(Simulado)'}
                        </p>
                        <p className="text-[8px]" style={{ color: 'var(--text-soft)' }}>
                            {capital > 0 ? `≈ ${pnl >= 0 ? '+' : ''}$${pnlUSD} USDT` : '—'}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-xl font-black tracking-tight" style={{ color: pnlColor }}>
                            {pnl >= 0 ? '+' : ''}{pnl}%
                        </p>
                        {isRunning && <p className="text-[7px] font-black uppercase tracking-widest" style={{ color: pnlColor }}>● LIVE</p>}
                    </div>
                </div>

                {/* Status + Actions */}
                <div className="flex gap-2 items-center mb-3">
                    <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest
            ${isRunning ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-400'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                        {isRunning ? 'Ejecutando' : 'Pausado'}
                    </span>
                </div>

                <div className="flex gap-2">
                    <button onClick={() => onToggle(instance)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all hover:scale-105 active:scale-95"
                        style={isRunning
                            ? { borderColor: '#f8717140', color: '#f87171', background: '#f8717110' }
                            : { borderColor: `${bot.color}40`, color: bot.color, background: `${bot.color}10` }}>
                        {isRunning ? <><IconPause /> Pausar</> : <><IconPlay /> Reanudar</>}
                    </button>
                    <button onClick={() => onDelete(instance.id)}
                        className="w-10 h-10 rounded-xl flex items-center justify-center border transition-all hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-400"
                        style={{ borderColor: 'rgba(255,255,255,0.06)', color: 'var(--text-soft)' }}>
                        <IconTrash />
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Config Modal ─────────────────────────────────────────────────
const BotConfigModal = ({ bot, mode, userBalanceUSD, onClose, onSave }) => {
    const [form, setForm] = useState({});
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const overlayRef = useRef(null);
    const isReal = mode === 'real';

    const capitalKey = bot.params.find(p => p.key === 'capital' || p.key === 'totalCapital' || p.key === 'amountPerOrder')?.key;
    const capitalValue = parseFloat(form[capitalKey] || 0);
    const insufficientFunds = isReal && capitalValue > 0 && capitalValue > userBalanceUSD;

    const handleChange = (key, value) => {
        setError('');
        setForm(f => ({ ...f, [key]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (insufficientFunds) { setError(`Fondos insuficientes. Tu saldo real es $${userBalanceUSD.toFixed(2)} USDT.`); return; }
        const minCap = bot.minCapital;
        if (capitalValue < minCap && capitalValue > 0) { setError(`Capital mínimo: $${minCap} USDT`); return; }
        setSaving(true);
        await onSave({ botId: bot.id, botName: bot.name, config: form, mode });
        setSaving(false);
    };

    return (
        <div ref={overlayRef} onClick={e => e.target === overlayRef.current && onClose()}
            className="fixed inset-0 z-[999] flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
            <div className="w-full max-w-lg rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-300"
                style={{ background: 'var(--bg-card)' }}>

                {/* Header */}
                <div className="p-7 border-b border-white/5" style={{ background: bot.gradient }}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center border"
                                style={{ background: `${bot.color}20`, borderColor: bot.border, color: bot.color }}>
                                {bot.icon}
                            </div>
                            <div>
                                <h3 className="text-lg font-black uppercase italic tracking-tight" style={{ color: 'var(--text-main)' }}>
                                    Configurar {bot.name}
                                </h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: bot.color }}>{bot.tag}</span>
                                    <span className="text-[8px] text-slate-500">·</span>
                                    <span className={`flex items-center gap-1 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full
                    ${isReal ? 'bg-emerald-500/20 text-emerald-400' : 'bg-sky-500/20 text-sky-400'}`}>
                                        {isReal ? <><IconLive /> Modo Real</> : <><IconFlask /> Modo Demo</>}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <button onClick={onClose} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/10 transition-all"
                            style={{ color: 'var(--text-soft)' }}><IconClose /></button>
                    </div>
                </div>

                {/* Mode info banner */}
                <div className={`mx-6 mt-5 px-4 py-3 rounded-xl flex items-start gap-3 text-xs font-bold
          ${isReal ? 'bg-amber-500/10 border border-amber-500/25' : 'bg-sky-500/10 border border-sky-500/25'}`}>
                    <IconWarn />
                    {isReal
                        ? <span style={{ color: '#fbbf24' }}>
                            <strong>⚠ Modo Real:</strong> Se usarán fondos reales de tu balance ({' '}
                            <strong className="text-emerald-400">${userBalanceUSD.toFixed(2)} USDT disponibles</strong>).
                            Las operaciones afectarán tu saldo.
                        </span>
                        : <span style={{ color: '#38bdf8' }}>
                            <strong>🧪 Modo Demo:</strong> Este bot opera en simulación. No se usarán fondos reales.
                            Ideal para aprender sin riesgo.
                        </span>
                    }
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[52vh] overflow-y-auto custom-scrollbar">
                    {bot.params.map(param => (
                        <div key={param.key}>
                            <label className="block text-[9px] font-black uppercase tracking-widest mb-2 ml-1"
                                style={{ color: 'var(--text-soft)' }}>{param.label}</label>
                            {param.type === 'select' ? (
                                <select required
                                    className="w-full rounded-xl px-5 py-3 text-sm font-bold outline-none border transition-all"
                                    style={{ background: 'var(--bg-main)', borderColor: 'rgba(255,255,255,0.08)', color: 'var(--text-main)' }}
                                    onChange={e => handleChange(param.key, e.target.value)} defaultValue="">
                                    <option value="" disabled>Seleccionar...</option>
                                    {param.options.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                            ) : (
                                <input type={param.type} required placeholder={param.placeholder}
                                    min={param.min} max={param.max} step={param.step || (param.type === 'number' ? '0.01' : undefined)}
                                    className="w-full rounded-xl px-5 py-3 text-sm font-bold outline-none border transition-all"
                                    style={{
                                        background: 'var(--bg-main)',
                                        borderColor: (param.key === 'capital' || param.key === 'totalCapital') && isReal && capitalValue > userBalanceUSD
                                            ? '#f8717160' : 'rgba(255,255,255,0.08)',
                                        color: 'var(--text-main)'
                                    }}
                                    onChange={e => handleChange(param.key, e.target.value)}
                                />
                            )}
                            {isReal && (param.key === 'capital' || param.key === 'totalCapital') && capitalValue > 0 && (
                                <p className="text-[8px] mt-1 ml-1 font-black" style={{ color: capitalValue > userBalanceUSD ? '#f87171' : '#4ade80' }}>
                                    {capitalValue > userBalanceUSD
                                        ? `⚠ Excede tu saldo de $${userBalanceUSD.toFixed(2)}`
                                        : `✓ Saldo restante: $${(userBalanceUSD - capitalValue).toFixed(2)} USDT`}
                                </p>
                            )}
                        </div>
                    ))}

                    {error && (
                        <div className="px-4 py-3 rounded-xl flex items-center gap-2 bg-red-500/10 border border-red-500/30">
                            <IconWarn /><p className="text-xs font-black text-red-400">{error}</p>
                        </div>
                    )}

                    <div className="pt-2 flex gap-3">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest border transition-all hover:bg-white/5"
                            style={{ color: 'var(--text-soft)', borderColor: 'rgba(255,255,255,0.08)' }}>
                            Cancelar
                        </button>
                        <button type="submit" disabled={saving || insufficientFunds}
                            className="flex-1 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest text-black transition-all hover:scale-[1.02] active:scale-95 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            style={{ background: isReal ? '#4ade80' : bot.color, boxShadow: `0 8px 30px ${isReal ? '#4ade8040' : bot.color + '40'}` }}>
                            {saving ? '⏳ Iniciando...' : isReal ? '🚀 Activar en Real' : '🧪 Activar en Demo'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─── Catalog Card ─────────────────────────────────────────────────
const CatalogCard = ({ bot, onSelect }) => (
    <div onClick={() => onSelect(bot)}
        className="relative rounded-[2rem] border overflow-hidden group transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl cursor-pointer"
        style={{ background: bot.gradient, borderColor: bot.border }}>
        <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background: `linear-gradient(90deg,transparent,${bot.color},transparent)` }} />
        <div className="p-7">
            <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center border transition-all group-hover:scale-110"
                        style={{ background: `${bot.color}20`, borderColor: bot.border, color: bot.color }}>
                        {bot.icon}
                    </div>
                    <div>
                        <h3 className="text-base font-black uppercase italic tracking-tight" style={{ color: 'var(--text-main)' }}>{bot.name}</h3>
                        <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                            style={{ background: `${bot.tagColor}20`, color: bot.tagColor, border: `1px solid ${bot.tagColor}30` }}>
                            {bot.tag}
                        </span>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[7px] font-black uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-soft)' }}>Est. APY</p>
                    <p className="text-sm font-black" style={{ color: bot.color }}>{bot.estAPY}</p>
                </div>
            </div>

            <p className="text-xs leading-relaxed mb-5 font-medium" style={{ color: 'var(--text-soft)' }}>{bot.description}</p>

            <div className="grid grid-cols-3 gap-2 mb-5">
                {[{ l: 'Estrategia', v: bot.strategy }, { l: 'Riesgo', v: bot.risk }, { l: 'Capital Min', v: `$${bot.minCapital}` }].map(s => (
                    <div key={s.l} className="rounded-xl p-3 text-center" style={{ background: 'var(--bg-main)' }}>
                        <p className="text-[7px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--text-soft)' }}>{s.l}</p>
                        <p className="text-[10px] font-black uppercase" style={{ color: 'var(--text-main)' }}>{s.v}</p>
                    </div>
                ))}
            </div>

            {/* Dual launch buttons */}
            <div className="grid grid-cols-2 gap-2">
                <button onClick={e => { e.stopPropagation(); onSelect(bot, 'demo'); }}
                    className="py-3 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all hover:scale-105"
                    style={{ background: '#0ea5e920', color: '#38bdf8', border: '1px solid #0ea5e940' }}>
                    <IconFlask /> Demo
                </button>
                <button onClick={e => { e.stopPropagation(); onSelect(bot, 'real'); }}
                    className="py-3 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all hover:scale-105"
                    style={{ background: '#16a34a20', color: '#4ade80', border: '1px solid #16a34a40' }}>
                    <IconLive /> Real
                </button>
            </div>
        </div>
    </div>
);

// ─── Main Component ───────────────────────────────────────────────
const BotZoneContent = () => {
    const { currentUser } = useAuth();
    const [tab, setTab] = useState('catalog');
    const [filterMode, setFilterMode] = useState('all'); // 'all' | 'demo' | 'real'
    const [selectedBot, setSelectedBot] = useState(null);
    const [botMode, setBotMode] = useState('demo');
    const [instances, setInstances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userBalanceUSD, setUserBalanceUSD] = useState(0);
    const [notification, setNotification] = useState(null);

    const notify = useCallback((msg, type = 'success') => {
        setNotification({ msg, type });
        setTimeout(() => setNotification(null), 3500);
    }, []);

    // Load user balance
    useEffect(() => {
        if (!currentUser?.uid) return;
        getDoc(doc(db, 'users', currentUser.uid)).then(snap => {
            if (snap.exists()) setUserBalanceUSD(parseFloat(snap.data().balanceUSD || 0));
        });
    }, [currentUser]);

    // Load bot instances
    useEffect(() => {
        if (!currentUser?.uid) { setLoading(false); return; }
        const q = query(collection(db, 'userBots'), where('userId', '==', currentUser.uid));
        const unsub = onSnapshot(q, snap => {
            setInstances(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        }, () => setLoading(false));
        return () => unsub();
    }, [currentUser]);

    const handleSelectBot = (bot, presetMode) => {
        setSelectedBot(bot);
        if (presetMode) setBotMode(presetMode);
    };

    const handleSaveBot = async ({ botId, botName, config, mode }) => {
        try {
            const capital = parseFloat(config.capital || config.totalCapital || config.amountPerOrder || 0);
            if (mode === 'real' && capital > userBalanceUSD) throw new Error('Fondos insuficientes');

            await addDoc(collection(db, 'userBots'), {
                userId: currentUser.uid,
                botId, botName, config, mode,
                status: 'running',
                pnlPercent: 0,
                capitalLocked: mode === 'real' ? capital : 0,
                createdAt: serverTimestamp(),
            });

            // If real mode, optionally update balance (simulation)
            if (mode === 'real' && capital > 0) {
                const userRef = doc(db, 'users', currentUser.uid);
                await updateDoc(userRef, { balanceUSD: userBalanceUSD - capital });
                setUserBalanceUSD(prev => prev - capital);
            }

            setSelectedBot(null);
            setTab('active');
            notify(`✅ ${botName} activado en modo ${mode === 'real' ? 'REAL 🟢' : 'DEMO 🧪'}`);
        } catch (err) {
            notify(`❌ ${err.message}`, 'error');
        }
    };

    const handleToggle = async (instance) => {
        const newStatus = instance.status === 'running' ? 'paused' : 'running';
        await updateDoc(doc(db, 'userBots', instance.id), { status: newStatus });
        notify(newStatus === 'running' ? '▶ Bot reanudado' : '⏸ Bot pausado');
    };

    const handleDelete = async (id) => {
        const inst = instances.find(i => i.id === id);
        await deleteDoc(doc(db, 'userBots', id));
        // Return capital if real
        if (inst?.mode === 'real' && inst?.capitalLocked > 0) {
            const userRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userRef, { balanceUSD: userBalanceUSD + inst.capitalLocked });
            setUserBalanceUSD(prev => prev + inst.capitalLocked);
        }
        notify('🗑 Bot eliminado y capital liberado');
    };

    const demoCount = instances.filter(i => i.mode === 'demo').length;
    const realCount = instances.filter(i => i.mode === 'real').length;
    const runningCount = instances.filter(i => i.status === 'running').length;

    const filteredInstances = filterMode === 'all' ? instances
        : instances.filter(i => i.mode === filterMode);

    return (
        <div className="w-full min-h-screen p-4 md:p-8 animate-in fade-in duration-500" style={{ maxWidth: '1400px', margin: '0 auto' }}>

            {/* Notification */}
            {notification && (
                <div className="fixed top-6 right-6 z-[1001] px-6 py-4 rounded-2xl text-sm font-black shadow-2xl border animate-in slide-in-from-right-4 duration-300"
                    style={{
                        background: notification.type === 'error' ? '#450a0a' : 'var(--bg-card)',
                        borderColor: notification.type === 'error' ? '#f8717140' : 'var(--accent)',
                        color: notification.type === 'error' ? '#fca5a5' : 'var(--accent)',
                    }}>
                    {notification.msg}
                </div>
            )}

            {/* ── Header ── */}
            <div className="mb-8">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 mb-6">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                                style={{ background: 'var(--accent)15', color: 'var(--accent)', border: '1px solid var(--accent)35' }}>
                                <IconBot />
                            </div>
                            <h1 className="text-3xl font-black uppercase italic tracking-tighter" style={{ color: 'var(--text-main)' }}>
                                Zona de Bots
                            </h1>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--text-soft)' }}>
                            Trading Spot Automatizado · Modo Demo & Real
                        </p>
                    </div>

                    {/* Stats */}
                    <div className="flex gap-3 flex-wrap">
                        {[
                            { label: 'Running', value: runningCount, color: '#4ade80' },
                            { label: 'Demo', value: demoCount, color: '#38bdf8' },
                            { label: 'Real', value: realCount, color: '#4ade80' },
                            { label: 'Balance', value: `$${userBalanceUSD.toFixed(0)}`, color: 'var(--accent)' },
                        ].map(s => (
                            <div key={s.label} className="text-center px-5 py-3 rounded-2xl border"
                                style={{ background: 'var(--bg-card)', borderColor: 'rgba(255,255,255,0.05)' }}>
                                <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
                                <p className="text-[7px] font-black uppercase tracking-widest" style={{ color: 'var(--text-soft)' }}>{s.label}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex gap-1 p-1 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        {[
                            { key: 'catalog', label: 'Catálogo', count: BOT_CATALOG.length },
                            { key: 'active', label: 'Mis Bots', count: instances.length },
                        ].map(t => (
                            <button key={t.key} onClick={() => setTab(t.key)}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                                style={{
                                    background: tab === t.key ? 'var(--bg-sidebar)' : 'transparent',
                                    color: tab === t.key ? 'var(--accent)' : 'var(--text-soft)',
                                }}>
                                {t.label}
                                <span className="px-1.5 py-0.5 rounded-full text-[7px]"
                                    style={{ background: tab === t.key ? 'var(--accent)20' : 'rgba(255,255,255,0.05)', color: tab === t.key ? 'var(--accent)' : 'var(--text-soft)' }}>
                                    {t.count}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Mode filter (only in active tab) */}
                    {tab === 'active' && (
                        <div className="flex gap-1 p-1 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            {[{ k: 'all', l: 'Todos' }, { k: 'demo', l: 'Demo' }, { k: 'real', l: 'Real' }].map(f => (
                                <button key={f.k} onClick={() => setFilterMode(f.k)}
                                    className="px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                                    style={{
                                        background: filterMode === f.k ? (f.k === 'real' ? '#16a34a30' : f.k === 'demo' ? '#0ea5e930' : 'var(--bg-sidebar)') : 'transparent',
                                        color: filterMode === f.k ? (f.k === 'real' ? '#4ade80' : f.k === 'demo' ? '#38bdf8' : 'var(--accent)') : 'var(--text-soft)',
                                    }}>
                                    {f.l}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── CATALOG TAB ── */}
            {tab === 'catalog' && (
                <>
                    {/* Info row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                        <div className="flex gap-3 p-4 rounded-2xl items-start" style={{ background: '#0ea5e910', border: '1px solid #0ea5e930' }}>
                            <IconFlask />
                            <div>
                                <p className="text-sm font-black text-sky-400 mb-1">Modo Demo</p>
                                <p className="text-xs" style={{ color: 'var(--text-soft)' }}>
                                    Opera con capital virtual. Sin riesgo. Perfecto para practicar estrategias y ver cómo funciona cada bot antes de invertir.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3 p-4 rounded-2xl items-start" style={{ background: '#16a34a10', border: '1px solid #16a34a30' }}>
                            <IconLive />
                            <div>
                                <p className="text-sm font-black text-emerald-400 mb-1">Modo Real</p>
                                <p className="text-xs" style={{ color: 'var(--text-soft)' }}>
                                    Opera con tu saldo real ({`$${userBalanceUSD.toFixed(2)} USDT disponibles`}). Las ganancias y pérdidas afectarán tu balance directamente.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {BOT_CATALOG.map(bot => <CatalogCard key={bot.id} bot={bot} onSelect={handleSelectBot} />)}
                    </div>
                </>
            )}

            {/* ── ACTIVE BOTS TAB ── */}
            {tab === 'active' && (
                <div>
                    {loading ? (
                        <div className="text-center py-20" style={{ color: 'var(--text-soft)' }}>
                            <div className="w-10 h-10 border-2 rounded-full animate-spin mx-auto mb-4"
                                style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
                            <p className="text-xs font-black uppercase tracking-widest">Cargando bots...</p>
                        </div>
                    ) : filteredInstances.length === 0 ? (
                        <div className="text-center py-24">
                            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 border"
                                style={{ background: 'var(--accent)10', borderColor: 'var(--accent)30', color: 'var(--accent)' }}>
                                <IconBot />
                            </div>
                            <h3 className="text-xl font-black uppercase italic tracking-tighter mb-3" style={{ color: 'var(--text-main)' }}>
                                {filterMode === 'all' ? 'Sin bots configurados' : `Sin bots en modo ${filterMode}`}
                            </h3>
                            <p className="text-xs font-bold mb-8" style={{ color: 'var(--text-soft)' }}>
                                Ve al catálogo y activa tu primer bot de trading spot.
                            </p>
                            <button onClick={() => setTab('catalog')}
                                className="px-10 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-black transition-all hover:scale-105 shadow-2xl"
                                style={{ background: 'var(--accent)', boxShadow: '0 12px 40px var(--accent)25' }}>
                                Ver Catálogo →
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {filteredInstances.map(inst => (
                                <ActiveBotCard key={inst.id} instance={inst} onToggle={handleToggle} onDelete={handleDelete} />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Config Modal ── */}
            {selectedBot && (
                <BotConfigModal
                    bot={selectedBot}
                    mode={botMode}
                    userBalanceUSD={userBalanceUSD}
                    onClose={() => setSelectedBot(null)}
                    onSave={handleSaveBot}
                />
            )}
        </div>
    );
};

export default BotZoneContent;
