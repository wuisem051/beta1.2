import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FaLayerGroup, FaCalculator, FaChartLine, FaPercentage, FaDollarSign, FaArrowUp, FaArrowDown, FaTrash, FaPlus, FaSave, FaSync, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { db } from '../../services/firebase';
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';

const ScalperTradingTool = ({ exchange, balance, onRefresh }) => {
    const { currentUser } = useAuth();

    // Estados principales
    const [symbol, setSymbol] = useState('BTC/USDT');
    const [currentPrice, setCurrentPrice] = useState(0);
    const [strategy, setStrategy] = useState('buy'); // 'buy' o 'sell'
    const [totalCapital, setTotalCapital] = useState('');
    const [numLevels, setNumLevels] = useState(5);
    const [priceStep, setPriceStep] = useState('1'); // Porcentaje entre niveles
    const [distribution, setDistribution] = useState('equal'); // 'equal', 'pyramid', 'reverse-pyramid'
    const [profitMode, setProfitMode] = useState('dynamic'); // 'dynamic' o 'fixed'
    const [priceSource, setPriceSource] = useState('exchange'); // 'exchange' o 'coinmarketcap'
    const [sellProfit, setSellProfit] = useState('7.5'); // Objetivo de ganancia fijo para ventas

    // Niveles calculados
    const [levels, setLevels] = useState([]);
    const [sellLevels, setSellLevels] = useState([]);

    // Estados de UI
    const [isCalculating, setIsCalculating] = useState(false);
    const [isExecuting, setIsExecuting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Pares disponibles
    const availablePairs = [
        'BTC/USDT', 'ETH/USDT', 'NAS100USD', 'BTC.D', 'BNB/USDT', 'SOL/USDT', 'XRP/USDT',
        'ADA/USDT', 'DOGE/USDT', 'MATIC/USDT', 'DOT/USDT', 'AVAX/USDT', 'ARPA/USDT'
    ];

    // Cargar configuración desde Firebase al iniciar
    useEffect(() => {
        const loadConfigFromDb = async () => {
            if (!currentUser) return;

            try {
                const docRef = doc(db, 'users', currentUser.uid, 'settings', 'scalper');
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const config = docSnap.data();
                    if (config.symbol) setSymbol(config.symbol);
                    if (config.strategy) setStrategy(config.strategy);
                    if (config.totalCapital) setTotalCapital(config.totalCapital);
                    if (config.numLevels) setNumLevels(config.numLevels);
                    if (config.priceStep) setPriceStep(config.priceStep);
                    if (config.distribution) setDistribution(config.distribution);
                    if (config.profitMode) setProfitMode(config.profitMode);
                    if (config.priceSource) setPriceSource(config.priceSource);
                    if (config.levels) setLevels(config.levels);
                    if (config.sellLevels) setSellLevels(config.sellLevels);
                    if (config.sellProfit) setSellProfit(config.sellProfit);
                }
            } catch (e) {
                console.error('Error al cargar config desde DB:', e);
            }
        };

        loadConfigFromDb();
    }, [currentUser]);

    // Función para guardar en Firebase
    const saveToDb = async (overrides = {}) => {
        if (!currentUser) return;
        setIsSaving(true);

        try {
            const configToSave = {
                symbol,
                strategy,
                totalCapital,
                numLevels,
                priceStep,
                distribution,
                profitMode,
                priceSource,
                levels,
                sellLevels,
                sellProfit,
                lastUpdated: new Date().toISOString(),
                ...overrides
            };

            const docRef = doc(db, 'users', currentUser.uid, 'settings', 'scalper');
            await setDoc(docRef, configToSave, { merge: true });
        } catch (e) {
            console.error('Error al guardar en DB:', e);
        } finally {
            setIsSaving(false);
        }
    };

    // Efecto para auto-guardado suave (debounce para no saturar DB)
    useEffect(() => {
        const timer = setTimeout(() => {
            if (levels.length > 0 || sellLevels.length > 0) {
                saveToDb();
            }
        }, 2000);

        return () => clearTimeout(timer);
    }, [symbol, strategy, totalCapital, numLevels, priceStep, distribution, profitMode, levels, sellLevels]);

    // Limpiar errores al cambiar de par o exchange
    useEffect(() => {
        setError('');
        setSuccess('');
    }, [exchange, symbol]);

    // Obtener precio actual
    useEffect(() => {
        fetchCurrentPrice();
        const interval = setInterval(fetchCurrentPrice, 10000); // Actualizar cada 10s
        return () => clearInterval(interval);
    }, [symbol, exchange]);

    const fetchCurrentPrice = async () => {
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
                    exchange: priceSource === 'coinmarketcap' ? 'coinmarketcap' : exchange
                })
            });

            const data = await response.json();

            if (response.ok) {
                if (data.last) {
                    setCurrentPrice(parseFloat(data.last));
                    setError('');
                }
            } else {
                // Si el error es de llaves API (como el 100413 de BingX) o bloqueo geográfico, lo silenciamos y buscamos alternativa
                const isApiKeyError = data.error?.includes('apiKey') || data.error?.includes('100413') || data.error?.includes('keys') || data.error?.includes('API');
                const isGeoBlock = data.error?.includes('Bloqueo Geográfico') || response.status === 451;

                if (isApiKeyError || isGeoBlock) {
                    console.log('Error de conexión detectado (API/Geo). Intentando fallback público...');

                    try {
                        const tickerSymbol = symbol.replace('/', '');
                        // Fallback universal a Binance Public API (no requiere llaves)
                        const fallbackUrl = `https://api.binance.com/api/v3/ticker/price?symbol=${tickerSymbol}`;
                        const res = await fetch(fallbackUrl);

                        if (res.ok) {
                            const fallbackData = await res.json();
                            if (fallbackData.price) {
                                setCurrentPrice(parseFloat(fallbackData.price));
                                setError(''); // Limpiamos el error porque el fallback funcionó
                                return;
                            }
                        }

                        // Si el primer fallback falló, intentamos uno secundario (ej. Crypto.com o solo silenciamos)
                        if (isApiKeyError) {
                            setError('Nota: Usando modo sugerencia (Exchange sin vincular)');
                        }
                    } catch (fallbackErr) {
                        console.error('Fallback failed:', fallbackErr);
                    }
                }

                // Solo mostramos el error si NO es problema de llaves (porque este modo es para sugerencias)
                if (!isApiKeyError) {
                    setError(data.error || 'Error al obtener precio');
                }
            }
        } catch (err) {
            console.error('Error fetching price:', err);
        }
    };

    // Calcular niveles de compra escalonados
    const calculateBuyLevels = () => {
        setError('');

        if (!totalCapital) {
            setError('Por favor indica el capital a distribuir');
            return;
        }
        if (!currentPrice || currentPrice === 0) {
            setError('Esperando precio del mercado... Intenta de nuevo en unos segundos');
            fetchCurrentPrice();
            return;
        }
        if (numLevels < 1) {
            setError('El número de lotes debe ser al menos 1');
            return;
        }

        setIsCalculating(true);
        const capital = parseFloat(totalCapital);
        const step = parseFloat(priceStep) / 100;
        const newLevels = [];

        // Distribución del capital
        let portions = [];
        if (distribution === 'equal') {
            portions = Array(numLevels).fill(1 / numLevels);
        } else if (distribution === 'pyramid') {
            const total = (numLevels * (numLevels + 1)) / 2;
            portions = Array.from({ length: numLevels }, (_, i) => (numLevels - i) / total);
        } else if (distribution === 'reverse-pyramid') {
            const total = (numLevels * (numLevels + 1)) / 2;
            portions = Array.from({ length: numLevels }, (_, i) => (i + 1) / total);
        }

        // Calcular cada nivel
        for (let i = 0; i < numLevels; i++) {
            const priceReduction = currentPrice * (1 - step * (i + 1));
            const capitalForLevel = capital * portions[i];
            const quantity = capitalForLevel / priceReduction;

            newLevels.push({
                level: i + 1,
                price: priceReduction.toFixed(8),
                quantity: quantity.toFixed(8),
                capital: capitalForLevel.toFixed(2),
                percentage: (portions[i] * 100).toFixed(2),
                executed: false
            });
        }

        setLevels(newLevels);
        calculateSellLevelsFromBuy(newLevels);

        setIsCalculating(false);
        setSuccess('Lotes de compra calculados correctamente');
        setTimeout(() => setSuccess(''), 3000);
    };

    // Calcular niveles de venta basados en las compras
    // NUEVA LÓGICA: Cada porción de compra se mapea 1 a 1 con una porción de venta
    // Se mantiene la MISMA cantidad (quantity) que se compró en cada nivel
    const calculateSellLevelsFromBuy = (buyLevels) => {
        if (!buyLevels || buyLevels.length === 0) return;

        // Mantenemos el orden original de los lotes 1 a 1 para que sea más intuitivo
        // Lote 1 de Compra -> Lote 1 de Venta, etc.
        const newSellLevels = [];
        const baseProfit = parseFloat(sellProfit) || 7.5; // Usamos el nuevo objetivo de ganancia por defecto
        const multipliers = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89]; // Escala Fibonacci

        buyLevels.forEach((buyLevel, i) => {
            const profitValue = profitMode === 'dynamic'
                ? baseProfit * multipliers[i]
                : baseProfit;

            const buyPrice = parseFloat(buyLevel.price);
            const qty = parseFloat(buyLevel.quantity);

            const sellPrice = buyPrice * (1 + profitValue / 100);
            const totalUSD = sellPrice * qty;
            const absoluteProfit = (sellPrice - buyPrice) * qty;

            newSellLevels.push({
                level: i + 1,
                fromBuyLevel: buyLevel.level,
                buyPrice: buyPrice,
                price: sellPrice.toFixed(8),
                quantity: qty.toFixed(8),
                profit: profitValue.toFixed(2),
                potentialProfit: absoluteProfit.toFixed(2),
                totalUSD: totalUSD.toFixed(2),
                percentage: buyLevel.percentage,
                executed: false
            });
        });

        setSellLevels(newSellLevels);
    };

    // Calcular niveles de venta escalonados (estrategia de venta directa)
    const calculateSellLevels = () => {
        setError('');

        if (!totalCapital) {
            setError('Por favor indica la cantidad a distribuir');
            return;
        }
        if (!currentPrice || currentPrice === 0) {
            setError('Esperando precio del mercado... Intenta de nuevo en unos segundos');
            fetchCurrentPrice();
            return;
        }
        if (numLevels < 1) {
            setError('El número de lotes debe ser al menos 1');
            return;
        }

        setIsCalculating(true);
        const [asset] = symbol.split('/');
        const availableAsset = balance?.total?.[asset] || 0;

        let quantityVal = parseFloat(totalCapital) || availableAsset;

        // HEURÍSTICA: Si el usuario coloca un número pequeño (ej. 80) y tiene un balance mayor de ese asset, 
        // probablemente se refiere a USD. 
        if (strategy === 'sell' && quantityVal < 1000 && currentPrice > 0) {
            // Si el valor ingresado es menor que el balance de ARPA pero tiene sentido como USD
            // O si queremos ser explícitos, podríamos preguntar. Pero aquí lo asumiremos si el valor es < 1000
            // y el precio actual hace que 80 USD sea un número coherente de tokens.
            quantityVal = quantityVal / currentPrice;
        }

        const quantity = quantityVal;
        const step = parseFloat(priceStep) / 100;
        const newSellLevels = [];

        // Distribución de la cantidad a vender
        let portions = [];
        if (distribution === 'equal') {
            portions = Array(numLevels).fill(1 / numLevels);
        } else if (distribution === 'pyramid') {
            const total = (numLevels * (numLevels + 1)) / 2;
            portions = Array.from({ length: numLevels }, (_, i) => (i + 1) / total);
        } else if (distribution === 'reverse-pyramid') {
            const total = (numLevels * (numLevels + 1)) / 2;
            portions = Array.from({ length: numLevels }, (_, i) => (numLevels - i) / total);
        }

        for (let i = 0; i < numLevels; i++) {
            // Si el modo es fijo, usamos el sellProfit para cada nivel
            // Si es dinámico, mantenemos la escalera incremental
            const currentStep = profitMode === 'fixed'
                ? (parseFloat(sellProfit) / 100)
                : (step * (i + 1));

            const sellPrice = currentPrice * (1 + currentStep);
            const sellQuantity = quantity * portions[i];
            const totalUSD = sellPrice * sellQuantity;
            const absoluteProfit = (sellPrice - currentPrice) * sellQuantity;

            newSellLevels.push({
                level: i + 1,
                price: sellPrice.toFixed(8),
                quantity: sellQuantity.toFixed(8),
                profit: (currentStep * 100).toFixed(2),
                potentialProfit: absoluteProfit.toFixed(2),
                totalUSD: totalUSD.toFixed(2),
                percentage: (portions[i] * 100).toFixed(2),
                executed: false
            });
        }

        setSellLevels(newSellLevels);
        setIsCalculating(false);
        setSuccess('Lotes de venta calculados correctamente');
        setTimeout(() => setSuccess(''), 3000);
    };

    // Registrar operación en el historial de Firebase para que aparezca en el Portafolio
    const recordTradeToHistory = async (level, side) => {
        if (!currentUser) return;

        try {
            const now = new Date();
            // Formato de fecha para que coincida con lo que espera TradingPortfolioContent
            const dateStr = now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            const tradeRecord = {
                userId: currentUser.uid,
                date: dateStr,
                pair: symbol,
                type: 'Spot Scalper',
                side: side === 'buy' ? 'Compra' : 'Venta',
                amount: level.quantity,
                price: level.price,
                result: 'Exitosa',
                profit: side === 'sell' ? (level.potentialProfit || "0.00") : "0.00",
                timestamp: serverTimestamp()
            };

            await addDoc(collection(db, 'tradingHistory'), tradeRecord);
            console.log("Operación registrada en el historial");
        } catch (err) {
            console.error("Error al registrar en el historial:", err);
        }
    };

    // Ejecutar todas las órdenes
    const executeAllOrders = async () => {
        setIsExecuting(true);
        setError('');

        try {
            const ordersToExecute = strategy === 'buy' ? levels : sellLevels;
            const idToken = await currentUser.getIdToken();

            for (const level of ordersToExecute) {
                if (level.executed) continue;

                const response = await fetch('/.netlify/functions/executeExchangeTrade', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${idToken}`
                    },
                    body: JSON.stringify({
                        symbol,
                        side: strategy,
                        amount: parseFloat(level.quantity),
                        type: 'limit',
                        price: parseFloat(level.price),
                        exchange
                    })
                });

                if (!response.ok) {
                    throw new Error(`Error en nivel ${level.level}`);
                }

                // Marcar como ejecutado
                level.executed = true;

                // Registrar en el historial para el Portafolio
                await recordTradeToHistory(level, strategy);

                // Pequeña pausa entre órdenes
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            setSuccess(`${ordersToExecute.length} órdenes ejecutadas correctamente`);
            if (onRefresh) onRefresh();

        } catch (err) {
            setError('Error al ejecutar órdenes: ' + err.message);
        } finally {
            setIsExecuting(false);
        }
    };

    // Ejecutar una orden individual
    const executeSingleOrder = async (level, side) => {
        try {
            const idToken = await currentUser.getIdToken();
            const response = await fetch('/.netlify/functions/executeExchangeTrade', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    symbol,
                    side,
                    amount: parseFloat(level.quantity),
                    type: 'limit',
                    price: parseFloat(level.price),
                    exchange
                })
            });

            if (!response.ok) {
                throw new Error('Error al ejecutar orden');
            }

            level.executed = true;

            // Registrar en el historial para el Portafolio
            await recordTradeToHistory(level, side);

            setSuccess(`Orden lote ${level.level} ejecutada`);
            setTimeout(() => setSuccess(''), 3000);

        } catch (err) {
            setError(`Error en nivel ${level.level}: ${err.message}`);
        }
    };

    // Manejar cambios manuales en los niveles de COMPRA
    const handleLevelChange = (index, field, value) => {
        const newLevels = [...levels];
        newLevels[index][field] = value;
        // Si cambia el precio o cantidad, recalculamos el capital de ese nivel
        if (field === 'price' || field === 'quantity') {
            newLevels[index].capital = (parseFloat(newLevels[index].price) * parseFloat(newLevels[index].quantity)).toFixed(2);
        }
        setLevels(newLevels);
    };

    // Manejar cambios manuales en los niveles de VENTA
    const handleSellLevelChange = (index, field, value) => {
        const newSellLevels = [...sellLevels];
        newSellLevels[index][field] = value;

        // Si cambia el precio o la cantidad, recalculamos el total USD y la ganancia
        if (field === 'price' || field === 'quantity') {
            const price = parseFloat(newSellLevels[index].price) || 0;
            const qty = parseFloat(newSellLevels[index].quantity) || 0;
            const buyPrice = currentPrice;

            newSellLevels[index].totalUSD = (price * qty).toFixed(2);
            newSellLevels[index].potentialProfit = ((price - buyPrice) * qty).toFixed(2);

            if (buyPrice > 0) {
                newSellLevels[index].profit = (((price / buyPrice) - 1) * 100).toFixed(2);
            }
        }
        setSellLevels(newSellLevels);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-[#1e2329] rounded-[2rem] p-8 border border-white/5 relative overflow-hidden group">
                {/* Decorative background glow */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#F3BA2F]/10 blur-[100px] pointer-events-none group-hover:bg-[#F3BA2F]/20 transition-all duration-1000"></div>

                <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-[#F3BA2F]/10 rounded-2xl flex items-center justify-center shadow-2xl border border-[#F3BA2F]/20">
                            <FaLayerGroup className="text-[#F3BA2F] text-2xl" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none">Trading Quirúrgico</h2>
                            <p className="text-[10px] text-[#848e9c] font-black uppercase tracking-[0.2em] mt-2 opacity-70">Arquitectura de Alta Precisión & Ejecución Flash</p>
                        </div>
                    </div>

                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${isSaving
                        ? 'border-sky-500/30 bg-sky-500/10 text-sky-400'
                        : 'border-[#F3BA2F]/30 bg-[#F3BA2F]/10 text-[#F3BA2F]'
                        }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${isSaving ? 'bg-sky-400 animate-pulse' : 'bg-[#F3BA2F]'}`} />
                        <span className="text-[10px] font-black uppercase tracking-widest">
                            {isSaving ? 'Cloud Core Saving...' : 'Terminal Sincronizada'}
                        </span>
                    </div>
                </div>

                {/* Mensajes */}
                {error && (
                    <div className="mt-4 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3">
                        <FaExclamationTriangle className="text-rose-500" />
                        <p className="text-rose-500 text-sm font-bold">{error}</p>
                    </div>
                )}
                {success && (
                    <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3">
                        <FaCheckCircle className="text-emerald-500" />
                        <p className="text-emerald-500 text-sm font-bold">{success}</p>
                    </div>
                )}
            </div>

            {/* Configuración */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Panel de Configuración */}
                <div className="bg-[#1e2329] rounded-[2rem] p-8 border border-white/5 space-y-8">
                    <h3 className="text-xs font-black text-[#848e9c] uppercase tracking-[0.2em] flex items-center gap-2">
                        <FaCalculator className="text-[#F3BA2F]" />
                        Parámetros de Inyección
                    </h3>

                    {/* Estrategia */}
                    <div>
                        <label className="block text-[10px] font-black text-[#848e9c] uppercase tracking-widest mb-4">Mecánica de Ejecución</label>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => setStrategy('buy')}
                                className={`py-5 rounded-2xl font-black uppercase text-[11px] transition-all italic tracking-widest ${strategy === 'buy'
                                    ? 'bg-[#00C087] text-black shadow-xl shadow-[#00C087]/20 scale-105'
                                    : 'bg-black/30 text-[#848e9c] border border-white/5 opacity-50 hover:opacity-100'
                                    }`}
                            >
                                <FaArrowDown className="inline mr-2" />
                                Comprar Lotes
                            </button>
                            <button
                                type="button"
                                onClick={() => setStrategy('sell')}
                                className={`py-5 rounded-2xl font-black uppercase text-[11px] transition-all italic tracking-widest ${strategy === 'sell'
                                    ? 'bg-red-500 text-black shadow-xl shadow-red-500/20 scale-105'
                                    : 'bg-black/30 text-[#848e9c] border border-white/5 opacity-50 hover:opacity-100'
                                    }`}
                            >
                                <FaArrowUp className="inline mr-2" />
                                Vender Lotes
                            </button>
                        </div>
                    </div>

                    {/* Par de Trading */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="block text-[10px] font-black text-[#848e9c] uppercase tracking-widest">Activo de Mercado</label>
                            <span className="text-[10px] font-black text-[#F3BA2F] italic">Live Core Data</span>
                        </div>
                        <select
                            value={symbol}
                            onChange={(e) => setSymbol(e.target.value)}
                            className="w-full bg-[#0b0e11] border border-white/5 rounded-2xl px-6 py-4 text-white font-black text-sm outline-none focus:border-[#F3BA2F]/40 transition-all appearance-none"
                        >
                            {availablePairs.map(pair => (
                                <option key={pair} value={pair}>{pair}</option>
                            ))}
                        </select>
                    </div>

                    {/* Fuente de Precio */}
                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Fuente de Precio</label>
                        <div className="flex bg-slate-950/60 p-1 rounded-xl border border-white/5">
                            <button
                                type="button"
                                onClick={() => setPriceSource('exchange')}
                                className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${priceSource === 'exchange' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}
                            >
                                Exchange
                            </button>
                            <button
                                type="button"
                                onClick={() => setPriceSource('coinmarketcap')}
                                className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${priceSource === 'coinmarketcap' ? 'bg-[#3861fb] text-white' : 'text-slate-500'}`}
                            >
                                CoinMarketCap
                            </button>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                            <span className="text-xs text-slate-600 font-bold">Referencia:</span>
                            <span className="text-sm text-white font-black">${currentPrice.toFixed(4)}</span>
                        </div>
                    </div>

                    {/* Capital Total */}
                    <div className="space-y-4">
                        <label className="block text-[10px] font-black text-[#848e9c] uppercase tracking-widest">
                            Distribución de Masa (Inyección)
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                step="any"
                                value={totalCapital}
                                onChange={(e) => setTotalCapital(e.target.value)}
                                className="w-full bg-[#0b0e11] border border-white/5 rounded-2xl px-6 py-5 text-white font-black outline-none focus:border-[#F3BA2F]/40 transition-all text-lg pr-20"
                                placeholder="0.00"
                            />
                            <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                <span className="text-[12px] text-[#F3BA2F] font-black uppercase italic">{strategy === 'buy' ? 'USDT' : symbol.split('/')[0]}</span>
                            </div>
                        </div>
                    </div>

                    {/* Número de Niveles */}
                    <div className="space-y-4">
                        <label className="block text-[10px] font-black text-[#848e9c] uppercase tracking-widest">
                            Lotes de Fragmentación: <span className="text-white ml-2">{numLevels}</span>
                        </label>
                        <input
                            type="range"
                            min="2"
                            max="10"
                            value={numLevels}
                            onChange={(e) => setNumLevels(parseInt(e.target.value))}
                            className="w-full h-1.5 bg-[#0b0e11] rounded-lg appearance-none cursor-pointer accent-[#F3BA2F]"
                        />
                    </div>

                    {/* Paso de Precio / Objetivo Ganancia */}
                    <div className="space-y-4">
                        <label className="block text-[10px] font-black text-[#848e9c] uppercase tracking-widest">
                            {strategy === 'buy' ? 'Delta de Separación (%)' : 'Umbral de Salida Real (%)'}
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                step="0.1"
                                value={strategy === 'buy' ? priceStep : sellProfit}
                                onChange={(e) => strategy === 'buy' ? setPriceStep(e.target.value) : setSellProfit(e.target.value)}
                                className="w-full bg-[#0b0e11] border border-white/5 rounded-2xl px-6 py-5 text-white font-black outline-none focus:border-[#F3BA2F]/40 transition-all text-lg"
                                placeholder="1.5"
                            />
                            <FaPercentage className="absolute right-6 top-1/2 -translate-y-1/2 text-[#F3BA2F] opacity-50" />
                        </div>
                    </div>

                    {/* Distribución */}
                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Distribución</label>
                        <select
                            value={distribution}
                            onChange={(e) => setDistribution(e.target.value)}
                            className="w-full bg-slate-950/60 border border-white/5 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-blue-500"
                        >
                            <option value="equal">Uniforme</option>
                            <option value="pyramid">Pirámide (DCA)</option>
                            <option value="reverse-pyramid">Pirámide Invertida</option>
                        </select>
                    </div>

                    {/* Modo de Ganancia */}
                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Modo de Ganancia (Ventas)</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setProfitMode('dynamic')}
                                className={`py-3 rounded-xl font-black uppercase text-[10px] transition-all ${profitMode === 'dynamic'
                                    ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                                    : 'bg-slate-950/60 text-slate-500 border border-white/5'
                                    }`}
                            >
                                Dinámica
                            </button>
                            <button
                                type="button"
                                onClick={() => setProfitMode('fixed')}
                                className={`py-3 rounded-xl font-black uppercase text-[10px] transition-all ${profitMode === 'fixed'
                                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                                    : 'bg-slate-950/60 text-slate-500 border border-white/5'
                                    }`}
                            >
                                Fija
                            </button>
                        </div>
                        <p className="mt-2 text-[9px] text-slate-600 font-bold uppercase tracking-widest">
                            {profitMode === 'dynamic' ? 'Escala Fibonacci (1, 2, 3, 5...)' : 'Mismo % para todos los lotes'}
                        </p>
                    </div>

                    {/* Botón Calcular */}
                    <button
                        onClick={strategy === 'buy' ? calculateBuyLevels : calculateSellLevels}
                        disabled={isCalculating}
                        className="w-full bg-[#F3BA2F] hover:scale-[1.02] active:scale-95 text-black font-black py-5 rounded-2xl transition-all shadow-2xl shadow-[#F3BA2F]/10 uppercase tracking-[0.2em] italic text-xs flex items-center justify-center gap-3"
                    >
                        {isCalculating ? <FaSync className="animate-spin" /> : <FaCalculator />}
                        Generar Matriz de Lotes
                    </button>
                    <p className="text-[10px] text-[#848e9c] text-center font-black uppercase tracking-[0.2em] italic opacity-50">Sugerencia algorítmica personalizable</p>
                </div>

                {/* Panel de Vista Previa */}
                <div className="bg-[#1e2329] rounded-[2rem] p-8 border border-white/5 flex flex-col relative overflow-hidden">
                    <div className="flex items-center justify-between mb-8 relative z-10">
                        <h3 className="text-xs font-black text-[#848e9c] uppercase tracking-[0.2em] flex items-center gap-2">
                            Visualizador de Carga
                        </h3>
                        <button
                            onClick={fetchCurrentPrice}
                            className="px-4 py-2 bg-black/40 rounded-xl text-[#F3BA2F] hover:bg-[#F3BA2F]/10 transition-all font-black text-[10px] uppercase border border-[#F3BA2F]/20"
                        >
                            Sync Market
                        </button>
                    </div>

                    {/* Indicador Visual */}
                    <div className="space-y-4 flex-1 relative z-10 custom-scrollbar overflow-y-auto max-h-[500px] pr-2">
                        {(strategy === 'buy' ? levels : sellLevels).length > 0 ? (
                            (strategy === 'buy' ? levels : sellLevels).map((level, idx) => (
                                <div key={idx} className="bg-[#0b0e11] rounded-2xl p-5 border border-white/5 hover:border-[#F3BA2F]/20 transition-all group">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-[#848e9c] uppercase tracking-[0.2em]">Lote {level.level}</span>
                                            <span className="text-[13px] font-black text-white italic mt-1">${parseFloat(level.price).toFixed(2)}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] font-black text-[#F3BA2F] uppercase tracking-widest">{parseFloat(level.percentage).toFixed(0)}% Masa</span>
                                            <p className="text-[11px] font-black text-[#848e9c] mt-1 italic">{parseFloat(level.quantity).toFixed(4)} Alt</p>
                                        </div>
                                    </div>
                                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-1000 shadow-[0_0_10px_rgba(0,0,0,0.5)] ${strategy === 'buy' ? 'bg-[#00C087]' : 'bg-red-500'}`}
                                            style={{ width: `${level.percentage}%` }}
                                        />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center p-12 text-center h-full border-2 border-dashed border-white/5 rounded-3xl opacity-20">
                                <FaChartLine className="text-4xl mb-6" />
                                <p className="text-[11px] font-black uppercase tracking-[0.3em]">Esperando Datos Nucleares</p>
                            </div>
                        )}
                    </div>

                    {/* Background decoration */}
                    <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-[#F3BA2F]/5 blur-[120px] pointer-events-none"></div>
                </div>
            </div>

            {/* Panel de Resumen General */}
            {(levels.length > 0 || sellLevels.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-[var(--bg-card)] p-6 rounded-[2rem] border border-white/5 shadow-xl">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Capital Total</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-white italic">
                                {((strategy === 'buy' ? levels : sellLevels).reduce((sum, l) => sum + parseFloat(l.capital || (parseFloat(l.price) * parseFloat(l.quantity))), 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className="text-[10px] font-bold text-slate-600 uppercase">USDT</span>
                        </div>
                    </div>
                    <div className="bg-[var(--bg-card)] p-6 rounded-[2rem] border border-white/5 shadow-xl">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Precio Promedio (DCA)</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-blue-500 italic">
                                {(
                                    (strategy === 'buy' ? levels : sellLevels).reduce((sum, l) => sum + parseFloat(l.capital || (parseFloat(l.price) * parseFloat(l.quantity))), 0) /
                                    (strategy === 'buy' ? levels : sellLevels).reduce((sum, l) => sum + parseFloat(l.quantity), 0)
                                ).toFixed(4)}
                            </span>
                            <span className="text-[10px] font-bold text-slate-600 uppercase">USDT</span>
                        </div>
                    </div>
                    <div className="bg-[var(--bg-card)] p-6 rounded-[2rem] border border-white/5 shadow-xl">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Volumen Total (Asset)</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-emerald-500 italic">
                                {(strategy === 'buy' ? levels : sellLevels).reduce((sum, l) => sum + parseFloat(l.quantity), 0).toFixed(4)}
                            </span>
                            <span className="text-[10px] font-bold text-slate-600 uppercase">{symbol.split('/')[0]}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Tabla de Niveles de Compra */}
            {strategy === 'buy' && levels.length > 0 && (
                <div className="bg-slate-900/40 rounded-3xl p-8 border border-white/5">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-8 gap-4">
                        <div>
                            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Terminal de Lotes: COMPRAS</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Ajuste manual de niveles de entrada</p>
                        </div>
                        <div className="flex gap-4">
                            <button
                                onClick={executeAllOrders}
                                disabled={isExecuting}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-8 py-4 rounded-2xl transition-all shadow-xl shadow-emerald-600/20 uppercase tracking-[0.2em] text-[10px] flex items-center gap-3 active:scale-95"
                            >
                                {isExecuting ? (
                                    <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <FaCheckCircle />
                                )}
                                Ejecutar Escalera completa
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">
                                    <th className="px-4 py-4 text-left">Lote</th>
                                    <th className="px-4 py-4 text-left">Precio de Compra</th>
                                    <th className="px-4 py-4 text-left">Cantidad (Asset)</th>
                                    <th className="px-4 py-4 text-right">Total USD</th>
                                    <th className="px-4 py-4 text-center">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {levels.map((level, idx) => (
                                    <tr key={idx} className={`hover:bg-white/[0.02] transition-colors ${level.executed ? 'opacity-40' : ''}`}>
                                        <td className="px-4 py-5">
                                            <span className="w-8 h-8 flex items-center justify-center bg-emerald-500/10 text-emerald-500 rounded-lg font-black text-xs">
                                                {level.level}
                                            </span>
                                        </td>
                                        <td className="px-4 py-5">
                                            <input
                                                type="number"
                                                value={level.price}
                                                onChange={(e) => handleLevelChange(idx, 'price', e.target.value)}
                                                className="bg-slate-950/60 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-xs w-32 focus:border-emerald-500 outline-none"
                                            />
                                        </td>
                                        <td className="px-4 py-5">
                                            <input
                                                type="number"
                                                value={level.quantity}
                                                onChange={(e) => handleLevelChange(idx, 'quantity', e.target.value)}
                                                className="bg-slate-950/60 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-xs w-32 focus:border-emerald-500 outline-none"
                                            />
                                        </td>
                                        <td className="px-4 py-5 text-right font-mono text-xs font-bold text-slate-400">
                                            ${parseFloat(level.capital).toFixed(4)}
                                        </td>
                                        <td className="px-4 py-5 text-center">
                                            {level.executed ? (
                                                <FaCheckCircle className="text-emerald-500 mx-auto" />
                                            ) : (
                                                <button
                                                    onClick={() => executeSingleOrder(level, 'buy')}
                                                    className="px-4 py-2 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-500 hover:text-white rounded-lg transition-all text-[10px] font-black uppercase tracking-widest"
                                                >
                                                    Ejecutar
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Tabla de Niveles de Venta */}
            {sellLevels.length > 0 && (
                <div className="bg-slate-900/40 rounded-3xl p-8 border border-white/5">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-8 gap-4">
                        <div>
                            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Terminal de Lotes: VENTAS</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Definición de salidas estratégicas</p>
                        </div>
                        <div className="flex gap-4">
                            <button
                                onClick={executeAllOrders}
                                disabled={isExecuting}
                                className="bg-rose-600 hover:bg-rose-500 text-white font-black px-8 py-4 rounded-2xl transition-all shadow-xl shadow-rose-600/20 uppercase tracking-[0.2em] text-[10px] flex items-center gap-3 active:scale-95"
                            >
                                {isExecuting ? (
                                    <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <FaCheckCircle />
                                )}
                                Ejecutar Escalera de Venta
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">
                                    <th className="px-4 py-4 text-left">Lote</th>
                                    <th className="px-4 py-4 text-left">Inversión &rarr; Venta</th>
                                    <th className="px-4 py-4 text-left">Asignación Asset</th>
                                    <th className="px-4 py-4 text-right">Resultado USD</th>
                                    <th className="px-4 py-4 text-center">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {sellLevels.map((level, idx) => (
                                    <tr key={idx} className={`hover:bg-white/[0.02] transition-colors ${level.executed ? 'opacity-40' : ''}`}>
                                        <td className="px-4 py-5">
                                            <span className="w-8 h-8 flex items-center justify-center bg-rose-500/10 text-rose-500 rounded-lg font-black text-xs">
                                                {level.level}
                                            </span>
                                        </td>
                                        <td className="px-4 py-5">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex items-center gap-1">
                                                    <span className="text-[9px] text-slate-500 font-bold uppercase">Entrada:</span>
                                                    <span className="text-[10px] text-slate-400 font-mono">${parseFloat(level.buyPrice || (parseFloat(level.price) / (1 + parseFloat(level.profit) / 100))).toFixed(6)}</span>
                                                </div>
                                                <input
                                                    type="number"
                                                    value={level.price}
                                                    onChange={(e) => handleSellLevelChange(idx, 'price', e.target.value)}
                                                    className="bg-slate-950/60 border border-white/10 rounded-lg px-2 py-2 text-white font-mono text-[11px] w-32 focus:border-rose-500 outline-none"
                                                />
                                            </div>
                                        </td>
                                        <td className="px-4 py-5">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex items-center gap-1">
                                                    <span className="text-[9px] text-slate-500 font-bold uppercase">Lote Compra:</span>
                                                    <span className="text-[10px] text-blue-400 font-black">#{level.fromBuyLevel || level.level}</span>
                                                </div>
                                                <input
                                                    type="number"
                                                    value={level.quantity}
                                                    onChange={(e) => handleSellLevelChange(idx, 'quantity', e.target.value)}
                                                    className="bg-slate-950/60 border border-white/10 rounded-lg px-2 py-2 text-white font-mono text-[11px] w-32 focus:border-rose-500 outline-none"
                                                />
                                            </div>
                                        </td>
                                        <td className="px-4 py-5 text-right font-mono text-emerald-500">
                                            <div className="flex flex-col items-end gap-1">
                                                <div className="bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                                                    <span className="text-sm font-black italic tracking-tighter">${parseFloat(level.totalUSD).toFixed(2)}</span>
                                                </div>
                                                <div className="flex gap-2 items-baseline">
                                                    <span className="text-[10px] text-slate-400 font-bold italic">Profit:</span>
                                                    <span className="text-xs font-black">+${parseFloat(level.potentialProfit).toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-5 text-center">
                                            {level.executed ? (
                                                <FaCheckCircle className="text-emerald-500 mx-auto" />
                                            ) : (
                                                <button
                                                    onClick={() => executeSingleOrder(level, 'sell')}
                                                    className="px-4 py-2 bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white rounded-lg transition-all text-[10px] font-black uppercase tracking-widest"
                                                >
                                                    Ejecutar
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ScalperTradingTool;
