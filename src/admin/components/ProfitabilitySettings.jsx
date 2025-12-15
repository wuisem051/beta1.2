import React, { useState, useEffect, useContext } from 'react'; // Importar useContext
import { db } from '../../services/firebase'; // Importar la instancia de Firebase Firestore
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { ThemeContext } from '../../context/ThemeContext'; // Importar ThemeContext
import { useError } from '../../context/ErrorContext'; // Importar useError

const ProfitabilitySettings = () => {
  const { darkMode } = useContext(ThemeContext); // Usar ThemeContext
  const { showError, showSuccess } = useError(); // Usar el contexto de errores
  const [fixedRatePerTHs, setFixedRatePerTHs] = useState(0.06);
  const [fixedPoolCommission, setFixedPoolCommission] = useState(1);
  const [useFixedRate, setUseFixedRate] = useState(false);


  // Cargar la configuración al iniciar el componente
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'profitability');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setFixedRatePerTHs(data.fixedRatePerTHs || 0.06);
          setFixedPoolCommission(data.fixedPoolCommission || 1);
          setUseFixedRate(data.useFixedRate || false);
        } else {
          // Si no existe, establecer valores por defecto y crearlo en Firebase
          setFixedRatePerTHs(0.06);
          setFixedPoolCommission(1);
          setUseFixedRate(false);
          try {
            await setDoc(docRef, {
              fixedRatePerTHs: 0.06,
              fixedPoolCommission: 1,
              useFixedRate: false,
            });
          } catch (createError) {
            console.error("Error creating default profitability settings in Firebase:", createError);
            showError('Error al crear la configuración de rentabilidad por defecto.');
          }
        }
      } catch (err) {
        console.error("Error fetching profitability settings from Firebase:", err);
        showError('Error al cargar la configuración de rentabilidad.');
      }
    };
    fetchSettings();
  }, [showError]);

  const handleSaveSettings = async () => {
    try {
      const dataToSave = {
        fixedRatePerTHs,
        fixedPoolCommission,
        useFixedRate,
      };
      const docRef = doc(db, 'settings', 'profitability');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        await updateDoc(docRef, dataToSave);
      } else {
        await setDoc(docRef, dataToSave);
      }
      showSuccess('Configuración guardada exitosamente en Firebase!');
    } catch (error) {
      console.error('Error al guardar la configuración:', error);
      showError('Error al guardar la configuración.');
    }
  };

  // Calcular vista previa
  const preview1THs = fixedRatePerTHs;
  const preview10THs = fixedRatePerTHs * 10;
  const previewCommission = fixedPoolCommission;

  return (
    <div className={`${darkMode ? 'bg-dark_card text-light_text' : 'bg-gray-800 text-white'} p-6 rounded-lg shadow-md`}>
      <h2 className={`text-2xl font-bold mb-6 ${darkMode ? 'text-light_text' : 'text-white'}`}>Configuración de Calculadora de Rentabilidad</h2>
      
      <div className="mb-4">
        <label htmlFor="fixedRatePerTHs" className={`block text-sm mb-1 ${darkMode ? 'text-light_text' : 'text-gray-400'}`}>Tasa Fija por TH/s (USD)</label>
        <input
          type="number"
          id="fixedRatePerTHs"
          step="0.01"
          value={fixedRatePerTHs}
          onChange={(e) => setFixedRatePerTHs(parseFloat(e.target.value))}
          className={`w-full p-2 rounded border focus:outline-none focus:border-blue-500 ${darkMode ? 'bg-dark_bg border-dark_border text-light_text' : 'bg-gray-900 border-gray-600 text-white'}`}
          placeholder="Ej: 0.06"
        />
        <p className={`text-sm mt-1 ${darkMode ? 'text-light_text' : 'text-gray-500'}`}>Ejemplo: Si 10 TH/s = $0.60, entonces 1 TH/s = $0.06</p>
      </div>

      <div className="mb-6">
        <label htmlFor="fixedPoolCommission" className={`block text-sm mb-1 ${darkMode ? 'text-light_text' : 'text-gray-400'}`}>Comisión Fija de la Pool (%)</label>
        <input
          type="number"
          id="fixedPoolCommission"
          value={fixedPoolCommission}
          onChange={(e) => setFixedPoolCommission(parseFloat(e.target.value))}
          className={`w-full p-2 rounded border focus:outline-none focus:border-blue-500 ${darkMode ? 'bg-dark_bg border-dark_border text-light_text' : 'bg-gray-900 border-gray-600 text-white'}`}
          placeholder="Ej: 1"
        />
        <p className={`text-sm mt-1 ${darkMode ? 'text-light_text' : 'text-gray-500'}`}>Esta comisión no será editable por los usuarios en la calculadora</p>
      </div>

      <div className="flex items-center mb-6">
        <input
          type="checkbox"
          id="useFixedRate"
          checked={useFixedRate}
          onChange={(e) => setUseFixedRate(e.target.checked)}
          className={`mr-2 h-4 w-4 text-yellow-500 rounded focus:ring-yellow-500 ${darkMode ? 'bg-dark_bg border-dark_border' : 'border-gray-600'}`}
        />
        <label htmlFor="useFixedRate" className={`${darkMode ? 'text-light_text' : 'text-white'} text-base`}>Usar tasa fija en lugar del cálculo dinámico de Bitcoin</label>
      </div>

      <div className={`${darkMode ? 'bg-dark_bg text-light_text' : 'bg-gray-700 text-gray-300'} p-4 rounded-lg mb-6`}>
        <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-accent' : 'text-yellow-400'}`}>Vista previa del cálculo:</h3>
        <ul className="list-disc list-inside">
          <li>1 TH/s = ${preview1THs.toFixed(4)} USD/día</li>
          <li>10 TH/s = ${preview10THs.toFixed(4)} USD/día</li>
          <li>Comisión: {previewCommission.toFixed(1)}%</li>
        </ul>
      </div>

      <button
        onClick={handleSaveSettings}
        className="w-full bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-200"
      >
        Guardar Configuración
      </button>
    </div>
  );
};

export default ProfitabilitySettings;
