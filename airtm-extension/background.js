// background.js - El cerebro de la extensión v1.3

// Al iniciar, intentar buscar el token en las cookies de Airtm
async function checkAirtmCookies() {
    try {
        const cookies = await chrome.cookies.getAll({ domain: "airtm.com" });
        // Buscamos cookies que parezcan tokens JWT
        for (const cookie of cookies) {
            if (cookie.value.includes('eyJ') && cookie.value.length > 50) {
                console.log('Token encontrado en Cookies');
                saveAndSyncToken(cookie.value);
                return;
            }
        }
    } catch (e) {
        console.error('Error leyendo cookies:', e);
    }
}

function saveAndSyncToken(token) {
    const cleanToken = token.replace('Bearer ', '').replace(/"/g, '').trim();
    chrome.storage.local.set({ airtmToken: cleanToken });

    broadcastToTradingApps({
        type: 'SYNC_AIRTM_TOKEN',
        token: cleanToken
    });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'AIRTM_TOKEN_DETECTED') {
        saveAndSyncToken(message.token);
    }

    if (message.type === 'FORCE_SYNC') {
        checkAirtmCookies(); // Re-revisar cookies al forzar
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

// Ejecutar check de cookies al cargar
checkAirtmCookies();
