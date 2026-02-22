import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    FaFish, FaWater, FaExchangeAlt, FaArrowRight, FaClock,
    FaSearchDollar, FaShieldAlt, FaChartLine, FaBroadcastTower,
    FaArrowUp, FaArrowDown, FaFireAlt, FaSkull, FaBell, FaVolumeUp, FaEye,
    FaRadiation, FaExclamationTriangle, FaHistory, FaBolt, FaGripLinesVertical,
    FaTachometerAlt, FaLayerGroup
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const WhaleMonitor = () => {
    const [activeTab, setActiveTab] = useState('arpa_pro');
    const [selectedCoin, setSelectedCoin] = useState('ARPA');
    const [transactions, setTransactions] = useState([]);
    const [liquidations, setLiquidations] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const [alerts, setAlerts] = useState([]);

    // --- CHART DATA STATE ---
    const [chartData, setChartData] = useState([]);

    // --- BREAKOUT LOG STATE ---
    const [breakoutLog, setBreakoutLog] = useState([
        { id: 1, time: '06:00:24', price: 0.05423, move: '+15.2%', vol: '$1.2M', type: 'EXPLOSIVE' },
        { id: 2, time: '04:15:10', price: 0.04812, move: '+5.4%', vol: '$450K', type: 'SPIKE' },
        { id: 3, time: '01:30:05', price: 0.04655, move: '-3.1%', vol: '$320K', type: 'DROP' }
    ]);

    // ARPA Specific Metrics
    const [arpaMetrics, setArpaMetrics] = useState({
        vol1m: 0,
        avgVol1m: 50000,
        buyPressure: 50,
        lastPrice: 0,
        movementDetected: false,
        intensity: 0,
        velocity: 0,
        momentum1m: 0,
        momentum5m: 0,
        trend: 'NEUTRAL'
    });

    const [monitoredCoins] = useState([
        { symbol: 'ARPA', name: 'ARPA Chain', threshold: 30000, icon: 'https://assets.coingecko.com/coins/images/8821/small/ARPA_Chain.png' }
    ]);

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
                    const newBuyPressure = isBuy ? Math.min(100, prev.buyPressure + 0.4) : Math.max(0, prev.buyPressure - 0.4);

                    const now = Date.now();
                    volHistory.current.push({ time: now, vol: amountUsd });
                    priceHistory.current.push({ time: now, price: price });

                    const oneMinAgo = now - 60000;
                    volHistory.current = volHistory.current.filter(v => v.time > oneMinAgo);
                    priceHistory.current = priceHistory.current.filter(p => p.time > oneMinAgo);

                    const currentVol1m = volHistory.current.reduce((acc, v) => acc + v.vol, 0);

                    // Velocity calculation (10s window)
                    const tenSecAgo = now - 10000;
                    const priceOld = priceHistory.current.find(p => p.time > tenSecAgo)?.price || price;
                    const velocity = ((price - priceOld) / priceOld) * 100;

                    const spike = currentVol1m > prev.avgVol1m * 3;

                    // Update Chart Data (throttle for performance)
                    if (now % 5 === 0) {
                        setChartData(cd => [...cd, {
                            time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                            vol: Math.round(currentVol1m),
                            price: price
                        }].slice(-30));
                    }

                    // Automatic Breakout Logger
                    if (Math.abs(velocity) > 0.8) {
                        const newLog = {
                            id: Date.now(),
                            time: new Date().toLocaleTimeString([], { hour12: false }),
                            price: price,
                            move: `${velocity > 0 ? '+' : ''}${velocity.toFixed(2)}%`,
                            vol: `$${Math.round(currentVol1m / 1000)}K`,
                            type: velocity > 1.5 ? 'EXPLOSIVE' : 'SPIKE'
                        };
                        setBreakoutLog(prevLog => [newLog, ...prevLog].slice(0, 10));
                        addAlert(`DETECCIÓN: Movimiento Rápido de ${newLog.move}`);
                    }

                    return {
                        ...prev,
                        vol1m: currentVol1m,
                        lastPrice: price,
                        buyPressure: newBuyPressure,
                        movementDetected: spike || Math.abs(velocity) > 0.8,
                        intensity: Math.min(100, (currentVol1m / prev.avgVol1m) * 12),
                        velocity: velocity,
                        trend: velocity > 0.2 ? 'BULLISH' : velocity < -0.2 ? 'BEARISH' : 'STABLE'
                    };
                });

                if (amountUsd > 8000) {
                    setTransactions(prev => [{
                        id: data.a,
                        coin: 'ARPA',
                        amount: amount,
                        amountUsd: amountUsd,
                        isWhale: amountUsd > 30000,
                        isBuy: !data.m,
                        time: new Date().toLocaleTimeString()
                    }, ...prev].slice(0, 40));
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
                setLiquidations(prev => [{
                    id: Date.now() + Math.random(),
                    symbol: 'ARPA',
                    price: parseFloat(order.p),
                    amountUsd: liqAmount,
                    side: order.S,
                    time: new Date().toLocaleTimeString()
                }, ...prev].slice(0, 200));
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
        setAlerts(prev => [{ id, msg, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 6));
        setTimeout(() => setAlerts(prev => prev.filter(a => a.id !== id)), 12000);
    };

    const ARPADeepDive = () => {
        return (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 animate-in fade-in duration-700">
                {/* Lateral: Breakout Timeline */}
                <div className="xl:col-span-3 space-y-8">
                    <div className="bg-[#1e2329] p-8 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-3 text-white">
                                <FaClock className="text-orange-500" />
                                Movement Timeline
                            </h3>
                            <span className="text-[8px] font-black text-slate-500 bg-white/5 px-2 py-1 rounded">UTC SCAN</span>
                        </div>
                        <div className="space-y-4">
                            {breakoutLog.map(log => (
                                <div key={log.id} className="relative pl-6 border-l-2 border-white/5 pb-4 last:pb-0">
                                    <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-4 border-[#1e2329] ${log.type === 'EXPLOSIVE' ? 'bg-orange-600 animate-pulse' : 'bg-blue-500'}`}></div>
                                    <div className="bg-black/20 p-4 rounded-2xl border border-white/5 group hover:border-orange-500/20 transition-all cursor-crosshair">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-black text-white">{log.time}</span>
                                            <span className={`text-[10px] font-black ${log.move.includes('+') ? 'text-emerald-500' : 'text-rose-500'}`}>{log.move}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[9px] font-medium text-slate-500">Vol: {log.vol}</span>
                                            <span className="text-[9px] font-medium text-slate-500">Price: {log.price.toFixed(5)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-[#1e2329] p-8 rounded-[3rem] border border-white/5 shadow-2xl">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-6 flex items-center gap-2 text-white">
                            <FaTachometerAlt className="text-emerald-500" />
                            Momentum Matrix
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-black/20 p-4 rounded-2xl border border-white/5 text-center">
                                <p className="text-[8px] font-black text-slate-500 uppercase mb-2">1M Trend</p>
                                <p className={`text-sm font-black uppercase ${arpaMetrics.trend === 'BULLISH' ? 'text-emerald-500' : arpaMetrics.trend === 'BEARISH' ? 'text-rose-500' : 'text-slate-400'}`}>
                                    {arpaMetrics.trend}
                                </p>
                            </div>
                            <div className="bg-black/20 p-4 rounded-2xl border border-white/5 text-center">
                                <p className="text-[8px] font-black text-slate-500 uppercase mb-2">Power</p>
                                <p className="text-sm font-black text-orange-500">{(arpaMetrics.intensity / 10).toFixed(1)}x</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Central: Charts & Main Metrics */}
                <div className="xl:col-span-6 space-y-8">
                    {/* Main Radar Card with Chart */}
                    <div className="bg-[#1e2329] rounded-[4rem] border border-white/10 overflow-hidden shadow-2xl relative">
                        <div className="p-10 pb-0">
                            <div className="flex items-center justify-between mb-10">
                                <div className="flex items-center gap-6">
                                    <div className="p-6 bg-orange-600 rounded-[2rem] shadow-2xl shadow-orange-600/40">
                                        <FaBroadcastTower className="text-white text-3xl animate-pulse" />
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-black italic uppercase tracking-tighter">ARPA Master <span className="text-orange-600">Breakout Radar</span></h2>
                                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em]">Real-Time Aggregation • Spiking Detectors</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-slate-500 font-black uppercase mb-1">Live Price</p>
                                    <p className="text-4xl font-black text-white italic tracking-tighter">${arpaMetrics.lastPrice.toFixed(5)}</p>
                                </div>
                            </div>
                        </div>

                        {/* LIVE VOLUME CHART */}
                        <div className="h-64 w-full px-6">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ea580c" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#ea580c" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e2329', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', fontSize: '10px', fontWeight: 'bold' }}
                                        itemStyle={{ color: '#ea580c' }}
                                    />
                                    <Area type="monotone" dataKey="vol" stroke="#ea580c" strokeWidth={3} fillOpacity={1} fill="url(#colorVol)" animationDuration={500} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="p-10 pt-6 grid grid-cols-2 gap-8">
                            <MetricCard
                                label="Buying Power Index"
                                value={`${arpaMetrics.buyPressure.toFixed(1)}%`}
                                status={arpaMetrics.buyPressure > 60 ? 'high' : 'normal'}
                                icon={<FaFireAlt />}
                            />
                            <MetricCard
                                label="Current Velocity"
                                value={`${arpaMetrics.velocity.toFixed(2)}%`}
                                status={Math.abs(arpaMetrics.velocity) > 0.5 ? 'high' : 'normal'}
                                icon={<FaBolt />}
                            />
                        </div>
                    </div>

                    {/* Live Feed Exclusive */}
                    <div className="bg-[#1e2329] rounded-[4rem] border border-white/5 overflow-hidden shadow-2xl">
                        <div className="p-8 border-b border-white/5 flex items-center justify-between">
                            <h3 className="text-xs font-black uppercase tracking-[0.3em] flex items-center gap-3 text-white">
                                <FaLayerGroup className="text-blue-500" />
                                ARPA Aggressive Flow
                            </h3>
                            <span className="px-4 py-1.5 bg-blue-600/10 border border-blue-600/20 text-blue-400 text-[10px] font-black rounded-full uppercase">Monitoring Spot Clusters</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-[#0b0e11]/50 border-b border-white/5">
                                    <tr>
                                        <th className="px-10 py-6 text-[9px] font-black text-slate-500 uppercase tracking-widest">Qty (ARPA)</th>
                                        <th className="px-10 py-6 text-[9px] font-black text-slate-500 uppercase tracking-widest">USD Value</th>
                                        <th className="px-10 py-6 text-[9px] font-black text-slate-500 uppercase tracking-widest">Movement</th>
                                        <th className="px-10 py-6 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <AnimatePresence initial={false}>
                                        {transactions.map(tx => (
                                            <motion.tr
                                                key={tx.id}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className={`border-b border-white/[0.02] hover:bg-white/[0.03] transition-colors ${tx.isWhale ? 'bg-orange-600/5' : ''}`}
                                            >
                                                <td className="px-10 py-5">
                                                    <span className="text-sm font-black text-white">{Math.round(tx.amount).toLocaleString()}</span>
                                                </td>
                                                <td className="px-10 py-5">
                                                    <span className={`text-sm font-black ${tx.isWhale ? 'text-orange-500' : 'text-white'}`}>
                                                        ${Math.round(tx.amountUsd).toLocaleString()}
                                                    </span>
                                                </td>
                                                <td className="px-10 py-5">
                                                    <span className={`px-3 py-1 rounded text-[8px] font-black uppercase ${tx.isBuy ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                                        {tx.isBuy ? 'MARKET BUY' : 'MARKET SELL'}
                                                    </span>
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

                {/* Lateral: Alerts & Extra Scanners */}
                <div className="xl:col-span-3 space-y-8">
                    <div className="bg-[#1e2329] p-8 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-8 flex items-center gap-2 text-white">
                            <FaBell className="text-orange-500" />
                            Tactical Stream
                        </h3>
                        <div className="space-y-4">
                            <AnimatePresence>
                                {alerts.map(alert => (
                                    <motion.div
                                        key={alert.id}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        className="bg-orange-600/5 border border-orange-600/20 p-5 rounded-2xl relative group"
                                    >
                                        <p className="text-[9px] font-black text-orange-500 uppercase mb-2 leading-none">{alert.time}</p>
                                        <p className="text-xs font-bold text-white leading-relaxed">{alert.msg}</p>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                            {alerts.length === 0 && (
                                <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">Listening to Node</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Trend Map */}
                    <div className="bg-black/40 p-10 rounded-[4rem] border border-white/10 shadow-3xl text-center">
                        <div className="mb-6">
                            <div className="inline-block p-4 bg-orange-600/20 rounded-full mb-4">
                                <FaBolt className="text-orange-500 text-2xl" />
                            </div>
                            <h4 className="text-[10px] font-black uppercase text-white tracking-[0.3em]">Spike Probability</h4>
                        </div>
                        <div className="text-5xl font-black text-white italic mb-4">
                            {arpaMetrics.buyPressure > 65 ? '88%' : arpaMetrics.buyPressure > 50 ? '42%' : '12%'}
                        </div>
                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden flex gap-0.5">
                            {[...Array(20)].map((_, i) => (
                                <div key={i} className={`flex-1 ${i < (arpaMetrics.buyPressure > 65 ? 18 : 6) ? 'bg-orange-500' : 'bg-white/5'}`}></div>
                            ))}
                        </div>
                        <p className="text-[8px] font-bold text-slate-500 uppercase mt-4 tracking-tighter">ALGORITHM ANALYSING CLUSTER DENSITY</p>
                    </div>
                </div>
            </div>
        );
    };

    const MetricCard = ({ label, value, status, icon }) => (
        <div className="bg-[#0b0e11] p-8 rounded-[2.5rem] border border-white/5 hover:border-orange-500/20 transition-all group overflow-hidden relative">
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-125 transition-transform duration-700">
                {icon}
            </div>
            <div className="flex items-center gap-3 mb-4">
                <div className={`text-sm ${status === 'high' ? 'text-orange-500' : 'text-slate-500'}`}>{icon}</div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
            </div>
            <p className="text-3xl font-black text-white italic tracking-tighter">{value}</p>
        </div>
    );

    const LiquidationHeatmap = () => {
        const maxIntensity = Math.max(...priceBuckets.map(b => b.total), 1);
        return (
            <div className="animate-in fade-in duration-700">
                <div className="bg-[#1e2329] rounded-[4rem] border border-white/5 p-12 shadow-2xl relative overflow-hidden">
                    <div className="flex items-center justify-between mb-12">
                        <h2 className="text-sm font-black uppercase tracking-[0.4em] text-white flex items-center gap-4">
                            <div className="w-2 h-10 bg-orange-600 rounded-full"></div>
                            ARPA Liquidity Wall Scanner
                        </h2>
                        <div className="flex gap-6">
                            <div className="text-center">
                                <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Long Risk</p>
                                <p className="text-xl font-black text-rose-500">${Math.round(priceBuckets.reduce((a, b) => a + b.longs, 0) / 1000)}K</p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Short Risk</p>
                                <p className="text-xl font-black text-emerald-500">${Math.round(priceBuckets.reduce((a, b) => a + b.shorts, 0) / 1000)}K</p>
                            </div>
                        </div>
                    </div>

                    <div className="relative h-[700px] bg-black/40 rounded-[3rem] border border-white/5 overflow-y-auto no-scrollbar p-12">
                        {priceBuckets.map((bucket, i) => {
                            const intensity = (bucket.total / maxIntensity);
                            const colorClass = bucket.longs > bucket.shorts ? `rgba(244, 63, 94, ${0.1 + intensity * 0.9})` : `rgba(16, 185, 129, ${0.1 + intensity * 0.9})`;
                            return (
                                <motion.div key={bucket.price} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.005 }} className="w-full flex items-center py-1 group">
                                    <div className="w-32 text-right pr-6">
                                        <p className="text-xs font-black text-slate-600 group-hover:text-white transition-colors">${bucket.price.toFixed(5)}</p>
                                    </div>
                                    <div className="flex-1 h-5 relative flex items-center">
                                        <div className="absolute inset-0 bg-white/[0.02] rounded-full"></div>
                                        <motion.div className="h-full rounded-full relative overflow-hidden" style={{ width: `${intensity * 100}%`, backgroundColor: colorClass, boxShadow: intensity > 0.8 ? `0 0 30px ${colorClass}` : 'none' }}>
                                            <div className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent"></div>
                                        </motion.div>
                                        {intensity > 0.4 && <span className="ml-6 text-[10px] font-black text-white/40">${Math.round(bucket.total / 1000)}K Wall</span>}
                                        {bucket.total > 100000 && <FaRadiation className="ml-4 text-orange-500 text-xs animate-pulse" />}
                                    </div>
                                </motion.div>
                            );
                        })}
                        <div className="absolute left-0 right-0 top-1/2 border-t-2 border-dashed border-orange-500/20 z-10 pointer-events-none">
                            <span className="absolute right-12 -top-4 bg-orange-600 text-white text-[10px] font-black px-6 py-2 rounded-full uppercase shadow-2xl">Liquidity Mid-Point</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#0b0e11] text-white p-4 lg:p-12 font-sans selection:bg-orange-600/30">
            <header className="mb-12">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-12">
                    <div className="flex items-center gap-10">
                        <div className="relative group p-8 bg-[#1e2329] rounded-[3rem] border border-white/10 shadow-2xl">
                            <div className="absolute inset-0 bg-orange-600 rounded-[3rem] blur-3xl opacity-10 group-hover:opacity-30 transition-opacity"></div>
                            <img src="https://assets.coingecko.com/coins/images/8821/small/ARPA_Chain.png" className="w-14 h-14 relative z-10" alt="ARPA" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <span className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-rose-500'} animate-pulse`}></span>
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">ARPA Dedicated Node Alpha-6</span>
                            </div>
                            <h1 className="text-6xl font-black italic uppercase tracking-tighter leading-none">ARPA <span className="text-orange-600">Breakout</span> Sniper</h1>
                        </div>
                    </div>
                    <div className="flex bg-[#1e2329] p-3 rounded-[3rem] border border-white/5 shadow-2xl">
                        <button onClick={() => setActiveTab('arpa_pro')} className={`px-12 py-4 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'arpa_pro' ? 'bg-orange-600 text-white shadow-2xl shadow-orange-600/40' : 'text-slate-500 hover:text-white'}`}>Tactical Radar</button>
                        <button onClick={() => setActiveTab('liquidations')} className={`px-12 py-4 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'liquidations' ? 'bg-[#fcd535] text-black shadow-2xl shadow-yellow-500/40' : 'text-slate-500 hover:text-white'}`}>Liquidity Maps</button>
                    </div>
                </div>
            </header>
            {activeTab === 'arpa_pro' ? <ARPADeepDive /> : <LiquidationHeatmap />}
        </div>
    );
};

export default WhaleMonitor;
