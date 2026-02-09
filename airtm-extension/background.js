// background.js - El cerebro de la extensión

// Almacenar el último token detectado en memoria y storage
let lastAirtmToken = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'AIRTM_TOKEN_DETECTED') {
        console.log('Token de Airtm detectado por la extensión');
        lastAirtmToken = message.token;
        chrome.storage.local.set({ airtmToken: message.token });

        // Intentar enviar el token a todas las pestañas de nuestra App de Trading
        broadcastToTradingApps({
            type: 'SYNC_AIRTM_TOKEN',
            token: message.token
        });
    }

    if (message.type === 'AIRTM_NEW_OPERATION') {
        console.log('Nueva operación detectada en Airtm:', message.operation.id);

        // Reenviar la operación a nuestra App de Trading
        broadcastToTradingApps({
            type: 'SYNC_AIRTM_OPERATION',
            operation: message.operation
        });
    }
});

// Función para encontrar las pestañas de nuestra web y enviarles datos
async function broadcastToTradingApps(data) {
    const tabs = await chrome.tabs.query({});
    tabs.forEach(tab => {
        // Filtramos por URL para no molestar a otras páginas
        if (tab.url && (tab.url.includes('netlify.app') || tab.url.includes('localhost'))) {
            chrome.tabs.sendMessage(tab.id, data).catch(err => {
                // Silenciamos errores si la pestaña no tiene el content script cargado
            });
        }
    });
}
