// content-airtm.js - Super Detective v2.2 (Red + Escáner Visual)

console.log('%c [Airtm Sync] Detective Multi-Modo Activo ', 'background: #fcd535; color: #000; font-weight: bold;');

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
                    ops.forEach(op => chrome.runtime.sendMessage({ type: 'AIRTM_NEW_OPERATION', operation: op }));
                }
            }
        }).catch(() => { });
    }
    return response;
};

// --- MODO 2: ESCÁNER VISUAL (DOM Scraping) ---
// Este modo detecta lo que TÚ ves en pantalla aunque la red falle
function scanScreen() {
    const cards = document.querySelectorAll('div[class*="OperationCard"], div[class*="sc-"]'); // Selectores comunes de Airtm
    cards.forEach(card => {
        const text = card.innerText || "";
        if (text.includes('Agregar fondos') || text.includes('Retirar fondos')) {
            // Extraer info básica si hay un botón de Aceptar
            const acceptBtn = card.querySelector('button');
            if (acceptBtn && acceptBtn.innerText.includes('Aceptar')) {
                const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                const method = lines[1] || "Desconocido";
                const amountStr = lines.find(l => l.includes('$')) || "$0";

                // Simular objeto de operación
                const mockOp = {
                    id: 'dom_' + Math.random().toString(36).substr(2, 9),
                    paymentMethodName: method,
                    grossAmount: parseFloat(amountStr.replace(/[^0-9.]/g, '')),
                    status: 'OPEN',
                    profitPercentage: 2.2 // Estimado
                };

                chrome.runtime.sendMessage({ type: 'AIRTM_NEW_OPERATION', operation: mockOp });
            }
        }
    });
}

// Ejecutar escáner cada 3 segundos
setInterval(scanScreen, 3000);
