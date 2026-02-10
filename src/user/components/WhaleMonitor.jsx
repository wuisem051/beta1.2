import React, { useState, useEffect, useRef } from 'react';
import {
    FaFish, FaWater, FaExchangeAlt, FaArrowRight, FaClock,
    FaSearchDollar, FaShieldAlt, FaChartLine, FaBroadcastTower,
    FaArrowUp, FaArrowDown
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

const WhaleMonitor = () => {
    const [activeTab, setActiveTab] = useState('flow'); // 'flow' or 'liquidations'
    const [transactions, setTransactions] = useState([]);
    const [liquidations, setLiquidations] = useState([]);
    const [monitoredCoins] = useState([
        { symbol: 'ARPA', name: 'ARPA Chain', threshold: 50000, icon: 'https://assets.coingecko.com/coins/images/8821/small/ARPA_Chain.png' },
        { symbol: 'LTC', name: 'Litecoin', threshold: 500, icon: 'https://assets.coingecko.com/coins/images/2/small/litecoin.png' },
        { symbol: 'ARK', name: 'Ark', threshold: 10000, icon: 'https://assets.coingecko.com/coins/images/453/small/Ark.png' }
    ]);
    const [isConnected, setIsConnected] = useState(false);
    const [stats, setStats] = useState({
        totalVol24h: 1250000,
        largeTxCount: 42,
        activeAlerts: 3,
        totalLiquidations: 0,
        topLiqPrice: 0
    });

    const wsRef = useRef(null);
    const fwsRef = useRef(null);

    useEffect(() => {
        setIsConnected(true);

        const symbols = {
            'arpausdt': 'ARPA',
            'ltcusdt': 'LTC',
            'arkusdt': 'ARK'
        };

        // --- SPOT WS for WHALES ---
        const streams = Object.keys(symbols).map(s => `${s}@aggTrade`).join('/');
        const url = `wss://stream.binance.com:9443/ws/${streams}`;

        const connectWS = () => {
            const ws = new WebSocket(url);
            wsRef.current = ws;

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (!data.s) return;
                const symbol = symbols[data.s.toLowerCase()];
                const coin = monitoredCoins.find(c => c.symbol === symbol);
                if (!coin) return;

                const amount = parseFloat(data.q);
                const price = parseFloat(data.p);
                const amountUsd = amount * price;

                if (amountUsd > 500) {
                    const isWhale = amount >= coin.threshold;
                    const newTx = {
                        id: data.a,
                        coin: symbol,
                        coinName: coin.name,
                        amount: amount,
                        amountUsd: amountUsd,
                        from: isWhale ? (Math.random() > 0.5 ? 'Unknown Wallet' : 'Exchange') : 'Market Buy/Sell',
                        to: isWhale ? (Math.random() > 0.5 ? 'Binance' : 'Cold Storage') : 'Exchange',
                        time: new Date().toLocaleTimeString(),
                        timestamp: data.E,
                        type: isWhale ? 'WHALE_MOVEMENT' : 'REGULAR_TRADE',
                        isWhale: isWhale
                    };

                    setTransactions(prev => {
                        const filtered = [newTx, ...prev].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
                        return filtered.slice(0, 20);
                    });

                    if (isWhale) {
                        setStats(prev => ({
                            ...prev,
                            largeTxCount: prev.largeTxCount + 1,
                            totalVol24h: prev.totalVol24h + amountUsd
                        }));
                    }
                }
            };
            ws.onclose = () => setTimeout(connectWS, 5000);
            ws.onopen = () => setIsConnected(true);
        };

        // --- FUTURES WS for LIQUIDATIONS ---
        const fUrl = `wss://fstream.binance.com/ws/!forceOrder@arr`;
        const connectFWS = () => {
            const fws = new WebSocket(fUrl);
            fwsRef.current = fws;

            fws.onmessage = (event) => {
                const dataArray = JSON.parse(event.data);
                const orders = Array.isArray(dataArray) ? dataArray : [dataArray];

                orders.forEach(data => {
                    const order = data.o || data;
                    if (!order.s) return;
                    const symbol = order.s.toLowerCase().replace('usdt', '').toUpperCase();

                    if (['ARPA', 'LTC', 'ARK'].includes(symbol)) {
                        const liqAmount = parseFloat(order.q) * parseFloat(order.p);
                        const newLiq = {
                            id: Date.now() + Math.random(),
                            symbol: symbol,
                            price: parseFloat(order.p),
                            quantity: parseFloat(order.q),
                            amountUsd: liqAmount,
                            side: order.S, // 'BUY' (short liq) or 'SELL' (long liq)
                            time: new Date().toLocaleTimeString(),
                            exchange: 'Binance Futures'
                        };

                        setLiquidations(prev => [newLiq, ...prev].slice(0, 30));
                        setStats(prev => ({
                            ...prev,
                            totalLiquidations: prev.totalLiquidations + liqAmount,
                            topLiqPrice: Math.max(prev.topLiqPrice, liqAmount)
                        }));
                    }
                });
            };
            fws.onclose = () => setTimeout(connectFWS, 5000);
        };

        connectWS();
        connectFWS();

        return () => {
            if (wsRef.current) wsRef.current.close();
            if (fwsRef.current) fwsRef.current.close();
        };
    }, [monitoredCoins]);

    const LiquidationMap = () => {
        return (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Heatmap Visualized */}
                    <div className="bg-[#1e2329] rounded-[2.5rem] border border-white/5 p-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none">
                            <FaBroadcastTower size={200} />
                        </div>
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white mb-6 flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-rose-500 rounded-full"></div>
                            Zonas de Calor Tácticas (Futures)
                        </h3>

                        <div className="relative h-[400px] border-l border-b border-white/10 mt-10 flex items-end justify-around pb-4">
                            {monitoredCoins.map((coin, idx) => {
                                const coinLiqs = liquidations.filter(l => l.symbol === coin.symbol);
                                const longLiqs = coinLiqs.filter(l => l.side === 'SELL').reduce((acc, curr) => acc + curr.amountUsd, 0);
                                const shortLiqs = coinLiqs.filter(l => l.side === 'BUY').reduce((acc, curr) => acc + curr.amountUsd, 0);
                                const maxLiq = Math.max(longLiqs, shortLiqs, 1000);

                                return (
                                    <div key={idx} className="flex flex-col items-center gap-4 w-1/4">
                                        <div className="flex gap-1 h-[300px] items-end">
                                            {/* Long Liqs Bar */}
                                            <motion.div
                                                initial={{ height: 0 }}
                                                animate={{ height: `${(longLiqs / maxLiq) * 100}%` }}
                                                className="w-4 bg-rose-500/40 rounded-t-full relative group"
                                            >
                                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-rose-900 border border-rose-500 text-[8px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                                                    Longs: ${longLiqs.toLocaleString()}
                                                </div>
                                            </motion.div>
                                            {/* Short Liqs Bar */}
                                            <motion.div
                                                initial={{ height: 0 }}
                                                animate={{ height: `${(shortLiqs / maxLiq) * 100}%` }}
                                                className="w-4 bg-emerald-500/40 rounded-t-full relative group"
                                            >
                                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-emerald-900 border border-emerald-500 text-[8px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                                                    Shorts: ${shortLiqs.toLocaleString()}
                                                </div>
                                            </motion.div>
                                        </div>
                                        <div className="text-center">
                                            <img src={coin.icon} className="w-6 h-6 mx-auto mb-1" alt={coin.symbol} />
                                            <p className="text-[10px] font-black text-white">{coin.symbol}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Recent Liquidation List */}
                    <div className="bg-[#1e2329] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                            <h2 className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2">
                                <FaShieldAlt className="text-rose-500" />
                                Monitor de Liquidaciones Forzadas
                            </h2>
                        </div>
                        <div className="h-[432px] overflow-y-auto no-scrollbar">
                            {liquidations.length > 0 ? (
                                <table className="w-full text-left border-collapse">
                                    <thead className="sticky top-0 bg-[#1e2329] z-10 shadow-sm">
                                        <tr className="border-b border-white/5">
                                            <th className="px-6 py-4 text-[8px] font-black text-slate-500 uppercase tracking-widest">Activo</th>
                                            <th className="px-6 py-4 text-[8px] font-black text-slate-500 uppercase tracking-widest text-center">Tipo</th>
                                            <th className="px-6 py-4 text-[8px] font-black text-slate-500 uppercase tracking-widest">Valor USD</th>
                                            <th className="px-6 py-4 text-[8px] font-black text-slate-500 uppercase tracking-widest text-right">Tiempo</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <AnimatePresence initial={false}>
                                            {liquidations.map((liq) => (
                                                <motion.tr
                                                    key={liq.id}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    className="border-b border-white/[0.02] hover:bg-white/[0.01]"
                                                >
                                                    <td className="px-6 py-4 font-black text-[10px] text-white">
                                                        {liq.symbol} <span className="text-[8px] text-slate-600">@ ${liq.price.toLocaleString()}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${liq.side === 'BUY' ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-500/20' : 'bg-rose-900/30 text-rose-400 border border-rose-500/20'}`}>
                                                            {liq.side === 'BUY' ? 'Short Liq' : 'Long Liq'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 font-black text-[10px] text-white">
                                                        ${liq.amountUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                    </td>
                                                    <td className="px-6 py-4 text-right text-[8px] font-black text-slate-500 uppercase">
                                                        {liq.time}
                                                    </td>
                                                </motion.tr>
                                            ))}
                                        </AnimatePresence>
                                    </tbody>
                                </table>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center p-10 opacity-30">
                                    <FaSearchDollar size={40} className="mb-4" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-center">Escaneando Liquidaciones en Binance Futures...</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tactical Exchanges Grid */}
                <div className="bg-[#1e2329] p-8 rounded-[2.5rem] border border-white/5">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white mb-8 border-l-4 border-blue-500 pl-4">Intercambios con Reservas Detectadas</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                        {['Binance', 'Bybit', 'OKX', 'Huobi', 'Kraken', 'KuCoin'].map((ex) => (
                            <div key={ex} className="bg-[#0b0e11]/50 p-4 rounded-2xl border border-white/5 flex flex-col items-center">
                                <div className="w-8 h-8 rounded-lg bg-white/5 mb-3 flex items-center justify-center">
                                    <FaExchangeAlt className="text-blue-500 text-xs" />
                                </div>
                                <p className="text-[10px] font-black text-white mb-1">{ex}</p>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                                    <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Sincronizado</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#0b0e11] text-white p-4 lg:p-8">
            {/* Header Estilizado */}
            <header className="mb-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="relative">
                            <div className="p-4 bg-blue-600/20 rounded-2xl border border-blue-500/30 animate-pulse">
                                <FaFish size={32} className="text-blue-400" />
                            </div>
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[#0b0e11] shadow-[0_0_10px_#10b981]"></div>
                        </div>
                        <div>
                            <h1 className="text-3xl font-black italic uppercase tracking-tighter flex items-center gap-3">
                                Whale & Liq Monitor
                                <span className="text-xs bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full border border-blue-500/20 font-black tracking-widest not-italic">LIVE ALPHA</span>
                            </h1>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em] mt-1 flex items-center gap-2">
                                <FaBroadcastTower className="text-blue-500" />
                                Monitoreo Multimercado • Spot + Futures
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 bg-[#1e2329] p-2 rounded-2xl border border-white/5 shadow-2xl">
                        <button
                            onClick={() => setActiveTab('flow')}
                            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'flow' ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] scale-105' : 'text-slate-500 hover:text-white'}`}
                        >
                            Flujo Spot
                        </button>
                        <button
                            onClick={() => setActiveTab('liquidations')}
                            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'liquidations' ? 'bg-rose-600 text-white shadow-[0_0_20px_rgba(225,29,72,0.4)] scale-105' : 'text-slate-500 hover:text-white'}`}
                        >
                            Liquidaciones
                        </button>
                    </div>
                </div>
            </header>

            {/* Stats Summary Panel */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                {[
                    {
                        label: activeTab === 'flow' ? 'Volumen 24h Escaneado' : 'Total Liqs Detectadas',
                        value: `$${(activeTab === 'flow' ? stats.totalVol24h : stats.totalLiquidations).toLocaleString()}`,
                        icon: activeTab === 'flow' ? <FaSearchDollar /> : <FaWater />,
                        color: activeTab === 'flow' ? 'blue' : 'rose'
                    },
                    {
                        label: activeTab === 'flow' ? 'Movimientos Ballena' : 'Eventos de Liquidación',
                        value: activeTab === 'flow' ? stats.largeTxCount : liquidations.length,
                        icon: <FaChartLine />,
                        color: 'emerald'
                    },
                    {
                        label: 'Protocolos Activos',
                        value: `${stats.activeAlerts} Nodos`,
                        icon: <FaShieldAlt />,
                        color: 'amber'
                    }
                ].map((item, i) => (
                    <div key={i} className="bg-[#1e2329] p-6 rounded-[2rem] border border-white/5 relative overflow-hidden group shadow-xl">
                        <div className={`absolute top-0 right-0 p-8 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity text-5xl text-${item.color}-500`}>
                            {item.icon}
                        </div>
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">{item.label}</p>
                        <h3 className={`text-2xl font-black italic tracking-tighter text-white`}>{item.value}</h3>
                        <div className={`mt-4 w-full h-1 bg-white/5 rounded-full overflow-hidden`}>
                            <motion.div
                                className={`h-full bg-${item.color}-500/50`}
                                initial={{ width: 0 }}
                                animate={{ width: '70' + (i * 10) + '%' }}
                                transition={{ duration: 1.5, delay: 0.2 }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {activeTab === 'flow' ? (
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {/* Main Feed Section (Spot) */}
                    <div className="xl:col-span-3">
                        <div className="bg-[#1e2329] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                                <div className="flex items-center gap-3">
                                    <FaWater className="text-blue-500" />
                                    <h2 className="text-xs font-black uppercase tracking-[0.2em]">Feed de Movimientos Globales (Spot)</h2>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-white/5">
                                            <th className="px-6 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Activo</th>
                                            <th className="px-6 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Cantidad</th>
                                            <th className="px-6 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Valor USD</th>
                                            <th className="px-6 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">Referencia</th>
                                            <th className="px-6 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Tiempo</th>
                                        </tr>
                                    </thead>
                                    <tbody className="relative">
                                        <AnimatePresence initial={false}>
                                            {transactions.map((tx) => (
                                                <motion.tr
                                                    key={tx.id}
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors group"
                                                >
                                                    <td className="px-6 py-5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-[#0b0e11] p-1.5 border border-white/5">
                                                                <img
                                                                    src={monitoredCoins.find(c => c.symbol === tx.coin)?.icon}
                                                                    alt={tx.coin}
                                                                    className="w-full h-full object-contain"
                                                                />
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-black text-white">{tx.coin}</p>
                                                                <p className="text-[9px] text-slate-500 font-bold uppercase">{tx.coinName}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <p className="text-xs font-black text-[#fcd535]">
                                                            {tx.amount.toLocaleString()} <span className="text-[10px]">{tx.coin}</span>
                                                        </p>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <p className="text-xs font-black text-white">${tx.amountUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                                    </td>
                                                    <td className="px-6 py-5 text-center lowercase">
                                                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-tighter ${tx.isWhale ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'bg-white/5 text-slate-500'}`}>
                                                            {tx.isWhale ? 'Whale Alert' : 'Market Trade'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-5 text-right font-black text-[9px] text-slate-500">
                                                        {tx.time}
                                                    </td>
                                                </motion.tr>
                                            ))}
                                        </AnimatePresence>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Info Section (Spot) */}
                    <div className="space-y-6">
                        <div className="bg-[#1e2329] p-6 rounded-[2.5rem] border border-white/5">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white mb-6 flex items-center gap-2">
                                <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
                                Umbrales de Alerta
                            </h3>
                            <div className="space-y-4">
                                {monitoredCoins.map(coin => (
                                    <div key={coin.symbol} className="bg-[#0b0e11]/50 p-4 rounded-2xl border border-white/5 group hover:border-blue-500/30 transition-all">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-black text-white">{coin.symbol}</span>
                                            <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest bg-blue-500/10 px-2 py-0.5 rounded">Active</span>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <p className="text-[8px] text-slate-500 font-bold uppercase">Whale Gate</p>
                                            <p className="text-xs font-black text-[#fcd535]">{coin.threshold.toLocaleString()} {coin.symbol}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <LiquidationMap />
            )}
        </div>
    );
};

export default WhaleMonitor;
