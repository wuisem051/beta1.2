// content-bridge.js - El vigilante de los dos mundos v4.2 (Safe Mode)

let isBridgeContextValid = true;

const safeBridgeSendMessage = (message) => {
    if (!isBridgeContextValid) return;
    try {
        if (chrome && chrome.runtime && chrome.runtime.id) {
            chrome.runtime.sendMessage(message).catch(err => {
                if (err.message && err.message.includes('Extension context invalidated')) {
                    console.warn('[Airtm Bridge] Contexto invalidado. Recarga la página.');
                    isBridgeContextValid = false;
                }
            });
        }
    } catch (e) {
        isBridgeContextValid = false;
    }
};

// 1. Escuchar mensajes que vienen de la página de Airtm (vía World MAIN)
window.addEventListener('message', (event) => {
    if (!isBridgeContextValid) return;

    // 1.1 Si la web pide Sincronización Forzada
    if (event.data && event.data.type === 'AIRTM_CLIENT_READY') {
        safeBridgeSendMessage({ type: 'FORCE_SYNC' });
        console.log('Cliente web listo, solicitando sincronización...');
    }

    // 1.2 Otros mensajes
    if (event.data && event.data.type === 'TO_EXTENSION_BRIDGE') {
        const { type, value } = event.data.data;
        if (type === 'TOKEN') {
            safeBridgeSendMessage({ type: 'AIRTM_TOKEN_DETECTED', token: value });
        }
        if (type === 'OPS') {
            value.forEach(op => {
                safeBridgeSendMessage({ type: 'AIRTM_NEW_OPERATION', operation: op });
            });
        }
    }
});

// 2. Escuchar mensajes que vienen del Background (hacia la web de Trading)
try {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (!isBridgeContextValid) return;
        window.postMessage({
            source: 'AIRTM_EXTENSION',
            payload: message
        }, '*');
    });
} catch (e) {
    isBridgeContextValid = false;
}
