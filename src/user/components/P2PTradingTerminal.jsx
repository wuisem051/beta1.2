import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    RefreshCw, Circle, TrendingUp, TrendingDown,
    ShieldCheck, Clock, Filter, ChevronDown, Activity
} from 'lucide-react';
import { db } from '../../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import P2PCandlestickChart from './P2PCandlestickChart';

/* ─── Payment method constants ─────────────────────── */
const PAY_METHODS = [
    { id: '', label: 'Todos' },
    { id: 'PagoMovil', label: 'Pago Móvil' },
    { id: 'Mercantil', label: 'Mercantil' },
    { id: 'Provincial', label: 'Provincial' },
    { id: 'Banesco', label: 'Banesco' },
    { id: 'BNC', label: 'BNC' },
];



/* ─── Method badge color map ────────────────────────── */
const METHOD_COLORS = {
    PagoMovil: { bg: '#10b98115', text: '#10b981', border: '#10b98130' },
    Mercantil: { bg: '#3b82f615', text: '#3b82f6', border: '#3b82f630' },
    Provincial: { bg: '#f59e0b15', text: '#f59e0b', border: '#f59e0b30' },
    Banesco: { bg: '#8b5cf615', text: '#8b5cf6', border: '#8b5cf630' },
    BNC: { bg: '#ef444415', text: '#ef4444', border: '#ef444430' },
};



