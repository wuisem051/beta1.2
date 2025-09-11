// src/utils/sanitizeInput.js
const sanitizeInput = (input) => {
  if (typeof input !== 'string') {
    return input;
  }
  return input.trim();
};

export default sanitizeInput;
