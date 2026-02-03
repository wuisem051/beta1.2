import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FaLayerGroup, FaCalculator, FaChartLine, FaPercentage, FaDollarSign, FaArrowUp, FaArrowDown, FaTrash, FaPlus, FaSave, FaSync, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';

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

    // Niveles calculados
    const [levels, setLevels] = useState([]);
    const [sellLevels, setSellLevels] = useState([]);

    // Estados de UI
    const [isCalculating, setIsCalculating] = useState(false);
    const [isExecuting, setIsExecuting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Pares disponibles
    const availablePairs = [
        'BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT', 'XRP/USDT',
        'ADA/USDT', 'DOGE/USDT', 'MATIC/USDT', 'DOT/USDT', 'AVAX/USDT'
    ];

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
                body: JSON.stringify({ symbol, exchange })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.last) {
                    setCurrentPrice(parseFloat(data.last));
                }
            }
        } catch (err) {
            console.error('Error fetching price:', err);
        }
    };

    // Calcular niveles de compra escalonados
    const calculateBuyLevels = () => {
        if (!totalCapital || !currentPrice || numLevels < 1) return;

        setIsCalculating(true);
        const capital = parseFloat(totalCapital);
        const step = parseFloat(priceStep) / 100;
        const newLevels = [];

        // Distribución del capital
        let portions = [];
        if (distribution === 'equal') {
            // Distribución igual
            portions = Array(numLevels).fill(1 / numLevels);
        } else if (distribution === 'pyramid') {
            // Más capital en niveles inferiores (pirámide)
            const total = (numLevels * (numLevels + 1)) / 2;
            portions = Array.from({ length: numLevels }, (_, i) => (numLevels - i) / total);
        } else if (distribution === 'reverse-pyramid') {
            // Más capital en niveles superiores (pirámide invertida)
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

        // Auto-calcular niveles de venta
        calculateSellLevelsFromBuy(newLevels);

        setIsCalculating(false);
        setSuccess('Niveles calculados correctamente');
        setTimeout(() => setSuccess(''), 3000);
    };

    // Calcular niveles de venta basados en las compras
    // NUEVA LÓGICA: Cada porción de compra se mapea 1 a 1 con una porción de venta
    // Se mantiene la MISMA cantidad (quantity) que se compró en cada nivel
    const calculateSellLevelsFromBuy = (buyLevels) => {
        if (!buyLevels || buyLevels.length === 0) return;

        // Ordenamos las compras por precio (de menor a mayor) para asignarles ganancias
        // La compra más barata será la Nivel 1 de venta, etc.
        const sortedBuys = [...buyLevels].sort((a, b) => parseFloat(a.price) - parseFloat(b.price));

        const newSellLevels = [];
        const profitSteps = [1, 2, 3, 5, 8, 13]; // Escala de ganancias sugeridas

        sortedBuys.forEach((buyLevel, i) => {
            if (i >= profitSteps.length && i >= numLevels) return;

            const profit = profitSteps[i] || (profitSteps[profitSteps.length - 1] + (i * 2));
            const buyPrice = parseFloat(buyLevel.price);
            const qty = parseFloat(buyLevel.quantity);

            // Calculamos precio de venta basado en el precio de compra de ESTE nivel específico
            const sellPrice = buyPrice * (1 + profit / 100);
            const potentialProfit = (sellPrice - buyPrice) * qty;

            newSellLevels.push({
                level: i + 1,
                fromBuyLevel: buyLevel.level,
                price: sellPrice.toFixed(8),
                quantity: qty.toFixed(8), // MISMA cantidad que la compra
                profit: profit,
                potentialProfit: potentialProfit.toFixed(2),
                percentage: buyLevel.percentage, // Porcentaje relativo al total
                executed: false
            });
        });

        setSellLevels(newSellLevels);
    };

    // Calcular niveles de venta escalonados (estrategia de venta directa)
    const calculateSellLevels = () => {
        if (!totalCapital || !currentPrice || numLevels < 1) return;

        setIsCalculating(true);
        const [asset] = symbol.split('/');
        const availableAsset = balance?.total?.[asset] || 0;
        const quantity = parseFloat(totalCapital) || availableAsset;
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
            const sellPrice = currentPrice * (1 + step * (i + 1));
            const sellQuantity = quantity * portions[i];

            newSellLevels.push({
                level: i + 1,
                price: sellPrice.toFixed(8),
                quantity: sellQuantity.toFixed(8),
                profit: (step * (i + 1) * 100).toFixed(2),
                percentage: (portions[i] * 100).toFixed(2),
                executed: false
            });
        }

        setSellLevels(newSellLevels);
        setIsCalculating(false);
        setSuccess('Niveles de venta calculados');
        setTimeout(() => setSuccess(''), 3000);
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
            setSuccess(`Orden nivel ${level.level} ejecutada`);
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
        setSellLevels(newSellLevels);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600/10 to-blue-600/10 rounded-3xl p-8 border border-purple-500/20">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-xl">
                        <FaLayerGroup className="text-white text-2xl" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white uppercase italic tracking-tight">Trading Quirúrgico</h2>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Control Total sobre Niveles y Ejecución</p>
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
                <div className="bg-slate-900/40 rounded-3xl p-8 border border-white/5 space-y-6">
                    <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                        <FaCalculator className="text-blue-500" />
                        Configuración Base
                    </h3>

                    {/* Estrategia */}
                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Estrategia</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setStrategy('buy')}
                                className={`py-4 rounded-xl font-black uppercase text-xs transition-all ${strategy === 'buy'
                                    ? 'bg-emerald-500 text-black shadow-xl shadow-emerald-500/20'
                                    : 'bg-slate-950/60 text-slate-500 border border-white/5'
                                    }`}
                            >
                                <FaArrowDown className="inline mr-2" />
                                Compras
                            </button>
                            <button
                                type="button"
                                onClick={() => setStrategy('sell')}
                                className={`py-4 rounded-xl font-black uppercase text-xs transition-all ${strategy === 'sell'
                                    ? 'bg-rose-500 text-black shadow-xl shadow-rose-500/20'
                                    : 'bg-slate-950/60 text-slate-500 border border-white/5'
                                    }`}
                            >
                                <FaArrowUp className="inline mr-2" />
                                Ventas
                            </button>
                        </div>
                    </div>

                    {/* Par de Trading */}
                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Par de Trading</label>
                        <select
                            value={symbol}
                            onChange={(e) => setSymbol(e.target.value)}
                            className="w-full bg-slate-950/60 border border-white/5 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-blue-500"
                        >
                            {availablePairs.map(pair => (
                                <option key={pair} value={pair}>{pair}</option>
                            ))}
                        </select>
                        <div className="mt-2 flex items-center justify-between">
                            <span className="text-xs text-slate-600 font-bold">Precio Actual:</span>
                            <span className="text-sm text-white font-black">${currentPrice.toFixed(8)}</span>
                        </div>
                    </div>

                    {/* Capital Total */}
                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3">
                            {strategy === 'buy' ? 'Capital a Distribuir (USDT)' : 'Cantidad a Distribuir (Asset)'}
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                step="0.00000001"
                                value={totalCapital}
                                onChange={(e) => setTotalCapital(e.target.value)}
                                className="w-full bg-slate-950/60 border border-white/5 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-blue-500"
                                placeholder="100.00"
                            />
                            <FaDollarSign className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600" />
                        </div>
                    </div>

                    {/* Número de Niveles */}
                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3">
                            Niveles Sugeridos: {numLevels}
                        </label>
                        <input
                            type="range"
                            min="2"
                            max="10"
                            value={numLevels}
                            onChange={(e) => setNumLevels(parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-950/60 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                    </div>

                    {/* Paso de Precio */}
                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3">
                            Separación Base (%)
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                step="0.1"
                                value={priceStep}
                                onChange={(e) => setPriceStep(e.target.value)}
                                className="w-full bg-slate-950/60 border border-white/5 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-blue-500"
                                placeholder="1.0"
                            />
                            <FaPercentage className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600" />
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

                    {/* Botón Calcular */}
                    <button
                        onClick={strategy === 'buy' ? calculateBuyLevels : calculateSellLevels}
                        disabled={isCalculating}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl transition-all shadow-xl shadow-blue-600/20 uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                    >
                        <FaCalculator />
                        Calcular Sugerencia
                    </button>
                    <p className="text-[9px] text-slate-500 text-center font-bold uppercase tracking-widest">Luego podrás editar cada nivel manualmente</p>
                </div>

                {/* Panel de Vista Previa */}
                <div className="bg-slate-900/40 rounded-3xl p-8 border border-white/5">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                            <FaChartLine className="text-purple-500" />
                            Distribución
                        </h3>
                        <button
                            onClick={fetchCurrentPrice}
                            className="p-2 bg-slate-950/60 rounded-lg text-slate-400 hover:text-blue-400 transition-all"
                        >
                            <FaSync className="text-sm" />
                        </button>
                    </div>

                    {/* Indicador Visual */}
                    <div className="space-y-4">
                        {(strategy === 'buy' ? levels : sellLevels).map((level, idx) => (
                            <div key={idx} className="bg-slate-950/40 rounded-xl p-3 border border-white/5">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[10px] font-black text-slate-500 uppercase">Nivel {level.level}</span>
                                    <span className="text-[10px] font-black text-white">{level.percentage}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-500 ${strategy === 'buy' ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                        style={{ width: `${level.percentage}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tabla de Niveles de Compra */}
            {strategy === 'buy' && levels.length > 0 && (
                <div className="bg-slate-900/40 rounded-3xl p-8 border border-white/5">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter">Ajuste de Compras</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Edita los campos antes de ejecutar</p>
                        </div>
                        <button
                            onClick={executeAllOrders}
                            disabled={isExecuting}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-8 py-4 rounded-2xl transition-all shadow-xl shadow-emerald-600/20 uppercase tracking-[0.2em] text-[10px] flex items-center gap-3"
                        >
                            <FaCheckCircle />
                            Ejecutar Todas
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">
                                    <th className="px-4 py-4 text-left">Nivel</th>
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
                                            ${level.capital}
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
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter">Ajuste de Ventas</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Define el precio exacto de salida para cada lote</p>
                        </div>
                        <button
                            onClick={executeAllOrders}
                            disabled={isExecuting}
                            className="bg-rose-600 hover:bg-rose-500 text-white font-black px-8 py-4 rounded-2xl transition-all shadow-xl shadow-rose-600/20 uppercase tracking-[0.2em] text-[10px] flex items-center gap-3"
                        >
                            <FaCheckCircle />
                            Ejecutar Todas
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">
                                    <th className="px-4 py-4 text-left">Lote</th>
                                    <th className="px-4 py-4 text-left">Precio de Venta</th>
                                    <th className="px-4 py-4 text-left">Cantidad (Exacta)</th>
                                    <th className="px-4 py-4 text-right">Ganancia Est.</th>
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
                                            <input
                                                type="number"
                                                value={level.price}
                                                onChange={(e) => handleSellLevelChange(idx, 'price', e.target.value)}
                                                className="bg-slate-950/60 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-xs w-32 focus:border-rose-500 outline-none"
                                            />
                                        </td>
                                        <td className="px-4 py-5">
                                            <input
                                                type="number"
                                                value={level.quantity}
                                                onChange={(e) => handleSellLevelChange(idx, 'quantity', e.target.value)}
                                                className="bg-slate-950/60 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-xs w-32 focus:border-rose-500 outline-none"
                                            />
                                        </td>
                                        <td className="px-4 py-5 text-right font-mono text-xs font-bold text-emerald-500">
                                            +${level.potentialProfit}
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
