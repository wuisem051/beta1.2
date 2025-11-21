import React, { useContext, useEffect, useState, useRef, useCallback } from 'react';
import { ThemeContext } from '../../context/ThemeContext';
import { SolidSectionStyled, CardStyled } from '../styles/StyledComponents';
import { db } from '../../services/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { useError } from '../../context/ErrorContext';
import styles from '../pages/UserPanel.module.css'; // Reutilizar estilos del UserPanel
import * as LightweightCharts from 'lightweight-charts'; // Importar todo como un objeto

const TradingSignal = () => {
  const { darkMode } = useContext(ThemeContext);
  const { showError } = useError();
  const [signals, setSignals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null); // Referencia al objeto del gráfico
  const seriesRef = useRef(null); // Referencia a la serie de líneas
  const currentSymbolRef = useRef("BTC"); // Símbolo actual del gráfico (solo el activo, sin prefijo de exchange)

  // Datos de velas de ejemplo (OHLCV) para inicializar el gráfico
  // En una aplicación real, esto provendría de una API.
  const sampleCandleData = [
    { time: '2018-12-19', open: 14.70, high: 14.73, low: 14.61, close: 14.67 },
    { time: '2018-12-20', open: 14.65, high: 14.73, low: 14.49, close: 14.61 },
    { time: '2018-12-21', open: 14.67, high: 14.75, low: 14.46, close: 14.58 },
    { time: '2018-12-24', open: 14.50, high: 14.62, low: 14.34, close: 14.47 },
    { time: '2018-12-26', open: 14.50, high: 14.55, low: 14.15, close: 14.28 },
    { time: '2018-12-27', open: 14.28, high: 14.39, low: 13.98, close: 14.00 },
    { time: '2018-12-28', open: 14.00, high: 14.20, low: 13.79, close: 13.92 },
    // ... más datos aquí o de tu API
  ];

  // Función para dibujar las señales en el gráfico
  const drawSignals = useCallback(() => {
    if (chartRef.current && seriesRef.current && signals.length > 0) {
      // Filtrar señales por el símbolo actual
      const filteredSignals = signals.filter(signal => signal.asset === currentSymbolRef.current);

      const markers = filteredSignals.map(signal => {
        const time = new Date(signal.createdAt).toISOString().split('T')[0]; // Formato 'YYYY-MM-DD'
        const price = parseFloat(signal.entryPrice);
        const takeProfit = parseFloat(signal.takeProfit);
        const stopLoss = parseFloat(signal.stopLoss);
        const type = signal.type; // 'Compra' o 'Venta'

        // Marcador para la señal de entrada
        const entryMarker = {
          time: time,
          position: type === 'Compra' ? 'belowBar' : 'aboveBar',
          color: type === 'Compra' ? '#2196F3' : '#F44336', // Azul para compra, Rojo para venta
          shape: type === 'Compra' ? 'arrowUp' : 'arrowDown',
          text: `${type} ${signal.asset} @ ${price}`,
          size: 1.5, // Tamaño del marcador
          id: `entry-${signal.id}`
        };

        return entryMarker;
      });

      seriesRef.current.setMarkers(markers);
    } else if (seriesRef.current) {
      seriesRef.current.setMarkers([]); // Limpiar marcadores si no hay señales
    }
  }, [signals]);


  // Efecto para la suscripción a señales de Firebase
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

  // Efecto para la suscripción a señales de Firebase
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

  // Efecto para crear y limpiar el gráfico (solo una vez al montar)
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) {
      return;
    }

    // Opciones mínimas para el gráfico
    const chart = LightweightCharts.createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight,
      layout: {
        background: { type: LightweightCharts.ColorType.Solid, color: darkMode ? '#1a202c' : '#ffffff' },
        textColor: darkMode ? '#ffffff' : '#1a202c',
      },
    });

    chartRef.current = chart;

    // Se comentan temporalmente las líneas que causan el error
    // console.log("Objeto del gráfico después de la creación (sin try/catch):", chartRef.current);
    // console.dir(chartRef.current);
    // console.log("Claves de chartRef.current (sin try/catch):", JSON.stringify(Object.keys(chartRef.current), null, 2));

    // const newSeries = chart.addCandlestickSeries({
    //     upColor: '#4CAF50',
    //     downColor: '#EF5350',
    //     borderVisible: false,
    //     wickUpColor: '#4CAF50',
    //     wickDownColor: '#EF5350',
    // });
    // seriesRef.current = newSeries;
    // newSeries.setData(sampleCandleData);
    // chart.timeScale().fitContent();

    // Asignar un valor nulo o un objeto dummy a seriesRef.current para evitar errores de referencia
    seriesRef.current = null;
    chart.timeScale().fitContent();


    // Manejar redimensionamiento
    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight
        });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
      }
    };
  }, [darkMode, showError]);

  // Efecto para redibujar señales cuando cambian las señales o el símbolo/tema
  useEffect(() => {
    drawSignals();
  }, [signals, drawSignals]);

  useEffect(() => {
    // Redibujar señales cuando cambian las señales o el modo oscuro
    drawSignals();
  }, [signals, drawSignals]);

  // Manejar el cambio de símbolo (podría implementarse con un selector de UI)
  const handleSymbolChange = (newSymbol) => {
    currentSymbolRef.current = newSymbol;
    // En una implementación real, aquí se volverían a cargar los datos de velas para el nuevo símbolo
    // seriesRef.current.setData(fetchNewSymbolData(newSymbol));
    drawSignals(); // Redibujar señales para el nuevo símbolo
  };

  return (
    <SolidSectionStyled theme={darkMode ? 'dark' : 'light'} className={styles.settingsContent}>
      <h1 className={styles.pageTitle}>Señales de Trading</h1>

      {/* Selector de Símbolo (básico) */}
      <CardStyled theme={darkMode ? 'dark' : 'light'} className={styles.sectionCard} style={{ marginBottom: '20px' }}>
        <label className={styles.formLabel} htmlFor="symbol-selector">Selecciona un Activo:</label>
        <select
          id="symbol-selector"
          value={currentSymbolRef.current}
          onChange={(e) => handleSymbolChange(e.target.value)}
          className={styles.formSelect}
        >
          <option value="BTC">BTC</option>
          <option value="ETH">ETH</option>
          <option value="XRP">XRP</option>
          {/* Añadir más opciones según los activos de tus señales */}
        </select>
      </CardStyled>

      {/* Contenedor para el gráfico de Lightweight Charts */}
      <CardStyled theme={darkMode ? 'dark' : 'light'} className={styles.sectionCard} style={{ height: '500px', marginBottom: '20px' }}>
        <div id="lightweight_chart_container" ref={chartContainerRef} style={{ height: '100%' }}></div>
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
          {/* Aquí mostramos todas las señales, independientemente del símbolo del gráfico */}
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
