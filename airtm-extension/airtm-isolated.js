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

// --- 2. Escáner Ultra-Agresivo de la Tabla (DOM) ---
function ultraScan() {
    if (!isContextValid) return;

    try {
        // Buscar filas de la tabla
        const rows = document.querySelectorAll('tr, [role="row"]');

        rows.forEach((row, index) => {
            const text = row.innerText || "";

            // Si la fila tiene un botón de aceptar y parece una operación
            if (text.includes('Aceptar') && (text.includes('VES') || text.includes('USDC') || text.includes('$'))) {

                // Extraer celdas (Tabla Airtm)
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

                    if (amount > 0) {
                        const rowId = 'op_row_' + method.substring(0, 3) + '_' + amount;

                        const opData = {
                            id: rowId,
                            paymentMethodName: method,
                            grossAmount: amount,
                            netAmount: amount,
                            status: 'OPEN',
                            profitPercentage: 2.2,
                            source: 'DOM_ULTRA_SCAN'
                        };

                        safeSendMessage({ type: 'AIRTM_NEW_OPERATION', operation: opData });
                    }
                }
            }
        });
    } catch (e) {
        // Silent fail
    }
}

// Escanear constantemente
scanInterval = setInterval(ultraScan, 1000);
ultraScan();
