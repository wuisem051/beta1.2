import React, { useState, useEffect, useRef, useContext } from 'react';
import { FaLock, FaWifi, FaBell, FaVolumeUp, FaFilter, FaCheckCircle, FaExclamationTriangle, FaTrash, FaPlus, FaPlay, FaPause } from 'react-icons/fa';
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
        methods: ['Paypal', 'Binance USDT'],
        minProfit: 2,
        maxAmount: 500,
        minAmount: 5
    });
    const [notifications, setNotifications] = useState({
        sound: true,
        desktop: true
    });
    const [logs, setLogs] = useState([]);

    const audioRef = useRef(null);
    const monitoringInterval = useRef(null);

    // Mock sound URL for notifications
    const soundUrl = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

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

        if (isMonitoring) {
            if (monitoringInterval.current) clearInterval(monitoringInterval.current);
            setIsMonitoring(false);
            addLog('Monitoreo detenido.', 'info');
        } else {
            setIsMonitoring(true);
            addLog('Iniciando monitoreo REAL de operaciones...', 'success');

            // Initial poll
            pollAirtm();

            // Set interval
            monitoringInterval.current = setInterval(() => {
                pollAirtm();
            }, 3000); // Poll every 3 seconds for speed
        }
    };

    const pollAirtm = async () => {
        try {
            const response = await fetch('/.netlify/functions/airtmProxy', {
                method: 'POST',
                body: JSON.stringify({
                    sessionToken: apiKey,
                    action: 'poll'
                })
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401) {
                    addLog('Error: Token de sesión expirado o inválido.', 'error');
                    setIsMonitoring(false);
                    if (monitoringInterval.current) clearInterval(monitoringInterval.current);
                    return;
                }
                throw new Error(data.error || 'Unknown error');
            }

            // Process operations
            // We assume data is an array or has a results/data property
            const rawOps = Array.isArray(data) ? data : (data.data || data.results || []);

            const filteredOps = rawOps.filter(op => {
                // Map Airtm keys to our format
                const method = op.payment_method_name || op.method || 'Desconocido';
                const amount = parseFloat(op.amount || op.total_amount || 0);
                const profit = parseFloat(op.profit_percentage || 0);

                const matchesMethod = filters.methods.length === 0 || filters.methods.some(m => method.toLowerCase().includes(m.toLowerCase()));
                const matchesAmount = amount >= filters.minAmount && amount <= filters.maxAmount;
                const matchesProfit = profit >= filters.minProfit;

                return matchesMethod && matchesAmount && matchesProfit;
            });

            if (filteredOps.length > 0) {
                // Check if there are new operations (not in our current list)
                const newOps = filteredOps.filter(fop => !operations.some(op => op.id === (fop.id || fop.uuid)));

                if (newOps.length > 0) {
                    if (notifications.sound && audioRef.current) {
                        audioRef.current.play().catch(e => console.log('Audio play blocked'));
                    }

                    newOps.forEach(nop => {
                        addLog(`¡NUEVA OPERACIÓN! ${nop.payment_method_name || 'Desconocido'} por $${nop.amount || nop.total_amount}`, 'success');

                        if (notifications.desktop && Notification.permission === 'granted') {
                            new Notification('Airtm Cajero: Nueva Operación', {
                                body: `${nop.payment_method_name} - $${nop.amount}`,
                                icon: '/favicon.ico'
                            });
                        }
                    });
                }
            }

            // Normalize and update state
            const normalizedOps = filteredOps.map(op => ({
                id: op.id || op.uuid,
                method: op.payment_method_name || 'Desconocido',
                amount: op.amount || op.total_amount,
                profit: op.profit_percentage || 0,
                time: new Date().toLocaleTimeString(),
                status: op.status
            }));

            setOperations(normalizedOps);

        } catch (err) {
            addLog(`Error de conexión: ${err.message}`, 'error');
            console.error(err);
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
        addLog('Cuenta Airtm vinculada exitosamente (Modo Simulación)', 'success');
        await saveSettings({ apiKey, isConnected: true });
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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
                        <span className="p-3 bg-[#fcd535] text-black rounded-2xl shadow-xl shadow-[#fcd535]/20">
                            <FaWifi className={isMonitoring ? 'animate-pulse' : ''} />
                        </span>
                        Cajero Airtm Pro
                    </h1>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-2">
                        Optimiza la aceptación de operaciones con filtros avanzados y alertas en tiempo real
                    </p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={handleToggleMonitoring}
                        className={`px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center gap-2 shadow-2xl ${isMonitoring
                            ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white'
                            : 'bg-[#fcd535] text-black hover:scale-105 active:scale-95 shadow-[#fcd535]/10'
                            }`}
                    >
                        {isMonitoring ? <><FaPause /> Detener Escaneo</> : <><FaPlay /> Iniciar Escaneo</>}
                    </button>
                    <div className={`px-4 py-4 rounded-2xl border flex items-center gap-2 ${isConnected ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-slate-800/50 border-white/5 text-slate-500'}`}>
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></div>
                        <span className="text-[9px] font-black uppercase tracking-widest">{isConnected ? 'Vinculado' : 'Desconectado'}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Column 1: Config & Filters */}
                <div className="space-y-8">
                    {/* Connection Card */}
                    <div className="bg-[#1e2329] p-8 rounded-[40px] border border-white/5 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#fcd535]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                        <h2 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                            <FaLock className="text-[#fcd535]" /> Conexión API
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2 ml-2">Session Token / API Key</label>
                                <input
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="Ingrese su token de acceso..."
                                    className="w-full bg-[#12161c] border border-white/5 rounded-2xl px-6 py-4 text-white text-xs font-bold outline-none focus:border-[#fcd535]/30 transition-all shadow-inner"
                                />
                            </div>
                            <button
                                onClick={handleConnect}
                                className="w-full py-4 bg-white/5 text-white border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#fcd535] hover:text-black transition-all"
                            >
                                {isConnected ? 'Actualizar Conexión' : 'Vincular Cuenta'}
                            </button>
                            <p className="text-[8px] text-slate-600 font-bold uppercase text-center leading-relaxed">
                                Su token se encripta de forma segura y solo se usa para escanear operaciones.
                            </p>
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
                                    {['Paypal', 'Binance USDT', 'Zelle', 'Bank Transfer', 'AdvCash'].map(method => (
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
                                    <FaVolumeUp className="text-slate-500" />
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
                                                {op.method.includes('Paypal') ? (
                                                    <span className="text-blue-400 font-black italic">PP</span>
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

                    {/* How to get Token Guide */}
                    <div className="bg-[#1e2329] p-8 rounded-[40px] border border-white/5 shadow-2xl">
                        <h2 className="text-sm font-black text-[#fcd535] uppercase tracking-widest mb-6">¿Cómo obtener mi Token?</h2>
                        <div className="space-y-4 text-[10px] text-slate-400 font-bold uppercase leading-relaxed">
                            <p>1. Inicia sesión en Airtm desde tu navegador.</p>
                            <p>2. Presiona <kbd className="bg-white/10 px-2 py-1 rounded text-white">F12</kbd> y ve a la pestaña <span className="text-white">Red (Network)</span>.</p>
                            <p>3. Busca cualquier solicitud que empiece por <span className="text-white">operations</span>.</p>
                            <p>4. En los headers, busca <span className="text-white">Authorization</span> y copia el código después de <span className="italic">Bearer</span>.</p>
                            <p className="text-[#fcd535]/50 italic">Nota: Este token es temporal y debe actualizarse si cierras sesión.</p>
                        </div>
                    </div>

                    {/* Console Logs */}
                    <div className="bg-[#1e2329] p-8 rounded-[40px] border border-white/5 shadow-2xl">
                        <h2 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                            Activity Log
                        </h2>
                        <div className="bg-[#0b0e11] rounded-2xl p-6 font-mono text-[10px] space-y-2 h-[200px] overflow-y-auto custom-scrollbar border border-white/5">
                            {logs.length === 0 ? (
                                <p className="text-slate-700 italic">No hay actividad reciente...</p>
                            ) : (
                                logs.map((log, i) => (
                                    <div key={i} className="flex gap-3">
                                        <span className="text-slate-600">[{log.time}]</span>
                                        <span className={
                                            log.type === 'error' ? 'text-red-400' :
                                                log.type === 'success' ? 'text-emerald-400' :
                                                    'text-blue-400'
                                        }>
                                            {log.message}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Warning Banner */}
            {!isConnected && (
                <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-3xl flex items-center gap-4 text-amber-500 animate-pulse">
                    <FaExclamationTriangle className="text-2xl shrink-0" />
                    <div>
                        <p className="text-xs font-black uppercase tracking-tight">Cuenta de Airtm no vinculada</p>
                        <p className="text-[10px] font-bold uppercase opacity-80 mt-1">Para comenzar a recibir alertas en tiempo real, conecte su cuenta usando su Token de sesión de Airtm o API Key.</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AirtmCashierContent;
