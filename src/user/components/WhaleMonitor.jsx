import React, { useState, useEffect, useRef } from 'react';
import {
    FaFish, FaWater, FaExchangeAlt, FaArrowRight, FaClock,
    FaSearchDollar, FaShieldAlt, FaChartLine, FaBroadcastTower,
    FaArrowUp, FaArrowDown, FaFireAlt
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

const WhaleMonitor = () => {
    const [activeTab, setActiveTab] = useState('flow'); // 'flow' or 'liquidations'
    const [selectedCoin, setSelectedCoin] = useState('LTC');
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
                }
            };
            ws.onclose = () => setTimeout(connectWS, 5000);
        };

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
                    quantity: parseFloat(order.q),
                    amountUsd: liqAmount,
                    side: order.S,
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

        // Datos iniciales de calibración mejorados para el gráfico selector
        const mockLiqs = [
            { symbol: 'LTC', side: 'SELL', amountUsd: 25400, price: 71.20, isTarget: true },
            { symbol: 'LTC', side: 'BUY', amountUsd: 18200, price: 69.80, isTarget: true },
            { symbol: 'LTC', side: 'SELL', amountUsd: 12100, price: 72.50, isTarget: true },
            { symbol: 'ARPA', side: 'SELL', amountUsd: 8400, price: 0.048, isTarget: true },
            { symbol: 'ARPA', side: 'BUY', amountUsd: 4100, price: 0.043, isTarget: true },
            { symbol: 'ARK', side: 'BUY', amountUsd: 9100, price: 0.31, isTarget: true },
            { symbol: 'ARK', side: 'SELL', amountUsd: 6300, price: 0.35, isTarget: true }
        ].map(l => ({ ...l, id: Math.random(), time: '--:--', quantity: 0 }));
        setLiquidations(mockLiqs);

        return () => {
            if (wsRef.current) wsRef.current.close();
            if (fwsRef.current) fwsRef.current.close();
        };
    }, [monitoredCoins]);

    const LiquidationMap = () => {
        const currentCoinData = monitoredCoins.find(c => c.symbol === selectedCoin);
        const coinLiqs = liquidations.filter(l => l.symbol === selectedCoin);
        const longLiqs = coinLiqs.filter(l => l.side === 'SELL');
        const shortLiqs = coinLiqs.filter(l => l.side === 'BUY');

        const totalLongs = longLiqs.reduce((acc, curr) => acc + curr.amountUsd, 0);
        const totalShorts = shortLiqs.reduce((acc, curr) => acc + curr.amountUsd, 0);

        return (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Selector y Gráfico de Barras Verticales */}
                    <div className="lg:col-span-2 bg-[#1e2329] rounded-[2.5rem] border border-white/5 p-8 shadow-2xl relative overflow-hidden">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white flex items-center gap-3">
                                    <FaFireAlt className="text-orange-500" />
                                    Mapa de Calor Táctico
                                </h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Zonas de Liquidez Detectadas en Futuros</p>
                            </div>

                            <div className="flex bg-[#0b0e11] p-1.5 rounded-2xl border border-white/5 gap-2">
                                {monitoredCoins.map(coin => (
                                    <button
                                        key={coin.symbol}
                                        onClick={() => setSelectedCoin(coin.symbol)}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all flex items-center gap-2 ${selectedCoin === coin.symbol ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white/5'}`}
                                    >
                                        <img src={coin.icon} className="w-4 h-4" alt="" />
                                        {coin.symbol}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Visualizador de Capas de Liquidación */}
                        <div className="relative h-[450px] flex items-center justify-center">
                            <div className="absolute inset-0 grid grid-rows-6 opacity-10">
                                {[...Array(6)].map((_, i) => <div key={i} className="border-t border-white/20 w-full"></div>)}
                            </div>

                            <div className="w-full h-full flex items-end justify-center gap-12 pb-10">
                                {/* Zona de Shorts (BUYS) */}
                                <div className="flex flex-col items-center group w-1/3">
                                    <div className="relative w-full flex flex-col items-center justify-end h-[350px]">
                                        <AnimatePresence>
                                            {shortLiqs.map((liq, idx) => {
                                                const height = Math.min((liq.amountUsd / 20000) * 100, 40);
                                                return (
                                                    <motion.div
                                                        key={liq.id}
                                                        initial={{ scaleY: 0, opacity: 0 }}
                                                        animate={{ scaleY: 1, opacity: 1 }}
                                                        className="w-full bg-emerald-500/30 border border-emerald-500/40 rounded-lg mb-1 relative cursor-help"
                                                        style={{ height: `${height}%` }}
                                                    >
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <span className="text-[8px] font-black text-emerald-400 opacity-60">${liq.price.toFixed(3)}</span>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </AnimatePresence>
                                        {shortLiqs.length === 0 && <div className="h-full w-full bg-white/5 animate-pulse rounded-2xl"></div>}
                                    </div>
                                    <div className="mt-4 text-center">
                                        <p className="text-[10px] font-black text-emerald-400 uppercase">Zonas Liquidez Shorts</p>
                                        <p className="text-xl font-black text-white italic">${totalShorts.toLocaleString()}</p>
                                    </div>
                                </div>

                                {/* Divisor Central con Precio Actual (Simulado) */}
                                <div className="h-full w-px bg-gradient-to-b from-transparent via-white/20 to-transparent relative">
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600/20 px-3 py-1 rounded-full border border-blue-500/30 whitespace-nowrap">
                                        <span className="text-[10px] font-black text-blue-400 tracking-tighter">PRICE SCANNER ACTIVE</span>
                                    </div>
                                </div>

                                {/* Zona de Longs (SELLS) */}
                                <div className="flex flex-col items-center group w-1/3">
                                    <div className="relative w-full flex flex-col items-center justify-end h-[350px]">
                                        <AnimatePresence>
                                            {longLiqs.map((liq, idx) => {
                                                const height = Math.min((liq.amountUsd / 20000) * 100, 40);
                                                return (
                                                    <motion.div
                                                        key={liq.id}
                                                        initial={{ scaleY: 0, opacity: 0 }}
                                                        animate={{ scaleY: 1, opacity: 1 }}
                                                        className="w-full bg-rose-500/30 border border-rose-500/40 rounded-lg mb-1 relative cursor-help"
                                                        style={{ height: `${height}%` }}
                                                    >
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <span className="text-[8px] font-black text-rose-400 opacity-60">${liq.price.toFixed(3)}</span>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </AnimatePresence>
                                        {longLiqs.length === 0 && <div className="h-full w-full bg-white/5 animate-pulse rounded-2xl"></div>}
                                    </div>
                                    <div className="mt-4 text-center">
                                        <p className="text-[10px] font-black text-rose-400 uppercase">Zonas Liquidez Longs</p>
                                        <p className="text-xl font-black text-white italic">${totalLongs.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Feed de Liquidaciones Globales */}
                    <div className="bg-[#1e2329] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl flex flex-col">
                        <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                            <h2 className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2">
                                <FaBroadcastTower className="text-blue-500" />
                                Global Pulse
                            </h2>
                        </div>
                        <div className="flex-1 overflow-y-auto no-scrollbar">
                            <table className="w-full text-left">
                                <thead className="sticky top-0 bg-[#1e2329] border-b border-white/5 z-10">
                                    <tr>
                                        <th className="px-5 py-4 text-[8px] font-black text-slate-500 uppercase tracking-widest">Coin</th>
                                        <th className="px-5 py-4 text-[8px] font-black text-slate-500 uppercase tracking-widest text-center">Side</th>
                                        <th className="px-5 py-4 text-[8px] font-black text-slate-500 uppercase tracking-widest text-right">Value</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <AnimatePresence initial={false}>
                                        {liquidations.map((liq) => (
                                            <motion.tr
                                                key={liq.id}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className={`border-b border-white/[0.02] hover:bg-white/[0.01] ${liq.isTarget ? 'bg-blue-600/[0.05]' : ''}`}
                                            >
                                                <td className="px-5 py-4">
                                                    <span className={`text-[10px] font-black ${liq.isTarget ? 'text-blue-400' : 'text-white'}`}>{liq.symbol}</span>
                                                </td>
                                                <td className="px-5 py-4 text-center">
                                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${liq.side === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                        {liq.side === 'BUY' ? 'SHORT' : 'LONG'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    <span className="text-[10px] font-black text-white">${liq.amountUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="bg-[#1e2329] p-8 rounded-[2.5rem] border border-white/5">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white mb-8 border-l-4 border-blue-500 pl-4">Exchanges en el Nodo</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                        {['Binance', 'Bybit', 'OKX', 'Huobi', 'Kraken', 'KuCoin'].map(ex => (
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
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em] mt-1">Nodos Activos: Spot + Futures Alpha</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 bg-[#1e2329] p-2 rounded-2xl border border-white/5">
                        <button onClick={() => setActiveTab('flow')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'flow' ? 'bg-blue-600' : 'text-slate-500'}`}>Spot</button>
                        <button onClick={() => setActiveTab('liquidations')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'liquidations' ? 'bg-rose-600' : 'text-slate-500'}`}>Liquidaciones</button>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="bg-[#1e2329] p-6 rounded-[2rem] border border-white/5">
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Volumen Escaneado (24h)</p>
                    <h3 className="text-2xl font-black italic text-white">${(activeTab === 'flow' ? stats.totalVol24h : stats.totalLiquidations).toLocaleString()}</h3>
                </div>
                <div className="bg-[#1e2329] p-6 rounded-[2rem] border border-white/5">
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Eventos Capturados</p>
                    <h3 className="text-2xl font-black italic text-white">{activeTab === 'flow' ? transactions.length : liquidations.length}</h3>
                </div>
                <div className="bg-[#1e2329] p-6 rounded-[2rem] border border-white/5">
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Protocolo Alerta</p>
                    <h3 className="text-2xl font-black italic text-[#fcd535]">{isConnected ? 'ONLINE' : 'ACTIVE'}</h3>
                </div>
            </div>

            {activeTab === 'flow' ? (
                <div className="bg-[#1e2329] rounded-[2.5rem] border border-white/5 overflow-hidden">
                    <div className="p-6 bg-white/[0.02] border-b border-white/5">
                        <h2 className="text-xs font-black uppercase tracking-[0.2em]">Feed Spot Flow</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-white/5">
                                    <th className="px-6 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Activo</th>
                                    <th className="px-6 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Cantidad</th>
                                    <th className="px-6 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Valor USD</th>
                                    <th className="px-6 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Tiempo</th>
                                </tr>
                            </thead>
                            <tbody>
                                <AnimatePresence initial={false}>
                                    {transactions.map(tx => (
                                        <motion.tr key={tx.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                                            <td className="px-6 py-5 font-black text-xs text-white uppercase">{tx.coin}</td>
                                            <td className="px-6 py-5 text-right text-xs font-black text-[#fcd535]">{tx.amount.toLocaleString()}</td>
                                            <td className="px-6 py-5 text-right text-xs font-black text-white">${tx.amountUsd.toLocaleString()}</td>
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
