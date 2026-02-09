// airtm-isolated.js - Mensajero Seguro v4.1 (World ISOLATED - Context Safe)

console.log('Mensajero Seguro v4.1 conectado');

let isContextValid = true;
let scanInterval = null;

// Helper function to safely send messages
const safeSendMessage = (message) => {
    if (!isContextValid) return;

    try {
        if (chrome && chrome.runtime && chrome.runtime.id) {
            chrome.runtime.sendMessage(message).catch(err => {
                if (err.message.includes('Extension context invalidated')) {
                    handleContextInvalidated();
                }
            });
        } else {
            handleContextInvalidated();
        }
    } catch (e) {
        if (e.message.includes('Extension context invalidated')) {
            handleContextInvalidated();
        }
    }
};

const handleContextInvalidated = () => {
    if (!isContextValid) return;
    isContextValid = false;
    console.warn('[Airtm Sync] Extensión actualizada. Recarga la página para reconectar.');
    if (scanInterval) clearInterval(scanInterval);
    // Remove listeners if possible, though reloading page is best
};

// --- 1. Escuchar al Agente Espía ---
window.addEventListener('message', (event) => {
    if (!isContextValid) return;

    // Escuchar mensajes del Agente Espía (World: MAIN)
    if (event.data) {
        if (event.data.type === 'AIRTM_Spy_Data' && event.data.operations) {
            const ops = event.data.operations;
            if (Array.isArray(ops)) {
                ops.forEach(op => {
                    safeSendMessage({ type: 'AIRTM_NEW_OPERATION', operation: op });
                });
            }
        }

        if (event.data.type === 'AIRTM_Spy_Token' && event.data.token) {
            const cleanToken = event.data.token.replace('Bearer ', '').trim();
            safeSendMessage({ type: 'AIRTM_TOKEN_DETECTED', token: cleanToken });
        }
    }
});

// --- 2. Escáner Ultra-Agresivo (Soporte Dual: Tabla y Tarjetas) ---
function ultraScan() {
    if (!isContextValid) return;

    try {
        // B. ESCÁNER DE TARJETAS (NUEVA UI AIRTM)
        // Este es el layout más común ahora.
        // Buscamos contenedores que parezcan tarjetas de operación
        // Estrategia: Buscar elementos que contengan "USDC" y un botón "Aceptar" o "Seleccionar"

        // select all articles or divs that might be cards
        const cards = document.querySelectorAll('div[class*="Card"], article, div[class*="operation-card"]');

        // Fallback: search for buttons and go up
        const buttons = Array.from(document.querySelectorAll('button'));
        const relevantButtons = buttons.filter(b => {
            const t = b.innerText.toLowerCase();
            return t.includes('aceptar') || t.includes('accept') || t.includes('seleccionar');
        });

        // Combine sets
        const candidates = new Set([...cards]);
        relevantButtons.forEach(btn => {
            const card = btn.closest('div[class*="Card"], article');
            if (card) candidates.add(card);
        });

        candidates.forEach(card => {
            if (!card.innerText) return;
            const text = card.innerText;

            // Filtro básico
            if (!text.includes('USDC') && !text.includes('$')) return;

            // 1. Extraer Monto
            // Buscamos el patrón: + $15.83 USDC o $15.83
            let amount = 0;
            const amountMatch = text.match(/([0-9,.]+)\s*USDC/);
            if (amountMatch) {
                amount = parseFloat(amountMatch[1].replace(/,/g, ''));
            } else {
                const moneyMatch = text.match(/\$\s*([0-9,.]+)/);
                const moneyMatch = text.match(/\$\s*([0-9,.]+)/);
                if (moneyMatch) amount = parseFloat(moneyMatch[1].replace(/,/g, ''));
            }

            if (!amount || amount === 0) return;

            // 2. Determinar Tipo
            const isBuy = text.toLowerCase().includes('agregar') || text.toLowerCase().includes('add') || text.toLowerCase().includes('compra');

            // 3. Extraer Método
            let method = "Desconocido";
            const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);
            const blockedWords = ['USDC', 'VES', 'BS', 'Aceptar', 'Agregar', 'Retirar', 'Fondos', 'Tasa', 'Rate', 'Usuario', 'No disponible'];

            for (let line of lines) {
                // Heurística: El método suele ser texto corto, sin números al inicio
                if (!blockedWords.some(w => line.includes(w)) && !line.match(/^\d/)) {
                    method = line;
                    break;
                }
            }

            // 4. Datos del Usuario
            let userName = "Usuario Airtm";
            let userAvatar = null;
            let userRating = 5.0;

            // Avatar por imagen
            const imgs = card.querySelectorAll('img');
            imgs.forEach(img => {
                if (img.src && (img.src.includes('avatar') || img.src.includes('profile') || img.src.includes('user'))) {
                    userAvatar = img.src;
                }
            });

            // Rating
            const ratingMatch = text.match(/(\d\.\d{1,2})/);
            if (ratingMatch) userRating = parseFloat(ratingMatch[1]);

            // Si el método parece un nombre de banco largo, a veces el usuario es la siguiente línea
            // Por simplicidad, dejamos "Usuario Airtm" si no es obvio

            reportOp(method, amount, 'CARD', isBuy, {
                username: userName,
                avatarUrl: userAvatar,
                averageRating: userRating
            });
        });

    } catch (e) {
        // Silent
    }
}

function reportOp(method, amount, source, isBuy, makerUpdates = {}) {
    const rowId = 'dom_' + btoa(method + amount + isBuy).substring(0, 10);
    const opData = {
        id: rowId,
        paymentMethodName: method,
        payment_method_name: method, // Redundancia
        grossAmount: amount,
        netAmount: amount,
        amount: amount,
        status: 'OPEN',
        profitPercentage: 2.2,
        source: 'DOM_' + source,
        isBuy: isBuy,
        maker: {
            username: makerUpdates.username || 'Usuario Airtm',
            avatarUrl: makerUpdates.avatarUrl || null,
            averageRating: makerUpdates.averageRating || 5.0,
            completedOperations: 100
        }
    };
    safeSendMessage({ type: 'AIRTM_NEW_OPERATION', operation: opData });
}

// Escanear constantemente
scanInterval = setInterval(ultraScan, 1000);
ultraScan();
