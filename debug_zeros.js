const axios = require('axios');
const address = 'TDNbRwDyRbR5DQ5JiHFjQqdg4SsK2yuk4A';
axios.get(`https://apilist.tronscan.org/api/transaction?sort=-timestamp&count=10&limit=10&start=0&address=${address}`).then(r => {
    const lines = r.data.data.map(tx => `${tx.hash.substring(0, 10)} | Amount: ${tx.amount} | Type: ${tx.contractType} | Confirmed: ${tx.confirmed}`);
    console.log(lines.join('\n'));
}).catch(e => console.error(e.message));
