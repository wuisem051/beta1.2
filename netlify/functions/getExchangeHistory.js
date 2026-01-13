const admin = require('firebase-admin');
const ccxt = require('ccxt');

// Initialize Firebase Admin (only once)
if (!admin.apps.length) {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
        : null;

    if (serviceAccount) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } else {
        admin.initializeApp();
    }
}

const db = admin.firestore();

// Helper function to get exchange instance
const getExchange = async (userId) => {
    const secretsRef = db.collection('users').doc(userId).collection('secrets').doc('exchange');
    const doc = await secretsRef.get();

    if (!doc.exists) {
        throw new Error('API Keys no configuradas.');
    }

    const { apiKey, secret, exchange } = doc.data();
    const exId = exchange ? exchange.toLowerCase() : 'binance';

    if (!ccxt[exId]) {
        throw new Error(`Exchange ${exId} no soportado.`);
    }

    const exchangeClass = ccxt[exId];

    const config = {
        apiKey,
        secret,
        enableRateLimit: true,
    };

    // BingX-specific configuration
    if (exId === 'bingx') {
        config.options = {
            defaultType: 'spot',
        };
    }

    return new exchangeClass(config);
};

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    try {
        // Get user ID from authorization
        const authHeader = event.headers.authorization || event.headers.Authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: 'Autenticación requerida.' })
            };
        }

        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userId = decodedToken.uid;

        // Parse request body
        const { symbol, limit = 10 } = JSON.parse(event.body || '{}');

        // Get exchange and fetch history
        const exchange = await getExchange(userId);

        let trades;
        if (symbol) {
            trades = await exchange.fetchMyTrades(symbol, undefined, limit);
        } else {
            if (exchange.id === 'binance') {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Symbol required for Binance history' })
                };
            }
            trades = await exchange.fetchMyTrades(undefined, undefined, limit);
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(trades)
        };

    } catch (error) {
        console.error('Exchange History Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: error.message || 'Error al obtener historial.'
            })
        };
    }
};
