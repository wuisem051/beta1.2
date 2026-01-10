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
    },
};

// Función helper para obtener una paleta por ID
export const getPaletteById = (paletteId) => {
    return colorPalettes[paletteId] || colorPalettes.sunset;
};

// Función helper para obtener todas las paletas como array
export const getAllPalettes = () => {
    return Object.values(colorPalettes);
};

// Paleta por defecto
export const defaultPalette = colorPalettes.sunset;
