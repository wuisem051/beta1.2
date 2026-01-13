import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import styles from '../pages/UserPanel.module.css';
import { FaBitcoin, FaKey, FaChartLine, FaExchangeAlt, FaBolt, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';

const ExchangeContent = () => {
    const { currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState('trading');
    const [exchangeType, setExchangeType] = useState('binance');
    const [apiKey, setApiKey] = useState('');
    const [secret, setSecret] = useState('');
    const [isSaving, setIsSaving] = useState(false);
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
    const [keysConfigured, setKeysConfigured] = useState(false);

    // Trading pairs list
    const tradingPairs = [
        'BTC/USDT',
        'ETH/USDT',
        'ARPA/USDT',
        'BNB/USDT',
        'SOL/USDT',
        'XRP/USDT',
        'ADA/USDT',
        'DOGE/USDT'
    ];

    // Fetch saved config on mount
    useEffect(() => {
        const fetchConfig = async () => {
            if (currentUser?.uid) {
                const docRef = doc(db, 'users', currentUser.uid, 'secrets', 'exchange');
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    const data = snap.data();
                    setApiKey(data.apiKey || '');
                    setSecret(data.secret || '');
                    setExchangeType(data.exchange || 'binance');
                    if (data.apiKey && data.secret) {
                        setKeysConfigured(true);
                    }
                }
            }
        };
        fetchConfig();
    }, [currentUser]);

    // Fetch Balance when tab is 'trading'
    useEffect(() => {
        if (activeTab === 'trading' && currentUser && keysConfigured) {
            fetchBalance();
        }
    }, [activeTab, currentUser, keysConfigured]);

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
                }
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
                setKeysConfigured(false);
            } else {
                setErrorMsg("No se pudo conectar con el Exchange. Verifica tus credenciales.");
            }
        } finally {
            setIsLoadingBalance(false);
        }
    };

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

    const handlePercentageClick = (percentage) => {
        if (!balance || !balance.total) return;

        const [asset, base] = tradeSymbol.split('/');
        const targetAsset = tradeSide === 'buy' ? base : asset;
        const available = parseFloat(balance.total[targetAsset]) || 0;

        if (tradeSide === 'buy') {
            // For buy, we use % of USDT (base)
            if (tradeType === 'limit' && tradePrice) {
                const amount = (available * (percentage / 100)) / parseFloat(tradePrice);
                setTradeAmount(amount.toFixed(8));
            } else {
                // If market, user might want to buy with x USDT, but CCXT expects asset amount
                // We'll show a warning or just use a default estimate if we had price
                alert("Para usar porcentajes en compra, usa una orden 'Limit' para calcular la cantidad exacta.");
            }
        } else {
            // For sell, it's easy: % of the asset balance
            const amount = available * (percentage / 100);
            setTradeAmount(amount.toFixed(8));
        }
    };

    const handleSaveKeys = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setErrorMsg('');
        try {
            if (!currentUser?.uid) return;
            await setDoc(doc(db, 'users', currentUser.uid, 'secrets', 'exchange'), {
                apiKey,
                secret,
                exchange: exchangeType,
                updatedAt: new Date()
            });
            setKeysConfigured(true);
            setTimeout(() => setActiveTab('trading'), 1000); // Auto switch to trading
        } catch (error) {
            console.error("Save error:", error);
            setErrorMsg("Error al guardar claves: " + error.message);
        } finally {
            setIsSaving(false);
        }
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
                    price: tradeType === 'limit' ? parseFloat(tradePrice) : undefined
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
        <div className={styles.dashboardContent}>
            <div className="flex flex-col md:flex-row justify-between items-center mb-8">
                <div>
                    <h1 className={styles.mainContentTitle}>Conexión Exchange</h1>
                    <p className="text-sm text-slate-400 font-medium">Opera directamente desde tu cuenta de {exchangeType === 'binance' ? 'Binance' : 'BingX'}</p>
                </div>
                <div className="flex bg-slate-900/60 p-1 rounded-xl border border-white/5 mt-4 md:mt-0">
                    <button
                        onClick={() => setActiveTab('trading')}
                        className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'trading' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-500 hover:text-white'}`}
                    >
                        Trading
                    </button>
                    <button
                        onClick={() => setActiveTab('config')}
                        className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'config' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-500 hover:text-white'}`}
                    >
                        Configuración
                    </button>
                </div>
            </div>

            {errorMsg && (
                <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                    <FaExclamationTriangle />
                    <span className="text-sm font-medium">{errorMsg}</span>
                </div>
            )}

            {activeTab === 'config' && (
                <div className="max-w-2xl mx-auto">
                    <div className={styles.sectionCard} style={{ padding: '3rem' }}>
                        <div className="flex items-center justify-center mb-8">
                            <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-500 text-3xl mb-4">
                                <FaKey />
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-center text-white mb-2">Vincula tu Cuenta</h2>
                        <p className="text-slate-400 text-center mb-8 text-sm">
                            Tus claves API se cifran y almacenan de forma segura. Solo tú tienes acceso.
                        </p>

                        <form onSubmit={handleSaveKeys} className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Exchange</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setExchangeType('binance')}
                                        className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${exchangeType === 'binance' ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500' : 'bg-slate-900/50 border-white/5 text-slate-500 hover:border-white/10'}`}
                                    >
                                        <span className="font-bold">Binance</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setExchangeType('bingx')}
                                        className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${exchangeType === 'bingx' ? 'bg-blue-500/10 border-blue-500 text-blue-500' : 'bg-slate-900/50 border-white/5 text-slate-500 hover:border-white/10'}`}
                                    >
                                        <span className="font-bold">BingX</span>
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">API Key</label>
                                    <input
                                        type="text"
                                        value={apiKey}
                                        onChange={e => setApiKey(e.target.value)}
                                        className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none font-mono text-sm"
                                        placeholder="Pegar llave pública..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">API Secret</label>
                                    <input
                                        type="password"
                                        value={secret}
                                        onChange={e => setSecret(e.target.value)}
                                        className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none font-mono text-sm"
                                        placeholder="Pegar llave secreta..."
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSaving}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-600/20 transform active:scale-[0.98] mt-6 flex items-center justify-center gap-2"
                            >
                                {isSaving ? 'Guardando...' : (
                                    <>
                                        <FaCheckCircle /> Guardar y Conectar
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {activeTab === 'trading' && (
                !keysConfigured ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 border border-white/5">
                            <FaExchangeAlt className="text-4xl text-slate-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">No estás conectado</h2>
                        <p className="text-slate-400 max-w-md mb-8">Configura tus claves API para ver tu saldo y operar directamente desde aquí.</p>
                        <button
                            onClick={() => setActiveTab('config')}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-blue-600/20"
                        >
                            Conectar Exchange
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Balance Section - 4 Columns */}
                        <div className="lg:col-span-4 space-y-6">
                            <div className={`${styles.sectionCard} h-full relative overflow-hidden group`}>
                                <div className="absolute top-0 right-0 p-32 bg-blue-600/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                                <div className="flex justify-between items-center mb-6 relative z-10">
                                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                        <FaBitcoin className="text-yellow-500" /> Balance
                                    </h2>
                                    <button onClick={fetchBalance} className="text-[10px] uppercase font-bold bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg text-slate-300 transition-colors">
                                        Actualizar
                                    </button>
                                </div>

                                {isLoadingBalance ? (
                                    <div className="space-y-4 animate-pulse">
                                        <div className="h-16 bg-white/5 rounded-xl"></div>
                                        <div className="h-16 bg-white/5 rounded-xl"></div>
                                    </div>
                                ) : balance ? (
                                    <div className="space-y-3 relative z-10">
                                        {balance.total && Object.entries(balance.total).map(([asset, amount]) => {
                                            if (parseFloat(amount) > 0) {
                                                return (
                                                    <div key={asset} className="bg-slate-900/40 border border-white/5 p-4 rounded-xl flex justify-between items-center group-hover:border-white/10 transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-xs font-bold text-white">
                                                                {asset[0]}
                                                            </div>
                                                            <span className="font-bold text-slate-200">{asset}</span>
                                                        </div>
                                                        <span className="font-mono text-lg text-white font-bold tracking-tight">{parseFloat(amount).toFixed(8)}</span>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })}
                                        {(!balance.total || Object.values(balance.total).every(v => parseFloat(v) === 0)) && (
                                            <div className="text-center py-8 text-slate-500 text-sm">
                                                Tu cuenta está vacía o el saldo es 0.
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-10 text-slate-500 text-xs">
                                        Error cargando datos.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Trade Form - 8 Columns */}
                        <div className="lg:col-span-8">
                            <div className={`${styles.sectionCard} overflow-hidden px-0 pt-0 pb-0`}>
                                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-800/20">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                                            <FaBolt className="text-emerald-400 text-xl" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-white leading-none mb-1">Operación Rápida</h2>
                                            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Trading Avanzado</p>
                                        </div>
                                    </div>
                                    <div className="flex bg-slate-900/50 p-1 rounded-lg border border-white/5">
                                        <button
                                            type="button"
                                            onClick={() => setTradeType('market')}
                                            className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${tradeType === 'market' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-slate-300'}`}
                                        >
                                            Market
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setTradeType('limit')}
                                            className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${tradeType === 'limit' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-slate-300'}`}
                                        >
                                            Limit
                                        </button>
                                    </div>
                                </div>

                                <form onSubmit={handleTrade} className="p-8">
                                    <div className="grid grid-cols-2 gap-4 mb-8">
                                        <button
                                            type="button"
                                            onClick={() => setTradeSide('buy')}
                                            className={`flex flex-col items-center justify-center py-4 rounded-2xl transition-all border-2 relative overflow-hidden group ${tradeSide === 'buy' ? 'border-emerald-500' : 'border-white/5 grayscale opacity-50 hover:grayscale-0 hover:opacity-100'}`}
                                        >
                                            {tradeSide === 'buy' && <div className="absolute inset-0 bg-emerald-500/10 animate-pulse"></div>}
                                            <span className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${tradeSide === 'buy' ? 'text-emerald-400' : 'text-slate-500'}`}>Long</span>
                                            <span className={`text-xl font-black ${tradeSide === 'buy' ? 'text-emerald-400' : 'text-slate-400'}`}>COMPRAR</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setTradeSide('sell')}
                                            className={`flex flex-col items-center justify-center py-4 rounded-2xl transition-all border-2 relative overflow-hidden group ${tradeSide === 'sell' ? 'border-red-500' : 'border-white/5 grayscale opacity-50 hover:grayscale-0 hover:opacity-100'}`}
                                        >
                                            {tradeSide === 'sell' && <div className="absolute inset-0 bg-red-500/10 animate-pulse"></div>}
                                            <span className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${tradeSide === 'sell' ? 'text-red-400' : 'text-slate-500'}`}>Short</span>
                                            <span className={`text-xl font-black ${tradeSide === 'sell' ? 'text-red-400' : 'text-slate-400'}`}>VENDER</span>
                                        </button>
                                    </div>

                                    <div className="space-y-6">
                                        {/* Pair Selector */}
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Mercado Seleccionado</label>
                                            <div className="grid grid-cols-4 gap-2">
                                                {tradingPairs.map(pair => (
                                                    <button
                                                        key={pair}
                                                        type="button"
                                                        onClick={() => setTradeSymbol(pair)}
                                                        className={`py-3 rounded-xl border font-bold text-xs transition-all ${tradeSymbol === pair ? 'bg-blue-600/10 border-blue-500 text-blue-400' : 'bg-slate-900/30 border-white/5 text-slate-500 hover:border-white/10'}`}
                                                    >
                                                        {pair.split('/')[0]}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Inputs Container */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {tradeType === 'limit' && (
                                                <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Precio de Orden (USDT)</label>
                                                    <div className="relative group">
                                                        <input
                                                            type="number"
                                                            step="0.00000001"
                                                            value={tradePrice}
                                                            onChange={e => setTradePrice(e.target.value)}
                                                            className="w-full bg-slate-900/80 border border-white/10 rounded-2xl px-5 py-5 text-white font-mono text-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none"
                                                            placeholder="0.0000"
                                                        />
                                                        <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-600 font-bold group-focus-within:text-blue-500 transition-colors">LIMIT</div>
                                                    </div>
                                                </div>
                                            )}

                                            <div className={`${tradeType === 'market' ? 'col-span-2' : ''} transition-all duration-300`}>
                                                <div className="flex justify-between items-end mb-3">
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Cantidad a Operar</label>
                                                    <span className="text-[10px] font-bold text-slate-500">
                                                        Saldo: <span className="text-blue-400">{balance?.total ? (parseFloat(balance.total[tradeSide === 'buy' ? 'USDT' : tradeSymbol.split('/')[0]]) || 0).toFixed(4) : '0.0000'}</span> {tradeSide === 'buy' ? 'USDT' : tradeSymbol.split('/')[0]}
                                                    </span>
                                                </div>
                                                <div className="relative group">
                                                    <input
                                                        type="number"
                                                        step="0.00000001"
                                                        value={tradeAmount}
                                                        onChange={e => setTradeAmount(e.target.value)}
                                                        className="w-full bg-slate-900/80 border border-white/10 rounded-2xl px-5 py-5 text-white font-mono text-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none"
                                                        placeholder="0.00"
                                                    />
                                                    <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-600 font-bold group-focus-within:text-blue-500 transition-colors">{tradeSymbol.split('/')[0]}</div>
                                                </div>

                                                {/* Percentage Buttons */}
                                                <div className="grid grid-cols-4 gap-2 mt-3">
                                                    {[25, 50, 75, 100].map(p => (
                                                        <button
                                                            key={p}
                                                            type="button"
                                                            onClick={() => handlePercentageClick(p)}
                                                            className="py-2 bg-slate-900/40 hover:bg-slate-800 rounded-lg text-[10px] font-bold text-slate-500 transition-colors border border-white/5"
                                                        >
                                                            {p}%
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Order Info */}
                                        <div className="bg-slate-900/50 rounded-2xl p-5 border border-white/5 space-y-3">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-slate-500 font-bold uppercase tracking-wider">Tipo de Orden</span>
                                                <span className="text-white font-bold">{tradeType === 'market' ? 'Mercado Instantáneo' : 'Límite Programada'}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-500 font-bold uppercase tracking-wider text-xs">Valor Estimado</span>
                                                <span className="text-lg font-black text-white tracking-tight">{estimatedTotal} <span className="text-xs text-slate-500 font-medium">USDT</span></span>
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={isTrading}
                                            className={`w-full py-6 rounded-2xl font-black text-base uppercase tracking-widest transition-all shadow-2xl transform active:scale-[0.97] mt-2 relative overflow-hidden group ${tradeSide === 'buy' ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20' : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/20'}`}
                                        >
                                            {isTrading ? (
                                                <span className="flex items-center justify-center gap-2">
                                                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                                    Procesando...
                                                </span>
                                            ) : (
                                                <span className="flex items-center justify-center gap-3">
                                                    {tradeSide === 'buy' ? <FaCheckCircle className="animate-pulse" /> : <FaExclamationTriangle className="animate-pulse" />}
                                                    {tradeSide === 'buy' ? 'Abrir Posición Long' : 'Abrir Posición Short'}
                                                </span>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )
            )}
        </div>
    );
};

export default ExchangeContent;
