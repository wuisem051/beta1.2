import React from 'react';

const Button = ({ children, onClick, variant = 'primary', className = '', ...props }) => {
  let baseStyles = "font-bold py-2 px-4 rounded-md";
  let variantStyles = "";

  switch (variant) {
    case 'primary':
      variantStyles = "bg-yellow-500 hover:bg-yellow-600 text-white";
      break;
    case 'danger':
      variantStyles = "bg-red-500 hover:bg-red-600 text-white";
      break;
    case 'success':
      variantStyles = "bg-green-500 hover:bg-green-600 text-white";
      break;
    case 'secondary':
      variantStyles = "bg-gray-500 hover:bg-gray-600 text-white";
      break;
    default:
      variantStyles = "bg-yellow-500 hover:bg-yellow-600 text-white";
  }

  return (
    <button
      onClick={onClick}
      className={`${baseStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
