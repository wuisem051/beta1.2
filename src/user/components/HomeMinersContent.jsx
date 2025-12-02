import React, { useContext } from 'react';
import { ThemeContext } from '../../context/ThemeContext';
import MinerDisplay from './MinerDisplay';
import styles from './HomeMinersContent.module.css';

const HomeMinersContent = () => {
  const { darkMode } = useContext(ThemeContext);

  return (
    <div className={`${styles.homeMinersContent} ${darkMode ? styles.dark : styles.light}`}>
      <h1 className={styles.pageTitle}>Tus Mineros Adquiridos</h1>
      <p className={styles.descriptionText}>Aquí puedes ver y gestionar todos los mineros que has adquirido.</p>
      <div className={styles.minersGrid}>
        {/* Aquí se mostrarán los mineros adquiridos por el usuario */}
      </div>
    </div>
  );
};

export default HomeMinersContent;
