import React, { useState, useEffect, useContext } from 'react'; // Importar useContext
import { db } from '../services/firebase'; // Importar Firebase Firestore
import { collection, getDocs, setDoc, query, where } from 'firebase/firestore';
import { ThemeContext } from '../context/ThemeContext'; // Importar ThemeContext
import { useError } from '../context/ErrorContext'; // Importar useError
import Input from './common/Input'; // Importar el componente Input
import Checkbox from './common/Checkbox'; // Importar el componente Checkbox
import Button from './common/Button'; // Importar el componente Button

const PoolConfiguration = () => {
  const { darkMode } = useContext(ThemeContext); // Usar ThemeContext
  const { showError, showSuccess } = useError(); // Usar el contexto de errores
  const [poolUrl, setPoolUrl] = useState('stratum+tcp://bitcoinpool.com:4444');
  const [poolPort, setPoolPort] = useState('4444');
  const [defaultWorkerName, setDefaultWorkerName] = useState('worker1');
  const [poolCommission, setPoolCommission] = useState(1); // Comisión de la Pool
  const [obsoletePrice, setObsoletePrice] = useState(0.05); // Precio obsoleto
  const [bitcoinAddress, setBitcoinAddress] = useState('');
  const [minPaymentThresholdBTC, setMinPaymentThresholdBTC] = useState(0.001);
  const [minPaymentThresholdDOGE, setMinPaymentThresholdDOGE] = useState(100); // Valor por defecto para DOGE
  const [minPaymentThresholdLTC, setMinPaymentThresholdLTC] = useState(0.01); // Valor por defecto para LTC
  const [minPaymentThresholdUSD, setMinPaymentThresholdUSD] = useState(10); // Valor por defecto para USD
  const [paymentInterval, setPaymentInterval] = useState('Diario');
  const [supportedCurrencies, setSupportedCurrencies] = useState({
    bitcoin: true,
    dogecoin: true,
    litecoin: true,
  });
  const [enableBinancePay, setEnableBinancePay] = useState(false);

  const handleCurrencyChange = (currency) => {
    setSupportedCurrencies(prev => ({
      ...prev,
      [currency]: !prev[currency]
    }));
  };

  // Cargar configuración desde Firebase
  useEffect(() => {
    const fetchPoolConfig = async () => {
      try {
        const q = query(collection(db, 'settings'), where('key', '==', 'poolConfig'));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const data = querySnapshot.docs[0].data();
          setPoolUrl(data.url || 'stratum+tcp://bitcoinpool.com:4444');
          setPoolPort(data.port || '4444');
          setDefaultWorkerName(data.defaultWorkerName || 'worker1');
          setObsoletePrice(data.obsoletePrice || 0.05);
        }
      } catch (err) {
        console.error("Error fetching pool config from Firebase:", err);
        showError('Error al cargar la configuración del pool.');
      }
    };

    const fetchPaymentConfig = async () => {
      try {
        const q = query(collection(db, 'settings'), where('key', '==', 'paymentConfig'));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const data = querySnapshot.docs[0].data();
          setBitcoinAddress(data.bitcoinAddress || '');
          setMinPaymentThresholdBTC(data.minPaymentThresholdBTC || 0.001);
          setMinPaymentThresholdDOGE(data.minPaymentThresholdDOGE || 100);
          setMinPaymentThresholdLTC(data.minPaymentThresholdLTC || 0.01);
          setMinPaymentThresholdUSD(data.minPaymentThresholdUSD || 10);
          setPaymentInterval(data.paymentInterval || 'Diario');
          setSupportedCurrencies(data.supportedCurrencies || { bitcoin: true, dogecoin: true, litecoin: true });
          setEnableBinancePay(data.enableBinancePay || false);
        }
      } catch (err) {
        console.error("Error fetching payment config from Firebase:", err);
        showError('Error al cargar la configuración de pagos.');
      }
    };

    const fetchProfitabilitySettings = async () => {
      try {
        const q = query(collection(db, 'settings'), where('key', '==', 'profitability'));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const data = querySnapshot.docs[0].data();
          setPoolCommission(data.fixedPoolCommission || 1);
        }
      } catch (err) {
        console.error("Error fetching profitability settings from Firebase:", err);
        showError('Error al cargar la configuración de rentabilidad.');
      }
    };

    fetchPoolConfig();
    fetchPaymentConfig();
    fetchProfitabilitySettings();
  }, [showError]);

  // Guardar configuración en Firebase
  const handleSaveConfig = async () => {
    try {
      // Actualizar/Crear poolConfig
      await setDoc(doc(db, 'settings', 'poolConfig'), {
        key: 'poolConfig',
        url: poolUrl,
        port: poolPort,
        defaultWorkerName: defaultWorkerName,
        obsoletePrice: obsoletePrice,
        updatedAt: new Date(),
      }, { merge: true });

      // Actualizar/Crear paymentConfig
      await setDoc(doc(db, 'settings', 'paymentConfig'), {
        key: 'paymentConfig',
        bitcoinAddress,
        minPaymentThresholdBTC,
        minPaymentThresholdDOGE,
        minPaymentThresholdLTC,
        minPaymentThresholdUSD,
        paymentInterval,
        supportedCurrencies,
        enableBinancePay,
        updatedAt: new Date(),
      }, { merge: true });

      // Actualizar/Crear profitability
      await setDoc(doc(db, 'settings', 'profitability'), {
        key: 'profitability',
        fixedPoolCommission: poolCommission,
        updatedAt: new Date(),
      }, { merge: true });

      showSuccess('Configuración de la Pool guardada exitosamente en Firebase!');
    } catch (error) {
      console.error('Error al guardar la configuración de la Pool en Firebase:', error);
      showError('Error al guardar la configuración de la Pool.');
    }
  };

  return (
    <div className={`${darkMode ? 'bg-dark_bg text-light_text' : 'bg-gray-900 text-white'} p-8 rounded-lg shadow-lg max-w-5xl mx-auto my-8`}>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold">Configuración de la Pool</h2>
        <a href="http://localhost:3001" target="_blank" rel="noopener noreferrer" className={`${darkMode ? 'text-accent' : 'text-yellow-500'} hover:underline flex items-center`}>
          <span className="mr-2">🏠</span> Ver Sitio
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Configuración de Pagos */}
        <div className={`${darkMode ? 'bg-dark_card border-dark_border' : 'bg-gray-800'} p-6 rounded-lg shadow-md border`}>
          <h3 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-light_text' : 'text-white'}`}>Configuración de Pagos</h3>
          <Input
            id="poolCommission"
            label="Comisión de la Pool (%)"
            type="number"
            value={poolCommission}
            onChange={(e) => setPoolCommission(parseFloat(e.target.value))}
          />
          <Input
            id="obsoletePrice"
            label="Precio por TH/s (USD)"
            type="number"
            value={obsoletePrice}
            onChange={(e) => setObsoletePrice(parseFloat(e.target.value))}
          />
          <Input
            id="bitcoinAddress"
            label="Dirección de Pago (Bitcoin)"
            type="text"
            value={bitcoinAddress}
            onChange={(e) => setBitcoinAddress(e.target.value)}
            placeholder="bc1q..."
          />
          <Input
            id="minPaymentThresholdBTC"
            label="Umbral mínimo de pago (BTC)"
            type="number"
            value={minPaymentThresholdBTC}
            onChange={(e) => setMinPaymentThresholdBTC(parseFloat(e.target.value))}
            step="0.00000001"
          />
          <Input
            id="minPaymentThresholdDOGE"
            label="Umbral mínimo de pago (DOGE)"
            type="number"
            value={minPaymentThresholdDOGE}
            onChange={(e) => setMinPaymentThresholdDOGE(parseFloat(e.target.value))}
            step="0.01"
          />
          <Input
            id="minPaymentThresholdLTC"
            label="Umbral mínimo de pago (LTC)"
            type="number"
            value={minPaymentThresholdLTC}
            onChange={(e) => setMinPaymentThresholdLTC(parseFloat(e.target.value))}
            step="0.00000001"
          />
          <Input
            id="minPaymentThresholdUSD"
            label="Umbral mínimo de pago (USD)"
            type="number"
            value={minPaymentThresholdUSD}
            onChange={(e) => setMinPaymentThresholdUSD(parseFloat(e.target.value))}
            step="0.01"
          />
          <Input
            id="paymentInterval"
            label="Intervalo de pago"
            type="select"
            value={paymentInterval}
            onChange={(e) => setPaymentInterval(e.target.value)}
          >
            <option value="Diario">Diario</option>
            <option value="Semanal">Semanal</option>
            <option value="Mensual">Mensual</option>
          </Input>
          <div className="mb-4">
            <h4 className={`text-sm mb-2 ${darkMode ? 'text-light_text' : 'text-gray-400'}`}>Monedas de Pago Soportadas</h4>
            <div className="flex items-center space-x-4">
              <Checkbox
                label="Bitcoin"
                checked={supportedCurrencies.bitcoin}
                onChange={() => handleCurrencyChange('bitcoin')}
              />
              <Checkbox
                label="Dogecoin"
                checked={supportedCurrencies.dogecoin}
                onChange={() => handleCurrencyChange('dogecoin')}
              />
              <Checkbox
                label="Litecoin"
                checked={supportedCurrencies.litecoin}
                onChange={() => handleCurrencyChange('litecoin')}
              />
            </div>
          </div>
          <Checkbox
            label="Habilitar Binance Pay"
            checked={enableBinancePay}
            onChange={(e) => setEnableBinancePay(e.target.checked)}
          />
          <Button
            onClick={handleSaveConfig}
            className="w-full"
          >
            Guardar Configuración
          </Button>
        </div>

        {/* Configuración de Minería */}
        <div className={`${darkMode ? 'bg-dark_card border-dark_border' : 'bg-gray-800'} p-6 rounded-lg shadow-md border`}>
          <h3 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-light_text' : 'text-white'}`}>Configuración de Minería</h3>
          <Input
            id="poolUrl"
            label="URL del Pool"
            type="text"
            value={poolUrl}
            onChange={(e) => setPoolUrl(e.target.value)}
          />
          <Input
            id="poolPort"
            label="Puerto del Pool"
            type="text"
            value={poolPort}
            onChange={(e) => setPoolPort(e.target.value)}
          />
          <div className="mb-6">
            <Input
              id="defaultWorkerName"
              label="Nombre de Worker por Defecto"
              type="text"
              value={defaultWorkerName}
              onChange={(e) => setDefaultWorkerName(e.target.value)}
            />
            <p className={`text-sm mt-1 ${darkMode ? 'text-light_text' : 'text-gray-500'}`}>Se mostrará como: usuario.worker_name en la página principal</p>
          </div>
          <Button
            onClick={handleSaveConfig}
            className="w-full"
          >
            Guardar Configuración
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PoolConfiguration;
