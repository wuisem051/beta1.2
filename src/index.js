import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext'; // Importar ThemeProvider
import { GlobalStateProvider } from './context/GlobalStateContext'; // Importar GlobalStateProvider
import { ErrorProvider } from './context/ErrorContext'; // Importar ErrorProvider

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorProvider> {/* Envolver con ErrorProvider */}
      <GlobalStateProvider> {/* Envolver con GlobalStateProvider */}
        <ThemeProvider> {/* Envolver con ThemeProvider */}
          <AuthProvider>
            <App />
          </AuthProvider>
        </ThemeProvider>
      </GlobalStateProvider>
    </ErrorProvider>
  </React.StrictMode>
);
