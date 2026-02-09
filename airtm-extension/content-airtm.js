// content-airtm.js - Super Detective v2.3 (Modo Omnipresente)

console.log('%c [Airtm Sync] Detective v2.3 activo - Sin Filtros ', 'background: #fcd535; color: #000; font-weight: bold;');

// --- MODO 1: INTERCEPTOR DE RED (GraphQL) ---
const originalFetch = window.fetch;
window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    const url = args[0] ? (typeof args[0] === 'string' ? args[0] : args[0].url) : '';
    if (url && url.includes('/graphql')) {
        const clone = response.clone();
        clone.json().then(data => {
            if (data && data.data) {
                const ops = data.data.p2pAvailableOperations || data.data.availableOperations;
                if (ops && Array.isArray(ops)) {
                    console.log(`[Airtm Sync] Capturadas ${ops.length} ops vía Red`);
                    ops.forEach(op => chrome.runtime.sendMessage({ type: 'AIRTM_NEW_OPERATION', operation: op }));
                }
            }
        }).catch(() => { });
    }
    return response;
};

// --- MODO 2: ESCÁNER VISUAL (DOM Scraping) ---
function scanScreen() {
    // Buscar tanto en vista de cuadrícula como en vista de lista (tabla)
    const elements = document.querySelectorAll('div[class*="OperationCard"], tr, div[role="row"]');

    elements.forEach(el => {
        const text = el.innerText || "";
        // Si el elemento tiene un botón de aceptar y parece una operación
        if (text.includes('Aceptar') && (text.includes('USDC') || text.includes('VES') || text.includes('$'))) {

            // Si es una fila de tabla, intentamos ser más específicos
            const isTable = el.tagName === 'TR' || el.getAttribute('role') === 'row';
            let method = "Desconocido";
            let amount = 0;

            if (isTable) {
                // En tabla, el método suele estar en la segunda o tercera columna
                const cells = el.querySelectorAll('td, div[role="gridcell"]');
                if (cells.length > 2) {
                    method = cells[1].innerText.trim();
                    const amountText = cells[2].innerText.trim();
                    amount = parseFloat(amountText.replace(/[^0-9.]/g, '')) || 0;
                }
            } else {
                // En tarjetas
                const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 1);
                method = lines.find(l => l.includes('Venezuela') || l.includes('Binance') || l.includes('Paypal')) || lines[1] || "Desconocido";
                const amountLine = lines.find(l => l.includes('$') || l.includes('USDC'));
                amount = amountLine ? parseFloat(amountLine.replace(/[^0-9.]/g, '')) : 0;
            }

            // Evitar basura (como el header de la tabla)
            if (amount > 0 && method !== "MÉTODO DE PAGO") {
                const mockOp = {
                    id: 'dom_' + method.substring(0, 3) + '_' + amount,
                    paymentMethodName: method,
                    grossAmount: amount,
                    status: 'OPEN',
                    profitPercentage: 2.2
                };
                chrome.runtime.sendMessage({ type: 'AIRTM_NEW_OPERATION', operation: mockOp });
            }
        }
    });
}

// Ejecutar escáner rápido
setInterval(scanScreen, 2000);
