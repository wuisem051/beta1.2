import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import {
    collection, addDoc, query, where, onSnapshot,
    serverTimestamp, doc, updateDoc, deleteDoc
} from 'firebase/firestore';

// ─── Iconos ──────────────────────────────────────────────────────
const IconStats = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M12 20V10M18 20V4M6 20v-4" /></svg>;
const IconBot = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="2" /><path d="M12 7v4" /></svg>;
const IconChevron = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3"><path d="m9 18 6-6-6-6" /></svg>;

const BOT_CATALOG = [
    {
        id: 'grid', name: 'Cuadrícula de spot', color: '#F3BA2F',
        desc: 'Compra bajo y vende alto en rangos definidos.',
        stats: { risk: 'Bajo', pairs: 'Todos' },
        params: [
            { key: 'pair', label: 'Par de trading', type: 'select', options: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'] },
            { key: 'range_min', label: 'Precio Inferior', type: 'number', placeholder: 'Ej: 60000' },
            { key: 'range_max', label: 'Precio Superior', type: 'number', placeholder: 'Ej: 75000' },
            { key: 'grids', label: 'Número de Grillas', type: 'number', placeholder: '2-170' },
            { key: 'capital', label: 'Inversión (USDT)', type: 'capital-slider' }
        ]
    },
    {
        id: 'dca', name: 'DCA de spot', color: '#00C087',
        desc: 'Inversión recurrente para promediar coste de entrada.',
        stats: { risk: 'Muy Bajo', pairs: 'Principales' },
        params: [
            { key: 'pair', label: 'Par de trading', type: 'select', options: ['BTC/USDT', 'ETH/USDT'] },
            { key: 'interval', label: 'Intervalo', type: 'select', options: ['Diario', 'Semanal', 'Cada 4h'] },
            { key: 'amount', label: 'Monto por orden', type: 'number' },
            { key: 'capital', label: 'Inversión total', type: 'capital-slider' }
        ]
    },
    {
        id: 'rebalance', name: 'Bot de Reequilibrio', color: '#60a5fa',
        desc: 'Mantiene las proporciones de tu portafolio automáticamente.',
        stats: { risk: 'Bajo', pairs: 'Portfolio' },
        params: [
            { key: 'assets', label: 'Monedas (BTC/ETH/USDT)', type: 'text', placeholder: 'Ej: BTC 50%, ETH 50%' },
            { key: 'capital', label: 'Inversión total', type: 'capital-slider' }
        ]
    }
];

// ─── Componentes Pequeños ────────────────────────────────────────
const StatBox = ({ label, value, sub, color = 'white' }) => (
    <div className="flex flex-col gap-1 border-r border-white/5 pr-10 last:border-0">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#848e9c]">{label}</span>
        <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tighter" style={{ color }}>{value}</span>
            {sub && <span className="text-[10px] font-bold text-[#00C087]">{sub}</span>}
        </div>
    </div>
);

// ─── Main Component ──────────────────────────────────────────────
const BotZoneContent = () => {
    const { currentUser } = useAuth();
    const [tab, setTab] = useState('catalog');
    const [selectedBot, setSelectedBot] = useState(null);
    const [instances, setInstances] = useState([]);
    const [balance, setBalance] = useState(0);
    const [loading, setLoading] = useState(true);
    const [notification, setNotification] = useState(null);

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
        if (!currentUser?.uid) { setLoading(false); return; }
        const q = query(collection(db, 'userBots'), where('userId', '==', currentUser.uid));
        const unsub = onSnapshot(q, snap => {
            setInstances(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        }, () => setLoading(false));
        return () => unsub();
    }, [currentUser]);

    const handleSaveBot = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const config = Object.fromEntries(formData);
        const capital = parseFloat(config.capital || config.amount || 0);

        if (capital > balance) return notify("Saldo insuficiente", "error");

        try {
            await addDoc(collection(db, 'userBots'), {
                userId: currentUser.uid,
                botId: selectedBot.id,
                botName: selectedBot.name,
                config,
                status: 'running',
                createdAt: serverTimestamp()
            });

            if (capital > 0) {
                await updateDoc(doc(db, 'users', currentUser.uid), { balanceUSD: balance - capital });
            }

            setTab('active');
            setSelectedBot(null);
            notify("🚀 Bot activado con éxito");
        } catch (err) { notify(err.message, "error"); }
    };

    const handleDelete = async (id, capital = 0) => {
        await deleteDoc(doc(db, 'userBots', id));
        if (capital > 0) {
            await updateDoc(doc(db, 'users', currentUser.uid), { balanceUSD: balance + parseFloat(capital) });
        }
        notify("🗑 Bot eliminado y capital devuelto");
    };

    if (!currentUser) return <div className="p-20 text-center text-white">Inicia sesión para continuar.</div>;

    return (
        <div className="w-full min-h-screen bg-[#0b0e11] text-[#eaecef] p-4 md:p-8 font-sans">
            {/* Header / Stats */}
            {tab !== 'config' && (
                <div className="max-w-7xl mx-auto mb-10 animate-in fade-in duration-500">
                    <h1 className="text-3xl font-black mb-8 text-white tracking-tight italic">BOTS DE TRADING SPOT</h1>

                    <div className="flex flex-col lg:flex-row justify-between gap-6">
                        <div className="flex flex-wrap gap-2 items-center bg-[#1e2329] p-8 rounded-3xl border border-white/5 flex-1">
                            <StatBox label="Saldo Estimado" value={`$${Number(balance).toLocaleString()}`} />
                            <StatBox label="PnL 24h" value="+$0.00" sub="(+0.00%)" color="#00C087" />
                            <StatBox label="Bots Operando" value={instances.length} />
                        </div>

                        {/* Promo Card */}
                        <div className="bg-[#F3BA2F] text-black p-6 rounded-3xl w-full lg:w-96 flex justify-between items-center relative overflow-hidden group cursor-pointer">
                            <div className="relative z-10">
                                <h3 className="text-lg font-black leading-tight mb-2">MAXI AI TRADING</h3>
                                <p className="text-[10px] font-bold opacity-70 mb-4">Gana mientras duermes con algoritmos VIP.</p>
                                <span className="text-[10px] font-black uppercase flex items-center gap-2">Explorar más <IconChevron /></span>
                            </div>
                            <div className="opacity-20 absolute -right-4 -bottom-4 group-hover:scale-110 transition-all">
                                <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Config View (Split View) */}
            {tab === 'config' && selectedBot && (
                <div className="max-w-7xl mx-auto h-[750px] flex gap-4 animate-in fade-in slide-in-from-right-4 duration-500">
                    {/* Left: Secure Chart Iframe */}
                    <div className="flex-1 bg-[#1e2329] rounded-3xl overflow-hidden border border-white/5">
                        <iframe
                            src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_762ae&symbol=BINANCE:BTCUSDT&interval=15&hidesidetoolbar=1&hidetoptoolbar=1&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=%5B%5D&theme=dark&style=1&timezone=Etc%2FUTC&studies_overrides=%7B%7D&overrides=%7B%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=es&utm_source=localhost&utm_medium=widget&utm_campaign=chart&utm_term=BINANCE%3ABTCUSDT`}
                            style={{ width: '100%', height: '100%', border: 'none' }}
                        />
                    </div>

                    {/* Right: Config Panel */}
                    <div className="w-[400px] bg-[#1e2329] rounded-3xl border border-white/5 p-8 overflow-y-auto">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div style={{ color: selectedBot.color }}><IconBot /></div>
                                <h2 className="font-black uppercase tracking-tighter">{selectedBot.name}</h2>
                            </div>
                            <button onClick={() => { setTab('catalog'); setSelectedBot(null); }} className="text-[#848e9c] hover:text-white transition-colors">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-4 h-4"><path d="M18 6 6 18M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <form onSubmit={handleSaveBot} className="space-y-6">
                            {selectedBot.params.map(p => (
                                <div key={p.key} className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#848e9c] block">{p.label}</label>
                                    {p.type === 'select' ? (
                                        <select name={p.key} className="w-full bg-black/30 border border-white/5 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-[#F3BA2F]/50">
                                            {p.options.map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    ) : p.type === 'capital-slider' ? (
                                        <div className="space-y-3">
                                            <input type="number" name="capital" required placeholder="0.00 USDT" className="w-full bg-black/30 border border-white/5 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-[#F3BA2F]/50" />
                                            <div className="flex justify-between gap-1">
                                                {[25, 50, 75, 100].map(pct => (
                                                    <button type="button" key={pct} className="flex-1 py-2 rounded-lg bg-white/5 text-[9px] font-bold hover:bg-[#F3BA2F]/20 hover:text-[#F3BA2F] transition-all">{pct}%</button>
                                                ))}
                                            </div>
                                            <p className="text-[9px] font-bold text-[#848e9c] flex justify-between"><span>Disponible:</span> <span className="text-[#00C087]">${balance.toFixed(2)} USDT</span></p>
                                        </div>
                                    ) : (
                                        <input type={p.type} name={p.key} required placeholder={p.placeholder} className="w-full bg-black/30 border border-white/5 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-[#F3BA2F]/50" />
                                    )}
                                </div>
                            ))}
                            <button type="submit" className="w-full py-4 bg-[#F3BA2F] text-black font-black uppercase italic tracking-widest rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-[#F3BA2F]/10">
                                Activar Bot
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Catalog Grid */}
            {tab === 'catalog' && (
                <div className="max-w-7xl mx-auto space-y-6">
                    <div className="flex gap-4 border-b border-white/5 pb-4">
                        <button onClick={() => setTab('catalog')} className={`text-xs font-black uppercase tracking-widest ${tab === 'catalog' ? 'text-[#F3BA2F]' : 'text-[#848e9c]'}`}>Marketplace</button>
                        <button onClick={() => setTab('active')} className={`text-xs font-black uppercase tracking-widest ${tab === 'active' ? 'text-[#F3BA2F]' : 'text-[#848e9c]'}`}>Historial ({instances.length})</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {BOT_CATALOG.map(bot => (
                            <div key={bot.id} onClick={() => { setSelectedBot(bot); setTab('config'); }} className="bg-[#1e2329] p-8 rounded-3xl border border-white/5 hover:border-white/20 transition-all group cursor-pointer">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="p-4 bg-white/5 text-white/50 group-hover:bg-[#F3BA2F]/10 group-hover:text-[#F3BA2F] rounded-2xl transition-all">
                                        <IconBot />
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] font-bold text-[#848e9c] uppercase block">Riesgo</span>
                                        <span className="text-xs font-bold" style={{ color: bot.color }}>{bot.stats.risk}</span>
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold mb-3 text-white">{bot.name}</h3>
                                <p className="text-xs text-[#848e9c] leading-relaxed mb-8">{bot.desc}</p>
                                <div className="flex justify-between items-center pt-6 border-t border-white/5">
                                    <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Trading Spot</span>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-[#F3BA2F]">Configurar →</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Active Bots List */}
            {tab === 'active' && (
                <div className="max-w-7xl mx-auto">
                    <div className="flex gap-4 border-b border-white/5 pb-4 mb-8">
                        <button onClick={() => setTab('catalog')} className="text-xs font-black uppercase tracking-widest text-[#848e9c]">Marketplace</button>
                        <button onClick={() => setTab('active')} className="text-xs font-black uppercase tracking-widest text-[#F3BA2F]">Historial ({instances.length})</button>
                    </div>

                    {instances.length === 0 ? (
                        <div className="text-center py-32 bg-[#1e2329] rounded-[3rem] border border-white/5">
                            <h2 className="text-2xl font-bold mb-2">No hay bots activos</h2>
                            <p className="text-sm opacity-40 mb-8">Selecciona una estrategia en el Marketplace para comenzar.</p>
                            <button onClick={() => setTab('catalog')} className="px-8 py-3 bg-[#F3BA2F] text-black font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all">Ir al catálogo</button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {instances.map(inst => (
                                <div key={inst.id} className="bg-[#1e2329] p-8 rounded-[2.5rem] border border-white/5 flex flex-col gap-6">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-[#F3BA2F]/10 text-[#F3BA2F] rounded-2xl"><IconBot /></div>
                                            <div>
                                                <h3 className="font-bold text-lg">{inst.botName}</h3>
                                                <span className="text-[9px] font-black text-[#00C087] uppercase tracking-widest">En ejecución</span>
                                            </div>
                                        </div>
                                        <button onClick={() => handleDelete(inst.id, inst.config?.capital)} className="p-3 text-white/10 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-all">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="bg-black/20 p-4 rounded-3xl">
                                            <p className="text-[8px] font-bold text-[#848e9c] uppercase mb-1">Capital</p>
                                            <p className="font-black text-xs text-white">${inst.config?.capital || '0.00'}</p>
                                        </div>
                                        <div className="bg-black/20 p-4 rounded-3xl">
                                            <p className="text-[8px] font-bold text-[#848e9c] uppercase mb-1">PnL</p>
                                            <p className="font-black text-xs text-[#00C087]">+2.15%</p>
                                        </div>
                                        <div className="bg-black/20 p-4 rounded-3xl">
                                            <p className="text-[8px] font-bold text-[#848e9c] uppercase mb-1">Par</p>
                                            <p className="font-black text-xs text-white">{inst.config?.pair || 'BTC/USDT'}</p>
                                        </div>
                                    </div>
                                    <div className="bg-[#F3BA2F]/10 h-1 rounded-full overflow-hidden">
                                        <div className="h-full bg-[#F3BA2F] w-2/3 animate-pulse" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {notification && (
                <div className="fixed bottom-10 right-10 z-[1000] px-8 py-4 bg-[#1e2329] border border-[#F3BA2F]/50 text-[#F3BA2F] rounded-2xl font-black text-sm shadow-2xl">
                    {notification.msg}
                </div>
            )}
        </div>
    );
};

export default BotZoneContent;
