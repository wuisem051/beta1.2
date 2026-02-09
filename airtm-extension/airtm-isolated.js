// airtm-isolated.js - v7.0 (ULTRA-RESILIENCE)
console.log('%c [Airtm Extension] v7.0 ONLINE ', 'background: #27ae60; color: #fff; font-weight: bold; padding: 5px; border-radius: 5px;');

let isContextValid = true;
let seenIds = new Set();
let lastHeartbeat = Date.now();

const send = (msg) => {
    if (!isContextValid) return;
    try {
        if (chrome?.runtime?.id) { chrome.runtime.sendMessage(msg); }
        else { isContextValid = false; console.warn('[Airtm Extension] Contexto invalidado. Recarga la página.'); }
    } catch (e) { isContextValid = false; }
};

// 1. ESCUCHA DE RED (Vía Agente Espía en MAIN)
window.addEventListener('message', (e) => {
    if (!isContextValid || !e.data) return;

    // Captura de Operaciones
    if (e.data.type === 'AIRTM_Spy_Data' && e.data.operations) {
        console.log(`%c [Airtm Extension] Red: Capturadas ${e.data.operations.length} operaciones `, 'color: #3498db');
        e.data.operations.forEach(op => {
            send({ type: 'AIRTM_NEW_OPERATION', operation: op });
        });
    }

    // Captura de Token
    if (e.data.type === 'AIRTM_Spy_Token' && e.data.token) {
        const token = e.data.token.replace('Bearer ', '').trim();
        console.log('%c [Airtm Extension] Red: Token Sincronizado ', 'color: #f1c40f');
        send({ type: 'AIRTM_TOKEN_DETECTED', token: token });
    }
});

// 2. ESCÁNER DOM (Bottom-Up)
function ultraScan() {
    if (!isContextValid) return;

    // Buscar Botones de Acción
    const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
    const actionButtons = buttons.filter(btn => {
        const t = (btn.innerText || "").toLowerCase();
        return t.includes('aceptar') || t.includes('accept') || t.includes('seleccionar') || t.includes('confirmar');
    });

    if (actionButtons.length > 0) {
        // console.log(`[Airtm Extension] DOM: Encontrados ${actionButtons.length} botones posibles`);
    }

    actionButtons.forEach(btn => {
        let card = btn.parentElement;
        let depth = 0;
        while (card && depth < 15) {
            const text = (card.innerText || "").toUpperCase();
            // Criterio de tarjeta: Debe tener USDC y un símbolo de moneda ($ o BS o VES)
            if (text.includes('USDC') && (text.includes('$') || text.includes('BS') || text.includes('VES'))) {
                extract(card, text);
                break;
            }
            card = card.parentElement;
            depth++;
        }
    });
}

function extract(el, text) {
    try {
        // Regex mejorada para cualquier monto con decimales (ej: 4.37, 1,234.56)
        const amountMatch = text.match(/([0-9,]+\.[0-9]{2})/);
        if (!amountMatch) return;

        const amountStr = amountMatch[1].replace(/,/g, '');
        const amount = parseFloat(amountStr);
        if (!amount) return;

        // Limpiar líneas para encontrar el método
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);
        const ignore = ['AGREGAR', 'RETIRAR', 'FONDOS', 'USDC', 'ACEPTAR', 'ACCEPT', '$', 'BS', 'VES', 'TASA', 'RATE', 'SOLICITUD', 'AVAILABLE'];

        let method = "Desconocido";
        for (let line of lines) {
            const upLine = line.toUpperCase();
            if (!ignore.some(ig => upLine.includes(ig)) && !/\d\.\d{1,2}/.test(line)) {
                method = line;
                break;
            }
        }

        const isBuy = text.toLowerCase().includes('agregar') || text.toLowerCase().includes('add');

        // ID basado en contenido (Estable)
        const opId = `dom_${method}_${amountStr}_${isBuy}`.replace(/[^a-zA-Z0-9]/g, '_');

        if (seenIds.has(opId)) return;
        seenIds.add(opId);

        const opData = {
            id: opId,
            paymentMethodName: method,
            amount: amount,
            isBuy: isBuy,
            maker: { username: 'Usuario Airtm', averageRating: 5.0 },
            source: 'DOM_EXTRACT_V7'
        };

        console.log(`%c [Airtm Extension] DOM: ¡Operación Detectada! ${method} por $${amount} `, 'background: #27ae60; color: #fff; font-weight: bold;');
        send({ type: 'AIRTM_NEW_OPERATION', operation: opData });
    } catch (e) {
        console.error('[Airtm Extension] Error extrayendo:', e);
    }
}

// Iniciar Ciclo
setInterval(ultraScan, 1500);

// Heartbeat para mantener el puerto vivo si es necesario
setInterval(() => {
    if (isContextValid) send({ type: 'HEARTBEAT', time: Date.now() });
}, 10000);

// Limpiar memoria cada 30 mins
setInterval(() => seenIds.clear(), 1800000);
