// background.js - v4.0 (Central Hub)
console.log('Central Hub v4.0 - Iniciado');

let lastKnownToken = null;
const tradingTabIds = new Set();

// 1. Manejo de Registro de Aplicaciones de Trading
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const tabId = sender.tab?.id;

    // Registro de la App de Trading
    if (message.type === 'APP_READY' && tabId) {
        tradingTabIds.add(tabId);
        console.log(`[Hub] App registrada: Tab ${tabId}. Total: ${tradingTabIds.size}`);

        // Si tenemos un token guardado, enviárselo de inmediato
        if (lastKnownToken) {
            chrome.tabs.sendMessage(tabId, { type: 'SYNC_AIRTM_TOKEN', token: lastKnownToken }).catch(() => {
                tradingTabIds.delete(tabId);
            });
        }
    }

    // Recepción de Operaciones desde la pestaña de Airtm
    if (message.type === 'AIRTM_NEW_OPERATION') {
        broadcastMessage({
            type: 'SYNC_AIRTM_OPERATION',
            operation: message.operation
        });
    }

    // Recepción de Token
    if (message.type === 'AIRTM_TOKEN_DETECTED') {
        lastKnownToken = message.token;
        broadcastMessage({ type: 'SYNC_AIRTM_TOKEN', token: message.token });
    }

    return true;
});

// Limpieza de pestañas cerradas
chrome.tabs.onRemoved.addListener((tabId) => {
    if (tradingTabIds.has(tabId)) {
        tradingTabIds.delete(tabId);
        console.log(`[Hub] App removida: Tab ${tabId}`);
    }
});

// 2. Difusión Inteligente
function broadcastMessage(data) {
    if (tradingTabIds.size === 0) {
        // Si no hay apps registradas, intentar buscarlas por URL como respaldo
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                const url = tab.url || "";
                if (url.includes('netlify.app') || url.includes('localhost') || url.includes('127.0.0.1')) {
                    tradingTabIds.add(tab.id);
                    chrome.tabs.sendMessage(tab.id, data).catch(() => tradingTabIds.delete(tab.id));
                }
            });
        });
        return;
    }

    tradingTabIds.forEach(tabId => {
        chrome.tabs.sendMessage(tabId, data).catch((err) => {
            console.warn(`[Hub] Fallo envío a Tab ${tabId}, re-verificando...`);
            tradingTabIds.delete(tabId);
        });
    });
}

// 3. Captura Directa de Red (Headers)
chrome.webRequest.onBeforeSendHeaders.addListener(
    (details) => {
        if (details.requestHeaders) {
            for (const header of details.requestHeaders) {
                if (header.name.toLowerCase() === 'authorization' && header.value.includes('Bearer')) {
                    const token = header.value.replace('Bearer ', '').trim();
                    if (token !== lastKnownToken) {
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
