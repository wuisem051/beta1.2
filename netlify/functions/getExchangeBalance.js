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
const getExchange = async (userId, exchangeName) => {
    // Default to binance if not provided
    const targetExchange = exchangeName || 'binance';

    // Try to get specific exchange doc
    let secretsRef = db.collection('users').doc(userId).collection('secrets').doc(targetExchange);
    let docSnap = await secretsRef.get();

    // Fallback to legacy 'exchange' doc if specific one not found
    if (!docSnap.exists) {
        secretsRef = db.collection('users').doc(userId).collection('secrets').doc('exchange');
        docSnap = await secretsRef.get();
    }

    if (!docSnap.exists) {
        throw new Error('API Keys no configuradas.');
    }

    const data = docSnap.data();
    const apiKey = decrypt(data.apiKey);
    const secret = decrypt(data.secret);
    const exchange = data.exchange || targetExchange;
    const exId = exchange ? exchange.toLowerCase() : 'binance';

    if (!ccxt[exId]) {
        throw new Error(`Exchange ${exId} no soportado.`);
    }

    const exchangeClass = ccxt[exId];

    const config = {
        apiKey,
        secret,
        enableRateLimit: true,
        options: {
            adjustForTimeDifference: true,
            recvWindow: 60000,
        }
    };

    // BingX-specific configuration overrides
    if (exId === 'bingx') {
        config.options = {
            ...config.options, // keep time sync if applicable
            defaultType: 'spot',
        };
        // BingX uses different API endpoints
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

        // Parse body to get exchange preference
        let exchangeName = 'binance';
        if (event.body) {
            try {
                const body = JSON.parse(event.body);
                if (body.exchange) exchangeName = body.exchange;
            } catch (e) {
                // Ignore parse error, use default
            }
        }

        // Get exchange and fetch balance
        const exchange = await getExchange(userId, exchangeName);
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
