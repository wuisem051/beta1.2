// background v3.0 - Mensajero Central
console.log('Background v3.0 Iniciado');

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
