const axios = require('axios');

exports.handler = async (event, context) => {
    try {
        const { asset = "USDT", fiat = "VES" } = event.queryStringParameters || {};

        // Bitunix API for P2P (Buy board = selling USDT)
        const bitunixUrl = "https://api.bitunix.com/web/p2p/ad/buy";
        const payload = {
            fiatCode: fiat.toUpperCase(),
            fiatCount: "",
            cryptoCode: asset.toUpperCase(),
            exchangeService: "",
            pageSize: "15",
            page: 1
        };

        const response = await axios.post(bitunixUrl, payload, {
            headers: {
                'Content-Type': 'application/json',
                'client-type': 'pc',
                'language': 'es_ES',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 10000
        });

        if (response.data && response.data.data && response.data.data.list) {
            // Filtrar solo los que están ONLINE para Bitunix
            const list = response.data.data.list.filter(item => item.onlineFlag === "online" || !item.onlineFlag);
            const results = {};

            if (list.length > 0) {
                const best = list[0];
                results[asset.toUpperCase()] = {
                    price: parseFloat(best.price),
                    advertiser: best.nickname || best.memberName,
                    orderCount: best.thirtyOrderQuantity || best.orderCount || 0,
                    finishRate: (parseFloat(best.thirtyCompleteRate) || 100).toFixed(1),
                    isMerchant: best.customizeState === 1 || best.isMerchant === 1
                };
            } else {
                results[asset.toUpperCase()] = null;
            }

            return {
                statusCode: 200,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ success: true, prices: results })
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ success: false, message: "No data from Bitunix", data: response.data })
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, message: error.message })
        };
    }
};
