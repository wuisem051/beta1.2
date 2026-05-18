import React, { useState, useEffect, useMemo } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';
import {
    TrendingUp,
    Clock,
    Calendar,
    RefreshCw,
    ArrowUpRight,
    ArrowDownRight,
    Activity,
    History
} from 'lucide-react';
import { db } from '../../services/firebase';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, where, getDocs } from 'firebase/firestore';

const USDTTrend = () => {
    const [timeframe, setTimeframe] = useState('24H');
    const [chartData, setChartData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPrices, setCurrentPrices] = useState({
        binance: 0,
        bitunix: 0,
        bingx: 0
    });

    // Cargar historial desde Firestore
    useEffect(() => {
        setIsLoading(true);
        const historyRef = collection(db, 'p2p_price_trend');
        const q = query(historyRef, orderBy('timestamp', 'asc'), limit(150));

        const unsubscribe = onSnapshot(q,
            (snapshot) => {
                const fetchedData = snapshot.docs.map(doc => {
                    const d = doc.data();
                    const ts = d.timestamp?.toDate() || new Date();
                    return {
                        id: doc.id,
                        time: ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        date: ts.toLocaleDateString(),
                        fullTimestamp: ts,
                        binance: d.binance || 0,
                        bitunix: d.bitunix || 0,
                        bingx: d.bingx || 0
                    };
                });

                setChartData(fetchedData);

                // Si la base está vacía, forzamos el primer registro
                if (fetchedData.length === 0) {
                    recordCurrentPrices();
                } else {
                    const last = fetchedData[fetchedData.length - 1];
                    setCurrentPrices({
                        binance: last.binance,
                        bitunix: last.bitunix,
                        bingx: last.bingx
                    });
                }
                setIsLoading(false);
            },
            (error) => {
                console.error("Firestore Trend Error:", error);
                setIsLoading(false);
            }
        );

        // Fetch de precios actuales inmediatos
        fetchLivePrices();

        // Intervalo de auto-grabado cada 5 minutos
        const interval = setInterval(recordCurrentPrices, 5 * 60 * 1000);

        return () => {
            unsubscribe();
            clearInterval(interval);
        };
    }, []);

    const fetchLivePrices = async () => {
        try {
            const resp = await Promise.all([
                fetch('/.netlify/functions/getBinanceP2P', { method: 'POST', body: JSON.stringify({ assets: ['USDT'], fiat: 'VES' }) }),
                fetch('/.netlify/functions/getBitunixP2P', { method: 'POST', body: JSON.stringify({ assets: ['USDT'], fiat: 'VES' }) }),
                fetch('/.netlify/functions/getBingXP2P', { method: 'POST', body: JSON.stringify({ assets: ['USDT'], fiat: 'VES' }) })
            ]);
            const [b, u, x] = await Promise.all(resp.map(r => r.json()));
            setCurrentPrices({
                binance: b.prices?.USDT?.price || 0,
                bitunix: u.prices?.USDT?.price || 0,
                bingx: x.prices?.USDT?.price || 0
            });
        } catch (e) { }
    };

    // Función para grabar un punto de datos
    const recordCurrentPrices = async () => {
        try {
            const resp = await Promise.all([
                fetch('/.netlify/functions/getBinanceP2P', { method: 'POST', body: JSON.stringify({ assets: ['USDT'], fiat: 'VES' }) }),
                fetch('/.netlify/functions/getBitunixP2P', { method: 'POST', body: JSON.stringify({ assets: ['USDT'], fiat: 'VES' }) }),
                fetch('/.netlify/functions/getBingXP2P', { method: 'POST', body: JSON.stringify({ assets: ['USDT'], fiat: 'VES' }) })
            ]);

            const [b, u, x] = await Promise.all(resp.map(r => r.json()));

            const bp = b.prices?.USDT?.price || 0;
            const up = u.prices?.USDT?.price || 0;
            const xp = x.prices?.USDT?.price || 0;

            if (bp > 0) {
                await addDoc(collection(db, 'p2p_price_trend'), {
                    timestamp: serverTimestamp(),
                    binance: bp,
                    bitunix: up,
                    bingx: xp
                });

                // Actualizar visualmente de inmediato
                setCurrentPrices({ binance: bp, bitunix: up, bingx: xp });
            }
        } catch (err) {
            console.error("Error recording trend point:", err);
        }
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-[#1e2329] border border-[#2b3139] p-4 rounded-xl shadow-2xl backdrop-blur-md">
                    <p className="text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">{label} - {payload[0]?.payload.date}</p>
                    <div className="space-y-2">
                        {payload.map((entry, index) => (
                            <div key={index} className="flex items-center justify-between gap-8">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                                    <span className="text-xs font-bold text-[#eaecef] uppercase tracking-tighter">{entry.name}</span>
                                </div>
                                <span className="text-xs font-black text-[#f0b90b]">Bs. {entry.value?.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="flex flex-col h-[calc(100vh-120px)] bg-[#0b0e11] text-[#eaecef] p-4 lg:p-8 overflow-hidden gap-6">

            {/* Header / Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
                <div className="bg-[#1e2329] border border-[#2b3139] p-6 rounded-[2rem] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-[#f0b90b]/5 rounded-bl-full -mr-8 -mt-8"></div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-[#f0b90b]/10 rounded-xl">
                            <TrendingUp className="text-[#f0b90b] w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Binance P2P</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black italic tracking-tighter text-white">
                            Bs. {currentPrices.binance?.toLocaleString()}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                            <ArrowUpRight className="w-3 h-3" /> LIVE
                        </span>
                    </div>
                </div>

                <div className="bg-[#1e2329] border border-[#2b3139] p-6 rounded-[2rem] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full -mr-8 -mt-8"></div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-500/10 rounded-xl">
                            <Activity className="text-blue-500 w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Bitunix P2P</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black italic tracking-tighter text-white">
                            Bs. {currentPrices.bitunix?.toLocaleString()}
                        </span>
                        <span className="text-[10px] font-bold text-blue-500 flex items-center gap-1">
                            BITGET AGG
                        </span>
                    </div>
                </div>

                <div className="bg-[#1e2329] border border-[#2b3139] p-6 rounded-[2rem] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-[#f0b90b]/5 rounded-bl-full -mr-8 -mt-8"></div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-[#f0b90b]/10 rounded-xl">
                            <History className="text-[#f0b90b] w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Estado Sistema</span>
                    </div>
                    <button
                        onClick={recordCurrentPrices}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#f0b90b] hover:text-black transition-all"
                    >
                        <RefreshCw className="w-3 h-3" /> Grabar Punto de Tendencia
                    </button>
                </div>
            </div>

            {/* Main Chart Area */}
            <div className="flex-1 bg-[#1e2329] border border-[#2b3139] rounded-[2.5rem] p-8 flex flex-col gap-6 overflow-hidden relative shadow-2xl">
                <div className="flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <History className="text-[#f0b90b] w-6 h-6" />
                        <div>
                            <h2 className="text-xl font-black italic tracking-tighter uppercase leading-none">Tendencia USDT / BS</h2>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Historial Comparativo de Exchanges</p>
                        </div>
                    </div>

                    <div className="flex bg-[#0b0e11] p-1 rounded-2xl border border-white/5">
                        {['1H', '24H', '7D', 'ALL'].map(tf => (
                            <button
                                key={tf}
                                onClick={() => setTimeframe(tf)}
                                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${timeframe === tf ? 'bg-[#f0b90b] text-black shadow-lg shadow-[#f0b90b]/10' : 'text-slate-500 hover:text-[#eaecef]'}`}
                            >
                                {tf}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 w-full min-h-0 pt-4">
                    {isLoading ? (
                        <div className="h-full flex items-center justify-center flex-col gap-4">
                            <RefreshCw className="w-8 h-8 text-[#f0b90b] animate-spin" />
                            <span className="text-xs font-black uppercase tracking-widest text-slate-500">Cargando Historial...</span>
                        </div>
                    ) : chartData.length === 0 ? (
                        <div className="h-full flex items-center justify-center flex-col gap-4 text-center">
                            <History className="w-12 h-12 text-slate-700" />
                            <div className="max-w-xs">
                                <h3 className="text-sm font-black uppercase tracking-widest text-[#eaecef] mb-2">No hay datos suficientes</h3>
                                <p className="text-[10px] text-slate-500 leading-relaxed uppercase">Presiona "Grabar Punto" para iniciar el historial de precios en tiempo real.</p>
                            </div>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorBinance" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f0b90b" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#f0b90b" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorBitunix" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorBingx" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#14F195" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#14F195" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis
                                    dataKey="time"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }}
                                    minTickGap={30}
                                />
                                <YAxis
                                    domain={['auto', 'auto']}
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }}
                                    orientation="right"
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend
                                    verticalAlign="top"
                                    align="right"
                                    iconType="circle"
                                    wrapperStyle={{ top: -20, right: 0, fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}
                                />
                                <Area
                                    type="monotone"
                                    name="Binance"
                                    dataKey="binance"
                                    stroke="#f0b90b"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorBinance)"
                                    animationDuration={1500}
                                />
                                <Area
                                    type="monotone"
                                    name="Bitunix"
                                    dataKey="bitunix"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorBitunix)"
                                    animationDuration={1500}
                                />
                                <Area
                                    type="monotone"
                                    name="BingX"
                                    dataKey="bingx"
                                    stroke="#14F195"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorBingx)"
                                    animationDuration={1500}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>
        </div>
    );
};

export default USDTTrend;
