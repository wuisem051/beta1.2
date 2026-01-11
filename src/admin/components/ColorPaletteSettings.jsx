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
        <div className="p-6 rounded-2xl shadow-xl space-y-8" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>
            <div className="flex justify-between items-center border-b border-slate-700 pb-4">
                <h2 className="text-3xl font-bold text-white flex items-center gap-2">
                    <span className="bg-amber-500/10 p-2 rounded-lg text-lg">🎨</span>
                    Personalización Global de Identidad
                </h2>
            </div>

            <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
                Define la atmósfera visual de la plataforma. Selecciona una paleta de colores preconfigurada que se aplicará instantáneamente a todos los elementos del User Panel, asegurando una experiencia de marca coherente.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allPalettes.map((palette) => {
                    const isActive = activePalette.id === palette.id;

                    return (
                        <div
                            key={palette.id}
                            className={`relative p-6 rounded-3xl border transition-all duration-500 group overflow-hidden ${isActive
                                ? 'border-blue-500 bg-slate-800 shadow-[0_0_30px_-10px_rgba(59,130,246,0.3)]'
                                : 'border-slate-700 bg-slate-900/40 hover:border-slate-500 hover:bg-slate-800/60'
                                }`}
                            onClick={() => !changing && handlePaletteChange(palette.id)}
                        >
                            {/* Glow Effect for active */}
                            {isActive && (
                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/20 blur-3xl rounded-full"></div>
                            )}

                            {/* Badge de activa */}
                            {isActive && (
                                <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-blue-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg animate-pulse">
                                    <span>●</span> Activa
                                </div>
                            )}

                            {/* Contenido principal */}
                            <div className="relative z-10 space-y-5">
                                <div className="flex items-center gap-3">
                                    <div className="text-4xl filter drop-shadow-sm group-hover:scale-110 transition-transform">{palette.emoji}</div>
                                    <div>
                                        <h3 className="text-lg font-black text-white group-hover:text-blue-400 transition-colors uppercase tracking-tight">
                                            {palette.name}
                                        </h3>
                                        <p className="text-[11px] text-slate-500 font-medium line-clamp-1">
                                            {palette.description}
                                        </p>
                                    </div>
                                </div>

                                {/* Preview de colores estilizada */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4 bg-slate-950/50 p-3 rounded-2xl border border-slate-800">
                                        <div
                                            className="w-14 h-14 rounded-xl shadow-inner border border-white/5"
                                            style={{ background: palette.gradientAccent }}
                                        />
                                        <div className="flex-1">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Color de Acento</p>
                                            <p className="text-xs font-mono text-slate-300 font-bold">{palette.accent}</p>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center px-1">
                                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">Variaciones del Sistema</span>
                                        <div className="flex gap-1.5">
                                            {[palette.gradientBlue, palette.gradientGreen, palette.gradientPurple, palette.gradientRed].map((grad, i) => (
                                                <div key={i} className="w-5 h-5 rounded-md border border-slate-700 shadow-sm" style={{ background: grad }} />
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Botón de selección UI experimental */}
                                {!isActive && (
                                    <button
                                        className="w-full py-3 rounded-xl font-black text-[11px] uppercase tracking-[0.2em] border border-slate-700 bg-slate-900 text-slate-400 hover:bg-blue-600 hover:text-white hover:border-transparent transition-all shadow-lg active:scale-95 disabled:opacity-50"
                                        disabled={changing}
                                    >
                                        {changing ? 'Sincronizando...' : 'Seleccionar Estilo'}
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Panel de información técnica */}
            <div className="bg-slate-900/40 p-8 rounded-3xl border border-slate-800 mt-10">
                <div className="flex items-start gap-4">
                    <div className="bg-blue-500/10 p-3 rounded-2xl text-blue-400 text-2xl">⚡</div>
                    <div>
                        <h3 className="text-lg font-black text-white mb-2 uppercase tracking-wide">Despliegue de Estilos en Tiempo Real</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2 text-sm text-slate-500">
                            <p className="flex items-center gap-2">
                                <span className="text-blue-500 text-xs font-bold">✓</span> Sincronización automática con Firebase Firestore
                            </p>
                            <p className="flex items-center gap-2">
                                <span className="text-blue-500 text-xs font-bold">✓</span> Propagación de tokens CSS a todos los usuarios activos
                            </p>
                            <p className="flex items-center gap-2">
                                <span className="text-blue-500 text-xs font-bold">✓</span> Preservación de legibilidad WCAG en todos los esquemas
                            </p>
                            <p className="flex items-center gap-2">
                                <span className="text-blue-500 text-xs font-bold">✓</span> Arquitectura basada en variables React Context
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ColorPaletteSettings;
