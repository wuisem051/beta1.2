const admin = require('firebase-admin');

// Inicializar Firebase Admin SDK si no ha sido inicializado
// Las credenciales se obtendrán de las variables de entorno de Netlify
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });
}

const db = admin.firestore();

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
