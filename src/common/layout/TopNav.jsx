import React, { useState, useRef, useEffect, useMemo, useContext } from 'react';
import './TopNav.css';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ThemeContext } from '../../context/ThemeContext';
import {
    FaWallet, FaChartLine, FaUserCircle, FaHeadset,
    FaCog, FaGem, FaThLarge, FaHistory, FaExchangeAlt,
    FaUsers, FaFire, FaBell, FaChevronDown, FaSignOutAlt,
    FaArrowDown, FaArrowUp, FaNetworkWired, FaBars, FaTimes,
    FaShieldAlt, FaTachometerAlt, FaCoins, FaChartBar,
    FaSun, FaMoon, FaRobot
} from 'react-icons/fa';

/* ── Dropdown con hover ──────────────────────────────────────── */
const Dropdown = ({ items, isOpen, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="tn-dropdown">
            {items.map((item, i) => (
                item.divider
                    ? <div key={i} className="tn-dd-divider" />
                    : <Link
                        key={i}
                        to={item.path}
                        className="tn-dd-item"
                        onClick={onClose}
                    >
                        {item.icon && (
                            <span className="tn-dd-icon-wrap">
                                {item.icon}
                            </span>
                        )}
                        <div className="tn-dd-text">
                            <span className="tn-dd-label">{item.label}</span>
                            {item.desc && <span className="tn-dd-desc">{item.desc}</span>}
                        </div>
                        {item.tag && <span className={`tn-dd-tag ${item.tag.cls}`}>{item.tag.text}</span>}
                    </Link>
            ))}
        </div>
    );
};

/* ── NavItem con dropdown en hover ───────────────────────────── */
const NavItem = ({ label, icon, children, path, isHot, active }) => {
    const [open, setOpen] = useState(false);
    const timer = useRef(null);

    const enter = () => { clearTimeout(timer.current); if (children) setOpen(true); };
    const leave = () => { timer.current = setTimeout(() => setOpen(false), 180); };
    useEffect(() => () => clearTimeout(timer.current), []);

    if (!children) {
        return (
            <Link to={path} className={`tn-link ${active ? 'tn-active' : ''}`}>
                {icon && <span className="tn-link-icon">{icon}</span>}
                <span>{label}</span>
                {isHot && <FaFire className="tn-fire" />}
            </Link>
        );
    }

    return (
        <div className={`tn-item ${active ? 'tn-active' : ''}`} onMouseEnter={enter} onMouseLeave={leave}>
            <div className={`tn-link ${active ? 'tn-active' : ''}`}>
                {icon && <span className="tn-link-icon">{icon}</span>}
                <span>{label}</span>
                <FaChevronDown className={`tn-chevron ${open ? 'open' : ''}`} />
            </div>
            <Dropdown items={children} isOpen={open} onClose={() => setOpen(false)} />
        </div>
    );
};

