const axios = require('axios');

async function test() {
    const payload = {
        asset: "USDT",
        fiat: "VES",
        tradeType: "BUY",
        page: 1,
        rows: 20,
        payTypes: [],
        publisherType: null,
        countries: [],
        additionalKycVerifyFilter: 0,
        filterType: "trading" // Added this
    };
    try {
        const binanceUrl = `https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search`;
        const response = await axios.post(binanceUrl, payload, {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const data = response.data.data;
        console.log("--- RESULTS WITH filterType: trading ---");
        if (data) {
            data.forEach(o => {
                console.log(`Nick: ${o.advertiser.nickName} | Price: ${o.adv.price}`);
            });
        } else {
            console.log("No data returned or error:", response.data);
        }

    } catch (e) {
        console.error("Error:", e.message);
    }
}
test();
