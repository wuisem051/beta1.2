// airtm-isolated.js - v9.0 (Ultra-Survivor)
console.log('%c [Airtm Extension] v9.0 ACTIVATED ', 'background: #e67e22; color: #fff; font-weight: bold; padding: 5px;');

(function () {
    let seenIds = new Set();

    const send = (msg) => {
        try {
            chrome.runtime.sendMessage(msg).catch(() => { });
        } catch (e) { }
    };

    function ultraScan() {
        // 1. Buscar TODAS las cantidades que digan USDC
        const containers = Array.from(document.querySelectorAll('div, span, p, td, tr'))
            .filter(el => el.children.length === 0 && (el.innerText || "").includes('USDC'));

        containers.forEach(el => {
            // Subir hasta encontrar un contenedor que tenga el botón "Aceptar" cerca
            let card = el;
            let foundButton = null;
            let depth = 0;

            while (card && depth < 8) {
                const btn = card.querySelector('button, [role="button"]');
                if (btn) {
                    const bt = (btn.innerText || "").toLowerCase();
                    if (bt.includes('aceptar') || bt.includes('accept') || bt.includes('seleccionar')) {
                        foundButton = btn;
                        break;
                    }
                }
                card = card.parentElement;
                depth++;
            }

            if (card && foundButton) {
                processCard(card);
            }
        });
    }

    function processCard(card) {
        const text = card.innerText || "";

        // Extraer Monto
        const amountMatch = text.match(/([0-9,]+\.[0-9]{2})\s*USDC/i);
        if (!amountMatch) return;
        const amountStr = amountMatch[1].replace(/,/g, '');
        const amount = parseFloat(amountStr);
        if (!amount) return;

        // Extraer Método (Lógica mejorada)
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);
        let method = "Cajero Airtm";

        // Buscamos la primera línea que no sea un comando o un monto
        const ignoreList = ['USDC', 'ACEPTAR', 'ACCEPT', 'SELECCIONAR', 'AGREGAR', 'RETIRAR', 'ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC', '202'];

        for (const line of lines) {
            const upLine = line.toUpperCase();
            if (!ignoreList.some(ig => upLine.includes(ig)) && !line.includes('$') && !/\d{2,}/.test(line)) {
                method = line;
                break;
            }
        }

        const isBuy = text.toLowerCase().includes('agregar') || text.toLowerCase().includes('add');

        // ID Temporal para evitar spam en el mismo ciclo
        const tempId = `op_${amountStr}_${isBuy}_${method.substring(0, 5)}`.toLowerCase();
        if (seenIds.has(tempId)) return;
        seenIds.add(tempId);

        const opData = {
            id: tempId,
            method: method,
            paymentMethodName: method,
            amount: amount,
            isBuy: isBuy,
            userName: "Cajero Airtm",
            status: "Detectado",
            source: 'DOM_ULTRA_V9'
        };

        console.log(`%c [Detectado] ${method} - $${amount} `, 'background: #2ecc71; color: #fff; font-weight: bold;');
        send({ type: 'AIRTM_NEW_OPERATION', operation: opData });
    }

    // Escanear frecuentemente
    setInterval(ultraScan, 1200);

    // Limpiar memoria
    setInterval(() => seenIds.clear(), 30000);

    // También re-inyectar el token si es posible
    setInterval(() => {
        try {
            const session = localStorage.getItem('airtm:session');
            if (session) {
                const token = JSON.parse(session).token;
                if (token) send({ type: 'AIRTM_TOKEN_DETECTED', token: token });
            }
        } catch (e) { }
    }, 10000);
})();
