import React, { createContext, useState, useContext, useEffect } from 'react';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(true); // Modo oscuro por defecto

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  const theme = {
    background: 'var(--bg-main)',
    backgroundAlt: 'var(--bg-sidebar)',
    text: 'var(--text-main)',
    textSoft: 'var(--text-secondary)',
    inputBackground: darkMode ? 'bg-gray-700' : 'bg-gray-50',
    borderColor: 'var(--border-color)',
    tableHeaderBackground: darkMode ? 'bg-gray-700' : 'bg-gray-200',
    // Añadir más estilos según sea necesario
  };

  return (
    <ThemeContext.Provider value={{ darkMode, setDarkMode, theme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
