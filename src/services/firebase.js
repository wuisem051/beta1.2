import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Ajustar authDomain dinámicamente según el dominio actual para soportar múltiples URLs
const currentHostname = window.location.hostname;
if (currentHostname !== "localhost" && !currentHostname.includes("127.0.0.1")) {
  // Si estamos en Netlify o en el dominio propio, usamos ese dominio para Auth
  if (currentHostname.endsWith("netlify.app") || currentHostname === "lyonkim.site") {
    firebaseConfig.authDomain = currentHostname;
  } else if (process.env.REACT_APP_FIREBASE_AUTH_DOMAIN_OVERRIDE) {
    firebaseConfig.authDomain = process.env.REACT_APP_FIREBASE_AUTH_DOMAIN_OVERRIDE;
  }
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);

// Conectar a los emuladores de Firebase si estamos en desarrollo
if (process.env.NODE_ENV === 'development') {
  if (window.location.hostname === "localhost") {
    connectAuthEmulator(auth, "http://localhost:9099");
    connectFirestoreEmulator(db, "localhost", 8081);
    connectStorageEmulator(storage, "localhost", 9199);
    connectFunctionsEmulator(functions, "localhost", 5001);
  }
}

export { auth, db, storage, functions };
