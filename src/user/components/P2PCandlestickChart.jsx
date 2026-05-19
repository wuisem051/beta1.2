import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, CrosshairMode, ColorType, CandlestickSeries, HistogramSeries } from 'lightweight-charts';
import { db } from '../../services/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';

const TIMEFRAME_CONFIG = {
    '15m': { minutes: 15, limit: 192, label: '15 Min' },
    '1H': { minutes: 60, limit: 168, label: '1 Hora' },
    '4H': { minutes: 240, limit: 180, label: '4 Horas' },
    '1D': { minutes: 1440, limit: 90, label: '1 Día' },
    'ALL': { minutes: 60, limit: 500, label: 'Todo' },
};

/**
 * Aggregates raw price points into OHLC candles grouped by `intervalMinutes`.
 */
function buildCandles(points, intervalMinutes) {
    if (!points.length) return [];
    const buckets = {};
    for (const p of points) {
        const bucketKey = Math.floor(p.ts.getTime() / (intervalMinutes * 60 * 1000));
        if (!buckets[bucketKey]) {
            buckets[bucketKey] = { time: bucketKey * intervalMinutes * 60, prices: [] };
        }
        buckets[bucketKey].prices.push(p.price);
    }
    return Object.values(buckets)
        .sort((a, b) => a.time - b.time)
        .map(b => {
            const [open, ...rest] = b.prices;
            const close = rest[rest.length - 1] ?? open;
            const high = Math.max(...b.prices);
            const low = Math.min(...b.prices);
            return { time: b.time, open, high, low, close };
        });
}

