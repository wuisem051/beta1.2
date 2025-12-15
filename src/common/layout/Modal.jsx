import React, { useContext } from 'react';
import { ThemeContext } from '../../context/ThemeContext';

const Modal = ({ show, onClose, title, children }) => {
  const { theme, darkMode } = useContext(ThemeContext);

  if (!show) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className={`relative w-full max-w-md p-6 rounded-lg shadow-xl ${theme.backgroundAlt} ${theme.text}`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">{title}</h3>
          <button
            onClick={onClose}
            className={`text-gray-400 hover:text-gray-600 ${darkMode ? 'text-gray-300 hover:text-gray-100' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
