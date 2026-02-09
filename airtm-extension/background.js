// background.js - El Monitor Silencioso v2.0

// Interceptamos los encabezados de salida hacia Airtm
chrome.webRequest.onBeforeSendHeaders.addListener(
    (details) => {
        if (details.requestHeaders) {
            for (const header of details.requestHeaders) {
                if (header.name.toLowerCase() === 'authorization' && header.value.includes('Bearer')) {
                    const token = header.value.replace('Bearer ', '').trim();
                    console.log('[Airtm Sync] Token capturado desde la red');

                    // Guardar y Sincronizar
                    chrome.storage.local.set({ airtmToken: token });
                    broadcastToTradingApps({
                        type: 'SYNC_AIRTM_TOKEN',
                        token: token
                    });
                }
            }
        }
    },
    { urls: ["https://app.airtm.com/*"] },
    ["requestHeaders"]
);

// Responder a peticiones de fuerza manual
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'FORCE_SYNC') {
        chrome.storage.local.get(['airtmToken'], (res) => {
            if (res.airtmToken) {
                broadcastToTradingApps({
                    type: 'SYNC_AIRTM_TOKEN',
                    token: res.airtmToken
                });
            }
        });
    }

    if (message.type === 'AIRTM_NEW_OPERATION') {
        broadcastToTradingApps({
            type: 'SYNC_AIRTM_OPERATION',
            operation: message.operation
        });
    }
});

async function broadcastToTradingApps(data) {
    const tabs = await chrome.tabs.query({});
    tabs.forEach(tab => {
        const isTradingApp = tab.url && (
            tab.url.includes('netlify.app') ||
            tab.url.includes('localhost') ||
            tab.url.includes('127.0.0.1')
        );

        if (isTradingApp) {
            chrome.tabs.sendMessage(tab.id, data).catch(() => { });
        }
    });
}
