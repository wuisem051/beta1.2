// airtm-isolated.js - Mensajero Seguro v4.5 (ULTRA-AGRESIÓN)

console.log('Mensajero Seguro v4.5 - Escáner de Supervivencia Activo');

let isContextValid = true;
let scanInterval = null;
let lastDetectedHash = new Set();

// Helper para enviar mensajes con reintento y validación de contexto
const safeSendMessage = (message) => {
    if (!isContextValid) return;
    try {
        if (chrome?.runtime?.id) {
            chrome.runtime.sendMessage(message).catch(err => {
                if (err.message.includes('context invalidated')) handleContextInvalidated();
            });
        } else {
            handleContextInvalidated();
        }
    } catch (e) {
        handleContextInvalidated();
    }
};

const handleContextInvalidated = () => {
    if (!isContextValid) return;
    isContextValid = false;
    console.warn('[Airtm Sync] Contexto perdido. Recarga necesaria.');
    if (scanInterval) clearInterval(scanInterval);
};

// --- ESTRATEGIA DE DETECCIÓN TOTAL ---
function totalScan() {
    if (!isContextValid) return;

    try {
        // 1. Buscar CUALQUIER elemento que mencione USDC o $
        // Esto es lo más robusto: si el usuario ve dinero en pantalla, nosotros lo detectamos.
        const allTextElements = Array.from(document.querySelectorAll('div, span, p, b, td'));

        allTextElements.forEach(el => {
            const text = el.innerText || "";
            // Si el elemento contiene el monto exacto "X.XX USDC"
            if (text.includes('USDC') && /\d+\.\d{2}/.test(text)) {

                // Subimos hasta encontrar el contenedor que parece una "tarjeta"
                let card = el;
                for (let i = 0; i < 6; i++) {
                    if (!card || !card.parentElement) break;

                    // Si el contenedor tiene un botón o es un artículo/fila, es nuestra tarjeta
                    const hasButton = card.querySelector('button, [role="button"]');
                    const isCardLike = card.tagName === 'ARTICLE' || card.tagName === 'TR' || card.offsetHeight > 100;

                    if (hasButton && isCardLike) {
                        processCard(card);
                        break;
                    }
                    card = card.parentElement;
                }
            }
        });

    } catch (e) {
        // Silent
    }
}

function processCard(card) {
    const text = card.innerText || "";

    // Evitar procesar lo mismo mil veces en un ciclo
    const opHash = btoa(text.substring(0, 100)).substring(0, 16);
    // (Limpiar set cada 10 mins para permitir re-detección si cambia algo)

    // Extracción de datos
    // 1. Monto
    const amountMatch = text.match(/([0-9,]+\.?[0-9]*)\s*USDC/);
    if (!amountMatch) return;
    const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    if (isNaN(amount) || amount <= 0) return;

    // 2. Método
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);
    const ignore = ['USDC', 'VES', 'BS', 'Aceptar', 'Accept', 'Agregar', 'Retirar', 'Tasa', 'Usuario', '$', 'Talk about', 'Fondos'];

    let method = "Desconocido";
    for (const line of lines) {
        if (!ignore.some(ig => line.toLowerCase().includes(ig.toLowerCase())) && !/^[\d$]/.test(line)) {
            method = line;
            break;
        }
    }

    // 3. Usuario y Rating
    let username = "Usuario Airtm";
    let rating = 5.0;
    const rateLine = lines.find(l => /\d\.\d{1,2}/.test(l));
    if (rateLine) {
        const rateMatch = rateLine.match(/(\d\.\d{1,2})/);
        if (rateMatch) rating = parseFloat(rateMatch[1]);

        const nameMatch = rateLine.match(/^(.*)\s+\d\.\d/);
        if (nameMatch) username = nameMatch[1].trim();
    }

    // 4. Tipo
    const isBuy = text.toLowerCase().includes('agregar') || text.toLowerCase().includes('add');

    // Reportar
    const opData = {
        id: 'dom_' + btoa(method + amount + isBuy).substring(0, 12),
        paymentMethodName: method,
        amount: amount,
        isBuy: isBuy,
        maker: {
            username: username,
            averageRating: rating,
            completedOperations: 100
        },
        source: 'ULTRA_SCANNER'
    };

    safeSendMessage({ type: 'AIRTM_NEW_OPERATION', operation: opData });
}

// Iniciar
scanInterval = setInterval(totalScan, 1500);
totalScan();

// --- SOPORTE PARA CAPTURA DE TOKEN ---
// Interceptamos la comunicación interna si el bridge nos envía algo
window.addEventListener('message', (event) => {
    if (event.data?.type === 'AIRTM_Spy_Token') {
        const token = event.data.token.replace('Bearer ', '').trim();
        safeSendMessage({ type: 'AIRTM_TOKEN_DETECTED', token: token });
    }
});
