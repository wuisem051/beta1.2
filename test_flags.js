const axios = require('axios');
const fs = require('fs');

axios.post('https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search', {
    asset: 'USDT', fiat: 'VES', tradeType: 'BUY', page: 1, rows: 20,
    payTypes: [], publisherType: null, countries: [], additionalKycVerifyFilter: 1
}, {
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
    }
}).then(r => {
    fs.writeFileSync('full_offers.json', JSON.stringify(r.data.data, null, 2));
    console.log("Success");
}).catch(console.error);
