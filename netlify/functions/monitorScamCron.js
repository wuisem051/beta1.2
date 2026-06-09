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
            parse_mode: 'HTML',
            disable_web_page_preview: true
        });
    } catch (e) {
        console.error("Telegram Error:", e.message);
    }
}

exports.handler = async (event, context) => {
    try {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        // 1. Obtener datos actuales (TRX + TRC20)
        const [accResp, txResp, tokenResp] = await Promise.all([
            axios.get(`https://apilist.tronscan.org/api/account?address=${SCAM_ADDRESS}`),
            axios.get(`https://apilist.tronscan.org/api/transaction?sort=-timestamp&count=1&limit=1&start=0&address=${SCAM_ADDRESS}`),
            axios.get(`https://apilist.tronscan.org/api/token_trc20/transfers?limit=1&start=0&sort=-timestamp&relatedAddress=${SCAM_ADDRESS}`)
        ]);

        const account = accResp.data;
        const trxBalance = account.balance / 1000000 || 0;

        // Determinar la transacción más reciente de cualquier tipo
        const lastTrxTx = txResp.data.data?.[0];
        const lastTokenTx = tokenResp.data.token_transfers?.[0];

        let latestTx = null;
        if (lastTrxTx && lastTokenTx) {
            latestTx = lastTrxTx.timestamp > lastTokenTx.block_ts ? { ...lastTrxTx, asset: 'TRX', decimal: 6 } : { ...lastTokenTx, asset: lastTokenTx.tokenInfo?.tokenAbbr || 'USDT', decimal: lastTokenTx.tokenInfo?.tokenDecimal || 6, hash: lastTokenTx.transaction_id, timestamp: lastTokenTx.block_ts, ownerAddress: lastTokenTx.from_address, toAddress: lastTokenTx.to_address, amount: lastTokenTx.quant };
        } else {
            latestTx = lastTrxTx ? { ...lastTrxTx, asset: 'TRX', decimal: 6 } : (lastTokenTx ? { ...lastTokenTx, asset: lastTokenTx.tokenInfo?.tokenAbbr || 'USDT', decimal: lastTokenTx.tokenInfo?.tokenDecimal || 6, hash: lastTokenTx.transaction_id, timestamp: lastTokenTx.block_ts, ownerAddress: lastTokenTx.from_address, toAddress: lastTokenTx.to_address, amount: lastTokenTx.quant } : null);
        }

        // 2. Analizar Permisos
        const isMultiSig = account.owner_permission?.threshold > 1 ||
            account.owner_permission?.keys?.[0]?.address !== SCAM_ADDRESS;

        const vulnerabilityStatus = isMultiSig ? "🔐 BLOQUEADO (MULTI-SIG)" : "🔓 VULNERABLE (CLAVE PRINCIPAL LIBRE)";

        // 3. Obtener estado anterior
        const monitorRef = db.collection('monitors').doc('tron_scam');
        const doc = await monitorRef.get();
        const lastState = doc.exists ? doc.data() : { lastHash: '', lastBalance: 0, lastVulnerability: '' };

        let notifications = [];

        // Alerta de Saldo TRX
        if (trxBalance > 0.000001 && lastState.lastBalance <= 0.000001) {
            notifications.push(`💰 <b>ALERTA DE LIQUIDEZ TRX</b>\nSaldo detectado: <code>${trxBalance.toFixed(6)} TRX</code>\nHora: <code>${timeStr}</code>\nBilletera: <code>${SCAM_ADDRESS}</code>`);
        }

        // Alerta de Vulnerabilidad
        if (vulnerabilityStatus !== lastState.lastVulnerability && doc.exists) {
            const color = isMultiSig ? '🔴' : '🟢';
            notifications.push(`${color} <b>CAMBIO DE PERMISOS</b>\nNuevo Estatus: <b>${vulnerabilityStatus}</b>\nHora: <code>${timeStr}</code>\nAnálisis: ${isMultiSig ? 'Fondos protegidos por Multi-Sig.' : '¡LA BILLETERA ESTÁ ABIERTA! Se puede operar con la clave principal.'}`);
        }

        // Alerta de Movimiento Detallado
        if (latestTx && latestTx.hash !== lastState.lastHash) {
            const isOut = latestTx.ownerAddress === SCAM_ADDRESS;
            const formattedAmount = (latestTx.amount / Math.pow(10, latestTx.decimal)).toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 8 });

            notifications.push(`🔄 <b>MOVIMIENTO DETECTADO</b>\nTipo: ${isOut ? '🔴 SALIDA' : '🟢 ENTRADA'}\nActivo: <b>${latestTx.asset}</b>\nMonto: <code>${formattedAmount} ${latestTx.asset}</code>\nHora: <code>${timeStr}</code>\n\n<b>Detalles:</b>\nDe: <code>${latestTx.ownerAddress}</code>\nA: <code>${latestTx.toAddress || 'Smart Contract'}</code>\nHash: <pre>${latestTx.hash}</pre>`);
        }

        // 4. Enviar notificaciones
        if (notifications.length > 0) {
            const finalMessage = `🛡️ <b>FORENSIC MONITOR MAXIOS</b>\n\n${notifications.join('\n\n')}\n\n🕵️‍♂️ <a href="https://tronscan.org/#/address/${SCAM_ADDRESS}">Inspeccionar en TronGrid</a>`;
            await sendTelegram(finalMessage);
        }

        // 5. Actualizar estado
        await monitorRef.set({
            lastHash: latestTx?.hash || '',
            lastBalance: trxBalance,
            lastVulnerability: vulnerabilityStatus,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, lastUpdate: timeStr })
        };

    } catch (error) {
        console.error("Monitor Cron Error:", error.message);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};
