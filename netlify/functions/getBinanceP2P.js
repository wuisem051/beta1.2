const axios = require('axios');

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
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

        // Fetch all assets P2P prices IN PARALLEL for high frequency
        await Promise.all(assets.map(async (asset) => {
            const payload = {
                asset: asset.toUpperCase(),
                fiat: fiat.toUpperCase(),
                tradeType: "BUY",
                page: 1,
                rows: 20,
                payTypes: [],
                publisherType: null,
                countries: [],
                additionalKycVerifyFilter: 1
            };

            try {
                // Añadimos timestamp a la URL de Binance para evitar caché interna de sus servidores
                const binanceUrl = `https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search?t=${new Date().getTime()}&v=${Math.random()}`;

                const response = await axios.post(binanceUrl, payload, {
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                        'Accept': '*/*',
                        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
                        'Lang': 'es',
                        'Origin': 'https://p2p.binance.com',
                        'Referer': 'https://p2p.binance.com/es/trade/all-payments/USDT?fiat=VES',
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache'
                    },
                    timeout: 10000
                });

                if (response.data && response.data.data && response.data.data.length > 0) {
                    // Filtro de seguridad manual adicional
                    const validOffers = response.data.data.filter(offer =>
                        offer.adv.takerAdditionalKycRequired !== 1
                    );

                    if (validOffers.length > 0) {
                        const bestOffer = validOffers[0];
                        results[asset] = {
                            price: parseFloat(bestOffer.adv.price),
                            advertiser: bestOffer.advertiser.nickName
                        };
                    } else {
                        results[asset] = null;
                    }
                } else {
                    results[asset] = null;
                }
            } catch (error) {
                console.error(`Error para ${asset}:`, error.message);
                results[asset] = null;
            }
        }));

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
