const axios = require('axios');

exports.handler = async (event, context) => {
    try {
        const body = JSON.parse(event.body || '{}');
        const { assets = ["USDT"], fiat = "VES" } = body;

        const bitunixUrl = "https://api.bitunix.com/web/p2p/ad/buy";
        const results = {};

        // Fetch assets (Bitunix mostly only has USDT for VES)
        await Promise.all(assets.map(async (asset) => {
            try {
                const payload = {
                    fiatCode: fiat.toUpperCase(),
                    fiatCount: "",
                    cryptoCode: asset.toUpperCase(),
                    exchangeService: "",
                    pageSize: "10",
                    page: 1
                };

                const response = await axios.post(bitunixUrl, payload, {
                    headers: {
                        'Content-Type': 'application/json',
                        'client-type': 'pc',
                        'language': 'es_ES',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    },
                    timeout: 5000
                });

                if (response.data && response.data.data) {
                    const dataObj = response.data.data;
                    const rawList = dataObj.items || dataObj.list || [];
                    const list = rawList.filter(item => item.onlineFlag === "online" || !item.onlineFlag);

                    if (list.length > 0) {
                        const best = list[0];
                        results[asset.toUpperCase()] = {
                            price: parseFloat(best.price),
                            advertiser: best.nickname || best.memberName || "Comerciante",
                            orderCount: best.thirtyOrderQuantity || best.orderCount || 0,
                            finishRate: (parseFloat(best.thirtyCompleteRate) || 100).toFixed(1),
                            isMerchant: best.customizeState === 1 || best.isMerchant === 1
                        };
                    }
                }
            } catch (e) {
                console.error(`Bitunix error for ${asset}:`, e.message);
            }
        }));

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ success: true, prices: results })
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, message: error.message })
        };
    }
};
