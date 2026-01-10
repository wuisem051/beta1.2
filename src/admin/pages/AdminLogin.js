import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useError } from '../../context/ErrorContext'; // Importar useError
import sanitizeInput from '../../utils/sanitizeInput'; // Importar la función de sanitización
import { ThemeContext } from '../../context/ThemeContext'; // Importar ThemeContext
import { useContext } from 'react'; // Importar useContext

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginAdmin } = useAuth();
  const { showError } = useError(); // Usar el contexto de errores
  const navigate = useNavigate();
  const { theme } = useContext(ThemeContext); // Usar ThemeContext

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      showError(null); // Limpiar errores previos
      setLoading(true);
      // Sanitizar las entradas antes de usarlas
      const sanitizedEmail = sanitizeInput(email);
      const sanitizedPassword = sanitizeInput(password);

      await loginAdmin(sanitizedEmail, sanitizedPassword);
      navigate('/admin'); // Redirigir al panel de administrador
    } catch (err) {
      showError('Fallo al iniciar sesión como administrador: ' + err.message);
      console.error("Error al iniciar sesión como administrador:", err);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-main)' }}>
      <div className={`p-8 rounded-lg shadow-md w-full max-w-md border border-white border-opacity-10`} style={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)' }}>
        <h2 className={`text-2xl font-bold ${theme.text} mb-6 text-center`}>Iniciar Sesión como Administrador</h2>
        {/* El mensaje de error ahora se maneja globalmente */}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-300 text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              id="email"
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm focus:outline-none focus:border-yellow-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-6">
            <label htmlFor="password" className="block text-gray-300 text-sm font-medium mb-1">Contraseña</label>
            <input
              type="password"
              id="password"
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm focus:outline-none focus:border-yellow-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            disabled={loading}
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:shadow-outline"
          >
            {loading ? 'Iniciando...' : 'Iniciar Sesión Admin'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
