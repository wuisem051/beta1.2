// background.js - v3.5 (Broadcaster Pro)
console.log('Background v3.5 Iniciado - Monitor de Tráfico Activo');

// 1. Interceptor de Token Nivel Red
chrome.webRequest.onBeforeSendHeaders.addListener(
    (details) => {
        if (details.requestHeaders) {
            for (const header of details.requestHeaders) {
                if (header.name.toLowerCase() === 'authorization' && header.value.includes('Bearer')) {
                    const token = header.value.replace('Bearer ', '').trim();
                    chrome.storage.local.get(['airtmToken'], (res) => {
                        if (res.airtmToken !== token) {
                            console.log('Token capturado de red');
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

// 2. Comunicador Central
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // console.log('Mensaje recibido en background:', message.type);

    if (message.type === 'AIRTM_NEW_OPERATION') {
        broadcastToTradingApps({
            type: 'SYNC_AIRTM_OPERATION',
            operation: message.operation
        });
    }

    if (message.type === 'AIRTM_TOKEN_DETECTED') {
        const token = message.token;
        chrome.storage.local.get(['airtmToken'], (res) => {
            if (res.airtmToken !== token) {
                chrome.storage.local.set({ airtmToken: token });
                broadcastToTradingApps({ type: 'SYNC_AIRTM_TOKEN', token: token });
            }
        });
    }

    if (message.type === 'FORCE_SYNC') {
        chrome.storage.local.get(['airtmToken'], (res) => {
            if (res.airtmToken) {
                broadcastToTradingApps({ type: 'SYNC_AIRTM_TOKEN', token: res.airtmToken });
            }
        });
    }
});

async function broadcastToTradingApps(data) {
    const tabs = await chrome.tabs.query({});
    let sentCount = 0;

    tabs.forEach(tab => {
        const url = tab.url || "";
        const title = tab.title || "";

        // Criterio de match hiper-amplio para no fallar
        const isTradingApp =
            url.includes('netlify.app') ||
            url.includes('localhost') ||
            url.includes('127.0.0.1') ||
            title.toLowerCase().includes('trading') ||
            title.toLowerCase().includes('airtm pro') ||
            title.toLowerCase().includes('cashier');

        if (isTradingApp) {
            chrome.tabs.sendMessage(tab.id, data).catch(() => { });
            sentCount++;
        }
    });

    if (sentCount > 0) {
        console.log(`Difusión enviada a ${sentCount} pestañas: ${data.type}`);
    }
}
