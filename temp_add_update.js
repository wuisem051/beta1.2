const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Try to find serviceAccountKey.json in scripts or current dir
const possiblePaths = [
    path.join(__dirname, 'scripts', 'serviceAccountKey.json'),
    path.join(__dirname, 'serviceAccountKey.json')
];

let serviceAccount = null;
for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
        serviceAccount = require(p);
        break;
    }
}

if (!serviceAccount) {
    console.error("Could not find serviceAccountKey.json");
    process.exit(1);
}

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function addFirstUpdate() {
    try {
        const update = {
            title: "Control de Señales Maestro",
            description: "Hemos implementado un nuevo sistema para que los administradores cierren las señales de trading con éxito o fallo, permitiendo un seguimiento preciso de la efectividad del trading.",
            type: "improvement",
            version: "v1.4.1",
            tag: "NUEVO",
            changes: [
                "Botón de Éxito: Cierra la señal como completada satisfactoriamente.",
                "Botón de Fallo: Cierra la señal como fallida.",
                "Indicadores Visuales: Colores dinámicos según el resultado de la operación.",
                "Sección de Actualizaciones: Nueva área para visualizar mejoras del sistema."
            ],
            createdAt: admin.firestore.Timestamp.now(),
            updatedAt: admin.firestore.Timestamp.now()
        };

        const docRef = await db.collection('siteUpdates').add(update);
        console.log("Update added with ID: ", docRef.id);
    } catch (error) {
        console.error("Error adding update: ", error);
    } finally {
        process.exit();
    }
}

addFirstUpdate();
