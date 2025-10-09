import React, { useContext, useEffect, useState } from 'react';
import { ThemeContext } from '../../context/ThemeContext';
import { SolidSectionStyled, CardStyled } from '../styles/StyledComponents';
import { db } from '../../services/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { useError } from '../../context/ErrorContext';
import styles from '../pages/UserPanel.module.css'; // Reutilizar estilos del UserPanel

const TradingSignal = () => {
  const { darkMode } = useContext(ThemeContext);
  const { showError } = useError();
  const [signals, setSignals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'tradingSignals'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedSignals = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
      }));
      setSignals(fetchedSignals);
      setIsLoading(false);
    }, (err) => {
      console.error("Error fetching trading signals:", err);
      showError('Error al cargar las señales de trading.');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [showError]);

  return (
    <SolidSectionStyled theme={darkMode ? 'dark' : 'light'} className={styles.settingsContent}>
      <h1 className={styles.pageTitle}>Señales de Trading</h1>
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingText}>Cargando señales...</div>
        </div>
      )}
      {signals.length === 0 && !isLoading ? (
        <CardStyled theme={darkMode ? 'dark' : 'light'} className={styles.sectionCard}>
          <p className={styles.noDataText}>No hay señales de trading disponibles en este momento.</p>
        </CardStyled>
      ) : (
        <div className={styles.settingsGrid}>
          {signals.map(signal => (
            <CardStyled key={signal.id} theme={darkMode ? 'dark' : 'light'} className={styles.sectionCard}>
              <h2 className={`${styles.sectionTitle} ${signal.type === 'Compra' ? styles.signalBuy : styles.signalSell}`}>
                {signal.type === 'Compra' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-green_check" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-red_error" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"/></svg>
                )}
                Señal de {signal.type}
              </h2>
              <p className={styles.formLabel}><strong>Activo:</strong> {signal.asset}</p>
              <p className={styles.formLabel}><strong>Precio de Entrada:</strong> {signal.entryPrice}</p>
              <p className={styles.formLabel}><strong>Precio de Salida (Take Profit):</strong> {signal.takeProfit}</p>
              <p className={styles.formLabel}><strong>Stop Loss:</strong> {signal.stopLoss}</p>
              <p className={styles.formLabel}><strong>Notas:</strong> {signal.notes}</p>
              <p className={styles.formLabel}><strong>Fecha:</strong> {signal.createdAt.toLocaleString()}</p>
            </CardStyled>
          ))}
        </div>
      )}
    </SolidSectionStyled>
  );
};

export default TradingSignal;
