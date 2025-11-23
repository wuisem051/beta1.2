const functions = require('firebase-functions');
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs').promises;

admin.initializeApp();

// Middleware para verificar la autenticación y el rol de administrador
const authenticateAdmin = async (context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'La solicitud debe estar autenticada.');
  }

  const idToken = context.auth.token;
  if (!idToken) {
    throw new functions.https.HttpsError('unauthenticated', 'Token de autenticación no proporcionado.');
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // Verificar si el usuario es administrador (esto asume que tienes un campo 'admin' en tu colección de usuarios)
    const userDoc = await admin.firestore().collection('users').doc(uid).get();
    if (!userDoc.exists || !userDoc.data().admin) {
      throw new functions.https.HttpsError('permission-denied', 'Solo los administradores pueden realizar esta acción.');
    }
    return true;
  } catch (error) {
    console.error('Error de autenticación o autorización:', error);
    throw new functions.https.HttpsError('unauthenticated', 'Error de autenticación o autorización.', error.message);
  }
};

// Función para listar archivos y directorios
exports.listFiles = functions.https.onCall(async (data, context) => {
  await authenticateAdmin(context);

  const requestedPath = data.path || '/';
  const basePath = path.resolve(__dirname, '../'); // Ruta base del proyecto
  const targetPath = path.resolve(basePath, requestedPath);

  // Asegurarse de que la ruta solicitada esté dentro del directorio del proyecto
  if (!targetPath.startsWith(basePath)) {
    throw new functions.https.HttpsError('permission-denied', 'Acceso denegado a rutas fuera del directorio del proyecto.');
  }

  try {
    const entries = await fs.readdir(targetPath, { withFileTypes: true });
    const files = entries.map(entry => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
    }));
    return { files };
  } catch (error) {
    console.error('Error al listar archivos:', error);
    throw new functions.https.HttpsError('internal', 'Error al listar archivos.', error.message);
  }
});

// Función para leer el contenido de un archivo
exports.readFile = functions.https.onCall(async (data, context) => {
  await authenticateAdmin(context);

  const requestedPath = data.path;
  if (!requestedPath) {
    throw new functions.https.HttpsError('invalid-argument', 'La ruta del archivo es requerida.');
  }

  const basePath = path.resolve(__dirname, '../'); // Ruta base del proyecto
  const targetPath = path.resolve(basePath, requestedPath);

  // Asegurarse de que la ruta solicitada esté dentro del directorio del proyecto
  if (!targetPath.startsWith(basePath)) {
    throw new functions.https.HttpsError('permission-denied', 'Acceso denegado a rutas fuera del directorio del proyecto.');
  }

  try {
    const content = await fs.readFile(targetPath, 'utf8');
    return { content };
  } catch (error) {
    console.error('Error al leer archivo:', error);
    throw new functions.https.HttpsError('internal', 'Error al leer archivo.', error.message);
  }
});

// Función para escribir contenido en un archivo
exports.writeFile = functions.https.onCall(async (data, context) => {
  await authenticateAdmin(context);

  const requestedPath = data.path;
  const content = data.content;

  if (!requestedPath || content === undefined) {
    throw new functions.https.HttpsError('invalid-argument', 'La ruta del archivo y el contenido son requeridos.');
  }

  const basePath = path.resolve(__dirname, '../'); // Ruta base del proyecto
  const targetPath = path.resolve(basePath, requestedPath);

  // Asegurarse de que la ruta solicitada esté dentro del directorio del proyecto
  if (!targetPath.startsWith(basePath)) {
    throw new functions.https.HttpsError('permission-denied', 'Acceso denegado a rutas fuera del directorio del proyecto.');
  }

  try {
    await fs.writeFile(targetPath, content, 'utf8');
    return { success: true };
  } catch (error) {
    console.error('Error al escribir archivo:', error);
    throw new functions.https.HttpsError('internal', 'Error al escribir archivo.', error.message);
  }
});

