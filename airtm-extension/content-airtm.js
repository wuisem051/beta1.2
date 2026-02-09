// content-airtm.js - Nueva versión nativa (World: MAIN)

console.log('%c [Airtm Sync] Iniciando conexión directa... ', 'background: #fcd535; color: #000; font-weight: bold;');

// Como ahora corremos en el "World Main", podemos interceptar fetch directamente
const originalFetch = window.fetch;
window.fetch = async (...args) => {
    const url = args[0] ? (typeof args[0] === 'string' ? args[0] : args[0].url) : '';

    // Capturar Token desde headers
    if (args[1] && args[1].headers) {
        const auth = args[1].headers['Authorization'] || args[1].headers['authorization'];
        if (auth && auth.includes('Bearer')) {
            window.dispatchEvent(new CustomEvent('AIRTM_DATA_FOUND', { detail: { type: 'TOKEN', value: auth } }));
        }
    }

    const response = await originalFetch(...args);

    // Capturar Operaciones
    if (url && url.includes('/graphql')) {
        const clone = response.clone();
        clone.json().then(data => {
            if (data && data.data) {
                const ops = data.data.p2pAvailableOperations || data.data.availableOperations;
                if (ops && Array.isArray(ops)) {
                    window.dispatchEvent(new CustomEvent('AIRTM_DATA_FOUND', { detail: { type: 'OPS', value: ops } }));
                }
            }
        }).catch(() => { });
    }

    return response;
};

// Enviar datos fuera de la página hacia la extensión
window.addEventListener('AIRTM_DATA_FOUND', (e) => {
    // Al correr en World: MAIN, usamos un truco para mandar el mensaje al background
    // Pero como no tenemos acceso directo a chrome.runtime, simplemente loggeamos y dejamos que el puente haga el resto
    // NOTA: Para MV3 World Main, la comunicación es via window messaging
    window.postMessage({ type: 'TO_EXTENSION_BRIDGE', data: e.detail }, '*');
});
