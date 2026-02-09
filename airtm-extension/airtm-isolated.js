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
                if (moneyMatch) amount = parseFloat(moneyMatch[1].replace(/,/g, ''));
            }

            if (amount === 0) return;

            // 2. Determinar Tipo (Compra/Venta)
            // "Agregar fondos" -> El usuario agrega, nosotros le damos USDC? No.
            // Si dice "Agregar fondos" en la UI de cajero, significa que hay una solicitud de "Agregar".
            // El cajero (nosotros) "Acepta".
            // isBuy = true (generalmente asociado a verde/entrada).
            const isBuy = text.toLowerCase().includes('agregar') || text.toLowerCase().includes('add');

            // 3. Extraer Método
            // Heurística mejorada: Buscar líneas que no sean montos ni etiquetas
            let method = "Desconocido";
            const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);

            // Intentar encontrar el banco/método
            // Suele ser la línea más destacada que no es USDC
            const blockedWords = ['USDC', 'VES', 'BS', 'Aceptar', 'Agregar', 'Retirar', 'Fondos', 'Tasa', 'Rate', 'Usuario'];
            for (let line of lines) {
                if (!blockedWords.some(w => line.includes(w)) && !line.match(/^\d/)) {
                    method = line;
                    break;
                }
            }

            // 4. Extraer Usuario (Avatar, Nombre, Rating)
            // Buscar imagen dentro de la tarjeta que no sea bandera (svg quizas)
            // A veces el avatar es un img tag con clase 'avatar' o similar
            let userAvatar = null;
            const imgs = card.querySelectorAll('img');
            imgs.forEach(img => {
                if (img.src && (img.src.includes('avatar') || img.src.includes('profile'))) {
                    userAvatar = img.src;
                }
            });

            // Nombre de usuario: suele estar cerca del rating
            let userName = "Usuario Airtm";
            // Rating
            let userRating = 5.0;
            const ratingMatch = text.match(/(\d\.\d{1,2})/); // 4.98
            if (ratingMatch) userRating = parseFloat(ratingMatch[1]);

            // Construct Op Data matching React UI
            const rowId = 'dom_' + btoa(method + amount + isBuy).substring(0, 10);

            const opData = {
                id: rowId,
                paymentMethodName: method,
                // Frontend expects 'paymentMethod' object sometimes or flat props
                payment_method_name: method,
                amount: amount,
                netAmount: amount, // Backup
                grossAmount: amount, // Backup
                status: 'OPEN',
                profitPercentage: 2.5, // Fake default for DOM ops
                isBuy: isBuy,
                source: 'DOM_ULTRA_SCAN',
                // Maker details for UI
                maker: {
                    username: userName,
                    avatarUrl: userAvatar,
                    averageRating: userRating,
                    completedOperations: 100 // Placeholder
                }
            };

            safeSendMessage({ type: 'AIRTM_NEW_OPERATION', operation: opData });
        });

    } catch (e) {
        // Silent
    }
}

// Escanear constantemente
scanInterval = setInterval(ultraScan, 1000);
ultraScan();
