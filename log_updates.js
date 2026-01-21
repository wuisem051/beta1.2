import { db } from './src/services/firebase.js';
import { collection, addDoc } from 'firebase/firestore';

const logUpdate = async (update) => {
    try {
        await addDoc(collection(db, 'siteUpdates'), {
            ...update,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        console.log(`Update logged: ${update.title}`);
    } catch (e) {
        console.error("Error logging update:", e);
    }
};

const run = async () => {
    await logUpdate({
        title: "Billetera Unificada Elite",
        description: "Lanzamiento del nuevo Wallet Hub compacto con gestión de activos, depósitos y retiros en un solo lugar.",
        type: "feature",
        version: "v1.4",
        tag: "NUEVO",
        changes: [
            "Interfaz profesional inspirada en exchanges de elite",
            "Gestión de balances en tiempo real para todos los activos",
            "Depósitos y retiros integrados con flujo simplificado",
            "Historial financiero unificado de transacciones"
        ]
    });

    await logUpdate({
        title: "Mercado P2P Renovado",
        description: "Rediseño completo del mercado entre comercializadores con mejor UX y filtros avanzados.",
        type: "improvement",
        version: "v1.4.1",
        tag: "MEJORA",
        changes: [
            "Nueva tabla de ofertas con diseño ultra-limpio",
            "Filtros rápidos por tipo (Compra/Venta) y moneda",
            "Validación de saldo inteligente al crear ofertas",
            "Indicadores de estado 'Online' para anunciantes"
        ]
    });
};

run();
