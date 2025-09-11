import React, { useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useError } from '../../context/ErrorContext'; // Importar useError
import sanitizeInput from '../../utils/sanitizeInput'; // Importar la función de sanitización

const Signup = () => {
  const emailRef = useRef();
  const passwordRef = useRef();
  const passwordConfirmRef = useRef();
  const { signup } = useAuth();
  const { showError, showSuccess } = useError(); // Usar el contexto de errores
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
    <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 p-10 bg-gray-800 rounded-xl shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            Crear una cuenta
          </h2>
        </div>
        {/* Los mensajes de error y éxito ahora se manejan globalmente */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input ref={emailRef} id="email-address" name="email" type="email" required className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-600 bg-gray-700 text-gray-300 rounded-t-md focus:outline-none focus:ring-yellow-500 focus:border-yellow-500" placeholder="Correo electrónico" />
            </div>
            <div>
              <input ref={passwordRef} id="password" name="password" type="password" required className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-600 bg-gray-700 text-gray-300 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500" placeholder="Contraseña" />
            </div>
            <div>
              <input ref={passwordConfirmRef} id="password-confirm" name="password-confirm" type="password" required className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-600 bg-gray-700 text-gray-300 rounded-b-md focus:outline-none focus:ring-yellow-500 focus:border-yellow-500" placeholder="Confirmar contraseña" />
            </div>
          </div>
          <div>
            <button type="submit" disabled={loading} className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500">
              {loading ? 'Creando cuenta...' : 'Registrarse'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Signup;
