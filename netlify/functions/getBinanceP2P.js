const axios = require('axios');

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
        const { assets, fiat = 'VES' } = JSON.parse(event.body || '{}');

        if (!assets || !Array.isArray(assets)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Falta el parámetro assets (array).' })
            };
        }

        const results = {};

        // Fetch each asset P2P price
        for (const asset of assets) {
            try {
                const response = await axios.post('https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search', {
                    asset: asset.toUpperCase(),
                    fiat: fiat.toUpperCase(),
                    tradeType: 'BUY',
                    page: 1,
                    rows: 1,
                    payTypes: [],
                    publisherType: null
                });

                if (response.data && response.data.data && response.data.data.length > 0) {
                    const bestOffer = response.data.data[0];
                    results[asset] = {
                        price: parseFloat(bestOffer.adv.price),
                        advertiser: bestOffer.advertiser.nickName
                    };
                } else {
                    results[asset] = null;
                }
            } catch (err) {
                console.error(`Error fetching P2P for ${asset}:`, err.message);
                results[asset] = null;
            }
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                fiat,
                prices: results,
                timestamp: new Date().toISOString()
            })
        };

    } catch (error) {
        console.error('Binance P2P Proxy Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Error al obtener precios P2P.' })
        };
    }
};
