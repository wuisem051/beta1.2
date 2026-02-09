// content-bridge.js - v5.0 (Active Bridge)
console.log('%c [Airtm Bridge] v5.0 ONLINE ', 'background: #3498db; color: #fff; font-weight: bold; padding: 5px;');

let isBridgeValid = true;

// 1. Notificar al Background que esta pestaña es una Aplicación de Trading
function registerApp() {
    try {
        chrome.runtime.sendMessage({ type: 'APP_READY' });
    } catch (e) {
        isBridgeValid = false;
    }
}

// Escuchar peticiones del cliente React
window.addEventListener('message', (event) => {
    if (event.data?.type === 'AIRTM_CLIENT_READY') {
        console.log('[Bridge] React está listo. Registrando app...');
        registerApp();
    }
});

// 2. Escuchar mensajes del Background y pasarlos a React
try {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (!isBridgeValid) return;

        console.log(`[Bridge] Reenviando a React: ${message.type}`);

        window.postMessage({
            source: 'AIRTM_EXTENSION',
            payload: message
        }, '*');

        return true;
    });
} catch (e) {
    isBridgeValid = false;
}

// Registro inicial
registerApp();

// Auto-re-registro cada 30 segundos para asegurar conexión
setInterval(registerApp, 30000);
