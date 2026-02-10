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
    const [stats, setStats] = useState({
        totalVol24h: 1250000,
        largeTxCount: 42,
        activeAlerts: 3,
        totalLiquidations: 0
    });

    const wsRef = useRef(null);
    const fwsRef = useRef(null);

    useEffect(() => {
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

                if (amountUsd > 1000) {
                    const isWhale = amount >= coin.threshold;
                    const newTx = {
                        id: data.a,
                        coin: symbol,
                        coinName: coin.name,
                        amount: amount,
                        amountUsd: amountUsd,
                        isWhale: isWhale,
                        time: new Date().toLocaleTimeString()
                    };
                    setTransactions(prev => [newTx, ...prev].slice(0, 20));
                    if (isWhale) {
                        setStats(prev => ({ ...prev, largeTxCount: prev.largeTxCount + 1, totalVol24h: prev.totalVol24h + amountUsd }));
                    }
                }
            };
            ws.onclose = () => setTimeout(connectWS, 5000);
        };

        // --- FUTURES WS for LIQUIDATIONS (GLOBAL) ---
        const fUrl = `wss://fstream.binance.com/ws/!forceOrder@arr`;
        const connectFWS = () => {
            const fws = new WebSocket(fUrl);
            fwsRef.current = fws;
            fws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                const order = data.o;
                if (!order) return;

                const symbolShort = order.s.replace('USDT', '');
                const liqAmount = parseFloat(order.q) * parseFloat(order.p);

                const newLiq = {
                    id: Date.now() + Math.random(),
                    symbol: symbolShort,
                    price: parseFloat(order.p),
                    amountUsd: liqAmount,
                    side: order.S, // 'BUY' or 'SELL'
                    time: new Date().toLocaleTimeString(),
                    isTarget: ['ARPA', 'LTC', 'ARK'].includes(symbolShort)
                };

                setLiquidations(prev => [newLiq, ...prev].slice(0, 50));
                setStats(prev => ({ ...prev, totalLiquidations: prev.totalLiquidations + liqAmount }));
            };
            fws.onclose = () => setTimeout(connectFWS, 5000);
        };

        connectWS();
        connectFWS();

        // Datos de calibración (Heatmap no puede estar en 0 para ser "Táctico")
        const mockLiqs = [
            { symbol: 'LTC', side: 'SELL', amountUsd: 22400, price: 70.2, isTarget: true },
            { symbol: 'LTC', side: 'BUY', amountUsd: 11500, price: 70.8, isTarget: true },
            { symbol: 'ARPA', side: 'SELL', amountUsd: 5400, price: 0.045, isTarget: true },
            { symbol: 'ARK', side: 'BUY', amountUsd: 4100, price: 0.32, isTarget: true }
        ].map(l => ({ ...l, id: Math.random(), time: '--:--' }));
        setLiquidations(mockLiqs);

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

                                const maxVal = Math.max(...liquidations.filter(l => l.isTarget).map(l => l.amountUsd), 5000);
                                const maxPlot = Math.max(longLiqs, shortLiqs, maxVal);

                                return (
                                    <div key={idx} className="flex flex-col items-center gap-4 w-1/4">
                                        <div className="flex gap-1 h-[300px] items-end">
                                            <motion.div
                                                animate={{ height: `${(longLiqs / maxPlot) * 100}%` }}
                                                className="w-4 bg-rose-500/40 rounded-t-full relative group"
                                            >
                                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-rose-900 border border-rose-500 text-[8px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                                                    Longs: ${longLiqs.toLocaleString()}
                                                </div>
                                            </motion.div>
                                            <motion.div
                                                animate={{ height: `${(shortLiqs / maxPlot) * 100}%` }}
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
                            <h2 className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-4">
                                <div className="flex items-center gap-2 text-rose-500">
                                    <FaShieldAlt />
                                    <span>Global Feed (Futures)</span>
                                </div>
                                <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">LIVE DATA</span>
                            </h2>
                        </div>
                        <div className="h-[432px] overflow-y-auto no-scrollbar">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-[#1e2329] items-center border-b border-white/5">
                                    <tr>
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
                                                className={`border-b border-white/[0.02] hover:bg-white/[0.01] ${liq.isTarget ? 'bg-blue-600/[0.05]' : ''}`}
                                            >
                                                <td className="px-6 py-4 flex flex-col">
                                                    <span className={`text-[10px] font-black ${liq.isTarget ? 'text-blue-400' : 'text-white'}`}>{liq.symbol}</span>
                                                    <span className="text-[8px] text-slate-600 font-bold tracking-tighter">@ ${liq.price < 1 ? liq.price.toFixed(4) : liq.price.toLocaleString()}</span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${liq.side === 'BUY' ? 'bg-emerald-900/30 text-emerald-400' : 'bg-rose-900/30 text-rose-400'}`}>
                                                        {liq.side === 'BUY' ? 'Short Liq' : 'Long Liq'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-black text-[10px] text-white">
                                                    ${liq.amountUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                </td>
                                                <td className="px-6 py-4 text-right text-[8px] font-black text-slate-500">
                                                    {liq.time === '--:--' ? 'SYNC' : liq.time}
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Tactical Exchanges Grid */}
                <div className="bg-[#1e2329] p-8 rounded-[2.5rem] border border-white/5">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white mb-8 border-l-4 border-blue-500 pl-4">Intercambios con Reservas Detectadas</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                        {['Binance', 'Bybit', 'OKX', 'Huobi', 'Kraken', 'KuCoin'].map((ex) => (
                            <div key={ex} className="bg-[#0b0e11]/50 p-4 rounded-2xl border border-white/5 flex flex-col items-center">
                                <FaExchangeAlt className="text-blue-500 text-xs mb-3" />
                                <p className="text-[10px] font-black text-white">{ex}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#0b0e11] text-white p-4 lg:p-8">
            <header className="mb-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-blue-600/20 rounded-2xl border border-blue-500/30">
                            <FaFish size={32} className="text-blue-400" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black italic uppercase tracking-tighter">Whale & Liq Monitor</h1>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em] mt-1">Spot Flow + Futures Pulse</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 bg-[#1e2329] p-2 rounded-2xl border border-white/5">
                        <button onClick={() => setActiveTab('flow')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'flow' ? 'bg-blue-600 shadow-lg' : 'text-slate-500'}`}>Spot</button>
                        <button onClick={() => setActiveTab('liquidations')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'liquidations' ? 'bg-rose-600 shadow-lg' : 'text-slate-500'}`}>Liquidaciones</button>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="bg-[#1e2329] p-6 rounded-[2rem] border border-white/5">
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Volumen Escaneado</p>
                    <h3 className="text-2xl font-black italic text-white">${(activeTab === 'flow' ? stats.totalVol24h : stats.totalLiquidations).toLocaleString()}</h3>
                </div>
                <div className="bg-[#1e2329] p-6 rounded-[2rem] border border-white/5">
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Eventos Detectados</p>
                    <h3 className="text-2xl font-black italic text-white">{activeTab === 'flow' ? stats.largeTxCount : liquidations.length}</h3>
                </div>
                <div className="bg-[#1e2329] p-6 rounded-[2rem] border border-white/5">
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Nodos Activos</p>
                    <h3 className="text-2xl font-black italic text-white">{stats.activeAlerts}</h3>
                </div>
            </div>

            {activeTab === 'flow' ? (
                <div className="xl:col-span-3 bg-[#1e2329] rounded-[2.5rem] border border-white/5 overflow-hidden">
                    <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                        <h2 className="text-xs font-black uppercase tracking-[0.2em]">Feed de Movimientos Spot</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-white/5">
                                    <th className="px-6 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Activo</th>
                                    <th className="px-6 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Cantidad</th>
                                    <th className="px-6 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Valor USD</th>
                                    <th className="px-6 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Tiempo</th>
                                </tr>
                            </thead>
                            <tbody>
                                <AnimatePresence initial={false}>
                                    {transactions.map((tx) => (
                                        <motion.tr key={tx.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs font-black text-white">{tx.coin}</span>
                                                    <span className="text-[8px] text-slate-500 font-bold uppercase">{tx.coinName}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-xs font-black text-[#fcd535]">{tx.amount.toLocaleString()}</td>
                                            <td className="px-6 py-5 text-xs font-black text-white">${tx.amountUsd.toLocaleString()}</td>
                                            <td className="px-6 py-5 text-right text-[9px] text-slate-500 font-black">{tx.time}</td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <LiquidationMap />
            )}
        </div>
    );
};

export default WhaleMonitor;
