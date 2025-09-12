import React, { useContext } from 'react';
import { ThemeContext } from '../../context/ThemeContext';

const Input = ({ label, id, type = 'text', placeholder, value, onChange, className = '', ...props }) => {
  const { darkMode } = useContext(ThemeContext);
  return (
    <div>
      <label htmlFor={id} className={`block text-sm font-medium mb-1 ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>
        {label}
      </label>
      <input
        type={type}
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full rounded-md shadow-sm sm:text-sm p-2 ${
          darkMode ? 'bg-dark_bg border-dark_border text-light_text' : 'bg-gray-700 border-gray-600 text-white'
        } ${className}`}
        {...props}
      />
    </div>
  );
};

export default Input;
