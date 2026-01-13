const admin = require('firebase-admin');

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
    console.log('Firebase Admin initialized successfully in getTradingSignals');
  } catch (error) {
    console.error('Firebase initialization error in getTradingSignals:', error);
    throw error;
  }
}

const db = admin.firestore();

// Función para obtener señales de trading
exports.handler = async (event, context) => {
  // Configurar CORS para permitir solicitudes desde TradingView
  // Netlify Functions maneja CORS de forma ligeramente diferente,
  // pero podemos establecer los encabezados manualmente.
  const headers = {
    'Access-Control-Allow-Origin': '*', // Permitir cualquier origen por simplicidad, considerar restringir en producción
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: '',
    };
  }

  try {
    const signalsRef = db.collection('tradingSignals');
    const snapshot = await signalsRef.orderBy('createdAt', 'desc').get();

    const signals = snapshot.docs.map(doc => ({
      id: doc.id,
      asset: doc.data().asset,
      type: doc.data().type,
      entryPrice: doc.data().entryPrice,
      takeProfit: doc.data().takeProfit,
      stopLoss: doc.data().stopLoss,
      notes: doc.data().notes,
      createdAt: doc.data().createdAt.toDate().toISOString(),
    }));

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(signals),
    };
  } catch (error) {
    console.error("Error fetching trading signals:", error);
    return {
      statusCode: 500,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: "Error al obtener las señales de trading.", details: error.message }),
    };
  }
};
