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
    const targetExchange = exchangeName || 'binance';

    // Try to get specific exchange doc
    let secretsRef = db.collection('users').doc(userId).collection('secrets').doc(targetExchange);
    let docSnap = await secretsRef.get();

    // Fallback
    if (!docSnap.exists) {
        secretsRef = db.collection('users').doc(userId).collection('secrets').doc('exchange');
        docSnap = await secretsRef.get();
    }

    const data = docSnap.exists ? docSnap.data() : {};
    const apiKey = data.apiKey ? decrypt(data.apiKey) : '';
    const secret = data.secret ? decrypt(data.secret) : '';
    const exchange = data.exchange || targetExchange;
    const exId = exchange ? exchange.toLowerCase() : 'binance';

    if (!ccxt[exId]) {
        throw new Error(`Exchange ${exId} no soportado.`);
    }

    const exchangeClass = ccxt[exId];

    const config = {
        enableRateLimit: true,
        options: {
            adjustForTimeDifference: true,
            recvWindow: 60000,
        }
    };

    if (apiKey && secret) {
        config.apiKey = apiKey;
        config.secret = secret;
    }

    // BingX-specific configuration overrides
    if (exId === 'bingx') {
        config.options = {
            ...config.options,
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
        const { symbol, exchange: exchangeName } = JSON.parse(event.body || '{}');

        if (!symbol) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Falta el parámetro symbol.' })
            };
        }

        // Si el exchange solicitado es CoinMarketCap o se desea como fuente global
        if (exchangeName === 'coinmarketcap') {
            try {
                const cmcApiKey = process.env.CMC_API_KEY;
                if (!cmcApiKey) {
                    throw new Error('CMC_API_KEY no configurada en el servidor.');
                }

                // Simplemente obtenemos el símbolo base (ej: BTC de BTC/USDT)
                const baseSymbol = symbol.split('/')[0].toUpperCase();

                const cmcResponse = await fetch(`https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${baseSymbol}`, {
                    headers: {
                        'X-CMC_PRO_API_KEY': cmcApiKey,
                        'Accept': 'application/json'
                    }
                });

                const cmcData = await cmcResponse.json();

                if (cmcData.data && cmcData.data[baseSymbol]) {
                    const price = cmcData.data[baseSymbol].quote.USD.price;
                    return {
                        statusCode: 200,
                        headers,
                        body: JSON.stringify({
                            symbol: symbol,
                            last: price,
                            source: 'CoinMarketCap'
                        })
                    };
                } else {
                    throw new Error('Símbolo no encontrado en CoinMarketCap.');
                }
            } catch (cmcErr) {
                console.error('CMC Error:', cmcErr);
                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({ error: cmcErr.message || 'Error al obtener precio de CMC.' })
                };
            }
        }

        // Get exchange and fetch ticker (Existing CCXT logic)
        const exchangeInst = await getExchange(userId, exchangeName);
        const ticker = await exchangeInst.fetchTicker(symbol);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                symbol: ticker.symbol,
                last: ticker.last,
                bid: ticker.bid,
                ask: ticker.ask,
            })
        };

    } catch (error) {
        console.error('Exchange Ticker Error:', error);
        let errorMsg = error.message || 'Error al obtener precio.';

        // Detect geo-block (Common in Netlify/AWS US)
        if (errorMsg.includes('451') || errorMsg.includes('restricted location')) {
            errorMsg = "Bloqueo Geográfico: Binance Global no permite peticiones desde servidores en EE.UU. (Netlify). Si estás en EE.UU., usa la opción 'Binance.US' o cambia a 'BingX'.";
        }

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: errorMsg
            })
        };
    }
};
