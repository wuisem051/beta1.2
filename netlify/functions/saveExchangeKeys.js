const admin = require('firebase-admin');
const { encrypt } = require('./utils/vault');

if (!admin.apps.length) {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccountJson) {
        const serviceAccount = JSON.parse(serviceAccountJson);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: serviceAccount.project_id
        });
    }
}

const db = admin.firestore();

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

        const { apiKey, secret, exchange } = JSON.parse(event.body);

        if (!apiKey || !secret || !exchange) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Datos incompletos.' })
            };
        }

        // Encrypt sensitive data before saving
        const encryptedApiKey = encrypt(apiKey);
        const encryptedSecret = encrypt(secret);

        await db.collection('users').doc(userId).collection('secrets').doc(exchange).set({
            apiKey: encryptedApiKey,
            secret: encryptedSecret,
            exchange,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'Credenciales guardadas y cifradas correctamente.' })
        };

    } catch (error) {
        console.error('Save Exchange Keys Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message || 'Error al guardar credenciales.' })
        };
    }
};
