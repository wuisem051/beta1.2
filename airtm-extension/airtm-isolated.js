// airtm-isolated.js - v8.5 (Smart Extractor)
console.log('%c [Airtm Extension] v8.5 ONLINE ', 'background: #27ae60; color: #fff; font-weight: bold; padding: 5px;');

// Detener ejecución si no es el frame principal (evitar duplicados por iframes)
if (window.self !== window.top) {
    // A veces Airtm pone la tabla en un iframe, solo permitimos si tiene el tamaño suficiente
    if (window.innerWidth < 300) {
        console.log('[Extension] Frame pequeño ignorado.');
        // return; // No podemos usar return en el top level fuera de un module sin asustar al linter, pero podemos envolver
    }
}

(function () {
    let seenIds = new Set();
    let isContextValid = true;

    const sendToBackground = (msg) => {
        if (!isContextValid) return;
        try {
            chrome.runtime.sendMessage(msg).catch(() => { isContextValid = false; });
        } catch (e) { isContextValid = false; }
    };

    function scan() {
        if (!isContextValid) return;

        // Buscar contenedores que parezcan tarjetas de operación
        // Airtm usa mucho div, buscamos por texto clave
        const actionButtons = Array.from(document.querySelectorAll('button, [role="button"]'))
            .filter(btn => {
                const t = (btn.innerText || "").toLowerCase();
                return t.includes('aceptar') || t.includes('accept') || t.includes('seleccionar');
            });

        actionButtons.forEach(btn => {
            let container = btn.parentElement;
            let depth = 0;
            while (container && depth < 12) {
                const text = container.innerText || "";
                if (text.includes('USDC') && (text.includes('$') || text.includes('VES') || text.includes('BS'))) {
                    extractData(container, text);
                    break;
                }
                container = container.parentElement;
                depth++;
            }
        });
    }

    function extractData(el, fullText) {
        try {
            const lines = fullText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

            // 1. Encontrar el monto
            let amount = 0;
            let amountLineIndex = -1;
            for (let i = 0; i < lines.length; i++) {
                const match = lines[i].match(/([0-9,]+\.[0-9]{2})\s*USDC/i);
                if (match) {
                    amount = parseFloat(match[1].replace(/,/g, ''));
                    amountLineIndex = i;
                    break;
                }
            }

            if (!amount || amountLineIndex === -1) return;

            // 2. Extraer el Método de Pago
            // El método de pago suele estar 1 o 2 líneas ANTES del monto
            let method = "Cajero Airtm";
            const suspiciousKeywords = ['AGREGAR', 'RETIRAR', 'FONDOS', 'ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC', '2024', '2025', '2026'];

            for (let i = amountLineIndex - 1; i >= 0; i--) {
                const line = lines[i];
                const upper = line.toUpperCase();
                // Si la línea no es una palabra clave de sistema y tiene longitud, es el método
                if (line.length > 3 && !suspiciousKeywords.some(key => upper.includes(key)) && !line.includes('$')) {
                    method = line;
                    break;
                }
            }

            // 3. Determinar si es Compra o Venta
            const isBuy = fullText.toLowerCase().includes('agregar') || fullText.toLowerCase().includes('add');

            // 4. Extraer el monto local (ej: VES 49,13)
            let localAmount = 0;
            let localCurrency = "USDC";
            const localMatch = fullText.match(/(VES|BS|USD|COP|ARS|ARSB)\s*([0-9,]+\.[0-9]{2})/i);
            if (localMatch) {
                localCurrency = localMatch[1].toUpperCase();
                localAmount = parseFloat(localMatch[2].replace(/,/g, ''));
            }

            // Generar ID único basado en contenido
            // Limpiamos el método de caracteres raros para el ID
            const cleanMethod = method.replace(/[^a-zA-Z]/g, '').substring(0, 10);
            const opId = `air_${cleanMethod}_${amount.toFixed(2)}_${isBuy}`.toLowerCase();

            if (seenIds.has(opId)) return;
            seenIds.add(opId);

            const opData = {
                id: opId,
                method: method,
                paymentMethodName: method,
                amount: amount,
                isBuy: isBuy,
                localAmount: localAmount,
                localCurrency: localCurrency,
                userName: "Cajero Airtm",
                userRating: 5.0,
                userTxns: 0,
                source: 'DOM_EXTRACT_V85'
            };

            console.log(`%c [Airtm] Detectado: ${method} ($${amount}) `, 'background: #27ae60; color: #fff; border-radius: 2px;');
            sendToBackground({ type: 'AIRTM_NEW_OPERATION', operation: opData });

        } catch (e) {
            console.error('[Extension] Error en extracción:', e);
        }
    }

    setInterval(scan, 1500);
    setInterval(() => seenIds.clear(), 300000); // Limpiar cada 5 min para permitir re-detección si la página se refresca
})();
