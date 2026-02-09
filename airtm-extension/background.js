console.log('Background v3.3 Iniciado - Protocolo de Captura Dual');

// 1. Interceptor de Token Nivel Red (Invisible)
chrome.webRequest.onBeforeSendHeaders.addListener(
    (details) => {
        if (details.requestHeaders) {
            for (const header of details.requestHeaders) {
                if (header.name.toLowerCase() === 'authorization' && header.value.includes('Bearer')) {
                    const token = header.value.replace('Bearer ', '').trim();

                    // Solo guardar si es nuevo para evitar spam de escritura
                    chrome.storage.local.get(['airtmToken'], (res) => {
                        if (res.airtmToken !== token) {
                            console.log('¡Token capturado desde la red!', token.substring(0, 10) + '...');
                            chrome.storage.local.set({ airtmToken: token });
                            broadcastToTradingApps({ type: 'SYNC_AIRTM_TOKEN', token: token });
                        }
                    });
                }
            }
        }
    },
    { urls: ["https://app.airtm.com/*"] },
    ["requestHeaders"]
);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'AIRTM_NEW_OPERATION') {
        const op = message.operation;
        console.log('¡OPERACIÓN INTERCEPTADA!', op.id || op.paymentMethodName);

        // Enviar a la web
        broadcastToTradingApps({
            type: 'SYNC_AIRTM_OPERATION',
            operation: op
        });
    }

    if (message.type === 'AIRTM_TOKEN_DETECTED') {
        const token = message.token;
        chrome.storage.local.get(['airtmToken'], (res) => {
            if (res.airtmToken !== token) {
                console.log('¡Token capturado vía script!', token.substring(0, 10) + '...');
                chrome.storage.local.set({ airtmToken: token });
                broadcastToTradingApps({ type: 'SYNC_AIRTM_TOKEN', token: token });
            }
        });
    }

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
