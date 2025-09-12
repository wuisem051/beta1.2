import React, { useState, useEffect, useContext } from 'react'; // Importar useContext
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ThemeContext } from '../../context/ThemeContext'; // Importar ThemeContext
import { db } from '../../services/firebase'; // Importar Firebase Firestore
import { doc, getDoc } from 'firebase/firestore';

const Header = () => {
  const { currentUser, logout } = useAuth();
  const { darkMode, setDarkMode, theme } = useContext(ThemeContext); // Usar ThemeContext y theme
  const navigate = useNavigate();
  const location = useLocation(); // Obtener la ubicación actual
  const [isOpen, setIsOpen] = useState(false); // Estado para el menú móvil
  const [siteName, setSiteName] = useState('BitcoinPool'); // Estado para el nombre del sitio

  useEffect(() => {
    const fetchSiteName = async () => {
      try {
        const docRef = doc(db, 'settings', 'siteConfig');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setSiteName(data.siteName || 'BitcoinPool');
        } else {
          setSiteName('BitcoinPool');
        }
      } catch (err) {
        console.error("Error fetching site name for Header from Firebase:", err);
        setSiteName('BitcoinPool'); // Fallback en caso de error
      }
    };
    fetchSiteName();
  }, []);

  async function handleLogout() {
    try {
      await logout();
      navigate('/login');
    } catch {
      console.error("Fallo al cerrar sesión");
    }
  }

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <header className={`shadow-md ${theme.backgroundAlt} ${theme.text}`}> {/* Aplicar clases de tema */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo y botón de modo dev */}
          <div className="flex items-center">
            <Link to="/" className={`flex-shrink-0 text-xl font-bold mr-4 ${theme.text}`}> {/* Aplicar clases de tema */}
              <span className="text-accent">{siteName.charAt(0)}</span>{siteName.substring(1)}
            </Link>
            {/* Botón para alternar modo oscuro/claro (desactivado por petición del usuario) */}
            {/*
            <button 
              onClick={toggleDarkMode} 
              className={`ml-4 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              {darkMode ? 'Modo Claro' : 'Modo Oscuro'}
            </button>
            */}
          </div>

          {/* Navegación principal (Desktop) */}
          <nav className="hidden md:flex items-center space-x-0.5"> {/* Reducir espacio entre elementos */}
            <Link 
              to="/" 
              className={`px-2 py-1 rounded-md text-xs font-medium transition-colors duration-200 ${
                location.pathname === '/' && location.hash === '' 
                  ? 'bg-accent text-white' 
                  : `${theme.textSoft} hover:${theme.backgroundAlt} hover:${theme.text}`
              }`}
            >
              Estadísticas
            </Link>
            {currentUser ? (
              <>
                <Link 
                  to="/user/dashboard" 
                  className={`px-2 py-1 rounded-md text-xs font-medium transition-colors duration-200 ${
                    location.pathname.startsWith('/user') 
                      ? 'bg-accent text-white' 
                      : `${theme.textSoft} hover:${theme.backgroundAlt} hover:${theme.text}`
                  }`}
                >
                  Panel de Usuario
                </Link>
                <button 
                  onClick={handleLogout} 
                  className={`px-2 py-1 rounded-md text-xs font-medium transition-colors duration-200 ${
                    `${theme.textSoft} hover:${theme.backgroundAlt} hover:${theme.text}`
                  }`}
                >
                  Cerrar Sesión
                </button>
              </>
            ) : (
              <>
                <Link 
                  to="/signup" 
                  className={`px-2 py-1 rounded-md text-xs font-medium transition-colors duration-200 ${
                    location.pathname === '/signup' 
                      ? 'bg-accent text-white' 
                      : `${theme.textSoft} hover:${theme.backgroundAlt} hover:${theme.text}`
                  }`}
                >
                  Registrarse
                </Link>
                <Link 
                  to="/login" 
                  className={`px-2 py-1 rounded-md text-xs font-medium transition-colors duration-200 ${
                    location.pathname === '/login' 
                      ? 'bg-accent text-white' 
                      : `${theme.textSoft} hover:${theme.backgroundAlt} hover:${theme.text}`
                  }`}
                >
                  Iniciar Sesión
                </Link>
              </>
            )}
          </nav>

          {/* Botón de menú móvil */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              type="button"
              className={`inline-flex items-center justify-center p-2 rounded-md transition-colors duration-200 ${
                `${theme.textSoft} hover:${theme.backgroundAlt} focus:ring-${theme.text}`
              }`}
              aria-controls="mobile-menu"
              aria-expanded="false"
            >
              <span className="sr-only">Abrir menú principal</span>
              {!isOpen ? (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Menú móvil */}
      {isOpen && (
        <div className={`md:hidden ${theme.backgroundAlt}`} id="mobile-menu"> {/* Aplicar clases de tema */}
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link 
              to="/" 
              className={`block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 ${
                location.pathname === '/' && location.hash === '' 
                  ? 'bg-accent text-white' 
                  : `${theme.textSoft} hover:${theme.backgroundAlt} hover:${theme.text}`
              }`}
            >
              Estadísticas
            </Link>
            {currentUser ? (
              <>
                <Link 
                  to="/user/dashboard" 
                  className={`block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 ${
                    location.pathname.startsWith('/user') 
                      ? 'bg-accent text-white' 
                      : `${theme.textSoft} hover:${theme.backgroundAlt} hover:${theme.text}`
                  }`}
                >
                  Panel de Usuario
                </Link>
                <button 
                  onClick={handleLogout} 
                  className={`block px-3 py-2 rounded-md text-base font-medium w-full text-left transition-colors duration-200 ${
                    `${theme.textSoft} hover:${theme.backgroundAlt} hover:${theme.text}`
                  }`}
                >
                  Cerrar Sesión
                </button>
              </>
            ) : (
              <>
                <Link 
                  to="/signup" 
                  className={`block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 ${
                    location.pathname === '/signup' 
                      ? 'bg-accent text-white' 
                      : `${theme.textSoft} hover:${theme.backgroundAlt} hover:${theme.text}`
                  }`}
                >
                  Registrarse
                </Link>
                <Link 
                  to="/login" 
                  className={`block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 ${
                    location.pathname === '/login' 
                      ? 'bg-accent text-white' 
                      : `${theme.textSoft} hover:${theme.backgroundAlt} hover:${theme.text}`
                  }`}
                >
                  Iniciar Sesión
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