const P2PCandlestickChart = ({ currentPrice = 0 }) => {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);
    const candleSeries = useRef(null);
    const volumeSeries = useRef(null);
    const [tf, setTf] = useState('1H');
    const [stats, setStats] = useState({ open: 0, high: 0, low: 0, close: 0, change: 0, changePct: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [pointCount, setPointCount] = useState(0);
    const unsubRef = useRef(null);

    /* ── Fetch and plot candles ─────────────────────── */
    const loadChart = useCallback((timeframeKey) => {
        if (unsubRef.current) unsubRef.current();
        setIsLoading(true);
        const cfg = TIMEFRAME_CONFIG[timeframeKey];
        const q = query(
            collection(db, 'p2p_price_trend'),
            orderBy('timestamp', 'desc'),
            limit(cfg.limit)
        );
        unsubRef.current = onSnapshot(q, (snap) => {
            const raw = snap.docs
                .map(d => {
                    const ts = d.data().timestamp?.toDate?.() || new Date();
                    return { ts, price: d.data().binance || 0 };
                })
                .filter(r => r.price > 0)
                .reverse();

            setPointCount(raw.length);
            const candles = buildCandles(raw, cfg.minutes);

            if (candleSeries.current && candles.length) {
                candleSeries.current.setData(candles);
                // Fake volume derived from price variance per candle
                const volData = candles.map(c => ({
                    time: c.time,
                    value: Math.abs(c.close - c.open) * 100,
                    color: c.close >= c.open ? '#10b98140' : '#ef444440'
                }));
                volumeSeries?.current?.setData(volData);

                const last = candles[candles.length - 1];
                const first = candles[0];
                if (last) {
                    setStats({
                        open: first.open,
                        high: Math.max(...candles.map(c => c.high)),
                        low: Math.min(...candles.map(c => c.low)),
                        close: last.close,
                        change: last.close - first.open,
                        changePct: (((last.close - first.open) / first.open) * 100).toFixed(2)
                    });
                }
                chartInstance.current?.timeScale().fitContent();
            }
            setIsLoading(false);
        }, () => setIsLoading(false));
    }, []);

    /* ── Create chart on mount ──────────────────────── */
    useEffect(() => {
        if (!chartRef.current) return;
        const chart = createChart(chartRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: '#0b0e11' },
                textColor: '#848e9c',
                fontFamily: "'Inter', sans-serif",
                fontSize: 11,
            },
            grid: {
                vertLines: { color: '#2b313930' },
                horzLines: { color: '#2b313930' },
            },
            crosshair: {
                mode: CrosshairMode.Normal,
                vertLine: { color: '#f0b90b40', style: 1, width: 1 },
                horzLine: { color: '#f0b90b40', style: 1, width: 1 },
            },
            rightPriceScale: {
                borderColor: '#2b3139',
                textColor: '#848e9c',
                scaleMargins: { top: 0.1, bottom: 0.25 },
            },
            timeScale: {
                borderColor: '#2b3139',
                timeVisible: true,
                secondsVisible: false,
                fixLeftEdge: true,
            },
            handleScroll: true,
            handleScale: true,
        });

        // Candlestick series
        const cs = chart.addSeries(CandlestickSeries, {
            upColor: '#10b981',
            downColor: '#ef4444',
            borderUpColor: '#10b981',
            borderDownColor: '#ef4444',
            wickUpColor: '#10b981',
            wickDownColor: '#ef4444',
            priceFormat: { type: 'price', precision: 0, minMove: 1 },
        });

        // Volume series (histogram)
        const vs = chart.addSeries(HistogramSeries, {
            color: '#26a69a',
            priceFormat: { type: 'volume' },
            priceScaleId: 'volume',
            scaleMargins: { top: 0.8, bottom: 0 },
        });
        chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

        chartInstance.current = chart;
        candleSeries.current = cs;
        volumeSeries.current = vs;

        // Crosshair legend
        chart.subscribeCrosshairMove(param => {
            if (!param.time || !param.seriesData) return;
            const data = param.seriesData.get(cs);
            if (data) {
                setStats(prev => ({
                    ...prev,
                    close: data.close,
                    open: data.open,
                    high: data.high,
                    low: data.low,
                }));
            }
        });

        const handleResize = () => chart.applyOptions({ width: chartRef.current?.clientWidth, height: chartRef.current?.clientHeight });
        const ro = new ResizeObserver(handleResize);
        ro.observe(chartRef.current);

        loadChart('1H');

        return () => {
            if (unsubRef.current) unsubRef.current();
            ro.disconnect();
            chart.remove();
        };
    }, [loadChart]);

    /* ── Add live price as new point ──────────────────── */
    useEffect(() => {
        if (!currentPrice || !candleSeries.current) return;
        const now = Math.floor(Date.now() / 1000);
        candleSeries.current.update({ time: now, open: currentPrice, high: currentPrice, low: currentPrice, close: currentPrice });
    }, [currentPrice]);

    const handleTfChange = (key) => {
        setTf(key);
        loadChart(key);
    };

    const isPositive = stats.change >= 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0b0e11' }}>
            {/* Chart Top Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '8px 16px', background: '#161a1e', borderBottom: '1px solid #2b3139', flexShrink: 0, flexWrap: 'wrap' }}>
                {/* Legend */}
                <div style={{ display: 'flex', gap: 14, fontSize: 10, fontWeight: 800, letterSpacing: '0.05em' }}>
                    <span style={{ color: '#848e9c' }}>O <span style={{ color: '#eaecef' }}>{stats.open?.toLocaleString('es-VE') || '—'}</span></span>
                    <span style={{ color: '#848e9c' }}>H <span style={{ color: '#10b981' }}>{stats.high?.toLocaleString('es-VE') || '—'}</span></span>
                    <span style={{ color: '#848e9c' }}>L <span style={{ color: '#ef4444' }}>{stats.low?.toLocaleString('es-VE') || '—'}</span></span>
                    <span style={{ color: '#848e9c' }}>C <span style={{ color: '#eaecef' }}>{stats.close?.toLocaleString('es-VE') || '—'}</span></span>
                    {stats.change !== 0 && (
                        <span style={{ color: isPositive ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', gap: 3 }}>
                            {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                            {isPositive ? '+' : ''}{stats.changePct}%
                        </span>
                    )}
                </div>

                {/* Timeframe buttons */}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 3, background: '#0b0e11', padding: 3, borderRadius: 8 }}>
                    {Object.entries(TIMEFRAME_CONFIG).map(([key, val]) => (
                        <button key={key} onClick={() => handleTfChange(key)} style={{
                            padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                            fontSize: 9, fontWeight: 900, letterSpacing: '0.08em',
                            background: tf === key ? '#f0b90b' : 'transparent',
                            color: tf === key ? '#000' : '#848e9c',
                            transition: 'all 0.15s'
                        }}>{val.label}</button>
                    ))}
                </div>
            </div>

            {/* Chart Canvas */}
            <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
                {isLoading && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, zIndex: 10, background: '#0b0e1180' }}>
                        <RefreshCw size={20} style={{ color: '#f0b90b', animation: 'spin 1s linear infinite' }} />
                        <span style={{ fontSize: 10, fontWeight: 800, color: '#848e9c', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Cargando velas P2P...</span>
                    </div>
                )}
                {!isLoading && pointCount === 0 && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, zIndex: 10 }}>
                        <span style={{ fontSize: 36 }}>📊</span>
                        <span style={{ fontSize: 11, fontWeight: 900, color: '#848e9c', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Sin datos aún</span>
                        <span style={{ fontSize: 9, color: '#4a5568', textAlign: 'center', maxWidth: 220 }}>
                            Presiona <strong style={{ color: '#f0b90b' }}>"Grabar Tendencia"</strong> en la cabecera para iniciar el historial de precios. Las velas se generan automáticamente.
                        </span>
                    </div>
                )}
                <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
            </div>
        </div>
    );
};

export default P2PCandlestickChart;
