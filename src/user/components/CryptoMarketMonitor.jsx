import React, { useState, useEffect } from 'react';
import { FaBitcoin, FaEthereum, FaChartLine, FaArrowUp, FaArrowDown, FaSync, FaStar, FaRegStar, FaSearch, FaBell, FaRegBell, FaExchangeAlt, FaTimes, FaFilter, FaSort, FaSortUp, FaSortDown, FaChartBar } from 'react-icons/fa';
import TradingViewWidget from './TradingViewWidget';

const CryptoMarketMonitor = () => {
    const [cryptos, setCryptos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [favorites, setFavorites] = useState([]);
    const [filter, setFilter] = useState('all'); // 'all', 'favorites', 'gainers', 'losers'
    const [searchTerm, setSearchTerm] = useState('');
    const [priceAlerts, setPriceAlerts] = useState([]);
    const [showAlertModal, setShowAlertModal] = useState(false);
    const [selectedCrypto, setSelectedCrypto] = useState(null);
    const [alertPrice, setAlertPrice] = useState('');
    const [alertType, setAlertType] = useState('above'); // 'above' or 'below'
    const [compareMode, setCompareMode] = useState(false);
    const [compareList, setCompareList] = useState([]);
    const [sortConfig, setSortConfig] = useState({ key: 'market_cap_rank', direction: 'asc' });
    const [showFilters, setShowFilters] = useState(false);
    const [showChartModal, setShowChartModal] = useState(false);
    const [chartCrypto, setChartCrypto] = useState(null);

    // Función para obtener datos de CoinGecko
    const fetchCryptoData = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(
                'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=true&price_change_percentage=1h,24h,7d'
            );

            if (!response.ok) {
                throw new Error('Error al obtener datos del mercado');
            }

            const data = await response.json();
            setCryptos(data);
            setLastUpdate(new Date());

            // Verificar alertas de precio
            checkPriceAlerts(data);
        } catch (err) {
            console.error('Error fetching crypto data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCryptoData();
        const interval = setInterval(fetchCryptoData, 60000);
        return () => clearInterval(interval);
    }, []);

    // Cargar favoritos y alertas del localStorage
    useEffect(() => {
        const savedFavorites = localStorage.getItem('cryptoFavorites');
        if (savedFavorites) {
            setFavorites(JSON.parse(savedFavorites));
        }

        const savedAlerts = localStorage.getItem('priceAlerts');
        if (savedAlerts) {
            setPriceAlerts(JSON.parse(savedAlerts));
        }
    }, []);

    const toggleFavorite = (coinId) => {
        const newFavorites = favorites.includes(coinId)
            ? favorites.filter(id => id !== coinId)
            : [...favorites, coinId];

        setFavorites(newFavorites);
        localStorage.setItem('cryptoFavorites', JSON.stringify(newFavorites));
    };

    const addPriceAlert = () => {
        if (!selectedCrypto || !alertPrice) return;

        const newAlert = {
            id: Date.now(),
            coinId: selectedCrypto.id,
            coinName: selectedCrypto.name,
            coinSymbol: selectedCrypto.symbol,
            targetPrice: parseFloat(alertPrice),
            currentPrice: selectedCrypto.current_price,
            type: alertType,
            triggered: false,
            createdAt: new Date().toISOString()
        };

        const updatedAlerts = [...priceAlerts, newAlert];
        setPriceAlerts(updatedAlerts);
        localStorage.setItem('priceAlerts', JSON.stringify(updatedAlerts));

        setShowAlertModal(false);
        setSelectedCrypto(null);
        setAlertPrice('');
    };

    const removeAlert = (alertId) => {
        const updatedAlerts = priceAlerts.filter(alert => alert.id !== alertId);
        setPriceAlerts(updatedAlerts);
        localStorage.setItem('priceAlerts', JSON.stringify(updatedAlerts));
    };

    const checkPriceAlerts = (cryptoData) => {
        const updatedAlerts = priceAlerts.map(alert => {
            const crypto = cryptoData.find(c => c.id === alert.coinId);
            if (!crypto) return alert;

            const shouldTrigger = alert.type === 'above'
                ? crypto.current_price >= alert.targetPrice
                : crypto.current_price <= alert.targetPrice;

            if (shouldTrigger && !alert.triggered) {
                // Mostrar notificación
                if (Notification.permission === 'granted') {
                    new Notification(`Alerta de Precio: ${alert.coinName}`, {
                        body: `${alert.coinSymbol.toUpperCase()} alcanzó $${crypto.current_price.toFixed(2)}`,
                        icon: crypto.image
                    });
                }
                return { ...alert, triggered: true };
            }

            return alert;
        });

        setPriceAlerts(updatedAlerts);
        localStorage.setItem('priceAlerts', JSON.stringify(updatedAlerts));
    };

    const toggleCompare = (crypto) => {
        if (compareList.find(c => c.id === crypto.id)) {
            setCompareList(compareList.filter(c => c.id !== crypto.id));
        } else if (compareList.length < 3) {
            setCompareList([...compareList, crypto]);
        }
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const formatNumber = (num) => {
        if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
        if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
        if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
        return `$${num?.toFixed(2) || '0.00'}`;
    };

    const formatPrice = (price) => {
        if (price >= 1) return `$${price.toFixed(2)}`;
        if (price >= 0.01) return `$${price.toFixed(4)}`;
        return `$${price.toFixed(8)}`;
    };

    const getChangeColor = (change) => {
        if (change > 0) return 'text-emerald-500';
        if (change < 0) return 'text-rose-500';
        return 'text-slate-500';
    };

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return <FaSort className="text-slate-600" />;
        return sortConfig.direction === 'asc'
            ? <FaSortUp className="text-[#fcd535]" />
            : <FaSortDown className="text-[#fcd535]" />;
    };

    // Filtrado y ordenamiento
    let filteredCryptos = cryptos;

    // Aplicar búsqueda
    if (searchTerm) {
        filteredCryptos = filteredCryptos.filter(crypto =>
            crypto.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            crypto.symbol.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }

    // Aplicar filtros
    switch (filter) {
        case 'favorites':
            filteredCryptos = filteredCryptos.filter(crypto => favorites.includes(crypto.id));
            break;
        case 'gainers':
            filteredCryptos = filteredCryptos.filter(crypto => crypto.price_change_percentage_24h > 0);
            break;
        case 'losers':
            filteredCryptos = filteredCryptos.filter(crypto => crypto.price_change_percentage_24h < 0);
            break;
        default:
            break;
    }

    // Aplicar ordenamiento
    filteredCryptos = [...filteredCryptos].sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        if (sortConfig.direction === 'asc') {
            return aValue > bValue ? 1 : -1;
        } else {
            return aValue < bValue ? 1 : -1;
        }
    });

    // Solicitar permiso para notificaciones
    useEffect(() => {
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    if (loading && cryptos.length === 0) {
        return (
            <div className="bg-[#1e2329] rounded-[40px] border border-white/5 shadow-2xl overflow-hidden mb-10">
                <div className="px-10 py-8 border-b border-white/5">
                    <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">Monitor de Mercados</h2>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-1">
                        Cotizaciones en tiempo real via CoinGecko API
                    </p>
                </div>
                <div className="px-10 py-20 text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#fcd535] border-t-transparent mb-4"></div>
                    <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest animate-pulse">
                        Sincronizando datos del mercado...
                    </p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-[#1e2329] rounded-[40px] border border-white/5 shadow-2xl overflow-hidden mb-10">
                <div className="px-10 py-8 border-b border-white/5">
                    <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">Monitor de Mercados</h2>
                </div>
                <div className="px-10 py-20 text-center">
                    <p className="text-rose-500 font-bold mb-4">Error: {error}</p>
                    <button
                        onClick={fetchCryptoData}
                        className="px-6 py-3 bg-[#fcd535] text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all"
                    >
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="bg-[#1e2329] rounded-[40px] border border-white/5 shadow-2xl overflow-hidden mb-10">
                {/* Header */}
                <div className="px-10 py-8 border-b border-white/5">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                        <div>
                            <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">Monitor de Mercados</h2>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-1">
                                Top 50 Criptomonedas • Actualizado: {lastUpdate?.toLocaleTimeString()}
                            </p>
                        </div>

                        {/* Search Bar */}
                        <div className="flex-1 max-w-md">
                            <div className="relative">
                                <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="Buscar criptomoneda..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-[#12161c] border border-white/5 rounded-xl pl-12 pr-4 py-3 text-white text-sm font-bold outline-none focus:border-[#fcd535]/30 transition-all"
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-white"
                                    >
                                        <FaTimes />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`p-3 rounded-xl transition-all ${showFilters ? 'bg-[#fcd535] text-black' : 'bg-[#12161c] text-[#fcd535] hover:bg-[#fcd535]/10'}`}
                                title="Filtros"
                            >
                                <FaFilter />
                            </button>
                            <button
                                onClick={() => setCompareMode(!compareMode)}
                                className={`p-3 rounded-xl transition-all ${compareMode ? 'bg-[#fcd535] text-black' : 'bg-[#12161c] text-[#fcd535] hover:bg-[#fcd535]/10'}`}
                                title="Modo Comparación"
                            >
                                <FaExchangeAlt />
                            </button>
                            <button
                                onClick={fetchCryptoData}
                                disabled={loading}
                                className="p-3 bg-[#12161c] text-[#fcd535] rounded-xl hover:bg-[#fcd535]/10 transition-all disabled:opacity-50"
                                title="Actualizar datos"
                            >
                                <FaSync className={loading ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>

                    {/* Filters Row */}
                    {showFilters && (
                        <div className="mt-6 flex flex-wrap gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                            <button
                                onClick={() => setFilter('all')}
                                className={`px-5 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${filter === 'all'
                                    ? 'bg-[#fcd535] text-black'
                                    : 'bg-[#12161c] text-slate-400 hover:text-white'
                                    }`}
                            >
                                Todos
                            </button>
                            <button
                                onClick={() => setFilter('favorites')}
                                className={`px-5 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${filter === 'favorites'
                                    ? 'bg-[#fcd535] text-black'
                                    : 'bg-[#12161c] text-slate-400 hover:text-white'
                                    }`}
                            >
                                ⭐ Favoritos ({favorites.length})
                            </button>
                            <button
                                onClick={() => setFilter('gainers')}
                                className={`px-5 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${filter === 'gainers'
                                    ? 'bg-emerald-500 text-black'
                                    : 'bg-[#12161c] text-slate-400 hover:text-white'
                                    }`}
                            >
                                📈 Ganadores 24h
                            </button>
                            <button
                                onClick={() => setFilter('losers')}
                                className={`px-5 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${filter === 'losers'
                                    ? 'bg-rose-500 text-black'
                                    : 'bg-[#12161c] text-slate-400 hover:text-white'
                                    }`}
                            >
                                📉 Perdedores 24h
                            </button>
                        </div>
                    )}

                    {/* Price Alerts Summary */}
                    {priceAlerts.filter(a => !a.triggered).length > 0 && (
                        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                            <div className="flex items-center gap-3">
                                <FaBell className="text-blue-400" />
                                <p className="text-xs font-bold text-blue-400">
                                    Tienes {priceAlerts.filter(a => !a.triggered).length} alerta(s) de precio activa(s)
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Comparison Mode Banner */}
                {compareMode && (
                    <div className="px-10 py-4 bg-[#fcd535]/10 border-b border-[#fcd535]/20">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <FaExchangeAlt className="text-[#fcd535]" />
                                <p className="text-xs font-bold text-[#fcd535]">
                                    Modo Comparación Activo - Selecciona hasta 3 criptomonedas ({compareList.length}/3)
                                </p>
                            </div>
                            {compareList.length > 0 && (
                                <button
                                    onClick={() => setCompareList([])}
                                    className="text-xs font-bold text-slate-400 hover:text-white transition-colors"
                                >
                                    Limpiar Selección
                                </button>
                            )}
                        </div>
                        {compareList.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                                {compareList.map(crypto => (
                                    <div key={crypto.id} className="flex items-center gap-2 bg-[#12161c] px-4 py-2 rounded-lg">
                                        <img src={crypto.image} alt={crypto.name} className="w-5 h-5 rounded-full" />
                                        <span className="text-xs font-bold text-white">{crypto.symbol.toUpperCase()}</span>
                                        <button
                                            onClick={() => toggleCompare(crypto)}
                                            className="text-slate-500 hover:text-rose-500 transition-colors"
                                        >
                                            <FaTimes size={10} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-[#12161c]">
                            <tr className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
                                <th className="px-6 py-5 text-center w-12">★</th>
                                <th className="px-4 py-5 text-center w-16 cursor-pointer hover:text-[#fcd535] transition-colors" onClick={() => handleSort('market_cap_rank')}>
                                    <div className="flex items-center justify-center gap-2">
                                        # {getSortIcon('market_cap_rank')}
                                    </div>
                                </th>
                                <th className="px-6 py-5 cursor-pointer hover:text-[#fcd535] transition-colors" onClick={() => handleSort('name')}>
                                    <div className="flex items-center gap-2">
                                        Activo {getSortIcon('name')}
                                    </div>
                                </th>
                                <th className="px-6 py-5 text-right cursor-pointer hover:text-[#fcd535] transition-colors" onClick={() => handleSort('current_price')}>
                                    <div className="flex items-center justify-end gap-2">
                                        Precio (USD) {getSortIcon('current_price')}
                                    </div>
                                </th>
                                <th className="px-6 py-5 text-right cursor-pointer hover:text-[#fcd535] transition-colors" onClick={() => handleSort('price_change_percentage_1h_in_currency')}>
                                    <div className="flex items-center justify-end gap-2">
                                        1h % {getSortIcon('price_change_percentage_1h_in_currency')}
                                    </div>
                                </th>
                                <th className="px-6 py-5 text-right cursor-pointer hover:text-[#fcd535] transition-colors" onClick={() => handleSort('price_change_percentage_24h')}>
                                    <div className="flex items-center justify-end gap-2">
                                        24h % {getSortIcon('price_change_percentage_24h')}
                                    </div>
                                </th>
                                <th className="px-6 py-5 text-right cursor-pointer hover:text-[#fcd535] transition-colors" onClick={() => handleSort('price_change_percentage_7d_in_currency')}>
                                    <div className="flex items-center justify-end gap-2">
                                        7d % {getSortIcon('price_change_percentage_7d_in_currency')}
                                    </div>
                                </th>
                                <th className="px-6 py-5 text-right cursor-pointer hover:text-[#fcd535] transition-colors" onClick={() => handleSort('market_cap')}>
                                    <div className="flex items-center justify-end gap-2">
                                        Cap. Mercado {getSortIcon('market_cap')}
                                    </div>
                                </th>
                                <th className="px-6 py-5 text-right cursor-pointer hover:text-[#fcd535] transition-colors" onClick={() => handleSort('total_volume')}>
                                    <div className="flex items-center justify-end gap-2">
                                        Volumen 24h {getSortIcon('total_volume')}
                                    </div>
                                </th>
                                <th className="px-6 py-5 text-right">Tendencia 7d</th>
                                <th className="px-6 py-5 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredCryptos.length === 0 ? (
                                <tr>
                                    <td colSpan="11" className="px-10 py-20 text-center text-slate-700 italic">
                                        {searchTerm
                                            ? `No se encontraron resultados para "${searchTerm}"`
                                            : filter === 'favorites'
                                                ? 'No tienes favoritos. Haz clic en la estrella para agregar.'
                                                : 'No hay datos disponibles'}
                                    </td>
                                </tr>
                            ) : (
                                filteredCryptos.map((crypto) => {
                                    const isComparing = compareList.find(c => c.id === crypto.id);
                                    const hasAlert = priceAlerts.some(a => a.coinId === crypto.id && !a.triggered);

                                    return (
                                        <tr
                                            key={crypto.id}
                                            className={`hover:bg-white/[0.02] transition-all cursor-pointer group ${isComparing ? 'bg-[#fcd535]/5' : ''}`}
                                        >
                                            <td className="px-6 py-6 text-center">
                                                <button
                                                    onClick={() => toggleFavorite(crypto.id)}
                                                    className="text-slate-600 hover:text-[#fcd535] transition-colors"
                                                >
                                                    {favorites.includes(crypto.id) ? (
                                                        <FaStar className="text-[#fcd535]" />
                                                    ) : (
                                                        <FaRegStar />
                                                    )}
                                                </button>
                                            </td>
                                            <td className="px-4 py-6 text-center">
                                                <span className="text-xs font-black text-slate-600">
                                                    {crypto.market_cap_rank}
                                                </span>
                                            </td>
                                            <td className="px-6 py-6">
                                                <div className="flex items-center gap-4">
                                                    <img
                                                        src={crypto.image}
                                                        alt={crypto.name}
                                                        className="w-8 h-8 rounded-full"
                                                    />
                                                    <div>
                                                        <p className="text-sm font-black text-white uppercase tracking-tight">
                                                            {crypto.symbol.toUpperCase()}
                                                        </p>
                                                        <p className="text-[9px] text-slate-600 font-bold">
                                                            {crypto.name}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-6 text-right font-mono text-sm font-black text-white">
                                                {formatPrice(crypto.current_price)}
                                            </td>
                                            <td className={`px-6 py-6 text-right text-xs font-black italic ${getChangeColor(crypto.price_change_percentage_1h_in_currency)}`}>
                                                {crypto.price_change_percentage_1h_in_currency ? (
                                                    <>
                                                        {crypto.price_change_percentage_1h_in_currency > 0 ? <FaArrowUp className="inline mr-1" /> : <FaArrowDown className="inline mr-1" />}
                                                        {Math.abs(crypto.price_change_percentage_1h_in_currency).toFixed(2)}%
                                                    </>
                                                ) : '-'}
                                            </td>
                                            <td className={`px-6 py-6 text-right text-xs font-black italic ${getChangeColor(crypto.price_change_percentage_24h)}`}>
                                                {crypto.price_change_percentage_24h > 0 ? <FaArrowUp className="inline mr-1" /> : <FaArrowDown className="inline mr-1" />}
                                                {Math.abs(crypto.price_change_percentage_24h).toFixed(2)}%
                                            </td>
                                            <td className={`px-6 py-6 text-right text-xs font-black italic ${getChangeColor(crypto.price_change_percentage_7d_in_currency)}`}>
                                                {crypto.price_change_percentage_7d_in_currency ? (
                                                    <>
                                                        {crypto.price_change_percentage_7d_in_currency > 0 ? <FaArrowUp className="inline mr-1" /> : <FaArrowDown className="inline mr-1" />}
                                                        {Math.abs(crypto.price_change_percentage_7d_in_currency).toFixed(2)}%
                                                    </>
                                                ) : '-'}
                                            </td>
                                            <td className="px-6 py-6 text-right text-xs font-bold text-slate-400">
                                                {formatNumber(crypto.market_cap)}
                                            </td>
                                            <td className="px-6 py-6 text-right text-xs font-bold text-slate-400">
                                                {formatNumber(crypto.total_volume)}
                                            </td>
                                            <td className="px-6 py-6 text-right">
                                                <div className="w-24 h-10 ml-auto flex items-center justify-end overflow-hidden opacity-30 group-hover:opacity-100 transition-opacity">
                                                    {crypto.sparkline_in_7d?.price && (
                                                        <svg className="w-full h-full" viewBox="0 0 100 40">
                                                            <path
                                                                d={crypto.sparkline_in_7d.price.reduce((path, price, i, arr) => {
                                                                    const x = (i / (arr.length - 1)) * 100;
                                                                    const min = Math.min(...arr);
                                                                    const max = Math.max(...arr);
                                                                    const range = max - min;
                                                                    const y = range === 0 ? 20 : 35 - ((price - min) / range) * 30;
                                                                    return path + (i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`);
                                                                }, '')}
                                                                fill="none"
                                                                stroke={crypto.price_change_percentage_7d_in_currency >= 0 ? '#10b981' : '#ef4444'}
                                                                strokeWidth="2"
                                                            />
                                                        </svg>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-6 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    {compareMode && (
                                                        <button
                                                            onClick={() => toggleCompare(crypto)}
                                                            disabled={!isComparing && compareList.length >= 3}
                                                            className={`p-2 rounded-lg transition-all ${isComparing
                                                                ? 'bg-[#fcd535] text-black'
                                                                : 'bg-[#12161c] text-slate-400 hover:text-white disabled:opacity-30'
                                                                }`}
                                                            title={isComparing ? 'Quitar de comparación' : 'Agregar a comparación'}
                                                        >
                                                            <FaExchangeAlt size={12} />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => {
                                                            setSelectedCrypto(crypto);
                                                            setShowAlertModal(true);
                                                        }}
                                                        className={`p-2 rounded-lg transition-all ${hasAlert
                                                            ? 'bg-blue-500 text-white'
                                                            : 'bg-[#12161c] text-slate-400 hover:text-white'
                                                            }`}
                                                        title="Crear alerta de precio"
                                                    >
                                                        {hasAlert ? <FaBell size={12} /> : <FaRegBell size={12} />}
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setChartCrypto(crypto);
                                                            setShowChartModal(true);
                                                        }}
                                                        className="p-2 bg-[#12161c] text-slate-400 hover:text-white rounded-lg transition-all hover:bg-[#12161c] hover:scale-105"
                                                        title="Ver Gráfico Avanzado"
                                                    >
                                                        <FaChartBar size={12} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="px-10 py-6 border-t border-white/5 bg-[#12161c]/30">
                    <div className="flex justify-between items-center">
                        <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest">
                            Mostrando {filteredCryptos.length} de {cryptos.length} criptomonedas
                        </p>
                        <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest">
                            Datos proporcionados por CoinGecko API
                        </p>
                    </div>
                </div>
            </div>

            {/* Comparison Panel */}
            {compareMode && compareList.length > 1 && (
                <div className="bg-[#1e2329] rounded-[40px] border border-white/5 shadow-2xl overflow-hidden mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="px-10 py-8 border-b border-white/5">
                        <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Comparación de Criptomonedas</h3>
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-1">
                            Análisis comparativo de {compareList.length} activos seleccionados
                        </p>
                    </div>
                    <div className="p-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {compareList.map(crypto => (
                                <div key={crypto.id} className="bg-[#12161c] rounded-2xl p-6 border border-white/5">
                                    <div className="flex items-center gap-4 mb-6">
                                        <img src={crypto.image} alt={crypto.name} className="w-12 h-12 rounded-full" />
                                        <div>
                                            <h4 className="text-lg font-black text-white uppercase">{crypto.symbol.toUpperCase()}</h4>
                                            <p className="text-xs text-slate-500 font-bold">{crypto.name}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mb-1">Precio Actual</p>
                                            <p className="text-2xl font-black text-white">{formatPrice(crypto.current_price)}</p>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mb-1">1h</p>
                                                <p className={`text-sm font-black ${getChangeColor(crypto.price_change_percentage_1h_in_currency)}`}>
                                                    {crypto.price_change_percentage_1h_in_currency?.toFixed(2) || '-'}%
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mb-1">24h</p>
                                                <p className={`text-sm font-black ${getChangeColor(crypto.price_change_percentage_24h)}`}>
                                                    {crypto.price_change_percentage_24h?.toFixed(2)}%
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mb-1">7d</p>
                                                <p className={`text-sm font-black ${getChangeColor(crypto.price_change_percentage_7d_in_currency)}`}>
                                                    {crypto.price_change_percentage_7d_in_currency?.toFixed(2) || '-'}%
                                                </p>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mb-1">Cap. Mercado</p>
                                            <p className="text-sm font-bold text-slate-400">{formatNumber(crypto.market_cap)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mb-1">Volumen 24h</p>
                                            <p className="text-sm font-bold text-slate-400">{formatNumber(crypto.total_volume)}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Price Alert Modal */}
            {showAlertModal && selectedCrypto && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
                    <div className="bg-[#1e2329] rounded-[40px] border border-white/5 max-w-md w-full p-8 animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Crear Alerta de Precio</h3>
                            <button
                                onClick={() => {
                                    setShowAlertModal(false);
                                    setSelectedCrypto(null);
                                    setAlertPrice('');
                                }}
                                className="text-slate-500 hover:text-white transition-colors"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <div className="flex items-center gap-4 mb-6 p-4 bg-[#12161c] rounded-xl">
                            <img src={selectedCrypto.image} alt={selectedCrypto.name} className="w-10 h-10 rounded-full" />
                            <div>
                                <p className="text-sm font-black text-white uppercase">{selectedCrypto.symbol.toUpperCase()}</p>
                                <p className="text-xs text-slate-500 font-bold">{selectedCrypto.name}</p>
                            </div>
                            <div className="ml-auto text-right">
                                <p className="text-xs text-slate-500 font-bold">Precio Actual</p>
                                <p className="text-sm font-black text-white">{formatPrice(selectedCrypto.current_price)}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2">Tipo de Alerta</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setAlertType('above')}
                                        className={`py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${alertType === 'above'
                                            ? 'bg-emerald-500 text-black'
                                            : 'bg-[#12161c] text-slate-400 hover:text-white'
                                            }`}
                                    >
                                        Por Encima
                                    </button>
                                    <button
                                        onClick={() => setAlertType('below')}
                                        className={`py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${alertType === 'below'
                                            ? 'bg-rose-500 text-black'
                                            : 'bg-[#12161c] text-slate-400 hover:text-white'
                                            }`}
                                    >
                                        Por Debajo
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2">Precio Objetivo (USD)</label>
                                <input
                                    type="number"
                                    step="0.00000001"
                                    value={alertPrice}
                                    onChange={(e) => setAlertPrice(e.target.value)}
                                    placeholder="Ej: 50000.00"
                                    className="w-full bg-[#12161c] border border-white/5 rounded-xl px-4 py-3 text-white text-sm font-bold outline-none focus:border-[#fcd535]/30 transition-all"
                                />
                            </div>

                            <button
                                onClick={addPriceAlert}
                                disabled={!alertPrice}
                                className="w-full py-4 bg-[#fcd535] text-black rounded-xl font-black uppercase tracking-widest text-xs hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
                            >
                                Crear Alerta
                            </button>
                        </div>

                        {/* Active Alerts for this crypto */}
                        {priceAlerts.filter(a => a.coinId === selectedCrypto.id && !a.triggered).length > 0 && (
                            <div className="mt-6 pt-6 border-t border-white/5">
                                <p className="text-xs font-black text-slate-600 uppercase tracking-widest mb-3">Alertas Activas</p>
                                <div className="space-y-2">
                                    {priceAlerts.filter(a => a.coinId === selectedCrypto.id && !a.triggered).map(alert => (
                                        <div key={alert.id} className="flex items-center justify-between p-3 bg-[#12161c] rounded-lg">
                                            <div>
                                                <p className="text-xs font-bold text-white">
                                                    {alert.type === 'above' ? '📈' : '📉'} {formatPrice(alert.targetPrice)}
                                                </p>
                                                <p className="text-[9px] text-slate-500 font-bold">
                                                    {alert.type === 'above' ? 'Por encima' : 'Por debajo'}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => removeAlert(alert.id)}
                                                className="text-rose-500 hover:text-rose-400 transition-colors"
                                            >
                                                <FaTimes size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Chart Modal */}
            {showChartModal && chartCrypto && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
                    <div className="bg-[#1e2329] rounded-[30px] border border-white/5 w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 shadow-2xl">
                        {/* Modal Header */}
                        <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-[#12161c]">
                            <div className="flex items-center gap-4">
                                <img src={chartCrypto.image} alt={chartCrypto.name} className="w-10 h-10 rounded-full" />
                                <div>
                                    <h3 className="text-xl font-black text-white uppercase italic tracking-tighter flex items-center gap-2">
                                        {chartCrypto.name}
                                        <span className="text-slate-500 text-sm not-italic">({chartCrypto.symbol.toUpperCase()}/USDT)</span>
                                    </h3>
                                    <div className="flex items-center gap-4 mt-1">
                                        <p className="text-lg font-black text-[#fcd535]">{formatPrice(chartCrypto.current_price)}</p>
                                        <span className={`text-xs font-black ${getChangeColor(chartCrypto.price_change_percentage_24h)}`}>
                                            {chartCrypto.price_change_percentage_24h > 0 ? '+' : ''}{chartCrypto.price_change_percentage_24h.toFixed(2)}% (24h)
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowChartModal(false)}
                                className="p-2 rounded-full bg-[#1e2329] text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                            >
                                <FaTimes size={20} />
                            </button>
                        </div>

                        {/* Chart Container */}
                        <div className="flex-1 bg-[#12161c] relative">
                            <TradingViewWidget
                                symbol={`BINANCE:${chartCrypto.symbol.toUpperCase()}USDT`}
                                theme="dark"
                                interval="60"
                            />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default CryptoMarketMonitor;
