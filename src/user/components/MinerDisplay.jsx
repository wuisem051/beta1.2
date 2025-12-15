import React, { useContext, useState } from 'react';
import { ThemeContext } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useError } from '../../context/ErrorContext';
import { db } from '../../services/firebase'; // Importar la instancia de db
import { doc, getDoc, updateDoc, addDoc, collection } from 'firebase/firestore';
import styles from './MinerDisplay.module.css'; // Importar los estilos CSS Modules

const MinerDisplay = ({ miner, onMinerPurchased }) => {
  const { darkMode } = useContext(ThemeContext);
  const { currentUser } = useAuth();
  const { showError, showSuccess } = useError();
  const [isLoading, setIsLoading] = useState(false);

  const handleBuy = async () => {
    if (!currentUser) {
      showError('Debes iniciar sesión para comprar un minero.');
      return;
    }

    setIsLoading(true);
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        showError('Datos de usuario no encontrados.');
        setIsLoading(false);
        return;
      }

      const userData = userDocSnap.data();
      const currentBalanceUSD = userData.balanceUSD || 0;

      if (currentBalanceUSD < miner.cost) {
        showError('Saldo insuficiente para comprar este minero.');
        setIsLoading(false);
        return;
      }

      // Realizar la compra
      const newBalanceUSD = currentBalanceUSD - miner.cost;
      await updateDoc(userDocRef, {
        balanceUSD: newBalanceUSD,
      });

      // Añadir el minero a la colección de mineros del usuario
      await addDoc(collection(db, 'miners'), {
        userId: currentUser.uid,
        minerId: miner.id, // ID del minero del catálogo
        name: miner.name,
        hashrate: miner.hashrate,
        powerConsumption: miner.powerConsumption,
        profitability: miner.profitability,
        cost: miner.cost,
        imageUrl: miner.imageUrl,
        workerName: `worker-${Math.random().toString(36).substring(2, 8)}`, // Generar un nombre de worker único
        currentHashrate: miner.hashrate.split(' ')[0], // Asumir que el hashrate viene como "X TH/s"
        status: 'activo',
        createdAt: new Date(),
      });

      showSuccess(`¡Has comprado ${miner.name} exitosamente!`);
      if (onMinerPurchased) {
        onMinerPurchased(); // Notificar al componente padre
      }

    } catch (error) {
      console.error("Error al comprar minero:", error);
      showError(`Fallo al comprar minero: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

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
      <button
        className={styles.buyButton}
        onClick={handleBuy}
        disabled={isLoading}
      >
        {isLoading ? 'Comprando...' : 'Comprar'}
      </button>
    </div>
  );
};

export default MinerDisplay;
