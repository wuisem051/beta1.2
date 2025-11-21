import React, { useContext, useEffect, useState, useRef } from 'react';
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
  const chartContainerRef = useRef(null); // Referencia para el contenedor del gráfico

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

    // Lógica para el widget de TradingView (widget avanzado simple)
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.id = 'tradingview-widget-script'; // Añadir un ID al script para poder removerlo
    document.head.appendChild(script);

    // Se inicializa el widget cuando el script cargue y el contenedor esté disponible
    const createWidget = () => {
      if (chartContainerRef.current && window.TradingView) {
        // Limpiar widgets previos si existen
        if (window.tvWidget) {
          window.tvWidget.remove();
        }
        window.tvWidget = new window.TradingView.widget({
          "autosize": true,
          "symbol": "BINANCE:BTCUSDT", // Símbolo predeterminado, se puede hacer dinámico
          "interval": "D",
          "timezone": "Etc/UTC",
          "theme": darkMode ? "dark" : "light", // Usar el tema de la aplicación
          "style": "1",
          "locale": "es",
          "toolbar_bg": darkMode ? "#1a202c" : "#f1f3f6", // Ajustar toolbar_bg al tema
          "enable_publishing": false,
          "allow_symbol_change": true,
          "container_id": "tradingview_widget_container",
        });
      }
    };

    script.addEventListener('load', createWidget);
    // En caso de que el script ya esté cargado (por ejemplo, si el componente se remonta)
    if (window.TradingView) {
      createWidget();
    }

    return () => {
      unsubscribe(); // Limpiar el listener de Firebase

      // Limpiar el script y el widget de TradingView al desmontar el componente
      const existingScript = document.getElementById('tradingview-widget-script');
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
      if (window.tvWidget) {
        window.tvWidget.remove();
        window.tvWidget = null;
      }
    };
  }, [darkMode, showError]); // Asegurarse de que el widget se recree si el tema cambia

  return (
    <SolidSectionStyled theme={darkMode ? 'dark' : 'light'} className={styles.settingsContent}>
      <h1 className={styles.pageTitle}>Señales de Trading</h1>

      {/* Contenedor para el widget de TradingView */}
      <CardStyled theme={darkMode ? 'dark' : 'light'} className={styles.sectionCard} style={{ height: '500px', marginBottom: '20px' }}>
        <div id="tradingview_widget_container" ref={chartContainerRef} style={{ height: '100%' }}></div>
      </CardStyled>

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
