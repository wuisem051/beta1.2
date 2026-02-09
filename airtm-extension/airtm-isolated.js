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

// --- 2. Escáner Universal (Agnóstico a Clases CSS) ---
function ultraScan() {
    if (!isContextValid) return;

    try {
        // SET: Evitar duplicados en el mismo ciclo de escaneo
        const foundIds = new Set();

        // --- ESTRATEGIA A: Búsqueda por Botones de Acción (Bottom-Up) ---
        // Ésta es la más efectiva para interfaces modernas basada en componentes (React/Vue)
        // Buscamos el botón "Aceptar" y subimos hasta encontrar el contexto de la operación.

        const allButtons = Array.from(document.querySelectorAll('button, [role="button"]'));
        const actionButtons = allButtons.filter(el => {
            const t = (el.innerText || "").toLowerCase();
            return t.includes('aceptar') || t.includes('accept') || t.includes('seleccionar') || t.includes('confirmar');
        });

        actionButtons.forEach(btn => {
            // Subir niveles buscando el contenedor principal
            let container = btn.parentElement;
            let operationData = null;

            // Buscamos hasta 7 niveles arriba
            for (let i = 0; i < 7; i++) {
                if (!container) break;

                const text = container.innerText || "";

                // Si el contenedor tiene indicaciones de moneda, es un fuerte candidato
                if (text.includes('USDC') || text.includes('Talk about amount')) { // 'Talk about amount' es raro, pero USDC es clave

                    // Intentamos extraer datos de este contenedor
                    const extracted = extractDataFromContainer(container, text);
                    if (extracted) {
                        operationData = extracted;
                        break; // Encontramos la tarjeta, dejamos de subir
                    }
                }
                container = container.parentElement;
            }

            if (operationData) {
                reportOp(operationData);
            }
        });

        // --- ESTRATEGIA B: Búsqueda por Tabla (Legacy/Fallback) ---
        const rows = document.querySelectorAll('tr, [role="row"]');
        rows.forEach(row => {
            const text = row.innerText || "";
            if ((text.includes('USDC') || text.includes('$')) && !text.includes('Completad') && !text.includes('Cancelad')) {
                const extracted = extractDataFromRow(row);
                if (extracted) {
                    reportOp(extracted);
                }
            }
        });

    } catch (e) {
        // Silent catch to prevent console flooding
    }
}

// Helper: Extraer datos de un contenedor genérico (Tarjeta)
function extractDataFromContainer(el, text) {
    // 1. Monto
    // Prioridad: "10.50 USDC" -> "$10.50"
    let amount = 0;
    const usdcMatch = text.match(/([0-9,]+\.?[0-9]*)\s*USDC/);
    if (usdcMatch) {
        amount = parseFloat(usdcMatch[1].replace(/,/g, ''));
    } else {
        const dollarMatch = text.match(/\$\s*([0-9,]+\.?[0-9]*)/);
        if (dollarMatch) amount = parseFloat(dollarMatch[1].replace(/,/g, ''));
    }

    if (!amount || amount <= 0) return null;

    // 2. Método de Pago
    // Heurística: Líneas de texto que NO son el monto, ni "USDC", ni "Aceptar", etc.
    let method = "Desconocido";
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);
    const ignore = ['USDC', 'VES', 'BS', 'Aceptar', 'Accept', 'Agregar', 'Retirar', 'Tasa', 'Siguiente', 'Anterior', 'Usuario', '$'];

    // Buscamos la línea más prometedora
    for (const line of lines) {
        if (!ignore.some(ig => line.includes(ig)) && !/^\d/.test(line)) {
            method = line;
            break; // Tomamos la primera línea válida como método (suele ser el título)
        }
    }

    // 3. Tipo (Compra/Venta)
    const isBuy = text.toLowerCase().includes('agregar') || text.toLowerCase().includes('add');

    // 4. Maker Info (Avatar/Name)
    let avatarUrl = null;
    const img = el.querySelector('img[src*="avatar"], img[src*="profile"]');
    if (img) avatarUrl = img.src;

    let rating = 5.0;
    const rateMatch = text.match(/(\d\.\d{1,2})\s*\u2605?/); // Busca número seguido opcionalmente de estrella
    if (rateMatch) rating = parseFloat(rateMatch[1]);

    return {
        id: 'card_' + btoa(method + amount).substring(0, 10),
        paymentMethodName: method,
        amount: amount,
        isBuy: isBuy,
        maker: {
            username: 'Usuario Airtm', // Difícil de extraer genéricamente sin clases
            avatarUrl: avatarUrl,
            averageRating: rating
        }
    };
}

// Helper: Extraer datos de una fila de tabla
function extractDataFromRow(row) {
    // Asumimos estructura estándar de tabla: [Método] [Monto] ... [Botón]
    try {
        const cells = row.querySelectorAll('td, [role="gridcell"]');
        if (cells.length < 3) return null;

        const method = cells[1].innerText.split('\n')[0].trim();
        const amountTxt = cells[2].innerText;
        const amount = parseFloat(amountTxt.replace(/[^0-9.]/g, ''));

        if (!amount) return null;

        return {
            id: 'row_' + btoa(method + amount).substring(0, 10),
            paymentMethodName: method,
            amount: amount,
            isBuy: true, // En tablas antiguas suele ser lista de "Agregar"
            maker: {
                username: 'Usuario Tabla',
                avatarUrl: null,
                averageRating: 5.0
            }
        };
    } catch (e) { return null; }
}

function reportOp(data) {
    const opData = {
        id: data.id,
        paymentMethodName: data.paymentMethodName,
        payment_method_name: data.paymentMethodName,
        grossAmount: data.amount,
        netAmount: data.amount,
        amount: data.amount,
        status: 'OPEN',
        profitPercentage: 2.2,
        source: 'DOM_UNIVERSAL',
        isBuy: data.isBuy,
        maker: {
            username: data.maker.username || 'Usuario Airtm',
            avatarUrl: data.maker.avatarUrl || null,
            averageRating: data.maker.averageRating || 5.0,
            completedOperations: 100
        }
    };
    safeSendMessage({ type: 'AIRTM_NEW_OPERATION', operation: opData });
}

// Intervalo de escaneo rápido (1s)
scanInterval = setInterval(ultraScan, 1000);
// Ejecución inicial
ultraScan();
