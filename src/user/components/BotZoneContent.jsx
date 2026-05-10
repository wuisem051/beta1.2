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
            setInstances(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, [currentUser]);

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
                                        {instances.map(inst => (
                                            <tr key={inst.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                                                <td className="p-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-white">{inst.config?.pair || 'BTC/USDT'}</span>
                                                        <span className={`text-[8px] uppercase font-black ${inst.mode === 'demo' ? 'text-sky-400' : 'text-orange-400'}`}>{inst.mode} mode</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 opacity-50">{inst.createdAt?.toDate().toLocaleString() || 'Reciente...'}</td>
                                                <td className="p-4 font-bold">{inst.config?.capital} USDT</td>
                                                <td className="p-4 text-[#00C087] font-bold">+0.701 USDT (+0.70%)</td>
                                                <td className="p-4 text-right">
                                                    <div className="flex justify-end gap-3">
                                                        <button onClick={() => handleDelete(inst.id, inst.config?.capital, inst.mode)} className="p-2 hover:bg-red-500/10 text-white/20 hover:text-red-500 rounded transition-all"><IconPower /></button>
                                                        <button className="p-2 hover:bg-white/5 text-white/20 hover:text-white rounded transition-all"><IconSettings /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
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
        </div>
    );
};

export default BotZoneContent;
