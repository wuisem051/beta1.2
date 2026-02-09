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
// 1. Intercepción de Red Directa (GraphQL)
const originalFetch = window.fetch;
window.fetch = async (...args) => {
    try {
        const response = await originalFetch(...args);

        // Análisis de URL seguro
        const url = args[0] ? (typeof args[0] === 'string' ? args[0] : (args[0].url || '')) : '';

        // Captura de Token (Restaurado y Seguro)
        // Verificamos explícitamente args[1] que son las opciones
        if (args[1] && args[1].headers) {
            try {
                let auth = null;
                if (args[1].headers instanceof Headers) {
                    auth = args[1].headers.get('Authorization');
                } else if (typeof args[1].headers === 'object') {
                    // Manejo insensible a mayúsculas/minúsculas
                    const headers = args[1].headers;
                    const authKey = Object.keys(headers).find(k => k.toLowerCase() === 'authorization');
                    if (authKey) auth = headers[authKey];
                }

                if (auth && typeof auth === 'string' && auth.includes('Bearer')) {
                    window.postMessage({ type: 'AIRTM_Spy_Token', token: auth }, '*');
                }
            } catch (e) {
                // Ignorar errores de headers opacos o cross-origin
            }
        }

        // Intercepción de Operaciones (GraphQL)
        if (url && url.includes('/graphql')) {
            try {
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
            } catch (e) { }
        }

        return response;
    } catch (err) {
        // En caso de error en el fetch original, propagar el error
        throw err;
    }
};

// 2. Escáner de DOM eliminado en favor de 'airtm-isolated.js' para evitar duplicidad y conflictos.
// Este script se dedica exclusivamente a la intercepción de red de alta fidelidad.
console.log('[Airtm Sync] Network Interceptor Active');
