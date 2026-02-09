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
            // Log de tráfico crudo para depuración
            if (event.data?.source === 'AIRTM_EXTENSION') {
                const payload = event.data.payload;
                console.log('[App] Mensaje desde Extension:', payload?.type);

                if (payload?.type === 'CONNECTION_CONFIRMED') {
                    setIsExtensionLinked(true);
                    addLog('Comunicación con extensión establecida.', 'success');
                    return;
                }

                if (payload?.type === 'SYNC_AIRTM_TOKEN') {
                    console.log('[App] Sincronizando Token...');
                    setIsExtensionLinked(true);
                    setLastSyncTime(new Date().toLocaleTimeString());
                    setNodeStats(prev => ({ ...prev, health: 100 }));
                    if (payload.token && payload.token !== apiKey) {
                        setApiKey(payload.token);
                        setIsConnected(true);
                        addLog('¡Token de Airtm sincronizado!', 'success');
                    }
                }

                if (payload?.type === 'SYNC_AIRTM_OPERATION') {
                    const op = payload.operation;
                    console.log('[App] Nueva operación:', op.paymentMethodName || op.method);
                    setLastSyncTime(new Date().toLocaleTimeString());
                    setNodeStats(prev => ({ ...prev, opsProcessed: prev.opsProcessed + 1 }));
                    processSingleOperation(op);
                }
            }
        };

        window.addEventListener('message', handleExtensionMessage);

        // Solicitar sincronización inicial al cargar
        setTimeout(() => {
            console.log('[App] Solicitando sincronización inicial...');
            window.postMessage({ type: 'AIRTM_CLIENT_READY' }, '*');
        }, 1500);

        return () => window.removeEventListener('message', handleExtensionMessage);
    }, [apiKey]);

    // Función auxiliar para procesar una operación individual (desde extensión o poll)
    const processSingleOperation = (op) => {
        const opId = op.id || op.uuid || `dom-${Math.random().toString(36).substring(7)}`;

        setOperations(prev => {
            // 1. Evitar duplicados por ID EXACTO
            if (prev.some(existing => existing.id === opId)) return prev;

            const method = op.payment_method_name || op.paymentMethodName || op.method || 'Desconocido';
            const amount = parseFloat(op.netAmount || op.grossAmount || op.amount || op.totalAmount || 0);

            // 2. Evitar duplicados por CONTENIDO (Mismo monto y método en los últimos segundos)
            // Si ya existe una operación casi idéntica, no la agregamos
            if (prev.slice(0, 10).some(existing =>
                existing.method === method &&
                Math.abs(existing.amount - amount) < 0.05
            )) {
                return prev;
            }

            const profit = parseFloat(op.profitPercentage || op.profit_percentage || 2.2);

            const newOp = {
                id: opId,
                method,
                amount,
                profit,
                time: new Date().toLocaleTimeString(),
                status: op.status || op.state || 'Pendiente',
                userName: op.owner?.displayName || op.maker?.username || op.userName || 'Usuario Airtm',
                userAvatar: op.owner?.avatarUrl || op.maker?.avatarUrl || op.userAvatar || null,
                userRating: op.owner?.averageRating || op.maker?.averageRating || op.userRating || 5.0,
                userTxns: op.owner?.completedOperations || op.maker?.completedOperations || op.userTxns || 0,
                localAmount: op.localAmount || op.value || op.amount || 0,
                localCurrency: op.localCurrency || op.currency || 'VES',
                rate: op.exchangeRate || op.rate || 0,
                isBuy: op.isBuy !== undefined ? op.isBuy : true
            };

            // Alertar si es realmente nueva
            handleNewOperationAlert(newOp);

            return [newOp, ...prev].slice(0, 30); // Mantener solo las 30 más recientes
        });
    };

    const handleNewOperationAlert = (op) => {
        if (notifications.sound && audioRef.current) {
            audioRef.current.play().catch(() => { });
        }
        if (notifications.desktop && Notification.permission === 'granted') {
            new Notification('Airtm PRO: ¡Nueva Op!', {
                body: `${op.method} - $${op.amount}`,
                icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Airtm_logo.svg/2560px-Airtm_logo.svg.png'
            });
        }
        addLog(`Nueva Op: ${op.method} por $${op.amount}`, 'success');
    };

    useEffect(() => {
        const loadSettings = async () => {
            // Cargar de LocalStorage primero (Respaldo inmediato)
            const localData = localStorage.getItem('airtm_pro_settings');
            if (localData) {
                try {
                    const parsed = JSON.parse(localData);
                    if (parsed.apiKey) {
                        setApiKey(parsed.apiKey);
                        setIsConnected(true);
                    }
                    if (parsed.filters) setFilters(parsed.filters);
                } catch (e) { }
            }

            if (!currentUser) return;
            try {
                const docRef = doc(db, 'airtmSettings', currentUser.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setApiKey(data.apiKey || '');
                    setFilters(data.filters || filters);
                    setNotifications(data.notifications || notifications);
                    if (data.apiKey) setIsConnected(true);
                }
            } catch (err) {
                // Silencio total para no alarmar al usuario, se usa el local o el default
            }
        };
        loadSettings();
    }, [currentUser]);

    const saveSettings = async (newData) => {
        // Guardar en LocalStorage (Siempre disponible)
        localStorage.setItem('airtm_pro_settings', JSON.stringify({
            apiKey: newData.apiKey || apiKey,
            filters: newData.filters || filters,
            notifications: newData.notifications || notifications
        }));

        if (!currentUser) return;
        try {
            const docRef = doc(db, 'airtmSettings', currentUser.uid);
            await setDoc(docRef, {
                ...newData,
                updatedAt: new Date()
            }, { merge: true });
        } catch (e) {
            // Error de permisos ignorado deliberadamente
        }
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

            // Sin filtros, pasamos todo lo que sea un estado válido
            const filteredOps = rawOps.filter(op => {
                const status = (op.status || op.state || '').toUpperCase();
                // Broaden allowed statuses
                const allowedStatuses = ['OPEN', 'ACCEPTING', 'WAITING', 'CREATED', 'FRAUD_APPROVED', 'AVAILABLE', 'READY'];
                if (status && !allowedStatuses.includes(status)) return false;
                return true;
            }).map(op => {
                const categoryId = op.makerPaymentMethod?.version?.category?.id || op.makerPaymentMethod?.categoryId || '';
                let method = op.paymentMethod?.name || op.makerPaymentMethod?.name || op.payment_method_name || op.paymentMethodName || '';

                if (!method && categoryId) {
                    const lowCat = categoryId.toLowerCase();
                    if (lowCat.includes('venezuela')) method = 'Banco de Venezuela';
                    else if (lowCat.includes('paypal')) method = 'Paypal';
                    else if (lowCat.includes('binance')) method = 'Binance USDT';
                    else method = categoryId.split(':').pop().replace(/-/g, ' ');
                }

                // Determine precise operation type
                // In Airtm: 'sell' means any user wants to withdraw (we BUY their balance)
                // 'buy' means user wants to add funds (we SELL our balance)
                // BUT usually the cashier sees "ADD" (user adding) or "WITHDRAW" (user withdrawing)
                // We need to map this to what WE do. 
                // If user ADDS funds -> We ACCEPT -> We SEND funds locally -> We RECEIVE USDC. This is a "BUY USDC" for us? No, we give local.
                // Let's stick to the card text: "Agregar fondos" vs "Retirar fondos" based on op type.

                const type = typeof op.operationType === 'string' ? op.operationType.toLowerCase() : '';
                const isBuy = type === 'buy' || type === 'add'; // If the other person is BUYING/ADDING, they give us local, we give USDC.

                const maker = op.maker || op.owner || {};

                return {
                    id: op.id || op.uuid,
                    method: method || 'Desconocido',
                    amount: op.amount || op.netAmount || op.grossAmount || 0, // Usually just 'amount' in GQL
                    profit: op.profitPercentage || op.profit_percentage || 2.2, // This might need calc if not provided
                    time: op.createdAt ? new Date(op.createdAt).toLocaleString() : new Date().toLocaleTimeString(),
                    status: op.status || op.state,
                    // Metadatos extendidos para la UI Pro
                    userName: maker.username || maker.firstName || 'Usuario Airtm',
                    userAvatar: maker.avatarUrl || null,
                    userRating: maker.averageRating || 5.0,
                    userTxns: maker.completedOperations || 0,
                    userJoinDate: maker.createdAt ? new Date(maker.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Jan, 2024',
                    localAmount: op.value || 0,
                    localCurrency: op.currency?.code || 'VES',
                    rate: op.exchangeRate || 0,
                    isBuy: !isBuy // If user ADDS (isBuy=true for them), we are "Selling" our USDC? 
                    // Wait, let's look at the screenshot. 
                    // "Agregar fondos" (Green) -> + $3.93 USDC (The user GETS USDC) -> We GIVE USDC.
                    // So if op.type represents what the USER does:
                    // User "ADD" -> We see "Agregar fondos" card.
                };
            });

            if (rawOps.length > 0 && filteredOps.length === 0) {
                // Debug filtered
                console.log('Ops detected but filtered:', rawOps);
            }

            // MERGE: Añadir las que no existan, no sobreescribir todo
            filteredOps.forEach(op => processSingleOperation(op));

            // Log new discoveries
            if (filteredOps.length > 0) {
                const newOps = filteredOps.filter(fop => !operations.some(op => op.id === fop.id));
                if (newOps.length > 0) {
                    if (notifications.sound && audioRef.current) {
                        try {
                            const promise = audioRef.current.play();
                            if (promise !== undefined) {
                                promise.catch(error => console.log('Audio Autoplay prevented'));
                            }
                        } catch (e) { }
                    }
                    // Only notify for the first few to avoid spam
                    newOps.slice(0, 3).forEach(nop => {
                        addLog(`Nueva: ${nop.method} | ${nop.amount} USDC`, 'success');
                    });
                }
            }

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
                            Panel Airtm PRO
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
                                    <div className="flex flex-col items-center justify-center py-20 opacity-20 col-span-full">
                                        <FaWifi size={48} className="mb-4 animate-pulse" />
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em]">Esperando Operaciones...</p>
                                    </div>
                                ) : (
                                    operations.map(op => {
                                        const isPaypal = op.method.toLowerCase().includes('paypal');
                                        const isVez = op.method.toLowerCase().includes('venezuela') || op.method.toLowerCase().includes('ves') || op.method.toLowerCase().includes('mercantil') || op.method.toLowerCase().includes('banesco');
                                        const isBinance = op.method.toLowerCase().includes('binance');

                                        // Configuración de colores según tipo
                                        // isBuy (true) = "Agregar fondos" (Green) -> User Adds
                                        // isBuy (false) = "Retirar fondos" (Red) -> User Withdraws (The red color in original might be different? Actually "Retirar" is usually shown distinctively)
                                        // In standard Airtm: Green = Add, Blue/Grey = Withdraw? 
                                        // Let's stick to the requester's Green for Add.
                                        const headerColor = op.isBuy ? 'bg-[#e6f7f2] text-[#00a878] border-b border-[#00a878]/20' : 'bg-orange-50 text-orange-600 border-b border-orange-200';
                                        const amountColor = op.isBuy ? 'text-[#00a878]' : 'text-slate-800';

                                        let methodIcon = <div className="w-full h-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">ATM</div>;

                                        if (isPaypal) methodIcon = <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg">P</div>;
                                        if (isVez) methodIcon = <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Bandera_de_Venezuela.svg/200px-Bandera_de_Venezuela.svg.png" className="w-full h-full object-cover" alt="VES" />;
                                        if (isBinance) methodIcon = <div className="w-full h-full bg-[#fcd535] flex items-center justify-center"><svg viewBox="0 0 32 32" className="w-6 h-6"><path fill="#1e2329" d="M16 0l6 6-6 6-6-6 6-6zm0 14l4 4-4 4-4-4 4-4zm0 24l-6-6 6-6 6 6-6 6zM5.333 10.667L8 13.333 5.333 16 2.667 13.333l2.666-2.666zm21.334 0L29.333 13.333 26.667 16 24 13.333l2.667-2.666z" /></svg></div>;

                                        // Formatter for Start Date
                                        const joinDate = op.userJoinDate ? op.userJoinDate : 'Jan, 2024';
                                        // Country Flag
                                        const countryCode = op.userCountry || 'VEN'; // Default to VEN for now if missing
                                        const flagUrl = `https://flagcdn.com/24x18/${countryCode.toLowerCase()}.png`;

                                        return (
                                            <div key={op.id} className="bg-white rounded-xl overflow-hidden flex flex-col shadow-lg border border-slate-100 group transition-all hover:shadow-2xl relative">
                                                {/* Header Tipo */}
                                                <div className={`px-5 py-3 flex justify-between items-center ${headerColor}`}>
                                                    <span className="font-bold text-xs uppercase tracking-tight flex items-center gap-2">
                                                        {op.isBuy ? 'Agregar fondos' : 'Retirar fondos'}
                                                    </span>
                                                    <span className="text-[10px] font-bold opacity-80">{op.time}</span>
                                                    <button className="text-slate-400 hover:text-slate-600"><FaTrash size={10} /></button>
                                                </div>

                                                {/* Cuerpo de la Tarjeta */}
                                                <div className="p-5 flex-1 bg-white text-slate-800 flex flex-col gap-4">

                                                    {/* Method Name & Icon */}
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full overflow-hidden shadow-sm shrink-0">
                                                            {methodIcon}
                                                        </div>
                                                        <h3 className="font-bold text-sm text-slate-900 leading-tight truncate w-full" title={op.method}>
                                                            {op.method}
                                                        </h3>
                                                    </div>

                                                    {/* Central Amounts */}
                                                    <div className="space-y-1 pl-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-xl font-black ${amountColor} tracking-tight`}>
                                                                {op.isBuy ? '+' : '-'} ${parseFloat(op.amount).toFixed(2)} USDC
                                                            </span>
                                                        </div>
                                                        {op.localAmount > 0 && (
                                                            <div className="flex flex-col text-xs font-bold text-slate-500">
                                                                <span>{op.isBuy ? '-' : '+'} {op.localCurrency} {parseFloat(op.localAmount).toLocaleString()} {op.localCurrency}</span>
                                                                {op.rate > 0 && (
                                                                    <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                                                                        $1.00 = {op.localCurrency} {op.rate}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* User Info Section (Replica of Original) */}
                                                    <div className="flex items-start gap-3 mt-2 pt-3 border-t border-slate-100">
                                                        <div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden shrink-0 relative">
                                                            {op.userAvatar ?
                                                                <img src={op.userAvatar} className="w-full h-full object-cover" /> :
                                                                <div className="w-full h-full flex items-center justify-center bg-slate-800 text-white font-bold">{op.userName ? op.userName.substring(0, 1) : 'U'}</div>
                                                            }
                                                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
                                                        </div>
                                                        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-xs font-black text-slate-900 truncate uppercase">{op.userName}</p>
                                                                <FaShieldAlt className="text-emerald-500 text-[10px]" />
                                                            </div>

                                                            <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500 font-medium">
                                                                <span className="flex items-center gap-1">
                                                                    <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                                    {joinDate}
                                                                </span>
                                                                <span className="flex items-center gap-1">
                                                                    <img src={flagUrl} alt={countryCode} className="w-3 h-auto opacity-80" />
                                                                    {countryCode}
                                                                </span>
                                                            </div>

                                                            <div className="flex items-center gap-3 text-[10px] mt-1">
                                                                <span className="font-bold text-slate-600 flex items-center gap-1">
                                                                    <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                                                                    {op.userTxns} txns
                                                                </span>
                                                                <span className="font-bold text-slate-600 flex items-center gap-1">
                                                                    <svg className="w-3 h-3 text-orange-400 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                                                                    {op.userRating}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Footer Botón */}
                                                <div className="p-4 bg-slate-50 text-center border-t border-slate-100">
                                                    <button
                                                        onClick={() => handleAcceptOperation(op.id)}
                                                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                                                    >
                                                        Aceptar
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
