const axios = require('axios');

async function testBingX() {
    const url = "https://api-app.we-api.com/api/c2c/v3/advert/list";
    const payload = {
        type: 1,
        fiat: "VES",
        _displayFiatName: "VES",
        asset: "USDT",
        _displayAssetName: "USDT",
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
        const response = await axios.post(url, payload, {
            headers: {
                'Content-Type': 'application/json',
                'accept': 'application/json, text/plain, */*',
                'appid': '30004',
                'platformid': '30',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        console.log("Response:", response.data);
    } catch (e) {
        console.error("Error:", e.response?.data || e.message);
    }
}
testBingX();
