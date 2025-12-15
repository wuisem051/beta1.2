import React, { useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useError } from '../../context/ErrorContext'; // Importar useError
import sanitizeInput from '../../utils/sanitizeInput'; // Importar la función de sanitización
import { ThemeContext } from '../../context/ThemeContext'; // Importar ThemeContext
import { useContext } from 'react'; // Importar useContext

const Login = () => {
  const emailRef = useRef();
  const passwordRef = useRef();
  const { login } = useAuth();
  const { showError } = useError(); // Usar el contexto de errores
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { theme } = useContext(ThemeContext); // Usar ThemeContext

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      showError(null); // Limpiar errores previos
      setLoading(true);
      // Sanitizar las entradas antes de usarlas
      const sanitizedEmail = sanitizeInput(emailRef.current.value);
      const sanitizedPassword = sanitizeInput(passwordRef.current.value);

      await login(sanitizedEmail, sanitizedPassword);
      navigate('/user/dashboard'); // Redirigir al dashboard del usuario después del login exitoso
    } catch (err) {
      showError('Fallo al iniciar sesión. Revisa tus credenciales.');
      console.error("Error al iniciar sesión:", err);
    }
    setLoading(false);
  }

  return (
    <div className={`min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 ${theme.background}`}>
      <div className={`max-w-md w-full space-y-8 p-10 rounded-xl shadow-lg ${theme.backgroundAlt}`}>
        <div>
          <h2 className={`mt-6 text-center text-3xl font-extrabold ${theme.text}`}>
            Inicia sesión en tu cuenta
          </h2>
        </div>
        {/* El mensaje de error ahora se maneja globalmente */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input 
                ref={emailRef} 
                id="email-address" 
                name="email" 
                type="email" 
                required 
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${theme.borderColor} ${theme.inputBackground} ${theme.text} rounded-t-md focus:outline-none focus:ring-accent focus:border-accent`} 
                placeholder="Correo electrónico" 
              />
            </div>
            <div>
              <input 
                ref={passwordRef} 
                id="password" 
                name="password" 
                type="password" 
                required 
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${theme.borderColor} ${theme.inputBackground} ${theme.text} rounded-b-md focus:outline-none focus:ring-accent focus:border-accent`} 
                placeholder="Contraseña" 
              />
            </div>
          </div>
          <div>
            <button 
              type="submit" 
              disabled={loading} 
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-accent hover:bg-accent-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent"
            >
              {loading ? 'Iniciando...' : 'Iniciar Sesión'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
