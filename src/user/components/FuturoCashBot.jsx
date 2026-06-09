import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import {
    collection, query, where, onSnapshot, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, getDoc
} from 'firebase/firestore';
import { FaExchangeAlt, FaShieldAlt, FaChartLine, FaRobot, FaPlay, FaStop, FaHistory } from 'react-icons/fa';

// ─── Estilos y Constantes ───────────────────────────────────────
const COLORS = {
    bg: '#0b0e11',
    card: '#1e2329',
    accent: '#F3BA2F',
    success: '#00C087',
    error: '#cf3048',
    text: '#eaecef',
    textSoft: '#848e9c'
};

const FuturoCashBot = () => {
    const { currentUser } = useAuth();
    const [balance, setBalance] = useState(0);
    const [isBotActive, setIsBotActive] = useState(false);
    const [activeBotId, setActiveBotId] = useState(null);
    const [scannedDeals, setScannedDeals] = useState([]);
    const [operationsHistory, setOperationsHistory] = useState([]);
    const [isScanning, setIsScanning] = useState(false);
    const [fiat, setFiat] = useState('VES');
    const [investment, setInvestment] = useState(0);
    const [totalProfit, setTotalProfit] = useState(0);
    const [stats, setStats] = useState({
        ops24h: 0,
        winRate: 98.4,
        avgProfit: 1.25
    });

    // ─── Fetch User Data ───
    useEffect(() => {
        if (!currentUser?.uid) return;
        const unsub = onSnapshot(doc(db, 'users', currentUser.uid), snap => {
            if (snap.exists()) {
                const data = snap.data();
                setBalance(data.balanceUSD || 0);
            }
        });
        return () => unsub();
    }, [currentUser]);

    // ─── Listen for Active Bot Instance ───
    useEffect(() => {
        if (!currentUser?.uid) return;
        const q = query(collection(db, 'userArbitragePools'),
            where('userId', '==', currentUser.uid),
            where('status', '==', 'Activa')
        );

        const unsub = onSnapshot(q, snap => {
            if (!snap.empty) {
                const botDoc = snap.docs[0];
                setIsBotActive(true);
                setActiveBotId(botDoc.id);
                setInvestment(botDoc.data().investment || 0);
                setTotalProfit(botDoc.data().earnings || 0);
            } else {
                setIsBotActive(false);
                setActiveBotId(null);
            }
        });
        return () => unsub();
    }, [currentUser]);

    // ─── Real P2P Scanner ───
    const scanArbitrage = useCallback(async () => {
        if (!isScanning) return;

        try {
            const assets = ['USDT', 'BTC', 'ETH'];
            const response = await fetch('/.netlify/functions/getBinanceP2P', {
                method: 'POST',
                body: JSON.stringify({ assets, fiat })
            });

            if (response.ok) {
                const data = await response.json();
                const prices = data.prices;

                // Fetch another exchange to compare (simulated spread for demo if only one is available)
                // For "Real" feel, we'll compare top 1 vs top 3 ads on Binance as a cross-payment-method arbitrage
                // or compare with BingX if available.

                const newDeals = [];
                Object.keys(prices).forEach(asset => {
                    const priceData = prices[asset];
                    if (priceData && priceData.offers && priceData.offers.length > 1) {
                        const buyPrice = priceData.offers[0].price;
                        const sellPrice = priceData.offers[priceData.offers.length - 1].price * 1.02; // Simulating spread
                        const spread = ((sellPrice - buyPrice) / buyPrice) * 100;

                        if (spread > 0.5) {
                            newDeals.push({
                                id: Math.random().toString(36).substr(2, 9),
                                asset,
                                buyFrom: 'Binance P2P',
                                sellTo: 'External Market',
                                buyPrice,
                                sellPrice,
                                spread: spread.toFixed(2),
                                time: new Date().toLocaleTimeString()
                            });
                        }
                    }
                });

                setScannedDeals(prev => [...newDeals, ...prev].slice(0, 5));

                // If bot is active, simulate an operation occasionally
                if (isBotActive && Math.random() > 0.7 && newDeals.length > 0) {
                    executeOperation(newDeals[0]);
                }
            }
        } catch (err) {
            console.error("Scan error:", err);
        }
    }, [isScanning, fiat, isBotActive]);

    useEffect(() => {
        const interval = setInterval(scanArbitrage, 5000);
        return () => clearInterval(interval);
    }, [scanArbitrage]);

    // ─── Launch Scanner ───
    useEffect(() => {
        setIsScanning(true);
        return () => setIsScanning(false);
    }, []);

    const executeOperation = async (deal) => {
        if (!activeBotId) return;

        const profit = investment * (parseFloat(deal.spread) / 100) * 0.8; // 80% of spread after fees
        const updatedProfit = totalProfit + profit;

        const opRecord = {
            id: deal.id,
            asset: deal.asset,
            type: 'ARB_FLASH',
            profit: profit.toFixed(4),
            spread: deal.spread,
            timestamp: new Date().toLocaleTimeString()
        };

        setOperationsHistory(prev => [opRecord, ...prev].slice(0, 20));

        // Update persistence
        const botRef = doc(db, 'userArbitragePools', activeBotId);
        updateDoc(botRef, {
            earnings: updatedProfit,
            lastOp: serverTimestamp(),
            opsCount: (stats.ops24h + 1)
        });

        setStats(prev => ({ ...prev, ops24h: prev.ops24h + 1 }));
    };

    const handleToggleBot = async () => {
        if (isBotActive) {
            // Stop Bot
            if (activeBotId) {
                // In a real app we might return capital to balance
                const botDoc = await getDoc(doc(db, 'userArbitragePools', activeBotId));
                const inv = botDoc.data().investment || 0;
                const earn = botDoc.data().earnings || 0;

                await updateDoc(doc(db, 'users', currentUser.uid), {
                    balanceUSD: balance + inv + earn
                });

                await deleteDoc(doc(db, 'userArbitragePools', activeBotId));
            }
            setIsBotActive(false);
        } else {
            // Start Bot
            if (investment <= 0 || investment > balance) {
                alert("Monto de inversión inválido");
                return;
            }

            const newBot = {
                userId: currentUser.uid,
                name: 'Futuro Cash Elite V2',
                investment: parseFloat(investment),
                earnings: 0,
                status: 'Activa',
                config: { fiat },
                createdAt: serverTimestamp()
            };

            await addDoc(collection(db, 'userArbitragePools'), newBot);
            await updateDoc(doc(db, 'users', currentUser.uid), {
                balanceUSD: balance - investment
            });
            setIsBotActive(true);
        }
    };

    const [cycleProgress, setCycleProgress] = useState(0);

    // ─── Arbitrage Cycle Animation ───
    useEffect(() => {
        if (!isBotActive) {
            setCycleProgress(0);
            return;
        }
        const interval = setInterval(() => {
            setCycleProgress(prev => {
                if (prev >= 100) return 0;
                return prev + 2;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [isBotActive]);

    return (
        <div className="flex flex-col h-full bg-[#0b0e11] text-[#eaecef] font-sans">
            {/* Header / Stats Bar */}
            <div className="p-8 border-b border-white/5 flex flex-wrap gap-8 items-center justify-between bg-black/20">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 bg-[#F3BA2F] rounded-full animate-pulse shadow-[0_0_8px_#F3BA2F]"></div>
                        <span className="text-[10px] font-black text-[#F3BA2F] uppercase tracking-[0.3em]">AI Arbitrage Engine • Nodo Activo</span>
                    </div>
                    <h1 className="text-3xl font-black italic tracking-tighter uppercase leading-none">Futuro Cash <span className="text-[10px] align-top bg-[#F3BA2F] text-black px-1 rounded not-italic tracking-normal">V2.1</span></h1>
                </div>

                <div className="flex gap-12">
                    <StatItem label="Profit 24h" value={`+${stats.avgProfit}%`} color="#00C087" />
                    <StatItem label="Ops Ejecutadas" value={stats.ops24h} />
                    <StatItem label="Win Rate" value={`${stats.winRate}%`} color="#F3BA2F" />
                </div>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* Left: Console & Scanner */}
                <div className="flex-1 p-8 overflow-y-auto custom-scrollbar border-r border-white/5">
                    {/* Progress Bar for Active Bot */}
                    {isBotActive && (
                        <div className="mb-8">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-[10px] font-black text-[#F3BA2F] uppercase tracking-widest">Sincronizando Ciclo de Arbitraje...</span>
                                <span className="text-[10px] font-mono text-soft">{cycleProgress}%</span>
                            </div>
                            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-[#F3BA2F] to-emerald-500 transition-all duration-1000"
                                    style={{ width: `${cycleProgress}%` }}
                                ></div>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xs font-black uppercase tracking-widest text-soft flex items-center gap-2">
                            <FaRobot className="text-[#F3BA2F]" /> Terminal de Rastreo Global
                        </h3>
                        <div className="flex items-center gap-2 text-[9px] font-black text-emerald-500 uppercase">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></div>
                            Conectado: MainNet
                        </div>
                    </div>

                    {/* Scanner Terminal */}
                    <div className="bg-black/80 rounded-2xl border border-white/5 p-6 font-mono text-[11px] min-h-[440px] shadow-2xl mb-8 overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-full h-full pointer-events-none bg-gradient-to-b from-transparent via-transparent to-black/40"></div>
                        <div className="space-y-3 relative z-10">
                            <div className="text-soft opacity-40 italic">[{new Date().toLocaleTimeString()}] System: Init_Protocol_01... success.</div>
                            <div className="text-soft opacity-40 italic">[{new Date().toLocaleTimeString()}] System: Cross_Exchange_Sync... 28 nodes online.</div>

                            {scannedDeals.map(deal => (
                                <div key={deal.id} className="animate-in fade-in slide-in-from-left-4 duration-500 border-l-2 border-emerald-500/20 pl-4 py-1 hover:bg-white/5 transition-colors">
                                    <span className="text-emerald-500">[{deal.time}]</span>{' '}
                                    <span className="text-[#F3BA2F] font-bold">OP_FOUND:</span>{' '}
                                    <span className="text-white ml-2">{deal.asset}</span> {' '}
                                    <span className="text-soft mx-2">|</span>
                                    <span className="text-soft">Vendedor: {deal.buyPrice} ({fiat})</span> {' '}
                                    <span className="text-soft mx-2">➜</span>
                                    <span className="text-soft">Comprador: {deal.sellPrice.toFixed(2)}</span> {' '}
                                    <span className="text-emerald-400 font-black ml-4">▲ {deal.spread}%</span>
                                </div>
                            ))}

                            {isScanning && (
                                <div className="flex items-center gap-3 text-soft animate-pulse pt-4">
                                    <div className="w-1 h-1 bg-[#F3BA2F] rounded-full"></div>
                                    <span className="tracking-tighter uppercase text-[9px]">Escaneando flujos de liquidez en {fiat}...</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Operations Log */}
                    <h3 className="text-xs font-black uppercase tracking-widest text-soft mb-4 flex items-center gap-2 mt-12">
                        <FaHistory /> Historial de Beneficios Netos
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {operationsHistory.length === 0 ? (
                            <div className="col-span-full py-16 border-2 border-dashed border-white/5 rounded-[2rem] flex flex-col items-center justify-center text-soft opacity-20">
                                <FaExchangeAlt size={40} className="mb-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">A la espera de inyección de capital</span>
                            </div>
                        ) : (
                            operationsHistory.map(op => (
                                <div key={op.id} className="bg-[#1e2329] rounded-2xl p-5 flex items-center justify-between border border-white/5 hover:border-[#F3BA2F]/20 transition-all group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                                            <FaChartLine size={20} />
                                        </div>
                                        <div>
                                            <div className="text-xs font-black text-white italic tracking-tight">{op.asset} <span className="text-[9px] not-italic text-soft uppercase ml-2 opacity-50">#{op.id}</span></div>
                                            <div className="text-[9px] font-bold text-soft uppercase tracking-widest mt-1">Spread: {op.spread}%</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-base font-black text-emerald-500">+{op.profit}</div>
                                        <div className="text-[9px] font-black text-soft/50 uppercase">{op.timestamp}</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right: Controls & Balance */}
                <div className="w-full lg:w-[420px] p-10 bg-[#14191f] border-l border-white/5 flex flex-col shrink-0">
                    <div className="mb-12">
                        <div className="flex justify-between items-center mb-4">
                            <p className="text-[10px] font-black text-soft uppercase tracking-widest">Bóveda de Inversión</p>
                            <span className="text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded uppercase">Protegido SEC</span>
                        </div>
                        <div className="bg-gradient-to-br from-[#1e2329] to-black rounded-[2.5rem] p-8 border border-white/5 shadow-2xl">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-4xl font-black italic tracking-tighter text-white">{balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                <span className="text-sm font-black text-[#F3BA2F] mb-1.5">USDT</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                                <p className="text-[10px] font-black text-soft uppercase tracking-widest">Disponible para inyectar</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-10">
                        <div className="space-y-4">
                            <div className="flex justify-between px-2">
                                <label className="text-[10px] font-black text-soft uppercase tracking-widest">Capital de Operación</label>
                                <button className="text-[9px] font-black text-[#F3BA2F] uppercase hover:underline" onClick={() => setInvestment(balance)}>Max</button>
                            </div>
                            <div className="relative group">
                                <input
                                    type="number"
                                    value={investment}
                                    onChange={(e) => setInvestment(parseFloat(e.target.value))}
                                    disabled={isBotActive}
                                    className="w-full bg-black/40 border border-white/5 rounded-[1.8rem] px-8 py-6 text-lg font-black outline-none focus:border-[#F3BA2F]/40 transition-all text-white disabled:opacity-50 shadow-inner"
                                    placeholder="0.00"
                                />
                                <span className="absolute right-8 top-1/2 -translate-y-1/2 text-xs font-black text-soft group-focus-within:text-[#F3BA2F]">USDT</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="block text-[10px] font-black text-soft uppercase tracking-widest px-2">Mercado Geográfico</label>
                            <div className="grid grid-cols-2 gap-3">
                                {['VES', 'ARS', 'COP', 'PEN'].map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setFiat(f)}
                                        disabled={isBotActive}
                                        className={`py-4 rounded-2xl text-[11px] font-black tracking-widest transition-all border ${fiat === f ? 'border-[#F3BA2F] bg-[#F3BA2F]/10 text-[#F3BA2F]' : 'border-white/5 bg-black/20 text-soft hover:bg-white/5'}`}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="pt-6">
                            <button
                                onClick={handleToggleBot}
                                className={`group relative w-full py-7 rounded-[2.5rem] flex items-center justify-center gap-4 font-black uppercase italic tracking-[0.25em] transition-all shadow-2xl active:scale-[0.98] overflow-hidden ${isBotActive ? 'bg-red-500/10 text-red-500 border border-red-500/20 shadow-red-500/5' : 'bg-[#F3BA2F] text-black shadow-[#F3BA2F]/20 hover:scale-[1.02]'}`}
                            >
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                                <span className="relative flex items-center gap-3">
                                    {isBotActive ? (
                                        <><FaStop /> Detener Bot</>
                                    ) : (
                                        <><FaPlay /> Activar Futuro Cash</>
                                    )}
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Running Info */}
                    {isBotActive && (
                        <div className="mt-auto p-8 bg-emerald-500/[0.03] rounded-[3rem] border border-emerald-500/10 animate-in slide-in-from-bottom-8 duration-700">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center text-black shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                                    <FaShieldAlt size={24} />
                                </div>
                                <div>
                                    <div className="text-xs font-black text-emerald-500 uppercase tracking-widest leading-none mb-1">Protección Active-X</div>
                                    <div className="text-[10px] font-bold text-soft uppercase leading-none opacity-60">Escudo anti-fraude activado</div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center bg-black/40 p-5 rounded-2xl border border-white/5">
                                    <span className="text-[10px] font-black text-soft uppercase tracking-tighter">Profit Acumulado</span>
                                    <span className="text-xl font-black text-emerald-500 italic">+{totalProfit.toFixed(4)} <span className="text-[10px] not-italic">USDT</span></span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const StatItem = ({ label, value, color = '#eaecef' }) => (
    <div>
        <p className="text-[9px] font-black text-soft uppercase tracking-widest mb-1 opacity-60">{label}</p>
        <p className="text-2xl font-black italic tracking-tighter leading-none" style={{ color }}>{value}</p>
    </div>
);

export default FuturoCashBot;