/* ── TopNav principal ────────────────────────────────────────── */
const TopNav = ({ displayUser, unreadTicketsCount, siteSettings }) => {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const { logout, currentUser } = useAuth();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const profileRef = useRef(null);
    const { darkMode, setDarkMode } = useContext(ThemeContext);

    const isVIP = useMemo(() => {
        if (!displayUser?.vipStatus || displayUser.vipStatus === 'none') return false;
        const now = new Date();
        const exp = displayUser?.vipExpiry?.toDate
            ? displayUser.vipExpiry.toDate()
            : new Date(displayUser?.vipExpiry);
        return exp > now;
    }, [displayUser?.vipStatus, displayUser?.vipExpiry]);

    // Cerrar profile dropdown al click fuera
    useEffect(() => {
        const h = (e) => {
            if (profileRef.current && !profileRef.current.contains(e.target))
                setProfileOpen(false);
        };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    const is = (seg) => pathname.includes(seg);

    /* ── Sub-menús ──────────────────────────────────────────── */
    const walletItems = [
        { path: '/user/my-wallet', label: 'Resumen de Activos', icon: <FaCoins />, desc: 'Vista completa de tu portafolio' },
        ...(!siteSettings || siteSettings.showDeposits !== false
            ? [{ path: '/user/deposits', label: 'Depósito', icon: <FaArrowDown />, desc: 'Añadir fondos a tu cuenta', tag: { text: 'Rápido', cls: 'green' } }] : []),
        ...(!siteSettings || siteSettings.showWithdrawals !== false
            ? [{ path: '/user/withdrawals', label: 'Retiro', icon: <FaArrowUp />, desc: 'Retirar fondos' }] : []),
        { divider: true },
        ...(!siteSettings || siteSettings.showP2PMarketplace !== false
            ? [{ path: '/user/p2p-marketplace', label: 'P2P Marketplace', icon: <FaExchangeAlt />, desc: 'Compra y vende entre usuarios' }] : []),
        { path: '/user/p2p-monitor', label: 'P2P Monitor', icon: <FaChartLine />, desc: 'Arbitraje en tiempo real', tag: { text: 'NUEVO', cls: 'orange' } },
        ...(!siteSettings || siteSettings.showCajeroAirtm !== false
            ? [{ path: '/user/cajero', label: 'Cajero Airtm', icon: <FaWallet />, desc: 'Canjear saldo con Airtm' }] : []),
    ];

    const tradingItems = [
        ...(!siteSettings || siteSettings.showExchangeSection !== false
            ? [{ path: '/user/exchange', label: 'Terminal Spot', icon: <FaChartBar />, desc: 'Gráficos en tiempo real', tag: { text: '🔥 HOT', cls: 'orange' } }] : []),
        { divider: true },
        ...(!siteSettings || siteSettings.showCopyTrading !== false
            ? [{ path: '/user/miners', label: 'Señales VIP', icon: <FaGem />, desc: 'Señales exclusivas de expertos', tag: { text: 'VIP', cls: 'gold' } }] : []),
        ...(!siteSettings || siteSettings.showTradingPortfolio !== false
            ? [{ path: '/user/mining-portfolio', label: 'Mi Portafolio', icon: <FaChartLine />, desc: 'Historial de operaciones' }] : []),
        ...(!siteSettings || siteSettings.showPlanTrading !== false
            ? [{ path: '/user/plan-trading', label: 'Plan de Trading', icon: <FaShieldAlt />, desc: 'Actualiza tu cuenta VIP' }] : []),
        { divider: true },
        { path: '/user/bot-zone', label: 'Zona de Bots', icon: <FaRobot />, desc: 'Bots Spot automatizados', tag: { text: '🤖 NUEVO', cls: 'green' } },
    ];

    const supportItems = [
        { path: '/user/contact-support', label: 'Tickets de Soporte', icon: <FaHeadset />, desc: 'Abre o responde un ticket' },
        { path: '/user/updates', label: 'Actualizaciones', icon: <FaHistory />, desc: 'Novedades de la plataforma' },
    ];

    const cuentaItems = [
        { path: '/user/settings', label: 'Ajustes de Cuenta', icon: <FaCog />, desc: 'Seguridad y preferencias' },
        ...(!siteSettings || siteSettings.showReferrals !== false
            ? [{ path: '/user/referrals', label: 'Referidos', icon: <FaUsers />, desc: 'Invita y gana comisiones' }] : []),
        ...(!siteSettings || siteSettings.showVipChat !== false
            ? [{ path: isVIP ? '/user/vip-chat' : '#', label: 'Chat VIP', icon: <FaGem />, desc: 'Canal exclusivo elite', tag: isVIP ? { text: 'ELITE', cls: 'gold' } : { text: 'BLOQ', cls: 'gray' } }] : []),
    ];

    return (
        <>
            <nav className="tn-nav">
                <div className="tn-inner">

                    {/* ── LOGO ───────────────────────────────── */}
                    <Link to="/" className="tn-logo">
                        <svg viewBox="0 0 100 100" className="w-8 h-8 filter drop-shadow(0 0 8px var(--accent))">
                            <path d="M50 15 L85 50 L50 85 L15 50 Z" fill="none" stroke="var(--accent)" strokeWidth="6" />
                            <path d="M50 30 L70 50 L50 70 L30 50 Z" fill="var(--accent)" />
                        </svg>
                        <span className="tn-logo-text" style={{ background: 'linear-gradient(90deg, var(--accent), #fff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: '1.5rem' }}>MaxiOS</span>
                    </Link>

                    {/* ── SEPARADOR VERTICAL ─────────────────── */}
                    <div className="tn-sep" />

                    {/* ── LINKS DE NAVEGACIÓN ─────────────────── */}
                    <div className="tn-links">
                        <NavItem
                            path="/user/dashboard"
                            label="Dashboard"
                            icon={<FaTachometerAlt />}
                            active={is('/dashboard')}
                        />
                        <NavItem
                            label="Billetera"
                            icon={<FaWallet />}
                            active={is('/my-wallet') || is('/deposits') || is('/withdrawals') || is('/p2p') || is('/cajero')}
                            children={walletItems}
                        />
                        <NavItem
                            label="Trading"
                            icon={<FaChartLine />}
                            isHot
                            active={is('/exchange') || is('/miners') || is('/mining-portfolio') || is('/plan-trading') || is('/bot-zone')}
                            children={tradingItems}
                        />
                        {(!siteSettings || siteSettings.showCollectiveFund !== false) && (
                            <NavItem
                                path="/user/collective-fund"
                                label="Fondo Colectivo"
                                icon={<FaUsers />}
                                active={is('/collective-fund')}
                            />
                        )}
                        <NavItem
                            path="/user/bonus"
                            label="Campañas"
                            active={is('/bonus')}
                        />
                        <NavItem
                            label="Soporte"
                            icon={<FaHeadset />}
                            active={is('/contact-support') || is('/updates')}
                            children={supportItems}
                        />
                        <NavItem
                            label="Cuenta"
                            icon={<FaCog />}
                            active={is('/settings') || is('/referrals') || is('/vip-chat')}
                            children={cuentaItems}
                        />
                    </div>

                    {/* ── RIGHT SIDE ───────────────────────────── */}
                    <div className="tn-right">
                        {currentUser ? (
                            <>
                                {/* Depositar – botón acción */}
                                <button
                                    className="tn-deposit-btn"
                                    onClick={() => navigate('/user/deposits')}
                                >
                                    Depositar
                                </button>

                                {/* Notificaciones */}
                                <button
                                    className="tn-icon-btn"
                                    onClick={() => navigate('/user/contact-support')}
                                    title="Soporte / Tickets"
                                >
                                    <FaBell />
                                    {unreadTicketsCount > 0 && (
                                        <span className="tn-badge">{unreadTicketsCount}</span>
                                    )}
                                </button>

                                {/* Wallet rápido */}
                                <button
                                    className="tn-icon-btn"
                                    onClick={() => navigate('/user/my-wallet')}
                                    title="Mi Billetera"
                                >
                                    <FaWallet />
                                </button>

                                {/* ── PERFIL ───────────────────────────── */}
                                <div ref={profileRef} className="tn-profile-wrap">
                                    <button
                                        className="tn-profile-btn"
                                        onClick={() => setProfileOpen(!profileOpen)}
                                    >
                                        <div className="tn-avatar">
                                            {displayUser?.profilePhotoUrl
                                                ? <img src={displayUser.profilePhotoUrl} alt="avatar" />
                                                : <FaUserCircle />
                                            }
                                        </div>
                                        <div className="tn-profile-text">
                                            <span className="tn-profile-name">
                                                {(displayUser?.displayName || displayUser?.username || 'Usuario').substring(0, 14)}
                                            </span>
                                            <span className={`tn-profile-level ${isVIP ? 'vip' : ''}`}>
                                                {isVIP ? '⭐ VIP ELITE' : 'STANDARD'}
                                            </span>
                                        </div>
                                        <FaChevronDown className={`tn-chevron ${profileOpen ? 'open' : ''}`} />
                                    </button>

                                    {/* Perfil dropdown */}
                                    {profileOpen && (
                                        <div className="tn-profile-dd">
                                            {/* Header del dropdown */}
                                            <div className="tn-profile-dd-head">
                                                <div className="tn-profile-dd-avatar">
                                                    {displayUser?.profilePhotoUrl
                                                        ? <img src={displayUser.profilePhotoUrl} alt="avatar" />
                                                        : <FaUserCircle />
                                                    }
                                                </div>
                                                <div className="tn-profile-dd-info">
                                                    <p className="tn-profile-dd-name">
                                                        {displayUser?.displayName || displayUser?.username || 'Usuario'}
                                                    </p>
                                                    <p className="tn-profile-dd-id">
                                                        UID: {displayUser?.uid?.substring(0, 12).toUpperCase()}
                                                    </p>
                                                </div>
                                                <span className={`tn-vip-pill ${isVIP ? 'vip' : ''}`}>
                                                    {isVIP ? 'VIP' : 'FREE'}
                                                </span>
                                            </div>

                                            <div className="tn-dd-divider" />

                                            <Link to="/user/settings" className="tn-dd-item" onClick={() => setProfileOpen(false)}>
                                                <span className="tn-dd-icon-wrap"><FaCog /></span>
                                                <div className="tn-dd-text">
                                                    <span className="tn-dd-label">Ajustes de Cuenta</span>
                                                    <span className="tn-dd-desc">Seguridad y preferencias</span>
                                                </div>
                                            </Link>
                                            <Link to="/user/my-wallet" className="tn-dd-item" onClick={() => setProfileOpen(false)}>
                                                <span className="tn-dd-icon-wrap"><FaWallet /></span>
                                                <div className="tn-dd-text">
                                                    <span className="tn-dd-label">Mi Billetera</span>
                                                    <span className="tn-dd-desc">Activos y movimientos</span>
                                                </div>
                                            </Link>
                                            {(!siteSettings || siteSettings.showReferrals !== false) && (
                                                <Link to="/user/referrals" className="tn-dd-item" onClick={() => setProfileOpen(false)}>
                                                    <span className="tn-dd-icon-wrap"><FaUsers /></span>
                                                    <div className="tn-dd-text">
                                                        <span className="tn-dd-label">Referidos</span>
                                                        <span className="tn-dd-desc">Invita y gana comisiones</span>
                                                    </div>
                                                </Link>
                                            )}

                                            <div className="tn-dd-divider" />

                                            <button
                                                className="tn-dd-item tn-dd-logout"
                                                onClick={() => { setProfileOpen(false); logout(); }}
                                            >
                                                <span className="tn-dd-icon-wrap red"><FaSignOutAlt /></span>
                                                <div className="tn-dd-text">
                                                    <span className="tn-dd-label">Cerrar Sesión</span>
                                                </div>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center gap-4 ml-4">
                                <Link to="/login" className="text-slate-300 hover:text-white text-xs font-bold transition-colors">Iniciar Sesión</Link>
                                <Link to="/signup" className="bg-accent text-black px-5 py-2 rounded-lg text-xs font-black transition-all hover:opacity-90 hover:shadow-[0_0_15px_rgba(193,255,46,0.4)] uppercase tracking-tight">Registrarse</Link>
                            </div>
                        )}

                        {/* Cambio de Tema - Disponible para todos */}
                        <button
                            className="tn-icon-btn theme-toggle"
                            onClick={() => setDarkMode(!darkMode)}
                            title={darkMode ? "Activar Modo Claro" : "Activar Modo Oscuro"}
                            style={{ marginLeft: '8px' }}
                        >
                            {darkMode ? <FaSun className="text-yellow-400" /> : <FaMoon className="text-blue-400" />}
                        </button>

                        {/* Hamburger mobile */}
                        <button className="tn-hamburger" onClick={() => setMobileOpen(!mobileOpen)}>
                            {mobileOpen ? <FaTimes /> : <FaBars />}
                        </button>
                    </div>
                </div>

                {/* ── MOBILE DRAWER ─────────────────────────── */}
                {mobileOpen && (
                    <div className="tn-mobile-drawer">
                        {[
                            { to: '/user/dashboard', icon: <FaTachometerAlt />, label: 'Dashboard' },
                            { to: '/user/my-wallet', icon: <FaWallet />, label: 'Billetera' },
                            ...(!siteSettings || siteSettings.showDeposits !== false ? [{ to: '/user/deposits', label: '↓ Depósito', sub: true }] : []),
                            ...(!siteSettings || siteSettings.showWithdrawals !== false ? [{ to: '/user/withdrawals', label: '↑ Retiro', sub: true }] : []),
                            { to: '/user/p2p-monitor', label: '🔍 P2P Monitor', sub: true },
                            ...(!siteSettings || siteSettings.showExchangeSection !== false ? [{ to: '/user/exchange', icon: <FaChartLine />, label: 'Terminal Spot' }] : []),
                            ...(!siteSettings || siteSettings.showCopyTrading !== false ? [{ to: '/user/miners', icon: <FaGem />, label: 'Señales VIP' }] : []),
                            ...(!siteSettings || siteSettings.showTradingPortfolio !== false ? [{ to: '/user/mining-portfolio', icon: <FaChartLine />, label: 'Mi Portafolio' }] : []),
                            { to: '/user/bot-zone', icon: <FaRobot />, label: 'Zona de Bots' },
                            ...(!siteSettings || siteSettings.showCollectiveFund !== false ? [{ to: '/user/collective-fund', icon: <FaUsers />, label: 'Fondo Colectivo' }] : []),
                            { to: '/user/bonus', label: 'Campañas' },
                            { to: '/user/contact-support', icon: <FaHeadset />, label: 'Soporte' },
                            { to: '/user/updates', icon: <FaHistory />, label: 'Actualizaciones' },
                            { to: '/user/settings', icon: <FaCog />, label: 'Ajustes' },
                            ...(!siteSettings || siteSettings.showReferrals !== false ? [{ to: '/user/referrals', icon: <FaUsers />, label: 'Referidos' }] : []),
                        ].map((item, i) =>
                            <Link
                                key={i}
                                to={item.to}
                                className={`tn-mob-link ${item.sub ? 'sub' : ''}`}
                                onClick={() => setMobileOpen(false)}
                            >
                                {item.icon && <span>{item.icon}</span>}
                                {item.label}
                            </Link>
                        )}
                        <button
                            className="tn-mob-link tn-mob-logout"
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
