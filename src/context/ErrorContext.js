import React, { createContext, useContext, useState, useCallback } from 'react';
import ErrorMessage from '../user/components/ErrorMessage';

const ErrorContext = createContext();

export function ErrorProvider({ children }) {
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const dismissError = useCallback(() => setError(null), []);
  const dismissSuccess = useCallback(() => setSuccess(null), []);

  const showError = useCallback((message) => {
    setError(message);
    setTimeout(() => setError(null), 5000); // Auto-dismiss after 5 seconds
  }, []);

  const showSuccess = useCallback((message) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 5000); // Auto-dismiss after 5 seconds
  }, []);

  return (
    <ErrorContext.Provider value={{ showError, showSuccess }}>
      {children}
      {error && <ErrorMessage message={error} onDismiss={dismissError} type="error" />}
      {success && <ErrorMessage message={success} onDismiss={dismissSuccess} type="success" />}
    </ErrorContext.Provider>
  );
}

export function useError() {
  return useContext(ErrorContext);
}
