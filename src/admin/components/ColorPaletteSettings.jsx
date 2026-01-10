import React, { useState } from 'react';
import { useColorPalette } from '../../context/ColorPaletteContext';
import { getAllPalettes } from '../../data/colorPalettes';
import { useError } from '../../context/ErrorContext';

const ColorPaletteSettings = () => {
    const { activePalette, changePalette, loading } = useColorPalette();
    const { showSuccess, showError } = useError();
    const [changing, setChanging] = useState(false);

    const allPalettes = getAllPalettes();

    const handlePaletteChange = async (paletteId) => {
        setChanging(true);
        const result = await changePalette(paletteId);

        if (result.success) {
            showSuccess(`Paleta cambiada a ${allPalettes.find(p => p.id === paletteId)?.name}`);
        } else {
            showError('Error al cambiar la paleta de colores');
        }

        setChanging(false);
    };

    if (loading) {
        return (
            <div className="p-6 text-center">
                <p className="text-gray-500">Cargando paletas de colores...</p>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-8">
                <h2 className="text-3xl font-bold mb-2" style={{
                    background: 'var(--gradient-accent)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                }}>
                    🎨 Paletas de Colores
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                    Selecciona una paleta de colores para toda la aplicación. Los cambios se aplicarán en tiempo real.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allPalettes.map((palette) => {
                    const isActive = activePalette.id === palette.id;

                    return (
                        <div
                            key={palette.id}
                            className={`relative p-6 rounded-2xl border-2 transition-all duration-300 cursor-pointer ${isActive
                                    ? 'border-current shadow-2xl scale-105'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 hover:shadow-lg'
                                }`}
                            style={{
                                background: isActive
                                    ? `linear-gradient(135deg, ${palette.accent}15, ${palette.accentDark}10)`
                                    : 'var(--light-card)',
                                borderColor: isActive ? palette.accent : undefined
                            }}
                            onClick={() => !changing && handlePaletteChange(palette.id)}
                        >
                            {/* Badge de activa */}
                            {isActive && (
                                <div
                                    className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold text-white"
                                    style={{ background: palette.gradientAccent }}
                                >
                                    ✓ Activa
                                </div>
                            )}

                            {/* Emoji y nombre */}
                            <div className="mb-4">
                                <div className="text-4xl mb-2">{palette.emoji}</div>
                                <h3 className="text-xl font-bold mb-1" style={{ color: palette.accent }}>
                                    {palette.name}
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {palette.description}
                                </p>
                            </div>

                            {/* Preview de colores */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-12 h-12 rounded-lg shadow-md"
                                        style={{ background: palette.gradientAccent }}
                                    />
                                    <div className="flex-1">
                                        <p className="text-xs font-semibold text-gray-500">Accent</p>
                                        <p className="text-xs font-mono">{palette.accent}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-4 gap-2">
                                    <div
                                        className="h-8 rounded-md"
                                        style={{ background: palette.gradientBlue }}
                                        title="Blue"
                                    />
                                    <div
                                        className="h-8 rounded-md"
                                        style={{ background: palette.gradientGreen }}
                                        title="Green"
                                    />
                                    <div
                                        className="h-8 rounded-md"
                                        style={{ background: palette.gradientPurple }}
                                        title="Purple"
                                    />
                                    <div
                                        className="h-8 rounded-md"
                                        style={{ background: palette.gradientRed }}
                                        title="Red"
                                    />
                                </div>
                            </div>

                            {/* Botón de selección */}
                            {!isActive && (
                                <button
                                    className="mt-4 w-full py-2 px-4 rounded-lg font-bold text-white transition-all duration-200 hover:shadow-lg"
                                    style={{ background: palette.gradientAccent }}
                                    disabled={changing}
                                >
                                    {changing ? 'Aplicando...' : 'Seleccionar'}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Información adicional */}
            <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                <h3 className="text-lg font-bold mb-2 text-blue-900 dark:text-blue-100">
                    ℹ️ Información
                </h3>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <li>• Los cambios se aplican instantáneamente en toda la aplicación</li>
                    <li>• La paleta seleccionada se guarda automáticamente</li>
                    <li>• Todos los usuarios verán la misma paleta de colores</li>
                    <li>• Puedes cambiar la paleta en cualquier momento</li>
                </ul>
            </div>
        </div>
    );
};

export default ColorPaletteSettings;
