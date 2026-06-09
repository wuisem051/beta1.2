const axios = require('axios');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { address } = JSON.parse(event.body);
        if (!address) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Address is required' }) };
        }

        // Ejecutar peticiones en paralelo para TRX y TRC20 (USDT)
        // Aumentamos el límite a 100 para cubrir más historial
        const [accountResp, transResp, tokenResp] = await Promise.all([
            axios.get(`https://apilist.tronscan.org/api/account?address=${address}`),
            axios.get(`https://apilist.tronscan.org/api/transaction?sort=-timestamp&count=50&limit=50&start=0&address=${address}`),
            axios.get(`https://apilist.tronscan.org/api/token_trc20/transfers?limit=50&start=0&sort=-timestamp&relatedAddress=${address}`)
        ]);

        // Mapear transacciones de TRX
        const trxTransactions = (transResp.data.data || []).map(tx => ({
            hash: tx.hash,
            timestamp: tx.timestamp,
            ownerAddress: tx.ownerAddress,
            toAddress: tx.toAddress,
            amount: tx.amount,
            confirmed: tx.confirmed,
            token: 'TRX',
            type: 'TRX'
        }));

        // Mapear transferencias de Tokens (USDT, etc)
        const tokenTransfers = (tokenResp.data.token_transfers || []).map(tx => ({
            hash: tx.transaction_id,
            timestamp: tx.block_ts,
            ownerAddress: tx.from_address,
            toAddress: tx.to_address,
            amount: tx.quant,
            confirmed: true, // TronScan TRC20 list usually only shows confirmed
            token: tx.tokenInfo?.tokenAbbr || 'USDT',
            type: 'TRC20',
            tokenDecimal: tx.tokenInfo?.tokenDecimal || 6
        }));

        // Combinar, eliminar duplicados (por hash) y ordenar
        const combined = [...trxTransactions, ...tokenTransfers];
        const unique = Array.from(new Map(combined.map(item => [item.hash, item])).values());
        const sorted = unique.sort((a, b) => b.timestamp - a.timestamp);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                account: accountResp.data,
                transactions: sorted.slice(0, 50) // Devolver las 50 más recientes combinadas
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
