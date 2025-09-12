import React, { useState, useEffect, useContext } from 'react';
import { collection, addDoc, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useTheme } from '../context/ThemeContext';
import { useError } from '../context/ErrorContext'; // Importar useError
import Input from './common/Input'; // Importar el componente Input
import TextArea from './common/TextArea'; // Importar el componente TextArea
import Checkbox from './common/Checkbox'; // Importar el componente Checkbox
import Button from './common/Button'; // Importar el componente Button

const PoolArbitrage = () => {
  const { theme } = useTheme();
  const { showError, showSuccess } = useError(); // Usar el contexto de errores
  const [pools, setPools] = useState([]);
  const [newPool, setNewPool] = useState({
    name: '',
    cryptocurrency: '',
    url: '',
    port: '',
    defaultWorkerName: '', // Nuevo campo para el nombre del worker por defecto
    commission: '',
    thsRate: '',
    description: '',
    isActive: true,
  });

  const cryptocurrencies = ['Bitcoin', 'Ethereum', 'Litecoin', 'Dogecoin', 'Monero']; // Ejemplo de criptomonedas

  // Cargar pools existentes desde Firestore
  useEffect(() => {
    const fetchPools = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'arbitragePools')); // Cambiado a 'arbitragePools'
        const poolsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPools(poolsList);
      } catch (error) {
        console.error('Error al cargar pools:', error);
        showError('Error al cargar las pools de arbitraje.');
      }
    };
    fetchPools();
  }, [showError]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewPool((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleAddPool = async () => {
    try {
      await addDoc(collection(db, 'arbitragePools'), newPool); // Cambiado a 'arbitragePools'
      showSuccess('Pool agregada exitosamente!');
      setNewPool({
        name: '',
        cryptocurrency: '',
        url: '',
        port: '',
        defaultWorkerName: '', // Resetear el nuevo campo
        commission: '',
        thsRate: '',
        description: '',
        isActive: true,
      });
      // Recargar la lista de pools
      const querySnapshot = await getDocs(collection(db, 'arbitragePools')); // Cambiado a 'arbitragePools'
      const poolsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPools(poolsList);
    } catch (error) {
      console.error('Error al agregar pool:', error);
      showError('Error al agregar pool.');
    }
  };

  const handleDeletePool = async (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta pool?')) {
      try {
        await deleteDoc(doc(db, 'arbitragePools', id)); // Cambiado a 'arbitragePools'
        setPools(pools.filter(pool => pool.id !== id));
        showSuccess('Pool eliminada exitosamente!');
      } catch (error) {
        console.error('Error al eliminar pool:', error);
        showError('Error al eliminar pool.');
      }
    }
  };

  return (
    <div className={`${theme.background} ${theme.text} p-8 rounded-lg shadow-lg max-w-5xl mx-auto my-8`}>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold">Arbitraje de Pools</h2>
        <a href="http://localhost:3000" target="_blank" rel="noopener noreferrer" className={`text-yellow-500 hover:underline flex items-center`}>
          <span className="mr-2">🏠</span> Ver Sitio
        </a>
      </div>

      {/* Sección Agregar Nueva Pool */}
      <div className={`${theme.backgroundAlt} ${theme.borderColor} p-6 rounded-lg shadow-md mb-8 border`}>
        <h3 className={`text-xl font-semibold mb-4 flex items-center ${theme.text}`}>
          <Checkbox label="Agregar Nueva Pool" checked readOnly />
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Input
            id="name"
            label="Nombre de la Pool"
            name="name"
            value={newPool.name}
            onChange={handleInputChange}
            placeholder="Ej: DogecoinPool Pro"
          />
          <Input
            id="cryptocurrency"
            label="Criptomoneda"
            name="cryptocurrency"
            type="select"
            value={newPool.cryptocurrency}
            onChange={handleInputChange}
          >
            <option value="">Seleccionar moneda</option>
            {cryptocurrencies.map((coin) => (
              <option key={coin} value={coin}>{coin}</option>
            ))}
          </Input>
          <Input
            id="url"
            label="URL de la Pool"
            name="url"
            value={newPool.url}
            onChange={handleInputChange}
            placeholder="stratum+tcp://pool.com"
          />
          <Input
            id="port"
            label="Puerto"
            name="port"
            value={newPool.port}
            onChange={handleInputChange}
            placeholder="4444"
          />
          <Input
            id="defaultWorkerName"
            label="Nombre de Worker por Defecto"
            name="defaultWorkerName"
            value={newPool.defaultWorkerName}
            onChange={handleInputChange}
            placeholder="Ej: worker1"
          />
          <Input
            id="commission"
            label="Comisión de la Pool (%)"
            name="commission"
            type="number"
            step="0.1"
            value={newPool.commission}
            onChange={handleInputChange}
            placeholder="1.5"
          />
          <Input
            id="thsRate"
            label="Tasa por TH/s (USD)"
            name="thsRate"
            type="number"
            step="0.01"
            value={newPool.thsRate}
            onChange={handleInputChange}
            placeholder="0.05"
          />
        </div>
        <TextArea
          id="description"
          label="Descripción"
          name="description"
          value={newPool.description}
          onChange={handleInputChange}
          rows="3"
          placeholder="Descripción de la pool y sus beneficios..."
        />
        <Checkbox
          id="isActive"
          label="Pool activa y disponible para usuarios"
          name="isActive"
          checked={newPool.isActive}
          onChange={handleInputChange}
        />
        <Button
          onClick={handleAddPool}
          variant="success"
          className="w-full flex items-center justify-center"
        >
          <span className="mr-2">+</span> Agregar Pool
        </Button>
      </div>

      {/* Sección Pools Configuradas */}
      <div className={`${theme.backgroundAlt} ${theme.borderColor} p-6 rounded-lg shadow-md border`}>
        <h3 className={`text-xl font-semibold mb-4 flex items-center ${theme.text}`}>
          <Checkbox label="Pools Configuradas" checked readOnly />
        </h3>
        {pools.length === 0 ? (
          <div className={`text-center py-8 ${theme.textSoft}`}>
            <p className="mb-2">No hay pools configuradas aún</p>
            <p>Agrega tu primera pool de arbitraje</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pools.map((pool) => (
              <div key={pool.id} className={`${theme.inputBackground} p-4 rounded-md flex justify-between items-center`}>
                <div>
                  <p className={`text-lg font-semibold ${theme.text}`}>{pool.name} ({pool.cryptocurrency})</p>
                  <p className={`text-sm ${theme.textSoft}`}>{pool.url}:{pool.port}</p>
                  <p className={`text-sm ${theme.textSoft}`}>Comisión: {pool.commission}% | Tasa TH/s: ${pool.thsRate}</p>
                </div>
                <Button
                  onClick={() => handleDeletePool(pool.id)}
                  variant="danger"
                  className="px-3 py-1 text-sm"
                >
                  Eliminar
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PoolArbitrage;
