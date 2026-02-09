// airtm-isolated.js - v6.0 (RELIANCE)
console.log('%c [Airtm Sync] v6.0 ONLINE ', 'background: #27ae60; color: #fff; font-weight: bold;');

let isContextValid = true;
let seenIds = new Set();

const send = (msg) => {
    if (!isContextValid) return;
    try {
        if (chrome?.runtime?.id) { chrome.runtime.sendMessage(msg); }
        else { isContextValid = false; }
    } catch (e) { isContextValid = false; }
};

// 1. ESCUCHA DE RED (Vía Agente Espía en MAIN)
window.addEventListener('message', (e) => {
    if (!isContextValid || !e.data) return;
    if (e.data.type === 'AIRTM_Spy_Data' && e.data.operations) {
        e.data.operations.forEach(op => {
            const id = op.id || op.uuid;
            if (id && !seenIds.has(id)) {
                // seenIds.add(id); // Dejamos que el panel maneje duplicados finales
                send({ type: 'AIRTM_NEW_OPERATION', operation: op });
            }
        });
    }
    if (e.data.type === 'AIRTM_Spy_Token' && e.data.token) {
        send({ type: 'AIRTM_TOKEN_DETECTED', token: e.data.token });
    }
});

// 2. ESCÁNER DOM (Último recurso, pero infalible)
function ultraScan() {
    if (!isContextValid) return;

    // Buscamos cualquier botón que diga Aceptar/Accept/Seleccionar
    const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
    buttons.forEach(btn => {
        const t = (btn.innerText || "").toLowerCase();
        if (t.includes('aceptar') || t.includes('accept') || t.includes('seleccionar')) {

            // Subimos hasta encontrar el contenedor que diga USDC
            let card = btn.parentElement;
            let depth = 0;
            while (card && depth < 12) {
                const text = card.innerText || "";
                if (text.includes('USDC') && text.includes('$')) {
                    extract(card, text);
                    break;
                }
                card = card.parentElement;
                depth++;
            }
        }
    });
}

function extract(el, text) {
    try {
        const amountMatch = text.match(/([0-9,]+\.[0-9]{2})/);
        if (!amountMatch) return;
        const amount = parseFloat(amountMatch[1].replace(/,/g, ''));

        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);
        const ignore = ['agregar', 'retirar', 'fondos', 'usdc', 'aceptar', 'accept', '$', 'bs', 'ves', 'tasa', 'rate'];
        let method = "Desconocido";
        for (let line of lines) {
            if (!ignore.some(ig => line.toLowerCase().includes(ig)) && !/\d\.\d{1,2}/.test(line)) {
                method = line;
                break;
            }
        }

        const isBuy = text.toLowerCase().includes('agregar');
        const opId = `scan_${method}_${amount}_${isBuy}`.replace(/[^a-zA-Z0-9]/g, '_');

        if (seenIds.has(opId)) return;
        seenIds.add(opId);

        const opData = {
            id: opId,
            paymentMethodName: method,
            amount: amount,
            isBuy: isBuy,
            maker: { username: 'Usuario Airtm', averageRating: 5.0 },
            source: 'DOM_EXTRACT'
        };

        send({ type: 'AIRTM_NEW_OPERATION', operation: opData });
    } catch (e) { }
}

setInterval(ultraScan, 2000);
// Limpiamos memoria cada hora
setInterval(() => seenIds.clear(), 3600000);
