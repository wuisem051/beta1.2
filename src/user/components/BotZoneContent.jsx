import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import {
    collection, addDoc, query, where, onSnapshot,
    serverTimestamp, doc, updateDoc, deleteDoc
} from 'firebase/firestore';

// Iconos simplificados (SVG Inline)
const IconBot = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="2" /><path d="M12 7v4M8 16h.01M16 16h.01" />
    </svg>
);

const BOT_CATALOG = [
    { id: 'grid', name: 'Cuadrícula de spot', desc: 'Compra bajo, vende alto en un rango.', color: '#F3BA2F' },
    { id: 'dca', name: 'DCA de spot', desc: 'Inversión recurrente promediada.', color: '#00C087' },
    { id: 'martingale', name: 'Martingale', desc: 'Doble inversión en caídas.', color: '#fbbf24' }
];

const BotZoneContent = () => {
    const { currentUser } = useAuth();
    const [tab, setTab] = useState('catalog');
    const [instances, setInstances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [balance, setBalance] = useState(0);
    const [error, setError] = useState(null);

    // Cargar Balance
    useEffect(() => {
        if (!currentUser?.uid) return;
        try {
            const unsub = onSnapshot(doc(db, 'users', currentUser.uid), snap => {
                if (snap.exists()) setBalance(snap.data().balanceUSD || 0);
            });
            return () => unsub();
        } catch (e) { console.error(e); }
    }, [currentUser]);

    // Cargar Bots
    useEffect(() => {
        if (!currentUser?.uid) { setLoading(false); return; }
        try {
            const q = query(collection(db, 'userBots'), where('userId', '==', currentUser.uid));
            const unsub = onSnapshot(q, snap => {
                setInstances(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                setLoading(false);
            }, (err) => {
                console.error("Firestore error:", err);
                setError("Error al cargar datos");
                setLoading(false);
            });
            return () => unsub();
        } catch (e) { setError(e.message); setLoading(false); }
    }, [currentUser]);

    if (!currentUser) return <div className="p-20 text-center text-white">Inicia sesión para continuar.</div>;
    if (error) return <div className="p-20 text-center text-red-500">{error}</div>;

    return (
        <div className="w-full min-h-screen bg-[#0b0e11] text-[#eaecef] p-4 md:p-10 font-sans">
            {/* Header Mini */}
            <div className="max-w-6xl mx-auto mb-10 flex flex-wrap gap-8 items-center bg-[#1e2329] p-8 rounded-3xl border border-white/5">
                <div className="flex items-center gap-4 border-r border-white/10 pr-8">
                    <div className="p-3 bg-[#F3BA2F]/10 text-[#F3BA2F] rounded-2xl"><IconBot /></div>
                    <div>
                        <h1 className="text-xl font-bold">Zona de Bots</h1>
                        <p className="text-[10px] uppercase font-bold tracking-widest text-[#848e9c]">MaxiOS Trading AI</p>
                    </div>
                </div>

                <div className="flex gap-10">
                    <div>
                        <p className="text-[8px] font-bold uppercase text-[#848e9c] mb-1">Saldo Disponible</p>
                        <p className="text-xl font-black">${Number(balance).toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="text-[8px] font-bold uppercase text-[#848e9c] mb-1">Bots Activos</p>
                        <p className="text-xl font-black">{instances.length}</p>
                    </div>
                </div>
            </div>

            {/* Menu */}
            <div className="max-w-6xl mx-auto flex gap-6 mb-8 border-b border-white/5">
                <button onClick={() => setTab('catalog')} className={`pb-4 text-xs font-bold uppercase tracking-widest ${tab === 'catalog' ? 'text-[#F3BA2F] border-b-2 border-[#F3BA2F]' : 'text-[#848e9c]'}`}>Catálogo</button>
                <button onClick={() => setTab('active')} className={`pb-4 text-xs font-bold uppercase tracking-widest ${tab === 'active' ? 'text-[#F3BA2F] border-b-2 border-[#F3BA2F]' : 'text-[#848e9c]'}`}>Mis Bots</button>
            </div>

            {/* Grid */}
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
                {tab === 'catalog' ? (
                    BOT_CATALOG.map(bot => (
                        <div key={bot.id} className="bg-[#1e2329] p-6 rounded-2xl border border-white/5 hover:border-[#F3BA2F]/30 transition-all cursor-pointer">
                            <h3 className="font-bold mb-2 text-white">{bot.name}</h3>
                            <p className="text-xs text-[#848e9c] mb-4">{bot.desc}</p>
                            <button className="text-[10px] font-bold text-[#F3BA2F] uppercase">Configurar →</button>
                        </div>
                    ))
                ) : (
                    instances.length === 0 ? (
                        <p className="col-span-full text-center py-10 opacity-50">No tienes bots activos aún.</p>
                    ) : (
                        instances.map(i => (
                            <div key={i.id} className="bg-[#1e2329] p-6 rounded-2xl border border-white/5">
                                <div className="flex justify-between mb-4">
                                    <h3 className="font-bold text-[#F3BA2F]">{i.botName}</h3>
                                    <span className="text-[8px] font-bold bg-green-500/20 text-green-400 px-2 py-1 rounded uppercase tracking-widest">Running</span>
                                </div>
                                <div className="flex justify-between text-[10px]">
                                    <span className="opacity-50">Capital: ${i.config?.capital || '—'}</span>
                                    <span className="text-[#00C087]">+0.00%</span>
                                </div>
                            </div>
                        ))
                    )
                )}
            </div>
        </div>
    );
};

export default BotZoneContent;
