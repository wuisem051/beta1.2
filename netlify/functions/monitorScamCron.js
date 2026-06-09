const axios = require('axios');
const admin = require('firebase-admin');

// Inicializar Firebase Admin
if (!admin.apps.length) {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccountJson) {
        try {
            const serviceAccount = JSON.parse(serviceAccountJson);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: serviceAccount.project_id
            });
        } catch (e) {
            console.error("Firebase Auth Error:", e.message);
        }
    }
}

const db = admin.firestore();
const SCAM_ADDRESS = "TDNbRwDyRbR5DQ5JiHFjQqdg4SsK2yuk4A";
const TG_TOKEN = "8596744338:AAF9sEA_v_fmdW4-IvKDndVIfR_9MXKj_lU";
const TG_CHAT_ID = "5523815984";

async function sendTelegram(message) {
    const url = `https://api.telegram.org/bot${TG_TOKEN}/sendMessage`;
    try {
        await axios.post(url, {
            chat_id: TG_CHAT_ID,
            text: message,
            parse_mode: 'HTML'
        });
    } catch (e) {
        console.error("Telegram Error:", e.message);
    }
}

exports.handler = async (event, context) => {
    try {
        // 1. Obtener datos actuales de la billetera
        const [accResp, txResp] = await Promise.all([
            axios.get(`https://apilist.tronscan.org/api/account?address=${SCAM_ADDRESS}`),
            axios.get(`https://apilist.tronscan.org/api/transaction?sort=-timestamp&count=1&limit=1&start=0&address=${SCAM_ADDRESS}`)
        ]);

        const account = accResp.data;
        const balance = account.balance / 1000000 || 0;
        const lastTx = txResp.data.data?.[0];

        // 2. Analizar Permisos (Clave Principal)
        const isMultiSig = account.owner_permission?.threshold > 1 ||
            account.owner_permission?.keys?.[0]?.address !== SCAM_ADDRESS;

        const vulnerabilityStatus = isMultiSig ? "🔐 BLOQUEADO (MULTI-SIG)" : "🔓 VULNERABLE (CLAVE PRINCIPAL LIBRE)";

        // 3. Obtener estado anterior de Firestore
        const monitorRef = db.collection('monitors').doc('tron_scam');
        const doc = await monitorRef.get();
        const lastState = doc.exists ? doc.data() : { lastHash: '', lastBalance: 0, lastVulnerability: '' };

        let notifications = [];

        // Alerta de Saldo
        if (balance > 0.01 && lastState.lastBalance <= 0.01) {
            notifications.push(`💰 <b>ALERTA DE LIQUIDEZ</b>\nLa billetera ahora tiene saldo: <b>${balance.toLocaleString()} TRX</b>\nDestino: <code>${SCAM_ADDRESS}</code>`);
        }

        // Alerta de vulnerabilidad (Cambio de permisos)
        if (vulnerabilityStatus !== lastState.lastVulnerability && doc.exists) {
            notifications.push(`⚠️ <b>CAMBIO DE PROTOCOLO</b>\nEstatus: <b>${vulnerabilityStatus}</b>\nLa billetera ha cambiado sus permisos de red.`);
        }

        // Alerta de Movimiento
        if (lastTx && lastTx.hash !== lastState.lastHash) {
            const isOut = lastTx.ownerAddress === SCAM_ADDRESS;
            const amount = lastTx.amount / 1000000;
            notifications.push(`🔄 <b>NUEVO MOVIMIENTO</b>\nTipo: ${isOut ? '🔴 SALIDA' : '🟢 ENTRADA'}\nMonto: <b>${amount.toLocaleString()} TRX</b>\nHash: <pre>${lastTx.hash.substring(0, 16)}...</pre>`);
        }

        // 4. Enviar notificaciones si hay cambios
        if (notifications.length > 0) {
            const finalMessage = `🚨 <b>MONITOR DE CIBERSEGURIDAD</b>\n\n${notifications.join('\n\n')}\n\n<a href="https://tronscan.org/#/address/${SCAM_ADDRESS}">Ver en TronScan</a>`;
            await sendTelegram(finalMessage);
        }

        // 5. Actualizar estado
        await monitorRef.set({
            lastHash: lastTx?.hash || '',
            lastBalance: balance,
            lastVulnerability: vulnerabilityStatus,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, balance, vulnerabilityStatus })
        };

    } catch (error) {
        console.error("Monitor Cron Error:", error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
