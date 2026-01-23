const admin = require('firebase-admin');

// Intento de inicialización básica para entorno local si hay credenciales disponibles
// En muchos casos se puede usar un archivo json local para pruebas
const fs = require('fs');
const path = require('path');

async function run() {
    console.log("Iniciando inserción de actualizaciones...");

    // Aquí el usuario debería tener sus credenciales de alguna forma
    // Si no las tengo, informaré al usuario.
    const serviceAccountPath = path.join(process.cwd(), 'serviceAccount.json');

    if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = require(serviceAccountPath);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } else {
        console.error("No se encontró serviceAccount.json. No se puede proceder con la inserción directa.");
        console.log("Por favor, inserta las siguientes actualizaciones manualmente mediante el panel de administración:");
        console.log(JSON.stringify(updates, null, 2));
        return;
    }

    const db = admin.firestore();
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
            createdAt: new Date()
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
            createdAt: new Date()
        }
    ];

    try {
        const collectionRef = db.collection('siteUpdates');
        for (const update of updates) {
            await collectionRef.add(update);
        }
        console.log("Actualizaciones insertadas correctamente.");
    } catch (error) {
        console.error("Error al insertar:", error);
    }
}

run();
