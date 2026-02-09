// content-bridge.js - El vigilante de los dos mundos

// 1. Escuchar mensajes que vienen de la página de Airtm (vía World MAIN)
window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'TO_EXTENSION_BRIDGE') {
        const { type, value } = event.data.data;
        if (type === 'TOKEN') {
            chrome.runtime.sendMessage({ type: 'AIRTM_TOKEN_DETECTED', token: value });
        }
        if (type === 'OPS') {
            value.forEach(op => {
                chrome.runtime.sendMessage({ type: 'AIRTM_NEW_OPERATION', operation: op });
            });
        }
    }
});

// 2. Escuchar mensajes que vienen del Background (hacia la web de Trading)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    window.postMessage({
        source: 'AIRTM_EXTENSION',
        payload: message
    }, '*');
});
