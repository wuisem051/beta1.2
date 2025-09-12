import React, { useState, useEffect, useContext } from 'react'; // Importar useContext
import { db } from '../services/firebase'; // Importar la instancia de Firebase Firestore
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { ThemeContext } from '../context/ThemeContext'; // Importar ThemeContext
import { useError } from '../context/ErrorContext'; // Importar useError
import Input from './common/Input'; // Importar el componente Input
import Checkbox from './common/Checkbox'; // Importar el componente Checkbox
import Button from './common/Button'; // Importar el componente Button

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
      
      <Input
        id="fixedRatePerTHs"
        label="Tasa Fija por TH/s (USD)"
        type="number"
        step="0.01"
        value={fixedRatePerTHs}
        onChange={(e) => setFixedRatePerTHs(parseFloat(e.target.value))}
        placeholder="Ej: 0.06"
      />
      <p className={`text-sm mt-1 mb-4 ${darkMode ? 'text-light_text' : 'text-gray-500'}`}>Ejemplo: Si 10 TH/s = $0.60, entonces 1 TH/s = $0.06</p>

      <Input
        id="fixedPoolCommission"
        label="Comisión Fija de la Pool (%)"
        type="number"
        value={fixedPoolCommission}
        onChange={(e) => setFixedPoolCommission(parseFloat(e.target.value))}
        placeholder="Ej: 1"
      />
      <p className={`text-sm mt-1 mb-6 ${darkMode ? 'text-light_text' : 'text-gray-500'}`}>Esta comisión no será editable por los usuarios en la calculadora</p>

      <Checkbox
        id="useFixedRate"
        label="Usar tasa fija en lugar del cálculo dinámico de Bitcoin"
        checked={useFixedRate}
        onChange={(e) => setUseFixedRate(e.target.checked)}
      />

      <div className={`${darkMode ? 'bg-dark_bg text-light_text' : 'bg-gray-700 text-gray-300'} p-4 rounded-lg mb-6`}>
        <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-accent' : 'text-yellow-400'}`}>Vista previa del cálculo:</h3>
        <ul className="list-disc list-inside">
          <li>1 TH/s = ${preview1THs.toFixed(4)} USD/día</li>
          <li>10 TH/s = ${preview10THs.toFixed(4)} USD/día</li>
          <li>Comisión: {previewCommission.toFixed(1)}%</li>
        </ul>
      </div>

      <Button
        onClick={handleSaveSettings}
        className="w-full"
      >
        Guardar Configuración
      </Button>
    </div>
  );
};

export default ProfitabilitySettings;
