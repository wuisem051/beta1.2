// popup.js - Lógica del popup sin violar CSP
document.addEventListener('DOMContentLoaded', () => {
    // Actualizar UI al abrir popup
    chrome.storage.local.get(['airtmToken'], (res) => {
        if (res.airtmToken) {
            const statusBox = document.getElementById('airtm-status');
            if (statusBox) {
                statusBox.innerHTML = '<div class="dot active"></div> Sesión Detectada';
            }
        }
    });

    const syncBtn = document.getElementById('sync-btn');
    if (syncBtn) {
        syncBtn.addEventListener('click', () => {
            chrome.runtime.sendMessage({ type: 'FORCE_SYNC' });
            syncBtn.innerText = '¡Sincronizado!';
            syncBtn.style.background = '#02c076';
            syncBtn.style.color = 'white';
            setTimeout(() => {
                syncBtn.innerText = 'Sincronizar Ahora';
                syncBtn.style.background = '#fcd535';
                syncBtn.style.color = 'black';
            }, 2000);
        });
    }
});
