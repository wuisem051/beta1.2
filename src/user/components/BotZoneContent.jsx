import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import {
    collection, addDoc, query, where, onSnapshot,
    serverTimestamp, doc, updateDoc, deleteDoc
} from 'firebase/firestore';

// ─── Iconos ──────────────────────────────────────────────────────
const IconBot = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="2" /><path d="M12 7v4" /></svg>;
const IconPower = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10" /></svg>;
const IconSettings = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>;
const IconX = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M18 6L6 18M6 6l12 12" /></svg>;

const BOT_CATALOG = [
    {
        id: 'grid', name: 'Cuadrícula de spot', color: '#F3BA2F',
        params: [
            { key: 'pair', label: 'Par de trading', type: 'select', options: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'DOT/USDT'] },
            { key: 'range_min', label: 'Precio Inferior', type: 'number', placeholder: '70000' },
            { key: 'range_max', label: 'Precio Superior', type: 'number', placeholder: '83000' },
            { key: 'grids', label: 'Número de Grillas', type: 'number', placeholder: '10' },
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

            // Initialize live stats for new bots
            setLiveStats(prev => {
                const next = { ...prev };
                data.forEach(b => {
                    if (!next[b.id]) {
                        next[b.id] = { pnl: 0, gridHits: 0, history: [] }; // No random negative starts
                    }
                });
                return next;
            });
        });
        return () => unsub();
    }, [currentUser]);

    // Live Trading Engine: Accurately mimics grid execution without wild UI jitter
    useEffect(() => {
        const interval = setInterval(() => {
            setLiveStats(prev => {
                const next = { ...prev };
                Object.keys(next).forEach(id => {
                    // Grid bots only hit periodically, and the grid PnL should accumulate stably
                    // Simulate 10% chance of a grid match every 3 seconds to generate realistic activity
                    if (Math.random() > 0.9) {
                        const profit = parseFloat((Math.random() * 0.05 + 0.01).toFixed(6));
                        const buyPrice = 80000 - Math.random() * 500;
                        const sellPrice = buyPrice + (profit / 0.00009); // basic math to make limits realistic
                        const timestamp = new Date();

                        const newMatch = {
                            id: Math.random().toString(36).substring(7),
                            time: timestamp.toLocaleString(),
                            profit: profit.toFixed(8) + ' USDT',
                            sell: {
                                time: timestamp.toLocaleString(),
                                type: 'Venta',
                                price: sellPrice.toFixed(2),
                                amount: '0.00009',
                                total: (0.00009 * sellPrice).toFixed(6) + ' USDT',
                                fee: (0.00009 * sellPrice * 0.001).toFixed(8) + ' USDT'
                            },
                            buy: {
                                time: new Date(timestamp.getTime() - 4500000).toLocaleString(), // 75 mins prior
                                type: 'Compra',
                                price: buyPrice.toFixed(2),
                                amount: '0.00009',
                                total: (0.00009 * buyPrice).toFixed(6) + ' USDT',
                                fee: '0.00000009 BTC' // Standard BNB/Crypto fee representation
                            }
                        };

                        next[id].pnl += profit;
                        next[id].gridHits += 1;
                        next[id].history = [newMatch, ...(next[id].history || [])].slice(0, 50); // keep last 50
                    }
                });
                return next;
            });
        }, 3000);
        return () => clearInterval(interval);
    }, []);

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
        <div className="w-full min-h-screen bg-[#0b0e11] text-[#eaecef] p-2 md:p-4 font-sans">

            {tab === 'catalog' ? (
                <div className="max-w-7xl mx-auto py-10">
                    <h1 className="text-3xl font-black mb-10 text-white italic">ZONA DE BOTS</h1>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {BOT_CATALOG.map(bot => (
                            <div key={bot.id} onClick={() => { setSelectedBot(bot); setTab('config'); }} className="bg-[#1e2329] p-8 rounded-3xl border border-white/5 hover:border-[#F3BA2F]/30 transition-all cursor-pointer group">
                                <div className="p-4 bg-white/5 text-[#F3BA2F] rounded-2xl w-fit mb-6 group-hover:scale-110 transition-transform"><IconBot /></div>
                                <h3 className="text-xl font-bold mb-2">{bot.name}</h3>
                                <p className="text-xs text-[#848e9c] mb-6">Automatiza tus ganancias en el mercado spot.</p>
                                <span className="text-[10px] font-black text-[#F3BA2F] uppercase">Configurar →</span>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="flex h-[calc(100vh-40px)] gap-2">
                    {/* LEFT: Chart + Table */}
                    <div className="flex-1 flex flex-col gap-2">
                        {/* Chart */}
                        <div className="flex-[2] bg-[#1e2329] rounded-xl overflow-hidden border border-white/5 relative">
                            <div className="absolute top-4 left-4 z-10 flex gap-2">
                                <button onClick={() => setTab('catalog')} className="px-3 py-1 bg-black/40 hover:bg-black/60 rounded text-[10px] font-bold border border-white/10 uppercase">← Volver</button>
                            </div>
                            <iframe
                                src={`https://s.tradingview.com/widgetembed/?symbol=BINANCE:${(selectedBot?.params?.find(p => p.key === 'pair')?.options[0] || 'BTC/USDT').replace('/', '')}&interval=15&theme=dark&style=1&locale=es`}
                                style={{ width: '100%', height: '100%', border: 'none' }}
                            />
                        </div>

                        {/* Instances Table (Below Chart) */}
                        <div className="flex-1 bg-[#1e2329] rounded-xl border border-white/5 overflow-hidden flex flex-col">
                            <div className="flex gap-6 px-6 border-b border-white/5">
                                <button className="py-3 text-[10px] font-black uppercase text-[#F3BA2F] border-b-2 border-[#F3BA2F]">Ejecutando ({instances.length})</button>
                                <button className="py-3 text-[10px] font-black uppercase text-[#848e9c]">Historial</button>
                                <button className="py-3 text-[10px] font-black uppercase text-[#848e9c]">Análisis de PnL</button>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                <table className="w-full text-left text-[10px] border-collapse">
                                    <thead className="sticky top-0 bg-[#1e2329] text-[#848e9c] border-b border-white/5">
                                        <tr>
                                            <th className="p-4 font-bold uppercase">Par</th>
                                            <th className="p-4 font-bold uppercase">Fecha de creación</th>
                                            <th className="p-4 font-bold uppercase">Inversión total</th>
                                            <th className="p-4 font-bold uppercase">Ganancias totales</th>
                                            <th className="p-4 font-bold uppercase text-right">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {instances.map(inst => {
                                            const stat = liveStats[inst.id] || { pnl: 0, gridHits: 0 };
                                            const capital = parseFloat(inst.config?.capital || 0);
                                            const pnlPct = capital > 0 ? (stat.pnl / capital) * 100 : 0;
                                            const isProfit = stat.pnl >= 0;

                                            return (
                                                <tr key={inst.id} className="border-b border-white/5 hover:bg-white/[0.02] cursor-pointer" onClick={() => setDetailedBot({ ...inst, stat })}>
                                                    <td className="p-4">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-white">{inst.config?.pair || 'BTC/USDT'}</span>
                                                            <span className={`text-[8px] uppercase font-black ${inst.mode === 'demo' ? 'text-sky-400' : 'text-[#F3BA2F]'}`}>{inst.mode} mode</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 opacity-50">{inst.createdAt?.toDate().toLocaleString() || 'Reciente...'}</td>
                                                    <td className="p-4 font-bold">{capital.toFixed(2)} USDT</td>
                                                    <td className={`p-4 font-bold ${isProfit ? 'text-[#00C087]' : 'text-red-500'}`}>
                                                        {isProfit ? '+' : ''}{stat.pnl.toFixed(4)} USDT ({isProfit ? '+' : ''}{pnlPct.toFixed(2)}%)
                                                    </td>
                                                    <td className="p-4 text-right" onClick={e => e.stopPropagation()}>
                                                        <div className="flex justify-end gap-3">
                                                            <button onClick={() => handleDelete(inst.id, inst.config?.capital, inst.mode)} className="p-2 hover:bg-red-500/10 text-white/20 hover:text-red-500 rounded transition-all"><IconPower /></button>
                                                            <button onClick={() => setDetailedBot({ ...inst, stat })} className="p-2 hover:bg-white/5 text-white/20 hover:text-white rounded transition-all"><IconSettings /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {instances.length === 0 && (
                                            <tr><td colSpan="5" className="p-20 text-center opacity-30 italic">No hay bots activos en este momento.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Config Panel */}
                    <div className="w-[360px] bg-[#1e2329] rounded-xl border border-white/5 p-6 flex flex-col overflow-y-auto">
                        <div className="mb-6">
                            <h2 className="text-sm font-black uppercase text-[#F3BA2F] mb-4">Configurar Bot</h2>

                            {/* Mode Toggle Demo / Real */}
                            <div className="flex bg-black/40 rounded-lg p-1 mb-8">
                                <button onClick={() => setMode('demo')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded ${mode === 'demo' ? 'bg-[#2b3139] text-sky-400 border border-sky-400/20' : 'text-[#848e9c]'}`}>DEMO</button>
                                <button onClick={() => setMode('real')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded ${mode === 'real' ? 'bg-[#2b3139] text-[#F3BA2F] border border-[#F3BA2F]/20' : 'text-[#848e9c]'}`}>REAL</button>
                            </div>
                        </div>

                        <form onSubmit={handleCreateBot} className="space-y-6 flex-1">
                            {selectedBot?.params.map(p => (
                                <div key={p.key} className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-[#848e9c]">{p.label}</label>
                                    {p.type === 'select' ? (
                                        <select name={p.key} className="w-full bg-[#2b3139] border border-white/5 rounded-lg px-4 py-3 text-xs font-bold outline-none focus:border-[#F3BA2F]/40">
                                            {p.options.map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    ) : p.type === 'capital-slider' ? (
                                        <div className="space-y-3">
                                            <input type="number" name="capital" required placeholder="0" className="w-full bg-[#2b3139] border border-white/5 rounded-lg px-4 py-3 text-xs font-bold outline-none focus:border-[#F3BA2F]/40" />
                                            <div className="flex gap-1">
                                                {[25, 50, 75, 100].map(per => <button type="button" key={per} className="flex-1 py-2 rounded bg-white/5 text-[9px] font-bold hover:bg-white/10">{per}%</button>)}
                                            </div>
                                            <div className="flex justify-between text-[9px] font-bold">
                                                <span className="text-[#848e9c]">Disponible:</span>
                                                <span className={mode === 'real' ? 'text-[#00C087]' : 'text-sky-400'}>
                                                    {mode === 'real' ? `$${balance.toFixed(2)} USDT` : '$10,000 (DEMO)'}
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <input type={p.type} name={p.key} required placeholder={p.placeholder} className="w-full bg-[#2b3139] border border-white/5 rounded-lg px-4 py-3 text-xs font-bold outline-none focus:border-[#F3BA2F]/40" />
                                    )}
                                </div>
                            ))}

                            <div className="pt-8">
                                <button type="submit" className={`w-full py-4 rounded-xl font-black uppercase italic tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl ${mode === 'real' ? 'bg-[#F3BA2F] text-black shadow-[#F3BA2F]/10' : 'bg-sky-500 text-white shadow-sky-500/10'}`}>
                                    Activar Bot {mode.toUpperCase()}
                                </button>
                            </div>
                        </form>
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
                                                        const buyPrice = rangeMax - ((i + 1) * step);
                                                        const sellPrice = rangeMax + ((i + 1) * step);
                                                        const hasBuy = i < buyCount;
                                                        const hasSell = i < sellCount;

                                                        return (
                                                            <div key={i} className="flex w-full items-center py-2 hover:bg-white/5 border-b border-white/5 border-dashed">
                                                                <div className="flex-1 text-white opacity-80">
                                                                    {hasBuy ? `-${(i * 0.5 + 0.42).toFixed(2)}%` : ''}
                                                                </div>
                                                                <div className="w-fit flex items-center justify-center gap-2">
                                                                    <span className="text-[#00C087] w-14 text-right pr-2">{hasBuy ? buyPrice.toFixed(2) : '--'}</span>
                                                                    <span className="text-[#848e9c] font-black text-[9px]">{i + 1}</span>
                                                                    <span className="text-red-500 w-14 text-left pl-2">{hasSell ? sellPrice.toFixed(2) : '--'}</span>
                                                                </div>
                                                                <div className="flex-1 text-right text-white opacity-80">
                                                                    {hasSell ? `${(i * 0.5 + 0.64).toFixed(2)}%` : ''}
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
