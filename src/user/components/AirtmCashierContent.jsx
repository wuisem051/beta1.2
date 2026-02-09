import React, { useState, useEffect, useRef, useContext } from 'react';
import { FaLock, FaWifi, FaBell, FaVolumeUp, FaFilter, FaCheckCircle, FaExclamationTriangle, FaTrash, FaPlus, FaPlay, FaPause, FaShieldAlt } from 'react-icons/fa';
import { ThemeContext } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';

const AirtmCashierContent = () => {
    const { darkMode } = useContext(ThemeContext);
    const { currentUser } = useAuth();
    const [isMonitoring, setIsMonitoring] = useState(false);
    const [operations, setOperations] = useState([]);
    const [logs, setLogs] = useState([]);
    const [apiKey, setApiKey] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [filters, setFilters] = useState({
        minProfit: 2.0,
        maxAmount: 500,
        methods: []
    });
    const [isProcessing, setIsProcessing] = useState(false);
    const [notifications, setNotifications] = useState({
        sound: true,
        desktop: true
    });
    const [isExtensionLinked, setIsExtensionLinked] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState(null);
    const [nodeStats, setNodeStats] = useState({
        opsProcessed: 0,
        health: 98
    });

    const monitoringInterval = useRef(null);
    const audioRef = useRef(null);
    const soundUrl = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

    useEffect(() => {
        const handleExtensionMessage = (event) => {
            if (event.source !== window) return;

            if (event.data.type && (event.data.type === 'SYNC_AIRTM_TOKEN' || event.data.type === 'SYNC_AIRTM_OPERATION')) {
                const { type, token, operation } = event.data;

                if (type === 'SYNC_AIRTM_TOKEN') {
                    console.log('Token recibido de la extensión');
                    setIsExtensionLinked(true);
                    setLastSyncTime(new Date().toLocaleTimeString());
                    setNodeStats(prev => ({ ...prev, health: 100 }));
                    if (token && token !== apiKey) {
                        setApiKey(token);
                        setIsConnected(true);
                        addLog('¡Token de Airtm sincronizado automáticamente!', 'success');
                    }
                }

                if (type === 'SYNC_AIRTM_OPERATION') {
                    console.log('Operación recibida de la extensión:', operation.id);
                    setLastSyncTime(new Date().toLocaleTimeString());
                    setNodeStats(prev => ({ ...prev, opsProcessed: prev.opsProcessed + 1 }));
                    processSingleOperation(operation);
                }
            }
        };

        window.addEventListener('message', handleExtensionMessage);
        return () => window.removeEventListener('message', handleExtensionMessage);
    }, [apiKey, operations]);

    // Función auxiliar para procesar una operación individual (desde extensión o poll)
    const processSingleOperation = (op) => {
        // Evitar duplicados
        if (operations.some(existing => existing.id === (op.id || op.uuid))) return;

        const method = op.payment_method_name || op.paymentMethodName || 'Desconocido';
        const amount = parseFloat(op.netAmount || op.grossAmount || op.amount || op.totalAmount || 0);
        const profit = parseFloat(op.profitPercentage || op.profit_percentage || 2.2);

        // Validar filtros (DESACTIVADO TEMPORALMENTE PARA PRUEBAS)
        // const matchesMethod = filters.methods.length === 0 || filters.methods.some(m => method.toLowerCase().includes(m.toLowerCase()));
        // const matchesAmount = amount >= filters.minAmount && amount <= filters.maxAmount;
        // const matchesProfit = profit >= filters.minProfit;

        const matchesMethod = true;
        const matchesAmount = true;
        const matchesProfit = true;

        if (matchesMethod && matchesAmount && matchesProfit) {
            const newOp = {
                id: op.id || op.uuid || `dom-${Math.random().toString(36).substring(7)}`,
                method,
                amount,
                profit,
                time: new Date().toLocaleTimeString(),
                status: op.status || op.state,
                // Metadatos extendidos para la UI Pro
                userName: op.owner?.displayName || 'Usuario Airtm',
                userAvatar: op.owner?.avatarUrl || null,
                userRating: op.owner?.averageRating || 5.0,
                userTxns: op.owner?.completedOperations || 0,
                localAmount: op.value || op.amount || 0,
                localCurrency: op.currency || 'VES',
                rate: op.exchangeRate || 0,
                isBuy: true // Por defecto compra/agregar
            };

            setOperations(prev => {
                if (prev.some(p => p.id === newOp.id)) return prev;

                // Alertar
                if (notifications.sound && audioRef.current) {
                    audioRef.current.play().catch(() => { });
                }
                if (notifications.desktop && Notification.permission === 'granted') {
                    new Notification('Airtm Extensión: ¡Nueva Op!', {
                        body: `${method} - $${amount} (+${profit}%)`,
                        icon: 'https://static.airtm.com/favicon-32x32.png'
                    });
                }
                addLog(`¡NUEVA OPERACIÓN (vía Extensión)! ${method} por $${amount}`, 'success');

                return [newOp, ...prev];
            });
        }
    };

    useEffect(() => {
        // Load settings from Firebase
        const loadSettings = async () => {
            if (!currentUser) return;
            const docRef = doc(db, 'airtmSettings', currentUser.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                setApiKey(data.apiKey || '');
                setFilters(data.filters || filters);
                setNotifications(data.notifications || notifications);
                if (data.apiKey) setIsConnected(true);
            }
        };
        loadSettings();
    }, [currentUser]);

    const saveSettings = async (newData) => {
        if (!currentUser) return;
        const docRef = doc(db, 'airtmSettings', currentUser.uid);
        await setDoc(docRef, {
            ...newData,
            updatedAt: new Date()
        }, { merge: true });
    };

    const handleToggleMonitoring = () => {
        if (!isConnected) {
            addLog('Error: Debes conectar tu cuenta de Airtm primero (usando tu token).', 'error');
            return;
        }

        if (isProcessing) return; // Prevent double clicks
        setIsProcessing(true);
        setTimeout(() => setIsProcessing(false), 500);

        if (isMonitoring) {
            stopMonitoring();
        } else {
            startMonitoring();
        }
    };

    const startMonitoring = () => {
        if (monitoringInterval.current) clearInterval(monitoringInterval.current);
        setIsMonitoring(true);
        addLog('Iniciando monitoreo REAL de operaciones...', 'success');

        // Initial poll
        pollAirtm();

        // Set interval
        monitoringInterval.current = setInterval(() => {
            pollAirtm();
        }, 3000); // Poll every 3 seconds for speed
    };

    const stopMonitoring = () => {
        if (monitoringInterval.current) {
            clearInterval(monitoringInterval.current);
            monitoringInterval.current = null;
        }
        setIsMonitoring(false);
        addLog('Monitoreo detenido.', 'info');
    };

    const pollAirtm = async () => {
        try {
            // Updated to use the common GraphQL structure used by Airtm for real-time data
            const response = await fetch('/.netlify/functions/airtmProxy', {
                method: 'POST',
                body: JSON.stringify({
                    sessionToken: apiKey,
                    action: 'poll',
                    // Adding hints for the proxy to use GraphQL if the rest endpoint fails
                    useGraphQL: true
                })
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401) {
                    addLog('Error: Token de sesión expirado o inválido.', 'error');
                    stopMonitoring();
                    return;
                }
                throw new Error(data.error || 'Unknown error');
            }

            // Enhanced data extraction to handle the specific availableOperations structure
            let rawOps = [];
            if (data.data && data.data.availableOperations) {
                rawOps = data.data.availableOperations;
            } else if (data.data && data.data.p2pAvailableOperations) {
                rawOps = data.data.p2pAvailableOperations;
            } else if (data.data && data.data.p2pOperations) {
                rawOps = data.data.p2pOperations;
            } else {
                rawOps = Array.isArray(data) ? data : (data.results || []);
            }

            if (data._debug) {
                const { source, count, keys } = data._debug;
                if (count > 0 || logs.length < 5) {
                    console.log(`[Airtm] Data from ${source}. Count: ${count}. Keys: ${keys?.join(',')}`);
                }
            }

            const filteredOps = rawOps.filter(op => {
                // Determine method name from deep category ID or direct field
                const categoryId = op.makerPaymentMethod?.version?.category?.id || op.makerPaymentMethod?.categoryId || '';
                let method = op.payment_method_name || op.paymentMethodName || '';

                if (!method && categoryId) {
                    const lowCat = categoryId.toLowerCase();
                    if (lowCat.includes('venezuela')) method = 'Banco de Venezuela';
                    else if (lowCat.includes('paypal')) method = 'Paypal';
                    else if (lowCat.includes('binance')) method = 'Binance USDT';
                    else method = categoryId.split(':').pop().replace(/-/g, ' ');
                }

                method = method || 'Desconocido';

                // Determine amount (Airtm uses grossAmount for the cashier sending funds)
                const amount = parseFloat(op.netAmount || op.grossAmount || op.amount || op.totalAmount || 0);
                const profit = parseFloat(op.profitPercentage || op.profit_percentage || 2.2); // Default profit estimate
                const status = (op.status || op.state || '').toUpperCase();

                // Broaden allowed statuses
                const allowedStatuses = ['OPEN', 'ACCEPTING', 'WAITING', 'CREATED', 'FRAUD_APPROVED', 'AVAILABLE', 'READY'];
                if (status && !allowedStatuses.includes(status)) return false;

                const matchesMethod = filters.methods.length === 0 || filters.methods.some(filterMethod => {
                    const normalizedFilter = filterMethod.toLowerCase().trim();
                    const normalizedActual = method.toLowerCase().trim();
                    const normalizedCat = categoryId.toLowerCase();

                    if (normalizedFilter.includes('binance') && (normalizedActual.includes('binance') || normalizedCat.includes('binance'))) return true;
                    if (normalizedFilter.includes('paypal') && (normalizedActual.includes('paypal') || normalizedCat.includes('paypal'))) return true;
                    if (normalizedFilter.includes('venezuela') && (normalizedActual.includes('venezuela') || normalizedCat.includes('venezuela') || normalizedActual.includes('ves'))) return true;
                    if (normalizedFilter.includes('banco') && normalizedActual.includes('banco')) return true;

                    return normalizedActual.includes(normalizedFilter) || normalizedCat.includes(normalizedFilter);
                });

                const matchesAmount = amount >= filters.minAmount && amount <= filters.maxAmount;
                const matchesProfit = profit >= filters.minProfit;

                return matchesMethod && matchesAmount && matchesProfit;
            }).map(op => {
                const categoryId = op.makerPaymentMethod?.version?.category?.id || op.makerPaymentMethod?.categoryId || '';
                let method = op.payment_method_name || op.paymentMethodName || '';
                if (!method && categoryId) {
                    const lowCat = categoryId.toLowerCase();
                    if (lowCat.includes('venezuela')) method = 'Banco de Venezuela';
                    else if (lowCat.includes('paypal')) method = 'Paypal';
                    else if (lowCat.includes('binance')) method = 'Binance USDT';
                    else method = categoryId.split(':').pop().replace(/-/g, ' ');
                }
                return {
                    id: op.id || op.uuid,
                    method: method || 'Desconocido',
                    amount: op.netAmount || op.grossAmount || op.amount || op.totalAmount,
                    profit: op.profitPercentage || op.profit_percentage || 2.2,
                    time: new Date().toLocaleTimeString(),
                    status: op.status || op.state,
                    // Metadatos extendidos
                    userName: op.owner?.displayName || 'Usuario Airtm',
                    userAvatar: op.owner?.avatarUrl || null,
                    userRating: op.owner?.averageRating || 5.0,
                    userTxns: op.owner?.completedOperations || 0,
                    localAmount: op.value || op.amount || 0,
                    localCurrency: op.currency || 'VES',
                    rate: op.exchangeRate || 0,
                    isBuy: true
                };
            });

            if (rawOps.length > 0 && filteredOps.length === 0) {
                // Determine why they were filtered
                const hasPotential = rawOps.some(op => {
                    const status = (op.status || op.state || '').toUpperCase();
                    return ['CREATED', 'OPEN', 'ACCEPTING', 'READY', 'AVAILABLE'].includes(status);
                });

                if (hasPotential) {
                    const firstOp = rawOps[0];
                    const opMethod = firstOp.payment_method_name || firstOp.paymentMethodName || firstOp.makerPaymentMethod?.version?.category?.id || 'Desconocido';
                    const opAmount = firstOp.netAmount || firstOp.grossAmount || 0;

                    addLog(`Detectadas ${rawOps.length} ops (ej: ${opMethod} $${opAmount}) pero no cumplen tus filtros.`, 'info');
                    console.log('Operations detected but filtered out:', rawOps);
                }
            }

            if (filteredOps.length > 0) {
                const newOps = filteredOps.filter(fop => !operations.some(op => op.id === fop.id));
                if (newOps.length > 0) {
                    if (notifications.sound && audioRef.current) {
                        audioRef.current.play().catch(e => console.log('Audio error:', e));
                    }
                    newOps.forEach(nop => {
                        addLog(`¡NUEVA OPERACIÓN! ${nop.method} por $${nop.amount}`, 'success');
                        // Desktop notifications
                        if (notifications.desktop && Notification.permission === 'granted') {
                            new Notification('Airtm Pro: ¡Oportunidad!', {
                                body: `${nop.method} - $${nop.amount} (+${nop.profit}%)`,
                                icon: 'https://static.airtm.com/favicon-32x32.png'
                            });
                        }
                    });
                }
            } else if (rawOps.length > 0) {
                // If we have raw ops but none passed filters, log detail for debugging
                console.log('Ops detected but filtered:', rawOps.map(o => `${o.paymentMethodName || o.categoryId} ($${o.grossAmount})`));
            }

            setOperations(filteredOps);

        } catch (err) {
            // Silently retry some connection errors, log others
            if (!err.message.includes('Failed to fetch')) {
                addLog(`Estado: Buscando...`, 'info');
            }
            console.error('Polling error:', err);
        }
    };

    const handleAcceptOperation = async (opId) => {
        addLog(`Intentando aceptar operación ${opId}...`, 'info');
        try {
            const response = await fetch('/.netlify/functions/airtmProxy', {
                method: 'POST',
                body: JSON.stringify({
                    sessionToken: apiKey,
                    action: 'accept',
                    operationId: opId
                })
            });

            const data = await response.json();

            if (response.ok) {
                addLog('¡Operación aceptada con éxito!', 'success');
                // Remove from list
                setOperations(prev => prev.filter(op => op.id !== opId));
            } else {
                addLog(`Fallo al aceptar: ${data.details?.message || data.error}`, 'error');
            }
        } catch (err) {
            addLog(`Error al aceptar operación: ${err.message}`, 'error');
        }
    };

    const addLog = (message, type) => {
        setLogs(prev => [{
            message,
            type,
            time: new Date().toLocaleTimeString()
        }, ...prev].slice(0, 50));
    };

    const enableNotifications = () => {
        if (!('Notification' in window)) {
            addLog('Tu navegador no soporta notificaciones de escritorio.', 'error');
            return;
        }
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                showSuccess('Notificaciones habilitadas');
            }
        });
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <audio ref={audioRef} src={soundUrl} />

            {/* Header Section */}
            <div className="flex flex-col lg:flex-row gap-8 items-start lg:items-center justify-between">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter mb-2 flex items-center gap-3">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Airtm_logo.svg/2560px-Airtm_logo.svg.png" className="h-8 invert opacity-80" alt="Airtm" />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
                            Cashier Elite
                        </span>
                    </h1>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Sistema de Alta Frecuencia v3.0
                    </p>
                </div>

                <div className="flex gap-4 w-full lg:w-auto">
                    <button
                        onClick={handleToggleMonitoring}
                        disabled={!isConnected}
                        className={`px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all flex items-center gap-3 shadow-2xl disabled:opacity-30 disabled:grayscale ${isMonitoring
                            ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white'
                            : 'bg-[#fcd535] text-black hover:scale-105 active:scale-95 shadow-[#fcd535]/20'
                            }`}
                    >
                        {isMonitoring ? <><FaPause /> Detener Escaneo</> : <><FaPlay /> Iniciar Escaneo</>}
                    </button>

                    <div className={`px-6 py-5 rounded-2xl border flex flex-col items-center justify-center gap-1 min-w-[140px] transition-all duration-500 ${isExtensionLinked ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 shadow-xl shadow-emerald-500/5' : 'bg-slate-800/50 border-white/5 text-slate-500'}`}>
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${isExtensionLinked ? 'bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]' : (isConnected ? 'bg-[#fcd535]' : 'bg-slate-600')}`}></div>
                            <span className="text-[10px] font-black uppercase tracking-widest">
                                {isExtensionLinked ? 'Sincronizado' : 'Desconectado'}
                            </span>
                        </div>
                        <span className="text-[8px] font-bold opacity-60 uppercase">Protocolo v3.0</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Column 1: Config & Filters */}
                <div className="space-y-8">
                    {/* Elite Extension Status Card */}
                    <div className="bg-[#1e2329] p-8 rounded-[40px] border border-white/5 shadow-2xl overflow-hidden relative group">
                        {/* Animated Background Gradients */}
                        <div className={`absolute top-0 right-0 w-48 h-48 rounded-full blur-[80px] transition-all duration-1000 ${isExtensionLinked ? 'bg-emerald-500/10' : 'bg-red-500/5'}`}></div>
                        <div className={`absolute bottom-0 left-0 w-32 h-32 rounded-full blur-[60px] transition-all duration-1000 ${isExtensionLinked ? 'bg-blue-500/10' : 'bg-slate-500/5'}`}></div>

                        <div className="relative z-10">
                            <h2 className="text-sm font-black text-white uppercase tracking-widest mb-8 flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <FaShieldAlt className={isExtensionLinked ? 'text-emerald-500' : 'text-slate-500'} />
                                    Estado del Nodo
                                </span>
                                {isExtensionLinked && <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-500 text-[8px] rounded-full border border-emerald-500/20 animate-pulse">LIVE</span>}
                            </h2>

                            <div className="flex flex-col items-center mb-8">
                                <div className="relative">
                                    <div className={`w-24 h-24 rounded-[32px] flex items-center justify-center transition-all duration-700 border-2 ${isExtensionLinked
                                        ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.1)]'
                                        : 'bg-slate-800/20 border-white/5 text-slate-700'}`}>
                                        <FaWifi size={40} className={isExtensionLinked ? 'animate-pulse' : ''} />
                                    </div>
                                    {isExtensionLinked && (
                                        <div className="absolute -bottom-2 -right-2 bg-[#1e2329] p-1 rounded-full">
                                            <div className="bg-emerald-500 w-4 h-4 rounded-full shadow-[0_0_10px_#10b981]"></div>
                                        </div>
                                    )}
                                </div>
                                <div className="text-center mt-6 space-y-2">
                                    <p className={`text-lg font-black uppercase tracking-tighter ${isExtensionLinked ? 'text-white' : 'text-slate-500'}`}>
                                        {isExtensionLinked ? 'Núcleo Vinculado' : 'Nodo en Espera'}
                                    </p>
                                    <div className="flex items-center gap-2 justify-center">
                                        <div className={`w-1.5 h-1.5 rounded-full ${isExtensionLinked ? 'bg-emerald-500 animate-ping' : 'bg-slate-700'}`}></div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                            {isExtensionLinked ? 'Tráfico encriptado AES-256' : 'Abre Airtm para activar el puente'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Node Metrics Panel */}
                            <div className="grid grid-cols-2 gap-3 mb-8">
                                <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex flex-col items-center">
                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Ops. Procesadas</span>
                                    <span className="text-sm font-black text-white">{nodeStats.opsProcessed}</span>
                                </div>
                                <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex flex-col items-center">
                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Salud del Nodo</span>
                                    <span className="text-sm font-black text-emerald-500">{nodeStats.health}%</span>
                                </div>
                            </div>

                            {lastSyncTime && (
                                <div className="text-center mb-6">
                                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
                                        Última actividad: <span className="text-slate-400">{lastSyncTime}</span>
                                    </p>
                                </div>
                            )}

                            {!isExtensionLinked && (
                                <button
                                    onClick={() => window.open('https://app.airtm.com/login', '_blank')}
                                    className="w-full py-5 bg-[#fcd535] text-black rounded-[24px] text-[10px] font-black uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-[#fcd535]/20 flex items-center justify-center gap-3"
                                >
                                    <div className="w-6 h-6 bg-black/10 rounded-lg flex items-center justify-center">
                                        <img src="https://static.airtm.com/favicon-32x32.png" alt="A" className="w-4 h-4" />
                                    </div>
                                    Sincronizar Airtm Elite
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Filters Card */}
                    <div className="bg-[#1e2329] p-8 rounded-[40px] border border-white/5 shadow-2xl">
                        <h2 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                            <FaFilter className="text-[#fcd535]" /> Filtros Inteligentes
                        </h2>
                        <div className="space-y-6">
                            <div>
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-3 ml-2">Métodos de Pago</label>
                                <div className="flex flex-wrap gap-2">
                                    {['Paypal', 'Binance USDT', 'Banco de Venezuela', 'Zelle', 'Bank Transfer', 'AdvCash'].map(method => (
                                        <button
                                            key={method}
                                            onClick={() => {
                                                const newMethods = filters.methods.includes(method)
                                                    ? filters.methods.filter(m => m !== method)
                                                    : [...filters.methods, method];
                                                setFilters({ ...filters, methods: newMethods });
                                                saveSettings({ filters: { ...filters, methods: newMethods } });
                                            }}
                                            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${filters.methods.includes(method)
                                                ? 'bg-[#fcd535]/10 border-[#fcd535]/30 text-[#fcd535]'
                                                : 'bg-[#12161c] border-white/5 text-slate-500 hover:border-white/10'
                                                }`}
                                        >
                                            {method}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2 ml-2">Min. Ganancia (%)</label>
                                    <input
                                        type="number"
                                        value={filters.minProfit}
                                        onChange={(e) => setFilters({ ...filters, minProfit: e.target.value })}
                                        className="w-full bg-[#12161c] border border-white/5 rounded-xl px-4 py-3 text-white text-xs font-bold outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2 ml-2">Monto Máx (USD)</label>
                                    <input
                                        type="number"
                                        value={filters.maxAmount}
                                        onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
                                        className="w-full bg-[#12161c] border border-white/5 rounded-xl px-4 py-3 text-white text-xs font-bold outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Notifications Card */}
                    <div className="bg-[#1e2329] p-8 rounded-[40px] border border-white/5 shadow-2xl">
                        <h2 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                            <FaBell className="text-[#fcd535]" /> Alertas
                        </h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-[#12161c] rounded-2xl border border-white/5">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => audioRef.current?.play()}
                                        className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-[#fcd535] transition-all"
                                        title="Probar Sonido"
                                    >
                                        <FaVolumeUp />
                                    </button>
                                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Alerta Sonora</span>
                                </div>
                                <button
                                    onClick={() => {
                                        setNotifications({ ...notifications, sound: !notifications.sound });
                                        saveSettings({ notifications: { ...notifications, sound: !notifications.sound } });
                                    }}
                                    className={`w-12 h-6 rounded-full transition-all relative ${notifications.sound ? 'bg-[#fcd535]' : 'bg-slate-700'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${notifications.sound ? 'left-7' : 'left-1'}`}></div>
                                </button>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-[#12161c] rounded-2xl border border-white/5">
                                <div className="flex items-center gap-3">
                                    <FaBell className="text-slate-500" />
                                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Notif. Escritorio</span>
                                </div>
                                <button
                                    onClick={enableNotifications}
                                    className={`w-12 h-6 rounded-full transition-all relative ${notifications.desktop ? 'bg-[#fcd535]' : 'bg-slate-700'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${notifications.desktop ? 'left-7' : 'left-1'}`}></div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Column 2 & 3: Operations & Logs */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Operations List */}
                    <div className="bg-[#1e2329] rounded-[40px] border border-white/5 shadow-2xl overflow-hidden flex flex-col min-h-[500px]">
                        <div className="p-8 border-b border-white/5 bg-white/[0.01] flex justify-between items-center">
                            <div>
                                <h2 className="text-sm font-black text-white uppercase tracking-widest">Operaciones Detectadas</h2>
                                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Sincronizado con el Nodo Central Airtm</p>
                            </div>
                            <button
                                onClick={() => setOperations([])}
                                className="p-2 text-slate-500 hover:text-red-500 transition-colors"
                                title="Limpiar lista"
                            >
                                <FaTrash />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar bg-[#0b0e11]">
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {operations.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 opacity-20">
                                        <FaWifi size={48} className="mb-4 animate-pulse" />
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em]">Esperando Operaciones...</p>
                                    </div>
                                ) : (
                                    operations.map(op => {
                                        const isPaypal = op.method.toLowerCase().includes('paypal');
                                        const isVez = op.method.toLowerCase().includes('venezuela') || op.method.toLowerCase().includes('ves') || op.method.toLowerCase().includes('mercantil') || op.method.toLowerCase().includes('banesco');
                                        const isBinance = op.method.toLowerCase().includes('binance');

                                        // Configuración de colores según tipo
                                        const headerColor = op.isBuy ? 'bg-emerald-500/10 text-emerald-500 border-b border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-b border-red-500/20';
                                        const amountColor = op.isBuy ? 'text-emerald-400' : 'text-red-400';

                                        let methodIcon = <div className="w-full h-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">ATM</div>;

                                        if (isPaypal) methodIcon = <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg">P</div>;
                                        if (isVez) methodIcon = <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Bandera_de_Venezuela.svg/200px-Bandera_de_Venezuela.svg.png" className="w-full h-full object-cover" alt="VES" />;
                                        if (isBinance) methodIcon = <div className="w-full h-full bg-[#fcd535] flex items-center justify-center"><svg viewBox="0 0 32 32" className="w-6 h-6"><path fill="#1e2329" d="M16 0l6 6-6 6-6-6 6-6zm0 14l4 4-4 4-4-4 4-4zm0 24l-6-6 6-6 6 6-6 6zM5.333 10.667L8 13.333 5.333 16 2.667 13.333l2.666-2.666zm21.334 0L29.333 13.333 26.667 16 24 13.333l2.667-2.666z" /></svg></div>;

                                        return (
                                            <div key={op.id} className="bg-white rounded-t-lg rounded-b-xl overflow-hidden flex flex-col shadow-2xl group transition-transform hover:-translate-y-1 duration-300 relative">
                                                {/* Header Tipo */}
                                                <div className={`px-4 py-2 flex justify-between items-center ${headerColor}`}>
                                                    <span className="font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                                                        {op.isBuy ? <FaPlus size={8} /> : <FaTrash size={8} />}
                                                        {op.isBuy ? 'Agregar fondos' : 'Retirar fondos'}
                                                    </span>
                                                    <span className="text-[9px] font-bold opacity-70">{op.time}</span>
                                                </div>

                                                {/* Cuerpo de la Tarjeta */}
                                                <div className="p-5 flex-1 bg-white text-slate-800">
                                                    {/* Sección Superior: Icono y Nombre */}
                                                    <div className="flex items-start gap-3 mb-4">
                                                        <div className="w-10 h-10 rounded-full overflow-hidden shadow-md shrink-0 ring-2 ring-slate-100">
                                                            {op.userAvatar ? <img src={op.userAvatar} className="w-full h-full object-cover" /> : methodIcon}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h3 className="font-bold text-xs text-slate-900 leading-tight uppercase truncate" title={op.method}>
                                                                {op.method}
                                                            </h3>
                                                            <div className="flex items-center gap-1 mt-1">
                                                                <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">P2P</span>
                                                                {op.id.includes('dom') && <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">VISUAL</span>}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Sección Central: Montos */}
                                                    <div className="mb-4 space-y-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className={`text-lg font-black ${amountColor} tracking-tight`}>
                                                                {op.isBuy ? '+' : '-'} ${op.amount} USDC
                                                            </span>
                                                        </div>
                                                        {op.localAmount > 0 && (
                                                            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                                                                <span>{op.isBuy ? '-' : '+'} {op.localCurrency} {op.localAmount.toLocaleString()}</span>
                                                            </div>
                                                        )}
                                                        {op.rate > 0 && (
                                                            <p className="text-[9px] text-slate-400 font-medium mt-1">
                                                                1 USDC = {op.rate} {op.localCurrency}
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* Sección Usuario */}
                                                    <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                                                        <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                                                            {op.userAvatar ? <img src={op.userAvatar} className="w-full h-full object-cover" /> : <span className="font-bold text-slate-400 text-xs">{op.userName ? op.userName.substring(0, 1) : 'U'}</span>}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[10px] font-bold text-slate-900 truncate">{op.userName}</p>
                                                            <div className="flex items-center gap-2 text-[9px] text-slate-500">
                                                                <span className="flex items-center gap-0.5 text-orange-400 font-bold"><FaCheckCircle size={8} /> {op.userRating}</span>
                                                                <span>•</span>
                                                                <span>{op.userTxns} ops</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Footer Botón */}
                                                <div className="p-3 bg-slate-50 text-center border-t border-slate-100">
                                                    <button
                                                        onClick={() => handleAcceptOperation(op.id)}
                                                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                                                    >
                                                        Aceptar <FaPlay size={8} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
};

export default AirtmCashierContent;
