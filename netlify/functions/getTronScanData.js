const axios = require('axios');

exports.handler = async (event) => {
    // Solo permitir POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { address } = JSON.parse(event.body);
        if (!address) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Address is required' }) };
        }

        // Ejecutar peticiones en paralelo
        const [accountResp, transResp] = await Promise.all([
            axios.get(`https://apilist.tronscan.org/api/account?address=${address}`),
            axios.get(`https://apilist.tronscan.org/api/transaction?sort=-timestamp&count=40&limit=40&start=0&address=${address}`)
        ]);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                account: accountResp.data,
                transactions: transResp.data.data
            })
        };
    } catch (error) {
        console.error('TronScan Proxy Error:', error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch data from TronScan', details: error.message })
        };
    }
};
