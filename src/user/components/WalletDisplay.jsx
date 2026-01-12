import React, { useState, useEffect, useContext } from 'react';
import { doc, onSnapshot, getFirestore, setDoc } from 'firebase/firestore';
import { ThemeContext } from '../../context/ThemeContext';
import { useError } from '../../context/ErrorContext';
import styles from './WalletDisplay.module.css';

const WalletDisplay = ({ currentUser }) => {
  const { theme, darkMode } = useContext(ThemeContext);
  const { showSuccess, showError } = useError();
  const [userBalances, setUserBalances] = useState(null);
  const [loading, setLoading] = useState(true);
  const db = getFirestore();

  useEffect(() => {
    if (currentUser?.uid) {
      setLoading(true);
      const userDocRef = doc(db, `users/${currentUser.uid}`);
      const unsubscribe = onSnapshot(userDocRef, async (docSnap) => {
        if (docSnap.exists()) {
          const userData = docSnap.data();
          setUserBalances({
            // Criptomonedas
            balanceBTC: userData.balanceBTC || 0,
            balanceLTC: userData.balanceLTC || 0,
            balanceDOGE: userData.balanceDOGE || 0,
            balanceUSDTTRC20: userData.balanceUSDTTRC20 || 0, // USDT TRC20
            balanceTRX: userData.balanceTRX || 0, // TRX
            // P2P y Fiat
            balanceVES: userData.balanceVES || 0,
            balanceUSDTFiat: userData.balanceUSDTFiat || 0, // USDT Fiat para P2P
          });
        } else {
          console.log("Inicializando balances por defecto.");
          const defaultBalances = {
            balanceBTC: 0,
            balanceLTC: 0,
            balanceDOGE: 0,
            balanceUSDTTRC20: 0,
            balanceTRX: 0,
            balanceVES: 0,
            balanceUSDTFiat: 0,
            role: 'user',
            email: currentUser.email,
            paymentAddresses: {},
            createdAt: new Date(),
          };
          try {
            await setDoc(userDocRef, defaultBalances, { merge: true });
            setUserBalances(defaultBalances);
            console.log("Balances por defecto creados exitosamente.");
          } catch (setDocError) {
            console.error("Error al inicializar balances:", setDocError);
            showError("Error al inicializar el saldo de la billetera.");
          }
        }
        setLoading(false);
      }, (err) => {
        console.error("Error al obtener balances:", err);
        showError("Error al cargar el saldo de la billetera.");
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      setUserBalances(null);
      setLoading(false);
    }
  }, [currentUser, db, showError]);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <p className={styles.loadingText}>Cargando tu billetera...</p>
      </div>
    );
  }

  if (!userBalances) {
    return (
      <div className={styles.errorContainer}>
        <p className={styles.noDataText}>No se pudo cargar la información de tu billetera.</p>
      </div>
    );
  }

  return (
    <div className={styles.walletContainer}>
      {/* Header */}
      <div className={styles.walletHeader}>
        <h2 className={styles.walletTitle}>Mi Billetera</h2>
        <p className={styles.walletSubtitle}>Gestiona tus fondos y criptomonedas</p>
      </div>

      {/* Sección de Criptomonedas */}
      <div className={styles.cryptoSection}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={styles.sectionTitle}>🪙 Criptomonedas</h3>
          <span className="text-xs text-slate-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
            Para compras en la plataforma
          </span>
        </div>

        <div className={styles.balanceGrid}>
          {/* BTC Card */}
          <div className={styles.balanceCardCrypto} style={{ borderLeft: '4px solid #f7931a' }}>
            <p className={styles.balanceLabel}>₿ Bitcoin (BTC)</p>
            <p className={styles.balanceAmount}>
              {userBalances.balanceBTC.toFixed(8)} BTC
            </p>
          </div>

          {/* LTC Card */}
          <div className={styles.balanceCardCrypto} style={{ borderLeft: '4px solid #345d9d' }}>
            <p className={styles.balanceLabel}>Ł Litecoin (LTC)</p>
            <p className={styles.balanceAmount}>
              {userBalances.balanceLTC.toFixed(8)} LTC
            </p>
          </div>

          {/* DOGE Card */}
          <div className={styles.balanceCardCrypto} style={{ borderLeft: '4px solid #c2a633' }}>
            <p className={styles.balanceLabel}>Ð Dogecoin (DOGE)</p>
            <p className={styles.balanceAmount}>
              {userBalances.balanceDOGE.toFixed(4)} DOGE
            </p>
          </div>

          {/* USDT TRC20 Card */}
          <div className={styles.balanceCardCrypto} style={{ borderLeft: '4px solid #26a17b' }}>
            <p className={styles.balanceLabel}>₮ USDT (TRC20)</p>
            <p className={styles.balanceAmount}>
              {userBalances.balanceUSDTTRC20.toFixed(2)} USDT
            </p>
            <p className="text-xs text-slate-400 mt-1">Red: Tron</p>
          </div>

          {/* TRX Card */}
          <div className={styles.balanceCardCrypto} style={{ borderLeft: '4px solid #ef0027' }}>
            <p className={styles.balanceLabel}>🔴 Tron (TRX)</p>
            <p className={styles.balanceAmount}>
              {userBalances.balanceTRX.toFixed(4)} TRX
            </p>
          </div>
        </div>
      </div>

      {/* Sección de P2P y Fiat */}
      <div className={styles.fiatSection}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={styles.sectionTitle}>💱 P2P y Fondos Fiat</h3>
          <span className="text-xs text-yellow-500 bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/20">
            ⚠️ Solo para intercambio P2P
          </span>
        </div>

        <div className={styles.balanceGrid}>
          {/* VES Card */}
          <div className={styles.balanceCardVES}>
            <p className={styles.balanceLabel}>💰 Bolívar Soberano (VES)</p>
            <p className={styles.balanceAmount}>
              Bs. {userBalances.balanceVES.toFixed(2)}
            </p>
            <p className="text-xs text-slate-400 mt-1">Solo P2P</p>
          </div>

          {/* USDT Fiat Card */}
          <div className={styles.balanceCardUSD}>
            <p className={styles.balanceLabel}>💵 USDT (Fiat)</p>
            <p className={styles.balanceAmount}>
              ${userBalances.balanceUSDTFiat.toFixed(2)}
            </p>
            <p className="text-xs text-slate-400 mt-1">Solo P2P</p>
          </div>
        </div>

        <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
          <div className="flex gap-3">
            <span className="text-xl">ℹ️</span>
            <div>
              <p className="text-yellow-500 font-bold text-sm mb-1">Importante</p>
              <p className="text-xs text-slate-300">
                Los fondos en esta sección solo pueden ser utilizados para intercambios P2P con otros usuarios.
                No se pueden usar para compras directas en la plataforma.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletDisplay;
