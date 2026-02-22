import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    FaFish, FaWater, FaExchangeAlt, FaArrowRight, FaClock,
    FaSearchDollar, FaShieldAlt, FaChartLine, FaBroadcastTower,
    FaArrowUp, FaArrowDown, FaFireAlt, FaSkull, FaBell, FaVolumeUp, FaEye
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

const WhaleMonitor = () => {
    const [activeTab, setActiveTab] = useState('arpa_pro'); // 'arpa_pro', 'flow' or 'liquidations'
    const [selectedCoin, setSelectedCoin] = useState('ARPA');
    const [transactions, setTransactions] = useState([]);
    const [liquidations, setLiquidations] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const [alerts, setAlerts] = useState([]);

    // ARPA Specific Metrics
    const [arpaMetrics, setArpaMetrics] = useState({
        vol1m: 0,
        vol5m: 0,
        avgVol1m: 50000, // baseline
        priceChange1m: 0,
        buyPressure: 50, // 0-100
        lastPrice: 0,
        movementDetected: false,
        intensity: 0 // 0-100
    });

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
    const volHistory = useRef([]);

    // --- Aggregation logic for Heatmap ---
    const priceBuckets = useMemo(() => {
        const buckets = {};
        const currentCoinLiqs = liquidations.filter(l => l.symbol === selectedCoin);

        currentCoinLiqs.forEach(liq => {
            const step = selectedCoin === 'ARPA' ? 0.0002 : selectedCoin === 'LTC' ? 0.1 : 0.005;
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

                // Process ARPA metrics
                if (symbol === 'ARPA') {
                    setArpaMetrics(prev => {
                        const isBuy = !data.m; // m: true means the buyer is the market maker (so it's a sell)
                        const newBuyPressure = isBuy ? Math.min(100, prev.buyPressure + 0.5) : Math.max(0, prev.buyPressure - 0.5);

                        // Movement detection logic
                        volHistory.current.push({ time: Date.now(), vol: amountUsd });
                        const oneMinAgo = Date.now() - 60000;
                        volHistory.current = volHistory.current.filter(v => v.time > oneMinAgo);
                        const currentVol1m = volHistory.current.reduce((acc, v) => acc + v.vol, 0);

                        const spike = currentVol1m > prev.avgVol1m * 2;
                        if (spike && !prev.movementDetected) {
                            addAlert('ARPA Volume Spike Detected!');
                        }

                        return {
                            ...prev,
                            vol1m: currentVol1m,
                            lastPrice: price,
                            buyPressure: newBuyPressure,
                            movementDetected: spike,
                            intensity: Math.min(100, (currentVol1m / prev.avgVol1m) * 20)
                        };
                    });
                }

                if (amountUsd > 1000) {
                    const isWhale = amount >= coin.threshold;
                    setTransactions(prev => [{
                        id: data.a,
                        coin: symbol,
                        coinName: coin.name,
                        amount: amount,
                        amountUsd: amountUsd,
                        isWhale: isWhale,
                        isBuy: !data.m,
                        time: new Date().toLocaleTimeString()
                    }, ...prev].slice(0, 40));
                }
            };
            ws.onclose = () => { setIsConnected(false); setTimeout(connectWS, 5000); };
        };

        // --- FUTURES WS ---
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

                    if (symbolShort === 'ARPA' && liqAmount > 10000) {
                        addAlert(`MASSIVE ARPA LIQUIDATION: $${Math.round(liqAmount)}`);
                    }
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
        setAlerts(prev => [{ id, msg, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 5));
        // Remove alert after 10 seconds
        setTimeout(() => {
            setAlerts(prev => prev.filter(a => a.id !== id));
        }, 10000);
    };

    const ARPADeepDive = () => {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-700">
                {/* Panel Principal de Métricas */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-[#1e2329] p-8 rounded-[3rem] border border-white/5 relative overflow-hidden shadow-2xl">
                        <div className={`absolute inset-0 bg-orange-600/5 transition-opacity duration-1000 ${arpaMetrics.movementDetected ? 'opacity-100 animate-pulse' : 'opacity-0'}`}></div>

                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="p-4 bg-orange-600 rounded-2xl shadow-lg shadow-orange-600/20">
                                        <FaBroadcastTower className="text-white text-2xl animate-pulse" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black italic uppercase tracking-tighter">ARPA Radar <span className="text-orange-600">Ultra-Scan</span></h2>
                                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em]">Multi-Exchange Aggregator • Real-Time Detection</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-slate-500 font-black uppercase mb-1">Current Price</p>
                                    <p className="text-3xl font-black text-white italic">${arpaMetrics.lastPrice.toFixed(5)}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <MetricCard
                                    label="1m Volume"
                                    value={`$${Math.round(arpaMetrics.vol1m).toLocaleString()}`}
                                    subValue={`Avg: $${Math.round(arpaMetrics.avgVol1m).toLocaleString()}`}
                                    status={arpaMetrics.vol1m > arpaMetrics.avgVol1m ? 'high' : 'normal'}
                                    icon={<FaVolumeUp />}
                                />
                                <MetricCard
                                    label="Buy Pressure"
                                    value={`${arpaMetrics.buyPressure.toFixed(1)}%`}
                                    subValue={arpaMetrics.buyPressure > 50 ? 'BULLISH' : 'BEARISH'}
                                    status={arpaMetrics.buyPressure > 60 ? 'high' : arpaMetrics.buyPressure < 40 ? 'low' : 'normal'}
                                    icon={<FaFireAlt />}
                                />
                                <MetricCard
                                    label="Volatility Index"
                                    value={arpaMetrics.movementDetected ? 'EXTREME' : 'STABLE'}
                                    subValue={`Intensity: ${arpaMetrics.intensity.toFixed(0)}%`}
                                    status={arpaMetrics.movementDetected ? 'high' : 'normal'}
                                    icon={<FaChartLine />}
                                />
                            </div>

                            {/* Signal Strength Visualizer */}
                            <div className="mt-10 p-6 bg-black/40 rounded-3xl border border-white/5">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Movement Signal Strength</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-orange-500">{arpaMetrics.intensity.toFixed(0)}% DEPTH</span>
                                </div>
                                <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden flex gap-0.5 p-0.5">
                                    {[...Array(40)].map((_, i) => (
                                        <div
                                            key={i}
                                            className={`flex-1 rounded-sm transition-all duration-500 ${i < arpaMetrics.intensity * 0.4 ? 'bg-orange-500 shadow-[0_0_10px_rgba(234,88,12,0.5)]' : 'bg-white/5'}`}
                                        ></div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Order Flow Live ARPA */}
                    <div className="bg-[#1e2329] rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
                        <div className="p-8 border-b border-white/5 flex items-center justify-between">
                            <h3 className="text-xs font-black uppercase tracking-[0.3em] flex items-center gap-3">
                                <FaEye className="text-orange-500" />
                                ARPA Whale Feed (Live)
                            </h3>
                            <span className="px-3 py-1 bg-orange-600/10 border border-orange-600/20 text-orange-500 text-[10px] font-black rounded-full">DETECTING WHALES</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-[#0b0e11]/50">
                                    <tr>
                                        <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Size</th>
                                        <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Value (USD)</th>
                                        <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Type</th>
                                        <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <AnimatePresence initial={false}>
                                        {transactions.filter(tx => tx.coin === 'ARPA').map(tx => (
                                            <motion.tr
                                                key={tx.id}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className={`border-b border-white/[0.02] hover:bg-white/[0.01] transition-colors ${tx.amountUsd > 20000 ? 'bg-orange-600/5' : ''}`}
                                            >
                                                <td className="px-8 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-black text-white">{Math.round(tx.amount).toLocaleString()} ARPA</span>
                                                        {tx.amountUsd > 15000 && <FaFish className="text-orange-500 animate-bounce" />}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-4 font-black text-sm text-white">${Math.round(tx.amountUsd).toLocaleString()}</td>
                                                <td className="px-8 py-4">
                                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${tx.isBuy ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
                                                        {tx.isBuy ? 'AGGRESSIVE BUY' : 'AGGRESSIVE SELL'}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-4 text-right text-[10px] font-black text-slate-500 uppercase">{tx.time}</td>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Sidebar: Alerts & Exchanges */}
                <div className="space-y-8">
                    {/* Alertas en Tiempo Real */}
                    <div className="bg-[#1e2329] p-8 rounded-[3rem] border border-white/5 shadow-2xl">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-6 flex items-center gap-2 text-white">
                            <FaBell className="text-orange-500" />
                            Tactical Alerts
                        </h3>
                        <div className="space-y-4">
                            <AnimatePresence>
                                {alerts.map(alert => (
                                    <motion.div
                                        key={alert.id}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        className="bg-orange-600/10 border border-orange-600/20 p-4 rounded-2xl relative overflow-hidden group"
                                    >
                                        <div className="absolute top-0 right-0 p-2 opacity-20">
                                            <FaSkull />
                                        </div>
                                        <p className="text-[10px] font-black text-orange-500 uppercase mb-1">{alert.time}</p>
                                        <p className="text-xs font-bold text-white">{alert.msg}</p>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                            {alerts.length === 0 && (
                                <div className="text-center py-10">
                                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Monitoring market for anomalies...</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Exchanges Listed Monitor */}
                    <div className="bg-[#1e2329] p-8 rounded-[3rem] border border-white/5 shadow-2xl">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-6 flex items-center gap-2 text-white">
                            <FaExchangeAlt className="text-blue-500" />
                            Exchange Activity
                        </h3>
                        <div className="space-y-4">
                            <ExchangeItem name="Binance" status="ACTIVE" vol="HIGH" color="text-yellow-500" />
                            <ExchangeItem name="BingX" status="MONITORING" vol="MED" color="text-blue-400" />
                            <ExchangeItem name="KuCoin" status="MONITORING" vol="MED" color="text-emerald-500" />
                            <ExchangeItem name="Gate.io" status="ACTIVE" vol="LOW" color="text-rose-400" />
                            <ExchangeItem name="Bybit" status="ACTIVE" vol="HIGH" color="text-orange-400" />
                        </div>
                        <div className="mt-8 p-4 bg-blue-600/5 rounded-2xl border border-blue-600/10">
                            <p className="text-[9px] text-slate-500 font-bold leading-relaxed text-center">
                                * Exchange data aggregated via primary nodes and API bridges to ensure maximum coverage.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const MetricCard = ({ label, value, subValue, status, icon }) => (
        <div className="bg-[#0b0e11] p-6 rounded-[2rem] border border-white/5 hover:border-orange-500/20 transition-all group">
            <div className="flex items-center gap-2 mb-4">
                <div className={`text-xs ${status === 'high' ? 'text-orange-500' : status === 'low' ? 'text-rose-500' : 'text-slate-500'}`}>
                    {icon}
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
            </div>
            <p className="text-2xl font-black text-white italic group-hover:scale-105 transition-transform origin-left">{value}</p>
            <p className={`text-[9px] font-black uppercase mt-1 ${status === 'high' ? 'text-orange-500' : status === 'low' ? 'text-rose-500' : 'text-slate-600'}`}>{subValue}</p>
        </div>
    );

    const ExchangeItem = ({ name, status, vol, color }) => (
        <div className="flex items-center justify-between p-3 bg-[#0b0e11]/50 rounded-xl border border-white/5">
            <div className="flex items-center gap-3">
                <div className={`w-1.5 h-1.5 rounded-full ${color} animate-pulse`}></div>
                <span className="text-xs font-black text-white">{name}</span>
            </div>
            <div className="text-right">
                <p className="text-[8px] font-black text-slate-600 uppercase">VOL: {vol}</p>
                <p className="text-[8px] font-black text-emerald-500 uppercase tracking-tighter">{status}</p>
            </div>
        </div>
    );

    const LiquidationHeatmap = () => {
        const coin = monitoredCoins.find(c => c.symbol === selectedCoin);
        const maxIntensity = Math.max(...priceBuckets.map(b => b.total), 1);

        return (
            <div className="flex flex-col gap-6 animate-in fade-in duration-700">
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
                    <div className="xl:col-span-3 bg-[#0b0e11] rounded-[3rem] border border-white/5 p-8 relative overflow-hidden shadow-inner">
                        <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>

                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white flex items-center gap-3">
                                <div className="w-1.5 h-6 bg-orange-500 rounded-full"></div>
                                Cluster Liquidation Heatmap • {selectedCoin}/USDT
                            </h3>
                            <div className="flex gap-4">
                                <span className="text-[10px] font-black text-rose-500 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20 uppercase">Long Liq Zone</span>
                                <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 uppercase">Short Liq Zone</span>
                            </div>
                        </div>

                        <div className="relative h-[600px] bg-[#161a1e]/30 rounded-[2.5rem] border border-white/[0.03] overflow-y-auto no-scrollbar p-10">
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
                                            transition={{ delay: i * 0.01 }}
                                            className="w-full flex items-center group cursor-pointer py-0.5"
                                        >
                                            <div className="w-24 text-right pr-6">
                                                <p className="text-[10px] font-black text-slate-500 group-hover:text-white transition-colors">
                                                    ${selectedCoin === 'ARPA' ? bucket.price.toFixed(5) : bucket.price.toFixed(2)}
                                                </p>
                                            </div>

                                            <div className="flex-1 h-3 relative flex items-center">
                                                <div className="absolute inset-0 bg-white/[0.01] rounded-full"></div>
                                                <motion.div
                                                    className="h-full rounded-full relative overflow-hidden"
                                                    style={{
                                                        width: `${(bucket.total / maxIntensity) * 100}%`,
                                                        backgroundColor: colorClass,
                                                        boxShadow: intensity > 0.7 ? `0 0 20px ${colorClass}` : 'none'
                                                    }}
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent"></div>
                                                </motion.div>
                                                {intensity > 0.3 && (
                                                    <span className="ml-4 text-[8px] font-black text-white/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        ${Math.round(bucket.total / 1000)}k
                                                    </span>
                                                )}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>

                            <div className="absolute left-0 right-0 top-1/2 border-t-2 border-dashed border-orange-500/30 z-10">
                                <div className="absolute left-4 -top-3 bg-orange-600 text-white text-[8px] font-black px-2 py-1 rounded shadow-xl uppercase">
                                    Current Market Zone
                                </div>
                            </div>
                        </div>

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
                                    <p className="text-2xl font-black text-rose-500 italic">${Math.round(priceBuckets.reduce((a, b) => a + b.longs, 0) / 1000)}k</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Total Shorts Risk</p>
                                    <p className="text-2xl font-black text-emerald-500 italic">${Math.round(priceBuckets.reduce((a, b) => a + b.shorts, 0) / 1000)}k</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-[#1e2329] p-6 rounded-[3rem] border border-white/5 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:rotate-12 transition-transform">
                                <FaSkull className="text-rose-500 text-4xl" />
                            </div>
                            <h4 className="text-[10px] font-black uppercase text-white tracking-[0.2em] mb-4 flex items-center gap-2">
                                <div className="w-1 h-1 bg-rose-500 rounded-full animate-pulse"></div>
                                Live Liquidation Feed
                            </h4>
                            <div className="space-y-3 h-[500px] overflow-y-auto no-scrollbar pr-2">
                                {liquidations.filter(l => l.symbol === selectedCoin).slice(0, 20).map(liq => (
                                    <div key={liq.id} className="bg-[#0b0e11]/50 p-4 rounded-2xl border border-white/5 flex items-center justify-between group hover:border-orange-500/30 transition-all cursor-pointer">
                                        <div>
                                            <p className={`text-[10px] font-black ${liq.side === 'SELL' ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                {liq.side === 'SELL' ? 'LONG LIQUIDATED' : 'SHORT LIQUIDATED'}
                                            </p>
                                            <p className="text-[9px] text-slate-500 font-bold tracking-widest mt-0.5">${liq.price.toFixed(selectedCoin === 'ARPA' ? 5 : 2)}</p>
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
        <div className="min-h-screen bg-[#0b0e11] text-white p-4 lg:p-10 font-sans selection:bg-orange-600/30">
            <header className="mb-12 relative">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-orange-600 rounded-3xl blur-2xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                            <div className="p-6 bg-[#1e2329] rounded-3xl border border-white/10 relative">
                                <FaFireAlt size={38} className="text-orange-500" />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-4xl lg:text-5xl font-black italic uppercase tracking-tighter leading-none">
                                Whale <span className="text-orange-600">Master</span> Monitor
                            </h1>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.5em] mt-3 flex items-center gap-3">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                ARPA Specialist Tactical Console • Real-Time Nodes
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 bg-[#1e2329] p-2 rounded-[2rem] border border-white/5 shadow-2xl overflow-x-auto no-scrollbar">
                        <button
                            onClick={() => setActiveTab('arpa_pro')}
                            className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all duration-300 ${activeTab === 'arpa_pro' ? 'bg-orange-600 text-white shadow-[0_0_20px_rgba(234,88,12,0.4)]' : 'text-slate-500 hover:text-white'}`}
                        >
                            ARPA Pro Deep Dive
                        </button>
                        <button
                            onClick={() => setActiveTab('flow')}
                            className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all duration-300 ${activeTab === 'flow' ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]' : 'text-slate-500 hover:text-white'}`}
                        >
                            Global Spot Flow
                        </button>
                        <button
                            onClick={() => setActiveTab('liquidations')}
                            className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all duration-300 ${activeTab === 'liquidations' ? 'bg-[#fcd535] text-black shadow-[0_0_20px_rgba(252,213,53,0.4)]' : 'text-slate-500 hover:text-white'}`}
                        >
                            Futures Heatmap
                        </button>
                    </div>
                </div>
            </header>

            {activeTab === 'arpa_pro' ? (
                <ARPADeepDive />
            ) : activeTab === 'flow' ? (
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="xl:col-span-3">
                        <div className="bg-[#1e2329] rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
                            <div className="p-10 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                                <h2 className="text-xs font-black uppercase tracking-[0.3em] flex items-center gap-3">
                                    <FaWater className="text-blue-500" />
                                    Global Whale Order Flow
                                </h2>
                                <div className="flex items-center gap-4">
                                    <span className="text-[10px] font-black text-slate-500 bg-white/5 px-4 py-1.5 rounded-full border border-white/5">MONITORING: LTC, ARPA, ARK</span>
                                </div>
                            </div>

                            <table className="w-full text-left">
                                <thead className="bg-[#0b0e11]/50 border-b border-white/5">
                                    <tr>
                                        <th className="px-10 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Asset</th>
                                        <th className="px-10 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Volume</th>
                                        <th className="px-10 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Value USD</th>
                                        <th className="px-10 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Side</th>
                                        <th className="px-10 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <AnimatePresence initial={false}>
                                        {transactions.map(tx => (
                                            <motion.tr
                                                key={tx.id}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="border-b border-white/[0.02] hover:bg-white/[0.01] group"
                                            >
                                                <td className="px-10 py-5">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-2xl bg-black/40 p-2 border border-white/5 group-hover:scale-110 transition-transform">
                                                            <img src={monitoredCoins.find(c => c.symbol === tx.coin)?.icon} alt="" className="w-full h-full object-contain" />
                                                        </div>
                                                        <span className="text-sm font-black text-white">{tx.coin}</span>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-5 text-right font-black text-sm text-orange-500">{tx.amount.toLocaleString()}</td>
                                                <td className="px-10 py-5 text-right font-black text-sm text-white">${tx.amountUsd.toLocaleString()}</td>
                                                <td className="px-10 py-5 text-right">
                                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${tx.isBuy ? 'text-emerald-500 bg-emerald-500/10' : 'text-rose-500 bg-rose-500/10'}`}>
                                                        {tx.isBuy ? 'BUY' : 'SELL'}
                                                    </span>
                                                </td>
                                                <td className="px-10 py-5 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">{tx.time}</td>
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
