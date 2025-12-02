import React, { useContext } from 'react';
import { Link, useMatch, useLocation } from 'react-router-dom';
import { ThemeContext } from '../../context/ThemeContext';

const Sidebar = ({ unreadTicketsCount, newTradingSignalsCount, markTradingSignalsAsRead, displayUser }) => {
  const { darkMode, setDarkMode, theme } = useContext(ThemeContext);
  const { pathname } = useLocation();
  const basePath = pathname.split('/').slice(0, 2).join('/');

  return (
    <aside className={`w-64 p-2 shadow-lg border-r ${theme.backgroundAlt} ${theme.borderColor}`}>
      <div className={`flex flex-col items-center text-center border-b pb-2 mb-2 ${theme.borderColor}`}>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-1 ${theme.background}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-8 w-8 ${theme.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
        </div>
        <h2 className={`text-base font-semibold truncate w-full ${theme.text}`}>{displayUser.email || 'Usuario'}</h2>
        <p className={`text-xs ${theme.textSoft}`}>Minero</p>
      </div>
      <nav>
        <ul>
          <li className="mb-0.5">
            <Link
              to={`${basePath}/dashboard`}
              className={`flex items-center py-1.5 px-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                useMatch(`${basePath}/dashboard`) 
                  ? 'bg-accent text-white' 
                  : `${theme.textSoft} hover:${theme.background} hover:${theme.text}`
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-2 ${useMatch(`${basePath}/dashboard`) ? 'text-white' : theme.textSoft}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
              Dashboard
            </Link>
          </li>
          <li className="mb-0.5">
            <Link
              to={`${basePath}/mining-info`}
              className={`flex items-center py-1.5 px-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                useMatch(`${basePath}/mining-info`) 
                  ? 'bg-accent text-white' 
                  : `${theme.textSoft} hover:${theme.background} hover:${theme.text}`
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-2 ${useMatch(`${basePath}/mining-info`) ? 'text-white' : theme.textSoft}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              Conectar Pool Estándar
            </Link>
          </li>
          <li className="mb-0.5">
            <Link
              to={`${basePath}/withdrawals`}
              className={`flex items-center py-1.5 px-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                useMatch(`${basePath}/withdrawals`) 
                  ? 'bg-accent text-white' 
                  : `${theme.textSoft} hover:${theme.background} hover:${theme.text}`
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-2 ${useMatch(`${basePath}/withdrawals`) ? 'text-white' : theme.textSoft}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V3a1 1 0 00-1-1H4a1 1 0 00-1 1v18a1 1 0 001 1h12a1 1 0 001-1v-5m-1-10v4m-4 0h4"/></svg>
              Retiros
            </Link>
          </li>
          <li className="mb-0.5">
            <Link
              to={`${basePath}/contact-support`}
              className={`flex items-center py-1.5 px-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                useMatch(`${basePath}/contact-support`) 
                  ? 'bg-accent text-white' 
                  : `${theme.textSoft} hover:${theme.background} hover:${theme.text}`
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-2 ${useMatch(`${basePath}/contact-support`) ? 'text-white' : theme.textSoft}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
              Contacto Soporte
              {unreadTicketsCount > 0 && (
                <span className="ml-auto bg-red_error text-white text-xxs font-bold px-2 py-0.5 rounded-full">
                  {unreadTicketsCount}
                </span>
              )}
            </Link>
          </li>
          <li className="mb-0.5">
            <Link
              to={`${basePath}/referrals`}
              className={`flex items-center py-1.5 px-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                useMatch(`${basePath}/referrals`) 
                  ? 'bg-accent text-white' 
                  : `${theme.textSoft} hover:${theme.background} hover:${theme.text}`
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-2 ${useMatch(`${basePath}/referrals`) ? 'text-white' : theme.textSoft}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h2a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2h2M9 10l4 4m0 0l4-4m-4 4V3"/></svg>
              Referidos
            </Link>
          </li>
          <li className="mb-0.5">
            <Link
              to={`${basePath}/pool-arbitrage`}
              className={`flex items-center py-1.5 px-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                useMatch(`${basePath}/pool-arbitrage`) 
                  ? 'bg-accent text-white' 
                  : `${theme.textSoft} hover:${theme.background} hover:${theme.text}`
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-2 ${useMatch(`${basePath}/pool-arbitrage`) ? 'text-white' : theme.textSoft}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>
              Pools de Arbitraje
            </Link>
          </li>
          <li className="mb-0.5">
            <Link
              to={`${basePath}/bonus`}
              className={`flex items-center py-1.5 px-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                useMatch(`${basePath}/bonus`)
                  ? 'bg-accent text-white'
                  : `${theme.textSoft} hover:${theme.background} hover:${theme.text}`
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-2 ${useMatch(`${basePath}/bonus`) ? 'text-white' : theme.textSoft}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 11V9m0 0V5m0 4h.01M12 21a9 9 0 110-18 9 9 0 010 18zm-2.75-6.25a.25.25 0 00-.25.25v1.25c0 .138.112.25.25.25h1.25a.25.25 0 00.25-.25v-1.25c0-.138-.112-.25-.25-.25H9.25zM15 11h.01M15 15h.01M9 15h.01"/></svg>
              Bono
            </Link>
          </li>
          <li className="mb-0.5">
            <Link
              to={`${basePath}/my-wallet`}
              className={`flex items-center py-1.5 px-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                useMatch(`${basePath}/my-wallet`) 
                  ? 'bg-accent text-white' 
                  : `${theme.textSoft} hover:${theme.background} hover:${theme.text}`
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-2 ${useMatch(`${basePath}/my-wallet`) ? 'text-white' : theme.textSoft}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
              Mi Billetera
            </Link>
          </li>
          <li className="mb-0.5">
            <Link
              to={`${basePath}/p2p-marketplace`}
              className={`flex items-center py-1.5 px-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                useMatch(`${basePath}/p2p-marketplace`)
                  ? 'bg-accent text-white'
                  : `${theme.textSoft} hover:${theme.background} hover:${theme.text}`
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-2 ${useMatch(`${basePath}/p2p-marketplace`) ? 'text-white' : theme.textSoft}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>
              Mercado P2P
            </Link>
          </li>
          <h3 className={`text-xs font-semibold uppercase mt-4 mb-2 px-2 ${theme.textSoft}`}>Gestión de Mineros</h3>
          <li className="mb-0.5">
            <Link
              to={`${basePath}/mining-portfolio`}
              className={`flex items-center py-1.5 px-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                useMatch(`${basePath}/mining-portfolio`)
                  ? 'bg-accent text-white'
                  : `${theme.textSoft} hover:${theme.background} hover:${theme.text}`
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-2 ${useMatch(`${basePath}/mining-portfolio`) ? 'text-white' : theme.textSoft}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>
              Portafolio de Minería
            </Link>
          </li>
          <li className="mb-0.5">
            <Link
              to={`${basePath}/miners`}
              className={`flex items-center py-1.5 px-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                useMatch(`${basePath}/miners`)
                  ? 'bg-accent text-white'
                  : `${theme.textSoft} hover:${theme.background} hover:${theme.text}`
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-2 ${useMatch(`${basePath}/miners`) ? 'text-white' : theme.textSoft}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
              Tienda de Mineros
            </Link>
          </li>
          <li className="mb-0.5">
            <Link
              to={`${basePath}/home-miners`}
              className={`flex items-center py-1.5 px-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                useMatch(`${basePath}/home-miners`)
                  ? 'bg-accent text-white'
                  : `${theme.textSoft} hover:${theme.background} hover:${theme.text}`
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-2 ${useMatch(`${basePath}/home-miners`) ? 'text-white' : theme.textSoft}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
              Mis Mineros
            </Link>
          </li>
          <li className="mb-0.5">
            <Link
              to={`${basePath}/settings`}
              className={`flex items-center py-1.5 px-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                useMatch(`${basePath}/settings`)
                  ? 'bg-accent text-white'
                  : `${theme.textSoft} hover:${theme.background} hover:${theme.text}`
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-2 ${useMatch(`${basePath}/settings`) ? 'text-white' : theme.textSoft}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              Configuración
            </Link>
          </li>
        </ul>
      </nav>
      <div className={`mt-auto pt-2 border-t text-center ${theme.borderColor}`}>
        <p className={`text-xxs mb-1 ${theme.textSoft}`}>Miembro desde: 01/01/2023</p>
        <p className={`text-xxs ${theme.textSoft}`}>UID: {displayUser?.uid?.substring(0, 6) || 'Usuario'}</p>
      </div>
      {/* Botón de modo oscuro (desactivado temporalmente) */}
      {/*
      <div className="mt-4 flex justify-center">
        <button
          onClick={() => setDarkMode(!darkMode)}
          className={`py-2 px-4 rounded-lg text-sm font-medium transition-colors duration-200 ${
            darkMode ? 'bg-dark_border text-light_text hover:bg-gray-700' : 'bg-gray-100 text-dark_text hover:bg-gray-200'
          }`}
        >
          {darkMode ? 'Modo Claro' : 'Modo Oscuro'}
        </button>
      </div>
      */}
    </aside>
  );
};

export default Sidebar;
