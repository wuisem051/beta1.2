import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { currentUser } = useAuth();

  // Permitir acceso si REACT_APP_DEV_MODE está activado (solo para desarrollo/pruebas)
  const isDevMode = process.env.REACT_APP_DEV_MODE === 'true';

  if (!currentUser && !isDevMode) {
    // Si no hay usuario y no estamos en modo de desarrollo, redirigir a la página de login
    return <Navigate to="/login" />;
  }

  // Si hay usuario o estamos en modo de desarrollo, permitir el acceso

  return children;
};

export default ProtectedRoute;
