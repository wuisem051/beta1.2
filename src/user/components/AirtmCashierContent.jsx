import React, { useState, useEffect, useRef, useContext } from 'react';
import { FaLock, FaWifi, FaBell, FaVolumeUp, FaFilter, FaCheckCircle, FaExclamationTriangle, FaTrash, FaPlus, FaPlay, FaPause, FaShieldAlt, FaSearch } from 'react-icons/fa';
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
    const [trafficLogs, setTrafficLogs] = useState([]);
    const [selectedRawData, setSelectedRawData] = useState(null);
    const [extensionConfig, setExtensionConfig] = useState({
        url: '',
        version: '1.0.0'
    });
    const [showGuide, setShowGuide] = useState(true);

    const monitoringInterval = useRef(null);
    const audioRef = useRef(null);
    const isMonitoringRef = useRef(isMonitoring);
    const soundUrl = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

    useEffect(() => {
        isMonitoringRef.current = isMonitoring;
    }, [isMonitoring]);

    const reSyncExtension = () => {
        console.log('[App] Forzando sincronización con extensión...');
        window.postMessage({ type: 'AIRTM_CLIENT_READY', source: 'AIRTM_PANEL' }, '*');
        addLog('Solicitando vinculación con extensión...', 'info');
    };

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
                    if (!isMonitoringRef.current) return;
                    const op = payload.operation;
                    console.log('[App] Nueva operación:', op.paymentMethodName || op.method);
                    setLastSyncTime(new Date().toLocaleTimeString());
                    setNodeStats(prev => ({ ...prev, health: 100, opsProcessed: prev.opsProcessed + 1 }));
                    processSingleOperation(op);
                    // Agregar a logs de tráfico crudo
                    setTrafficLogs(prev => [{
                        id: Date.now(),
                        type: 'EXTENSION_DATA',
                        method: op.paymentMethodName || op.method || 'Desconocido',
                        amount: op.amount || 0,
                        raw: op,
                        time: new Date().toLocaleTimeString()
                    }, ...prev].slice(0, 50));
                }
            }
        };

        window.addEventListener('message', handleExtensionMessage);

        // Solicitar sincronización inicial al cargar
        const timer = setTimeout(() => {
            reSyncExtension();
        }, 1500);

        return () => {
            window.removeEventListener('message', handleExtensionMessage);
            clearTimeout(timer);
        };
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
        const loadExtensionConfig = async () => {
            try {
                const docRef = doc(db, 'settings', 'siteConfig');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setExtensionConfig({
                        url: data.airtmExtensionUrl || '',
                        version: data.airtmExtensionVersion || '1.0.0'
                    });
                }
            } catch (err) {
                console.error("Error loading extension config:", err);
            }
        };

        loadSettings();
        loadExtensionConfig();
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
        if (!apiKey && !isConnected) {
            addLog('Error: No se detectó cuenta de Airtm vinculada.', 'error');
            reSyncExtension(); // Intentar vincular al fallar
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
            filteredOps.forEach(op => {
                processSingleOperation(op);
                // Agregar a logs de tráfico crudo desde Poll
                setTrafficLogs(prev => {
                    if (prev.some(log => log.raw?.id === op.id)) return prev;
                    return [{
                        id: Date.now() + Math.random(),
                        type: 'POLL_DATA',
                        method: op.method,
                        amount: op.amount,
                        raw: op,
                        time: new Date().toLocaleTimeString()
                    }, ...prev].slice(0, 50);
                });
            });

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
        <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 bg-[#0b0e11] text-slate-200 min-h-screen font-sans selection:bg-blue-500/30">
            <audio ref={audioRef} src={soundUrl} />

            {/* Top Control Bar - Compact & Floating */}
            <div className="sticky top-4 z-50 bg-[#1e2329]/80 backdrop-blur-xl border border-white/10 rounded-[24px] p-3 md:p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4 pl-2">
                    <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <FaShieldAlt className="text-white text-xl" />
                    </div>
                    <div>
                        <h1 className="text-lg font-black text-white uppercase tracking-tight leading-none">
                            Panel Airtm <span className="text-blue-400">PRO</span>
                        </h1>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 flex items-center gap-2">
                            V3.2 <span className="w-1 h-1 rounded-full bg-slate-700"></span> ALTA FRECUENCIA
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Compact Sync Status */}
                    <div className={`px-4 py-2 rounded-xl border flex items-center gap-3 transition-all duration-500 ${isExtensionLinked ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'bg-slate-800/50 border-white/5 text-slate-500'}`}>
                        <div className="flex flex-col items-start leading-none">
                            <span className="text-[9px] font-black uppercase tracking-widest mb-1">Extensión</span>
                            <span className="text-[10px] font-bold">{isExtensionLinked ? 'VINCULADA' : (apiKey ? 'MODO API' : 'OFFLINE')}</span>
                        </div>
                        <div className={`w-2.5 h-2.5 rounded-full ${isExtensionLinked ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]' : (apiKey ? 'bg-[#fcd535]' : 'bg-slate-700')}`}></div>
                    </div>

                    <div className="h-10 w-px bg-white/10 mx-1 hidden sm:block"></div>

                    {/* Main Action Buttons */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => window.open(extensionConfig.url || '#', '_blank')}
                            className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 text-slate-400 hover:text-white rounded-xl transition-all"
                            title="Descargar Extensión"
                        >
                            <FaPlus />
                        </button>

                        <button
                            onClick={handleToggleMonitoring}
                            disabled={!apiKey && !isConnected}
                            className={`pl-4 pr-6 py-3 rounded-xl font-black uppercase tracking-widest text-[11px] transition-all flex items-center gap-3 shadow-xl disabled:opacity-30 ${isMonitoring
                                ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white shadow-red-500/10'
                                : 'bg-blue-600 text-white hover:bg-blue-500 hover:scale-[1.02] shadow-blue-600/20'
                                }`}
                        >
                            {isMonitoring ? <><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div> Detener</> : <><FaPlay className="text-[10px]" /> Iniciar Escaneo</>}
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Layout */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 pt-2">

                {/* Left Sidebar - Status & Setup */}
                <div className="xl:col-span-3 space-y-6">

                    {/* Mini Quick Guide */}
                    {showGuide && (
                        <div className="bg-gradient-to-br from-blue-600/10 to-indigo-600/5 border border-blue-500/20 rounded-[24px] p-6 relative overflow-hidden group">
                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-xs font-black text-white uppercase tracking-widest">Guía Rápida</h3>
                                    <button onClick={() => setShowGuide(false)} className="text-slate-500 hover:text-white transition-colors"><FaTrash size={10} /></button>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex gap-3">
                                        <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0 text-[10px] font-bold text-blue-400">1</div>
                                        <p className="text-[10px] text-slate-400 leading-relaxed font-medium">Inicia sesión en Airtm y abre tu panel.</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0 text-[10px] font-bold text-blue-400">2</div>
                                        <p className="text-[10px] text-slate-400 leading-relaxed font-medium">Verifica el punto verde en la barra superior.</p>
                                    </div>
                                    <button
                                        onClick={reSyncExtension}
                                        className="w-full mt-2 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-[9px] font-black uppercase text-blue-400 tracking-widest border border-white/5 transition-all"
                                    >
                                        Re-vincular Nodo
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Node Health Metrics Card */}
                    <div className="bg-[#1e2329] border border-white/5 rounded-[24px] p-6 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

                        <div className="relative z-10 flex flex-col gap-6">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Estado Vital</span>
                                <span className="text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/10">ESTABLE</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-[#12161c] rounded-2xl border border-white/5">
                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Ordenes</span>
                                    <span className="text-xl font-black text-white">{nodeStats.opsProcessed}</span>
                                </div>
                                <div className="p-4 bg-[#12161c] rounded-2xl border border-white/5">
                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Salud</span>
                                    <span className="text-xl font-black text-emerald-500">{nodeStats.health}%</span>
                                </div>
                            </div>

                            {lastSyncTime && (
                                <div className="flex items-center gap-2 pt-2">
                                    <FaLock className="text-slate-600 text-[10px]" />
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Activo: {lastSyncTime}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Alerts & Sound Card */}
                    <div className="bg-[#1e2329] border border-white/5 rounded-[24px] p-6 shadow-xl space-y-5">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                                <FaBell className="text-[#fcd535]" /> Preferencias
                            </h3>
                        </div>

                        <div className="space-y-3">
                            <div
                                onClick={() => {
                                    setNotifications({ ...notifications, sound: !notifications.sound });
                                    saveSettings({ notifications: { ...notifications, sound: !notifications.sound } });
                                }}
                                className="flex items-center justify-between p-3 bg-[#12161c] rounded-xl border border-white/5 cursor-pointer hover:bg-white/5 transition-colors"
                            >
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Sonido</span>
                                <div className={`w-8 h-4 rounded-full relative transition-all ${notifications.sound ? 'bg-blue-600' : 'bg-slate-700'}`}>
                                    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${notifications.sound ? 'left-4.5' : 'left-0.5'}`}></div>
                                </div>
                            </div>
                            <div
                                onClick={enableNotifications}
                                className="flex items-center justify-between p-3 bg-[#12161c] rounded-xl border border-white/5 cursor-pointer hover:bg-white/5 transition-colors"
                            >
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Escritorio</span>
                                <div className={`w-8 h-4 rounded-full relative transition-all ${notifications.desktop ? 'bg-blue-600' : 'bg-slate-700'}`}>
                                    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${notifications.desktop ? 'left-4.5' : 'left-0.5'}`}></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* PayPal Tools Mini */}
                    <div className="bg-blue-600/90 text-white p-6 rounded-[24px] shadow-xl shadow-blue-600/10 group cursor-default">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center font-black text-xs">P</div>
                            <span className="text-[10px] font-black uppercase tracking-widest">Cálculo PayPal</span>
                        </div>
                        <p className="text-[9px] font-medium leading-relaxed text-blue-100 opacity-90">
                            Comisión estimada: 5.4% + $0.30. Verifica siempre el saldo neto recibido.
                        </p>
                    </div>
                </div>

                {/* Main Section - Operations Central */}
                <div className="xl:col-span-9 space-y-6">

                    {/* Operations List Container */}
                    <div className="bg-[#1e2329] border border-white/5 rounded-[32px] shadow-[0_30px_60px_rgba(0,0,0,0.3)] flex flex-col min-h-[600px] overflow-hidden">

                        {/* List Header */}
                        <div className="px-8 py-6 border-b border-white/5 bg-white/[0.01] flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                                <h2 className="text-sm font-black text-white uppercase tracking-widest">Operaciones Detectadas</h2>
                            </div>
                            <button
                                onClick={() => setOperations([])}
                                className="px-4 py-2 bg-white/5 hover:bg-red-500/10 hover:text-red-500 text-slate-500 rounded-xl transition-all text-[9px] font-black uppercase tracking-widest flex items-center gap-2"
                                title="Limpiar lista"
                            >
                                <FaTrash /> Borrar Todo
                            </button>
                        </div>

                        {/* Scrolling List */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar bg-[#0b0e11]/30">
                            <div className="flex flex-col gap-3">
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

                                        const displayName = op.userName === 'Cajero Airtm' ? 'Usuario Airtm' : op.userName;

                                        return (
                                            <div key={op.id} className="bg-white rounded-xl overflow-hidden flex flex-col md:flex-row shadow-lg border border-slate-100 group transition-all hover:shadow-2xl relative">
                                                {/* Indicator Side (Mobile: Top, Desktop: Left) */}
                                                <div className={`w-full md:w-3 shrink-0 ${op.isBuy ? 'bg-[#00a878]' : 'bg-orange-500'}`}></div>

                                                <div className="flex-1 flex flex-col md:flex-row items-stretch md:items-center p-3 md:p-5 gap-4 md:gap-8 bg-white">
                                                    {/* Column 1: Info & Type */}
                                                    <div className="flex flex-col gap-2 min-w-[140px]">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${op.isBuy ? 'bg-[#e6f7f2] text-[#00a878]' : 'bg-orange-50 text-orange-600'}`}>
                                                                {op.isBuy ? 'Agregar' : 'Retirar'}
                                                            </span>
                                                            <span className="text-[9px] font-bold text-slate-400">{op.time}</span>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full overflow-hidden shadow-sm shrink-0 border border-slate-100">
                                                                {methodIcon}
                                                            </div>
                                                            <h3 className="font-bold text-xs text-slate-900 truncate max-w-[120px]" title={op.method}>
                                                                {op.method}
                                                            </h3>
                                                        </div>
                                                    </div>

                                                    {/* Column 2: Amounts */}
                                                    <div className="flex-1 flex flex-col md:flex-row gap-4 md:gap-12 md:items-center">
                                                        <div className="flex flex-col">
                                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">USDC</span>
                                                            <span className={`text-xl font-black ${amountColor} tracking-tighter`}>
                                                                {op.isBuy ? '+' : '-'} ${parseFloat(op.amount).toFixed(2)}
                                                            </span>
                                                        </div>

                                                        <div className="flex flex-col">
                                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{op.isBuy ? 'Enviando' : 'Recibiendo'}</span>
                                                            <span className="text-sm font-black text-slate-800">
                                                                {op.localCurrency} {parseFloat(op.localAmount).toLocaleString()}
                                                            </span>
                                                        </div>

                                                        {op.rate > 0 && (
                                                            <div className="hidden xl:flex flex-col">
                                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Tasa</span>
                                                                <span className="text-[10px] text-slate-600 font-bold">{op.rate}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Column 3: User Info */}
                                                    <div className="flex items-center gap-3 min-w-[180px] md:border-l border-slate-100 md:pl-6">
                                                        <div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden shrink-0 relative">
                                                            {op.userAvatar ?
                                                                <img src={op.userAvatar} className="w-full h-full object-cover" /> :
                                                                <div className="w-full h-full flex items-center justify-center bg-slate-800 text-white font-bold">{displayName ? displayName.substring(0, 1) : 'U'}</div>
                                                            }
                                                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-1">
                                                                <p className="text-xs font-black text-slate-900 truncate uppercase">{displayName}</p>
                                                                <FaShieldAlt className="text-emerald-500 text-[9px]" />
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className="text-[9px] font-bold text-slate-500 flex items-center gap-1">
                                                                    <svg className="w-2.5 h-2.5 text-orange-400 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                                                                    {op.userRating}
                                                                </span>
                                                                <span className="text-[9px] font-bold text-slate-400">•</span>
                                                                <span className="text-[9px] font-bold text-slate-500">{op.userTxns} txns</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Column 4: Action */}
                                                    <div className="shrink-0 pl-4">
                                                        <button
                                                            onClick={() => handleAcceptOperation(op.id)}
                                                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.05] active:scale-[0.95]"
                                                        >
                                                            Aceptar
                                                        </button>
                                                    </div>
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

            {/* Bottom Traffic Monitor - Integrated & Collapsible */}
            <div className="bg-[#1e2329] border border-white/5 rounded-[32px] shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></span>
                        Monitor de Tráfico de Red
                    </h2>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setTrafficLogs([])} className="text-[9px] font-black text-slate-600 hover:text-red-500 uppercase transition-colors">Limpiar Logs</button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12">
                    <div className="lg:col-span-8 h-[300px] overflow-y-auto custom-scrollbar border-r border-white/5">
                        <table className="w-full text-left">
                            <thead className="sticky top-0 bg-[#1e2329] shadow-sm">
                                <tr className="text-[8px] font-black text-slate-600 uppercase tracking-widest border-b border-white/5">
                                    <th className="px-6 py-3 text-blue-500">Origen</th>
                                    <th className="px-6 py-3">Método</th>
                                    <th className="px-6 py-3">Monto</th>
                                    <th className="px-6 py-3 text-right">Hora</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.02]">
                                {trafficLogs.length === 0 ? (
                                    <tr><td colSpan="4" className="py-20 text-center opacity-20 text-[9px] font-black uppercase tracking-widest">Esperando flujo de datos...</td></tr>
                                ) : (
                                    trafficLogs.map((log) => (
                                        <tr key={log.id} onClick={() => setSelectedRawData(log.raw)} className="hover:bg-white/[0.02] cursor-pointer transition-colors group">
                                            <td className="px-6 py-3">
                                                <span className={`px-2 py-0.5 rounded-[4px] text-[7px] font-black uppercase ${log.type === 'EXTENSION_DATA' ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                                    {log.type === 'EXTENSION_DATA' ? 'Ext' : 'Poll'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-[10px] font-bold text-slate-400 group-hover:text-blue-400 transition-colors uppercase">{log.method}</td>
                                            <td className="px-6 py-3 text-[10px] font-black text-white">${log.amount}</td>
                                            <td className="px-6 py-3 text-[9px] font-mono text-slate-600 text-right">{log.time}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="lg:col-span-4 bg-black/20 p-6 flex flex-col h-[300px]">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4">Inspector JSON</span>
                        {selectedRawData ? (
                            <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/40 rounded-xl p-4 border border-white/5">
                                <pre className="text-[9px] text-emerald-500 font-mono leading-relaxed">{JSON.stringify(selectedRawData, null, 2)}</pre>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center opacity-10 border border-dashed border-white/10 rounded-xl">
                                <FaSearch size={24} className="mb-2" />
                                <span className="text-[8px] font-black uppercase">Sin selección</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AirtmCashierContent;
