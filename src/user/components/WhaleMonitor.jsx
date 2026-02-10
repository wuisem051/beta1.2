import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    FaFish, FaWater, FaExchangeAlt, FaArrowRight, FaClock,
    FaSearchDollar, FaShieldAlt, FaChartLine, FaBroadcastTower,
    FaArrowUp, FaArrowDown, FaFireAlt, FaSkull
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

const WhaleMonitor = () => {
    const [activeTab, setActiveTab] = useState('flow'); // 'flow' or 'liquidations'
    const [selectedCoin, setSelectedCoin] = useState('LTC');
    const [transactions, setTransactions] = useState([]);
    const [liquidations, setLiquidations] = useState([]);
    const [isConnected, setIsConnected] = useState(false);

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

    // --- Aggregation logic for Heatmap ---
    const priceBuckets = useMemo(() => {
        const buckets = {};
        const currentCoinLiqs = liquidations.filter(l => l.symbol === selectedCoin);

        currentCoinLiqs.forEach(liq => {
            // Round price to a "bucket" (e.g., every 0.01 for LTC, 0.0001 for ARPA)
            const step = selectedCoin === 'ARPA' ? 0.0005 : selectedCoin === 'LTC' ? 0.1 : 0.005;
            const bucketPrice = Math.round(liq.price / step) * step;
            const key = `${bucketPrice.toFixed(4)}`;

            if (!buckets[key]) {
                buckets[key] = { price: bucketPrice, longs: 0, shorts: 0, total: 0 };
            }

            if (liq.side === 'SELL') buckets[key].longs += liq.amountUsd;
            else buckets[key].shorts += liq.amountUsd;

            buckets[key].total += liq.amountUsd;
        });

        return Object.values(buckets).sort((a, b) => b.price - a.price);
    }, [liquidations, selectedCoin]);

    useEffect(() => {
        const symbols = {
            'arpausdt': 'ARPA',
            'ltcusdt': 'LTC',
            'arkusdt': 'ARK'
        };

        // --- SPOT WS ---
        const streams = Object.keys(symbols).map(s => `${s}@aggTrade`).join('/');
        const spotUrl = `wss://stream.binance.com:9443/ws/${streams}`;

        const connectWS = () => {
            const ws = new WebSocket(spotUrl);
            wsRef.current = ws;
            ws.onopen = () => setIsConnected(true);
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
                    setTransactions(prev => [{
                        id: data.a,
                        coin: symbol,
                        coinName: coin.name,
                        amount: amount,
                        amountUsd: amountUsd,
                        isWhale: isWhale,
                        time: new Date().toLocaleTimeString()
                    }, ...prev].slice(0, 20));
                }
            };
            ws.onclose = () => { setIsConnected(false); setTimeout(connectWS, 5000); };
        };

        // --- FUTURES WS (FILTERED FOR ARPA, LTC, ARK ONLY) ---
        const fUrl = `wss://fstream.binance.com/ws/!forceOrder@arr`;
        const connectFWS = () => {
            const fws = new WebSocket(fUrl);
            fwsRef.current = fws;
            fws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                const order = data.o || data;
                if (!order.s) return;

                const symbolShort = order.s.replace('USDT', '');
                if (['ARPA', 'LTC', 'ARK'].includes(symbolShort)) {
                    const liqAmount = parseFloat(order.q) * parseFloat(order.p);
                    const newLiq = {
                        id: Date.now() + Math.random(),
                        symbol: symbolShort,
                        price: parseFloat(order.p),
                        amountUsd: liqAmount,
                        side: order.S,
                        time: new Date().toLocaleTimeString(),
                        isTarget: true
                    };
                    setLiquidations(prev => [newLiq, ...prev].slice(0, 200));
                    setStats(prev => ({ ...prev, totalLiquidations: prev.totalLiquidations + liqAmount }));
                }
            };
            fws.onclose = () => setTimeout(connectFWS, 5000);
        };

        connectWS();
        connectFWS();

        // --- Mock Data for Professional Look (Visual Clusters) ---
        const generateSeedData = () => {
            const seeds = [];
            monitoredCoins.forEach(coin => {
                const basePrice = coin.symbol === 'LTC' ? 70 : coin.symbol === 'ARPA' ? 0.045 : 0.32;
                for (let i = 0; i < 15; i++) {
                    seeds.push({
                        id: Math.random(),
                        symbol: coin.symbol,
                        price: basePrice + (Math.random() - 0.5) * (basePrice * 0.1),
                        amountUsd: Math.random() * 15000 + 1000,
                        side: Math.random() > 0.5 ? 'SELL' : 'BUY',
                        time: 'HISTORIC',
                        isTarget: true
                    });
                }
            });
            return seeds;
        };
        setLiquidations(generateSeedData());

        return () => {
            if (wsRef.current) wsRef.current.close();
            if (fwsRef.current) fwsRef.current.close();
        };
    }, [monitoredCoins]);

    const LiquidationHeatmap = () => {
        const coin = monitoredCoins.find(c => c.symbol === selectedCoin);
        const maxIntensity = Math.max(...priceBuckets.map(b => b.total), 1);

        return (
            <div className="flex flex-col gap-6 animate-in fade-in duration-700">
                {/* Selector de Moneda Superior */}
                <div className="flex justify-center">
                    <div className="inline-flex bg-[#1e2329] p-1.5 rounded-[2rem] border border-white/5 shadow-2xl">
                        {monitoredCoins.map(c => (
                            <button
                                key={c.symbol}
                                onClick={() => setSelectedCoin(c.symbol)}
                                className={`flex items-center gap-3 px-6 py-3 rounded-full text-xs font-black tracking-widest transition-all duration-300 ${selectedCoin === c.symbol ? 'bg-orange-600 text-white shadow-[0_0_20px_rgba(234,88,12,0.4)]' : 'text-slate-500 hover:text-white'}`}
                            >
                                <img src={c.icon} className="w-5 h-5" alt="" />
                                {c.symbol}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                    {/* Gráfico Estilo CoinGlass */}
                    <div className="xl:col-span-3 bg-[#0b0e11] rounded-[2.5rem] border border-white/5 p-8 relative overflow-hidden shadow-inner">
                        <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>

                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white flex items-center gap-3">
                                <div className="w-1.5 h-6 bg-orange-500 rounded-full"></div>
                                Cluster Liquidation Heatmap • {selectedCoin}/USDT
                            </h3>
                            <div className="flex gap-4">
                                <span className="text-[10px] font-black text-rose-500 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">LONG LIQ (PRICE FLOOR)</span>
                                <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">SHORT LIQ (PRICE CEILING)</span>
                            </div>
                        </div>

                        {/* Contenedor del Heatmap Vertical */}
                        <div className="relative h-[600px] bg-[#161a1e]/30 rounded-3xl border border-white/[0.03] overflow-y-auto no-scrollbar p-10">
                            <div className="flex flex-col items-center gap-1">
                                {priceBuckets.map((bucket, i) => {
                                    const intensity = (bucket.total / maxIntensity);
                                    const colorClass = bucket.longs > bucket.shorts
                                        ? `rgba(244, 63, 94, ${0.1 + intensity * 0.9})` // Rose
                                        : `rgba(16, 185, 129, ${0.1 + intensity * 0.9})`; // Emerald

                                    return (
                                        <motion.div
                                            key={bucket.price}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.02 }}
                                            className="w-full flex items-center group"
                                        >
                                            <div className="w-24 text-right pr-6 space-y-0.5">
                                                <p className="text-[10px] font-black text-slate-500 group-hover:text-white transition-colors">
                                                    ${selectedCoin === 'ARPA' ? bucket.price.toFixed(4) : bucket.price.toFixed(2)}
                                                </p>
                                            </div>

                                            <div className="flex-1 h-3 relative flex items-center">
                                                <div className="absolute inset-0 bg-white/[0.01] rounded-full"></div>
                                                <motion.div
                                                    className="h-full rounded-full relative overflow-hidden"
                                                    style={{
                                                        width: `${(bucket.total / maxIntensity) * 100}%`,
                                                        backgroundColor: colorClass,
                                                        boxShadow: intensity > 0.7 ? `0 0 15px ${colorClass}` : 'none'
                                                    }}
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent"></div>
                                                </motion.div>
                                                {intensity > 0.5 && (
                                                    <span className="ml-4 text-[8px] font-black text-white/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        ${Math.round(bucket.total / 1000)}k
                                                    </span>
                                                )}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>

                            {/* Línea de Precio Actual Overlay (Flotante) */}
                            <div className="absolute left-0 right-0 top-1/2 border-t-2 border-dashed border-orange-500/30 z-10">
                                <div className="absolute left-4 -top-3 bg-orange-600 text-white text-[8px] font-black px-2 py-1 rounded shadow-xl">
                                    CURRENT MARKET ZONE
                                </div>
                            </div>
                        </div>

                        {/* Leyenda de Intensidad Inferior */}
                        <div className="mt-8 flex items-center justify-between px-4">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Liquidación Acumulada</p>
                                <div className="flex items-center gap-1">
                                    {[...Array(10)].map((_, i) => (
                                        <div key={i} className={`w-6 h-1 rounded-full bg-orange-600`} style={{ opacity: 0.1 + (i * 0.1) }}></div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-10">
                                <div className="text-center">
                                    <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Total Longs Risk</p>
                                    <p className="text-xl font-black text-rose-500 italic">${Math.round(priceBuckets.reduce((a, b) => a + b.longs, 0) / 1000)}k</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Total Shorts Risk</p>
                                    <p className="text-xl font-black text-emerald-500 italic">${Math.round(priceBuckets.reduce((a, b) => a + b.shorts, 0) / 1000)}k</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Feed Lateral Tactico */}
                    <div className="space-y-6">
                        <div className="bg-[#1e2329] p-6 rounded-[2.5rem] border border-white/5 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:rotate-12 transition-transform">
                                <FaSkull className="text-rose-500 text-4xl" />
                            </div>
                            <h4 className="text-[10px] font-black uppercase text-white tracking-[0.2em] mb-4">Ultimas Liquidaciones</h4>
                            <div className="space-y-3 h-[500px] overflow-y-auto no-scrollbar">
                                {liquidations.filter(l => l.symbol === selectedCoin).slice(0, 15).map(liq => (
                                    <div key={liq.id} className="bg-[#0b0e11]/50 p-3 rounded-xl border border-white/5 flex items-center justify-between group hover:border-orange-500/30 transition-all">
                                        <div>
                                            <p className={`text-[10px] font-black ${liq.side === 'SELL' ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                {liq.side === 'SELL' ? 'LONG LIQUIDATED' : 'SHORT LIQUIDATED'}
                                            </p>
                                            <p className="text-[8px] text-slate-500 font-bold tracking-widest">${liq.price.toFixed(selectedCoin === 'ARPA' ? 4 : 2)}</p>
                                        </div>
                                        <p className="text-xs font-black text-white">${Math.round(liq.amountUsd).toLocaleString()}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#0b0e11] text-white p-4 lg:p-10 font-sans">
            <header className="mb-12 relative">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-orange-600 rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                            <div className="p-5 bg-[#1e2329] rounded-2xl border border-white/10 relative">
                                <FaFireAlt size={32} className="text-orange-500" />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-4xl font-black italic uppercase tracking-tighter leading-none">
                                Liquidations <span className="text-orange-600">Pro</span> Navigator
                            </h1>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.5em] mt-2 flex items-center gap-3">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                Live Tactical Radar • Binace Futures Data
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 bg-[#1e2329] p-2 rounded-[1.5rem] border border-white/5 shadow-2xl">
                        <button
                            onClick={() => setActiveTab('flow')}
                            className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'flow' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}
                        >
                            Spot Flow
                        </button>
                        <button
                            onClick={() => setActiveTab('liquidations')}
                            className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'liquidations' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                        >
                            Futures Heatmap
                        </button>
                    </div>
                </div>
            </header>

            {activeTab === 'flow' ? (
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="xl:col-span-3">
                        <div className="bg-[#1e2329] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                                <h2 className="text-xs font-black uppercase tracking-[0.3em] flex items-center gap-3">
                                    <FaWater className="text-blue-500" />
                                    Whale Order Flow (Spot)
                                </h2>
                            </div>

                            <table className="w-full text-left">
                                <thead className="border-b border-white/5">
                                    <tr>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Asset</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Volume</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Value USD</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <AnimatePresence initial={false}>
                                        {transactions.map(tx => (
                                            <motion.tr
                                                key={tx.id}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="border-b border-white/[0.02] hover:bg-white/[0.01]"
                                            >
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-black/40 p-1.5 border border-white/5">
                                                            <img src={monitoredCoins.find(c => c.symbol === tx.coin)?.icon} alt="" />
                                                        </div>
                                                        <span className="text-sm font-black text-white">{tx.coin}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-right font-black text-sm text-orange-500">{tx.amount.toLocaleString()}</td>
                                                <td className="px-8 py-6 text-right font-black text-sm text-white">${tx.amountUsd.toLocaleString()}</td>
                                                <td className="px-8 py-6 text-right text-[10px] font-black text-slate-500 uppercase">{tx.time}</td>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                <LiquidationHeatmap />
            )}
        </div>
    );
};

export default WhaleMonitor;
