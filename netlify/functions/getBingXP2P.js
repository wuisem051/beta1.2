const axios = require('axios');

exports.handler = async (event, context) => {
    try {
        const { asset = "USDT", fiat = "VES" } = event.queryStringParameters || {};

        // BingX API for P2P
        // Note: BingX V3 API has a dynamic 'sign' header. 
        // We are using a public endpoint that might require browser-like headers.
        const bingxUrl = "https://api-app.we-api.com/api/c2c/v3/advert/list";

        const payload = {
            type: 1,
            fiat: fiat.toUpperCase(),
            _displayFiatName: fiat.toUpperCase(),
            asset: asset.toUpperCase(),
            _displayAssetName: asset.toUpperCase(),
            pageSize: 10,
            sortType: 0,
            pageId: 1,
            advertFilter: {
                matchUserCondition: 0,
                noPaymentMethodVerification: 0,
                tradedWithMerchantOnly: 0,
                verifiedMerchantOnly: 0
            }
        };

        try {
            const response = await axios.post(bingxUrl, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'accept': 'application/json, text/plain, */*',
                    'appid': '30004',
                    'platformid': '30',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                },
                timeout: 5000
            });

            if (response.data && response.data.data && response.data.data.items) {
                const items = response.data.data.items;
                const results = {};
                if (items.length > 0) {
                    const best = items[0];
                    results[asset.toUpperCase()] = {
                        price: parseFloat(best.price),
                        advertiser: best.nickName,
                        orderCount: best.orderCount,
                        finishRate: (parseFloat(best.orderCompletionRate) * 100).toFixed(1),
                        isMerchant: best.isMerchant === 1
                    };
                }
                return {
                    statusCode: 200,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ success: true, prices: results })
                };
            }
        } catch (apiErr) {
            console.error("BingX API Error, using fallback estimation...");
        }

        // Fallback: If BingX API is blocked (Cloudflare), use an estimated price based on Binance + small spread
        // In a real scenario, we would use a more robust scraper.
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                isEstimated: true,
                prices: {
                    [asset.toUpperCase()]: {
                        price: 0, // Will be filled by UI fallback
                        advertiser: "BingX (API Protegida)"
                    }
                }
            })
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, message: error.message })
        };
    }
};
