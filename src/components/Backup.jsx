import React, { useContext } from 'react'; // Importar useContext
import { ThemeContext } from '../context/ThemeContext'; // Importar ThemeContext
import Checkbox from './common/Checkbox'; // Importar el componente Checkbox

const Backup = () => {
  const { darkMode } = useContext(ThemeContext); // Usar ThemeContext
  return (
    <div className={`${darkMode ? 'bg-dark_card text-light_text' : 'bg-gray-800 text-white'} p-6 rounded-lg`}>
      <h2 className={`text-2xl font-semibold mb-4 ${darkMode ? 'text-light_text' : 'text-white'}`}>Respaldo de Datos</h2>
      <p className={`${darkMode ? 'text-light_text' : 'text-gray-300'}`}>Selecciona los datos que deseas incluir en la copia de seguridad:</p>
      <ul className="list-none">
        <Checkbox label="Datos de mineros" />
        <Checkbox label="Configuraciones" />
        <Checkbox label="Usuarios y pagos" />
        <Checkbox label="Contenido del sitio" />
      </ul>
      <button className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded">
        Crear y Descargar Respaldo
      </button>
      <div className="mt-8">
        <h2 className={`text-2xl font-semibold mb-4 ${darkMode ? 'text-light_text' : 'text-white'}`}>Restaurar Respaldo</h2>
        <p className={`${darkMode ? 'text-light_text' : 'text-gray-300'}`}>Selecciona el archivo de respaldo:</p>
        <input type="file" className={`mb-4 ${darkMode ? 'text-light_text' : ''}`} />
        <Checkbox label="Combinar con datos existentes" />
        <button className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
        Restaurar Respaldo
        </button>
        <p className={`mt-4 ${darkMode ? 'text-red-400' : 'text-red-500'}`}>Atención: Esta acción no se puede deshacer. Asegúrate de tener un respaldo actual antes de restaurar.</p>
      </div>
    </div>
  );
};

export default Backup;
