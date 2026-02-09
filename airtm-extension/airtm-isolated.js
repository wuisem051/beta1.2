// airtm-isolated.js - Mensajero Seguro v4.1 (World ISOLATED - Context Safe)

console.log('Mensajero Seguro v4.1 conectado');

let isContextValid = true;
let scanInterval = null;

// Helper function to safely send messages
const safeSendMessage = (message) => {
    if (!isContextValid) return;

    try {
        if (chrome && chrome.runtime && chrome.runtime.id) {
            chrome.runtime.sendMessage(message).catch(err => {
                if (err.message.includes('Extension context invalidated')) {
                    handleContextInvalidated();
                }
            });
        } else {
            handleContextInvalidated();
        }
    } catch (e) {
        if (e.message.includes('Extension context invalidated')) {
            handleContextInvalidated();
        }
    }
};

const handleContextInvalidated = () => {
    if (!isContextValid) return;
    isContextValid = false;
    console.warn('[Airtm Sync] Extensión actualizada. Recarga la página para reconectar.');
    if (scanInterval) clearInterval(scanInterval);
    // Remove listeners if possible, though reloading page is best
};

// --- 1. Escuchar al Agente Espía ---
window.addEventListener('message', (event) => {
    if (!isContextValid) return;

    // Escuchar mensajes del Agente Espía (World: MAIN)
    if (event.data) {
        if (event.data.type === 'AIRTM_Spy_Data' && event.data.operations) {
            const ops = event.data.operations;
            if (Array.isArray(ops)) {
                ops.forEach(op => {
                    safeSendMessage({ type: 'AIRTM_NEW_OPERATION', operation: op });
                });
            }
        }

        if (event.data.type === 'AIRTM_Spy_Token' && event.data.token) {
            const cleanToken = event.data.token.replace('Bearer ', '').trim();
            safeSendMessage({ type: 'AIRTM_TOKEN_DETECTED', token: cleanToken });
        }
    }
});

// --- 2. Escáner Ultra-Agresivo (Soporte Dual: Tabla y Tarjetas) ---
function ultraScan() {
    if (!isContextValid) return;

    try {
        const detectedOps = new Set(); // Para evitar duplicados en el mismo ciclo

        // A. ESCÁNER DE TABLA (CLÁSICO)
        const rows = document.querySelectorAll('tr, [role="row"]');
        rows.forEach((row) => {
            const text = row.innerText || "";
            if (text.includes('Aceptar') && (text.includes('VES') || text.includes('USDC') || text.includes('$'))) {
                // ... lógica de extracción de tabla ...
                // Simplificada para este bloque
                const cells = row.querySelectorAll('td, [role="gridcell"]');
                if (cells.length > 0) {
                    let method = "Desconocido";
                    let amount = 0;
                    if (cells.length >= 3) {
                        method = cells[1].innerText.replace(/\n/g, ' ').trim();
                        const amountText = cells[2].innerText.trim();
                        amount = parseFloat(amountText.replace(/[^0-9.]/g, '')) || 0;
                    } else {
                        const textParts = text.split('\n').filter(t => t.trim().length > 2);
                        method = textParts[1] || "Operación Airtm";
                        amount = parseFloat(text.match(/\d+[.,]\d+/)?.[0]?.replace(',', '.') || 0);
                    }
                    if (amount > 0) reportOp(method, amount, 'TABLE');
                }
            }
        });

        // B. ESCÁNER DE TARJETAS (NUEVA UI AIRTM)
        // Buscamos botones de Aceptar y miramos su contenedor
        const buttons = Array.from(document.querySelectorAll('button'));
        const acceptButtons = buttons.filter(b => b.innerText.includes('Aceptar') || b.innerText.includes('Accept'));

        acceptButtons.forEach(btn => {
            // Subir 3-4 niveles para encontrar la tarjeta completa
            // Estructura usual: Card > Footer > Button
            let card = btn.closest('div[class*="Card"], div[class*="card"], article');

            // Si no encuentra por clase, subimos por jerarquía buscando el precio
            if (!card) {
                let parent = btn.parentElement;
                for (let i = 0; i < 5; i++) {
                    if (parent && (parent.innerText.includes('USDC') || parent.innerText.includes('$'))) {
                        card = parent;
                    }
                    if (parent) parent = parent.parentElement;
                }
            }

            if (card) {
                const text = card.innerText;
                // Extraer monto (buscamos el valor más grande asociado a USDC o $)
                const amountMatch = text.match(/\+\s*\$?\s*([0-9,.]+)\s*USDC/);
                const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '')) : 0;

                // Extraer método (buscamos texto que no sea números ni etiquetas comunes)
                // En la tarjeta, el método suele estar arriba del monto
                let method = "Operación Detectada";
                const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);

                // Heurística simple: La línea con 'Venezuela', 'Bancamiga', 'Pago Móvil', etc.
                const methodLine = lines.find(l =>
                    !l.includes('USDC') &&
                    !l.includes('VES') &&
                    !l.includes('Aceptar') &&
                    !l.includes('Agregar') &&
                    !l.includes('Retirar') &&
                    !l.match(/^\d/)
                );
                if (methodLine) method = methodLine;

                if (amount > 0) {
                    reportOp(method, amount, 'CARD');
                }
            }
        });

    } catch (e) {
        // Silent
    }
}

function reportOp(method, amount, source) {
    const rowId = 'op_' + source + '_' + method.substring(0, 5) + '_' + amount;
    const opData = {
        id: rowId,
        paymentMethodName: method,
        grossAmount: amount,
        netAmount: amount,
        status: 'OPEN',
        profitPercentage: 2.2,
        source: 'DOM_' + source,
        isBuy: true
    };
    safeSendMessage({ type: 'AIRTM_NEW_OPERATION', operation: opData });
}

// Escanear constantemente
scanInterval = setInterval(ultraScan, 1000);
ultraScan();
