// airtm-main.js - Agente Espía (World: MAIN)
// Este script vive DENTRO de la página de Airtm.

console.log('%c [Airtm Sync] Agente Espía v3.0 Iniciado ', 'background: #000; color: #00ff00; font-weight: bold;');

// 1. Interceptor de Red (Fetch)
const originalFetch = window.fetch;
window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    const url = args[0] ? (typeof args[0] === 'string' ? args[0] : args[0].url) : '';

    // 1.1 Capturar Token desde headers (Restaurado)
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
                    // Enviar al Agente Mensajero
                    window.postMessage({ type: 'AIRTM_Spy_Data', operations: ops }, '*');
                }
            }
        }).catch(() => { });
    }
    return response;
};

// 2. Interceptor de Red (XHR) - Para compatibilidad total
const originalOpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function () {
    this.addEventListener('load', function () {
        try {
            if (this.responseText && (this.responseText.includes('p2pAvailableOperations') || this.responseText.includes('availableOperations'))) {
                const data = JSON.parse(this.responseText);
                const ops = data.data?.p2pAvailableOperations || data.data?.availableOperations;
                if (ops && Array.isArray(ops)) {
                    window.postMessage({ type: 'AIRTM_Spy_Data', operations: ops }, '*');
                }
            }
        } catch (e) { }
    });
    originalOpen.apply(this, arguments);
};
