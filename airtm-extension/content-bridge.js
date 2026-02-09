// content-bridge.js - Corre en tu App de Trading

console.log('%c Airtm Pro Sync: Puente establecido con la App de Trading ', 'background: #00b894; color: #fff; font-weight: bold;');

// Escuchar mensajes provenientes del background.js (que vienen de Airtm)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Reenviar el mensaje al "window" de la página para que React pueda escucharlo
    window.postMessage({
        source: 'AIRTM_EXTENSION',
        payload: message
    }, '*');
});
