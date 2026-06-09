const axios = require('axios');
const hash = '504eea00addc0f0775c0f4fa7b40ce40a40a22e816adc8749e611aa9d7bb5522';
axios.get(`https://apilist.tronscan.org/api/transaction-info?hash=${hash}`).then(r => {
    console.log(JSON.stringify(r.data, null, 2));
}).catch(e => console.error(e.message));
