import React, { useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useError } from '../../context/ErrorContext'; // Importar useError
import sanitizeInput from '../../utils/sanitizeInput'; // Importar la función de sanitización
import { ThemeContext } from '../../context/ThemeContext'; // Importar ThemeContext
import { useContext } from 'react'; // Importar useContext

const Signup = () => {
  const emailRef = useRef();
  const passwordRef = useRef();
  const passwordConfirmRef = useRef();
  const { signup } = useAuth();
  const { showError, showSuccess } = useError(); // Usar el contexto de errores
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { theme } = useContext(ThemeContext); // Usar ThemeContext

  async function handleSubmit(e) {
    e.preventDefault();

    // Sanitizar las entradas antes de usarlas
    const sanitizedEmail = sanitizeInput(emailRef.current.value);
    const sanitizedPassword = sanitizeInput(sanitizeInput(passwordRef.current.value));
    const sanitizedPasswordConfirm = sanitizeInput(passwordConfirmRef.current.value);

    if (sanitizedPassword !== sanitizedPasswordConfirm) {
      return showError('Las contraseñas no coinciden');
    }

    try {
      showError(null); // Limpiar errores previos
      showSuccess(null); // Limpiar mensajes de éxito previos
      setLoading(true);
      await signup(sanitizedEmail, sanitizedPassword);
      showSuccess('Cuenta creada exitosamente. Por favor, inicia sesión.');
      // navigate('/login'); // Redirigir a login después del registro
    } catch (e) {
      console.error("Error en el proceso de registro:", e);
      showError('Fallo al crear la cuenta. ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 ${theme.background}`}>
      <div className={`max-w-md w-full space-y-8 p-10 rounded-xl shadow-lg ${theme.backgroundAlt}`}>
        <div>
          <h2 className={`mt-6 text-center text-3xl font-extrabold ${theme.text}`}>
            Crear una cuenta
          </h2>
        </div>
        {/* Los mensajes de error y éxito ahora se manejan globalmente */}
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
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${theme.borderColor} ${theme.inputBackground} ${theme.text} focus:outline-none focus:ring-accent focus:border-accent`} 
                placeholder="Contraseña" 
              />
            </div>
            <div>
              <input 
                ref={passwordConfirmRef} 
                id="password-confirm" 
                name="password-confirm" 
                type="password" 
                required 
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${theme.borderColor} ${theme.inputBackground} ${theme.text} rounded-b-md focus:outline-none focus:ring-accent focus:border-accent`} 
                placeholder="Confirmar contraseña" 
              />
            </div>
          </div>
          <div>
            <button 
              type="submit" 
              disabled={loading} 
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-accent hover:bg-accent-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent"
            >
              {loading ? 'Creando cuenta...' : 'Registrarse'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Signup;
