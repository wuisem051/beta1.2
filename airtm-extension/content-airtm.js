// content-airtm.js - Detective v4.0 (Deep Interceptor)
console.log('%c [Airtm Sync] Detective v4.0 Active ', 'background: #2ecc71; color: #fff; font-weight: bold;');

// Función para buscar operaciones en CUALQUIER objeto JSON
function findOperations(obj, depth = 0) {
    if (depth > 5 || !obj || typeof obj !== 'object') return null;

    let found = [];

    // Si es un array, revisamos si sus elementos parecen operaciones
    if (Array.isArray(obj)) {
        if (obj.length > 0 && (obj[0].amount || obj[0].totalAmount || obj[0].uuid)) {
            return obj;
        }
        for (const item of obj) {
            const nested = findOperations(item, depth + 1);
            if (nested) found = found.concat(nested);
        }
    } else {
        // Si es un objeto, buscamos llaves sospechosas
        for (const key in obj) {
            if (key.toLowerCase().includes('operation') || key === 'nodes' || key === 'edges') {
                const nested = findOperations(obj[key], depth + 1);
                if (nested) found = found.concat(nested);
            } else if (typeof obj[key] === 'object') {
                const nested = findOperations(obj[key], depth + 1);
                if (nested) found = found.concat(nested);
            }
        }
    }
    return found.length > 0 ? found : null;
}

const originalFetch = window.fetch;
window.fetch = async (...args) => {
    try {
        const response = await originalFetch(...args);
        const url = args[0] ? (typeof args[0] === 'string' ? args[0] : (args[0].url || '')) : '';

        // Capture Token
        if (args[1]?.headers) {
            let auth = null;
            const h = args[1].headers;
            if (h instanceof Headers) auth = h.get('Authorization');
            else auth = h['Authorization'] || h['authorization'];

            if (auth?.includes('Bearer')) {
                window.postMessage({ type: 'AIRTM_Spy_Token', token: auth }, '*');
            }
        }

        // Deep Intercept
        if (url.includes('/graphql') || url.includes('/api/')) {
            const clone = response.clone();
            clone.json().then(data => {
                const ops = findOperations(data);
                if (ops && ops.length > 0) {
                    window.postMessage({ type: 'AIRTM_Spy_Data', operations: ops }, '*');
                }
            }).catch(() => { });
        }

        return response;
    } catch (err) {
        throw err;
    }
};

// Reinyección periódica del token si está en localStorage (fallback)
setInterval(() => {
    const session = localStorage.getItem('airtm:session');
    if (session) {
        try {
            const parsed = JSON.parse(session);
            if (parsed.token) {
                window.postMessage({ type: 'AIRTM_Spy_Token', token: parsed.token }, '*');
            }
        } catch (e) { }
    }
}, 5000);
