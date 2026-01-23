const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, serverTimestamp } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

const firebaseConfig = {
    apiKey: "AIzaSyCEv6ZfHdaN-eNEYvAcEa_FfcSci8sluFg",
    authDomain: "pool-btc.firebaseapp.com",
    projectId: "pool-btc",
    storageBucket: "pool-btc.firebasestorage.app",
    messagingSenderId: "1018976881268",
    appId: "1:1018976881268:web:a87c5168227f056ac7df21"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const updates = [
    {
        title: "Seguridad de Conexión Avanzada",
        description: "Hemos implementado una nueva capa de cifrado de grado industrial para todas las conexiones externas. Tus credenciales ahora están protegidas por protocolos de seguridad de alto nivel, asegurando que tu información sensible permanezca privada y segura.",
        type: "improvement",
        version: "v2.2",
        tag: "SEGURIDAD",
        changes: [
            "Cifrado de grado militar para llaves de API",
            "Protección avanzada contra acceso no autorizado",
            "Manejo seguro de secretos en el servidor"
        ],
        createdAt: serverTimestamp()
    },
    {
        title: "Nueva Experiencia Visual Elite",
        description: "La plataforma se siente más viva que nunca. Hemos rediseñado la interfaz principal con animaciones modernas, fondos dinámicos y micro-interacciones fluidas que mejoran la navegación y resaltan el potencial tecnológico de nuestro ecosistema.",
        type: "improvement",
        version: "v2.3",
        tag: "INTERFAZ",
        changes: [
            "Fondos orgánicos animados",
            "Efectos de flotación y profundidad",
            "Micro-interacciones táctiles y de ratón",
            "Optimización de rendimiento visual"
        ],
        createdAt: serverTimestamp()
    }
];

async function run() {
    try {
        console.log("Autenticando...");
        await signInWithEmailAndPassword(auth, "wuisem051@gmail.com", "123456");
        console.log("Autenticado como administrador.");

        for (const update of updates) {
            await addDoc(collection(db, 'siteUpdates'), update);
            console.log(`Publicada: ${update.title}`);
        }
        console.log("Todas las actualizaciones han sido publicadas correctamente.");
        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

run();
