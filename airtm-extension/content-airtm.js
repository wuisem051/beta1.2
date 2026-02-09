// content-airtm.js - Interceptor de Red Avanzado v1.6 (World: MAIN)

console.log('%c [Airtm Sync] Vigilando tráfico GraphQL... ', 'background: #fcd535; color: #000; font-weight: bold;');

// 1. INTERCEPTOR PARA FETCH
const originalFetch = window.fetch;
window.fetch = async function (...args) {
    const url = args[0] ? (typeof args[0] === 'string' ? args[0] : args[0].url) : '';

    // Capturar Token desde el objeto Headers (Forma correcta)
    if (args[1] && args[1].headers) {
        let auth = null;
        if (args[1].headers instanceof Headers) {
            auth = args[1].headers.get('Authorization');
        } else {
            auth = args[1].headers['Authorization'] || args[1].headers['authorization'];
        }

        if (auth && auth.includes('Bearer')) {
            console.log('%c [Airtm Sync] ¡Token de sesión interceptado!', 'color: #02c076; font-weight: bold;');
            window.postMessage({ type: 'TO_EXTENSION_BRIDGE', data: { type: 'TOKEN', value: auth } }, '*');
        }
    }

    const response = await originalFetch.apply(this, args);

    // Capturar Operaciones desde GraphQL
    if (url && url.includes('/graphql')) {
        const clone = response.clone();
        clone.json().then(data => {
            if (data && data.data) {
                const ops = data.data.p2pAvailableOperations || data.data.availableOperations;
                if (ops && Array.isArray(ops)) {
                    window.postMessage({ type: 'TO_EXTENSION_BRIDGE', data: { type: 'OPS', value: ops } }, '*');
                }
            }
        }).catch(() => { });
    }

    return response;
};

// 2. INTERCEPTOR PARA XMLHttpRequest (XHR)
const originalOpen = XMLHttpRequest.prototype.open;
const originalSetHeader = XMLHttpRequest.prototype.setRequestHeader;

XMLHttpRequest.prototype.setRequestHeader = function (header, value) {
    if (header.toLowerCase() === 'authorization' && value.includes('Bearer')) {
        console.log('%c [Airtm Sync] ¡Token interceptado via XHR!', 'color: #02c076; font-weight: bold;');
        window.postMessage({ type: 'TO_EXTENSION_BRIDGE', data: { type: 'TOKEN', value: value } }, '*');
    }
    return originalSetHeader.apply(this, arguments);
};
