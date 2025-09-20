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
