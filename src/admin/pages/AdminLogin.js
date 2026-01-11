import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useError } from '../../context/ErrorContext'; // Importar useError
import sanitizeInput from '../../utils/sanitizeInput'; // Importar la función de sanitización

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginAdmin } = useAuth();
  const { showError } = useError(); // Usar el contexto de errores
  const navigate = useNavigate();

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
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#0f172a' }}>
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-blue-600/10 border border-blue-500/20 shadow-2xl shadow-blue-500/10 mb-4 animate-float">
            <span className="text-4xl">🔐</span>
          </div>
          <h2 className="text-4xl font-black text-white tracking-tight">Acceso Central</h2>
          <p className="text-slate-500 font-medium italic">Protocolo Administrativo de Seguridad</p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
          {/* Subtle decoration */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>

          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            <div className="space-y-2">
              <label htmlFor="email" className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Credencial de Email</label>
              <div className="relative">
                <input
                  type="email"
                  id="email"
                  className="w-full bg-slate-950/50 border border-slate-800 focus:border-blue-500 rounded-2xl px-5 py-4 text-white outline-none transition-all placeholder:text-slate-700"
                  placeholder="admin@platform.system"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Clave de Acceso</label>
              <div className="relative">
                <input
                  type="password"
                  id="password"
                  className="w-full bg-slate-950/50 border border-slate-800 focus:border-blue-500 rounded-2xl px-5 py-4 text-white outline-none transition-all placeholder:text-slate-700 text-2xl"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              disabled={loading}
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-50 hover:text-blue-900 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-900/40 hover:shadow-white/10 transition-all active:scale-[0.98] disabled:opacity-50 uppercase tracking-widest text-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  Validando...
                </>
              ) : 'Desbloquear Panel'}
            </button>
          </form>
        </div>

        <div className="text-center">
          <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
            Cifrado de Grado Institucional Activo
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
