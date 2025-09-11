import React, { createContext, useState, useContext, useEffect } from 'react';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode === 'true' ? true : false;
  });

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  const theme = {
    background: darkMode ? 'bg-gray-900' : 'bg-white',
    backgroundAlt: darkMode ? 'bg-gray-800' : 'bg-gray-100',
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
