// src/utils/sanitizeInput.js
const sanitizeInput = (input) => {
  if (typeof input !== 'string') {
    return input;
  }
  // Escapar caracteres HTML para prevenir XSS
  return input.trim()
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

export default sanitizeInput;
