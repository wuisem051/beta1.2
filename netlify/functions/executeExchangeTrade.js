const admin = require('firebase-admin');
const ccxt = require('ccxt');
const { decrypt } = require('./utils/vault');

// Initialize Firebase Admin (only once)
if (!admin.apps.length) {
    try {
        const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;

        if (!serviceAccountJson) {
            throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable not set');
        }

        let serviceAccount;
        try {
            serviceAccount = JSON.parse(serviceAccountJson);
        } catch (parseError) {
            console.error('FIREBASE_SERVICE_ACCOUNT JSON parse error:', parseError);
            throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not a valid JSON. Check for leading/trailing spaces or special characters.');
        }

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: serviceAccount.project_id
        });
    } catch (error) {
        console.error('Firebase initialization error:', error);
        throw error;
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

    const data = doc.data();
    const apiKey = decrypt(data.apiKey);
    const secret = decrypt(data.secret);
    const exchange = data.exchange;
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
        config.urls = {
            api: {
                public: 'https://open-api.bingx.com',
                private: 'https://open-api.bingx.com',
            }
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
        const { symbol, side, amount, type = 'market', price } = JSON.parse(event.body || '{}');

        // Validation
        if (!symbol || !side || !amount) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Faltan parámetros (symbol, side, amount).' })
            };
        }

        // Get exchange and execute trade
        const exchange = await getExchange(userId);
        const order = await exchange.createOrder(symbol, type, side, amount, price);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(order)
        };

    } catch (error) {
        console.error('Exchange Trade Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: error.message || 'Error al ejecutar orden.'
            })
        };
    }
};
