// airtm-isolated.js - Mensajero Seguro v5.1 (RESURRECCIÓN)

console.log('%c [Airtm Sync] Escáner v5.1 Activo ', 'background: #27ae60; color: #fff; font-weight: bold;');

let isContextValid = true;
let reportedIds = new Set();

const safeSendMessage = (message) => {
    if (!isContextValid) return;
    try {
        if (chrome?.runtime?.id) {
            chrome.runtime.sendMessage(message).catch(() => { isContextValid = false; });
        } else { isContextValid = false; }
    } catch (e) { isContextValid = false; }
};

// --- 1. ESCUCHAR AL AGENTE ESPÍA (Intercepción de Red) ---
window.addEventListener('message', (event) => {
    if (!isContextValid) return;
    if (!event.data) return;

    // Recibir operaciones interceptadas por la red
    if (event.data.type === 'AIRTM_Spy_Data' && event.data.operations) {
        event.data.operations.forEach(op => {
            safeSendMessage({ type: 'AIRTM_NEW_OPERATION', operation: op });
        });
    }

    // Recibir token interceptado
    if (event.data.type === 'AIRTM_Spy_Token' && event.data.token) {
        const token = event.data.token.replace('Bearer ', '').trim();
        safeSendMessage({ type: 'AIRTM_TOKEN_DETECTED', token: token });
    }
});

// --- 2. ESCÁNER DE DOM (Seguridad Visual) ---
function scan() {
    if (!isContextValid) return;

    try {
        // En lugar de buscar texto exacto, buscamos botones que contengan la palabra clave
        const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
        const actionButtons = buttons.filter(btn => {
            const txt = (btn.innerText || "").toLowerCase();
            return txt.includes('aceptar') || txt.includes('accept') || txt.includes('seleccionar') || txt.includes('confirmar');
        });

        actionButtons.forEach(btn => {
            let card = btn.parentElement;
            let depth = 0;
            while (card && depth < 10) {
                const text = card.innerText || "";
                if (text.includes('USDC')) {
                    processDOMCard(card, text);
                    break;
                }
                card = card.parentElement;
                depth++;
            }
        });
    } catch (e) { }
}

function processDOMCard(card, text) {
    try {
        // Regex más flexible para montos: puede haber símbolos, espacios, etc.
        const amountMatch = text.match(/([0-9,]+\.[0-9]{2})/);
        if (!amountMatch) return;
        const amount = parseFloat(amountMatch[1].replace(/,/g, ''));

        // El método suele ser el título de la tarjeta o texto cerca de la bandera/icono
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);
        let method = "Desconocido";
        const ignore = ['agregar', 'retirar', 'fondos', 'usdc', 'aceptar', 'accept', '$', 'bs', 'ves', 'tasa', 'rate'];

        for (let line of lines) {
            if (!ignore.some(ig => line.toLowerCase().includes(ig)) && !/\d\.\d{1,2}/.test(line)) {
                method = line;
                break;
            }
        }

        const isBuy = text.toLowerCase().includes('agregar') || text.toLowerCase().includes('add');

        // ID seguro
        const rawId = `dom_${method}_${amount}_${isBuy}`.replace(/[^a-zA-Z0-9]/g, '_');
        if (reportedIds.has(rawId)) return;
        reportedIds.add(rawId);

        // Intentar capturar rating y usuario
        let rating = 5.0;
        let username = "Usuario Airtm";
        const rateMatch = text.match(/(\d\.\d{1,2})/);
        if (rateMatch) rating = parseFloat(rateMatch[1]);

        const opData = {
            id: 'atm_' + rawId.substring(0, 25),
            paymentMethodName: method,
            amount: amount,
            isBuy: isBuy,
            maker: {
                username: username,
                averageRating: rating
            },
            source: 'DOM_SCANNER_V5'
        };

        safeSendMessage({ type: 'AIRTM_NEW_OPERATION', operation: opData });
    } catch (e) { }
}

setInterval(scan, 1500);
setTimeout(scan, 500);
setInterval(() => { reportedIds.clear(); }, 1000 * 60 * 5); // Limpiar cada 5 min
