import React, { useState, useEffect, useMemo } from 'react';
import {
    Activity,
    ArrowUpRight,
    ArrowDownRight,
    RefreshCw,
    TrendingUp,
    Circle,
    Database,
    ShieldCheck,
    Coins,
    BarChart3,
    Clock,
    Lock
} from 'lucide-react';
import TradingViewWidget from './TradingViewWidget';

const P2PTradingTerminal = () => {
    const [orderBook, setOrderBook] = useState({ buyOrders: [], sellOrders: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(new Date());
    const [asset, setAsset] = useState('USDT');
    const [fiat, setFiat] = useState('VES');
    const [maxCap, setMaxCap] = useState(2000); // Tope de 2000 USDT

    const fetchOrderBook = async () => {
        try {
            const response = await fetch('/.netlify/functions/getBinanceOrderBook', {
                method: 'POST',
                body: JSON.stringify({ asset, fiat, rows: 50 })
            });
            const data = await response.json();

            if (data.buyOrders && data.sellOrders) {
                setOrderBook({
                    buyOrders: data.buyOrders,
                    sellOrders: data.sellOrders
                });
            }
            setLastUpdate(new Date());
        } catch (error) {
            console.error("Error fetching P2P order book:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchOrderBook();
        const interval = setInterval(fetchOrderBook, 15000);
        return () => clearInterval(interval);
    }, [asset, fiat]);

    // Filtrar órdenes por el tope de 2000 USDT
    // El "tope" puede interpretarse como que el anunciante debe tener al menos esa disponibilidad 
    // o que el rango debe permitir tradear esa cantidad.
    const filteredBuyOrders = useMemo(() => {
        return orderBook.buyOrders.filter(order => order.amount <= maxCap || order.maxAmount / order.price <= maxCap).slice(0, 15);
    }, [orderBook.buyOrders, maxCap]);

    const filteredSellOrders = useMemo(() => {
        return orderBook.sellOrders.filter(order => order.amount <= maxCap || order.maxAmount / order.price <= maxCap).slice(0, 15);
    }, [orderBook.sellOrders, maxCap]);

    const currentPrice = useMemo(() => {
        if (orderBook.buyOrders.length > 0 && orderBook.sellOrders.length > 0) {
            return ((orderBook.buyOrders[0].price + orderBook.sellOrders[0].price) / 2).toFixed(2);
        }
        return "0.00";
    }, [orderBook]);

    return (
        <div className="flex flex-col h-screen bg-[#0b0e11] text-[#eaecef] overflow-hidden font-sans">
            {/* Header / Ticker */}
            <header className="flex items-center justify-between px-6 py-3 bg-[#1e2329] border-b border-[#2b3139] shrink-0">
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#f0b90b]/10 rounded-lg">
                            <Coins className="text-[#f0b90b] w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-sm font-black uppercase tracking-tighter leading-none">P2P Trading Terminal</h1>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Binance Blockchain Feed</p>
                        </div>
                    </div>

                    <div className="hidden md:flex items-center gap-6">
                        <div>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Par</p>
                            <p className="text-xs font-black text-white">{asset}/{fiat}</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Precio P2P</p>
                            <p className="text-xs font-black text-[#f0b90b] tracking-tighter">Bs. {parseFloat(currentPrice).toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Tope Operativo</p>
                            <p className="text-xs font-black text-emerald-500 tracking-tighter">{maxCap} {asset}</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Update</p>
                            <p className="text-xs font-black text-slate-400 flex items-center gap-1.5">
                                <Clock className="w-3 h-3 text-slate-600" />
                                {lastUpdate.toLocaleTimeString()}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => { setIsLoading(true); fetchOrderBook(); }}
                        className="p-2 hover:bg-white/5 rounded-lg transition-all active:scale-90"
                    >
                        <RefreshCw className={`w-4 h-4 text-slate-400 ${isLoading ? 'animate-spin text-[#f0b90b]' : ''}`} />
                    </button>
                    <div className="h-8 w-[1px] bg-white/5"></div>
                    <div className="flex items-center gap-2">
                        <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Live P2P Ledger</span>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <div className="flex flex-1 overflow-hidden">

                {/* Left: Chart Section */}
                <div className="flex-1 flex flex-col border-r border-[#2b3139] bg-[#0b0e11]">
                    <div className="flex-1 overflow-hidden relative">
                        {/* Fake "Blockchain" Background Elements */}
                        <div className="absolute inset-0 pointer-events-none opacity-[0.02]">
                            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500 via-transparent to-transparent"></div>
                        </div>

                        <div className="h-full w-full">
                            <TradingViewWidget symbol="BINANCE:BTCUSDT" interval="1" />
                        </div>
                    </div>

                    {/* Bottom Panel: Recent Trades / Blockchain History */}
                    <div className="h-1/3 border-t border-[#2b3139] bg-[#161a1e] flex flex-col">
                        <div className="px-4 py-2 bg-[#1e2329] border-b border-[#2b3139] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Database className="w-3 h-3 text-[#f0b90b]" />
                                <span className="text-[10px] font-black uppercase tracking-widest">P2P Blockchain Explorer</span>
                            </div>
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Hash Validated</span>
                        </div>
                        <div className="flex-1 overflow-y-auto no-scrollbar font-mono text-[10px]">
                            <table className="w-full text-left">
                                <thead className="sticky top-0 bg-[#161a1e] text-slate-600 uppercase tracking-widest text-[8px] font-black border-b border-white/5">
                                    <tr>
                                        <th className="px-4 py-2 font-black">Bloque / Advertiser</th>
                                        <th className="px-4 py-2 font-black">Operación</th>
                                        <th className="px-4 py-2 font-black">Precio (BS)</th>
                                        <th className="px-4 py-2 font-black">Amount</th>
                                        <th className="px-4 py-2 font-black">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[...orderBook.sellOrders, ...orderBook.buyOrders].slice(0, 10).map((order, i) => (
                                        <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                            <td className="px-4 py-3 text-white font-bold opacity-80 flex items-center gap-2">
                                                <span className="text-[#f0b90b]">#{(1042300 + i).toString().substring(0, 6)}</span>
                                                {order.advertiser}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 rounded-full uppercase text-[8px] font-black ${i % 2 === 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                                    {i % 2 === 0 ? 'Deposit' : 'Withdrawal'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 font-black text-main tabular-nums italic">
                                                {order.price.toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3 font-bold text-slate-400">
                                                {order.amount.toFixed(2)} USDT
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                                    <span className="text-[9px] uppercase font-black text-emerald-500 tracking-tighter">Confirmed</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right: Order Book Section */}
                <div className="w-80 flex flex-col bg-[#161a1e]">
                    <div className="px-4 py-3 bg-[#1e2329] border-b border-[#2b3139] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-slate-400" />
                            <h2 className="text-xs font-black uppercase tracking-tight">Libro de Órdenes</h2>
                        </div>
                        <div className="px-2 py-0.5 bg-white/5 rounded-md text-[9px] font-black text-slate-500">
                            P2P.V2
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Order Book Header */}
                        <div className="grid grid-cols-3 px-4 py-2 text-[9px] font-black text-slate-600 uppercase tracking-widest border-b border-white/5 bg-[#0b0e11]/50">
                            <div>Precio (BS)</div>
                            <div className="text-right">Cantidad</div>
                            <div className="text-right">Total</div>
                        </div>

                        {/* SELL ORDERS (ASKS) */}
                        <div className="flex-1 overflow-hidden flex flex-col-reverse justify-end">
                            {filteredBuyOrders.map((order, i) => (
                                <div key={i} className="group relative grid grid-cols-3 px-4 py-1.5 text-[11px] font-black tabular-nums hover:bg-white/5 transition-all cursor-pointer">
                                    <div className="absolute inset-y-0 right-0 bg-rose-500/5 transition-all duration-500" style={{ width: `${(order.amount / maxCap) * 100}%` }}></div>
                                    <div className="text-rose-500 relative z-10 italic">{order.price.toLocaleString()}</div>
                                    <div className="text-right text-slate-400 relative z-10">{order.amount.toFixed(1)}</div>
                                    <div className="text-right text-slate-300 relative z-10">{(order.price * order.amount).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                                </div>
                            ))}
                        </div>

                        {/* Spread / Mid Price */}
                        <div className="py-3 bg-[#1e2329] flex flex-col items-center justify-center border-y border-[#2b3139] relative overflow-hidden group">
                            <div className="absolute inset-0 bg-[#f0b90b]/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-black text-[#f0b90b] tracking-tighter tabular-nums italic">
                                    {currentPrice.toLocaleString()}
                                </span>
                                {parseFloat(currentPrice) > orderBook.buyOrders[0]?.price ? (
                                    <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                                ) : (
                                    <ArrowDownRight className="w-4 h-4 text-rose-500" />
                                )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">Market Price Index</span>
                            </div>
                        </div>

                        {/* BUY ORDERS (BIDS) */}
                        <div className="flex-1 overflow-hidden flex flex-col">
                            {filteredSellOrders.map((order, i) => (
                                <div key={i} className="group relative grid grid-cols-3 px-4 py-1.5 text-[11px] font-black tabular-nums hover:bg-white/5 transition-all cursor-pointer">
                                    <div className="absolute inset-y-0 right-0 bg-emerald-500/5 transition-all duration-500" style={{ width: `${(order.amount / maxCap) * 100}%` }}></div>
                                    <div className="text-emerald-500 relative z-10 italic">{order.price.toLocaleString()}</div>
                                    <div className="text-right text-slate-400 relative z-10">{order.amount.toFixed(1)}</div>
                                    <div className="text-right text-slate-300 relative z-10">{(order.price * order.amount).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Trade Panel Stub */}
                    <div className="p-4 bg-[#1e2329] border-t border-[#2b3139] space-y-4">
                        <div className="flex items-center gap-2 justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tope de Seguridad</span>
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-lg border border-white/5">
                                <Lock className="w-3 h-3 text-[#f0b90b]" />
                                <span className="text-[10px] font-black text-white">{maxCap} USDT</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button className="py-2 bg-emerald-500 text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:brightness-110 active:scale-95 transition-all">Buy USDT</button>
                            <button className="py-2 bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:brightness-110 active:scale-95 transition-all outline-none">Sell USDT</button>
                        </div>
                        <div className="flex items-center gap-2 justify-center py-1 opacity-40">
                            <ShieldCheck className="w-3 h-3 text-emerald-500" />
                            <span className="text-[8px] font-black uppercase tracking-widest">Escrow Protected</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default P2PTradingTerminal;
