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
              to={`${basePath}/trading-signal`}
              className={`flex items-center py-1.5 px-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                useMatch(`${basePath}/trading-signal`) 
                  ? 'bg-accent text-white' 
                  : `${theme.textSoft} hover:${theme.background} hover:${theme.text}`
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-2 ${useMatch(`${basePath}/trading-signal`) ? 'text-white' : theme.textSoft}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M18 14v4h4m-9-1V5h-2M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
              Señal Trading
              {newTradingSignalsCount > 0 && (
                <span className="ml-auto bg-red_error text-white text-xxs font-bold px-2 py-0.5 rounded-full">
                  {newTradingSignalsCount}
                </span>
              )}
            </Link>
          </li>
          <li className="mb-0.5">
            <Link
              to={`${basePath}/trading-panel`}
              className={`flex items-center py-1.5 px-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                useMatch(`${basePath}/trading-panel`) 
                  ? 'bg-accent text-white' 
                  : `${theme.textSoft} hover:${theme.background} hover:${theme.text}`
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-2 ${useMatch(`${basePath}/trading-panel`) ? 'text-white' : theme.textSoft}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l-5 4V6l9-4 9 4v4l-5-4v13"/></svg>
              Panel de Trading
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
              to={`${basePath}/p2p-marketplace`}
              className={`flex items-center py-1.5 px-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                useMatch(`${basePath}/p2p-marketplace`)
                  ? 'bg-accent text-white'
                  : `${theme.textSoft} hover:${theme.background} hover:${theme.text}`
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-2 ${useMatch(`${basePath}/p2p-marketplace`) ? 'text-white' : theme.textSoft}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 5.918H21l-3-7H8l2-2m0 0l-3-3m5-6h8a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V7a2 2 0 012-2zm0 0h2.5"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-4m0 0l4 4m-4-4v12"/></svg>
              Mercado P2P
            </Link>
          </li>
          <li className="mb-0.5">
            <Link
              to={`${basePath}/wallet-display`}
              className={`flex items-center py-1.5 px-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                useMatch(`${basePath}/wallet-display`) 
                  ? 'bg-accent text-white' 
                  : `${theme.textSoft} hover:${theme.background} hover:${theme.text}`
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-2 ${useMatch(`${basePath}/wallet-display`) ? 'text-white' : theme.textSoft}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
              Billetera
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
