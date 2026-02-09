// content-bridge.js - v4.5 (Reliable Bridge)
console.log('%c [Airtm Bridge] Active ', 'background: #3498db; color: #fff; font-weight: bold;');

let isBridgeContextValid = true;

// 1. Recibir de la PÁGINA y enviar al BACKGROUND
window.addEventListener('message', (event) => {
    if (!isBridgeContextValid) return;
    if (event.data?.type === 'AIRTM_CLIENT_READY') {
        console.log('[Bridge] Cliente listo, pidiendo sync...');
        try {
            chrome.runtime.sendMessage({ type: 'FORCE_SYNC' });
        } catch (e) { }
    }
});

// 2. Recibir del BACKGROUND y enviar a la PÁGINA
try {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (!isBridgeContextValid) return;

        console.log('[Bridge] Recibido de Background:', message.type);

        window.postMessage({
            source: 'AIRTM_EXTENSION',
            payload: message
        }, '*');

        return true;
    });
} catch (e) {
    isBridgeContextValid = false;
}
