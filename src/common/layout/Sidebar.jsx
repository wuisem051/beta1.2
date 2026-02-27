import React, { useContext, useState, useMemo } from 'react';
import { Link, useMatch, useLocation } from 'react-router-dom';
import { ThemeContext } from '../../context/ThemeContext';
import {
  FaChevronDown, FaChevronUp, FaWallet, FaChartLine,
  FaUserCircle, FaHeadset, FaCog, FaBell, FaGem,
  FaThLarge, FaHistory, FaExchangeAlt, FaNetworkWired,
  FaArrowDown, FaArrowUp, FaUsers, FaShieldAlt
} from 'react-icons/fa';

import candadoIcon from '../../imagens/candado.png';

const Sidebar = ({ unreadTicketsCount, newTradingSignalsCount, markTradingSignalsAsRead, displayUser, isHidden, siteSettings }) => {
  const { darkMode } = useContext(ThemeContext);
  const { pathname } = useLocation();
  const basePath = pathname.split('/').slice(0, 2).join('/');

  // States for collapsible menus
  const [openMenus, setOpenMenus] = useState({
    wallet: pathname.includes('wallet') || pathname.includes('deposits') || pathname.includes('withdrawals'),
    trading: pathname.includes('miners') || pathname.includes('mining-portfolio') || pathname.includes('exchange') || pathname.includes('plan-trading'),
    support: pathname.includes('contact-support') || pathname.includes('updates'),
    account: pathname.includes('settings')
  });

  const toggleMenu = (menu) => {
    setOpenMenus(prev => ({ ...prev, [menu]: !prev[menu] }));
  };

  const isVIP = useMemo(() => {
    if (!displayUser?.vipStatus || displayUser.vipStatus === 'none') return false;
    const now = new Date();
    const expiry = displayUser.vipExpiry?.toDate ? displayUser.vipExpiry.toDate() : new Date(displayUser.vipExpiry);
    return expiry > now;
  }, [displayUser.vipStatus, displayUser.vipExpiry]);

  const handleVIPChatClick = (e) => {
    if (!isVIP) {
      e.preventDefault();
      alert("Adquiere Nuestra Tarifa Vip y Disfruta de tus financias");
    }
  };

  const NavLink = ({ to, icon, label, isActive, onClick }) => (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 group ${isActive
        ? 'bg-[#2b3139] text-[#fcd535]'
        : 'text-slate-400 hover:bg-[#1e2329] hover:text-white'
        }`}
    >
      <span className={`mr-3 text-sm ${isActive ? 'text-[#fcd535]' : 'text-slate-500 group-hover:text-white'}`}>
        {icon}
      </span>
      {label}
      {isActive && <div className="ml-auto w-1.5 h-1.5 bg-[#fcd535] rounded-full shadow-[0_0_8px_#fcd535]"></div>}
    </Link>
  );

  const CollapsibleHeader = ({ icon, label, isOpen, onClick }) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 text-slate-400 hover:text-white hover:bg-[#1e2329] group`}
    >
      <span className="mr-3 text-sm text-slate-500 group-hover:text-white">
        {icon}
      </span>
      {label}
      <span className="ml-auto text-[10px] text-slate-500">
        {isOpen ? <FaChevronUp /> : <FaChevronDown />}
      </span>
    </button>
  );

  return (
    <aside
      className={`shadow-xl border-r border-white border-opacity-5 flex flex-col transition-all duration-300 ease-in-out ${isHidden ? 'w-0 p-0 border-r-0 opacity-0 -translate-x-full' : 'w-64 opacity-100 translate-x-0'}`}
      style={{
        background: '#12161c',
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 110,
        overflow: 'hidden',
        padding: isHidden ? '0' : '1rem 0.75rem'
      }}
    >
      {/* Header Profile Section */}
      <div className="flex items-center gap-3 px-3 pb-6 mb-4 border-b border-white border-opacity-5 mt-2">
        <div className="w-10 h-10 rounded-full bg-[#fcd535] flex items-center justify-center overflow-hidden border-2 border-[#2b3139] relative shrink-0">
          {displayUser?.profilePhotoUrl ? (
            <img src={displayUser.profilePhotoUrl} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <FaUserCircle className="text-[#1e2329] text-3xl" />
          )}
        </div>
        <div className="min-w-0">
          <h2 className="text-xs font-black truncate text-white uppercase tracking-tighter">
            {displayUser?.displayName || displayUser?.username || 'Usuario'}
          </h2>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[9px] font-black uppercase tracking-widest text-[#fcd535]">
              {isVIP ? 'VIP ELITE' : 'STANDARD'}
            </span>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto no-scrollbar px-1">
        <div className="space-y-4">

          {/* Dashboard Item */}
          <NavLink
            to="/user/dashboard"
            icon={<FaThLarge />}
            label="Dashboard"
            isActive={pathname.includes('/dashboard')}
          />

          {/* Billetera Section */}
          <div className="space-y-1">
            <CollapsibleHeader
              icon={<FaWallet />}
              label="Billetera"
              isOpen={openMenus.wallet}
              onClick={() => toggleMenu('wallet')}
            />
            {openMenus.wallet && (
              <div className="pl-9 space-y-1 animate-in slide-in-from-top-1 duration-200">
                <NavLink to="/user/my-wallet" label="Resumen" isActive={pathname === '/user/my-wallet'} />
                {(!siteSettings || siteSettings.showDeposits !== false) && (
                  <NavLink to="/user/deposits" label="Depósito" isActive={pathname.includes('/deposits')} />
                )}
                {(!siteSettings || siteSettings.showWithdrawals !== false) && (
                  <NavLink to="/user/withdrawals" label="Retiro" isActive={pathname.includes('/withdrawals')} />
                )}
                {(!siteSettings || siteSettings.showP2PMarketplace !== false) && (
                  <NavLink to="/user/p2p-marketplace" label="P2P Marketplace" isActive={pathname.includes('/p2p-marketplace')} />
                )}
                {(!siteSettings || siteSettings.showCajeroAirtm !== false) && (
                  <NavLink to="/user/cajero" label="Cajero Airtm" isActive={pathname.includes('/cajero')} />
                )}
              </div>
            )}
          </div>

          {/* Trading Section */}
          <div className="space-y-1">
            <CollapsibleHeader
              icon={<FaChartLine />}
              label="Trading"
              isOpen={openMenus.trading}
              onClick={() => toggleMenu('trading')}
            />
            {openMenus.trading && (
              <div className="pl-9 space-y-1 animate-in slide-in-from-top-1 duration-200">
                {(!siteSettings || siteSettings.showExchangeSection !== false) && (
                  <NavLink to="/user/exchange" label="Terminal Spot" isActive={pathname.includes('/exchange')} />
                )}
                {(!siteSettings || siteSettings.showWhaleMonitor !== false) && (
                  <NavLink to="/user/whale-monitor" label="Monitor Ballenas" isActive={pathname.includes('/whale-monitor')} />
                )}
                {(!siteSettings || siteSettings.showCopyTrading !== false) && (
                  <NavLink to="/user/miners" label="Señales VIP" isActive={pathname.includes('/miners')} />
                )}
                {(!siteSettings || siteSettings.showTradingPortfolio !== false) && (
                  <NavLink to="/user/mining-portfolio" label="Mi Portafolio" isActive={pathname.includes('/mining-portfolio')} />
                )}
                {(!siteSettings || siteSettings.showPlanTrading !== false) && (
                  <NavLink to="/user/plan-trading" label="Plan de Trading" isActive={pathname.includes('/plan-trading')} />
                )}
              </div>
            )}
          </div>

          {/* Fondo Colectivo */}
          {(!siteSettings || siteSettings.showCollectiveFund !== false) && (
            <NavLink
              to="/user/collective-fund"
              icon={<FaUsers />}
              label="Fondo Colectivo"
              isActive={pathname.includes('/collective-fund')}
            />
          )}

          {/* Chat VIP */}
          {(!siteSettings || siteSettings.showVipChat !== false) && (
            <NavLink
              to={isVIP ? "/user/vip-chat" : "#"}
              icon={<FaGem />}
              label="Chat Privado VIP"
              isActive={pathname.includes('/vip-chat')}
              onClick={handleVIPChatClick}
            />
          )}

          <div className="pt-4 pb-2 px-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">SISTEMA</div>

          {/* Soporte Section */}
          <div className="space-y-1">
            <CollapsibleHeader
              icon={<FaHeadset />}
              label="Soporte"
              isOpen={openMenus.support}
              onClick={() => toggleMenu('support')}
            />
            {openMenus.support && (
              <div className="pl-9 space-y-1 animate-in slide-in-from-top-1 duration-200">
                <NavLink to="/user/contact-support" label="Tickets" isActive={pathname.includes('/contact-support')} />
                <NavLink to="/user/updates" label="Registro" isActive={pathname.includes('/updates')} />
              </div>
            )}
          </div>

          {/* Configuración Section */}
          <div className="space-y-1">
            <CollapsibleHeader
              icon={<FaCog />}
              label="Cuenta"
              isOpen={openMenus.account}
              onClick={() => toggleMenu('account')}
            />
            {openMenus.account && (
              <div className="pl-9 space-y-1 animate-in slide-in-from-top-1 duration-200">
                <NavLink to="/user/settings" label="Ajustes" isActive={pathname.includes('/settings')} />
                {(!siteSettings || siteSettings.showReferrals !== false) && (
                  <NavLink to="/user/referrals" label="Referidos" isActive={pathname.includes('/referrals')} />
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Footer ID Section */}
      <div className="mt-4 pt-4 border-t border-white border-opacity-5">
        <div className="bg-white bg-opacity-5 rounded-2xl p-4 flex items-center justify-between group hover:bg-white/10 transition-all cursor-pointer">
          <div>
            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest leading-none mb-1">Tu ID Único</p>
            <p className="text-[10px] font-black text-white leading-none font-mono">
              {displayUser?.uid?.substring(0, 10).toUpperCase()}
            </p>
          </div>
          <FaShieldAlt className="text-slate-600 group-hover:text-[#fcd535] transition-colors" />
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
