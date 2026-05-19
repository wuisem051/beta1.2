const axios = require('axios');

/**
 * Netlify Function: getBinanceOrderBook
 * Fetches the P2P order book from Binance for USDT/VES.
 * Supports payType filter (e.g. PagoMovil, Mercantil, Provincial, Banesco, BNC)
 */
exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    try {
        const {
            asset = 'USDT',
            fiat = 'VES',
            rows = 20,
            payTypes = [],
            tradeType = null
        } = JSON.parse(event.body || '{}');

        let buyOrders, sellOrders;

        if (tradeType === 'BUY') {
            buyOrders = await fetchP2POrders(asset, fiat, 'BUY', rows, payTypes);
            sellOrders = [];
        } else if (tradeType === 'SELL') {
            buyOrders = [];
            sellOrders = await fetchP2POrders(asset, fiat, 'SELL', rows, payTypes);
        } else {
            const [b, s] = await Promise.all([
                fetchP2POrders(asset, fiat, 'BUY', rows, payTypes),
                fetchP2POrders(asset, fiat, 'SELL', rows, payTypes)
            ]);
            buyOrders = b;
            sellOrders = s;
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ asset, fiat, buyOrders, sellOrders, timestamp: new Date().toISOString() })
        };

    } catch (error) {
        console.error('Binance P2P OrderBook Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Error fetching P2P order book.' })
        };
    }
};

async function fetchP2POrders(asset, fiat, tradeType, rows, payTypes = []) {
    const payload = {
        asset: asset.toUpperCase(),
        fiat: fiat.toUpperCase(),
        tradeType,
        page: 1,
        rows,
        payTypes: payTypes.length > 0 ? payTypes : [],
        publisherType: null,
        countries: [],
        additionalKycVerifyFilter: 0,
        filterType: 'all'
    };

    const binanceUrl = `https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search?t=${Date.now()}`;

    try {
        const response = await axios.post(binanceUrl, payload, {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': '*/*',
                'Accept-Language': 'es-VE,es;q=0.9,en;q=0.8',
                'Origin': 'https://c2c.binance.com',
                'Referer': 'https://c2c.binance.com/',
                'Lang': 'es'
            },
            timeout: 10000
        });

        if (response.data && response.data.data) {
            return response.data.data.map(item => ({
                price: parseFloat(item.adv.price),
                amount: parseFloat(item.adv.surplusAmount),
                minAmount: parseFloat(item.adv.minSingleTransAmount),
                maxAmount: parseFloat(item.adv.maxSingleTransAmount),
                fiatUnit: item.adv.fiatUnit || fiat,
                advertiser: item.advertiser.nickName,
                userGrade: item.advertiser.userGrade || 0,
                tradeCount: item.advertiser.monthOrderCount || 0,
                finishRate: Math.round((item.advertiser.monthFinishRate || 0) * 100),
                methods: (item.adv.tradeMethods || []).map(m => ({
                    id: m.identifier,
                    name: m.tradeMethodName || m.identifier
                })),
                advNo: item.adv.advNo
            }));
        }
        return [];
    } catch (error) {
        console.error(`Error fetching ${tradeType} P2P orders:`, error.message);
        return [];
    }
}
