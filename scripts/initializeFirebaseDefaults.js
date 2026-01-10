// Script para inicializar valores por defecto en Firebase
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

// Configuración de Firebase (debe coincidir con tu firebaseConfig)
const firebaseConfig = {
    apiKey: "AIzaSyBZdQUvjLWoVVFfAITJZiPPKqXPvqWcvVQ",
    authDomain: "btc-pool-f6c1a.firebaseapp.com",
    projectId: "btc-pool-f6c1a",
    storageBucket: "btc-pool-f6c1a.firebasestorage.app",
    messagingSenderId: "1090064854994",
    appId: "1:1090064854994:web:c1e7c5f8f1b3e8e8e8e8e8"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function initializeDefaults() {
    try {
        console.log('🚀 Inicializando valores por defecto en Firebase...');

        const siteConfigRef = doc(db, 'settings', 'siteConfig');

        const defaultConfig = {
            siteName: 'MaxiOS',
            homeText: 'Maximiza tus ganancias replicando a los mejores traders en tiempo real.',
            heroTitle: 'El Futuro del Trading está aquí',
            performanceStatsResetDate: null,
            siteDomain: '',
            faviconUrl: '',
            footerText: `© ${new Date().getFullYear()} MaxiOS. Todos los derechos reservados. Versión del proyecto 1.0 Beta`,
            heroBadge: 'Trading de Nueva Generación',
            f1Title: 'Copy Trading VIP',
            f1Desc: 'Replica las estrategias de traders expertos de Binance de forma 100% automática y transparente.',
            f2Title: 'Ganancias Pasivas',
            f2Desc: 'Genera rendimientos diarios sin necesidad de conocimientos técnicos. Tu capital trabaja para ti.',
            f3Title: 'Seguridad de Elite',
            f3Desc: 'Protección multicapa para tus fondos y datos personales con cifrado de grado institucional.',
            hiwTitle: 'Control Total sobre tus Ganancias',
            s1Title: 'Crea tu Perfil',
            s1Desc: 'Regístrate en menos de un minuto y configura tu billetera segura.',
            s2Title: 'Activa un Cupo VIP',
            s2Desc: 'Elige entre Bronze, Gold o Diamond para empezar a recibir operaciones.',
            s3Title: 'Monitorea en Real-Time',
            s3Desc: 'Observa cada operación ganadora reflejada en tu historial instantáneamente.',
            ctaTitle: '¿Listo para Operar?',
            ctaText: 'Únete a la plataforma de Copy Trading más avanzada y transparente del mercado.'
        };

        await setDoc(siteConfigRef, defaultConfig, { merge: true });

        console.log('✅ Valores por defecto guardados exitosamente en Firebase!');
        console.log('📋 Configuración aplicada:');
        console.log(`   - Nombre del Sitio: ${defaultConfig.siteName}`);
        console.log(`   - Título Hero: ${defaultConfig.heroTitle}`);
        console.log(`   - Texto Home: ${defaultConfig.homeText}`);
        console.log(`   - Hero Badge: ${defaultConfig.heroBadge}`);
        console.log(`   - Features: ${defaultConfig.f1Title}, ${defaultConfig.f2Title}, ${defaultConfig.f3Title}`);
        console.log(`   - Steps: ${defaultConfig.s1Title}, ${defaultConfig.s2Title}, ${defaultConfig.s3Title}`);
        console.log(`   - CTA: ${defaultConfig.ctaTitle}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error al guardar valores por defecto:', error);
        process.exit(1);
    }
}

initializeDefaults();
