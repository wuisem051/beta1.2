import React, { useContext } from 'react';
import { ThemeContext } from '../../context/ThemeContext';

const Checkbox = ({ label, ...props }) => {
  const { darkMode } = useContext(ThemeContext);
  return (
    <label className="inline-flex items-center mb-2">
      <input
        type="checkbox"
        className={`form-checkbox h-5 w-5 text-yellow-600 rounded ${
          darkMode ? 'bg-dark_bg border-dark_border' : ''
        }`}
        {...props}
      />
      <span className={`ml-2 ${darkMode ? 'text-light_text' : ''}`}>{label}</span>
    </label>
  );
};

export default Checkbox;
