// airtm-isolated.js - Mensajero Seguro v3.0 (World ISOLATED)

console.log('Mensajero Seguro v3.0 conectado');

// --- 1. Escuchar al Agente Espía ---
window.addEventListener('message', (event) => {
    // Escuchar mensajes del Agente Espía (World: MAIN)
    if (event.data && event.data.type === 'AIRTM_Spy_Data') {
        const ops = event.data.operations;
        if (ops && Array.isArray(ops)) {
            ops.forEach(op => {
                chrome.runtime.sendMessage({ type: 'AIRTM_NEW_OPERATION', operation: op });
            });
        }
    }
});

// --- 2. Escáner Ultra-Agresivo de la Tabla (DOM) ---
function ultraScan() {
    // Buscar filas de la tabla
    const rows = document.querySelectorAll('tr, [role="row"]');

    rows.forEach((row, index) => {
        const text = row.innerText || "";

        // Si la fila tiene un botón de aceptar y parece una operación
        if (text.includes('Aceptar') && (text.includes('VES') || text.includes('USDC') || text.includes('$'))) {

            // MARCAR LA FILA VISUALMENTE (Desactivado para producción)
            // if (!row.style.borderLeft) {
            //    row.style.borderLeft = "5px solid #00ff00"; 
            // }

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

                    try {
                        chrome.runtime.sendMessage({ type: 'AIRTM_NEW_OPERATION', operation: opData });
                    } catch (e) {
                        console.warn('[Airtm Sync] Esperando recarga para restablecer conexión...');
                    }
                }
            }
        }
    });
}

// Escanear constantemente
setInterval(ultraScan, 1000);
ultraScan();
