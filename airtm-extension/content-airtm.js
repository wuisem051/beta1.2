// content-airtm.js - Detective v2.4 (Ultra-Agresivo para Vista de Tabla)
console.log('%c [Airtm Sync] Detective v2.4 (Ultra-Scan) ', 'background: #fcd535; color: #000; font-weight: bold;');

// 1. Intercepción de Red Directa (GraphQL)
const originalFetch = window.fetch;
window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    const url = args[0] ? (typeof args[0] === 'string' ? args[0] : args[0].url) : '';
    if (url && url.includes('/graphql')) {
        const clone = response.clone();
        clone.json().then(data => {
            if (data && data.data) {
                const ops = data.data.p2pAvailableOperations || data.data.availableOperations || data.data.p2pOperations;
                if (ops && Array.isArray(ops)) {
                    ops.forEach(op => {
                        chrome.runtime.sendMessage({ type: 'AIRTM_NEW_OPERATION', operation: op });
                    });
                }
            }
        }).catch(() => { });
    }
    return response;
};

// 2. Escáner de DOM de Máxima Precisión (Específico para la tabla de Airtm)
function ultraScan() {
    // Buscar todas las filas de la tabla
    const rows = document.querySelectorAll('tr, [role="row"]');

    rows.forEach((row, index) => {
        const text = row.innerText || "";

        // Criterio de detección: Debe tener un botón de "Aceptar" y mencionar montos
        if (text.includes('Aceptar') && (text.includes('VES') || text.includes('USDC') || text.includes('$'))) {

            // Extraer celdas
            const cells = row.querySelectorAll('td, [role="gridcell"]');
            if (cells.length > 0) {
                let method = "Desconocido";
                let amount = 0;

                // En la vista de tabla de Airtm:
                // Col 1: Tipo (Agregar/Retirar)
                // Col 2: Método de Pago (Imagen + Texto)
                // Col 3: Cantidad (Monto)

                if (cells.length >= 3) {
                    method = cells[1].innerText.replace(/\n/g, ' ').trim();
                    const amountText = cells[2].innerText.trim();
                    amount = parseFloat(amountText.replace(/[^0-9.]/g, '')) || 0;
                } else {
                    // Fallback para otros diseños de fila
                    const textParts = text.split('\n').filter(t => t.trim().length > 2);
                    method = textParts[1] || "Operación Airtm";
                    amount = parseFloat(text.match(/\d+[.,]\d+/)?.[0]?.replace(',', '.') || 0);
                }

                if (amount > 0) {
                    // Generar ID único basado en el texto de la fila para evitar duplicados
                    const rowId = 'row_' + btoa(text.substring(0, 50)).substring(0, 15);

                    const opData = {
                        id: rowId,
                        paymentMethodName: method,
                        grossAmount: amount,
                        netAmount: amount,
                        status: 'OPEN',
                        profitPercentage: 2.2,
                        source: 'DOM_ULTRA_SCAN'
                    };

                    chrome.runtime.sendMessage({ type: 'AIRTM_NEW_OPERATION', operation: opData });
                }
            }
        }
    });
}

// Escanear cada segundo para no perder ninguna
setInterval(ultraScan, 1000);
ultraScan();
