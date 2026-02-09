// content-airtm.js - Observador de Operaciones v2.0
console.log('%c [Airtm Sync] Observador de operaciones activo ', 'background: #fcd535; color: #000; font-weight: bold;');

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
                    ops.forEach(op => {
                        chrome.runtime.sendMessage({ type: 'AIRTM_NEW_OPERATION', operation: op });
                    });
                }
            }
        }).catch(() => { });
    }
    return response;
};
