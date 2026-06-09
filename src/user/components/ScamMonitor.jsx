import React, { useState, useEffect, useCallback } from 'react';
import {
    ShieldAlert,
    ArrowRight,
    Activity,
    Target,
    ExternalLink,
    Copy,
    ChevronRight,
    TrendingDown,
    Lock,
    Ghost,
    RefreshCw,
    Skull,
    Search,
    AlertTriangle,
    Zap
} from 'lucide-react';

const SCAM_ADDRESS = "TDNbRwDyRbR5DQ5JiHFjQqdg4SsK2yuk4A";
const MAIN_WALLET = "TVqKP6pSXP5CqCuZwyGL6jrCVMEfyAXEPp";

const ScamMonitor = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(new Date());
    const [copySuccess, setCopySuccess] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch('/.netlify/functions/getTronScanData', {
                method: 'POST',
                body: JSON.stringify({ address: SCAM_ADDRESS })
            });
            const result = await response.json();
            setData(result);
            setLastUpdate(new Date());
        } catch (error) {
            console.error("Error fetching scam data:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 60000); // Actualizar cada minuto
        return () => clearInterval(interval);
    }, [fetchData]);

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        setCopySuccess(text);
        setTimeout(() => setCopySuccess(''), 2000);
    };

    if (loading && !data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="w-16 h-16 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin"></div>
                <p className="text-red-500 font-black uppercase tracking-widest text-xs animate-pulse">Sincronizando con TRON Network...</p>
            </div>
        );
    }

    return (
        <div className="p-4 lg:p-8 space-y-8 animate-in fade-in duration-700">
            {/* Header / Alert */}
            <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-red-500/20 rounded-3xl flex items-center justify-center text-red-500 shadow-lg shadow-red-500/10">
                        <ShieldAlert size={32} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-white italic uppercase tracking-tighter leading-none mb-1">
                            Cyber-Criminal Monitor
                        </h1>
                        <p className="text-[10px] font-black text-red-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                            Vigilancia en Tiempo Real • Amenaza Detectada
                        </p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="text-right">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Última Actualización</p>
                        <p className="text-xs font-black text-white uppercase tracking-tighter">{lastUpdate.toLocaleTimeString()}</p>
                    </div>
                    <button
                        onClick={fetchData}
                        className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all text-white active:scale-95"
                    >
                        <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Modus Operandi Card */}
                <div className="lg:col-span-2 bg-[#1e2329] border border-[#2b3139] p-8 rounded-[3rem] relative overflow-hidden group shadow-2xl">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-3 bg-red-500/10 rounded-2xl text-red-500">
                            <Ghost size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-white uppercase italic tracking-tighter">Análisis de Inteligencia</h2>
                            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Patrón de Operaciones Detectado</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                        <div className="bg-[#0b0e11] border border-white/5 p-6 rounded-[2rem] hover:border-red-500/30 transition-all">
                            <Lock className="text-red-500 w-5 h-5 mb-4" />
                            <h3 className="text-[10px] font-black text-white uppercase tracking-widest mb-2">Paso 1: Bloqueo</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase leading-relaxed">
                                Modifica permisos de cuenta (Multi-sig) para anular la llave privada original de la víctima.
                            </p>
                        </div>
                        <div className="bg-[#0b0e11] border border-white/5 p-6 rounded-[2rem] hover:border-red-500/30 transition-all">
                            <Zap className="text-yellow-500 w-5 h-5 mb-4" />
                            <h3 className="text-[10px] font-black text-white uppercase tracking-widest mb-2">Paso 2: Barrido</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase leading-relaxed">
                                Un bot de alta frecuencia barre cualquier entrada de TRX o Gas en milisegundos.
                            </p>
                        </div>
                        <div className="bg-[#0b0e11] border border-white/5 p-6 rounded-[2rem] hover:border-red-500/30 transition-all">
                            <Target className="text-red-500 w-5 h-5 mb-4" />
                            <h3 className="text-[10px] font-black text-white uppercase tracking-widest mb-2">Paso 3: Extracción</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase leading-relaxed">
                                Envío automático de fondos a la Cartera Principal del criminal.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Target Address Card */}
                <div className="bg-[#1e2329] border border-[#2b3139] p-8 rounded-[3rem] shadow-2xl space-y-6">
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-red-500/10 rounded-2xl text-red-500 shrink-0">
                                <Search size={20} />
                            </div>
                            <h2 className="text-xs font-black text-white uppercase tracking-widest">Objetivo bajo Vigilancia</h2>
                        </div>
                        <div className="bg-[#0b0e11] border border-white/5 p-5 rounded-2xl mb-4 group relative overflow-hidden">
                            <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1 text-center">Address Vigilada</p>
                            <p className="text-xs font-mono text-main break-all text-center selection:bg-red-500/30">{SCAM_ADDRESS}</p>
                            <button
                                onClick={() => handleCopy(SCAM_ADDRESS)}
                                className="absolute top-2 right-2 p-2 text-slate-700 hover:text-white transition-all"
                            >
                                <Copy size={12} />
                            </button>
                        </div>
                        <div className="bg-[#0b0e11] border border-red-500/10 p-5 rounded-2xl group relative overflow-hidden">
                            <p className="text-[8px] font-black text-red-600 uppercase tracking-widest mb-1 text-center">Cartera Principal (Criminal)</p>
                            <p className="text-xs font-mono text-red-500 break-all text-center">{MAIN_WALLET}</p>
                            <button
                                onClick={() => handleCopy(MAIN_WALLET)}
                                className="absolute top-2 right-2 p-2 text-red-900/50 hover:text-red-500 transition-all"
                            >
                                <Copy size={12} />
                            </button>
                        </div>
                    </div>

                    <div className="flex items-baseline justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Balance TRX</span>
                        <span className="text-xl font-black text-white italic tracking-tighter">
                            {(data?.account?.balance / 1000000 || 0).toFixed(4)} TRX
                        </span>
                    </div>

                    <a
                        href={`https://tronscan.org/#/address/${SCAM_ADDRESS}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-[#eaecef] flex items-center justify-center gap-3 hover:bg-white/10 transition-all group"
                    >
                        Ver en TronScan <ExternalLink size={14} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </a>
                </div>
            </div>

            {/* Transactions Section */}
            <div className="bg-[#1e2329] border border-[#2b3139] rounded-[3rem] overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-white/5 bg-white/[0.01] flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/5 rounded-2xl text-slate-400">
                            <Activity size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">Registro Forense de Activos</h2>
                            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.2em] mt-1">Sincronizado vía TronGrid API</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">ONLINE</span>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-[#0b0e11]/50">
                            <tr className="border-b border-white/5">
                                <th className="px-8 py-5 text-[9px] font-black text-slate-600 uppercase tracking-widest">Timestamp</th>
                                <th className="px-8 py-5 text-[9px] font-black text-slate-600 uppercase tracking-widest">Hash / Operación</th>
                                <th className="px-8 py-5 text-[9px] font-black text-slate-600 uppercase tracking-widest">Monto</th>
                                <th className="px-8 py-5 text-[9px] font-black text-slate-600 uppercase tracking-widest">De / Hacia</th>
                                <th className="px-8 py-5 text-[9px] font-black text-slate-600 uppercase tracking-widest text-right">Estatus</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                            {data?.transactions?.map((tx, idx) => {
                                const isOut = tx.ownerAddress === SCAM_ADDRESS;
                                const date = new Date(tx.timestamp).toLocaleString();
                                const isToMain = tx.toAddress === MAIN_WALLET;

                                return (
                                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-8 py-6 font-mono text-[10px] text-slate-400 whitespace-nowrap">{date}</td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-3 h-3 rounded-full ${isOut ? (isToMain ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-orange-500') : 'bg-emerald-500'}`}></div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-white uppercase tracking-tighter">
                                                        {isOut ? (isToMain ? 'Extracción Crítica' : 'Salida de Saldo') : 'Detección de Entrada'}
                                                    </span>
                                                    <span className="text-[8px] text-slate-600 font-mono group-hover:text-slate-400 transition-colors uppercase truncate max-w-[120px]">{tx.hash}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className={`text-sm font-black italic tracking-tighter ${isOut ? 'text-red-400' : 'text-emerald-400'}`}>
                                                    {isOut ? '-' : '+'}{(tx.amount / Math.pow(10, tx.tokenDecimal || 6)).toLocaleString()} {tx.token || 'TRX'}
                                                </span>
                                                <span className="text-[8px] text-slate-600 font-black uppercase">Red: {tx.type || 'TRX'}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="flex flex-col min-w-0">
                                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{isOut ? 'DESTINO' : 'ORÍGEN'}</p>
                                                    <p className={`text-[10px] font-mono truncate max-w-[180px] ${isOut ? (isToMain ? 'text-red-500 font-black' : 'text-main') : 'text-emerald-500'}`}>
                                                        {isOut ? tx.toAddress : tx.ownerAddress}
                                                    </p>
                                                </div>
                                                {isOut && isToMain && (
                                                    <div className="p-1 px-2 bg-red-500/10 border border-red-500/20 rounded-md">
                                                        <Skull className="text-red-500" size={12} />
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${tx.confirmed ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse'}`}>
                                                {tx.confirmed ? 'Confirmada' : 'Pendiente'}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Footer Note */}
            <div className="bg-[#0b0e11] border border-white/5 p-8 rounded-[2rem] flex items-center gap-6 opacity-60 hover:opacity-100 transition-opacity">
                <AlertTriangle className="text-amber-500 shrink-0" size={24} />
                <p className="text-[10px] text-slate-500 font-bold uppercase leading-relaxed tracking-wider">
                    Nota de Seguridad: Este panel monitoriza una actividad hostil conocida. No intente interactuar con ninguna de las direcciones listadas. Los fondos enviados a la cuenta vigilada son irrecuperables bajo el actual sistema de permisos TRON-Account.
                </p>
            </div>
        </div>
    );
};

export default ScamMonitor;
