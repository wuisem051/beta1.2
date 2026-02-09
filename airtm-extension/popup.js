// popup.js - Mejoras visuales y de estado v2.1
document.addEventListener('DOMContentLoaded', () => {
    const airtmStatus = document.getElementById('airtm-status');
    const webStatus = document.getElementById('web-status');
    const syncBtn = document.getElementById('sync-btn');

    // 1. Revisar si tenemos el token
    chrome.storage.local.get(['airtmToken'], (res) => {
        if (res.airtmToken) {
            airtmStatus.innerHTML = '<div class="dot active"></div> Sesión Detectada';
        } else {
            airtmStatus.innerHTML = '<div class="dot inactive"></div> Desconectado';
        }
    });

    // 2. Verificar si hay alguna pestaña de la app abierta
    chrome.tabs.query({}, (tabs) => {
        const isAppOpen = tabs.some(tab =>
            tab.url && (tab.url.includes('netlify.app') || tab.url.includes('localhost') || tab.url.includes('127.0.0.1'))
        );

        if (isAppOpen) {
            webStatus.innerHTML = '<div class="dot active"></div> Sincronizado';
            webStatus.style.color = '#02c076'; // Verde esmeralda
        } else {
            webStatus.innerHTML = '<div class="dot inactive"></div> Esperando Web...';
            webStatus.style.color = '#f84960'; // Rojo
        }
    });

    // 3. Botón de Sincronización Forzada
    if (syncBtn) {
        syncBtn.addEventListener('click', () => {
            chrome.runtime.sendMessage({ type: 'FORCE_SYNC' });
            syncBtn.innerText = '¡Enviando Datos!';
            syncBtn.style.background = '#02c076';
            syncBtn.style.color = 'white';

            setTimeout(() => {
                syncBtn.innerText = 'Sincronizar Ahora';
                syncBtn.style.background = '#fcd535';
                syncBtn.style.color = 'black';
            }, 1000);
        });
    }
});
