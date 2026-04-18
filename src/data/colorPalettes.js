// Paletas de colores predefinidas para la aplicación
export const colorPalettes = {
    sunset: {
        id: 'sunset',
        name: 'Sunset Orange',
        description: 'Cálido y energético - Ideal para trading y finanzas',
        emoji: '🌅',

        // Color principal
        accent: '#f59e0b',
        accentDark: '#d97706',
        accentLight: '#fbbf24',
        accentGlow: 'rgba(245, 158, 11, 0.2)',

        // Gradientes
        gradientAccent: 'linear-gradient(135deg, #f59e0b, #d97706)',
        gradientBlue: 'linear-gradient(135deg, #3b82f6, #2563eb)',
        gradientGreen: 'linear-gradient(135deg, #10b981, #059669)',
        gradientPurple: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
        gradientRed: 'linear-gradient(135deg, #ef4444, #dc2626)',

        // Colores complementarios
        blue: '#3b82f6',
        green: '#10b981',
        purple: '#8b5cf6',
        red: '#ef4444',

        // Fondos y Textos
        bgMain: 'var(--bg-main)',
        bgSidebar: 'var(--bg-main)',
        bgCard: 'var(--bg-card)',
        textMain: '#eaecef',
        textSecondary: '#848e9c',
        border: 'rgba(255, 255, 255, 0.05)',
    },

    ocean: {
        id: 'ocean',
        name: 'Ocean Blue',
        description: 'Profesional y confiable - Perfecto para tecnología',
        emoji: '🌊',

        accent: '#0ea5e9',
        accentDark: '#0284c7',
        accentLight: '#38bdf8',
        accentGlow: 'rgba(14, 165, 233, 0.2)',

        gradientAccent: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
        gradientBlue: 'linear-gradient(135deg, #06b6d4, #0891b2)',
        gradientGreen: 'linear-gradient(135deg, #14b8a6, #0d9488)',
        gradientPurple: 'linear-gradient(135deg, #6366f1, #4f46e5)',
        gradientRed: 'linear-gradient(135deg, #f43f5e, #e11d48)',

        blue: '#06b6d4',
        green: '#14b8a6',
        purple: '#6366f1',
        red: '#f43f5e',

        // Fondos (Tonos Azulados)
        bgMain: '#040d1a',
        bgSidebar: 'rgba(7, 20, 38, 0.95)',
        bgCard: 'rgba(15, 35, 60, 0.4)',
        textMain: '#e0f2fe',
        textSecondary: '#7dd3fc',
        border: 'rgba(14, 165, 233, 0.1)',
    },

    forest: {
        id: 'forest',
        name: 'Forest Green',
        description: 'Crecimiento y estabilidad - Natural y fresco',
        emoji: '🌲',

        accent: '#10b981',
        accentDark: '#059669',
        accentLight: '#34d399',
        accentGlow: 'rgba(16, 185, 129, 0.2)',

        gradientAccent: 'linear-gradient(135deg, #10b981, #059669)',
        gradientBlue: 'linear-gradient(135deg, #14b8a6, #0d9488)',
        gradientGreen: 'linear-gradient(135deg, #22c55e, #16a34a)',
        gradientPurple: 'linear-gradient(135deg, #84cc16, #65a30d)',
        gradientRed: 'linear-gradient(135deg, #f59e0b, #d97706)',

        blue: '#14b8a6',
        green: '#22c55e',
        purple: '#84cc16',
        red: '#f59e0b',

        // Fondos (Tonos Verdosos)
        bgMain: '#02120b',
        bgSidebar: 'rgba(4, 25, 16, 0.95)',
        bgCard: 'rgba(10, 40, 25, 0.4)',
        textMain: '#ecfdf5',
        textSecondary: '#6ee7b7',
        border: 'rgba(16, 185, 129, 0.1)',
    },

    purple: {
        id: 'purple',
        name: 'Purple Dream',
        description: 'Creatividad y lujo - Innovador y premium',
        emoji: '💜',

        accent: '#a855f7',
        accentDark: '#9333ea',
        accentLight: '#c084fc',
        accentGlow: 'rgba(168, 85, 247, 0.2)',

        gradientAccent: 'linear-gradient(135deg, #a855f7, #9333ea)',
        gradientBlue: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
        gradientGreen: 'linear-gradient(135deg, #10b981, #059669)',
        gradientPurple: 'linear-gradient(135deg, #d946ef, #c026d3)',
        gradientRed: 'linear-gradient(135deg, #ec4899, #db2777)',

        blue: '#8b5cf6',
        green: '#10b981',
        purple: '#d946ef',
        red: '#ec4899',

        // Fondos (Tonos Púrpuras)
        bgMain: '#0b0214',
        bgSidebar: 'rgba(20, 4, 38, 0.95)',
        bgCard: 'rgba(35, 15, 60, 0.4)',
        textMain: '#faf5ff',
        textSecondary: '#d8b4fe',
        border: 'rgba(168, 85, 247, 0.1)',
    },

    gold: {
        id: 'gold',
        name: 'Crypto Gold',
        description: 'Riqueza y exclusividad - Lujo y prestigio',
        emoji: '🪙',

        accent: '#eab308',
        accentDark: '#ca8a04',
        accentLight: '#facc15',
        accentGlow: 'rgba(234, 179, 8, 0.2)',

        gradientAccent: 'linear-gradient(135deg, #eab308, #ca8a04)',
        gradientBlue: 'linear-gradient(135deg, #f59e0b, #d97706)',
        gradientGreen: 'linear-gradient(135deg, #84cc16, #65a30d)',
        gradientPurple: 'linear-gradient(135deg, #f97316, #ea580c)',
        gradientRed: 'linear-gradient(135deg, #ef4444, #dc2626)',

        blue: '#f59e0b',
        green: '#84cc16',
        purple: '#f97316',
        red: '#ef4444',

        // Fondos (Elegante Oscuro)
        bgMain: '#09090b',
        bgSidebar: 'rgba(18, 18, 22, 0.95)',
        bgCard: 'rgba(35, 35, 40, 0.4)',
        textMain: '#fefce8',
        textSecondary: '#fde047',
        border: 'rgba(234, 179, 8, 0.1)',
    },

    ruby: {
        id: 'ruby',
        name: 'Ruby Red',
        description: 'Pasión y poder - Audaz y dinámico',
        emoji: '❤️',

        accent: '#ef4444',
        accentDark: '#dc2626',
        accentLight: '#f87171',
        accentGlow: 'rgba(239, 68, 68, 0.2)',

        gradientAccent: 'linear-gradient(135deg, #ef4444, #dc2626)',
        gradientBlue: 'linear-gradient(135deg, #ec4899, #db2777)',
        gradientGreen: 'linear-gradient(135deg, #f59e0b, #d97706)',
        gradientPurple: 'linear-gradient(135deg, #a855f7, #9333ea)',
        gradientRed: 'linear-gradient(135deg, #f43f5e, #e11d48)',

        blue: '#ec4899',
        green: '#f59e0b',
        purple: '#a855f7',
        red: '#f43f5e',

        // Fondos (Tonos Rojizos)
        bgMain: '#0c0101',
        bgSidebar: 'rgba(25, 4, 4, 0.95)',
        bgCard: 'rgba(50, 10, 10, 0.4)',
        textMain: '#fef2f2',
        textSecondary: '#fca5a5',
        border: 'rgba(239, 68, 68, 0.1)',
    },

    midnight: {
        id: 'midnight',
        name: 'Midnight Neon',
        description: 'Cyberpunk style - Estilo nocturno futurista',
        emoji: '🏙️',

        accent: '#f0abfc',
        accentDark: '#d946ef',
        accentLight: '#f5d0fe',
        accentGlow: 'rgba(240, 171, 252, 0.2)',

        gradientAccent: 'linear-gradient(135deg, #f0abfc, #d946ef)',
        gradientBlue: 'linear-gradient(135deg, #22d3ee, #0891b2)',
        gradientGreen: 'linear-gradient(135deg, #34d399, #059669)',
        gradientPurple: 'linear-gradient(135deg, #818cf8, #4f46e5)',
        gradientRed: 'linear-gradient(135deg, #fb7185, #e11d48)',

        blue: '#22d3ee',
        green: '#34d399',
        purple: '#818cf8',
        red: '#fb7185',

        bgMain: '#0f0716',
        bgSidebar: 'rgba(24, 12, 35, 0.95)',
        bgCard: 'rgba(40, 20, 60, 0.4)',
        textMain: '#fdf4ff',
        textSecondary: '#f5d0fe',
        border: 'rgba(217, 70, 239, 0.1)',
    },

    matrix: {
        id: 'matrix',
        name: 'The Matrix',
        description: 'Hacker mode - Negro absoluto y verde digital',
        emoji: '📟',

        accent: '#22c55e',
        accentDark: '#16a34a',
        accentLight: '#4ade80',
        accentGlow: 'rgba(34, 197, 94, 0.3)',

        gradientAccent: 'linear-gradient(135deg, #22c55e, #15803d)',
        gradientBlue: 'linear-gradient(135deg, #4d7c0f, #3f6212)',
        gradientGreen: 'linear-gradient(135deg, #22c55e, #16a34a)',
        gradientPurple: 'linear-gradient(135deg, #166534, #14532d)',
        gradientRed: 'linear-gradient(135deg, #b91c1c, #991b1b)',

        blue: '#4d7c0f',
        green: '#22c55e',
        purple: '#166534',
        red: '#b91c1c',

        bgMain: '#000000',
        bgSidebar: 'rgba(0, 0, 0, 0.98)',
        bgCard: 'rgba(5, 40, 5, 0.6)',
        textMain: '#4ade80',
        textSecondary: '#16a34a',
        border: 'rgba(34, 197, 94, 0.3)',
    },

    steel: {
        id: 'steel',
        name: 'Steel Tech',
        description: 'Industrial y moderno - Gris acero y azul frío',
        emoji: '🛡️',

        accent: '#94a3b8',
        accentDark: '#475569',
        accentLight: '#cbd5e1',
        accentGlow: 'rgba(148, 163, 184, 0.2)',

        gradientAccent: 'linear-gradient(135deg, #94a3b8, #475569)',
        gradientBlue: 'linear-gradient(135deg, #64748b, #334155)',
        gradientGreen: 'linear-gradient(135deg, #10b981, #059669)',
        gradientPurple: 'linear-gradient(135deg, #6366f1, #4f46e5)',
        gradientRed: 'linear-gradient(135deg, #ef4444, #dc2626)',

        blue: '#64748b',
        green: '#10b981',
        purple: '#6366f1',
        red: '#ef4444',

        bgMain: '#1e293b',
        bgSidebar: 'rgba(30, 41, 59, 0.98)',
        bgCard: 'rgba(30, 41, 59, 0.7)',
        textMain: '#f1f5f9',
        textSecondary: '#94a3b8',
        border: '#475569',
    },

    arctic: {
        id: 'arctic',
        name: 'Arctic Frost',
        description: 'Limpio y claro - Modo claro de alta fidelidad',
        emoji: '❄️',

        // Color principal - Azul vibrante para modo claro
        accent: '#3b82f6',
        accentDark: '#2563eb',
        accentLight: '#60a5fa',
        accentGlow: 'rgba(59, 130, 246, 0.1)',

        gradientAccent: 'linear-gradient(135deg, #3b82f6, #2563eb)',
        gradientBlue: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
        gradientGreen: 'linear-gradient(135deg, #10b981, #059669)',
        gradientPurple: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
        gradientRed: 'linear-gradient(135deg, #ef4444, #dc2626)',

        blue: '#3b82f6',
        green: '#10b981',
        purple: '#8b5cf6',
        red: '#ef4444',

        // Fondos Claros (Reestructurados)
        bgMain: '#f1f5f9', // Slate 100
        bgSidebar: '#ffffff', // Pure White
        bgCard: '#ffffff', // Pure White
        textMain: '#0f172a', // Slate 900
        textSecondary: '#64748b', // Slate 500
        border: '#e2e8f0', // Slate 200
    },

    emerald_night: {
        id: 'emerald_night',
        name: 'Emerald Night',
        description: 'Elegante y místico - Verde profundo y oscuro',
        emoji: '💎',

        accent: '#10b981',
        accentDark: '#047857',
        accentLight: '#34d399',
        accentGlow: 'rgba(16, 185, 129, 0.2)',

        gradientAccent: 'linear-gradient(135deg, #10b981, #064e3b)',
        gradientBlue: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
        gradientGreen: 'linear-gradient(135deg, #10b981, #059669)',
        gradientPurple: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
        gradientRed: 'linear-gradient(135deg, #ef4444, #b91c1c)',

        blue: '#3b82f6',
        green: '#10b981',
        purple: '#8b5cf6',
        red: '#ef4444',

        bgMain: '#022c22',
        bgSidebar: 'rgba(6, 78, 59, 0.98)',
        bgCard: 'rgba(10, 80, 60, 0.4)',
        textMain: '#ecfdf5',
        textSecondary: '#6ee7b7',
        border: 'rgba(16, 185, 129, 0.2)',
    },

    carbon: {
        id: 'carbon',
        name: 'Pure Carbon',
        description: 'Minimalista y sobrio - Escala de grises perfecta',
        emoji: '⚫',

        accent: '#ffffff',
        accentDark: '#a3a3a3',
        accentLight: '#f5f5f5',
        accentGlow: 'rgba(255, 255, 255, 0.1)',

        gradientAccent: 'linear-gradient(135deg, #525252, #171717)',
        gradientBlue: 'linear-gradient(135deg, #404040, #262626)',
        gradientGreen: 'linear-gradient(135deg, #404040, #262626)',
        gradientPurple: 'linear-gradient(135deg, #404040, #262626)',
        gradientRed: 'linear-gradient(135deg, #dc2626, #991b1b)',

        blue: '#ffffff',
        green: '#ffffff',
        purple: '#ffffff',
        red: '#dc2626',

        bgMain: '#0a0a0a',
        bgSidebar: 'rgba(18, 18, 18, 0.98)',
        bgCard: 'rgba(30, 30, 30, 0.6)',
        textMain: '#ffffff',
        textSecondary: '#a3a3a3',
        border: '#262626',
    },
    bitunix: {
        id: 'bitunix',
        name: 'Bitunix Premium',
        description: 'Diseño oficial de Bitunix - Oscuro con acentos lima vibrantes',
        emoji: '🟢',

        accent: '#c1ff2e',
        accentDark: '#a3d927',
        accentLight: '#d3ff6e',
        accentGlow: 'rgba(193, 255, 46, 0.2)',

        gradientAccent: 'linear-gradient(135deg, #c1ff2e, #a3d927)',
        gradientBlue: 'linear-gradient(135deg, #3b82f6, #2563eb)',
        gradientGreen: 'linear-gradient(135deg, #c1ff2e, #10b981)',
        gradientPurple: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
        gradientRed: 'linear-gradient(135deg, #ef4444, #dc2626)',

        blue: '#3b82f6',
        green: '#c1ff2e',
        purple: '#8b5cf6',
        red: '#ef4444',

        bgMain: '#000000',
        bgSidebar: '#000000',
        bgCard: '#14151a',
        textMain: '#ffffff',
        textSecondary: '#848e9c',
        border: 'rgba(255, 255, 255, 0.05)',
    },
};

// Función helper para obtener una paleta por ID
export const getPaletteById = (paletteId) => {
    return colorPalettes[paletteId] || colorPalettes.bitunix;
};

// Función helper para obtener todas las paletas como array
export const getAllPalettes = () => {
    return Object.values(colorPalettes);
};

// Paleta por defecto
export const defaultPalette = colorPalettes.bitunix;
