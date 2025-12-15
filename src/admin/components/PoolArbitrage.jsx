import React, { useState, useEffect, useContext } from 'react';
import { collection, addDoc, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { ThemeContext } from '../../context/ThemeContext'; // Importar ThemeContext
import { useError } from '../../context/ErrorContext'; // Importar useError

const PoolArbitrage = () => {
const { darkMode, theme } = useContext(ThemeContext); // Usar ThemeContext
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
    <div className={`${darkMode ? 'bg-dark_card text-light_text' : 'bg-gray-800 text-white'} p-8 rounded-lg shadow-lg max-w-5xl mx-auto my-8`}>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold">Arbitraje de Pools</h2>
        <a href="http://localhost:3000" target="_blank" rel="noopener noreferrer" className={`text-yellow-500 hover:underline flex items-center`}>
          <span className="mr-2">🏠</span> Ver Sitio
        </a>
      </div>

      {/* Sección Agregar Nueva Pool */}
      <div className={`${darkMode ? 'bg-dark_card border-dark_border' : 'bg-gray-800'} p-6 rounded-lg shadow-md mb-8 border`}>
        <h3 className={`text-xl font-semibold mb-4 flex items-center ${darkMode ? 'text-light_text' : 'text-white'}`}>
          <input type="checkbox" className={`mr-2 h-4 w-4 text-green-500 rounded focus:ring-green-500 ${darkMode ? 'bg-dark_bg border-dark_border' : 'bg-gray-700 border-gray-600'}`} checked readOnly />
          Agregar Nueva Pool
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="name" className={`block text-sm mb-1 ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>Nombre de la Pool</label>
            <input
              type="text"
              id="name"
              name="name"
              value={newPool.name}
              onChange={handleInputChange}
              className={`w-full p-2 rounded border focus:outline-none focus:border-blue-500 ${darkMode ? 'bg-dark_bg border-dark_border text-light_text' : 'bg-gray-700 border-gray-600 text-white'}`}
              placeholder="Ej: DogecoinPool Pro"
            />
          </div>
          <div>
            <label htmlFor="cryptocurrency" className={`block text-sm mb-1 ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>Criptomoneda</label>
            <select
              id="cryptocurrency"
              name="cryptocurrency"
              value={newPool.cryptocurrency}
              onChange={handleInputChange}
              className={`w-full p-2 rounded border focus:outline-none focus:border-blue-500 ${darkMode ? 'bg-dark_bg border-dark_border text-light_text' : 'bg-gray-700 border-gray-600 text-white'}`}
            >
              <option value="">Seleccionar moneda</option>
              {cryptocurrencies.map((coin) => (
                <option key={coin} value={coin}>{coin}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="url" className={`block text-sm mb-1 ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>URL de la Pool</label>
            <input
              type="text"
              id="url"
              name="url"
              value={newPool.url}
              onChange={handleInputChange}
              className={`w-full p-2 rounded border focus:outline-none focus:border-blue-500 ${darkMode ? 'bg-dark_bg border-dark_border text-light_text' : 'bg-gray-700 border-gray-600 text-white'}`}
              placeholder="stratum+tcp://pool.com"
            />
          </div>
          <div>
            <label htmlFor="port" className={`block text-sm mb-1 ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>Puerto</label>
            <input
              type="text"
              id="port"
              name="port"
              value={newPool.port}
              onChange={handleInputChange}
              className={`w-full p-2 rounded border focus:outline-none focus:border-blue-500 ${darkMode ? 'bg-dark_bg border-dark_border text-light_text' : 'bg-gray-700 border-gray-600 text-white'}`}
              placeholder="4444"
            />
          </div>
          <div>
            <label htmlFor="defaultWorkerName" className={`block text-sm mb-1 ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>Nombre de Worker por Defecto</label>
            <input
              type="text"
              id="defaultWorkerName"
              name="defaultWorkerName"
              value={newPool.defaultWorkerName}
              onChange={handleInputChange}
              className={`w-full p-2 rounded border focus:outline-none focus:border-blue-500 ${darkMode ? 'bg-dark_bg border-dark_border text-light_text' : 'bg-gray-700 border-gray-600 text-white'}`}
              placeholder="Ej: worker1"
            />
          </div>
          <div>
            <label htmlFor="commission" className={`block text-sm mb-1 ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>Comisión de la Pool (%)</label>
            <input
              type="number"
              id="commission"
              name="commission"
              step="0.1"
              value={newPool.commission}
              onChange={handleInputChange}
              className={`w-full p-2 rounded border focus:outline-none focus:border-blue-500 ${darkMode ? 'bg-dark_bg border-dark_border text-light_text' : 'bg-gray-700 border-gray-600 text-white'}`}
              placeholder="1.5"
            />
          </div>
          <div>
            <label htmlFor="thsRate" className={`block text-sm mb-1 ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>Tasa por TH/s (USD)</label>
            <input
              type="number"
              id="thsRate"
              name="thsRate"
              step="0.01"
              value={newPool.thsRate}
              onChange={handleInputChange}
              className={`w-full p-2 rounded border focus:outline-none focus:border-blue-500 ${darkMode ? 'bg-dark_bg border-dark_border text-light_text' : 'bg-gray-700 border-gray-600 text-white'}`}
              placeholder="0.05"
            />
          </div>
        </div>
        <div className="mb-4">
          <label htmlFor="description" className={`block text-sm mb-1 ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>Descripción</label>
          <textarea
            id="description"
            name="description"
            value={newPool.description}
            onChange={handleInputChange}
            rows="3"
            className={`w-full p-2 rounded border focus:outline-none focus:border-blue-500 ${darkMode ? 'bg-dark_bg border-dark_border text-light_text' : 'bg-gray-700 border-gray-600 text-white'}`}
            placeholder="Descripción de la pool y sus beneficios..."
          ></textarea>
        </div>
        <div className="flex items-center mb-6">
          <input
            type="checkbox"
            id="isActive"
            name="isActive"
            checked={newPool.isActive}
            onChange={handleInputChange}
            className={`mr-2 h-4 w-4 text-green-500 rounded focus:ring-green-500 ${darkMode ? 'bg-dark_bg border-dark_border' : 'bg-gray-700 border-gray-600'}`}
          />
          <label htmlFor="isActive" className={`${darkMode ? 'text-light_text' : 'text-white'} text-base`}>Pool activa y disponible para usuarios</label>
        </div>
        <button
          onClick={handleAddPool}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-200 flex items-center justify-center"
        >
          <span className="mr-2">+</span> Agregar Pool
        </button>
      </div>

      {/* Sección Pools Configuradas */}
      <div className={`${darkMode ? 'bg-dark_card border-dark_border' : 'bg-gray-800'} p-6 rounded-lg shadow-md border`}>
        <h3 className={`text-xl font-semibold mb-4 flex items-center ${darkMode ? 'text-light_text' : 'text-white'}`}>
          <input type="checkbox" className={`mr-2 h-4 w-4 text-blue-500 rounded focus:ring-blue-500 ${darkMode ? 'bg-dark_bg border-dark_border' : 'bg-gray-700 border-gray-600'}`} checked readOnly />
          Pools Configuradas
        </h3>
        {pools.length === 0 ? (
          <div className={`text-center py-8 ${darkMode ? 'text-light_text' : 'text-gray-400'}`}>
            <p className="mb-2">No hay pools configuradas aún</p>
            <p>Agrega tu primera pool de arbitraje</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pools.map((pool) => (
              <div key={pool.id} className={`${darkMode ? 'bg-dark_bg' : 'bg-gray-700'} p-4 rounded-md flex justify-between items-center`}>
                <div>
                  <p className={`text-lg font-semibold ${darkMode ? 'text-light_text' : 'text-white'}`}>{pool.name} ({pool.cryptocurrency})</p>
                  <p className={`text-sm ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>{pool.url}:{pool.port}</p>
                  <p className={`text-sm ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>Comisión: {pool.commission}% | Tasa TH/s: ${pool.thsRate}</p>
                </div>
                <button
                  onClick={() => handleDeletePool(pool.id)}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm"
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PoolArbitrage;
