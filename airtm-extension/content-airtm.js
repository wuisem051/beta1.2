// content-airtm.js - Corre en la pestaña de Airtm

console.log('%c Airtm Pro Sync: Iniciado en Airtm ', 'background: #fcd535; color: #000; font-weight: bold;');

// 1. Intentar capturar el token de localStorage cada cierto tiempo
function checkToken() {
    // Buscamos en todas las posibles llaves donde Airtm guarda el Bearer
    let token = null;
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.toLowerCase().includes('token') || key.toLowerCase().includes('auth')) {
            const val = localStorage.getItem(key);
            if (val && (val.length > 100 || val.includes('eyJ'))) { // Formato JWT común
                token = val;
                break;
            }
        }
    }

    if (token) {
        chrome.runtime.sendMessage({
            type: 'AIRTM_TOKEN_DETECTED',
            token: token.replace(/"/g, '') // Limpiar comillas si vienen del JSON.stringify
        });
    }
}

// 2. Inyectar un script para interceptar respuestas de Fetch/GraphQL
// Esto nos permite ver las operaciones exactamente cuando llegan a Airtm
const script = document.createElement('script');
script.textContent = `
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
        const response = await originalFetch(...args);
        
        // Clonamos la respuesta para no interferir con la original
        const clone = response.clone();
        
        if (args[0].includes('/graphql')) {
            clone.json().then(data => {
                if (data && data.data) {
                    const ops = data.data.p2pAvailableOperations || data.data.availableOperations;
                    if (ops && Array.isArray(ops)) {
                        // Enviar cada operación individualmente a la extensión
                        ops.forEach(op => {
                            window.postMessage({ type: 'FROM_AIRTM_PAGE', op }, '*');
                        });
                    }
                }
            }).catch(() => {});
        }
        
        return response;
    };
`;
(document.head || document.documentElement).appendChild(script);

// Escuchar los mensajes del script inyectado y pasarlos a la extensión
window.addEventListener('message', (event) => {
    if (event.data.type === 'FROM_AIRTM_PAGE') {
        chrome.runtime.sendMessage({
            type: 'AIRTM_NEW_OPERATION',
            operation: event.data.op
        });
    }
});

// Iniciar chequeos
checkToken();
setInterval(checkToken, 5000); // Revisar cada 5 seg si el token cambió
