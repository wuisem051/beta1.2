import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { getPaletteById, defaultPalette } from '../data/colorPalettes';

const ColorPaletteContext = createContext();

export const useColorPalette = () => {
    const context = useContext(ColorPaletteContext);
    if (!context) {
        throw new Error('useColorPalette must be used within ColorPaletteProvider');
    }
    return context;
};

export const ColorPaletteProvider = ({ children }) => {
    const [activePalette, setActivePalette] = useState(defaultPalette);
    const [loading, setLoading] = useState(true);

    // Aplicar variables CSS al documento
    const applyCSSVariables = (palette) => {
        const root = document.documentElement;

        // Colores principales
        root.style.setProperty('--accent', palette.accent);
        root.style.setProperty('--accent-dark', palette.accentDark);
        root.style.setProperty('--accent-light', palette.accentLight);
        root.style.setProperty('--accent-glow', palette.accentGlow);

        // Gradientes
        root.style.setProperty('--gradient-accent', palette.gradientAccent);
        root.style.setProperty('--gradient-blue', palette.gradientBlue);
        root.style.setProperty('--gradient-green', palette.gradientGreen);
        root.style.setProperty('--gradient-purple', palette.gradientPurple);
        root.style.setProperty('--gradient-red', palette.gradientRed);

        // Colores complementarios
        root.style.setProperty('--blue-link', palette.blue);
        root.style.setProperty('--green-check', palette.green);
        root.style.setProperty('--purple-accent', palette.purple);
        root.style.setProperty('--red-error', palette.red);

        // Fondos dinámicos
        root.style.setProperty('--bg-main', palette.bgMain);
        root.style.setProperty('--bg-sidebar', palette.bgSidebar);
        root.style.setProperty('--bg-card', palette.bgCard || 'rgba(30, 41, 59, 0.7)');
    };

    // Cargar paleta desde Firebase
    useEffect(() => {
        const settingsRef = doc(db, 'settings', 'colorPalette');

        const unsubscribe = onSnapshot(settingsRef,
            (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const paletteId = data.activePalette || 'sunset';
                    const palette = getPaletteById(paletteId);
                    setActivePalette(palette);
                    applyCSSVariables(palette);
                } else {
                    // Si no existe, crear con paleta por defecto
                    setDoc(settingsRef, { activePalette: 'sunset' }, { merge: true });
                    applyCSSVariables(defaultPalette);
                }
                setLoading(false);
            },
            (error) => {
                console.error('Error loading color palette:', error);
                applyCSSVariables(defaultPalette);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    // Cambiar paleta
    const changePalette = async (paletteId) => {
        try {
            const palette = getPaletteById(paletteId);
            const settingsRef = doc(db, 'settings', 'colorPalette');
            await setDoc(settingsRef, { activePalette: paletteId }, { merge: true });

            // La actualización se manejará automáticamente por el listener
            return { success: true };
        } catch (error) {
            console.error('Error changing palette:', error);
            return { success: false, error: error.message };
        }
    };

    const value = {
        activePalette,
        changePalette,
        loading,
    };

    return (
        <ColorPaletteContext.Provider value={value}>
            {children}
        </ColorPaletteContext.Provider>
    );
};
