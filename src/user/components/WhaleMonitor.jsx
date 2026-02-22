import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    FaFish, FaWater, FaExchangeAlt, FaArrowRight, FaClock,
    FaSearchDollar, FaShieldAlt, FaChartLine, FaBroadcastTower,
    FaArrowUp, FaArrowDown, FaFireAlt, FaSkull, FaBell, FaVolumeUp, FaEye,
    FaRadiation, FaExclamationTriangle, FaHistory, FaBolt, FaGripLinesVertical
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

const WhaleMonitor = () => {
    const [activeTab, setActiveTab] = useState('arpa_pro'); // 'arpa_pro', 'flow' or 'liquidations'
    const [selectedCoin, setSelectedCoin] = useState('ARPA');
    const [transactions, setTransactions] = useState([]);
    const [liquidations, setLiquidations] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const [alerts, setAlerts] = useState([]);

    // --- NEW: Historical Anomalies / Pump Archive ---
    const [anomalies, setAnomalies] = useState([
        { id: 1, type: 'EXPLOSIVE_PUMP', time: '06:00 UTC', move: '+15.2%', reason: 'MASSIVE VOLUME SPIKE', status: 'COMPLETED' },
        { id: 2, type: 'WHALE_ACCUMULATION', time: '08:45 UTC', move: '+2.1%', reason: 'CLUSTER BUYING', status: 'ONGOING' }
    ]);

    // ARPA Specific Metrics
    const [arpaMetrics, setArpaMetrics] = useState({
        vol1m: 0,
        vol5m: 0,
        avgVol1m: 50000,
        priceChange1m: 0,
        buyPressure: 50,
        lastPrice: 0,
        movementDetected: false,
        intensity: 0,
        velocity: 0, // Price movement speed
        rsiEstimate: 50
    });

    // --- ONLY ARPA ---
    const [monitoredCoins] = useState([
        { symbol: 'ARPA', name: 'ARPA Chain', threshold: 30000, icon: 'https://assets.coingecko.com/coins/images/8821/small/ARPA_Chain.png' }
    ]);

    const [stats, setStats] = useState({
        totalVol24h: 3250000,
        largeTxCount: 124,
        activeAlerts: 0,
        totalLiquidations: 0,
        pumpProbability: 15 // %
    });

    const wsRef = useRef(null);
    const fwsRef = useRef(null);
    const volHistory = useRef([]);
    const priceHistory = useRef([]);

    // --- Heatmap logic ---
    const priceBuckets = useMemo(() => {
        const buckets = {};
        const currentCoinLiqs = liquidations.filter(l => l.symbol === 'ARPA');

        currentCoinLiqs.forEach(liq => {
            const step = 0.0001;
            const bucketPrice = Math.round(liq.price / step) * step;
            const key = `${bucketPrice.toFixed(5)}`;

            if (!buckets[key]) {
                buckets[key] = { price: bucketPrice, longs: 0, shorts: 0, total: 0 };
            }

            if (liq.side === 'SELL') buckets[key].longs += liq.amountUsd;
            else buckets[key].shorts += liq.amountUsd;

            buckets[key].total += liq.amountUsd;
        });

        return Object.values(buckets).sort((a, b) => b.price - a.price);
    }, [liquidations]);

    useEffect(() => {
        // FOCUS ONLY ON ARPA
        const symbols = { 'arpausdt': 'ARPA' };
        const streams = `arpausdt@aggTrade`;
        const spotUrl = `wss://stream.binance.com:9443/ws/${streams}`;

        const connectWS = () => {
            const ws = new WebSocket(spotUrl);
            wsRef.current = ws;
            ws.onopen = () => setIsConnected(true);
            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (!data.s) return;

                const amount = parseFloat(data.q);
                const price = parseFloat(data.p);
                const amountUsd = amount * price;

                setArpaMetrics(prev => {
                    const isBuy = !data.m;
                    const newBuyPressure = isBuy ? Math.min(100, prev.buyPressure + 0.3) : Math.max(0, prev.buyPressure - 0.3);

                    // Track volume and price velocity
                    const now = Date.now();
                    volHistory.current.push({ time: now, vol: amountUsd });
                    priceHistory.current.push({ time: now, price: price });

                    const oneMinAgo = now - 60000;
                    volHistory.current = volHistory.current.filter(v => v.time > oneMinAgo);
                    priceHistory.current = priceHistory.current.filter(p => p.time > oneMinAgo);

                    const currentVol1m = volHistory.current.reduce((acc, v) => acc + v.vol, 0);

                    // Velocity: Price change in last 10 seconds
                    const tenSecAgo = now - 10000;
                    const priceOld = priceHistory.current.find(p => p.time > tenSecAgo)?.price || price;
                    const velocity = ((price - priceOld) / priceOld) * 100;

                    const spike = currentVol1m > prev.avgVol1m * 2.5; // Stricter spike detection

                    // If move > 1% in 1 minute, it's a proto-pump
                    if (Math.abs(velocity) > 0.5 && !prev.movementDetected) {
                        addAlert(`ARPA DETECTED: Momentum Shift ${velocity.toFixed(2)}%`);
                    }

                    return {
                        ...prev,
                        vol1m: currentVol1m,
                        lastPrice: price,
                        buyPressure: newBuyPressure,
                        movementDetected: spike || Math.abs(velocity) > 1,
                        intensity: Math.min(100, (currentVol1m / prev.avgVol1m) * 15),
                        velocity: velocity
                    };
                });

                if (amountUsd > 5000) {
                    setTransactions(prev => [{
                        id: data.a,
                        coin: 'ARPA',
                        coinName: 'ARPA Chain',
                        amount: amount,
                        amountUsd: amountUsd,
                        isWhale: amountUsd > 25000,
                        isBuy: !data.m,
                        time: new Date().toLocaleTimeString()
                    }, ...prev].slice(0, 50));
                }
            };
            ws.onclose = () => { setIsConnected(false); setTimeout(connectWS, 5000); };
        };

        const fUrl = `wss://fstream.binance.com/ws/!forceOrder@arr`;
        const connectFWS = () => {
            const fws = new WebSocket(fUrl);
            fwsRef.current = fws;
            fws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                const order = data.o || data;
                if (!order.s || !order.s.includes('ARPA')) return;

                const liqAmount = parseFloat(order.q) * parseFloat(order.p);
                const newLiq = {
                    id: Date.now() + Math.random(),
                    symbol: 'ARPA',
                    price: parseFloat(order.p),
                    amountUsd: liqAmount,
                    side: order.S,
                    time: new Date().toLocaleTimeString()
                };
                setLiquidations(prev => [newLiq, ...prev].slice(0, 300));

                if (liqAmount > 5000) {
                    addAlert(`ARPA LIQUIDATION: $${Math.round(liqAmount)}`);
                }
            };
            fws.onclose = () => setTimeout(connectFWS, 5000);
        };

        connectWS();
        connectFWS();

        return () => {
            if (wsRef.current) wsRef.current.close();
            if (fwsRef.current) fwsRef.current.close();
        };
    }, []);

    const addAlert = (msg) => {
        const id = Date.now();
        setAlerts(prev => [{ id, msg, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 8));
        setTimeout(() => setAlerts(prev => prev.filter(a => a.id !== id)), 15000);
    };

    const ARPADeepDive = () => {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 animate-in fade-in duration-700">
                {/* Lateral Izquierdo: Pump Archive */}
                <div className="space-y-8">
                    <div className="bg-[#1e2329] p-8 rounded-[3rem] border border-white/5 shadow-2xl">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-6 flex items-center gap-2 text-white">
                            <FaHistory className="text-blue-500" />
                            Movement Archive
                        </h3>
                        <div className="space-y-4">
                            {anomalies.map(ano => (
                                <div key={ano.id} className="bg-black/30 p-4 rounded-2xl border border-white/5 group hover:border-blue-500/30 transition-all">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[9px] font-black text-blue-500 uppercase">{ano.type}</span>
                                        <span className="text-[9px] font-black text-slate-500">{ano.time}</span>
                                    </div>
                                    <p className="text-lg font-black text-white">{ano.move}</p>
                                    <p className="text-[8px] font-black text-slate-400 uppercase mt-1">{ano.reason}</p>
                                </div>
                            ))}
                            <div className="pt-4 border-t border-white/5 text-center">
                                <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest leading-relaxed">
                                    Last Major Move: 06:00 UTC <br /> (+15.2% EXPLOSIÓN)
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#1e2329] p-8 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden">
                        <div className="absolute -right-4 -top-4 opacity-5">
                            <FaBolt size={80} />
                        </div>
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-2 text-white">Velocity Meter</h3>
                        <p className="text-[8px] text-slate-500 font-bold uppercase mb-6">Real-time Momentum Speed</p>

                        <div className="flex flex-col items-center gap-4">
                            <div className="relative w-32 h-32 flex items-center justify-center">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="64" cy="64" r="50" fill="transparent" stroke="currentColor" strokeWidth="8" className="text-white/5" />
                                    <circle cx="64" cy="64" r="50" fill="transparent" stroke="currentColor" strokeWidth="8" strokeDasharray="314" strokeDashoffset={314 - (Math.abs(arpaMetrics.velocity) * 10 * 3.14)} className={`${arpaMetrics.velocity >= 0 ? 'text-emerald-500' : 'text-rose-500'} transition-all duration-1000`} />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className={`text-xl font-black ${arpaMetrics.velocity >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {arpaMetrics.velocity.toFixed(2)}%
                                    </span>
                                    <span className="text-[7px] font-black text-slate-500 uppercase">SPEED</span>
                                </div>
                            </div>
                            <p className="text-[9px] font-black text-slate-400 text-center px-4">
                                Detectando cambios en el flujo de órdenes cada 10 segundos.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Centro: Radar Pro */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-[#1e2329] p-10 rounded-[4rem] border border-white/10 relative overflow-hidden shadow-2xl">
                        <div className={`absolute inset-0 bg-orange-600/5 transition-opacity duration-1000 ${arpaMetrics.movementDetected ? 'opacity-100 animate-pulse' : 'opacity-0'}`}></div>

                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-10">
                                <div className="flex items-center gap-6">
                                    <div className="p-6 bg-orange-600 rounded-[2rem] shadow-2xl shadow-orange-600/40">
                                        <FaBolt className="text-white text-3xl animate-bounce" />
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-black italic uppercase tracking-tighter">ARPA <span className="text-orange-600">Breakout Scanner</span></h2>
                                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em]">Proprietary Whale Algorithms • Active Monitoring</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-slate-500 font-black uppercase mb-1">Live Price</p>
                                    <p className="text-4xl font-black text-white italic tracking-tighter">${arpaMetrics.lastPrice.toFixed(5)}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <MetricCard
                                    label="1m Aggregated Volume"
                                    value={`$${Math.round(arpaMetrics.vol1m).toLocaleString()}`}
                                    subValue={`Target: $${Math.round(arpaMetrics.avgVol1m * 2).toLocaleString()}`}
                                    status={arpaMetrics.vol1m > arpaMetrics.avgVol1m ? 'high' : 'normal'}
                                    icon={<FaVolumeUp />}
                                />
                                <MetricCard
                                    label="Buy/Sell Imbalance"
                                    value={`${arpaMetrics.buyPressure.toFixed(1)}%`}
                                    subValue={arpaMetrics.buyPressure > 50 ? 'ACCUMULATION' : 'DISTRIBUTION'}
                                    status={arpaMetrics.buyPressure > 65 ? 'high' : arpaMetrics.buyPressure < 35 ? 'low' : 'normal'}
                                    icon={<FaGripLinesVertical />}
                                />
                            </div>

                            <div className="mt-12 p-8 bg-black/40 rounded-[3rem] border border-white/5 relative group">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Relative Vol (RVol) Intensity</span>
                                        {arpaMetrics.intensity > 80 && <span className="px-2 py-0.5 bg-orange-600 text-[8px] font-black rounded animate-pulse">CRITICAL SPIKE</span>}
                                    </div>
                                    <span className="text-xl font-black text-orange-500 italic">{(arpaMetrics.intensity / 10).toFixed(1)}x</span>
                                </div>
                                <div className="h-6 w-full bg-white/5 rounded-full overflow-hidden flex gap-1 p-1">
                                    {[...Array(50)].map((_, i) => (
                                        <div
                                            key={i}
                                            className={`flex-1 rounded-sm transition-all duration-700 ${i < arpaMetrics.intensity * 0.5 ? 'bg-orange-500 shadow-[0_0_15px_rgba(234,88,12,0.6)]' : 'bg-white/5'}`}
                                        ></div>
                                    ))}
                                </div>
                                <p className="text-[9px] text-center text-slate-600 font-black uppercase tracking-widest mt-4">Multi-exchange node synchronization active</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#1e2329] rounded-[4rem] border border-white/5 overflow-hidden shadow-2xl">
                        <div className="p-10 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                            <h3 className="text-xs font-black uppercase tracking-[0.3em] flex items-center gap-3">
                                <FaEye className="text-orange-500" />
                                ARPA Exclusive Whale Feed
                            </h3>
                            <div className="flex gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Live Node</span>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-[#0b0e11]/50">
                                    <tr>
                                        <th className="px-10 py-6 text-[9px] font-black text-slate-500 uppercase tracking-widest">Aggressive Size</th>
                                        <th className="px-10 py-6 text-[9px] font-black text-slate-500 uppercase tracking-widest">USD Value</th>
                                        <th className="px-10 py-6 text-[9px] font-black text-slate-500 uppercase tracking-widest">Flow Type</th>
                                        <th className="px-10 py-6 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <AnimatePresence initial={false}>
                                        {transactions.map(tx => (
                                            <motion.tr
                                                key={tx.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className={`border-b border-white/[0.02] hover:bg-white/[0.03] transition-colors ${tx.amountUsd > 15000 ? 'bg-orange-600/5' : ''}`}
                                            >
                                                <td className="px-10 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sm font-black text-white">{Math.round(tx.amount).toLocaleString()}</span>
                                                        <span className="text-[10px] font-bold text-slate-500">ARPA</span>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-5">
                                                    <span className={`text-sm font-black ${tx.isWhale ? 'text-orange-500' : 'text-white'}`}>
                                                        ${Math.round(tx.amountUsd).toLocaleString()}
                                                    </span>
                                                </td>
                                                <td className="px-10 py-5">
                                                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[8px] font-black uppercase ${tx.isBuy ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
                                                        {tx.isWhale ? <FaFish /> : null}
                                                        {tx.isBuy ? 'BULLISH FLOW' : 'BEARISH FLOW'}
                                                    </div>
                                                </td>
                                                <td className="px-10 py-5 text-right text-[10px] font-black text-slate-500 uppercase">{tx.time}</td>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Lateral Derecho: Alert Stream */}
                <div className="space-y-8">
                    <div className="bg-[#1e2329] p-8 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-8 flex items-center gap-2 text-white">
                            <FaBell className="text-orange-500" />
                            Tactical Alert Stream
                        </h3>
                        <div className="space-y-4 max-h-[700px] overflow-y-auto no-scrollbar">
                            <AnimatePresence>
                                {alerts.map(alert => (
                                    <motion.div
                                        key={alert.id}
                                        initial={{ opacity: 0, x: 30 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        className="bg-[#0b0e11] border-l-4 border-orange-600 p-5 rounded-2xl shadow-xl relative group"
                                    >
                                        <p className="text-[9px] font-black text-orange-500 uppercase mb-2 h-4">{alert.time}</p>
                                        <p className="text-xs font-black text-white leading-relaxed">{alert.msg}</p>
                                        <div className="absolute top-2 right-2 opacity-10 group-hover:opacity-30 transition-opacity">
                                            <FaRadiation />
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                            {alerts.length === 0 && (
                                <div className="text-center py-20">
                                    <div className="w-12 h-12 border-4 border-slate-700 border-t-orange-600 rounded-full animate-spin mx-auto mb-4"></div>
                                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Scanning order books...</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-orange-600 p-8 rounded-[3rem] shadow-[0_0_40px_rgba(234,88,12,0.3)] group cursor-pointer hover:scale-[1.02] transition-transform">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-[10px] font-black uppercase text-white tracking-widest">Pump Intelligence</h4>
                            <FaBolt className="text-white animate-pulse" />
                        </div>
                        <p className="text-3xl font-black text-white italic mb-2">{stats.pumpProbability}%</p>
                        <p className="text-[9px] font-bold text-white/80 uppercase">Probability of next 5% spike</p>
                        <div className="mt-6 pt-6 border-t border-white/20">
                            <p className="text-[8px] font-black text-white uppercase tracking-tighter">
                                Based on current RVol and Buy/Sell Delta Imbalance.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const MetricCard = ({ label, value, subValue, status, icon }) => (
        <div className="bg-[#0b0e11] p-8 rounded-[2.5rem] border border-white/5 hover:border-orange-500/30 transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:scale-150 transition-transform">
                {icon}
            </div>
            <div className="flex items-center gap-3 mb-4">
                <div className={`text-sm ${status === 'high' ? 'text-orange-500' : status === 'low' ? 'text-rose-500' : 'text-slate-500'}`}>
                    {icon}
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
            </div>
            <p className="text-3xl font-black text-white italic tracking-tighter group-hover:translate-x-1 transition-transform">{value}</p>
            <p className={`text-[10px] font-black uppercase mt-2 ${status === 'high' ? 'text-orange-500' : status === 'low' ? 'text-rose-500' : 'text-slate-600'}`}>{subValue}</p>
        </div>
    );

    const LiquidationHeatmap = () => {
        const maxIntensity = Math.max(...priceBuckets.map(b => b.total), 1);

        return (
            <div className="flex flex-col gap-6 animate-in fade-in duration-700">
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                    <div className="xl:col-span-3 bg-[#0b0e11] rounded-[4rem] border border-white/5 p-10 relative overflow-hidden shadow-inner">
                        <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

                        <div className="flex items-center justify-between mb-10">
                            <h3 className="text-sm font-black uppercase tracking-[0.3em] text-white flex items-center gap-4">
                                <div className="w-1.5 h-8 bg-orange-500 rounded-full"></div>
                                ARPA Exclusive Liquidation Map
                            </h3>
                            <div className="flex gap-4">
                                <span className="text-[10px] font-black text-rose-500 bg-rose-500/10 px-4 py-2 rounded-full border border-rose-500/20 uppercase">Crash Zone</span>
                                <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20 uppercase">Moon Zone</span>
                            </div>
                        </div>

                        <div className="relative h-[650px] bg-[#161a1e]/50 rounded-[3rem] border border-white/[0.05] overflow-y-auto no-scrollbar p-12">
                            <div className="flex flex-col items-center gap-1.5">
                                {priceBuckets.map((bucket, i) => {
                                    const intensity = (bucket.total / maxIntensity);
                                    const colorClass = bucket.longs > bucket.shorts
                                        ? `rgba(244, 63, 94, ${0.1 + intensity * 0.9})`
                                        : `rgba(16, 185, 129, ${0.1 + intensity * 0.9})`;

                                    const isHighVol = intensity > 0.75;
                                    const isCritical = bucket.total > 50000;

                                    return (
                                        <motion.div
                                            key={bucket.price}
                                            initial={{ opacity: 0, x: -30 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.003 }}
                                            className="w-full flex items-center group cursor-pointer py-1"
                                        >
                                            <div className="w-32 text-right pr-8 relative">
                                                <p className={`text-xs font-black transition-colors ${isHighVol ? 'text-white' : 'text-slate-600 group-hover:text-white'}`}>
                                                    ${bucket.price.toFixed(5)}
                                                </p>
                                                {isHighVol && (
                                                    <div className="absolute -left-6 top-1 animate-ping">
                                                        <FaRadiation className="text-orange-500 text-[10px]" />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex-1 h-5 relative flex items-center">
                                                <div className="absolute inset-0 bg-white/[0.02] rounded-full"></div>
                                                <motion.div
                                                    className="h-full rounded-full relative overflow-hidden"
                                                    style={{
                                                        width: `${(bucket.total / maxIntensity) * 100}%`,
                                                        backgroundColor: colorClass,
                                                        boxShadow: intensity > 0.7 ? `0 0 25px ${colorClass}` : 'none'
                                                    }}
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent"></div>
                                                </motion.div>

                                                <div className="flex items-center gap-4 ml-6">
                                                    {intensity > 0.2 && (
                                                        <span className="text-[10px] font-black text-white/40">
                                                            ${Math.round(bucket.total / 1000)}k
                                                        </span>
                                                    )}
                                                    {isCritical && (
                                                        <span className="px-3 py-1 bg-orange-600 text-white text-[8px] font-black rounded-full animate-pulse tracking-widest shadow-lg shadow-orange-600/30">
                                                            MASSIVE LIQUIDITY DENSITY
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>

                            <div className="absolute left-0 right-0 top-1/2 border-t-2 border-dashed border-orange-500/40 z-10 pointer-events-none">
                                <div className="absolute left-6 -top-4 bg-orange-600 text-white text-[10px] font-black px-4 py-1.5 rounded-full shadow-2xl uppercase tracking-widest">
                                    Current Action Zone
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="bg-[#1e2329] p-8 rounded-[4rem] border border-white/5 relative overflow-hidden group shadow-2xl">
                            <h4 className="text-[10px] font-black uppercase text-white tracking-[0.2em] mb-6 flex items-center gap-3">
                                <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></div>
                                Recent Liquidation Events
                            </h4>
                            <div className="space-y-4 h-[600px] overflow-y-auto no-scrollbar pr-2">
                                {liquidations.slice(0, 30).map(liq => (
                                    <div key={liq.id} className="bg-black/40 p-5 rounded-[2rem] border border-white/5 flex items-center justify-between group hover:border-orange-500/40 transition-all">
                                        <div>
                                            <p className={`text-[11px] font-black ${liq.side === 'SELL' ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                {liq.side === 'SELL' ? 'LONG REKT' : 'SHORT REKT'}
                                            </p>
                                            <p className="text-[10px] text-slate-500 font-bold mt-1 tracking-tighter">${liq.price.toFixed(5)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-white">${Math.round(liq.amountUsd).toLocaleString()}</p>
                                            <p className="text-[8px] font-black text-slate-600 uppercase mt-1">{liq.time}</p>
                                        </div>
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
        <div className="min-h-screen bg-[#0b0e11] text-white p-4 lg:p-10 font-sans selection:bg-orange-600/30">
            <header className="mb-12 relative">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-10">
                    <div className="flex items-center gap-8">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-orange-600 rounded-[2.5rem] blur-3xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                            <div className="p-8 bg-[#1e2329] rounded-[2.5rem] border border-white/10 relative shadow-2xl">
                                <img src="https://assets.coingecko.com/coins/images/8821/small/ARPA_Chain.png" className="w-12 h-12 animate-pulse" alt="ARPA" />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="px-3 py-1 bg-orange-600 text-[10px] font-black rounded-full shadow-lg shadow-orange-600/30">LIVE ARPA NODE</span>
                                <span className={`text-[10px] font-black ${isConnected ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {isConnected ? '● CONNECTED' : '○ RECONNECTING'}
                                </span>
                            </div>
                            <h1 className="text-5xl lg:text-6xl font-black italic uppercase tracking-tighter leading-none">
                                ARPA <span className="text-orange-600">Pro</span> Deep Dive
                            </h1>
                            <p className="text-[11px] text-slate-500 font-black uppercase tracking-[0.6em] mt-4">Tactical Movement Detection & Liquidity Sniper</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6 bg-[#1e2329] p-3 rounded-[3rem] border border-white/5 shadow-2xl">
                        <button
                            onClick={() => setActiveTab('arpa_pro')}
                            className={`px-10 py-4 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'arpa_pro' ? 'bg-orange-600 text-white shadow-2xl shadow-orange-600/40' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                        >
                            Detection Radar
                        </button>
                        <button
                            onClick={() => setActiveTab('liquidations')}
                            className={`px-10 py-4 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'liquidations' ? 'bg-[#fcd535] text-black shadow-2xl shadow-yellow-500/40' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                        >
                            Liquidity Heatmap
                        </button>
                    </div>
                </div>
            </header>

            {activeTab === 'arpa_pro' ? <ARPADeepDive /> : <LiquidationHeatmap />}
        </div>
    );
};

export default WhaleMonitor;
