import React, { useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useError } from '../../context/ErrorContext'; // Importar useError
import sanitizeInput from '../../utils/sanitizeInput'; // Importar la función de sanitización

const Login = () => {
  const emailRef = useRef();
  const passwordRef = useRef();
  const { login } = useAuth();
  const { showError } = useError(); // Usar el contexto de errores
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      showError(null); // Limpiar errores previos
      setLoading(true);
      // Sanitizar las entradas antes de usarlas
      const sanitizedEmail = sanitizeInput(emailRef.current.value);
      const sanitizedPassword = sanitizeInput(passwordRef.current.value);

      await login(sanitizedEmail, sanitizedPassword);
      navigate('/user/dashboard'); // Redirigir al panel de usuario
    } catch (err) {
      showError('Fallo al iniciar sesión. Revisa tus credenciales.');
      console.error("Error al iniciar sesión:", err);
    }
    setLoading(false);
  }

  return (
    <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 p-10 bg-gray-800 rounded-xl shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            Inicia sesión en tu cuenta
          </h2>
        </div>
        {/* El mensaje de error ahora se maneja globalmente */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input ref={emailRef} id="email-address" name="email" type="email" required className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-600 bg-gray-700 text-gray-300 rounded-t-md focus:outline-none focus:ring-yellow-500 focus:border-yellow-500" placeholder="Correo electrónico" />
            </div>
            <div>
              <input ref={passwordRef} id="password" name="password" type="password" required className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-600 bg-gray-700 text-gray-300 rounded-b-md focus:outline-none focus:ring-yellow-500 focus:border-yellow-500" placeholder="Contraseña" />
            </div>
          </div>
          <div>
            <button type="submit" disabled={loading} className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500">
              {loading ? 'Iniciando...' : 'Iniciar Sesión'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