/* ─── Main Component ─────────────────────────────────── */
const P2PTradingTerminal = () => {
    const [tab, setTab] = useState('BUY');          // BUY = quiero comprar USDT | SELL = quiero vender
    const [payFilter, setPayFilter] = useState('');  // Payment method filter
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(new Date());
    const intervalRef = useRef(null);

    /* ── Fetch P2P orders from backend ──────────────── */
    const fetchOrders = useCallback(async () => {
        try {
            const body = {
                asset: 'USDT',
                fiat: 'VES',
                rows: 20,
                tradeType: tab,
                payTypes: payFilter ? [payFilter] : []
            };
            const res = await fetch('/.netlify/functions/getBinanceOrderBook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            const list = tab === 'BUY' ? (data.buyOrders || []) : (data.sellOrders || []);
            setOrders(list);
            setLastUpdate(new Date());
        } catch (e) {
            console.error('P2P fetch error:', e);
        } finally {
            setIsLoading(false);
        }
    }, [tab, payFilter]);

    useEffect(() => {
        setIsLoading(true);
        setOrders([]);
        fetchOrders();
        clearInterval(intervalRef.current);
        intervalRef.current = setInterval(fetchOrders, 15000);
        return () => clearInterval(intervalRef.current);
    }, [fetchOrders]);

    /* ── Stats ───────────────────────────────────────── */
    const stats = useMemo(() => {
        if (!orders.length) return { best: 0, avg: 0, worst: 0 };
        const prices = orders.map(o => o.price);
        const best = tab === 'BUY' ? Math.min(...prices) : Math.max(...prices);
        const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
        const worst = tab === 'BUY' ? Math.max(...prices) : Math.min(...prices);
        return { best, avg, worst };
    }, [orders, tab]);

    /* ── Record current price to Firestore ────────────── */
    const recordPrice = async () => {
        if (!orders.length) return;
        const best = tab === 'BUY'
            ? Math.min(...orders.map(o => o.price))
            : Math.max(...orders.map(o => o.price));
        try {
            await addDoc(collection(db, 'p2p_price_trend'), {
                timestamp: serverTimestamp(),
                binance: best,
                bitunix: 0,
                bingx: 0
            });
        } catch (e) { console.error(e); }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0b0e11', color: '#eaecef', fontFamily: "'Inter', sans-serif", overflow: 'hidden' }}>

            {/* ── HEADER ─────────────────────────────────────── */}
            <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', background: '#1e2329', borderBottom: '1px solid #2b3139', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 18, fontWeight: 900, fontStyle: 'italic', color: '#f0b90b', letterSpacing: '-0.02em' }}>USDT</span>
                            <span style={{ color: '#848e9c', fontWeight: 700, fontSize: 14 }}>/</span>
                            <span style={{ fontSize: 18, fontWeight: 900, color: '#eaecef', letterSpacing: '-0.02em' }}>VES</span>
                        </div>
                        <div style={{ fontSize: 9, fontWeight: 800, color: '#848e9c', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 2 }}>
                            Binance P2P · Bolívares
                        </div>
                    </div>
                    {stats.best > 0 && (
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                            <span style={{ fontSize: 26, fontWeight: 900, fontStyle: 'italic', color: tab === 'BUY' ? '#10b981' : '#ef4444', letterSpacing: '-0.03em' }}>
                                Bs. {stats.best.toLocaleString('es-VE')}
                            </span>
                        </div>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button onClick={recordPrice} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#f0b90b15', border: '1px solid #f0b90b30', borderRadius: 8, color: '#f0b90b', fontSize: 10, fontWeight: 800, cursor: 'pointer', letterSpacing: '0.1em' }}>
                        <Activity size={12} /> Grabar Tendencia
                    </button>
                    <button onClick={() => { setIsLoading(true); fetchOrders(); }} style={{ padding: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: '#848e9c' }}>
                        <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} style={{ color: isLoading ? '#f0b90b' : undefined }} />
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Circle size={8} fill="#10b981" color="#10b981" style={{ animation: 'pulse 2s infinite' }} />
                        <span style={{ fontSize: 9, fontWeight: 800, color: '#10b981', letterSpacing: '0.15em', textTransform: 'uppercase' }}>En Vivo</span>
                    </div>
                    <span style={{ fontSize: 9, color: '#848e9c' }}>
                        <Clock size={10} style={{ display: 'inline', marginRight: 4 }} />
                        {lastUpdate.toLocaleTimeString('es-VE')}
                    </span>
                </div>
            </header>

            {/* ── MAIN CONTENT ──────────────────────────────── */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

                {/* ── LEFT: CHART + FILTERS + TABLE ─────────── */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                    {/* Candlestick Chart */}
                    <div style={{ height: 280, background: '#0b0e11', borderBottom: '1px solid #2b3139', flexShrink: 0 }}>
                        <P2PCandlestickChart currentPrice={stats.best} />
                    </div>


                    {/* ── FILTERS ───────────────────────────────── */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', background: '#1e2329', borderBottom: '1px solid #2b3139', flexShrink: 0 }}>
                        {/* BUY / SELL toggle */}
                        <div style={{ display: 'flex', background: '#0b0e11', borderRadius: 8, padding: 3, gap: 2 }}>
                            <button onClick={() => setTab('BUY')} style={{
                                padding: '6px 18px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 900, letterSpacing: '0.08em',
                                background: tab === 'BUY' ? '#10b981' : 'transparent',
                                color: tab === 'BUY' ? '#000' : '#848e9c'
                            }}>Comprar</button>
                            <button onClick={() => setTab('SELL')} style={{
                                padding: '6px 18px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 900, letterSpacing: '0.08em',
                                background: tab === 'SELL' ? '#ef4444' : 'transparent',
                                color: tab === 'SELL' ? '#fff' : '#848e9c'
                            }}>Vender</button>
                        </div>

                        {/* Asset label */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: '#0b0e11', borderRadius: 8, border: '1px solid #2b3139' }}>
                            <span style={{ fontSize: 11, fontWeight: 900, color: '#f0b90b' }}>USDT</span>
                            <span style={{ fontSize: 9, color: '#848e9c', fontWeight: 700 }}>4.09% APR</span>
                        </div>

                        {/* Fiat */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: '#0b0e11', borderRadius: 8, border: '1px solid #2b3139' }}>
                            <span style={{ fontSize: 11, fontWeight: 900, color: '#eaecef' }}>VES</span>
                            <ChevronDown size={12} color="#848e9c" />
                        </div>

                        {/* Payment methods */}
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {PAY_METHODS.map(pm => (
                                <button key={pm.id} onClick={() => setPayFilter(pm.id)} style={{
                                    padding: '5px 12px', borderRadius: 6, border: `1px solid ${payFilter === pm.id ? '#f0b90b50' : '#2b3139'}`,
                                    background: payFilter === pm.id ? '#f0b90b15' : 'transparent',
                                    color: payFilter === pm.id ? '#f0b90b' : '#848e9c',
                                    fontSize: 10, fontWeight: 800, cursor: 'pointer', letterSpacing: '0.05em'
                                }}>{pm.label}</button>
                            ))}
                        </div>

                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, color: '#848e9c', fontSize: 10 }}>
                            <Filter size={12} />
                            <span style={{ fontWeight: 700 }}>Más filtros</span>
                        </div>
                    </div>

                    {/* ── ORDER TABLE HEADER ────────────────────── */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.8fr 1fr 1fr', padding: '8px 20px', background: '#0b0e11', borderBottom: '1px solid #2b3139', flexShrink: 0 }}>
                        {['Anunciantes', 'Precio', 'Disponible / Límite de órdenes', 'Pago', ''].map((h, i) => (
                            <div key={i} style={{ fontSize: 10, fontWeight: 800, color: '#848e9c', letterSpacing: '0.08em', textAlign: i >= 3 ? 'center' : 'left', textTransform: 'uppercase' }}>{h}</div>
                        ))}
                    </div>

                    {/* ── ORDER ROWS ────────────────────────────── */}
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {isLoading ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 12 }}>
                                <RefreshCw size={24} style={{ color: '#f0b90b', animation: 'spin 1s linear infinite' }} />
                                <span style={{ fontSize: 11, fontWeight: 800, color: '#848e9c', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Cargando órdenes Binance P2P...</span>
                            </div>
                        ) : orders.length === 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 8 }}>
                                <span style={{ fontSize: 32 }}>📭</span>
                                <span style={{ fontSize: 11, fontWeight: 800, color: '#848e9c', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Sin órdenes disponibles</span>
                            </div>
                        ) : orders.map((order, i) => (
                            <div key={i} style={{
                                display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.8fr 1fr 1fr',
                                padding: '16px 20px', borderBottom: '1px solid #2b311930',
                                transition: 'background 0.15s', cursor: 'pointer',
                                background: i % 2 === 0 ? 'transparent' : '#ffffff04'
                            }}
                                onMouseEnter={e => e.currentTarget.style.background = '#f0b90b08'}
                                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : '#ffffff04'}
                            >
                                {/* Advertiser */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#f0b90b20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: '#f0b90b', flexShrink: 0 }}>
                                            {order.advertiser?.charAt(0)?.toUpperCase()}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 12, fontWeight: 800, color: '#eaecef' }}>{order.advertiser}</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                                                <span style={{ fontSize: 9, color: '#848e9c', fontWeight: 700 }}>{order.tradeCount} órdenes</span>
                                                <span style={{ fontSize: 9, color: order.finishRate >= 95 ? '#10b981' : '#f59e0b', fontWeight: 800 }}>
                                                    <ShieldCheck size={8} style={{ display: 'inline', marginRight: 2 }} />
                                                    {order.finishRate}% completado
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Price */}
                                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                    <span style={{ fontSize: 18, fontWeight: 900, fontStyle: 'italic', color: tab === 'BUY' ? '#10b981' : '#ef4444', letterSpacing: '-0.02em' }}>
                                        {order.price.toLocaleString('es-VE')}
                                    </span>
                                    <span style={{ fontSize: 9, color: '#848e9c', fontWeight: 700 }}>VES</span>
                                </div>

                                {/* Amount / Limits */}
                                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2 }}>
                                    <span style={{ fontSize: 11, fontWeight: 800, color: '#eaecef' }}>
                                        {order.amount.toLocaleString('es-VE', { maximumFractionDigits: 2 })} USDT
                                    </span>
                                    <span style={{ fontSize: 9, color: '#848e9c', fontWeight: 600 }}>
                                        {order.minAmount.toLocaleString('es-VE', { maximumFractionDigits: 0 })} – {order.maxAmount.toLocaleString('es-VE', { maximumFractionDigits: 0 })} VES
                                    </span>
                                </div>

                                {/* Payment methods */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                                    {(order.methods || []).slice(0, 3).map((m, mi) => {
                                        const c = METHOD_COLORS[m.id] || { bg: '#2b313915', text: '#848e9c', border: '#2b313950' };
                                        return (
                                            <span key={mi} style={{
                                                padding: '2px 7px', borderRadius: 4,
                                                background: c.bg, color: c.text, border: `1px solid ${c.border}`,
                                                fontSize: 8, fontWeight: 800, whiteSpace: 'nowrap', letterSpacing: '0.05em'
                                            }}>
                                                {m.name || m.id}
                                            </span>
                                        );
                                    })}
                                </div>

                                {/* Action button */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <button style={{
                                        padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                                        background: tab === 'BUY' ? '#10b981' : '#ef4444',
                                        color: tab === 'BUY' ? '#000' : '#fff',
                                        fontSize: 10, fontWeight: 900, letterSpacing: '0.06em',
                                        transition: 'opacity 0.15s'
                                    }}
                                        onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                                        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                                    >
                                        {tab === 'BUY' ? 'Comprar' : 'Vender'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── RIGHT: STATS PANEL ────────────────────────── */}
                <div style={{ width: 220, flexShrink: 0, background: '#161a1e', borderLeft: '1px solid #2b3139', display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {/* Header */}
                    <div style={{ padding: '14px 16px', background: '#1e2329', borderBottom: '1px solid #2b3139' }}>
                        <span style={{ fontSize: 10, fontWeight: 900, color: '#848e9c', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Estadísticas de Mercado</span>
                    </div>

                    {/* Stats Cards */}
                    {[
                        { label: tab === 'BUY' ? 'Mejor precio compra' : 'Mejor precio venta', value: stats.best, color: tab === 'BUY' ? '#10b981' : '#ef4444' },
                        { label: 'Precio promedio', value: stats.avg, color: '#f0b90b' },
                        { label: tab === 'BUY' ? 'Precio más alto (compra)' : 'Precio más bajo (venta)', value: stats.worst, color: '#848e9c' },
                    ].map((s, i) => (
                        <div key={i} style={{ padding: '14px 16px', borderBottom: '1px solid #2b313940' }}>
                            <div style={{ fontSize: 9, fontWeight: 800, color: '#4a5568', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>{s.label}</div>
                            <div style={{ fontSize: 16, fontWeight: 900, fontStyle: 'italic', color: s.color, letterSpacing: '-0.02em' }}>
                                {s.value > 0 ? `Bs. ${s.value.toLocaleString('es-VE', { maximumFractionDigits: 0 })}` : '—'}
                            </div>
                        </div>
                    ))}

                    {/* Total orders */}
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid #2b313940' }}>
                        <div style={{ fontSize: 9, fontWeight: 800, color: '#4a5568', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Órdenes activas</div>
                        <div style={{ fontSize: 22, fontWeight: 900, color: '#eaecef' }}>{orders.length}</div>
                    </div>

                    {/* Escrow badge */}
                    <div style={{ margin: 14, padding: '10px 12px', background: '#10b98108', border: '1px solid #10b98120', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ShieldCheck size={16} color="#10b981" />
                        <div>
                            <div style={{ fontSize: 9, fontWeight: 900, color: '#10b981', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Escrow Protegido</div>
                            <div style={{ fontSize: 8, color: '#4a5568', marginTop: 2 }}>Fondos en custodia Binance</div>
                        </div>
                    </div>


                </div>
            </div>
        </div>
    );
};

export default P2PTradingTerminal;
