import React, { useContext } from 'react';
import { ThemeContext } from '../../context/ThemeContext';
import styles from '../pages/UserPanel.module.css'; // Reutilizamos los estilos del UserPanel

const BonusContent = () => {
  const { darkMode } = useContext(ThemeContext);

  return (
    <div className={`${styles.miningPortfolioContent} ${darkMode ? styles.dark : styles.light}`}>
      <h1 className={styles.pageTitle}>Bono</h1>
      <p className={styles.developmentText}>Sección en desarrollo.</p>
      <p className={styles.developmentSubText}>Pronto podrás ver y gestionar tus bonos aquí.</p>
    </div>
  );
};

export default BonusContent;
