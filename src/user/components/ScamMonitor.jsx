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
    Zap,
    Unlock
} from 'lucide-react';

const SCAM_ADDRESS = "TDNbRwDyRbR5DQ5JiHFjQqdg4SsK2yuk4A";
const MAIN_WALLET = "TVqKP6pSXP5CqCuZwyGL6jrCVMEfyAXEPp";

const ScamMonitor = () => {
    const [targetAddress, setTargetAddress] = useState(SCAM_ADDRESS);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(new Date());
    const [copySuccess, setCopySuccess] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch('/.netlify/functions/getTronScanData', {
                method: 'POST',
                body: JSON.stringify({ address: targetAddress })
            });
            const result = await response.json();
            setData(result);
            setLastUpdate(new Date());
        } catch (error) {
            console.error("Error fetching scam data:", error);
        } finally {
            setLoading(false);
        }
    }, [targetAddress]);

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

            {/* Account Status / Vulnerability Analysis */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Permissions Status */}
                {(() => {
                    const isMultiSig = data?.account?.owner_permission?.threshold > 1 ||
                        data?.account?.active_permissions?.some(p => p.threshold > 1) ||
                        data?.account?.owner_permission?.keys?.[0]?.address !== targetAddress;

                    return (
                        <div className={`p-8 rounded-[3rem] border transition-all duration-500 ${isMultiSig ? 'bg-amber-500/5 border-amber-500/20' : 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.1)]'}`}>
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-2xl ${isMultiSig ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                                        {isMultiSig ? <Lock size={24} /> : <Unlock size={24} />}
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-white uppercase italic tracking-tighter">Estatus de Seguridad</h3>
                                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Análisis de Permisos de Red</p>
                                    </div>
                                </div>
                                <div className={`px-4 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${isMultiSig ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30 animate-pulse'}`}>
                                    {isMultiSig ? 'BLOQUEADO (MULTI-SIG)' : 'VULNERABLE / ACCESO LIBRE'}
                                </div>
                            </div>
                            <p className="text-[11px] text-slate-400 font-bold uppercase leading-relaxed mb-4">
                                {isMultiSig
                                    ? "La cuenta tiene permisos delegados. La llave privada original NO tiene control total sobre los fondos."
                                    : "¡ALERTA! La cuenta tiene permisos estándar. Si posees la clave principal, puedes mover los fondos sin confirmación adicional."
                                }
                            </p>
                            <div className="bg-black/20 rounded-2xl p-4 border border-white/5 space-y-2">
                                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                                    <span className="text-slate-600">Umbral (Threshold)</span>
                                    <span className="text-white">{data?.account?.owner_permission?.threshold || 1}</span>
                                </div>
                                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                                    <span className="text-slate-600">Peso de Llave (Weight)</span>
                                    <span className="text-white">{data?.account?.owner_permission?.keys?.[0]?.weight || 1}</span>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* Balance Alert */}
                {(() => {
                    const balance = data?.account?.balance / 1000000 || 0;
                    const hasBalance = balance > 0.1;
                    return (
                        <div className={`p-8 rounded-[3rem] border transition-all duration-500 ${hasBalance ? 'bg-blue-500/10 border-blue-500/30 shadow-[0_0_50px_rgba(59,130,246,0.1)]' : 'bg-white/5 border-white/10'}`}>
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-2xl ${hasBalance ? 'bg-blue-500/20 text-blue-500' : 'bg-white/10 text-slate-500'}`}>
                                        <Zap size={24} className={hasBalance ? 'animate-pulse' : ''} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-white uppercase italic tracking-tighter">Telemetría de Saldo</h3>
                                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Monitoreo de Liquidez</p>
                                    </div>
                                </div>
                                {hasBalance && (
                                    <div className="px-4 py-1 bg-blue-500 text-white rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 animate-bounce">
                                        LIQUIDEZ DETECTADA
                                    </div>
                                )}
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-baseline justify-between">
                                    <span className="text-3xl font-black text-white italic tracking-tighter">{balance.toLocaleString()} TRX</span>
                                    <span className="text-[10px] text-slate-600 font-bold uppercase underline decoration-blue-500/30">Total Disponible</span>
                                </div>
                                <p className="text-[10px] text-slate-500 font-bold uppercase leading-relaxed">
                                    {hasBalance
                                        ? "Se ha detectado flujo de capital. El sistema de barrido (sweeper) debería estar operando en milisegundos."
                                        : "Sin saldo relevante detectado. Esperando próxima inyección de capital."
                                    }
                                </p>
                            </div>
                        </div>
                    );
                })()}
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
                            <div className="flex justify-between items-center mb-1">
                                <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Address bajo Vigilancia</p>
                                {targetAddress !== SCAM_ADDRESS && (
                                    <button onClick={() => setTargetAddress(SCAM_ADDRESS)} className="text-[8px] font-black text-main uppercase hover:underline">Reset</button>
                                )}
                            </div>
                            <p className="text-xs font-mono text-main break-all text-center selection:bg-red-500/30">{targetAddress}</p>
                            <button
                                onClick={() => handleCopy(targetAddress)}
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
                        href={`https://tronscan.org/#/address/${targetAddress}`}
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
                                                    {isOut ? '-' : '+'}{(tx.amount / Math.pow(10, tx.tokenDecimal || 6)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 6 })} {tx.token || 'TRX'}
                                                </span>
                                                <span className="text-[8px] text-slate-600 font-black uppercase">Red: {tx.type || 'TRX'}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col gap-4 min-w-[320px]">
                                                {/* Origen */}
                                                <div className="flex items-center gap-3 group/addr">
                                                    <div className="flex flex-col min-w-0">
                                                        <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest leading-none mb-1">ORIGEN</p>
                                                        <p className={`text-[10px] font-mono break-all ${tx.ownerAddress === targetAddress ? 'text-white' : 'text-emerald-500'}`}>
                                                            {tx.ownerAddress}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-1 opacity-0 group-hover/addr:opacity-100 transition-all">
                                                        <button onClick={() => handleCopy(tx.ownerAddress)} className="p-1.5 hover:bg-white/10 rounded-md text-slate-500" title="Copiar">
                                                            <Copy size={10} />
                                                        </button>
                                                        {tx.ownerAddress !== targetAddress && (
                                                            <button onClick={() => setTargetAddress(tx.ownerAddress)} className="p-1.5 hover:bg-emerald-500/20 rounded-md text-emerald-500" title="Seguir este rastro">
                                                                <Activity size={10} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="w-4 h-[1px] bg-white/5 ml-2"></div>

                                                {/* Destino */}
                                                <div className="flex items-center gap-3 group/addr">
                                                    <div className="flex flex-col min-w-0">
                                                        <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest leading-none mb-1">DESTINO</p>
                                                        <p className={`text-[10px] font-mono break-all ${tx.toAddress === MAIN_WALLET ? 'text-red-500 font-black' : (tx.toAddress === targetAddress ? 'text-white' : 'text-main')}`}>
                                                            {tx.toAddress || 'Smart Contract Interaction'}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-1 opacity-0 group-hover/addr:opacity-100 transition-all">
                                                        {tx.toAddress && (
                                                            <>
                                                                <button onClick={() => handleCopy(tx.toAddress)} className="p-1.5 hover:bg-white/10 rounded-md text-slate-500" title="Copiar">
                                                                    <Copy size={10} />
                                                                </button>
                                                                {tx.toAddress !== targetAddress && (
                                                                    <button onClick={() => setTargetAddress(tx.toAddress)} className="p-1.5 hover:bg-main/20 rounded-md text-main" title="Seguir este rastro">
                                                                        <Activity size={10} />
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}
                                                        {tx.toAddress === MAIN_WALLET && (
                                                            <div className="p-1 px-2 bg-red-500/10 border border-red-500/20 rounded-md ml-1">
                                                                <Skull className="text-red-500" size={10} />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
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
