// background.js - v5.0 (Central Hub)
console.log('%c [Background] Hub Central v5.0 ONLINE ', 'color: #f1c40f; font-weight: bold;');

let lastKnownToken = null;
const tradingTabIds = new Set();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const tabId = sender.tab?.id;

    if (message.type === 'APP_READY' && tabId) {
        tradingTabIds.add(tabId);
        console.log(`[Hub] Registro: Tab ${tabId}. Total activas: ${tradingTabIds.size}`);

        // Enviar Token y PONG
        chrome.tabs.sendMessage(tabId, { type: 'CONNECTION_CONFIRMED' }).catch(() => { });
        if (lastKnownToken) {
            chrome.tabs.sendMessage(tabId, { type: 'SYNC_AIRTM_TOKEN', token: lastKnownToken }).catch(() => {
                tradingTabIds.delete(tabId);
            });
        }
    }

    if (message.type === 'AIRTM_NEW_OPERATION') {
        console.log(`[Hub] Relevando Op: ${message.operation.amount} USDC`);
        broadcastMessage({
            type: 'SYNC_AIRTM_OPERATION',
            operation: message.operation
        });
    }

    if (message.type === 'AIRTM_TOKEN_DETECTED') {
        const token = message.token.replace('Bearer ', '').trim();
        if (token !== lastKnownToken) {
            lastKnownToken = token;
            console.log('[Hub] Nuevo Token capturado');
            broadcastMessage({ type: 'SYNC_AIRTM_TOKEN', token: token });
        }
    }

    return true;
});

function broadcastMessage(data) {
    // Intentar siempre refrescar la lista de tabs por si el registro falló
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
            const url = tab.url || "";
            // Si coincide con el panel, intentar enviar aunque no esté registrado explícitamente
            if (url.includes('netlify.app') || url.includes('localhost') || url.includes('127.0.0.1')) {
                chrome.tabs.sendMessage(tab.id, data).catch(() => {
                    if (tradingTabIds.has(tab.id)) tradingTabIds.delete(tab.id);
                });
            }
        });
    });
}

// Escuchar peticiones de headers (Red Directa)
chrome.webRequest.onBeforeSendHeaders.addListener(
    (details) => {
        if (details.requestHeaders) {
            for (const header of details.requestHeaders) {
                if (header.name.toLowerCase() === 'authorization' && header.value.includes('Bearer')) {
                    const token = header.value.replace('Bearer ', '').trim();
                    if (token && token.length > 50 && token !== lastKnownToken) {
                        lastKnownToken = token;
                        broadcastMessage({ type: 'SYNC_AIRTM_TOKEN', token: token });
                    }
                }
            }
        }
    },
    { urls: ["https://app.airtm.com/*"] },
    ["requestHeaders"]
);
