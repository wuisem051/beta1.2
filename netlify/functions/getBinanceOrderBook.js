const axios = require('axios');

/**
 * Netlify Function: getBinanceOrderBook
 * Fetches the P2P order book from Binance for a specific asset and fiat.
 * Returns both BUY and SELL orders.
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
        const { asset = 'USDT', fiat = 'VES', rows = 30 } = JSON.parse(event.body || '{}');

        // Fetch BIDS (Ads where advertisers BUY, so taker SELLS) and ASKS (Ads where advertisers SELL, so taker BUYS)
        const [bidsResponse, asksResponse] = await Promise.all([
            fetchP2POrders(asset, fiat, 'SELL', rows), // Taker sells -> Advertiser buys (Bids)
            fetchP2POrders(asset, fiat, 'BUY', rows)   // Taker buys -> Advertiser sells (Asks)
        ]);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                asset,
                fiat,
                buyOrders: bidsResponse, // Bids
                sellOrders: asksResponse, // Asks
                timestamp: new Date().toISOString()
            })
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

async function fetchP2POrders(asset, fiat, tradeType, rows) {
    const payload = {
        asset: asset.toUpperCase(),
        fiat: fiat.toUpperCase(),
        tradeType: tradeType, // Directly use the passed tradeType
        page: 1,
        rows: rows,
        payTypes: [],
        publisherType: null,
        countries: [],
        additionalKycVerifyFilter: 0,
        filterType: "trading"
    };

    const binanceUrl = `https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search?t=${Date.now()}`;

    try {
        const response = await axios.post(binanceUrl, payload, {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Lang': 'es'
            },
            timeout: 8000
        });

        if (response.data && response.data.data) {
            return response.data.data.map(item => ({
                price: parseFloat(item.adv.price),
                amount: parseFloat(item.adv.surplusAmount),
                minAmount: parseFloat(item.adv.minSingleTransAmount),
                maxAmount: parseFloat(item.adv.maxSingleTransAmount),
                advertiser: item.advertiser.nickName,
                userGrade: item.advertiser.userGrade,
                tradeCount: item.advertiser.monthOrderCount,
                finishRate: item.advertiser.monthFinishRate * 100,
                methods: item.adv.tradeMethods.map(m => m.identifier)
            }));
        }
        return [];
    } catch (error) {
        console.error(`Error fetching ${tradeType} orders:`, error.message);
        return [];
    }
}
