// content-airtm.js - Super Detective de Tokens

console.log('%c [Airtm Sync] Detective buscando sesión... ', 'background: #fcd535; color: #000; font-weight: bold;');

// Inyectar interceptor de Fetch más agresivo
const script = document.createElement('script');
script.textContent = `
    (function() {
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            // Capturar Token desde los Headers de CUALQUIER solicitud a Airtm
            if (args[1] && args[1].headers) {
                const auth = args[1].headers['Authorization'] || args[1].headers['authorization'];
                if (auth && auth.includes('Bearer')) {
                    window.postMessage({ type: 'AIRTM_TOKEN_FOUND', token: auth }, '*');
                }
            }

            const response = await originalFetch(...args);
            const clone = response.clone();

            // Capturar Operaciones desde GraphQL
            if (args[0] && args[0].includes('/graphql')) {
                clone.json().then(data => {
                    if (data && data.data) {
                        const ops = data.data.p2pAvailableOperations || data.data.availableOperations;
                        if (ops && Array.isArray(ops)) {
                            window.postMessage({ type: 'AIRTM_OPS_FOUND', ops }, '*');
                        }
                    }
                }).catch(() => {});
            }
            return response;
        };
    })();
`;
(document.head || document.documentElement).appendChild(script);

// Escuchar lo que el script inyectado encuentre
window.addEventListener('message', (event) => {
    if (event.data.type === 'AIRTM_TOKEN_FOUND') {
        chrome.runtime.sendMessage({ type: 'AIRTM_TOKEN_DETECTED', token: event.data.token });
    }
    if (event.data.type === 'AIRTM_OPS_FOUND') {
        event.data.ops.forEach(op => {
            chrome.runtime.sendMessage({ type: 'AIRTM_NEW_OPERATION', operation: op });
        });
    }
});

// Búsqueda proactiva en Almacenamiento
function forceCheck() {
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const val = localStorage.getItem(key);
        if (val && val.includes('eyJ') && (key.includes('token') || key.includes('auth') || key.includes('session'))) {
            chrome.runtime.sendMessage({ type: 'AIRTM_TOKEN_DETECTED', token: val.replace(/"/g, '') });
        }
    }
}

setInterval(forceCheck, 3000);
forceCheck();
