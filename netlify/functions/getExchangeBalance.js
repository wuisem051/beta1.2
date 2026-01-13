const admin = require('firebase-admin');
const ccxt = require('ccxt');

// Initialize Firebase Admin (only once)
if (!admin.apps.length) {
    try {
        const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;

        if (!serviceAccountJson) {
            throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable not set');
        }

        const serviceAccount = JSON.parse(serviceAccountJson);

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
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    try {
        // Get user ID from authorization header
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

        // Get exchange and fetch balance
        const exchange = await getExchange(userId);
        const balance = await exchange.fetchBalance();

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(balance)
        };

    } catch (error) {
        console.error('Exchange Balance Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: error.message || 'Error al obtener balance.'
            })
        };
    }
};
