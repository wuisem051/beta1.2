// content-airtm.js - Detective v3.5 (Corrección de Canal MAIN -> ISOLATED)
console.log('%c [Airtm Sync] Detective v3.5 (Bridge Repair) ', 'background: #fcd535; color: #000; font-weight: bold;');

// Función auxiliar para enviar datos al script aislado (Bridge)
function sendToBridge(op) {
    window.postMessage({
        type: 'AIRTM_Spy_Data',
        operations: [op]
    }, '*');
}

// 1. Intercepción de Red Directa (GraphQL)
const originalFetch = window.fetch;
window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    const url = args[0] ? (typeof args[0] === 'string' ? args[0] : args[0].url) : '';

    // Captura de Token (Restaurado)
    if (args[1] && args[1].headers) {
        let auth = null;
        if (args[1].headers instanceof Headers) {
            auth = args[1].headers.get('Authorization');
        } else {
            auth = args[1].headers['Authorization'] || args[1].headers['authorization'];
        }

        if (auth && auth.includes('Bearer')) {
            window.postMessage({ type: 'AIRTM_Spy_Token', token: auth }, '*');
        }
    }

    if (url && url.includes('/graphql')) {
        const clone = response.clone();
        clone.json().then(data => {
            if (data && data.data) {
                const ops = data.data.p2pAvailableOperations || data.data.availableOperations || data.data.p2pOperations;
                if (ops && Array.isArray(ops)) {
                    ops.forEach(op => {
                        sendToBridge(op);
                    });
                }
            }
        }).catch(() => { });
    }
    return response;
};

// 2. Escáner de DOM de Máxima Precisión (Específico para la tabla de Airtm)
function ultraScan() {
    try {
        // Buscar todas las filas de la tabla
        const rows = document.querySelectorAll('tr, [role="row"]');

        rows.forEach((row, index) => {
            const text = row.innerText || "";

            // Criterio de detección: Debe tener texto relevante
            if (text.includes('VES') || text.includes('USDC') || text.includes('$')) {

                // Intentar extraer metodo y monto
                let method = "Desconocido";
                let amount = 0;
                let id = null;

                // Caso 1: Tabla Estándar
                const cells = row.querySelectorAll('td, [role="gridcell"]');
                if (cells.length >= 3) {
                    method = cells[1].innerText.replace(/\n/g, ' ').trim();
                    const amountText = cells[2].innerText.trim();
                    amount = parseFloat(amountText.replace(/[^0-9.]/g, '')) || 0;
                } else {
                    // Fallback para tarjetas o divs
                    const textParts = text.split('\n').filter(t => t.trim().length > 2);
                    if (textParts.length >= 2) {
                        method = textParts[0].length < 30 ? textParts[0] : (textParts[1] || "Operación Airtm");
                        const moneyMatch = text.match(/\$\s*(\d+[.,]?\d*)/);
                        if (moneyMatch) amount = parseFloat(moneyMatch[1].replace(',', '.'));
                    }
                }

                if (amount > 0) {
                    // Generar ID único basado en el contenido para evitar duplicados en React
                    // Usamos un hash simple del texto de la fila
                    const rowSignature = method + amount.toFixed(2);
                    id = 'dom_' + btoa(rowSignature).substring(0, 15);

                    const opData = {
                        id: id,
                        paymentMethodName: method, // Compatibilidad con lógica de UI
                        payment_method_name: method,
                        grossAmount: amount,
                        netAmount: amount,
                        amount: amount,
                        status: 'OPEN',
                        profitPercentage: 2.2, // Estimado
                        source: 'DOM_ULTRA_SCAN',
                        isBuy: true // Asumir compra por defecto en tabla de "Agregar"
                    };

                    sendToBridge(opData);
                }
            }
        });
    } catch (e) {
        // Silent fail
    }
}

// Escanear cada 2 segundos
setInterval(ultraScan, 2000);
ultraScan();
