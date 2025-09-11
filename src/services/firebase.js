import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCEv6ZfHdaN-eNEYvAcEa_FfcSci8sluFg",
  authDomain: "pool-btc.firebaseapp.com",
  projectId: "pool-btc",
  storageBucket: "pool-btc.firebasestorage.app",
  messagingSenderId: "1018976881268",
  appId: "1:1018976881268:web:a87c5168227f056ac7df21",
  measurementId: "G-S2KLE99V6Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Conectar a los emuladores de Firebase si estamos en desarrollo
if (process.env.NODE_ENV === 'development') {
  if (window.location.hostname === "localhost") {
    connectAuthEmulator(auth, "http://localhost:9099"); // Puerto por defecto para Auth Emulator
    connectFirestoreEmulator(db, "localhost", 8080); // Puerto por defecto para Firestore Emulator
  }
}

export { auth, db };
