import React, { useState, useEffect, useRef, useContext } from 'react';
import { FaLock, FaWifi, FaBell, FaVolumeUp, FaFilter, FaCheckCircle, FaExclamationTriangle, FaTrash, FaPlus, FaPlay, FaPause, FaShieldAlt } from 'react-icons/fa';
import { ThemeContext } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';

const AirtmCashierContent = () => {
    const { darkMode } = useContext(ThemeContext);
    const { currentUser } = useAuth();
    const [isConnected, setIsConnected] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [isMonitoring, setIsMonitoring] = useState(false);
    const [operations, setOperations] = useState([]);
    const [filters, setFilters] = useState({
        methods: ['Paypal', 'Binance', 'Venezuela', 'VES', 'Zelle'],
        minProfit: 0.5,
        maxAmount: 1000,
        minAmount: 1
    });
    const [notifications, setNotifications] = useState({
        sound: true,
        desktop: true
    });
    const [logs, setLogs] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isExtensionLinked, setIsExtensionLinked] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState(null);
    const [nodeStats, setNodeStats] = useState({ opsProcessed: 0, health: 100 });

    const audioRef = useRef(null);
    const monitoringInterval = useRef(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (monitoringInterval.current) {
                clearInterval(monitoringInterval.current);
            }
        };
    }, []);

    // Mock sound URL for notifications
    const soundUrl = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

    // Extension Sync Listener
    useEffect(() => {
        const handleExtensionMessage = (event) => {
            // Solo aceptar mensajes de nuestra fuente confiable
            if (event.data && event.data.source === 'AIRTM_EXTENSION') {
                const { type, token, operation } = event.data.payload;

                if (type === 'SYNC_AIRTM_TOKEN') {
                    console.log('Token recibido de la extensión');
                    setIsExtensionLinked(true);
                    setLastSyncTime(new Date().toLocaleTimeString());
                    setNodeStats(prev => ({ ...prev, health: 100 }));
                    if (token && token !== apiKey) {
                        setApiKey(token);
                        setIsConnected(true);
                        addLog('Token sincronizado automáticamente desde la extensión.', 'success');
                        saveSettings({ apiKey: token, isConnected: true });
                    }
                }

                if (type === 'SYNC_AIRTM_OPERATION') {
                    console.log('Operación recibida de la extensión:', operation.id);
                    setNodeStats(prev => ({ ...prev, opsProcessed: prev.opsProcessed + 1 }));
                    setLastSyncTime(new Date().toLocaleTimeString());
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

        const amount = parseFloat(op.netAmount || op.grossAmount || op.amount || op.totalAmount || 0);
        const profit = parseFloat(op.profitPercentage || op.profit_percentage || 2.2);

        // Validar filtros Inteligentes con Normalización
        const normalizedMethod = method.toLowerCase();

        const matchesMethod = filters.methods.length === 0 || filters.methods.some(filter => {
            const f = filter.toLowerCase();
            if (f.includes('venezuela') && (normalizedMethod.includes('venezuela') || normalizedMethod.includes('banco') || normalizedMethod.includes('ves') || normalizedMethod.includes('mercantil') || normalizedMethod.includes('provincial') || normalizedMethod.includes('banesco'))) return true;
            if (f.includes('binance') && normalizedMethod.includes('binance')) return true;
            return normalizedMethod.includes(f);
        });

        const matchesAmount = amount >= filters.minAmount && amount <= filters.maxAmount;
        const matchesProfit = profit >= filters.minProfit;

        if (matchesMethod && matchesAmount && matchesProfit) {
            const newOp = {
                id: op.id || op.uuid,
                method,
                amount,
                profit,
                time: new Date().toLocaleTimeString(),
                status: op.status || op.state
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
                    status: op.status || op.state
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
        }, ...prev].slice(0, 20));
    };

    const handleConnect = async () => {
        if (!apiKey.trim()) return;
        setIsConnected(true);
        addLog('Conexión con Airtm establecida correctamente.', 'success');
        await saveSettings({ apiKey, isConnected: true });
        // Trigger initial poll to verify
        pollAirtm();
    };

    const handleRequestNotificationPermission = () => {
        if (!('Notification' in window)) {
            alert('Este navegador no soporta notificaciones de escritorio');
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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-[#1e2329]/50 p-8 rounded-[40px] border border-white/5 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#fcd535]/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                <div className="relative z-10">
                    <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter flex items-center gap-4">
                        <div className="relative">
                            <span className="p-4 bg-[#fcd535] text-black rounded-2xl shadow-2xl shadow-[#fcd535]/30 flex items-center justify-center">
                                <FaWifi className={isMonitoring ? 'animate-pulse' : ''} />
                            </span>
                            {isExtensionLinked && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[#1e2329] animate-bounce"></div>
                            )}
                        </div>
                        Cajero Airtm Pro
                    </h1>
                    <div className="flex items-center gap-3 mt-3">
                        <span className="px-3 py-1 bg-white/5 rounded-full text-[8px] font-black text-slate-500 uppercase tracking-widest border border-white/5">v2.0 Elite</span>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                            Monitor de Red P2P de Alta Velocidad
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4 relative z-10">
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
                        <span className="text-[8px] font-bold opacity-60 uppercase">Protocolo v2.0</span>
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
                                    onClick={() => {
                                        if (Notification.permission !== 'granted') {
                                            handleRequestNotificationPermission();
                                        }
                                        setNotifications({ ...notifications, desktop: !notifications.desktop });
                                        saveSettings({ notifications: { ...notifications, desktop: !notifications.desktop } });
                                    }}
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

                        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                            {operations.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 opacity-20">
                                    <FaWifi size={48} className="mb-4 animate-pulse" />
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em]">Esperando Operaciones...</p>
                                </div>
                            ) : (
                                operations.map(op => (
                                    <div key={op.id} className="bg-[#12161c] p-6 rounded-3xl border border-white/5 flex items-center justify-between group hover:border-[#fcd535]/30 transition-all animate-in zoom-in-95 duration-300">
                                        <div className="flex items-center gap-6">
                                            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5">
                                                {op.method.toLowerCase().includes('paypal') ? (
                                                    <span className="text-blue-400 font-black italic">PP</span>
                                                ) : op.method.toLowerCase().includes('venezuela') || op.method.toLowerCase().includes('ves') ? (
                                                    <span className="text-emerald-400 font-black italic">VES</span>
                                                ) : (
                                                    <span className="text-[#fcd535] font-black italic">USDT</span>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-white uppercase tracking-tight">{op.method}</p>
                                                <p className="text-[9px] text-slate-500 font-bold uppercase">{op.time}</p>
                                            </div>
                                        </div>

                                        <div className="flex-1 px-10 text-center">
                                            <p className="text-xl font-black text-white italic tracking-tighter">${op.amount}</p>
                                            <p className="text-[9px] text-emerald-500 font-black uppercase tracking-widest">+{op.profit}% Ganancia</p>
                                        </div>

                                        <button
                                            onClick={() => handleAcceptOperation(op.id)}
                                            className="px-10 py-4 bg-[#fcd535] text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[#fcd535]/10"
                                        >
                                            Aceptar Operación
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>


                </div>
            </div>

        </div>
    );
};

export default AirtmCashierContent;
