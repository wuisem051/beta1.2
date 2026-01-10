import React, { lazy, Suspense } from 'react'; // Importar lazy y Suspense
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import Header from './common/layout/Header';
import Footer from './common/layout/Footer';
import { AuthProvider } from './context/AuthContext';
import './App.css';
import { db } from './services/firebase'; // Importar db desde firebase.js
import { doc, getDoc } from 'firebase/firestore';
import { ThemeContext } from './context/ThemeContext'; // Importar ThemeContext
import { ColorPaletteProvider } from './context/ColorPaletteContext'; // Importar ColorPaletteProvider
import { useContext, useEffect } from 'react'; // Importar useContext y useEffect

// Carga perezosa de componentes de página
const Home = lazy(() => import('./user/pages/Home')); // Mantener el Home original por ahora, pero no se usará en la ruta principal
const FuturisticHome = lazy(() => import('./user/pages/FuturisticHome')); // Nuevo Home futurista
const Login = lazy(() => import('./user/pages/Login'));
const Signup = lazy(() => import('./user/pages/Signup'));
const UserPanel = lazy(() => import('./user/pages/UserPanel'));
const AdminPanel = lazy(() => import('./admin/pages/AdminPanel'));
const AdminLogin = lazy(() => import('./admin/pages/AdminLogin'));
const AllNewsPage = lazy(() => import('./user/pages/AllNewsPage')); // Nueva página para todas las noticias
const ProfitabilityCalculatorPage = lazy(() => import('./user/pages/ProfitabilityCalculatorPage')); // Página de la calculadora de rentabilidad

function App() {
  const { darkMode, theme } = useContext(ThemeContext); // Usar ThemeContext

  // Efecto para cargar el favicon dinámicamente
  useEffect(() => {
    const fetchSiteSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'siteConfig');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          // Actualizar favicon
          if (data.faviconUrl) {
            let link = document.querySelector("link[rel~='icon']");
            if (!link) {
              link = document.createElement('link');
              link.rel = 'icon';
              document.head.appendChild(link);
            }
            link.href = data.faviconUrl;
          }
          // Actualizar título del documento
          if (data.siteName) {
            document.title = data.siteName;
          } else {
            document.title = 'MaxiOS Pool'; // Valor por defecto si no hay siteName en Firebase
          }
        } else {
          document.title = 'MaxiOS Pool'; // Valor por defecto si no existe siteConfig
        }
      } catch (err) {
        console.error("Error fetching site settings for App component from Firebase:", err);
        document.title = 'MaxiOS Pool'; // Fallback en caso de error
      }
    };
    fetchSiteSettings();

    // No aplicar la clase 'dark' al body globalmente, ya que cada panel debe tener su propio CSS.
    // Los componentes individuales usarán las clases de tema de ThemeContext.
  }, []); // No hay dependencia de darkMode ya que el modo oscuro se gestiona a nivel de componente

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="flex flex-col min-h-screen"> {/* Eliminar clases de tema globales */}
        <Header />
        <main className="flex-grow">
          <ColorPaletteProvider>
            <AuthProvider>
              <Suspense fallback={<div>Cargando...</div>}> {/* Mostrar un mensaje de carga mientras los componentes se cargan */}
                <Routes>
                  <Route path="/" element={<FuturisticHome />} /> {/* Usar el nuevo Home futurista */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  {/* Ruta temporal para acceso de prueba a la configuración del usuario */}
                  <Route
                    path="/test-user-settings/*"
                    element={
                      <ProtectedRoute>
                        <UserPanel />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/user/*"
                    element={
                      <ProtectedRoute>
                        <UserPanel />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/*"
                    element={<AdminPanel />}
                  />
                  <Route path="/admin-login" element={<AdminLogin />} /> {/* Nueva ruta para el login de administrador */}
                  <Route path="/news" element={<AllNewsPage />} /> {/* Nueva ruta para todas las noticias */}
                  <Route path="/calculator" element={<ProfitabilityCalculatorPage />} /> {/* Ruta para la calculadora de rentabilidad */}
                </Routes>
              </Suspense>
            </AuthProvider>
          </ColorPaletteProvider>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
