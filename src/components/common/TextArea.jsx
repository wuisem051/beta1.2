import React, { useContext } from 'react';
import { ThemeContext } from '../../context/ThemeContext';

const TextArea = ({ label, id, placeholder, value, onChange, rows = 6, className = '', ...props }) => {
  const { darkMode } = useContext(ThemeContext);
  return (
    <div className="mb-6">
      <label htmlFor={id} className={`block text-sm font-medium mb-1 ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        className={`w-full p-2 rounded-md text-sm focus:outline-none focus:border-yellow-500 ${
          darkMode ? 'bg-dark_bg border-dark_border text-light_text' : 'bg-gray-700 border-gray-600 text-white'
        } ${className}`}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        {...props}
      ></textarea>
    </div>
  );
};

export default TextArea;
