import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import styles from '../pages/UserPanel.module.css';
import {
    FaBitcoin, FaKey, FaChartLine, FaExchangeAlt,
    FaBolt, FaCheckCircle, FaExclamationTriangle,
    FaRegClock, FaHistory, FaListUl, FaShieldAlt,
    FaArrowUp, FaArrowDown, FaSync, FaColumns, FaSquare, FaThLarge, FaTh, FaLayerGroup, FaSave
} from 'react-icons/fa';
import TradingViewWidget from './TradingViewWidget';
import ScalperTradingTool from './ScalperTradingTool';
import { useContext } from 'react';
import { ThemeContext } from '../../context/ThemeContext';

const ExchangeContent = ({ isSidebarHidden = false, dashboardMaxWidth = 1600 }) => {
    const { currentUser } = useAuth();
    const { darkMode } = useContext(ThemeContext);
    const [activeTab, setActiveTab] = useState('trading');
    const [configs, setConfigs] = useState({
        binance: { apiKey: '', secret: '', connected: false },
        binanceus: { apiKey: '', secret: '', connected: false },
        bingx: { apiKey: '', secret: '', connected: false }
    });
    const [activeTradingExchange, setActiveTradingExchange] = useState('binance');

    // UI Helpers
    const [isSaving, setIsSaving] = useState({ binance: false, binanceus: false, bingx: false });
    const [isSavingLayout, setIsSavingLayout] = useState(false);

    const [balance, setBalance] = useState(null);
    const [isLoadingBalance, setIsLoadingBalance] = useState(false);
    const [tradeSymbol, setTradeSymbol] = useState('BTC/USDT');
    const [tradeAmount, setTradeAmount] = useState('');
    const [tradePrice, setTradePrice] = useState('');
    const [estimatedTotal, setEstimatedTotal] = useState('0.00');
    const [tradeType, setTradeType] = useState('market');
    const [tradeSide, setTradeSide] = useState('buy');
    const [isTrading, setIsTrading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // Computed property for convenience
    const keysConfigured = configs[activeTradingExchange]?.connected;

    const [apiPermissions, setApiPermissions] = useState({
        read: true,
        trade: true,
        withdraw: false
    });
    const [recentOrders, setRecentOrders] = useState([]);
    const [orderHistory, setOrderHistory] = useState([]);

    // Chart Layout State
    const [layout, setLayout] = useState('1'); // '1', '2v', '4', '6'
    const [charts, setCharts] = useState([
        { id: 1, symbol: 'BTC/USDT', interval: '15' },
        { id: 2, symbol: 'ETH/USDT', interval: '15' },
        { id: 3, symbol: 'NAS100USD', interval: '15' },
        { id: 4, symbol: 'BTC.D', interval: '15' },
        { id: 5, symbol: 'BNB/USDT', interval: '15' },
        { id: 6, symbol: 'SOL/USDT', interval: '15' }
    ]);
    const [activeChartId, setActiveChartId] = useState(1);

    // Sync tradeSymbol with active chart
    useEffect(() => {
        const activeChart = charts.find(c => c.id === activeChartId);
        if (activeChart && activeChart.symbol !== tradeSymbol) {
            setTradeSymbol(activeChart.symbol);
        }
    }, [activeChartId, charts]);

    const updateChartSymbol = (chartId, newSymbol) => {
        setCharts(prev => prev.map(c => c.id === chartId ? { ...c, symbol: newSymbol } : c));
        if (chartId === activeChartId) {
            setTradeSymbol(newSymbol);
        }
    };

    const updateChartInterval = (chartId, newInterval) => {
        setCharts(prev => prev.map(c => c.id === chartId ? { ...c, interval: newInterval } : c));
    };

    const saveExchangeLayout = async () => {
        if (!currentUser?.uid) return;
        setIsSavingLayout(true);
        try {
            const userRef = doc(db, 'users', currentUser.uid);
            await setDoc(userRef, {
                exchangeLayout: {
                    layout,
                    charts,
                    updatedAt: new Date().toISOString()
                }
            }, { merge: true });
            alert('Configuración de gráficos guardada correctamente.');
        } catch (error) {
            console.error("Error saving layout:", error);
            setErrorMsg("Error al guardar la configuración: " + error.message);
        } finally {
            setIsSavingLayout(false);
        }
    };


    const tabs = [
        { id: 'trading', label: 'Terminal', icon: <FaBolt /> },
        { id: 'spot', label: 'Spot', icon: <FaExchangeAlt /> },
        { id: 'scalper', label: 'Escalonado', icon: <FaLayerGroup /> },
        { id: 'orders', label: 'Órdenes', icon: <FaListUl /> },
        { id: 'history', label: 'Historial', icon: <FaHistory /> },
        { id: 'config', label: 'Credenciales', icon: <FaKey /> }
    ];

    // Trading pairs state
    const [availablePairs, setAvailablePairs] = useState([
        'BTC/USDT',
        'ETH/USDT',
        'NAS100USD',
        'BTC.D',
        'LTC/USDT',
        'DOGE/USDT',
        'BNB/USDT',
        'SOL/USDT',
        'XRP/USDT',
        'ADA/USDT',
        'ARPA/USDT'
    ]);
    const [newPairInput, setNewPairInput] = useState('');
    const [isAddingPair, setIsAddingPair] = useState(false);

    const handleAddPair = () => {
        if (!newPairInput) return;
        const pair = newPairInput.toUpperCase().trim();
        // Basic validation: ensure it has a slash or at least 3 chars (we'll assume /USDT if missing, or enforce format)
        // Let's enforce /USDT for simplicity or just auto-append if missing context, but TradingView acts best with full pairs.
        // We'll trust the user or better yet, assume format like "COIN/USDT".
        let finalPair = pair;
        if (!finalPair.includes('/')) {
            finalPair = `${finalPair}/USDT`;
        }

        if (!availablePairs.includes(finalPair)) {
            setAvailablePairs([...availablePairs, finalPair]);
            setNewPairInput('');
            setIsAddingPair(false);
        }
    };

    const getCryptoIcon = (symbol) => {
        const coin = symbol.split('/')[0].toLowerCase();
        return `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${coin}.png`;
    };

    // Fetch saved config on mount
    useEffect(() => {
        const fetchConfig = async () => {
            if (currentUser?.uid) {
                try {
                    const binanceRef = doc(db, 'users', currentUser.uid, 'secrets', 'binance');
                    const bingxRef = doc(db, 'users', currentUser.uid, 'secrets', 'bingx');
                    const legacyRef = doc(db, 'users', currentUser.uid, 'secrets', 'exchange');

                    const [binSnap, bingSnap, legacySnap] = await Promise.all([
                        getDoc(binanceRef),
                        getDoc(bingxRef),
                        getDoc(legacyRef)
                    ]);

                    let newConfigs = {
                        binance: { apiKey: '', secret: '', connected: false },
                        bingx: { apiKey: '', secret: '', connected: false }
                    };

                    if (binSnap.exists()) {
                        const d = binSnap.data();
                        newConfigs.binance = { apiKey: d.apiKey, secret: '', connected: true };
                    }
                    if (bingSnap.exists()) {
                        const d = bingSnap.data();
                        newConfigs.bingx = { apiKey: d.apiKey, secret: '', connected: true };
                    }

                    // Legacy fallback
                    if (legacySnap.exists() && !binSnap.exists() && !bingSnap.exists()) {
                        const data = legacySnap.data();
                        const ex = data.exchange || 'binance';
                        if (ex === 'binance' || ex === 'bingx') {
                            newConfigs[ex] = { apiKey: data.apiKey, secret: '', connected: true };
                            setActiveTradingExchange(ex);
                        }
                    } else if (binSnap.exists() && !bingSnap.exists()) {
                        setActiveTradingExchange('binance');
                    } else if (bingSnap.exists() && !binSnap.exists()) {
                        setActiveTradingExchange('bingx');
                    }

                    setConfigs(newConfigs);

                    // Load Layout from user document
                    const userRef = doc(db, 'users', currentUser.uid);
                    const userSnap = await getDoc(userRef);
                    if (userSnap.exists()) {
                        const userData = userSnap.data();
                        const layoutData = userData.exchangeLayout;
                        if (layoutData) {
                            if (layoutData.layout) setLayout(layoutData.layout);
                            if (layoutData.charts) {
                                // Ensure all charts have intervals if they coming from old data
                                const loadedCharts = layoutData.charts.map(c => ({
                                    ...c,
                                    interval: c.interval || '15'
                                }));
                                setCharts(loadedCharts);
                            }
                        }
                    }
                } catch (err) {
                    console.error("Error loading configs:", err);
                }
            }
        };
        fetchConfig();
    }, [currentUser]);

    const fetchExchangeHistory = async () => {
        if (!keysConfigured) return;
        setIsLoadingBalance(true);
        try {
            const idToken = await currentUser.getIdToken();
            const response = await fetch('/.netlify/functions/getExchangeHistory', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    symbol: tradeSymbol,
                    exchange: activeTradingExchange,
                    limit: 20
                })
            });

            if (response.ok) {
                const data = await response.json();
                setOrderHistory(data);
            } else {
                const data = await response.json();
                console.error("History fetch error:", data.error);
            }
        } catch (error) {
            console.error("History fetch error:", error);
        } finally {
            setIsLoadingBalance(false);
        }
    };

    const fetchOpenOrders = async () => {
        if (!keysConfigured) return;
        setIsLoadingBalance(true);
        try {
            const idToken = await currentUser.getIdToken();
            // Usamos executeExchangeTrade con un flag especial o similar si existiera, 
            // pero vamos a asumir que implementaremos o usaremos getExchangeHistory para esto si se ajusta.
            // Por ahora, simulamos o usamos una función dedicada si existe.
            // Como no veo getOpenOrders.js, usaré getExchangeHistory con un ajuste si es posible o lo dejaré preparado.
            const response = await fetch('/.netlify/functions/getExchangeHistory', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    symbol: tradeSymbol,
                    exchange: activeTradingExchange,
                    type: 'open' // Un flag hipotético para el backend
                })
            });

            if (response.ok) {
                const data = await response.json();
                setRecentOrders(data.filter(o => o.status === 'open' || o.status === 'NEW'));
            } else {
                const data = await response.json();
                console.error("Open orders fetch error:", data.error);
            }
        } catch (error) {
            console.error("Open orders fetch error:", error);
        } finally {
            setIsLoadingBalance(false);
        }
    };

    const fetchBalance = async () => {
        if (!keysConfigured) {
            setErrorMsg("Primero debes configurar tu API Key y API Secret en la pestaña 'Credenciales'.");
            return;
        }
        setIsLoadingBalance(true);
        setErrorMsg('');
        try {
            const idToken = await currentUser.getIdToken();
            const response = await fetch('/.netlify/functions/getExchangeBalance', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    exchange: activeTradingExchange
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al obtener balance');
            }

            setBalance(data);
        } catch (error) {
            console.error("Balance fetch error:", error);
            // Mostrar el error real del exchange para facilitar el diagnóstico
            setErrorMsg(`Fallo de conexión: ${error.message}`);

            if (error.message.toLowerCase().includes('not configured') || error.message.toLowerCase().includes('keys')) {
                setConfigs(prev => ({
                    ...prev,
                    [activeTradingExchange]: { ...prev[activeTradingExchange], connected: false }
                }));
            }
        } finally {
            setIsLoadingBalance(false);
        }
    };

    // Auto-fetch data when tab changes
    useEffect(() => {
        setErrorMsg(''); // Clear any previous errors when switching tabs or exchange
        if (!keysConfigured) return;
        if (activeTab === 'history') fetchExchangeHistory();
        if (activeTab === 'orders') fetchOpenOrders();
        if (activeTab === 'trading') fetchBalance();
    }, [activeTab, tradeSymbol, activeTradingExchange, keysConfigured]);

    // Live calculation of estimated total
    useEffect(() => {
        if (tradeType === 'market') {
            setEstimatedTotal('Precio de Mercado');
        } else if (tradeAmount && tradePrice) {
            const total = parseFloat(tradeAmount) * parseFloat(tradePrice);
            setEstimatedTotal(total.toFixed(8));
        } else {
            setEstimatedTotal('0.00');
        }
    }, [tradeAmount, tradePrice, tradeType]);

    const fetchTicker = async (symbol) => {
        try {
            const idToken = await currentUser.getIdToken();
            const response = await fetch('/.netlify/functions/getExchangeTicker', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    symbol,
                    exchange: activeTradingExchange
                })
            });
            const data = await response.json();
            if (response.ok) {
                if (data.last) {
                    setTradePrice(data.last.toString());
                }
            } else {
                console.error("Error fetching ticker:", data.error);
                if (data.error && !data.error.includes('configuradas')) {
                    setErrorMsg(data.error);
                }
            }
        } catch (error) {
            console.error("Error fetching ticker:", error);
        }
    };

    // Auto-fetch price when symbol or exchange changes
    useEffect(() => {
        if (tradeSymbol && keysConfigured) {
            fetchTicker(tradeSymbol);
        }
    }, [tradeSymbol, activeTradingExchange, keysConfigured]);

    const handlePercentageClick = (percentage) => {
        if (!balance || !balance.total) return;

        const [asset, base] = tradeSymbol.split('/');
        const targetAsset = tradeSide === 'buy' ? base : asset;
        const available = (balance.total && balance.total[targetAsset]) ? parseFloat(balance.total[targetAsset]) : 0;

        if (tradeSide === 'buy') {
            // For buy, we use % of USDT (base)
            if (tradePrice) {
                const amount = (available * (percentage / 100)) / parseFloat(tradePrice);
                setTradeAmount(amount.toFixed(8));
            } else {
                alert("Calculando precio... por favor espera un momento o ingresa el precio manualmente.");
            }
        } else {
            // For sell, it's easy: % of the asset balance
            const amount = available * (percentage / 100);
            setTradeAmount(amount.toFixed(8));
        }
    };

    const handleSaveKeys = async (e, exchangeName) => {
        e.preventDefault();
        setErrorMsg('');
        setIsSaving(prev => ({ ...prev, [exchangeName]: true }));

        const currentConfig = configs[exchangeName];

        try {
            if (!currentUser?.uid) return;

            const idToken = await currentUser.getIdToken();
            const response = await fetch('/.netlify/functions/saveExchangeKeys', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    apiKey: currentConfig.apiKey,
                    secret: currentConfig.secret,
                    exchange: exchangeName
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error al guardar credenciales');
            }

            // Update state to show connected and clear secret
            setConfigs(prev => ({
                ...prev,
                [exchangeName]: { ...prev[exchangeName], secret: '', connected: true }
            }));

            // If this is the first connection, auto-switch to it
            if (!keysConfigured) {
                setActiveTradingExchange(exchangeName);
                setTimeout(() => setActiveTab('trading'), 1000);
            }

            alert(`Credenciales de ${exchangeName} guardadas correctamente.`);

        } catch (error) {
            console.error("Save error:", error);
            setErrorMsg("Error al guardar claves: " + error.message);
        } finally {
            setIsSaving(prev => ({ ...prev, [exchangeName]: false }));
        }
    };

    const handleDeleteConnection = async (exchangeName) => {
        if (!window.confirm(`¿Estás seguro de que deseas eliminar la vinculación con ${exchangeName.toUpperCase()}?`)) {
            return;
        }

        setErrorMsg('');
        try {
            if (!currentUser?.uid) return;

            const secretRef = doc(db, 'users', currentUser.uid, 'secrets', exchangeName);
            await deleteDoc(secretRef);

            // También eliminar el documento legado 'exchange' si corresponde a este exchange
            const legacyRef = doc(db, 'users', currentUser.uid, 'secrets', 'exchange');
            const legacySnap = await getDoc(legacyRef);
            if (legacySnap.exists()) {
                const legacyData = legacySnap.data();
                if (legacyData.exchange === exchangeName || (!legacyData.exchange && exchangeName === 'binance')) {
                    await deleteDoc(legacyRef);
                }
            }

            // Actualizar estado local
            setConfigs(prev => ({
                ...prev,
                [exchangeName]: { apiKey: '', secret: '', connected: false }
            }));

            alert(`Vinculación con ${exchangeName.toUpperCase()} eliminada correctamente.`);
        } catch (error) {
            console.error("Delete error:", error);
            setErrorMsg("Error al eliminar vinculación: " + error.message);
        }
    };

    const handleInputChange = (exchange, field, value) => {
        setConfigs(prev => ({
            ...prev,
            [exchange]: { ...prev[exchange], [field]: value }
        }));
    };

    const handleTrade = async (e) => {
        e.preventDefault();
        if (!tradeAmount || !tradeSymbol) return;
        if (tradeType === 'limit' && !tradePrice) {
            setErrorMsg('Debes especificar un precio para órdenes limit');
            return;
        }

        setIsTrading(true);
        setErrorMsg('');
        try {
            const idToken = await currentUser.getIdToken();
            const response = await fetch('/.netlify/functions/executeExchangeTrade', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    symbol: tradeSymbol,
                    side: tradeSide,
                    amount: parseFloat(tradeAmount),
                    type: tradeType,
                    price: tradeType === 'limit' ? parseFloat(tradePrice) : undefined,
                    exchange: activeTradingExchange
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error al ejecutar orden');
            }

            fetchBalance(); // Refresh balance
            setTradeAmount('');
            setTradePrice('');
            alert(`Orden ${tradeType} ejecutada correctamente!`);
        } catch (error) {
            console.error("Trade error:", error);
            setErrorMsg("Fallo en la operación: " + error.message);
        } finally {
            setIsTrading(false);
        }
    };

    return (
        <div className={`${styles.dashboardContent} animate-in fade-in duration-700 !p-1 !md:p-2 !max-w-none`} style={{
            maxWidth: isSidebarHidden ? '100vw' : `${dashboardMaxWidth}px`,
            width: isSidebarHidden ? '100vw' : 'auto',
            margin: isSidebarHidden ? '0' : '0 auto',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
            {/* New Modern Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-3">
                <div>
                    <div className="flex items-center gap-2 mb-0.5">
                        <h1 className={`${styles.mainContentTitle} !text-xl`}>Tablero de Trading</h1>
                        {keysConfigured ? (
                            <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                                <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></div>
                                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-tighter">Conectado</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-500/10 border border-white/5 rounded-full">
                                <div className="w-1 h-1 bg-slate-500 rounded-full"></div>
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Sin Conexión</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-slate-400 font-medium">Terminal activa:</span>
                        <select
                            value={activeTradingExchange}
                            onChange={(e) => setActiveTradingExchange(e.target.value)}
                            className="bg-slate-900 text-white text-xs font-black uppercase py-1.5 px-3 rounded-lg border border-white/10 outline-none focus:border-blue-500 pointer-events-auto cursor-pointer hover:bg-slate-800 transition-colors"
                        >
                            <option value="binance">BINANCE (Global)</option>
                            <option value="binanceus">BINANCE.US</option>
                            <option value="bingx">BINGX</option>
                        </select>
                        <span className="text-slate-600 font-bold ml-1 text-xs">v2.3</span>
                    </div>
                </div>

                {/* Modern Navigation Tabs (Bitunix Style) */}
                <div className="flex bg-[#161a1f]/80 backdrop-blur-xl p-[3px] rounded-xl border border-white/5 overflow-x-auto max-w-full">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-5 py-2 rounded-[9px] text-[11px] font-bold uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${activeTab === tab.id
                                ? 'bg-[#f0b90b]/10 text-[#f0b90b] border border-[#f0b90b]/30 shadow-lg shadow-[#f0b90b]/5'
                                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                                }`}
                        >
                            <span className={activeTab === tab.id ? 'opacity-100' : 'opacity-60'}>
                                {tab.icon}
                            </span>
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {activeTab === 'config' && (
                <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-black text-white mb-1 tracking-tight">Gestionar Vinculaciones</h2>
                        <p className="text-slate-400 text-xs font-medium max-w-md mx-auto leading-relaxed">
                            Configura y guarda las credenciales para cada exchange por separado.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {['binance', 'binanceus', 'bingx'].map(exName => {
                            const isConnected = configs[exName]?.connected;
                            const color = exName === 'binance' ? 'yellow' : 'blue';

                            return (
                                <div key={exName} className={`${styles.sectionCard} !bg-slate-900/40 backdrop-blur-xl !border-white/5 !p-6 relative overflow-hidden group transition-all hover:border-${color}-500/30`}>
                                    <div className={`absolute -top-24 -right-24 w-64 h-64 bg-${color}-600/5 rounded-full blur-3xl group-hover:bg-${color}-600/10 transition-all duration-700`}></div>

                                    <div className="relative z-10">
                                        <div className="flex items-center justify-between mb-8">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-14 h-14 bg-gradient-to-br from-${color}-500/20 to-slate-900 rounded-2xl flex items-center justify-center text-${color}-500 text-2xl border border-${color}-500/20 shadow-lg`}>
                                                    {exName === 'binance' ? 'B' : 'BX'}
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-black text-white uppercase tracking-tight">{exName}</h3>
                                                    <div className={`flex items-center gap-1.5 mt-1 ${isConnected ? 'text-emerald-500' : 'text-slate-500'}`}>
                                                        <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></div>
                                                        <span className="text-[9px] font-black uppercase tracking-widest">{isConnected ? 'Vinculado' : 'No Vinculado'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <form onSubmit={(e) => handleSaveKeys(e, exName)} className="space-y-5">
                                            <div>
                                                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 ml-1">API Key</label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={configs[exName]?.apiKey || ''}
                                                        onChange={e => handleInputChange(exName, 'apiKey', e.target.value)}
                                                        className="w-full bg-slate-950/60 border border-white/5 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none font-mono text-xs placeholder:text-slate-700 shadow-inner"
                                                        placeholder={`API Key de ${exName}...`}
                                                    />
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700"><FaShieldAlt /></div>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 ml-1">API Secret</label>
                                                <div className="relative">
                                                    <input
                                                        type="password"
                                                        value={configs[exName]?.secret || ''}
                                                        onChange={e => handleInputChange(exName, 'secret', e.target.value)}
                                                        className="w-full bg-slate-950/60 border border-white/5 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none font-mono text-xs placeholder:text-slate-700 shadow-inner"
                                                        placeholder="••••••••••••••••"
                                                    />
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700"><FaKey /></div>
                                                </div>
                                                <p className="text-[8px] text-slate-500 mt-2 ml-1 italic">
                                                    * Importante: Asegúrate de habilitar <b>"Habilitar lectura"</b> en la configuración de tu API en {exName}.
                                                </p>
                                            </div>

                                            <div className="pt-2">
                                                <button
                                                    type="submit"
                                                    disabled={isSaving[exName]}
                                                    className={`w-full bg-slate-800 hover:bg-blue-600 text-white font-black py-4 rounded-xl transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 uppercase tracking-widest text-[10px] border border-white/5 group-hover:border-blue-500/50`}
                                                >
                                                    {isSaving[exName] ? (
                                                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                                    ) : (
                                                        <>
                                                            <FaCheckCircle /> Guardar {exName}
                                                        </>
                                                    )}
                                                </button>

                                                {isConnected && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteConnection(exName)}
                                                        className="w-full mt-2 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white font-black py-3 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 uppercase tracking-widest text-[9px] border border-rose-500/20"
                                                    >
                                                        <FaHistory className="rotate-45" /> Eliminar Vinculación
                                                    </button>
                                                )}
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {activeTab === 'trading' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="lg:col-span-12 mb-4">
                        <div className="flex justify-between items-center mb-3">
                            <h2 className="text-xl font-black text-white italic tracking-tight flex items-center gap-2">
                                <FaChartLine className="text-blue-500" />
                                ANÁLISIS DE MERCADO
                            </h2>
                            <div className="flex bg-[#161a1f]/80 p-[3px] rounded-xl border border-white/5">
                                <button
                                    onClick={() => setLayout('1')}
                                    className={`p-2 rounded-lg transition-all ${layout === '1' ? 'bg-[#f0b90b]/10 text-[#f0b90b] border border-[#f0b90b]/30' : 'text-slate-500 hover:text-white border border-transparent'}`}
                                    title="Vista Simple"
                                >
                                    <FaSquare />
                                </button>
                                <button
                                    onClick={() => setLayout('2v')}
                                    className={`p-2 rounded-lg transition-all ${layout === '2v' ? 'bg-[#f0b90b]/10 text-[#f0b90b] border border-[#f0b90b]/30' : 'text-slate-500 hover:text-white border border-transparent'}`}
                                    title="Vista Dividida"
                                >
                                    <FaColumns />
                                </button>
                                <button
                                    onClick={() => setLayout('4')}
                                    className={`p-2 rounded-lg transition-all ${layout === '4' ? 'bg-[#f0b90b]/10 text-[#f0b90b] border border-[#f0b90b]/30' : 'text-slate-500 hover:text-white border border-transparent'}`}
                                    title="Grid 4"
                                >
                                    <FaThLarge />
                                </button>
                                <button
                                    onClick={() => setLayout('6')}
                                    className={`p-2 rounded-lg transition-all ${layout === '6' ? 'bg-[#f0b90b]/10 text-[#f0b90b] border border-[#f0b90b]/30' : 'text-slate-500 hover:text-white border border-transparent'}`}
                                    title="Grid 6"
                                >
                                    <FaTh />
                                </button>
                                <button
                                    onClick={saveExchangeLayout}
                                    disabled={isSavingLayout}
                                    className="ml-2 px-3 py-1.5 bg-[#f0b90b] hover:bg-[#d8a60a] text-black font-bold rounded-lg transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center gap-2"
                                    title="Guardar Configuración"
                                >
                                    {isSavingLayout ? <FaSync className="animate-spin text-xs" /> : <FaSave className="text-xs" />}
                                    <span className="text-[10px] uppercase tracking-tighter hidden sm:inline">Guardar Config</span>
                                </button>
                            </div>
                        </div>

                        <div className={`grid gap-4 ${layout === '1' ? 'grid-cols-1' :
                            layout === '2v' ? 'grid-cols-1 lg:grid-cols-2' :
                                layout === '4' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2' :
                                    'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                            }`}>
                            {charts.slice(0, layout === '1' ? 1 : layout === '2v' ? 2 : layout === '4' ? 4 : 6).map((chart) => (
                                <div
                                    key={chart.id}
                                    onClick={() => setActiveChartId(chart.id)}
                                    className={`bg-slate-900/50 rounded-2xl border overflow-hidden shadow-2xl relative group transition-all duration-300 ${activeChartId === chart.id
                                        ? 'border-[#f0b90b] ring-1 ring-[#f0b90b]/30 shadow-[#f0b90b]/10'
                                        : 'border-white/5 hover:border-white/10'
                                        }`}
                                    style={{ height: layout === '1' ? '450px' : '350px' }}
                                >
                                    <div className="absolute top-3 left-3 right-3 z-10 flex justify-between items-start pointer-events-none">
                                        <div className="flex gap-2 pointer-events-auto">
                                            <select
                                                value={chart.symbol}
                                                onChange={(e) => updateChartSymbol(chart.id, e.target.value)}
                                                className={`px-3 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer transition-all ${activeChartId === chart.id
                                                    ? 'bg-blue-600/80 backdrop-blur-md border-white/10 text-white hover:bg-blue-500'
                                                    : 'bg-slate-900/80 backdrop-blur-md border-white/10 text-slate-400 hover:text-white'
                                                    }`}
                                            >
                                                {availablePairs.map(p => (
                                                    <option key={p} value={p} className="bg-slate-900 text-white">{p}</option>
                                                ))}
                                            </select>
                                            <div className="flex bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-lg overflow-hidden ml-1 pointer-events-auto">
                                                {[
                                                    { label: '1m', value: '1' },
                                                    { label: '5m', value: '5' },
                                                    { label: '15m', value: '15' },
                                                    { label: '30m', value: '30' },
                                                    { label: '1h', value: '60' },
                                                    { label: '4h', value: '240' },
                                                    { label: '1D', value: 'D' }
                                                ].map(int => (
                                                    <button
                                                        key={int.value}
                                                        onClick={(e) => { e.stopPropagation(); updateChartInterval(chart.id, int.value); }}
                                                        className={`px-1.5 py-1 text-[8px] font-black uppercase tracking-tighter border-r border-white/5 last:border-0 transition-all ${chart.interval === int.value ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                                                    >
                                                        {int.label}
                                                    </button>
                                                ))}
                                            </div>
                                            {activeChartId === chart.id && (
                                                <div className="flex items-center gap-2">
                                                    <div className="px-2 py-1 bg-blue-500 rounded-lg text-[8px] font-black text-white uppercase tracking-widest flex items-center animate-in zoom-in">
                                                        ACTIVO
                                                    </div>
                                                    {/* Quick Add Pair Small Input for active chart */}
                                                    <div className="relative group/add">
                                                        <button
                                                            className="w-6 h-6 bg-slate-800 hover:bg-blue-600 rounded flex items-center justify-center text-white text-xs transition-colors"
                                                            title="Agregar par personalizado"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const pair = prompt("Ingresa el par (ej: PEPE/USDT):");
                                                                if (pair) {
                                                                    const formatted = pair.toUpperCase().trim();
                                                                    const final = formatted.includes('/') ? formatted : `${formatted}/USDT`;
                                                                    if (!availablePairs.includes(final)) {
                                                                        setAvailablePairs([...availablePairs, final]);
                                                                    }
                                                                    updateChartSymbol(chart.id, final);
                                                                }
                                                            }}
                                                        >+
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <TradingViewWidget
                                        symbol={chart.symbol.replace('/', '')}
                                        theme={darkMode ? "dark" : "light"}
                                        interval={chart.interval || '15'}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'spot' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {/* Balance Section - 4 Columns */}
                    <div className="lg:col-span-4 space-y-4">
                        <div className={`${styles.sectionCard} !bg-[#161a1f]/80 backdrop-blur-xl !border-white/5 !p-5 h-full relative overflow-hidden group`}>
                            <div className="flex justify-between items-center mb-6 relative z-10">
                                <div>
                                    <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Portfolio Balance</h2>
                                    <p className="text-base font-black text-white flex items-center gap-2 italic">
                                        <FaBitcoin className="text-[#f0b90b]" /> RESUMEN
                                    </p>
                                </div>
                                <button
                                    onClick={fetchBalance}
                                    className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-[#f0b90b]/20 rounded-lg text-slate-400 hover:text-[#f0b90b] transition-all border border-white/5 active:rotate-180 duration-500"
                                >
                                    <FaSync className={isLoadingBalance ? 'animate-spin' : ''} />
                                </button>
                            </div>

                            {isLoadingBalance ? (
                                <div className="space-y-4 animate-pulse">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="h-20 bg-white/5 rounded-2xl"></div>
                                    ))}
                                </div>
                            ) : balance ? (
                                <div className="space-y-3 relative z-10">
                                    {balance.total && Object.entries(balance.total).map(([asset, amount]) => {
                                        if (parseFloat(amount) > 0) {
                                            const isUSDT = asset === 'USDT';
                                            return (
                                                <div key={asset} className="bg-slate-950/40 border border-white/5 p-4 rounded-xl flex justify-between items-center group-hover:border-white/10 transition-all hover:bg-slate-900/40">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${isUSDT ? 'from-emerald-500/20 to-emerald-800/20' : 'from-slate-800 to-slate-900'} flex items-center justify-center text-xs font-black text-white border border-white/5 shadow-inner`}>
                                                            {asset}
                                                        </div>
                                                        <div>
                                                            <span className="block font-black text-white text-sm tracking-tight">{parseFloat(amount).toFixed(asset === 'USDT' ? 2 : 6)}</span>
                                                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{isUSDT ? 'Stablecoin' : 'Asset'}</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className={`w-2 h-2 rounded-full ${isUSDT ? 'bg-[#0ecb81] shadow-[0_0_8px_rgba(14,203,129,0.5)]' : 'bg-[#f0b90b]'}`}></div>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })}
                                    {(!balance.total || Object.values(balance.total).every(v => parseFloat(v) === 0)) && (
                                        <div className="flex flex-col items-center justify-center py-20 bg-slate-950/20 rounded-3xl border border-dashed border-white/5">
                                            <FaExclamationTriangle className="text-4xl text-slate-800 mb-4" />
                                            <p className="text-slate-500 text-xs font-black uppercase tracking-widest">Sin fondos detectados</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-20 bg-red-500/5 rounded-3xl border border-dashed border-red-500/10">
                                    <FaExclamationTriangle className="text-3xl text-red-500/40 mb-3 mx-auto" />
                                    <p className="text-red-500/60 text-xs font-bold uppercase">Error de Conexión</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Trade Form - 8 Columns */}
                    <div className="lg:col-span-8 flex flex-col">
                        <div className={`${styles.sectionCard} !bg-[#161a1f]/80 backdrop-blur-xl !border-white/5 !p-0 overflow-hidden flex-1 flex flex-col`}>
                            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-[#f0b90b] to-[#b38805] rounded-2xl flex items-center justify-center shadow-xl shadow-[#f0b90b]/10">
                                        <FaBolt className="text-black text-xl" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-black text-white leading-none mb-1.5 flex items-center gap-2 tracking-tight">
                                            Spot Market
                                        </h2>
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-[#0ecb81] animate-pulse"></div>
                                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Ejecución en Tiempo Real</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex bg-[#161a1f] p-1.5 rounded-xl border border-white/5 shadow-inner">
                                    {[
                                        { id: 'market', label: 'Market' },
                                        { id: 'limit', label: 'Limit' }
                                    ].map(type => (
                                        <button
                                            key={type.id}
                                            type="button"
                                            onClick={() => setTradeType(type.id)}
                                            className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-[0.1em] transition-all duration-300 ${tradeType === type.id
                                                ? 'bg-white/10 text-white shadow-xl border border-white/10'
                                                : 'text-slate-500 hover:text-white'
                                                }`}
                                        >
                                            {type.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <form onSubmit={handleTrade} className="p-8 flex-1 flex flex-col space-y-8">
                                {/* Side Selection with Gradients */}
                                <div className="grid grid-cols-2 gap-6">
                                    <button
                                        type="button"
                                        onClick={() => setTradeSide('buy')}
                                        className={`group relative flex flex-col items-center justify-center py-6 rounded-3xl transition-all duration-500 border-2 overflow-hidden ${tradeSide === 'buy'
                                            ? 'border-[#0ecb81] bg-[#0ecb81]/5 shadow-2xl shadow-[#0ecb81]/10 scale-105 z-10'
                                            : 'border-white/5 bg-slate-950/20 grayscale opacity-40 hover:grayscale-0 hover:opacity-100'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <FaArrowUp className={`${tradeSide === 'buy' ? 'text-[#0ecb81]' : 'text-slate-600'} transition-all group-hover:-translate-y-1`} />
                                            <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${tradeSide === 'buy' ? 'text-[#0ecb81]' : 'text-slate-600'}`}>Posición Larga</span>
                                        </div>
                                        <span className={`text-2xl font-black italic tracking-tighter ${tradeSide === 'buy' ? 'text-white' : 'text-slate-500'}`}>COMPRAR</span>
                                        {tradeSide === 'buy' && <div className="absolute inset-x-0 bottom-0 h-1 bg-[#0ecb81] shadow-[0_-4px_12px_rgba(14,203,129,0.5)]"></div>}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setTradeSide('sell')}
                                        className={`group relative flex flex-col items-center justify-center py-6 rounded-3xl transition-all duration-500 border-2 overflow-hidden ${tradeSide === 'sell'
                                            ? 'border-[#f6465d] bg-[#f6465d]/5 shadow-2xl shadow-[#f6465d]/10 scale-105 z-10'
                                            : 'border-white/5 bg-slate-950/20 grayscale opacity-40 hover:grayscale-0 hover:opacity-100'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <FaArrowDown className={`${tradeSide === 'sell' ? 'text-[#f6465d]' : 'text-slate-600'} transition-all group-hover:translate-y-1`} />
                                            <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${tradeSide === 'sell' ? 'text-[#f6465d]' : 'text-slate-600'}`}>Posición Corta</span>
                                        </div>
                                        <span className={`text-2xl font-black italic tracking-tighter ${tradeSide === 'sell' ? 'text-white' : 'text-slate-500'}`}>VENDER</span>
                                        {tradeSide === 'sell' && <div className="absolute inset-x-0 bottom-0 h-1 bg-[#f6465d] shadow-[0_-4px_12px_rgba(246,70,93,0.5)]"></div>}
                                    </button>
                                </div>

                                {/* Advanced Inputs Section */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        {/* Pair Selector Modern */}
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 block ml-1">Instrumento</label>
                                        <div className="grid grid-cols-2 gap-2.5">
                                            {availablePairs.map(pair => (
                                                <button
                                                    key={pair}
                                                    type="button"
                                                    onClick={() => updateChartSymbol(activeChartId, pair)}
                                                    className={`py-3.5 rounded-2xl border-2 font-black text-xs transition-all duration-300 relative overflow-hidden flex items-center justify-center gap-2 ${tradeSymbol === pair
                                                        ? 'bg-[#f0b90b]/10 border-[#f0b90b] text-white shadow-xl'
                                                        : 'bg-[#161a1f] border-white/5 text-slate-600 hover:border-white/10 hover:bg-white/5 hover:text-slate-300'
                                                        }`}
                                                >
                                                    <img
                                                        src={getCryptoIcon(pair)}
                                                        alt={pair}
                                                        className="w-5 h-5 rounded-full object-contain"
                                                        onError={(e) => {
                                                            e.target.onerror = null;
                                                            e.target.src = 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/generic.png';
                                                        }}
                                                    />
                                                    {pair.replace('/USDT', '')}
                                                    {tradeSymbol === pair && <div className="absolute top-0 right-0 p-1 bg-[#f0b90b] rounded-bl-lg animate-in zoom-in-0"><FaCheckCircle className="text-[8px] text-black" /></div>}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {/* Quantity & Price */}
                                    {tradeType === 'limit' && (
                                        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 block ml-1 text-right">Precio Limit (USDT)</label>
                                            <div className="relative group">
                                                <input
                                                    type="number"
                                                    step="0.00000001"
                                                    value={tradePrice}
                                                    onChange={e => setTradePrice(e.target.value)}
                                                    className="w-full bg-[#161a1f] border-2 border-white/5 rounded-3xl px-6 py-5 text-white font-mono text-2xl focus:border-[#f0b90b] transition-all outline-none text-right hover:border-white/10"
                                                    placeholder="0.0000"
                                                />
                                                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-700 font-black italic text-xs tracking-widest border-r border-white/5 pr-4 group-focus-within:text-[#f0b90b]">PRICE</div>
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <div className="flex justify-between items-end mb-4 px-1">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block">Cantidad a Operar</label>
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                                Disp: <span className="text-white">{balance?.total ? (parseFloat(balance.total[tradeSide === 'buy' ? 'USDT' : tradeSymbol.split('/')[0]]) || 0).toFixed(4) : '0.0000'}</span>
                                            </span>
                                        </div>
                                        <div className="relative group mb-4">
                                            <input
                                                type="number"
                                                step="0.00000001"
                                                value={tradeAmount}
                                                onChange={e => setTradeAmount(e.target.value)}
                                                className="w-full bg-[#161a1f] border border-white/5 rounded-3xl px-6 py-6 text-white font-mono text-3xl focus:border-[#f0b90b] transition-all outline-none text-right hover:border-white/10"
                                                placeholder="0.0000"
                                                required
                                            />
                                            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-700 font-black italic text-xs tracking-widest border-r border-white/5 pr-4 group-focus-within:text-[#f0b90b]">AMOUNT</div>
                                            <div className="absolute right-6 -bottom-2 px-3 py-1 bg-[#232832] border border-white/10 rounded-lg text-[9px] font-black text-white py-1 uppercase tracking-widest shadow-xl">{tradeSymbol.split('/')[0]}</div>
                                        </div>

                                        <div className="grid grid-cols-4 gap-2">
                                            {[25, 50, 75, 100].map(p => (
                                                <button
                                                    key={p}
                                                    type="button"
                                                    onClick={() => handlePercentageClick(p)}
                                                    className="py-2.5 bg-black/20 hover:bg-[#f0b90b]/10 rounded-xl text-[10px] font-black text-slate-500 hover:text-[#f0b90b] transition-all border border-white/5 active:scale-95 uppercase tracking-tighter"
                                                >
                                                    {p}%
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Enhanced Order Metrics */}
                                <div className="bg-black/20 rounded-3xl p-6 border border-white/5 flex flex-col md:flex-row gap-6 md:divide-x md:divide-white/5">
                                    <div className="flex-1 space-y-4">
                                        <div className="flex justify-between items-center px-1">
                                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Tipo de Orden</span>
                                            <span className="text-xs font-black text-white px-3 py-1 bg-white/10 border border-white/20 rounded-lg uppercase tracking-widest">{tradeType}</span>
                                        </div>
                                        <div className="flex justify-between items-center px-1">
                                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Modo</span>
                                            <span className="text-xs font-black text-[#f0b90b] italic tracking-tighter">SPOT MARKET</span>
                                        </div>
                                    </div>
                                    <div className="flex-1 flex flex-col items-center justify-center md:pl-6">
                                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Total Estimado</span>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-4xl font-black text-white tracking-tighter italic">{estimatedTotal}</span>
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono">USDT</span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isTrading}
                                    className={`w-full py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] transition-all duration-500 shadow-2xl active:scale-[0.98] ${tradeSide === 'buy'
                                        ? 'bg-[#0ecb81] hover:bg-[#0b9c61] text-white shadow-[#0ecb81]/20'
                                        : 'bg-[#f6465d] hover:bg-[#c93245] text-white shadow-[#f6465d]/20'
                                        }`}
                                >
                                    {isTrading ? 'Procesando Operación...' : `${tradeSide === 'buy' ? 'Comprar' : 'Vender'} ${tradeSymbol.split('/')[0]}`}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )
            }

            {/* Scalper Trading Tool Tab */}
            {
                activeTab === 'scalper' && (
                    <ScalperTradingTool
                        exchange={activeTradingExchange}
                        balance={balance}
                        onRefresh={fetchBalance}
                    />
                )
            }

            {/* Orders & History Viewers (Modern Lists) */}
            {
                (activeTab === 'orders' || activeTab === 'history') && (
                    <div className="bg-[var(--bg-card)] rounded-[40px] border border-white/5 overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="p-10 border-b border-white/5 bg-white/[0.01]">
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">
                                {activeTab === 'orders' ? 'Órdenes Abiertas' : 'Historial de Trading'}
                            </h3>
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">
                                {activeTab === 'orders' ? 'Gestiona tus posiciones activas en el exchange' : 'Registro de operaciones cerradas y liquidadas'}
                            </p>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-[var(--bg-main)]">
                                    <tr>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Símbolo</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Tipo/Lado</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Monto</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Precio</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Estado</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Tiempo</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {(activeTab === 'orders' ? recentOrders : orderHistory).map(order => (
                                        <tr key={order.id || order.info?.orderId} className="hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-black text-blue-500 border border-white/5 uppercase">
                                                        {(order.symbol || tradeSymbol).split('/')[0][0]}
                                                    </div>
                                                    <span className="text-xs font-black text-white">{order.symbol || tradeSymbol}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col">
                                                    <span className={`text-[9px] font-black uppercase ${order.side?.toLowerCase() === 'buy' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                        {order.side === 'buy' ? 'Compra' : 'Venta'}
                                                    </span>
                                                    <span className="text-[8px] text-slate-600 font-bold uppercase">{order.type || 'LIMIT'}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 font-mono text-[11px] text-white font-bold">{order.amount}</td>
                                            <td className="px-8 py-6 font-mono text-[11px] text-white font-bold">{order.price || order.average || 'Market'}</td>
                                            <td className="px-8 py-6">
                                                <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase ${(order.status === 'open' || order.status === 'NEW') ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                                                    order.status === 'closed' || order.status === 'FILLED' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                                                        'bg-slate-500/10 text-slate-500 border border-white/5'
                                                    }`}>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-right font-mono text-[9px] text-slate-600 font-bold">
                                                {order.timestamp ? new Date(order.timestamp).toLocaleString() : order.datetime || '---'}
                                            </td>
                                        </tr>
                                    ))}
                                    {(activeTab === 'orders' ? recentOrders : orderHistory).length === 0 && (
                                        <tr>
                                            <td colSpan="6" className="px-8 py-32 text-center text-slate-600 italic">
                                                <div className="opacity-20 flex flex-col items-center">
                                                    <FaRegClock size={48} className="mb-4" />
                                                    <p className="text-[10px] font-black uppercase tracking-[0.4em]">No hay órdenes registradas</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            }

            {
                errorMsg && (
                    <div className="fixed bottom-10 right-10 bg-[var(--bg-card)] text-white px-8 py-4 rounded-3xl shadow-2xl border border-rose-500/20 flex items-center gap-4 animate-in slide-in-from-right-10 duration-500 z-50">
                        <div className="w-10 h-10 bg-rose-500/20 rounded-xl flex items-center justify-center text-rose-500">
                            <FaExclamationTriangle className="text-xl" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1 text-slate-500">Alerta del Sistema</p>
                            <p className="text-xs font-bold leading-none">{errorMsg}</p>
                        </div>
                        <button onClick={() => setErrorMsg('')} className="ml-4 text-white/20 hover:text-white">✕</button>
                    </div>
                )
            }
        </div >
    );
};

export default ExchangeContent;
