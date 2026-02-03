import React, { useContext, useState, useEffect, useMemo } from 'react';
import { ThemeContext } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { FaChartLine, FaArrowUp, FaArrowDown, FaCubes, FaLock, FaExternalLinkAlt, FaCrown } from 'react-icons/fa';

const TradingPortfolioContent = ({ userBalances }) => {
    const { darkMode } = useContext(ThemeContext);
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(true);

    const [operations, setOperations] = useState([]);
    const [exchangeTrades, setExchangeTrades] = useState([]);
    const [arbitrageEarnings, setArbitrageEarnings] = useState(0);

    const isVIP = useMemo(() => {
        if (!userBalances || !userBalances.vipStatus || userBalances.vipStatus === 'none') return false;
        if (!userBalances.vipExpiry) return false;
        const now = new Date();
        const expiry = userBalances.vipExpiry.toDate ? userBalances.vipExpiry.toDate() : new Date(userBalances.vipExpiry);
        return expiry > now;
    }, [userBalances]);


    useEffect(() => {
        if (!currentUser?.uid) return;

        // Fetch Trading History from Firestore
        const qHistory = query(collection(db, 'tradingHistory'), where('userId', '==', currentUser.uid), orderBy('timestamp', 'desc'));
        const unsubscribeHistory = onSnapshot(qHistory, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setOperations(data);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching trading history:", err);
            setLoading(false);
        });

        // Fetch Real Exchange History 
        const fetchExchangeTrades = async () => {
            try {
                const idToken = await currentUser.getIdToken();
                // Consultamos historial general (podemos iterar por pares comunes o buscar una forma global)
                // Por ahora, traemos los de BTC para demostrar, o preparamos la lógica
                const response = await fetch('/.netlify/functions/getExchangeHistory', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
                    body: JSON.stringify({ symbol: 'BTC/USDT', exchange: 'binance', limit: 30 })
                });

                if (response.ok) {
                    const data = await response.json();
                    setExchangeTrades(data.map(t => ({
                        id: t.id,
                        date: new Date(t.timestamp).toLocaleString(),
                        pair: t.symbol,
                        type: 'Exchange ' + t.side,
                        side: t.side === 'buy' ? 'Compra' : 'Venta',
                        result: 'Ejecutada',
                        profit: "0.00", // Difícil de calcular sin precio de compra original en spot simple
                        isExchange: true
                    })));
                }
            } catch (e) {
                console.error("Error fetching exchange trades:", e);
            }
        };

        fetchExchangeTrades();

        // Fetch Arbitrage Earnings
        const qArb = query(collection(db, 'userArbitragePools'), where('userId', '==', currentUser.uid));
        const unsubscribeArb = onSnapshot(qArb, (snapshot) => {
            const earnings = snapshot.docs.reduce((sum, doc) => sum + (parseFloat(doc.data().earnings) || 0), 0);
            setArbitrageEarnings(earnings);
        });

        return () => {
            unsubscribeHistory();
            unsubscribeArb();
        };
    }, [currentUser]);


    const getCryptoIcon = (symbol) => {
        const customIcons = {
            'ARPA': 'https://s2.coinmarketcap.com/static/img/coins/64x64/4636.png'
        };
        const coin = symbol.includes('/') ? symbol.split('/')[0] : symbol.replace('USDT', '');
        if (customIcons[coin]) return customIcons[coin];
        return `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${coin.toLowerCase()}.png`;
    };


    const stats = useMemo(() => {
        const combined = [...operations, ...exchangeTrades];
        const total = combined.length;
        const successful = combined.filter(op => op.result === 'Exitosa' || op.result === 'Ejecutada').length;
        const tradingProfit = isVIP ? operations.reduce((sum, op) => sum + (parseFloat(op.profit) || 0), 0) : 0;
        const profit = tradingProfit + arbitrageEarnings;
        const successRate = total > 0 ? (successful / total) * 100 : 0;
        const profitPercentage = total > 0 ? (profit / total) * 10 : 0;

        return { total, profit, successRate, profitPercentage, combined };
    }, [operations, exchangeTrades, arbitrageEarnings, isVIP]);


    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] animate-pulse">
                <div className="w-16 h-16 border-4 border-[#fcd535]/20 border-t-[#fcd535] rounded-full animate-spin mb-6"></div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Sincronizando Portafolio...</p>
            </div>
        );
    }

    return (
        <div className="p-4 lg:p-10 bg-[#0b0e11] min-h-screen animate-in fade-in duration-700">
            <div className="max-w-7xl mx-auto">
                <header className="mb-12">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-[#fcd535]/10 rounded-2xl">
                            <FaChartLine className="text-[#fcd535]" size={24} />
                        </div>
                        <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">Portafolio de Trading</h1>
                    </div>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] ml-1">Análisis de rendimiento distribuido • Nodo VIP</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    {[
                        { label: 'Operaciones Totales', value: stats.total, icon: <FaCubes />, color: 'blue' },
                        { label: 'P/L Acumulado (USD)', value: `${stats.profit >= 0 ? '+' : ''}${stats.profit.toFixed(2)}`, icon: <FaCrown />, color: stats.profit >= 0 ? 'emerald' : 'rose', isCurrency: true },
                        { label: 'Tasa de Éxito', value: `${stats.successRate.toFixed(1)}%`, icon: <FaChartLine />, color: 'amber' },
                        { label: 'Profit Est. %', value: `${stats.profitPercentage >= 0 ? '+' : ''}${stats.profitPercentage.toFixed(2)}%`, icon: <FaExternalLinkAlt />, color: stats.profitPercentage >= 0 ? 'emerald' : 'rose' }
                    ].map((stat, idx) => (
                        <div key={idx} className="bg-[#1e2329] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group hover:bg-[#2b3139] transition-all duration-500">
                            <div className={`absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity text-${stat.color}-500`}>
                                {stat.icon}
                            </div>
                            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2">{stat.label}</p>
                            <h2 className={`text-3xl font-black italic tracking-tighter ${stat.color === 'emerald' ? 'text-emerald-500' : stat.color === 'rose' ? 'text-rose-500' : 'text-white'}`}>
                                {stat.value}
                            </h2>
                        </div>
                    ))}
                </div>

                <div className="bg-[#1e2329] rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
                    <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
                        <div>
                            <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">Historial de Operaciones</h2>
                            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">Registros inmutables del nodo central</p>
                        </div>
                        {isVIP && (
                            <div className="px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                                <span className="text-[8px] font-black text-emerald-500 uppercase">Monitoreo Activo</span>
                            </div>
                        )}
                    </div>

                    {!isVIP ? (
                        <div className="p-20 flex flex-col items-center justify-center text-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0b0e11]/50 pointer-events-none"></div>
                            <div className="w-20 h-20 bg-rose-500/10 rounded-3xl flex items-center justify-center text-rose-500 mb-8 border border-rose-500/20 shadow-2xl animate-pulse">
                                <FaLock size={32} />
                            </div>
                            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-4">Módulo de Historial Bloqueado</h3>
                            <p className="text-xs text-slate-500 font-bold max-w-sm uppercase tracking-wide leading-relaxed mb-10">
                                Se requiere el protocolo de seguridad <span className="text-[#fcd535]">VIP NODE</span> para desencriptar el historial detallado de operaciones y P/L.
                            </p>
                            <button className="px-10 py-4 bg-[#fcd535] text-black rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all shadow-xl shadow-[#fcd535]/10">Adquirir Plan VIP</button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-[#12161c]">
                                    <tr>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Fecha / Nodo</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Activo / Par</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Tipo Ejecución</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status Nodo</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">P/L Delta</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {stats.combined.map((op, idx) => (
                                        <tr key={op.id || idx} className="hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-8 py-6">
                                                <p className="text-xs font-black text-white tracking-widest">{op.date}</p>
                                                <p className={`text-[9px] font-bold uppercase mt-1 ${op.isExchange ? 'text-blue-500' : 'text-slate-600'}`}>
                                                    {op.isExchange ? 'Binance Node' : 'Sincronizado'}
                                                </p>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-black/20 p-2 border border-white/5 flex items-center justify-center group-hover:border-[#fcd535]/30 transition-all">
                                                        <img
                                                            src={getCryptoIcon(op.pair)}
                                                            alt={op.pair}
                                                            className="w-full h-full object-contain"
                                                            onError={(e) => {
                                                                e.target.onerror = null;
                                                                e.target.src = 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/generic.png';
                                                            }}
                                                        />
                                                    </div>
                                                    <p className="text-sm font-black text-white italic uppercase">{op.pair}</p>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="text-[10px] font-black text-slate-400 bg-white/5 px-3 py-1.5 rounded-lg uppercase tracking-widest">{op.type}</span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${op.result === 'Exitosa' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'}`}></div>
                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${op.result === 'Exitosa' ? 'text-emerald-500' : 'text-rose-500'}`}>{op.result}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <p className={`text-lg font-black italic tracking-tighter ${parseFloat(op.profit) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                    {parseFloat(op.profit) >= 0 ? '+' : ''}{op.profit}
                                                </p>
                                                <p className="text-[8px] text-slate-600 font-bold uppercase mt-1">USDT Equity</p>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TradingPortfolioContent;
