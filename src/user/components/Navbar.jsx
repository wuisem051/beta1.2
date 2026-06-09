import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { ThemeContext } from '../../context/ThemeContext';
import styles from './Navbar.module.css';

const Navbar = () => {
  const { darkMode } = useContext(ThemeContext);

  return (
    <nav className={`${styles.navbarContainer} ${darkMode ? styles.dark : styles.light}`}>
      <ul className={styles.navList}>
        <li className={styles.navItem}>
          <NavLink
            to="/user/dashboard"
            className={({ isActive }) =>
              isActive ? `${styles.navLink} ${styles.activeLink}` : styles.navLink
            }
          >
            Dashboard
          </NavLink>
        </li>
        <li className={styles.navItem}>
          <NavLink
            to="/user/miners"
            className={({ isActive }) =>
              isActive ? `${styles.navLink} ${styles.activeLink}` : styles.navLink
            }
          >
            Minar
          </NavLink>
        </li>
        <li className={styles.navItem}>
          <NavLink
            to="/user/my-wallet"
            className={({ isActive }) =>
              isActive ? `${styles.navLink} ${styles.activeLink}` : styles.navLink
            }
          >
            Mi Billetera
          </NavLink>
        </li>
        <li className={styles.navItem}>
          <NavLink
            to="/user/withdrawals"
            className={({ isActive }) =>
              isActive ? `${styles.navLink} ${styles.activeLink}` : styles.navLink
            }
          >
            Retiros
          </NavLink>
        </li>
        <li className={styles.navItem}>
          <NavLink
            to="/user/my-soles"
            className={({ isActive }) =>
              isActive ? `${styles.navLink} ${styles.activeLink}` : styles.navLink
            }
          >
            Futuro Cash
          </NavLink>
        </li>
        <li className={styles.navItem}>
          <NavLink
            to="/user/p2p-marketplace"
            className={({ isActive }) =>
              isActive ? `${styles.navLink} ${styles.activeLink}` : styles.navLink
            }
          >
            Mercado P2P
          </NavLink>
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;
