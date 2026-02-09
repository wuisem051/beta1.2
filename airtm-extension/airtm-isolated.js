// airtm-isolated.js - v7.5 (STABLE RELAY)
console.log('%c [Airtm Extension] v7.5 ONLINE ', 'background: #27ae60; color: #fff; font-weight: bold; padding: 5px;');

let isContextValid = true;
let seenIds = new Set();

const sendToBackground = (msg) => {
    if (!isContextValid) return;
    try {
        chrome.runtime.sendMessage(msg).catch(() => {
            isContextValid = false;
        });
    } catch (e) {
        isContextValid = false;
    }
};

// 1. ESCUCHA DE RED (Vía Spy en MAIN)
window.addEventListener('message', (e) => {
    if (!isContextValid || !e.data || e.source !== window) return;

    if (e.data.type === 'AIRTM_Spy_Data' && e.data.operations) {
        console.log(`[Extension] Recibidas ${e.data.operations.length} ops de red`);
        e.data.operations.forEach(op => {
            sendToBackground({ type: 'AIRTM_NEW_OPERATION', operation: op });
        });
    }

    if (e.data.type === 'AIRTM_Spy_Token' && e.data.token) {
        console.log('[Extension] Token detectado en red');
        sendToBackground({ type: 'AIRTM_TOKEN_DETECTED', token: e.data.token });
    }
});

// 2. ESCÁNER DOM (Bottom-Up)
function scan() {
    if (!isContextValid) return;

    const actionButtons = Array.from(document.querySelectorAll('button, [role="button"]'))
        .filter(btn => {
            const t = (btn.innerText || "").toLowerCase();
            return t.includes('aceptar') || t.includes('accept') || t.includes('seleccionar');
        });

    actionButtons.forEach(btn => {
        let card = btn.parentElement;
        let depth = 0;
        while (card && depth < 15) {
            const text = (card.innerText || "").toUpperCase();
            if (text.includes('USDC') && (text.includes('$') || text.includes('BS') || text.includes('VES'))) {
                extractData(card, text);
                break;
            }
            card = card.parentElement;
            depth++;
        }
    });
}

function extractData(el, text) {
    try {
        const amountMatch = text.match(/([0-9,]+\.[0-9]{2})/);
        if (!amountMatch) return;
        const amount = parseFloat(amountMatch[1].replace(/,/g, ''));

        const isBuy = text.toLowerCase().includes('agregar') || text.toLowerCase().includes('add');

        // ID Único para evitar spam
        const opId = `scan_${amount}_${isBuy}_${text.substring(0, 20).replace(/\s/g, '')}`;
        if (seenIds.has(opId)) return;
        seenIds.add(opId);

        const opData = {
            id: opId,
            paymentMethodName: "Detectado por DOM",
            amount: amount,
            isBuy: isBuy,
            maker: { username: "Cajero Airtm", averageRating: 5.0 },
            source: 'DOM_EXTRACT'
        };

        console.log(`[Extension] Operación DOM detectada: $${amount}`);
        sendToBackground({ type: 'AIRTM_NEW_OPERATION', operation: opData });

    } catch (e) { }
}

setInterval(scan, 2000);
setInterval(() => seenIds.clear(), 600000); // Limpiar cada 10 min
