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
                            <div className={styles.sectionCard}>
                                <div className="flex items-center gap-3 mb-6 pb-6 border-b border-white/5">
                                    <div className="p-2 bg-emerald-500/10 rounded-lg">
                                        <FaBolt className="text-emerald-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white">Operación Rápida</h2>
                                        <p className="text-xs text-slate-400">Ejecuta órdenes a precio de mercado instantáneamente</p>
                                    </div>
                                </div>

                                <form onSubmit={handleTrade} className="max-w-xl">
                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <button
                                            type="button"
                                            onClick={() => setTradeSide('buy')}
                                            className={`py-4 rounded-xl font-black text-sm uppercase tracking-wider transition-all border-2 ${tradeSide === 'buy' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-500/10' : 'bg-slate-900/30 border-transparent text-slate-500 hover:bg-slate-800'}`}
                                        >
                                            Comprar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setTradeSide('sell')}
                                            className={`py-4 rounded-xl font-black text-sm uppercase tracking-wider transition-all border-2 ${tradeSide === 'sell' ? 'bg-red-500/10 border-red-500 text-red-400 shadow-lg shadow-red-500/10' : 'bg-slate-900/30 border-transparent text-slate-500 hover:bg-slate-800'}`}
                                        >
                                            Vender
                                        </button>
                                    </div>

                                    <div className="space-y-5">
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Par de Trading</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={tradeSymbol}
                                                    onChange={e => setTradeSymbol(e.target.value.toUpperCase())}
                                                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-4 text-white font-bold text-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none"
                                                    placeholder="BTC/USDT"
                                                />
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold bg-white/10 px-2 py-1 rounded text-slate-300">
                                                    SPOT
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Cantidad</label>
                                            <input
                                                type="number"
                                                value={tradeAmount}
                                                onChange={e => setTradeAmount(e.target.value)}
                                                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-4 text-white font-mono text-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none"
                                                placeholder="0.00"
                                                step="0.00000001"
                                            />
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={isTrading}
                                            className={`w-full py-5 rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-xl transform active:scale-95 mt-4 ${tradeSide === 'buy' ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:to-emerald-400 text-white shadow-emerald-500/20' : 'bg-gradient-to-r from-red-600 to-red-500 hover:to-red-400 text-white shadow-red-500/20'}`}
                                        >
                                            {isTrading ? 'Procesando...' : (
                                                <span className="flex items-center justify-center gap-2">
                                                    <FaChartLine /> {tradeSide === 'buy' ? 'Confirmar Compra' : 'Confirmar Venta'}
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