// Función para ejecutar una operación de compra/venta (trade)
exports.executeTrade = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'La solicitud debe estar autenticada.');
  }

  const userId = context.auth.uid;
  const { coinId, amount, priceAtMoment, type } = data;

  if (!coinId || !amount || !priceAtMoment || !type) {
    throw new functions.https.HttpsError('invalid-argument', 'Faltan parámetros de trading.');
  }
  if (amount <= 0 || priceAtMoment <= 0) {
    throw new functions.https.HttpsError('invalid-argument', 'La cantidad y el precio deben ser mayores que cero.');
  }
  if (!['buy', 'sell'].includes(type)) {
    throw new functions.https.HttpsError('invalid-argument', 'El tipo de operación debe ser "buy" o "sell".');
  }

  const portfolioRef = admin.firestore().collection('users').doc(userId).collection('portfolios').doc('default'); // Asumimos un portfolio 'default' por usuario
  const transactionRef = portfolioRef.collection('transactions');

  try {
    const result = await admin.firestore().runTransaction(async (transaction) => {
      const portfolioDoc = await transaction.get(portfolioRef);

      if (!portfolioDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Portfolio no encontrado.');
      }

      const portfolioData = portfolioDoc.data();
      let { virtualBalance, holdings, totalValue } = portfolioData;
      const cost = amount * priceAtMoment;

      if (type === 'buy') {
        if (virtualBalance < cost) {
          throw new functions.https.HttpsError('failed-precondition', 'Saldo virtual insuficiente para la compra.');
        }
        virtualBalance -= cost;
        holdings[coinId] = (holdings[coinId] || 0) + amount;
      } else { // type === 'sell'
        if ((holdings[coinId] || 0) < amount) {
          throw new functions.https.HttpsError('failed-precondition', 'Cantidad insuficiente de la moneda para la venta.');
        }
        virtualBalance += cost; // Sumar el ingreso de la venta al saldo virtual
        holdings[coinId] -= amount;
        if (holdings[coinId] === 0) {
          delete holdings[coinId]; // Eliminar la moneda si la cantidad llega a cero
        }
      }

      // Actualizar el totalValue (esto es una simplificación, en un sistema real se recalcularía el valor de mercado de holdings)
      // Por ahora, solo se actualiza en base a la transacción
      // Para un cálculo preciso, necesitarías los precios actuales de todas las holdings.
      // totalValue = virtualBalance + calculateHoldingsValue(holdings, currentPrices);

      transaction.update(portfolioRef, {
        virtualBalance: virtualBalance,
        holdings: holdings,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      transaction.set(transactionRef.doc(), {
        type: type,
        currency: coinId,
        amount: amount,
        entryPrice: priceAtMoment,
        transactionDate: admin.firestore.FieldValue.serverTimestamp()
      });

      return { success: true, message: `Operación de ${type} exitosa.` };
    });

    return result;

  } catch (error) {
    console.error('Error al ejecutar la operación de trading:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Error interno al ejecutar la operación de trading.', error.message);
  }
});

// Nueva función HTTP para obtener señales de trading
exports.getTradingSignals = functions.https.onRequest(async (req, res) => {
  // Configurar CORS para permitir solicitudes desde TradingView
  res.set('Access-Control-Allow-Origin', '*'); // Permitir cualquier origen por simplicidad, considerar restringir en producción
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    // Pre-flight request
    res.status(204).send('');
    return;
  }

  try {
    const signalsRef = admin.firestore().collection('tradingSignals');
    const snapshot = await signalsRef.orderBy('createdAt', 'desc').get();

    const signals = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate().toISOString(), // Convertir a ISO string para fácil manejo
    }));

    res.status(200).json(signals);
  } catch (error) {
    console.error("Error fetching trading signals:", error);
    res.status(500).json({ error: "Error al obtener las señales de trading.", details: error.message });
  }
});
