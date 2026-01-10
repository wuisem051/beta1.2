import React, { useContext, useState } from 'react';
import { Link, useMatch, useLocation } from 'react-router-dom';
import { ThemeContext } from '../../context/ThemeContext';

const Sidebar = ({ unreadTicketsCount, newTradingSignalsCount, markTradingSignalsAsRead, displayUser }) => {
  const { darkMode, theme } = useContext(ThemeContext);
  const { pathname } = useLocation();
  const basePath = pathname.split('/').slice(0, 2).join('/');
  const [showWithdrawals, setShowWithdrawals] = useState(false);

  const isDashboardActive = useMatch(`${basePath}/dashboard`);
  const isReferralsActive = useMatch(`${basePath}/referrals`);
  const isBonusActive = useMatch(`${basePath}/bonus`);
  const isMyWalletActive = useMatch(`${basePath}/my-wallet`);
  const isWithdrawalsActive = useMatch(`${basePath}/withdrawals`);
  const isP2PMarketplaceActive = useMatch(`${basePath}/p2p-marketplace`);
  const isCollectiveFundActive = useMatch(`${basePath}/collective-fund`);
  const isMiningPortfolioActive = useMatch(`${basePath}/mining-portfolio`);
  const isMinersActive = useMatch(`${basePath}/miners`);
  const isSettingsActive = useMatch(`${basePath}/settings`);
  const isContactSupportActive = useMatch(`${basePath}/contact-support`);

  return (
    <aside className="w-64 p-4 shadow-xl border-r border-white border-opacity-5 flex flex-col" style={{ background: 'var(--bg-sidebar)', backdropFilter: 'var(--glass-blur)' }}>
      <div className="flex flex-col items-center text-center border-b border-white border-opacity-10 pb-6 mb-6">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3 shadow-lg" style={{ background: 'linear-gradient(135deg, var(--accent) 0%, #1e40af 100%)' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
        </div>
        <h2 className="text-sm font-bold truncate w-full" style={{ color: 'var(--dark-text)' }}>{displayUser.email || 'Usuario'}</h2>
        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full mt-1" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent)' }}>Pro Trader</span>
      </div>

      <nav className="flex-1 overflow-y-auto no-scrollbar">
        <ul className="space-y-1">
          <li>
            <Link to={`${basePath}/dashboard`} className={`flex items-center py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-300 ${isDashboardActive ? 'bg-accent text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:bg-accent hover:bg-opacity-10 hover:text-accent'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
              Dashboard
            </Link>
          </li>

          <li>
            <Link to={`${basePath}/collective-fund`} className={`flex items-center py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-300 ${isCollectiveFundActive ? 'bg-accent text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:bg-accent hover:bg-opacity-10 hover:text-accent'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
              Fondo Colectivo
            </Link>
          </li>

          <div className="pt-4 pb-2 px-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Trading & Crypto</div>

          <li>
            <Link to={`${basePath}/miners`} className={`flex items-center py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-300 ${isMinersActive ? 'bg-accent text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:bg-accent hover:bg-opacity-10 hover:text-accent'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3"><path d="m21 16-4 4-4-4" /><path d="M17 20V4" /><path d="m3 8 4-4 4 4" /><path d="M7 4v16" /></svg>
              Copy Trader
            </Link>
          </li>

          <li>
            <Link to={`${basePath}/mining-portfolio`} className={`flex items-center py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-300 ${isMiningPortfolioActive ? 'bg-accent text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:bg-accent hover:bg-opacity-10 hover:text-accent'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg>
              Mi Portafolio
            </Link>
          </li>

          <li>
            <div onClick={() => setShowWithdrawals(!showWithdrawals)} className={`flex items-center py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer ${isMyWalletActive || isWithdrawalsActive ? 'text-accent' : 'text-slate-500 hover:bg-accent hover:bg-opacity-10 hover:text-accent'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>
              Billetera
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`ml-auto transform transition-transform ${showWithdrawals ? 'rotate-90' : ''}`}><path d="m9 18 6-6-6-6" /></svg>
            </div>
            {showWithdrawals && (
              <ul className="ml-9 space-y-1 mt-1 border-l border-white border-opacity-10 pl-2">
                <li>
                  <Link to={`${basePath}/my-wallet`} className={`block py-2 px-3 rounded-lg text-[11px] font-bold ${isMyWalletActive ? 'text-accent' : 'text-slate-500 hover:bg-accent hover:bg-opacity-10 hover:text-accent'}`}>Balance</Link>
                </li>
                <li>
                  <Link to={`${basePath}/withdrawals`} className={`block py-2 px-3 rounded-lg text-[11px] font-bold ${isWithdrawalsActive ? 'text-accent' : 'text-slate-500 hover:bg-accent hover:bg-opacity-10 hover:text-accent'}`}>Retiros</Link>
                </li>
              </ul>
            )}
          </li>

          <li>
            <Link to={`${basePath}/p2p-marketplace`} className={`flex items-center py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-300 ${isP2PMarketplaceActive ? 'bg-accent text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:bg-accent hover:bg-opacity-10 hover:text-accent'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3"><path d="m8 3 4 8 5-5 5 15H2L8 3z" /></svg>
              Mercado P2P
            </Link>
          </li>

          <div className="pt-4 pb-2 px-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Soporte & Ajustes</div>

          <li>
            <Link to={`${basePath}/settings`} className={`flex items-center py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-300 ${isSettingsActive ? 'bg-accent text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:bg-accent hover:bg-opacity-10 hover:text-accent'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
              Ajustes
            </Link>
          </li>

          <li>
            <Link to={`${basePath}/contact-support`} className={`flex items-center py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-300 ${isContactSupportActive ? 'bg-accent text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:bg-accent hover:bg-opacity-10 hover:text-accent'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
              Soporte
              {unreadTicketsCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md">{unreadTicketsCount}</span>
              )}
            </Link>
          </li>
        </ul>
      </nav>

      <div className="mt-8 pt-6 border-t border-white border-opacity-10">
        <div className="bg-white bg-opacity-5 rounded-xl p-3 text-center">
          <p className="text-[10px] text-slate-500 font-bold mb-1 uppercase tracking-tighter">Tu ID Único</p>
          <p className="text-xs font-black text-white">{displayUser?.uid?.substring(0, 12).toUpperCase()}</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
