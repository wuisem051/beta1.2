import React, { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions, db } from '../../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import styles from '../pages/UserPanel.module.css';

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
    const [tradeSide, setTradeSide] = useState('buy');
    const [isTrading, setIsTrading] = useState(false);
    const [tradeResult, setTradeResult] = useState(null);

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
                }
            }
        };
        fetchConfig();
    }, [currentUser]);

    // Fetch Balance when tab is 'trading'
    useEffect(() => {
        if (activeTab === 'trading' && currentUser) {
            fetchBalance();
        }
    }, [activeTab, currentUser]);

    const fetchBalance = async () => {
        setIsLoadingBalance(true);
        try {
            const getBalance = httpsCallable(functions, 'getExchangeBalance');
            const result = await getBalance();
            setBalance(result.data);
        } catch (error) {
            console.error("Balance fetch error:", error);
            alert("Error al obtener balance: " + error.message);
        } finally {
            setIsLoadingBalance(false);
        }
    };

    const handleSaveKeys = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (!currentUser?.uid) return;
            await setDoc(doc(db, 'users', currentUser.uid, 'secrets', 'exchange'), {
                apiKey,
                secret,
                exchange: exchangeType,
                updatedAt: new Date()
            });
            alert('Claves guardadas correctamente.');
        } catch (error) {
            console.error("Save error:", error);
            alert("Error: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleTrade = async (e) => {
        e.preventDefault();
        if (!tradeAmount || !tradeSymbol) return;

        setIsTrading(true);
        setTradeResult(null);
        try {
            const executeTrade = httpsCallable(functions, 'executeExchangeTrade');
            const result = await executeTrade({
                symbol: tradeSymbol,
                side: tradeSide, // 'buy' or 'sell'
                amount: parseFloat(tradeAmount),
                type: 'market' // Default to market for simplicity as per plan
            });
            setTradeResult({ success: true, data: result.data });
            fetchBalance(); // Refresh balance
            alert("Orden ejecutada correctamente!");
        } catch (error) {
            console.error("Trade error:", error);
            setTradeResult({ success: false, error: error.message });
            alert("Error al ejecutar orden: " + error.message);
        } finally {
            setIsTrading(false);
        }
    };

    return (
        <div className={styles.dashboardContent}>
            <h1 className={styles.mainContentTitle}>Conexión Exchange</h1>

            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b border-white/10">
                <button
                    onClick={() => setActiveTab('trading')}
                    className={`pb-2 px-4 font-bold ${activeTab === 'trading' ? 'text-accent border-b-2 border-accent' : 'text-slate-400 hover:text-white'}`}
                >
                    Trading & Balance
                </button>
                <button
                    onClick={() => setActiveTab('config')}
                    className={`pb-2 px-4 font-bold ${activeTab === 'config' ? 'text-accent border-b-2 border-accent' : 'text-slate-400 hover:text-white'}`}
                >
                    Configuración API
                </button>
            </div>

            {activeTab === 'config' && (
                <div className={styles.sectionCard}>
                    <h2 className={styles.sectionTitle}>Configurar Claves API</h2>
                    <p className="text-sm text-slate-400 mb-4">
                        Ingresa tus claves API de Binance o BingX. Estas se guardan de forma segura en tu base de datos privada.
                    </p>
                    <form onSubmit={handleSaveKeys} className="space-y-4 max-w-lg">
                        <div>
                            <label className="block text-sm font-bold mb-2 text-slate-300">Exchange</label>
                            <select
                                value={exchangeType}
                                onChange={e => setExchangeType(e.target.value)}
                                className={styles.inputField}
                            >
                                <option value="binance">Binance</option>
                                <option value="bingx">BingX</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-2 text-slate-300">API Key</label>
                            <input
                                type="text"
                                value={apiKey}
                                onChange={e => setApiKey(e.target.value)}
                                className={styles.inputField}
                                placeholder="Ingresa tu API Key"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-2 text-slate-300">API Secret</label>
                            <input
                                type="password"
                                value={secret}
                                onChange={e => setSecret(e.target.value)}
                                className={styles.inputField}
                                placeholder="Ingresa tu API Secret"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className={`${styles.actionButton} w-full`}
                        >
                            {isSaving ? 'Guardando...' : 'Guardar Configuración'}
                        </button>
                    </form>
                </div>
            )}

            {activeTab === 'trading' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Balance Section */}
                    <div className={styles.sectionCard}>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className={styles.sectionTitle}>Mi Balance en {exchangeType.toUpperCase()}</h2>
                            <button onClick={fetchBalance} className="text-xs bg-white/10 px-2 py-1 rounded hover:bg-white/20">Refrescar</button>
                        </div>

                        {isLoadingBalance ? (
                            <div className="text-center py-8">Cargando balance...</div>
                        ) : balance ? (
                            <div className="space-y-4">
                                {/* Show Total USDT estimated if available or iterate non-zero balances */}
                                <div className="grid grid-cols-2 gap-4">
                                    {balance.total && Object.entries(balance.total).map(([asset, amount]) => {
                                        if (parseFloat(amount) > 0) {
                                            return (
                                                <div key={asset} className="bg-white/5 p-3 rounded-lg">
                                                    <span className="text-slate-400 text-xs font-bold block">{asset}</span>
                                                    <span className="text-white font-mono text-lg">{parseFloat(amount).toFixed(8)}</span>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })}
                                    {(!balance.total || Object.values(balance.total).every(v => parseFloat(v) === 0)) && (
                                        <p className="col-span-2 text-slate-500 text-center">No tienes saldo positivo.</p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-500">
                                Conecta tus claves API para ver tu balance.
                            </div>
                        )}
                    </div>

                    {/* simple Trade Form */}
                    <div className={styles.sectionCard}>
                        <h2 className={styles.sectionTitle}>Ejecutar Operación (Mercado)</h2>
                        <form onSubmit={handleTrade} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold mb-2 text-slate-300">Par (Symbol)</label>
                                <input
                                    type="text"
                                    value={tradeSymbol}
                                    onChange={e => setTradeSymbol(e.target.value.toUpperCase())}
                                    className={styles.inputField}
                                    placeholder="BTC/USDT"
                                />
                                <p className="text-xs text-slate-500 mt-1">Formato: BTC/USDT (Binance requiere symbols sin '/', ej: BTCUSDT para API, pero CCXT suele manejarlo)</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setTradeSide('buy')}
                                    className={`p-3 rounded-lg font-bold border ${tradeSide === 'buy' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'border-white/10 text-slate-400'}`}
                                >
                                    COMPRAR
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTradeSide('sell')}
                                    className={`p-3 rounded-lg font-bold border ${tradeSide === 'sell' ? 'bg-red-500/20 border-red-500 text-red-400' : 'border-white/10 text-slate-400'}`}
                                >
                                    VENDER
                                </button>
                            </div>

                            <div>
                                <label className="block text-sm font-bold mb-2 text-slate-300">Cantidad</label>
                                <input
                                    type="number"
                                    value={tradeAmount}
                                    onChange={e => setTradeAmount(e.target.value)}
                                    className={styles.inputField}
                                    placeholder="0.00"
                                    step="0.00000001"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isTrading}
                                className={`${styles.actionButton} w-full ${tradeSide === 'buy' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'}`}
                            >
                                {isTrading ? 'Procesando...' : `${tradeSide === 'buy' ? 'COMPRAR' : 'VENDER'} ${tradeSymbol}`}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExchangeContent;
