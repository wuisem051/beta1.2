import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ThemeContext } from '../../context/ThemeContext';
import { db } from '../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import {
  FaFire, FaSearch, FaWallet, FaUser,
  FaDownload, FaBell, FaBars
} from 'react-icons/fa';
import styles from './Header.module.css';

const Header = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [siteName, setSiteName] = useState('MaxiOS');

  useEffect(() => {
    const fetchSiteConfig = async () => {
      try {
        const docRef = doc(db, 'settings', 'siteConfig');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.siteName) setSiteName(data.siteName);
        }
      } catch (err) {
        console.error("Error fetching site config:", err);
      }
    };
    fetchSiteConfig();
  }, []);

  const navLinks = [
    { name: 'Comprar Cripto', path: '/user/deposits' },
    { name: 'Mercados', path: '/user/exchange' },
    { name: 'Futuros', path: '/user/exchange', isHot: true },
    { name: 'Spot', path: '/user/exchange' },
    { name: 'Ganancias', path: '/user/collective-fund' },
    { name: 'Campañas', path: '/user/bonus' },
    { name: 'Socio', path: '/user/referrals' }
  ];

  return (
    <header className={styles.header}>
      <div className={styles.headerContainer}>
        {/* Left Section: Logo & Links */}
        <div className={styles.leftNav}>
          <Link to="/" className={styles.logo}>
            <div className={styles.logoIcon}></div>
            {siteName}
          </Link>

          {navLinks.map((link, idx) => (
            <Link
              key={idx}
              to={link.path}
              className={styles.navLink}
            >
              {link.name}
              {link.isHot && <FaFire className={styles.fireIcon} />}
            </Link>
          ))}
        </div>

        {/* Right Section: Actions & Icons */}
        <div className={styles.rightNav}>
          <button
            className={styles.addFundsBtn}
            onClick={() => navigate('/user/deposits')}
          >
            Añadir fondos
          </button>

          <div className={styles.searchBar}>
            <FaSearch className={styles.searchIcon} />
            <div className={styles.trendingToken}>
              <FaFire className={styles.fireToken} />
              <span className={styles.searchText}>SIRENUSDT</span>
            </div>
            <span style={{ color: '#848e9c', marginLeft: 'auto' }}>/</span>
          </div>

          <div className={styles.iconGroup}>
            <div className={styles.iconItem} onClick={() => navigate('/user/my-wallet')}>
              <FaWallet />
            </div>
            <div className={styles.userProfile} onClick={() => navigate('/user/settings')}>
              <FaUser className={styles.userIcon} />
            </div>
            <div className={styles.iconItem}>
              <FaDownload />
            </div>
            <div className={styles.iconItem} onClick={() => navigate('/user/contact-support')}>
              <FaBell />
            </div>
            <div className={styles.iconItem}>
              <FaBars />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
