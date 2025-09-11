import React from 'react';

const ErrorMessage = ({ message, onDismiss, type = 'error' }) => {
  const bgColorClass = type === 'success' ? 'bg-green-500' : 'bg-red-500';
  return (
    <div className={`${bgColorClass} text-white p-3 rounded mb-4 flex justify-between items-center`}>
      <span>{message}</span>
      <button onClick={onDismiss} className="text-white hover:text-gray-200">
        ✕
      </button>
    </div>
  );
};

export default ErrorMessage;
