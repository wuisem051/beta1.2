import React, { useState, useEffect, useMemo } from 'react';
import {
    DollarSign,
    Coins,
    Bitcoin,
    Zap,
    Sun,
    Globe,
    ShieldCheck,
    Trophy,
    Calculator,
    RefreshCw,
    TrendingDown,
    ArrowRight,
    TrendingUp,
    AlertCircle
} from 'lucide-react';

const P2PCalculator = () => {
    const [lastUpdate, setLastUpdate] = useState(new Date());
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncingP2P, setIsSyncingP2P] = useState(false);
    const [syncError, setSyncError] = useState(false);
    const [activeExchange, setActiveExchange] = useState('binance'); // binance, bingx, bitunix

    // Estado inicial de los tokens
    const [tokens, setTokens] = useState([
        { id: 'usdt', name: 'USDT', symbol: 'USDT', p2pPrice: 710.55, spotPrice: 1, color: '#26A17B', icon: <DollarSign /> },
        { id: 'usdc', name: 'USDC', symbol: 'USDCUSDT', p2pPrice: 709.48, spotPrice: 1, color: '#2775CA', icon: <Coins /> },
        { id: 'btc', name: 'BTC', symbol: 'BTCUSDT', p2pPrice: 55000000, spotPrice: 78000, color: '#F7931A', icon: <Bitcoin /> },
        { id: 'eth', name: 'ETH', symbol: 'ETHUSDT', p2pPrice: 2950000, spotPrice: 4200, color: '#627EEA', icon: <Zap /> },
        { id: 'xrp', name: 'XRP', symbol: 'XRPUSDT', p2pPrice: 1750.50, spotPrice: 2.50, color: '#23292F', icon: <TrendingDown /> },
        { id: 'sol', name: 'SOL', symbol: 'SOLUSDT', p2pPrice: 161000, spotPrice: 230, color: '#14F195', icon: <Sun /> },
        { id: 'wld', name: 'WLD', symbol: 'WLDUSDT', p2pPrice: 1470.40, spotPrice: 2.10, color: '#FFFFFF', icon: <Globe /> },
        { id: 'trump', name: 'TRUMP', symbol: 'TRUMPUSDT', p2pPrice: 1435.60, spotPrice: 2.05, color: '#E91E63', icon: <ShieldCheck /> },
    ]);

    // Sincronización con Binance API (Spot)
    const fetchBinancePrices = async () => {
        try {
            setIsLoading(true);
            const symbolList = tokens.filter(t => t.id !== 'usdt').map(t => t.symbol);
            const symbolsParam = JSON.stringify(symbolList);
            const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbols=${symbolsParam}`);

            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();

            setTokens(prevTokens => prevTokens.map(token => {
                if (token.id === 'usdt') return { ...token, spotPrice: 1 };
                const ticker = data.find(t => t.symbol === token.symbol);
                return ticker ? { ...token, spotPrice: parseFloat(ticker.price) } : token;
            }));

            setLastUpdate(new Date());
        } catch (error) {
            console.error("Error al sincronizar con Binance Spot:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Sincronización P2P Multi-Exchange
    const fetchP2PPrices = async () => {
        try {
            setIsSyncingP2P(true);
            setSyncError(false);

            let endpoint = '/.netlify/functions/getBinanceP2P';
            if (activeExchange === 'bitunix') endpoint = '/.netlify/functions/getBitunixP2P';
            if (activeExchange === 'bingx') endpoint = '/.netlify/functions/getBingXP2P';

            const assetsToFetch = ['USDT', 'USDC', 'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'DOGE', 'FDUSD'];
            const response = await fetch(endpoint + '?t=' + new Date().getTime(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assets: assetsToFetch,
                    fiat: 'VES',
                    exchange: activeExchange
                })
            });

            if (!response.ok) throw new Error('P2P Fetch failed');
            const data = await response.json();

            if (data.prices) {
                setTokens(prevTokens => prevTokens.map(token => {
                    const symbolUpper = token.symbol.replace('USDT', '').toUpperCase() || 'USDT';
                    const p2pData = data.prices[symbolUpper];

                    if (p2pData) {
                        return {
                            ...token,
                            p2pPrice: p2pData.price,
                            advertiser: p2pData.advertiser,
                            orderCount: p2pData.orderCount,
                            finishRate: p2pData.finishRate,
                            isMerchant: p2pData.isMerchant
                        };
                    }

                    const usdtData = data.prices['USDT'];
                    if (usdtData && !['USDT', 'USDC', 'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'DOGE', 'FDUSD'].includes(symbolUpper)) {
                        return { ...token, p2pPrice: usdtData.price * token.spotPrice, advertiser: `Estimado (${activeExchange})` };
                    }

                    return token;
                }));
            }
        } catch (error) {
            console.error(`Error al sincronizar con ${activeExchange}:`, error);
            setSyncError(true);
        } finally {
            setIsSyncingP2P(false);
        }
    };

    useEffect(() => {
        // Limpiar metadatos al cambiar de exchange para evitar confusión
        setTokens(prev => prev.map(t => ({
            ...t,
            p2pPrice: null,
            advertiser: null,
            orderCount: null,
            isMerchant: false
        })));

        const syncAll = () => {
            fetchBinancePrices();
            fetchP2PPrices();
        };

        syncAll();
        const interval = setInterval(syncAll, 5000);
        return () => clearInterval(interval);
    }, [activeExchange]);

    // Manejo de cambio en precio P2P
    const handleP2PChange = (id, value) => {
        const val = parseFloat(value) || 0;
        setTokens(prev => prev.map(t => t.id === id ? { ...t, p2pPrice: val } : t));
    };

    const ranking = useMemo(() => {
        return tokens.map(token => {
            const implicitRate = token.p2pPrice / token.spotPrice;
            return { ...token, implicitRate };
        }).sort((a, b) => a.implicitRate - b.implicitRate);
    }, [tokens]);

    const bestOption = ranking[0];

    return (
        <div className="flex flex-col lg:flex-row min-h-screen bg-[#0b0e11] text-[#eaecef] p-4 lg:p-8 gap-8 overflow-y-auto no-scrollbar selection:bg-[#f0b90b]/30">

            {/* Panel Izquierdo: Configuración e Inputs */}
            <div className="w-full lg:w-96 shrink-0 flex flex-col gap-6">
                <div className="bg-[#1e2329] rounded-[2rem] border border-[#2b3139] p-8 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#f0b90b]/5 rounded-bl-full -mr-10 -mt-10 group-hover:scale-110 transition-transform duration-700"></div>

                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-3 bg-[#f0b90b]/10 rounded-2xl">
                            <Calculator className="text-[#f0b90b] w-6 h-6" />
                        </div>
                        <h2 className="text-2xl font-black italic tracking-tighter uppercase">Parámetros</h2>
                    </div>

                    <div className="flex bg-[#0b0e11] p-1 rounded-2xl mb-8 border border-white/5">
                        {['binance', 'bingx', 'bitunix'].map(ex => (
                            <button
                                key={ex}
                                onClick={() => setActiveExchange(ex)}
                                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeExchange === ex ? 'bg-[#f0b90b] text-black shadow-lg shadow-[#f0b90b]/10' : 'text-slate-500 hover:text-[#eaecef]'}`}
                            >
                                {ex}
                            </button>
                        ))}
                    </div>

                    {/* Inputs de Precios P2P */}
                    <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar no-scrollbar">
                        <h3 className="text-[10px] font-black text-[#848e9c] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <TrendingUp className="w-3 h-3 text-[#f0b90b]" /> P2P {activeExchange.toUpperCase()}
                            <span className="ml-auto text-[8px] bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded border border-green-500/20 uppercase">SIN RESTRICCIONES</span>
                        </h3>
                        {tokens.map((token) => (
                            <div key={token.id} className="relative group/item">
                                <div className="bg-[#0b0e11] border border-[#2b3139] hover:border-[#f0b90b]/30 rounded-2xl p-4 transition-all duration-300">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-lg bg-[#1e2329] flex items-center justify-center border border-[#2b3139]" style={{ color: token.color }}>
                                                {React.cloneElement(token.icon, { size: 14, strokeWidth: 3 })}
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-[#848e9c]">{token.name}</span>
                                        </div>
                                        <div className="flex flex-col items-end gap-0.5">
                                            <span className={`text-[9px] font-bold ${token.isMerchant ? 'text-[#f0b90b] bg-[#f0b90b]/10' : 'text-[#848e9c] bg-[#848e9c]/10'} px-2 py-0.5 rounded border ${token.isMerchant ? 'border-[#f0b90b]/20' : 'border-[#848e9c]/20'} flex items-center gap-1`}>
                                                {token.isMerchant ? <ShieldCheck className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                                                {token.advertiser ? token.advertiser : 'CAPTANDO...'}
                                            </span>
                                            {token.orderCount && (
                                                <span className="text-[7px] font-black text-[#848e9c]/70 uppercase tracking-tighter">
                                                    {token.orderCount} ord. | {token.finishRate}%
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="relative group/input">
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={token.p2pPrice}
                                            onChange={(e) => handleP2PChange(token.id, e.target.value)}
                                            className="w-full bg-[#0b0e11] border border-[#2b3139] rounded-lg py-2 pl-4 pr-12 text-sm font-black text-[#f0b90b] outline-none focus:border-[#f0b90b] transition-all"
                                            placeholder="0.00"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#848e9c]">BS</span>
                                    </div>
                                    <div className="flex justify-between items-center mt-1.5 px-1 text-[10px]">
                                        <span className="text-[#848e9c] font-medium">Tasa Implícita:</span>
                                        <span className="text-[#f0b90b] font-black tracking-tighter">
                                            {(token.p2pPrice / token.spotPrice).toFixed(2)} BS/$
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 pt-6 border-t border-[#2b3139] flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#848e9c]">
                            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin text-[#f0b90b]' : ''}`} />
                            Sync: {lastUpdate.toLocaleTimeString()}
                        </div>
                    </div>
                </div>
            </div>

            {/* Panel Derecho: Ranking de Eficiencia */}
            <div className="flex-1 flex flex-col gap-4 overflow-y-auto no-scrollbar">
                <header className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-black text-[#848e9c] uppercase tracking-[0.3em]">Ranking de Eficiencia</h2>
                    <div className="flex items-center gap-2">
                        {isSyncingP2P ? (
                            <RefreshCw className="w-3 h-3 text-[#00C087] animate-spin" />
                        ) : (
                            <span className={`w-1.5 h-1.5 rounded-full ${syncError ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 'bg-[#00C087] shadow-[0_0_8px_#00C087]'}`}></span>
                        )}
                        <span className={`text-[9px] font-black uppercase tracking-widest ${syncError ? 'text-red-500' : 'text-[#848e9c]'}`}>
                            {isSyncingP2P ? 'Sincronizando' : syncError ? 'Error de Conexión' : 'Vivo'}
                        </span>
                    </div>
                </header>

                <div className="space-y-1.5 pb-12">
                    {ranking.map((token, index) => {
                        const isBest = index === 0;
                        const variation = ((token.implicitRate / bestOption.implicitRate - 1) * 100).toFixed(2);

                        return (
                            <div
                                key={token.id}
                                className={`flex items-center justify-between p-4 px-6 rounded-2xl border transition-all duration-300 ${isBest
                                    ? 'bg-[#1e2329] border-[#00C087]/30 shadow-[0_4px_20px_-5px_rgba(0,192,135,0.1)]'
                                    : 'bg-[#111418] border-[#2b3139]'
                                    }`}
                            >
                                {/* Izquierda: Posición e Info Moneda */}
                                <div className="flex items-center gap-6">
                                    <span className={`text-xl font-black italic w-6 ${isBest ? 'text-[#00C087]' : 'text-[#474d57]'}`}>
                                        #{index + 1}
                                    </span>

                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg font-black text-white italic tracking-tight uppercase leading-none">
                                                {token.name}
                                            </span>
                                            {isBest && (
                                                <span className="bg-[#00C087] text-[#0b0e11] text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                                    MEJOR PRECIO
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[10px] font-bold text-[#848e9c] uppercase tracking-widest leading-none mt-1.5">
                                            P2P: Bs. {token.p2pPrice.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                        </p>
                                    </div>
                                </div>

                                {/* Derecha: Tasa Implícita y Variación */}
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-[#848e9c] uppercase tracking-widest leading-none mb-1">Tasa Implícita</p>
                                    <div className={`text-xl font-black italic tracking-tight leading-none ${isBest ? 'text-[#00C087]' : 'text-white'}`}>
                                        Bs. {token.implicitRate.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                                    </div>
                                    <p className={`text-[10px] font-black uppercase tracking-tighter mt-1 leading-none ${isBest ? 'text-[#00C087]' : 'text-[#f0b90b]'}`}>
                                        {isBest ? 'Referencia' : `+${variation}% más caro`}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default P2PCalculator;
