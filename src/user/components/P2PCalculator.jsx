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

    // Sincronización con Binance P2P (Proxy)
    const fetchP2PPrices = async () => {
        try {
            const assetsToFetch = ['USDT', 'BTC', 'ETH', 'SOL', 'XRP'];
            const response = await fetch('/.netlify/functions/getBinanceP2P', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assets: assetsToFetch, fiat: 'VES' })
            });

            if (!response.ok) throw new Error('P2P Fetch failed');
            const data = await response.json();

            if (data.prices) {
                setTokens(prevTokens => prevTokens.map(token => {
                    const symbolUpper = token.symbol.replace('USDT', '').toUpperCase() || 'USDT';
                    const p2pData = data.prices[symbolUpper];

                    if (p2pData) {
                        return { ...token, p2pPrice: p2pData.price, advertiser: p2pData.advertiser };
                    }

                    const usdtData = data.prices['USDT'];
                    if (usdtData && !['USDT', 'BTC', 'ETH', 'SOL', 'XRP'].includes(symbolUpper)) {
                        return { ...token, p2pPrice: usdtData.price * token.spotPrice, advertiser: 'Estimado (via USDT)' };
                    }

                    return token;
                }));
            }
        } catch (error) {
            console.error("Error al sincronizar con Binance P2P:", error);
        }
    };

    useEffect(() => {
        const syncAll = () => {
            fetchBinancePrices();
            fetchP2PPrices();
        };

        syncAll();
        const interval = setInterval(syncAll, 5000); // Frecuencia ultra-alta: 5 segundos
        return () => clearInterval(interval);
    }, []);

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


                    {/* Inputs de Precios P2P */}
                    <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar no-scrollbar">
                        <h3 className="text-[10px] font-black text-[#848e9c] uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                            <TrendingUp className="w-3 h-3 text-[#f0b90b]" /> Órdenes Reales Binance P2P
                            <span className="ml-auto text-[8px] bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded border border-green-500/20">SIN RESTRICCIONES</span>
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
                                        <span className="text-[9px] font-bold text-[#f0b90b] bg-[#f0b90b]/10 px-2 py-0.5 rounded border border-[#f0b90b]/20 flex items-center gap-1">
                                            <TrendingDown className="w-2.5 h-2.5" />
                                            {token.advertiser ? `ORDEN: ${token.advertiser}` : 'CAPTANDO ORDEN...'}
                                        </span>
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
            <div className="flex-1 flex flex-col gap-6">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 bg-[#f0b90b] rounded-full animate-pulse shadow-[0_0_8px_#f0b90b]"></div>
                            <span className="text-[10px] font-black text-[#f0b90b] uppercase tracking-[0.4em]">Algoritmo de Arbitraje</span>
                        </div>
                        <h1 className="text-4xl lg:text-5xl font-black text-white italic tracking-tighter uppercase leading-none">Ranking de <span className="text-[#f0b90b]">Eficiencia</span></h1>
                    </div>
                    <div className="bg-[#1e2329] border border-[#2b3139] rounded-2xl px-6 py-4 flex flex-col items-end shadow-xl">
                        <span className="text-[9px] font-black text-[#848e9c] uppercase tracking-widest mb-1">Mejor Tasa Implícita</span>
                        <span className="text-xl font-black text-[#f0b90b] italic">{bestOption?.implicitRate.toFixed(4)} <span className="text-[10px] not-italic text-[#848e9c]">VES/USD</span></span>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6 pb-12">
                    {ranking.map((token, index) => {
                        const isBest = token.id === bestOption.id;
                        return (
                            <div
                                key={token.id}
                                className={`group relative overflow-hidden rounded-[2.5rem] p-8 border transition-all duration-500 hover:scale-[1.02] active:scale-[0.98] ${isBest
                                    ? 'bg-[#1e2329] border-[#f0b90b] shadow-[0_30px_60px_-15px_rgba(240,185,11,0.15)] ring-1 ring-[#f0b90b]/50'
                                    : 'bg-[#1e2329] border-[#2b3139] hover:bg-[#2b3139]/50'
                                    }`}
                            >
                                {isBest && (
                                    <div className="absolute top-0 right-0">
                                        <div className="bg-[#f0b90b] text-[#0b0e11] px-6 py-2 rounded-bl-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-lg animate-fade-in flex items-center gap-2">
                                            <Trophy size={14} strokeWidth={3} /> MEJOR OPCIÓN
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-between items-start mb-10">
                                    <div className="flex items-center gap-5">
                                        <div
                                            className="w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-3xl shadow-2xl border transition-transform duration-700 group-hover:rotate-12"
                                            style={{
                                                backgroundColor: `${token.color}20`,
                                                borderColor: isBest ? '#f0b90b' : `${token.color}40`,
                                                color: token.color
                                            }}
                                        >
                                            {React.cloneElement(token.icon, { size: 32, strokeWidth: 2.5 })}
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black italic uppercase tracking-tighter leading-none group-hover:text-[#f0b90b] transition-colors">{token.name}</h3>
                                            <div className="flex flex-col gap-0.5 mt-1">
                                                <p className="text-[10px] font-bold text-[#848e9c] uppercase tracking-widest leading-tight">Binance {token.symbol}</p>
                                                {token.advertiser && (
                                                    <p className="text-[9px] font-black text-[#f0b90b]/80 uppercase tracking-tighter flex items-center gap-1">
                                                        <TrendingDown className="w-2 h-2" /> {token.advertiser}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[9px] font-black text-[#848e9c] uppercase tracking-widest mb-1 italic">Costo por 1$ USD</div>
                                        <div className={`text-2xl font-black italic underline decoration-[#f0b90b]/20 underline-offset-8 ${isBest ? 'text-[#f0b90b]' : 'text-white'}`}>
                                            {token.implicitRate.toFixed(4)}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="bg-[#0b0e11] rounded-3xl p-6 border border-[#2b3139] shadow-inner flex flex-col group-hover:bg-[#000000] transition-colors duration-500">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[10px] font-black text-[#848e9c] uppercase tracking-widest flex items-center gap-2">
                                                <ArrowRight className="w-3 h-3 text-[#f0b90b]" /> Precio de Referencia P2P
                                            </span>
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-3xl font-black text-white italic tracking-tighter">
                                                {token.p2pPrice.toLocaleString()}
                                            </span>
                                            <span className="text-sm font-black text-[#f0b90b] uppercase italic">BS / {token.name}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-2">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${isBest ? 'bg-[#00C087] animate-ping' : 'bg-[#1e2329]'}`}></div>
                                            <span className="text-[10px] font-bold text-[#848e9c] uppercase tracking-tighter">
                                                {isBest ? 'Posición Dominante' : `Variación: +${((token.implicitRate / bestOption.implicitRate - 1) * 100).toFixed(2)}%`}
                                            </span>
                                        </div>
                                        <div className="text-4xl font-black text-white/5 italic">
                                            #0{index + 1}
                                        </div>
                                    </div>
                                </div>

                                {/* Decorative Background Icon */}
                                <div className="absolute -bottom-6 -right-6 text-[#f0b90b]/5 transform -rotate-12 group-hover:rotate-0 transition-transform duration-700 pointer-events-none">
                                    {React.cloneElement(token.icon, { size: 120, strokeWidth: 1 })}
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
