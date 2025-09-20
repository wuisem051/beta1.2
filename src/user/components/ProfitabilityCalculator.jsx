import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase'; // Importar Firebase Firestore
import { doc, getDoc } from 'firebase/firestore'; // Importar doc y getDoc

const ProfitabilityCalculator = () => {
  const [hashrate, setHashrate] = useState(10);
  // const [consumption, setConsumption] = useState(3000); // Eliminado
  // const [costPerKWH, setCostPerKWH] = useState(0.12); // Eliminado

  // Valores de configuración obtenidos del administrador (ahora de Firebase)
  const [fixedRatePerTHs, setFixedRatePerTHs] = useState(0.06);
  const [fixedPoolCommission, setFixedPoolCommission] = useState(1);
  const [useFixedRate, setUseFixedRate] = useState(false);

  // Valores dinámicos de BTC y dificultad (si no se usa tasa fija)
  const [btcPrice, setBtcPrice] = useState(121692); 
  const [difficulty, setDifficulty] = useState(73197634206448); 

  // const [dailyElectricCost, setDailyElectricCost] = useState(0); // Eliminado
  const [dailyBtcGain, setDailyBtcGain] = useState(0);
  const [dailyUsdGain, setDailyUsdGain] = useState(0);
  const [weeklyBtcGain, setWeeklyBtcGain] = useState(0);
  const [weeklyUsdGain, setWeeklyUsdGain] = useState(0);
  const [monthlyBtcGain, setMonthlyBtcGain] = useState(0);
  const [monthlyUsdGain, setMonthlyUsdGain] = useState(0);
  const [annualBtcGain, setAnnualBtcGain] = useState(0);
  const [annualUsdGain, setAnnualUsdGain] = useState(0);
  const [netDailyGain, setNetDailyGain] = useState(0);

  // Función para obtener el precio de BTC y la dificultad de una API externa
  const fetchDynamicData = async () => {
    try {
      // Aquí iría la llamada a una API real para obtener el precio de BTC y la dificultad
      // Por ahora, usaremos valores estáticos para la simulación
      // const response = await fetch('API_URL_PARA_BTC_Y_DIFICULTAD');
      // const data = await response.json();
      // setBtcPrice(data.btcPrice);
      // setDifficulty(data.difficulty);
    } catch (error) {
      console.error('Error al obtener datos dinámicos:', error);
    }
  };

  // Calcular vista previa para mostrar los valores de configuración
  const preview1THs = fixedRatePerTHs;
  const preview10THs = fixedRatePerTHs * 10;
  const previewCommission = fixedPoolCommission;

  const calculateProfitability = () => {
    // const dailyConsumptionKWH = (consumption * 24) / 1000; // Eliminado
    // const calculatedDailyElectricCost = dailyConsumptionKWH * costPerKWH; // Eliminado
    // setDailyElectricCost(calculatedDailyElectricCost); // Eliminado

    let calculatedDailyBtcGain = 0;
    let calculatedDailyUsdGain = 0;

    if (useFixedRate) {
      calculatedDailyUsdGain = hashrate * fixedRatePerTHs;
      calculatedDailyBtcGain = calculatedDailyUsdGain / btcPrice; 
    } else {
      const btcPerTHsPerDay = (60 * 60 * 24 * hashrate * 10**12) / (difficulty * 2**32);
      calculatedDailyBtcGain = btcPerTHsPerDay * (1 - fixedPoolCommission / 100);
      calculatedDailyUsdGain = calculatedDailyBtcGain * btcPrice;
    }
    
    setDailyBtcGain(calculatedDailyBtcGain);
    setDailyUsdGain(calculatedDailyUsdGain);

    setWeeklyBtcGain(calculatedDailyBtcGain * 7);
    setWeeklyUsdGain(calculatedDailyUsdGain * 7);
    setMonthlyBtcGain(calculatedDailyBtcGain * 30);
    setMonthlyUsdGain(calculatedDailyUsdGain * 30);
    setAnnualBtcGain(calculatedDailyBtcGain * 365);
    setAnnualUsdGain(calculatedDailyUsdGain * 365);

    // const calculatedNetDailyGain = calculatedDailyUsdGain - calculatedDailyElectricCost; // Modificado
    const calculatedNetDailyGain = calculatedDailyUsdGain; // Modificado
    setNetDailyGain(calculatedNetDailyGain);
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'profitability'); // Referencia al documento profitability
        const docSnap = await getDoc(docRef); // Obtener el documento

        if (docSnap.exists()) {
          const data = docSnap.data();
          setFixedRatePerTHs(data.fixedRatePerTHs || 0.06);
          setFixedPoolCommission(data.fixedPoolCommission || 1);
          setUseFixedRate(data.useFixedRate || false);
        } else {
          // Si no existe, establecer valores por defecto
          setFixedRatePerTHs(0.06);
          setFixedPoolCommission(1);
          setUseFixedRate(false);
        }
      } catch (err) {
        console.error("Error fetching profitability settings from Firebase:", err);
      }
    };

    fetchSettings();
    // Si no se usa tasa fija, también obtenemos datos dinámicos
    if (!useFixedRate) {
      fetchDynamicData();
    }
    
    calculateProfitability();
  }, [hashrate, fixedPoolCommission, fixedRatePerTHs, useFixedRate, btcPrice, difficulty]); // Eliminado consumption y costPerKWH

  return (
    <div className="p-6 bg-light_card text-dark_text rounded-lg shadow-lg max-w-4xl mx-auto my-8">
      <h2 className="text-3xl font-bold text-center mb-6">Calculadora de Rentabilidad</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Datos de Entrada */}
        <div className="bg-gray-100 p-6 rounded-lg shadow-sm border border-gray_border">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <span className="mr-2">📊</span> Datos de Entrada
          </h3>
          <div className="mb-4">
            <label htmlFor="hashrate" className="block text-gray_text text-sm mb-1">Hashrate (TH/s)</label>
            <input
              type="number"
              id="hashrate"
              value={hashrate}
              onChange={(e) => setHashrate(parseFloat(e.target.value))}
              className="w-full p-2 rounded bg-white border border-gray_border focus:outline-none focus:border-blue_link text-dark_text"
            />
          </div>
          {/* Eliminado: Consumo (W) */}
          {/* Eliminado: Costo (USD/kWh) */}
          <button
            onClick={calculateProfitability}
            className="w-full bg-accent hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-200"
          >
            Calcular
          </button>
        </div>

        {/* Configuración de Rentabilidad Actual */}
        <div className="bg-gray-100 p-6 rounded-lg shadow-sm border border-gray_border">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <span className="mr-2">⚙️</span> Configuración Actual
          </h3>
          <div className="mb-4">
            <p className="text-gray_text">Tasa Fija por TH/s:</p>
            <p className="text-lg font-bold text-dark_text">${fixedRatePerTHs.toFixed(4)} USD/día</p>
          </div>
          <div className="mb-4">
            <p className="text-gray_text">Comisión de la Pool:</p>
            <p className="text-lg font-bold text-dark_text">{fixedPoolCommission.toFixed(1)}%</p>
          </div>
          <div className="mb-6">
            <p className="text-gray_text">Uso de Tasa Fija:</p>
            <p className="text-lg font-bold text-dark_text">{useFixedRate ? 'Sí' : 'No'}</p>
          </div>
        </div>

        {/* Ganancias a Corto Plazo */}
        <div className="bg-gray-100 p-6 rounded-lg shadow-sm border border-gray_border">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <span className="mr-2">💰</span> Ganancias a Corto Plazo
          </h3>
          <div className="mb-4">
            <p className="text-gray_text">Diario:</p>
            <p className="text-lg font-bold text-dark_text">{dailyBtcGain.toFixed(8)} BTC</p>
            <p className="text-md text-gray_text">${dailyUsdGain.toFixed(2)} USD</p>
          </div>
          <div className="mb-6">
            <p className="text-gray_text">Semanal:</p>
            <p className="text-lg font-bold text-dark_text">{weeklyBtcGain.toFixed(8)} BTC</p>
            <p className="text-md text-gray_text">${weeklyUsdGain.toFixed(2)} USD</p>
          </div>
        </div>

        {/* Ganancias a Largo Plazo */}
        <div className="bg-gray-100 p-6 rounded-lg shadow-sm border border-gray_border">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <span className="mr-2">📈</span> Ganancias a Largo Plazo
          </h3>
          <div className="mb-4">
            <p className="text-gray_text">Mensual:</p>
            <p className="text-lg font-bold text-dark_text">{monthlyBtcGain.toFixed(8)} BTC</p>
            <p className="text-md text-gray_text">${monthlyUsdGain.toFixed(2)} USD</p>
          </div>
          <div className="mb-6">
            <p className="text-gray_text">Anual:</p>
            <p className="text-lg font-bold text-dark_text">{annualBtcGain.toFixed(8)} BTC</p>
            <p className="text-md text-gray_text">${annualUsdGain.toFixed(2)} USD</p>
          </div>
          <div className="mt-auto pt-4 border-t border-gray_border">
            <p className="text-gray_text">Ganancia neta diaria:</p>
            <p className="text-lg font-bold text-blue_link">${netDailyGain.toFixed(2)} USD</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfitabilityCalculator;
