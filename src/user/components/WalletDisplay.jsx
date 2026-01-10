import React, { useState, useEffect, useContext } from 'react';
import { doc, onSnapshot, getFirestore, setDoc } from 'firebase/firestore';
import { ThemeContext } from '../../context/ThemeContext'; // Importar ThemeContext
import { useError } from '../../context/ErrorContext'; // Importar useError para mostrar mensajes
import styles from './WalletDisplay.module.css'; // Importar estilos premium


const WalletDisplay = ({ currentUser }) => {
  const { theme, darkMode } = useContext(ThemeContext);
  const { showSuccess } = useError(); // Usar el contexto de errores
  const [userPortfolio, setUserPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const db = getFirestore();

  useEffect(() => {
    if (currentUser?.uid) {
      setLoading(true);
      const userDocRef = doc(db, `users/${currentUser.uid}`);
      const unsubscribe = onSnapshot(userDocRef, async (docSnap) => { // Ahora lee el documento principal del usuario
        if (docSnap.exists()) {
          const userData = docSnap.data();
          // Mapear los balances del documento de usuario a la estructura de portfolio
          const mappedPortfolio = {
            fiatBalanceUSD: userData.balanceUSD || 0, // Saldo Fiat USD
            fiatBalanceVES: userData.balanceVES || 0, // Saldo Fiat VES
            virtualBalanceUSD: userData.virtualBalanceUSD || 0, // Nuevo Saldo Virtual USD
            holdings: {
              BTC: userData.balanceBTC || 0,
              LTC: userData.balanceLTC || 0,
              DOGE: userData.balanceDOGE || 0,
              USDT: userData.balanceUSDT || 0, // Incluir USDT
            },
            updatedAt: new Date(),
          };
          setUserPortfolio(mappedPortfolio);
        } else {
          console.log("No se encontró el documento del usuario. Inicializando balances por defecto.");
          const defaultBalances = {
            balanceUSD: 0,
            balanceVES: 0, // Inicializar balanceVES
            virtualBalanceUSD: 0, // Inicializar saldo virtual
            balanceBTC: 0,
            balanceLTC: 0,
            balanceDOGE: 0,
            balanceUSDT: 0, // Incluir balanceUSDT en la inicialización
            role: 'user',
            email: currentUser.email,
            paymentAddresses: {},
            createdAt: new Date(),
          };
          try {
            await setDoc(userDocRef, defaultBalances, { merge: true });
            const mappedPortfolio = {
              fiatBalanceUSD: defaultBalances.balanceUSD,
              fiatBalanceVES: defaultBalances.balanceVES, // Mapear saldo VES
              virtualBalanceUSD: defaultBalances.virtualBalanceUSD, // Mapear saldo virtual
              holdings: {
                BTC: defaultBalances.balanceBTC,
                LTC: defaultBalances.balanceLTC,
                DOGE: defaultBalances.balanceDOGE,
                USDT: defaultBalances.balanceUSDT, // Incluir USDT
              },
              updatedAt: new Date(),
            };
            setUserPortfolio(mappedPortfolio);
            console.log("Balances por defecto creados exitosamente en el documento del usuario.");
          } catch (setDocError) {
            console.error("Error al inicializar balances por defecto:", setDocError);
            setError("Error al inicializar el saldo de la billetera.");
          }
        }
        setLoading(false);
      }, (err) => {
        console.error("Error al obtener balances de usuario en tiempo real:", err);
        setError("Error al cargar el saldo de la billetera.");
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      setUserPortfolio(null);
      setLoading(false);
    }
  }, [currentUser, db]);

  const [usdToUsdtAmount, setUsdToUsdtAmount] = useState('');
  const [exchangeLoading, setExchangeLoading] = useState(false);

  const handleExchange = async () => {
    setError(null);
    if (!currentUser?.uid) {
      setError('Debes iniciar sesión para realizar intercambios.');
      return;
    }

    const amountToExchange = parseFloat(usdToUsdtAmount);
    if (isNaN(amountToExchange) || amountToExchange <= 0) {
      setError('Por favor, introduce una cantidad válida para intercambiar.');
      return;
    }

    if (userPortfolio.fiatBalanceUSD < amountToExchange) {
      setError('Fondos insuficientes en USD para realizar el intercambio.');
      return;
    }

    setExchangeLoading(true);
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const newFiatBalanceUSD = userPortfolio.fiatBalanceUSD - amountToExchange;
      const newBalanceUSDT = userPortfolio.holdings.USDT + amountToExchange; // Asumiendo 1:1

      await setDoc(userDocRef, {
        balanceUSD: newFiatBalanceUSD,
        balanceUSDT: newBalanceUSDT,
      }, { merge: true });

      setUsdToUsdtAmount('');
      showSuccess('Intercambio de USD a USDT realizado con éxito!');
    } catch (err) {
      console.error("Error al realizar el intercambio:", err);
      setError(`Fallo al realizar el intercambio: ${err.message}`);
    } finally {
      setExchangeLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <p className={styles.loadingText}>Cargando tu billetera...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <p className={styles.errorText}>{error}</p>
      </div>
    );
  }

  // Si userPortfolio es null aquí, significa que no hay currentUser o hubo un error en la inicialización
  if (!userPortfolio) {
    return (
      <div className={styles.errorContainer}>
        <p className={styles.noDataText}>No se pudo cargar la información de tu billetera. Por favor, intenta de nuevo o contacta a soporte.</p>
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

      {/* Sección de Saldos Fiat */}
      <div className={styles.fiatSection}>
        <h3 className={styles.sectionTitle}>Saldos Fiat</h3>
        <div className={styles.balanceGrid}>
          {/* USD Fiat Card */}
          <div className={styles.balanceCardUSD}>
            <p className={styles.balanceLabel}>💵 USD (Fiat)</p>
            <p className={styles.balanceAmount}>
              ${userPortfolio.fiatBalanceUSD ? userPortfolio.fiatBalanceUSD.toFixed(2) : '0.00'}
            </p>
          </div>

          {/* VES Fiat Card */}
          <div className={styles.balanceCardVES}>
            <p className={styles.balanceLabel}>💰 VES (Fiat)</p>
            <p className={styles.balanceAmount}>
              Bs.{userPortfolio.fiatBalanceVES ? userPortfolio.fiatBalanceVES.toFixed(2) : '0.00'}
            </p>
          </div>

          {/* USD Virtual Card */}
          <div className={styles.balanceCardVirtual}>
            <p className={styles.balanceLabel}>🌐 USD (Virtual)</p>
            <p className={styles.balanceAmount}>
              ${userPortfolio.virtualBalanceUSD ? userPortfolio.virtualBalanceUSD.toFixed(2) : '0.00'}
            </p>
          </div>
        </div>

        {/* Sección de Intercambio USD a USDT */}
        <div className={styles.exchangeSection}>
          <h3 className={styles.exchangeTitle}>⚡ Intercambiar USD a USDT (1:1)</h3>
          <form className={styles.exchangeForm} onSubmit={(e) => { e.preventDefault(); handleExchange(); }}>
            <input
              type="number"
              value={usdToUsdtAmount}
              onChange={(e) => setUsdToUsdtAmount(e.target.value)}
              placeholder="Cantidad de USD"
              className={styles.exchangeInput}
              step="0.01"
              min="0"
              disabled={exchangeLoading}
            />
            <button
              type="submit"
              className={styles.exchangeButton}
              disabled={exchangeLoading}
            >
              {exchangeLoading ? 'Cambiando...' : 'Cambiar USD a USDT'}
            </button>
          </form>
          {error && <p className={styles.errorText}>{error}</p>}
        </div>
      </div>

      {/* Sección de Saldos de Criptomonedas */}
      <div className={styles.cryptoSection}>
        <h3 className={styles.sectionTitle}>🪙 Saldos de Criptomonedas</h3>
        {userPortfolio.holdings && Object.keys(userPortfolio.holdings).length > 0 ? (
          <table className={styles.cryptoTable}>
            <thead className={styles.cryptoTableHead}>
              <tr>
                <th className={styles.cryptoTableHeader}>Moneda</th>
                <th className={styles.cryptoTableHeader}>Cantidad</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(userPortfolio.holdings).map(([coin, qty]) => (
                <tr key={coin} className={styles.cryptoTableRow}>
                  <td className={`${styles.cryptoTableCell} ${styles.cryptoCoin}`}>{coin.toUpperCase()}</td>
                  <td className={`${styles.cryptoTableCell} ${styles.cryptoAmount}`}>{qty.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className={styles.noDataText}>No tienes criptomonedas en tu billetera.</p>
        )}
      </div>
    </div>
  );
};

export default WalletDisplay;
