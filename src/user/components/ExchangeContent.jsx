import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import styles from '../pages/UserPanel.module.css';
import {
    FaBitcoin, FaKey, FaChartLine, FaExchangeAlt,
    FaBolt, FaCheckCircle, FaExclamationTriangle,
    FaRegClock, FaHistory, FaListUl, FaShieldAlt,
    FaArrowUp, FaArrowDown, FaSync, FaColumns, FaSquare, FaThLarge, FaTh, FaLayerGroup
} from 'react-icons/fa';
import TradingViewWidget from './TradingViewWidget';
import ScalperTradingTool from './ScalperTradingTool';

const ExchangeContent = () => {
    const { currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState('trading');
    const [configs, setConfigs] = useState({
        binance: { apiKey: '', secret: '', connected: false },
        bingx: { apiKey: '', secret: '', connected: false }
    });
    const [activeTradingExchange, setActiveTradingExchange] = useState('binance');

    // UI Helpers
    const [isSaving, setIsSaving] = useState({ binance: false, bingx: false });

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
        { id: 1, symbol: 'BTC/USDT' },
        { id: 2, symbol: 'ETH/USDT' },
        { id: 3, symbol: 'BNB/USDT' },
        { id: 4, symbol: 'LTC/USDT' },
        { id: 5, symbol: 'DOGE/USDT' },
        { id: 6, symbol: 'SOL/USDT' }
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


    const tabs = [
        { id: 'trading', label: 'Terminal', icon: <FaBolt /> },
        { id: 'scalper', label: 'Escalonado', icon: <FaLayerGroup /> },
        { id: 'orders', label: 'Órdenes', icon: <FaListUl /> },
        { id: 'history', label: 'Historial', icon: <FaHistory /> },
        { id: 'config', label: 'Credenciales', icon: <FaKey /> }
    ];

    // Trading pairs state
    const [availablePairs, setAvailablePairs] = useState([
        'BTC/USDT',
        'ETH/USDT',
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
            }
        } catch (error) {
            console.error("Open orders fetch error:", error);
        } finally {
            setIsLoadingBalance(false);
        }
    };

    const fetchBalance = async () => {
        if (!keysConfigured) return;
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

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error al obtener balance');
            }

            const data = await response.json();
            setBalance(data);
        } catch (error) {
            console.error("Balance fetch error:", error);
            if (error.message.includes('not-found') || error.message.includes('API Keys')) {
                setConfigs(prev => ({
                    ...prev,
                    [activeTradingExchange]: { ...prev[activeTradingExchange], connected: false }
                }));
            } else {
                setErrorMsg("No se pudo conectar con el Exchange. Verifica tus credenciales.");
            }
        } finally {
            setIsLoadingBalance(false);
        }
    };

    // Auto-fetch data when tab changes
    useEffect(() => {
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
            if (response.ok) {
                const data = await response.json();
                if (data.last) {
                    setTradePrice(data.last.toString());
                }
            }
        } catch (error) {
            console.error("Error fetching ticker:", error);
        }
    };

    // Auto-fetch price when symbol changes
    useEffect(() => {
        if (tradeSymbol) {
            fetchTicker(tradeSymbol);
        }
    }, [tradeSymbol]);

    const handlePercentageClick = (percentage) => {
        if (!balance || !balance.total) return;

        const [asset, base] = tradeSymbol.split('/');
        const targetAsset = tradeSide === 'buy' ? base : asset;
        const available = parseFloat(balance.total[targetAsset]) || 0;

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
        setIsSaving(prev => ({ ...prev, [exchangeName]: true }));
        setErrorMsg('');

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
        <div className={`${styles.dashboardContent} animate-in fade-in duration-700`}>
            {/* New Modern Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className={styles.mainContentTitle}>Conexión Exchange</h1>
                        {keysConfigured ? (
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-tighter">Conectado</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-500/10 border border-white/5 rounded-full">
                                <div className="w-1.5 h-1.5 bg-slate-500 rounded-full"></div>
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Sin Conexión</span>
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
                            <option value="binance">BINANCE</option>
                            <option value="bingx">BINGX</option>
                        </select>
                        <span className="text-slate-600 font-bold ml-1 text-xs">v2.2</span>
                    </div>
                </div>

                {/* Modern Navigation Tabs */}
                <div className="flex bg-slate-900/40 backdrop-blur-xl p-1.5 rounded-2xl border border-white/5 overflow-x-auto max-w-full">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 transform active:scale-95 whitespace-nowrap ${activeTab === tab.id
                                ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20 border border-white/10'
                                : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                                }`}
                        >
                            <span className={activeTab === tab.id ? 'scale-110 duration-500' : 'opacity-60'}>
                                {tab.icon}
                            </span>
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {activeTab === 'config' && (
                <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Gestionar Vinculaciones</h2>
                        <p className="text-slate-400 text-sm font-medium max-w-md mx-auto leading-relaxed">
                            Configura y guarda las credenciales para cada exchange por separado.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {['binance', 'bingx'].map(exName => {
                            const isConnected = configs[exName]?.connected;
                            const color = exName === 'binance' ? 'yellow' : 'blue';

                            return (
                                <div key={exName} className={`${styles.sectionCard} !bg-slate-900/40 backdrop-blur-xl !border-white/5 !p-8 relative overflow-hidden group transition-all hover:border-${color}-500/30`}>
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
                !keysConfigured ? (
                    <div className="flex flex-col items-center justify-center py-32 text-center animate-in fade-in zoom-in-95 duration-500">
                        <div className="relative mb-8">
                            <div className="w-32 h-32 bg-blue-600/10 rounded-full flex items-center justify-center border border-blue-500/20 shadow-2xl shadow-blue-600/10">
                                <FaExchangeAlt className="text-5xl text-blue-500/40" />
                            </div>
                            <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-slate-900 border border-white/10 rounded-2xl flex items-center justify-center shadow-xl">
                                <FaShieldAlt className="text-rose-500" />
                            </div>
                        </div>
                        <h2 className="text-3xl font-black text-white mb-3 tracking-tight">Acceso Restringido</h2>
                        <p className="text-slate-400 max-w-sm mb-10 font-medium leading-relaxed">
                            Para acceder a la terminal de trading y ver tu balance en vivo, primero debes configurar tus credenciales API.
                        </p>
                        <button
                            onClick={() => setActiveTab('config')}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-black py-4 px-10 rounded-2xl transition-all shadow-2xl shadow-blue-600/30 hover:-translate-y-1 active:scale-95 uppercase tracking-widest text-xs"
                        >
                            Ir a Configuración
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="lg:col-span-12 mb-8">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-black text-white italic tracking-tight flex items-center gap-2">
                                    <FaChartLine className="text-blue-500" />
                                    ANÁLISIS DE MERCADO
                                </h2>
                                <div className="flex bg-slate-900/50 p-1 rounded-xl border border-white/5">
                                    <button
                                        onClick={() => setLayout('1')}
                                        className={`p-2 rounded-lg transition-all ${layout === '1' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                                        title="Vista Simple"
                                    >
                                        <FaSquare />
                                    </button>
                                    <button
                                        onClick={() => setLayout('2v')}
                                        className={`p-2 rounded-lg transition-all ${layout === '2v' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                                        title="Vista Dividida"
                                    >
                                        <FaColumns />
                                    </button>
                                    <button
                                        onClick={() => setLayout('4')}
                                        className={`p-2 rounded-lg transition-all ${layout === '4' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                                        title="Grid 4"
                                    >
                                        <FaThLarge />
                                    </button>
                                    <button
                                        onClick={() => setLayout('6')}
                                        className={`p-2 rounded-lg transition-all ${layout === '6' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                                        title="Grid 6"
                                    >
                                        <FaTh />
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
                                        className={`bg-slate-900/40 rounded-3xl border overflow-hidden shadow-2xl relative group transition-all duration-300 ${activeChartId === chart.id
                                            ? 'border-blue-500 ring-1 ring-blue-500/50 shadow-blue-500/20'
                                            : 'border-white/5 hover:border-white/10'
                                            }`}
                                        style={{ height: layout === '1' ? '500px' : '400px' }}
                                    >
                                        <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-start pointer-events-none">
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
                                        <TradingViewWidget symbol={chart.symbol.replace('/', '')} theme="dark" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Balance Section - 4 Columns */}
                        <div className="lg:col-span-4 space-y-6">
                            <div className={`${styles.sectionCard} !bg-slate-900/40 backdrop-blur-xl !border-white/5 !p-6 h-full relative overflow-hidden group`}>
                                <div className="absolute top-0 right-0 p-32 bg-blue-600/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:bg-blue-600/10 transition-colors duration-700"></div>

                                <div className="flex justify-between items-center mb-8 relative z-10">
                                    <div>
                                        <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Portfolio Balance</h2>
                                        <p className="text-lg font-black text-white flex items-center gap-2 italic">
                                            <FaBitcoin className="text-yellow-500" /> RESUMEN
                                        </p>
                                    </div>
                                    <button
                                        onClick={fetchBalance}
                                        className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-blue-600/20 rounded-xl text-slate-400 hover:text-blue-400 transition-all border border-white/5 active:rotate-180 duration-500"
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
                                                    <div key={asset} className="bg-slate-950/40 border border-white/5 p-5 rounded-2xl flex justify-between items-center group-hover:border-white/10 transition-all hover:bg-slate-900/40">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${isUSDT ? 'from-emerald-500/20 to-emerald-800/20' : 'from-slate-800 to-slate-900'} flex items-center justify-center text-sm font-black text-white border border-white/5 shadow-inner`}>
                                                                {asset}
                                                            </div>
                                                            <div>
                                                                <span className="block font-black text-white text-base tracking-tight">{parseFloat(amount).toFixed(asset === 'USDT' ? 2 : 6)}</span>
                                                                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{isUSDT ? 'Stablecoin' : 'Asset'}</span>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className={`w-2 h-2 rounded-full ${isUSDT ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-blue-500'}`}></div>
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
                            <div className={`${styles.sectionCard} !bg-slate-900/40 backdrop-blur-xl !border-white/5 !p-0 overflow-hidden flex-1 flex flex-col`}>
                                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-700 rounded-2xl flex items-center justify-center shadow-xl shadow-emerald-500/20">
                                            <FaBolt className="text-white text-xl" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-black text-white leading-none mb-1.5 flex items-center gap-2 tracking-tight">
                                                Operación Rápida
                                                <span className="px-2 py-0.5 bg-blue-600/20 text-blue-400 text-[9px] rounded-lg border border-blue-500/30 font-black">PRO</span>
                                            </h2>
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Ejecución en Tiempo Real</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex bg-slate-950/60 p-1.5 rounded-xl border border-white/5 shadow-inner">
                                        {[
                                            { id: 'market', label: 'Market' },
                                            { id: 'limit', label: 'Limit' }
                                        ].map(type => (
                                            <button
                                                key={type.id}
                                                type="button"
                                                onClick={() => setTradeType(type.id)}
                                                className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-[0.1em] transition-all duration-300 ${tradeType === type.id
                                                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20 border border-white/10'
                                                    : 'text-slate-500 hover:text-slate-300'
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
                                                ? 'border-emerald-500 bg-emerald-500/5 shadow-2xl shadow-emerald-500/10 scale-105 z-10'
                                                : 'border-white/5 bg-slate-950/20 grayscale opacity-40 hover:grayscale-0 hover:opacity-100'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2 mb-2">
                                                <FaArrowUp className={`${tradeSide === 'buy' ? 'text-emerald-500' : 'text-slate-600'} transition-all group-hover:-translate-y-1`} />
                                                <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${tradeSide === 'buy' ? 'text-emerald-500' : 'text-slate-600'}`}>Posición Larga</span>
                                            </div>
                                            <span className={`text-2xl font-black italic tracking-tighter ${tradeSide === 'buy' ? 'text-white' : 'text-slate-500'}`}>COMPRAR</span>
                                            {tradeSide === 'buy' && <div className="absolute inset-x-0 bottom-0 h-1 bg-emerald-500 shadow-[0_-4px_12px_rgba(16,185,129,0.5)]"></div>}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setTradeSide('sell')}
                                            className={`group relative flex flex-col items-center justify-center py-6 rounded-3xl transition-all duration-500 border-2 overflow-hidden ${tradeSide === 'sell'
                                                ? 'border-rose-500 bg-rose-500/5 shadow-2xl shadow-rose-500/10 scale-105 z-10'
                                                : 'border-white/5 bg-slate-950/20 grayscale opacity-40 hover:grayscale-0 hover:opacity-100'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2 mb-2">
                                                <FaArrowDown className={`${tradeSide === 'sell' ? 'text-rose-500' : 'text-slate-600'} transition-all group-hover:translate-y-1`} />
                                                <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${tradeSide === 'sell' ? 'text-rose-500' : 'text-slate-600'}`}>Posición Corta</span>
                                            </div>
                                            <span className={`text-2xl font-black italic tracking-tighter ${tradeSide === 'sell' ? 'text-white' : 'text-slate-500'}`}>VENDER</span>
                                            {tradeSide === 'sell' && <div className="absolute inset-x-0 bottom-0 h-1 bg-rose-500 shadow-[0_-4px_12px_rgba(244,63,94,0.5)]"></div>}
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
                                                            ? 'bg-blue-600/10 border-blue-500 text-white shadow-xl shadow-blue-600/10'
                                                            : 'bg-slate-950/40 border-white/5 text-slate-600 hover:border-white/10 hover:bg-slate-900/40 hover:text-slate-300'
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
                                                        {tradeSymbol === pair && <div className="absolute top-0 right-0 p-1 bg-blue-500 rounded-bl-lg animate-in zoom-in-0"><FaCheckCircle className="text-[8px] text-white" /></div>}
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
                                                        className="w-full bg-slate-950/60 border-2 border-white/5 rounded-3xl px-6 py-5 text-white font-mono text-2xl focus:border-blue-500 transition-all outline-none text-right hover:border-white/10"
                                                        placeholder="0.0000"
                                                    />
                                                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-700 font-black italic text-xs tracking-widest border-r border-white/5 pr-4 group-focus-within:text-blue-500">PRICE</div>
                                                </div>
                                            </div>
                                        )}

                                        <div>
                                            <div className="flex justify-between items-end mb-4 px-1">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block">Cantidad a Operar</label>
                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                                    Disp: <span className="text-blue-500">{balance?.total ? (parseFloat(balance.total[tradeSide === 'buy' ? 'USDT' : tradeSymbol.split('/')[0]]) || 0).toFixed(4) : '0.0000'}</span>
                                                </span>
                                            </div>
                                            <div className="relative group mb-4">
                                                <input
                                                    type="number"
                                                    step="0.00000001"
                                                    value={tradeAmount}
                                                    onChange={e => setTradeAmount(e.target.value)}
                                                    className="w-full bg-[#12161c] border border-white/5 rounded-3xl px-6 py-6 text-white font-mono text-3xl focus:border-blue-500 transition-all outline-none text-right hover:border-white/10"
                                                    placeholder="0.0000"
                                                    required
                                                />
                                                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-700 font-black italic text-xs tracking-widest border-r border-white/5 pr-4 group-focus-within:text-blue-500">AMOUNT</div>
                                                <div className="absolute right-6 -bottom-2 px-3 py-1 bg-[#1e2329] border border-white/10 rounded-lg text-[9px] font-black text-slate-400 uppercase tracking-widest shadow-xl group-focus-within:text-blue-400 group-focus-within:border-blue-500/30 transition-all">{tradeSymbol.split('/')[0]}</div>
                                            </div>

                                            <div className="grid grid-cols-4 gap-2">
                                                {[25, 50, 75, 100].map(p => (
                                                    <button
                                                        key={p}
                                                        type="button"
                                                        onClick={() => handlePercentageClick(p)}
                                                        className="py-2.5 bg-black/20 hover:bg-white/5 rounded-xl text-[10px] font-black text-slate-600 hover:text-blue-400 transition-all border border-white/5 active:scale-95 uppercase tracking-tighter"
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
                                                <span className="text-xs font-black text-white px-3 py-1 bg-blue-600/10 border border-blue-500/20 rounded-lg uppercase tracking-widest">{tradeType}</span>
                                            </div>
                                            <div className="flex justify-between items-center px-1">
                                                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Modo</span>
                                                <span className="text-xs font-black text-[#fcd535] italic tracking-tighter">SPOT TERMINAL</span>
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
                                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20'
                                            : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-500/20'
                                            }`}
                                    >
                                        {isTrading ? 'Procesando Operación...' : `${tradeSide === 'buy' ? 'Comprar' : 'Vender'} ${tradeSymbol.split('/')[0]}`}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div >
                )
            )}

            {/* Scalper Trading Tool Tab */}
            {activeTab === 'scalper' && (
                !keysConfigured ? (
                    <div className="flex flex-col items-center justify-center py-32 text-center animate-in fade-in zoom-in-95 duration-500">
                        <div className="relative mb-8">
                            <div className="w-32 h-32 bg-purple-600/10 rounded-full flex items-center justify-center border border-purple-500/20 shadow-2xl shadow-purple-600/10">
                                <FaLayerGroup className="text-5xl text-purple-500/40" />
                            </div>
                            <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-slate-900 border border-white/10 rounded-2xl flex items-center justify-center shadow-xl">
                                <FaShieldAlt className="text-rose-500" />
                            </div>
                        </div>
                        <h2 className="text-3xl font-black text-white mb-3 tracking-tight">Acceso Restringido</h2>
                        <p className="text-slate-400 max-w-sm mb-10 font-medium leading-relaxed">
                            Para usar la herramienta de trading escalonado, primero debes configurar tus credenciales API.
                        </p>
                        <button
                            onClick={() => setActiveTab('config')}
                            className="bg-purple-600 hover:bg-purple-500 text-white font-black py-4 px-10 rounded-2xl transition-all shadow-2xl shadow-purple-600/30 hover:-translate-y-1 active:scale-95 uppercase tracking-widest text-xs"
                        >
                            Ir a Configuración
                        </button>
                    </div>
                ) : (
                    <ScalperTradingTool
                        exchange={activeTradingExchange}
                        balance={balance}
                        onRefresh={fetchBalance}
                    />
                )
            )}

            {/* Orders & History Viewers (Modern Lists) */}
            {(activeTab === 'orders' || activeTab === 'history') && (
                <div className="bg-[#1e2329] rounded-[40px] border border-white/5 overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
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
                            <thead className="bg-[#12161c]">
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
            )}

            {errorMsg && (
                <div className="fixed bottom-10 right-10 bg-[#1e2329] text-white px-8 py-4 rounded-3xl shadow-2xl border border-rose-500/20 flex items-center gap-4 animate-in slide-in-from-right-10 duration-500 z-50">
                    <div className="w-10 h-10 bg-rose-500/20 rounded-xl flex items-center justify-center text-rose-500">
                        <FaExclamationTriangle className="text-xl" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1 text-slate-500">Alerta del Sistema</p>
                        <p className="text-xs font-bold leading-none">{errorMsg}</p>
                    </div>
                    <button onClick={() => setErrorMsg('')} className="ml-4 text-white/20 hover:text-white">✕</button>
                </div>
            )}
        </div>
    );
};

export default ExchangeContent;
