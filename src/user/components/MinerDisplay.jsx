import React, { useContext } from 'react';
import { ThemeContext } from '../../context/ThemeContext';
import styles from './MinerDisplay.module.css'; // Importar los estilos CSS Modules

const MinerDisplay = ({ miner }) => {
  const { darkMode } = useContext(ThemeContext);

  return (
    <div className={`${styles.minerCard} ${darkMode ? styles.dark : styles.light}`}>
      <h3 className={styles.minerTitle}>{miner.name}</h3>
      <img src={miner.imageUrl} alt={miner.name} className={styles.minerImage} />
      <div className={styles.minerStats}>
        <p><span>Costo:</span> <span>${miner.cost}</span></p>
        <p><span>Hashrate:</span> <span>{miner.hashrate}</span></p>
        <p><span>Consumo:</span> <span>{miner.powerConsumption}</span></p>
        <p><span>Rentabilidad:</span> <span>{miner.profitability}</span></p>
      </div>
      <button className={styles.buyButton}>Comprar</button>
    </div>
  );
};

export default MinerDisplay;
