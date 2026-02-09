// airtm-isolated.js - v10.0 (MAX RELIABILITY)
console.log('%c [Airtm Extension] v10.0 ACTIVE ', 'background: #9b59b6; color: #fff; font-weight: bold; padding: 5px;');

(function () {
    let seenIds = new Set();

    const send = (msg) => {
        try {
            chrome.runtime.sendMessage(msg).catch(() => { });
        } catch (e) { }
    };

    // Escaner de supervivencia: No importa la estructura, importa el texto y el botón
    function scan() {
        // 1. Buscar botones de aceptar (Punto de ancla más seguro)
        const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
        const activeButtons = buttons.filter(btn => {
            const t = (btn.innerText || "").toLowerCase();
            return t.includes('aceptar') || t.includes('accept') || t.includes('seleccionar');
        });

        activeButtons.forEach(btn => {
            // Subir por el DOM hasta encontrar el contenedor que tiene el monto
            let card = btn.parentElement;
            let depth = 0;
            while (card && depth < 10) {
                const text = (card.innerText || "");
                if (text.includes('USDC') && (text.includes('$') || text.includes('VES') || text.includes('BS'))) {
                    extract(card, text);
                    break;
                }
                card = card.parentElement;
                depth++;
            }
        });
    }

    function extract(el, text) {
        try {
            // Regex para monto: más flexible (admite comas o puntos como separadores decimales/miles)
            // Captura: $61.32 o 61.32 USDC
            const amountMatch = text.match(/([0-9]{1,3}(?:[.,][0-9]{3})*[.,][0-9]{2})\s*USDC/i);
            if (!amountMatch) return;

            const amountRaw = amountMatch[1];
            // Normalizar monto (quitar comas de miles, asegurar punto decimal)
            const amount = parseFloat(amountRaw.replace(/,/g, ''));
            if (!amount || amount <= 0) return;

            // Extraer el método (primera línea significativa del contenedor)
            const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);
            let method = "Cajero Airtm";

            // Ignoramos palabras de sistema comunes
            const systemWords = ['AGREGAR', 'RETIRAR', 'FONDOS', 'ACEPTAR', 'ACCEPT', 'USDC', 'SOLICITUD', 'ESTADO', 'ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

            for (const line of lines) {
                const up = line.toUpperCase();
                // Si la línea no es del sistema, ni tiene números grandes (fechas/montos), es el banco
                if (!systemWords.some(w => up.includes(w)) && !line.includes('$') && !/\d{4}/.test(line)) {
                    method = line;
                    break;
                }
            }

            const isBuy = text.toLowerCase().includes('agregar') || text.toLowerCase().includes('add');

            // ID UNICO BASADO EN CONTENIDO (Previene duplicados en el mismo scan)
            const opId = `ext_${method}_${amount.toFixed(2)}_${isBuy}`.toLowerCase().replace(/\s/g, '');

            if (seenIds.has(opId)) return;
            seenIds.add(opId);

            const opData = {
                id: opId,
                method: method,
                paymentMethodName: method,
                amount: amount,
                isBuy: isBuy,
                status: "Detectado",
                maker: { username: "Explorador Airtm", averageRating: 5.0 },
                source: 'STABLE_DOM_V10'
            };

            console.log(`%c [Detectada] $${amount} via ${method} `, 'color: #9b59b6; font-weight: bold;');
            send({ type: 'AIRTM_NEW_OPERATION', operation: opData });

        } catch (e) {
            // Error silencioso
        }
    }

    // Intervalo de escaneo
    setInterval(scan, 1500);

    // Limpiar memoria de duplicados cada cierto tiempo para permitir que se detecte si vuelve a aparecer
    setInterval(() => seenIds.clear(), 10000);

    // Relé de red (Intercepción)
    window.addEventListener('message', (e) => {
        if (e.data?.type === 'AIRTM_Spy_Data' && e.data.operations) {
            e.data.operations.forEach(op => {
                send({ type: 'AIRTM_NEW_OPERATION', operation: op });
            });
        }
        if (e.data?.type === 'AIRTM_Spy_Token' && e.data.token) {
            send({ type: 'AIRTM_TOKEN_DETECTED', token: e.data.token });
        }
    });

})();
