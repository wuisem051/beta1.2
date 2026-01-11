import React, { useState, useContext } from 'react'; // Importar useContext
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { ThemeContext } from '../../context/ThemeContext'; // Importar ThemeContext
import VIPMemberManagement from '../components/VIPMemberManagement';
import ContentManagement from '../components/ContentManagement';
import UserManagement from '../components/UserManagement';
import Backup from '../components/Backup';
import NewsManagement from '../components/NewsManagement';
import ContactRequestsManagement from '../components/ContactRequestsManagement';
import SiteSettingsContent from '../components/SiteSettingsContent';
import ColorPaletteSettings from '../components/ColorPaletteSettings';
import TradingSignalManagement from '../components/TradingSignalManagement';
import WithdrawalRequestsManagement from '../components/WithdrawalRequestsManagement';
import BalanceManagement from '../../user/components/BalanceManagement';
import VIPPlansManagement from '../components/VIPPlansManagement';
import TradingHistoryManagement from '../components/TradingHistoryManagement';

const AdminPanel = () => {
  const { darkMode } = useContext(ThemeContext); // Usar ThemeContext
  const location = useLocation();
  const [unreadContactRequests, setUnreadContactRequests] = useState(0);
  const [unreadWithdrawalRequests, setUnreadWithdrawalRequests] = useState(0);
  const [unreadMinersCount, setUnreadMinersCount] = useState(0); // Nuevo estado para notificaciones de mineros

  const handleUnreadContactRequestsChange = (count) => {
    setUnreadContactRequests(count);
  };

  const handleUnreadWithdrawalRequestsChange = (count) => {
    setUnreadWithdrawalRequests(count);
  };

  const handleNewMinerNotification = (count) => {
    setUnreadMinersCount(prevCount => {
      const newCount = prevCount + count;
      console.log("AdminPanel: handleNewMinerNotification llamado. Nuevos mineros:", count, "Total no leídos:", newCount);
      return newCount;
    });
  };

  const handleClearMinerNotification = () => {
    console.log("AdminPanel: Limpiando notificación de mineros.");
    setUnreadMinersCount(0);
  };

  console.log("AdminPanel: Renderizando. unreadMinersCount:", unreadMinersCount);

  return (
    <div className={`flex h-screen ${darkMode ? 'text-light_text' : 'text-white'}`} style={{ backgroundColor: 'var(--bg-main)' }}>
      {/* Sidebar de Navegación */}
      <aside className={`w-64 p-2 shadow-lg`} style={{ backgroundColor: 'var(--bg-sidebar)' }}>
        <div className={`text-xl font-bold text-yellow-500 mb-6 ${darkMode ? 'text-accent' : 'text-yellow-500'}`}>Admin Dashboard (Actualizado)</div> {/* Título actualizado */}
        <nav>
          <ul>
            <li className="mb-0.5">
              <Link
                to="/admin/miners"
                className={`flex items-center py-1.5 rounded-lg text-sm font-medium ${location.pathname === '/admin/miners'
                  ? 'bg-accent text-white'
                  : (darkMode ? 'text-light_text hover:bg-dark_border' : 'text-gray-300 hover:bg-gray-700')
                  }`}
                onClick={handleClearMinerNotification}
              >
                Gestión de Miembros VIP
                {unreadMinersCount > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {unreadMinersCount}
                  </span>
                )}
              </Link>
            </li>
            <li className="mb-0.5">
              <Link
                to="/admin/users"
                className={`flex items-center py-1.5 rounded-lg text-sm font-medium ${location.pathname === '/admin/users'
                  ? 'bg-accent text-white'
                  : (darkMode ? 'text-light_text hover:bg-dark_border' : 'text-gray-300 hover:bg-gray-700')
                  }`}
              >
                Gestión de Usuarios
              </Link>
            </li>
            <li className="mb-0.5">
              <Link
                to="/admin/backup"
                className={`flex items-center py-1.5 rounded-lg text-sm font-medium ${location.pathname === '/admin/backup'
                  ? 'bg-accent text-white'
                  : (darkMode ? 'text-light_text hover:bg-dark_border' : 'text-gray-300 hover:bg-gray-700')
                  }`}
              >
                Respaldo de Datos
              </Link>
            </li>
            <li className="mb-0.5">
              <Link
                to="/admin/news"
                className={`flex items-center py-1.5 rounded-lg text-sm font-medium ${location.pathname === '/admin/news'
                  ? 'bg-accent text-white'
                  : (darkMode ? 'text-light_text hover:bg-dark_border' : 'text-gray-300 hover:bg-gray-700')
                  }`}
              >
                Gestión de Noticias
              </Link>
            </li>
            <li className="mb-0.5">
              <Link
                to="/admin/content"
                className={`flex items-center py-1.5 rounded-lg text-sm font-medium ${location.pathname === '/admin/content'
                  ? 'bg-accent text-white'
                  : (darkMode ? 'text-light_text hover:bg-dark_border' : 'text-gray-300 hover:bg-gray-700')
                  }`}
              >
                Gestión de Contenido
              </Link>
            </li>
            <li className="mb-0.5">
              <Link
                to="/admin/contact-requests"
                className={`flex items-center py-1.5 rounded-lg text-sm font-medium ${location.pathname === '/admin/contact-requests'
                  ? 'bg-accent text-white'
                  : (darkMode ? 'text-light_text hover:bg-dark_border' : 'text-gray-300 hover:bg-gray-700')
                  }`}
              >
                Solicitudes de Contacto
                {unreadContactRequests > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {unreadContactRequests}
                  </span>
                )}
              </Link>
            </li>
            <li className="mb-0.5"> {/* Nuevo enlace para Solicitudes de Pago */}
              <Link
                to="/admin/withdrawal-requests"
                className={`flex items-center py-1.5 rounded-lg text-sm font-medium ${location.pathname === '/admin/withdrawal-requests'
                  ? 'bg-accent text-white'
                  : (darkMode ? 'text-light_text hover:bg-dark_border' : 'text-gray-300 hover:bg-gray-700')
                  }`}
              >
                Solicitudes de Pago
                {unreadWithdrawalRequests > 0 && ( // Añadir notificación numérica
                  <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {unreadWithdrawalRequests}
                  </span>
                )}
              </Link>
            </li>
            <li className="mb-0.5"> {/* Nuevo enlace para Gestión de Balance */}
              <Link
                to="/admin/balance-management"
                className={`flex items-center py-1.5 rounded-lg text-sm font-medium ${location.pathname === '/admin/balance-management'
                  ? 'bg-accent text-white'
                  : (darkMode ? 'text-light_text hover:bg-dark_border' : 'text-gray-300 hover:bg-gray-700')
                  }`}
              >
                Gestión de Balance
              </Link>
            </li>
            <li className="mb-0.5"> {/* Nuevo enlace para Configuración del Sitio */}
              <Link
                to="/admin/site-settings"
                className={`flex items-center py-1.5 rounded-lg text-sm font-medium ${location.pathname === '/admin/site-settings'
                  ? 'bg-accent text-white'
                  : (darkMode ? 'text-light_text hover:bg-dark_border' : 'text-gray-300 hover:bg-gray-700')
                  }`}
              >
                Configuración del Sitio
              </Link>
            </li>
            <li className="mb-0.5">
              <Link
                to="/admin/trading-history"
                className={`flex items-center py-1.5 rounded-lg text-sm font-medium ${location.pathname === '/admin/trading-history'
                  ? 'bg-accent text-white'
                  : (darkMode ? 'text-light_text hover:bg-dark_border' : 'text-gray-300 hover:bg-gray-700')
                  }`}
              >
                Historial de Operaciones
              </Link>
            </li>
            <li className="mb-0.5">
              <Link
                to="/admin/trading-signal-management"
                className={`flex items-center py-1.5 rounded-lg text-sm font-medium ${location.pathname === '/admin/trading-signal-management'
                  ? 'bg-accent text-white'
                  : (darkMode ? 'text-light_text hover:bg-dark_border' : 'text-gray-300 hover:bg-gray-700')
                  }`}
              >
                Enviar Señales VIP
              </Link>
            </li>
            <li className="mb-0.5">
              <Link
                to="/admin/vip-plans"
                className={`flex items-center py-1.5 rounded-lg text-sm font-medium ${location.pathname === '/admin/vip-plans'
                  ? 'bg-accent text-white'
                  : (darkMode ? 'text-light_text hover:bg-dark_border' : 'text-gray-300 hover:bg-gray-700')
                  }`}
              >
                Configuración de Planes VIP
              </Link>
            </li>
            <li className="mb-0.5"> {/* Nuevo enlace para Paletas de Colores */}
              <Link
                to="/admin/color-palettes"
                className={`flex items-center py-1.5 rounded-lg text-sm font-medium ${location.pathname === '/admin/color-palettes'
                  ? 'bg-accent text-white'
                  : (darkMode ? 'text-light_text hover:bg-dark_border' : 'text-gray-300 hover:bg-gray-700')
                  }`}
              >
                🎨 Paletas de Colores
              </Link>
            </li>
          </ul>
        </nav>
      </aside >

      {/* Contenido Principal */}
      < main className="flex-1 p-8 overflow-y-auto" >
        <h1 className={`text-4xl font-bold mb-8 ${darkMode ? 'text-light_text' : 'text-white'}`}>Panel de Administración</h1>
        <Routes>
          <Route
            path="miners"
            element={<VIPMemberManagement onNewMinerAdded={handleNewMinerNotification} />}
          />
          <Route path="users" element={<UserManagement />} />
          <Route path="backup" element={<Backup />} />
          <Route path="news" element={<NewsManagement />} />
          <Route path="content" element={<ContentManagement />} />
          <Route
            path="contact-requests"
            element={<ContactRequestsManagement onUnreadCountChange={handleUnreadContactRequestsChange} />}
          />
          <Route
            path="withdrawal-requests"
            element={<WithdrawalRequestsManagement onUnreadCountChange={handleUnreadWithdrawalRequestsChange} />}
          />
          <Route path="balance-management" element={<BalanceManagement />} />
          <Route path="trading-signal-management" element={<TradingSignalManagement />} /> {/* Nueva ruta para Gestión de Señales de Trading */}
          <Route path="site-settings" element={<SiteSettingsContent />} /> {/* Nueva ruta para Configuración del Sitio */}
          <Route path="vip-plans" element={<VIPPlansManagement />} />
          <Route path="trading-history" element={<TradingHistoryManagement />} />
          <Route path="color-palettes" element={<ColorPaletteSettings />} /> {/* Nueva ruta para Paletas de Colores */}
          {/* Ruta por defecto o dashboard overview */}
          <Route path="/" element={
            <div className={`p-6 rounded-2xl shadow-xl`} style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <h2 className="text-2xl font-semibold mb-4">Bienvenido al Panel de Administración</h2>
              <p>Selecciona una opción del menú lateral para empezar a administrar el sitio.</p>
            </div>
          } />
        </Routes>
      </main >
    </div >
  );
};

export default AdminPanel;
