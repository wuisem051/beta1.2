import React, { createContext, useState, useContext, useEffect } from 'react';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(true); // Modo oscuro por defecto

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  const theme = {
    background: 'var(--bg-main)', // Usar variable de la paleta dinámica
    backgroundAlt: 'var(--bg-sidebar)', // Usar variable para elementos secundarios o sidebar
    text: darkMode ? 'text-white' : 'text-gray-900',
    textSoft: darkMode ? 'text-gray-300' : 'text-gray-600',
    inputBackground: darkMode ? 'bg-gray-700' : 'bg-gray-50',
    borderColor: darkMode ? 'border-gray-700' : 'border-gray-300',
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
