// background.js - El cerebro de la extensión v1.2

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'AIRTM_TOKEN_DETECTED') {
        const cleanToken = message.token.replace('Bearer ', '').trim();
        chrome.storage.local.set({ airtmToken: cleanToken });

        broadcastToTradingApps({
            type: 'SYNC_AIRTM_TOKEN',
            token: cleanToken
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
