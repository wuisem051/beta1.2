import React, { useContext, useState, useRef, useEffect, useMemo } from 'react';
import './TopNav.css';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ThemeContext } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import {
    FaWallet, FaChartLine, FaUserCircle, FaHeadset,
    FaCog, FaGem, FaThLarge, FaHistory, FaExchangeAlt,
    FaUsers, FaShieldAlt, FaFire, FaSearch, FaBell,
    FaChevronDown, FaSignOutAlt, FaArrowDown, FaArrowUp,
    FaNetworkWired, FaBars, FaTimes
} from 'react-icons/fa';

const DropdownMenu = ({ items, isOpen }) => {
    if (!isOpen) return null;
    return (
        <div className="topnav-dropdown">
            {items.map((item, i) => (
                <Link key={i} to={item.path} className="topnav-dropdown-item">
                    {item.icon && <span className="topnav-dropdown-icon">{item.icon}</span>}
                    <div>
                        <div className="topnav-dropdown-label">{item.label}</div>
                        {item.desc && <div className="topnav-dropdown-desc">{item.desc}</div>}
                    </div>
                </Link>
            ))}
        </div>
    );
};

const NavItem = ({ label, path, icon, children, isHot, siteSettings, settingKey }) => {
    const [open, setOpen] = useState(false);
    const { pathname } = useLocation();
    const ref = useRef(null);
    const timeoutRef = useRef(null);

    const isActive = path ? pathname.includes(path) : children?.some(c => pathname.includes(c.path));

    if (settingKey && siteSettings && siteSettings[settingKey] === false) return null;

    const handleMouseEnter = () => {
        clearTimeout(timeoutRef.current);
        if (children) setOpen(true);
    };
    const handleMouseLeave = () => {
        timeoutRef.current = setTimeout(() => setOpen(false), 150);
    };

    useEffect(() => () => clearTimeout(timeoutRef.current), []);

    if (!children) {
        return (
            <Link to={path} className={`topnav-link ${isActive ? 'active' : ''}`}>
                {icon && <span className="topnav-link-icon">{icon}</span>}
                {label}
                {isHot && <FaFire className="topnav-fire" />}
            </Link>
        );
    }

    return (
        <div
            ref={ref}
            className={`topnav-link-wrap ${isActive ? 'active' : ''}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <div className={`topnav-link ${isActive ? 'active' : ''}`}>
                {icon && <span className="topnav-link-icon">{icon}</span>}
                {label}
                <FaChevronDown className={`topnav-chevron ${open ? 'rotated' : ''}`} />
            </div>
            <DropdownMenu items={children} isOpen={open} />
        </div>
    );
};

const TopNav = ({ displayUser, unreadTicketsCount, siteSettings }) => {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const profileRef = useRef(null);

    const isVIP = useMemo(() => {
        if (!displayUser?.vipStatus || displayUser.vipStatus === 'none') return false;
        const now = new Date();
        const expiry = displayUser?.vipExpiry?.toDate ? displayUser.vipExpiry.toDate() : new Date(displayUser?.vipExpiry);
        return expiry > now;
    }, [displayUser?.vipStatus, displayUser?.vipExpiry]);

    useEffect(() => {
        const handler = (e) => {
            if (profileRef.current && !profileRef.current.contains(e.target)) {
                setProfileOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Build wallet sub-items dynamically based on siteSettings
    const walletItems = [
        { path: '/user/my-wallet', label: 'Resumen', icon: <FaWallet />, desc: 'Vista general de activos' },
        ...(!siteSettings || siteSettings.showDeposits !== false ? [{ path: '/user/deposits', label: 'Depósito', icon: <FaArrowDown />, desc: 'Añadir fondos a tu cuenta' }] : []),
        ...(!siteSettings || siteSettings.showWithdrawals !== false ? [{ path: '/user/withdrawals', label: 'Retiro', icon: <FaArrowUp />, desc: 'Retirar fondos' }] : []),
        ...(!siteSettings || siteSettings.showP2PMarketplace !== false ? [{ path: '/user/p2p-marketplace', label: 'P2P Marketplace', icon: <FaExchangeAlt />, desc: 'Compra y vende entre usuarios' }] : []),
        ...(!siteSettings || siteSettings.showCajeroAirtm !== false ? [{ path: '/user/cajero', label: 'Cajero Airtm', icon: <FaExchangeAlt />, desc: 'Canjear con Airtm' }] : []),
    ];

    const tradingItems = [
        ...(!siteSettings || siteSettings.showExchangeSection !== false ? [{ path: '/user/exchange', label: 'Terminal Spot', icon: <FaChartLine />, desc: 'Trading en tiempo real' }] : []),
        ...(!siteSettings || siteSettings.showWhaleMonitor !== false ? [{ path: '/user/whale-monitor', label: 'Monitor Ballenas', icon: <FaNetworkWired />, desc: 'Actividad de grandes wallets' }] : []),
        ...(!siteSettings || siteSettings.showCopyTrading !== false ? [{ path: '/user/miners', label: 'Señales VIP', icon: <FaGem />, desc: 'Señales exclusivas de trading' }] : []),
        ...(!siteSettings || siteSettings.showTradingPortfolio !== false ? [{ path: '/user/mining-portfolio', label: 'Mi Portafolio', icon: <FaChartLine />, desc: 'Historial de operaciones' }] : []),
        ...(!siteSettings || siteSettings.showPlanTrading !== false ? [{ path: '/user/plan-trading', label: 'Plan de Trading', icon: <FaGem />, desc: 'Actualiza tu cuenta VIP' }] : []),
    ];

    const supportItems = [
        { path: '/user/contact-support', label: 'Tickets de Soporte', icon: <FaHeadset />, desc: 'Abre o responde un ticket' },
        { path: '/user/updates', label: 'Actualizaciones', icon: <FaHistory />, desc: 'Novedades de la plataforma' },
    ];

    const accountItems = [
        { path: '/user/settings', label: 'Ajustes de Cuenta', icon: <FaCog />, desc: 'Seguridad y preferencias' },
        ...(!siteSettings || siteSettings.showReferrals !== false ? [{ path: '/user/referrals', label: 'Referidos', icon: <FaUsers />, desc: 'Invita y gana comisiones' }] : []),
        ...(!siteSettings || siteSettings.showVipChat !== false ? [{ path: isVIP ? '/user/vip-chat' : '#', label: 'Chat VIP', icon: <FaGem />, desc: 'Canal exclusivo elite' }] : []),
    ];

    return (
        <>
            <nav className="topnav">
                <div className="topnav-inner">
                    {/* LEFT: Logo + Links */}
                    <div className="topnav-left">
                        <Link to="/user/dashboard" className="topnav-logo">
                            <div className="topnav-logo-icon" />
                            Bitunix
                        </Link>

                        <div className="topnav-links">
                            <Link to="/user/dashboard" className={`topnav-link ${pathname.includes('/dashboard') ? 'active' : ''}`}>
                                <FaThLarge className="topnav-link-icon" /> Dashboard
                            </Link>

                            <NavItem label="Billetera" icon={<FaWallet />} siteSettings={siteSettings} children={walletItems} />
                            <NavItem label="Trading" icon={<FaChartLine />} isHot siteSettings={siteSettings} children={tradingItems} />

                            {(!siteSettings || siteSettings.showCollectiveFund !== false) && (
                                <Link to="/user/collective-fund" className={`topnav-link ${pathname.includes('/collective-fund') ? 'active' : ''}`}>
                                    <FaUsers className="topnav-link-icon" /> Fondo Colectivo
                                </Link>
                            )}

                            <Link to="/user/bonus" className={`topnav-link ${pathname.includes('/bonus') ? 'active' : ''}`}>
                                Campañas
                            </Link>

                            <NavItem label="Soporte" icon={<FaHeadset />} siteSettings={siteSettings} children={supportItems} />
                            <NavItem label="Cuenta" icon={<FaCog />} siteSettings={siteSettings} children={accountItems} />
                        </div>
                    </div>

                    {/* RIGHT: Actions */}
                    <div className="topnav-right">
                        {/* Notifications */}
                        <button
                            className="topnav-icon-btn"
                            onClick={() => navigate('/user/contact-support')}
                            title="Notificaciones"
                        >
                            <FaBell />
                            {unreadTicketsCount > 0 && (
                                <span className="topnav-badge">{unreadTicketsCount}</span>
                            )}
                        </button>

                        {/* Wallet shortcut */}
                        <button className="topnav-icon-btn" onClick={() => navigate('/user/my-wallet')} title="Billetera">
                            <FaWallet />
                        </button>

                        {/* Profile dropdown */}
                        <div ref={profileRef} className="topnav-profile-wrap">
                            <button
                                className="topnav-profile-btn"
                                onClick={() => setProfileOpen(!profileOpen)}
                            >
                                <div className="topnav-avatar">
                                    {displayUser?.profilePhotoUrl
                                        ? <img src={displayUser.profilePhotoUrl} alt="Avatar" />
                                        : <FaUserCircle />
                                    }
                                </div>
                                <div className="topnav-profile-info">
                                    <span className="topnav-profile-name">
                                        {displayUser?.displayName || displayUser?.username || 'Usuario'}
                                    </span>
                                    <span className="topnav-profile-level">
                                        {isVIP ? 'VIP ELITE' : 'STANDARD'}
                                    </span>
                                </div>
                                <FaChevronDown className={`topnav-chevron ${profileOpen ? 'rotated' : ''}`} />
                            </button>

                            {profileOpen && (
                                <div className="topnav-profile-dropdown">
                                    <div className="topnav-profile-header">
                                        <div className="topnav-profile-header-avatar">
                                            {displayUser?.profilePhotoUrl
                                                ? <img src={displayUser.profilePhotoUrl} alt="Avatar" />
                                                : <FaUserCircle />
                                            }
                                        </div>
                                        <div>
                                            <p className="topnav-profile-header-name">
                                                {displayUser?.displayName || displayUser?.username || 'Usuario'}
                                            </p>
                                            <p className="topnav-profile-header-id">
                                                ID: {displayUser?.uid?.substring(0, 10).toUpperCase()}
                                            </p>
                                        </div>
                                        <span className={`topnav-vip-badge ${isVIP ? 'vip' : ''}`}>
                                            {isVIP ? 'VIP' : 'FREE'}
                                        </span>
                                    </div>
                                    <div className="topnav-dropdown-divider" />
                                    <Link to="/user/settings" className="topnav-dropdown-item" onClick={() => setProfileOpen(false)}>
                                        <FaCog className="topnav-dropdown-icon" /> Ajustes de Cuenta
                                    </Link>
                                    <Link to="/user/my-wallet" className="topnav-dropdown-item" onClick={() => setProfileOpen(false)}>
                                        <FaWallet className="topnav-dropdown-icon" /> Mi Billetera
                                    </Link>
                                    {(!siteSettings || siteSettings.showReferrals !== false) && (
                                        <Link to="/user/referrals" className="topnav-dropdown-item" onClick={() => setProfileOpen(false)}>
                                            <FaUsers className="topnav-dropdown-icon" /> Referidos
                                        </Link>
                                    )}
                                    <div className="topnav-dropdown-divider" />
                                    <button
                                        className="topnav-dropdown-item topnav-logout"
                                        onClick={() => { setProfileOpen(false); logout(); }}
                                    >
                                        <FaSignOutAlt className="topnav-dropdown-icon" /> Cerrar Sesión
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Mobile hamburger */}
                        <button className="topnav-hamburger" onClick={() => setMobileOpen(!mobileOpen)}>
                            {mobileOpen ? <FaTimes /> : <FaBars />}
                        </button>
                    </div>
                </div>

                {/* Mobile drawer */}
                {mobileOpen && (
                    <div className="topnav-mobile-drawer">
                        <Link to="/user/dashboard" className="topnav-mobile-link" onClick={() => setMobileOpen(false)}>
                            <FaThLarge /> Dashboard
                        </Link>
                        <Link to="/user/my-wallet" className="topnav-mobile-link" onClick={() => setMobileOpen(false)}>
                            <FaWallet /> Billetera
                        </Link>
                        {(!siteSettings || siteSettings.showDeposits !== false) && (
                            <Link to="/user/deposits" className="topnav-mobile-link topnav-mobile-sub" onClick={() => setMobileOpen(false)}>
                                Depósito
                            </Link>
                        )}
                        {(!siteSettings || siteSettings.showWithdrawals !== false) && (
                            <Link to="/user/withdrawals" className="topnav-mobile-link topnav-mobile-sub" onClick={() => setMobileOpen(false)}>
                                Retiro
                            </Link>
                        )}
                        {(!siteSettings || siteSettings.showExchangeSection !== false) && (
                            <Link to="/user/exchange" className="topnav-mobile-link" onClick={() => setMobileOpen(false)}>
                                <FaChartLine /> Trading Spot
                            </Link>
                        )}
                        {(!siteSettings || siteSettings.showCopyTrading !== false) && (
                            <Link to="/user/miners" className="topnav-mobile-link" onClick={() => setMobileOpen(false)}>
                                <FaGem /> Señales VIP
                            </Link>
                        )}
                        {(!siteSettings || siteSettings.showCollectiveFund !== false) && (
                            <Link to="/user/collective-fund" className="topnav-mobile-link" onClick={() => setMobileOpen(false)}>
                                <FaUsers /> Fondo Colectivo
                            </Link>
                        )}
                        <Link to="/user/bonus" className="topnav-mobile-link" onClick={() => setMobileOpen(false)}>
                            Campañas
                        </Link>
                        <Link to="/user/contact-support" className="topnav-mobile-link" onClick={() => setMobileOpen(false)}>
                            <FaHeadset /> Soporte
                        </Link>
                        <Link to="/user/settings" className="topnav-mobile-link" onClick={() => setMobileOpen(false)}>
                            <FaCog /> Ajustes
                        </Link>
                        <button
                            className="topnav-mobile-link topnav-mobile-logout"
                            onClick={() => { setMobileOpen(false); logout(); }}
                        >
                            <FaSignOutAlt /> Cerrar Sesión
                        </button>
                    </div>
                )}
            </nav>
        </>
    );
};

export default TopNav;
