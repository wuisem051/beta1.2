import React, { useState, useEffect, useRef, useContext } from 'react'; // Importar useContext
import { db } from '../../services/firebase'; // Importar Firebase Firestore
import { collection, getDocs, onSnapshot, doc, addDoc, updateDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js/auto';
import { Bar } from 'react-chartjs-2';
import { ThemeContext } from '../../context/ThemeContext'; // Importar ThemeContext
import { useError } from '../../context/ErrorContext'; // Importar useError

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const MinerManagement = ({ onNewMinerAdded }) => { // Aceptar prop para notificaciones
  const { darkMode } = useContext(ThemeContext); // Usar ThemeContext
  const { showError, showSuccess } = useError(); // Usar el contexto de errores
  const [miners, setMiners] = useState([]); // Mantener la lista combinada
  const [userMiners, setUserMiners] = useState([]); // Mineros asignados a usuarios
  const [storeMiners, setStoreMiners] = useState([]); // Mineros de la tienda
  const [users, setUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMiner, setEditingMiner] = useState(null);
  const [newMinerUserId, setNewMinerUserId] = useState('');
  const [newMinerWorkerName, setNewMinerWorkerName] = useState('');
  const [newMinerHashrate, setNewMinerHashrate] = useState(0);
  const [newMinerStatus, setNewMinerStatus] = useState('inactivo');

  // Estados para añadir nuevo minero de la tienda
  const [newStoreMinerName, setNewStoreMinerName] = useState('');
  const [newStoreMinerImageUrl, setNewStoreMinerImageUrl] = useState('');
  const [newStoreMinerCost, setNewStoreMinerCost] = useState(0);
  const [newStoreMinerHashrate, setNewStoreMinerHashrate] = useState(''); // String como en src/data/miners.js
  const [newStoreMinerPowerConsumption, setNewStoreMinerPowerConsumption] = useState('');
  const [newStoreMinerProfitability, setNewStoreMinerProfitability] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [minersPerPage] = useState(10);
  const previousMinersCount = useRef(null); // Usar useRef para previousMinersCount
  const [selectedMiners, setSelectedMiners] = useState([]); // Nuevo estado para mineros seleccionados

  useEffect(() => {
    console.log("MinerManagement: useEffect ejecutado. Configurando suscripción para 'miners'.");
    const fetchMinersAndSubscribe = async () => {
      try {
        const unsubscribe = onSnapshot(collection(db, 'miners'), (snapshot) => {
          console.log("MinerManagement: Firebase suscripción - Evento recibido.");
          const updatedMiners = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

          const fetchedUserMiners = updatedMiners.filter(miner => miner.type === 'user');
          const fetchedStoreMiners = updatedMiners.filter(miner => miner.type === 'store');

          setUserMiners(fetchedUserMiners);
          setStoreMiners(fetchedStoreMiners);
          setMiners(updatedMiners); // Mantener la lista combinada para la búsqueda general

          // Para notificar sobre nuevos mineros en general, independientemente del tipo
          if (updatedMiners.length > previousMinersCount.current && onNewMinerAdded) {
            const newMinersCount = updatedMiners.length - previousMinersCount.current;
            onNewMinerAdded(newMinersCount);
          }
          previousMinersCount.current = updatedMiners.length;
        }, (error) => {
          console.error("MinerManagement: Error subscribing to miners collection:", error);
          showError('Error al cargar los mineros.');
        });
        return unsubscribe; // Retorna la función de desuscripción
      } catch (error) {
        console.error("MinerManagement: Error fetching initial miners or setting up subscription: ", error);
        showError('Error al cargar los mineros.');
        return () => {}; // Retorna una función vacía en caso de error para evitar problemas
      }
    };

    const fetchUsers = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsers(usersData);
      } catch (error) {
        console.error("MinerManagement: Error fetching users for miner management: ", error);
        showError('Error al cargar los usuarios.');
      }
    };

    let unsubscribeMinersFunction; // Declara una variable para almacenar la función de desuscripción

    const setupSubscriptions = async () => {
      unsubscribeMinersFunction = await fetchMinersAndSubscribe();
      fetchUsers();
    };

    setupSubscriptions();

    return () => {
      console.log("MinerManagement: Limpiando suscripciones.");
      if (unsubscribeMinersFunction) {
        unsubscribeMinersFunction();
      }
    };
  }, [onNewMinerAdded, showError]);

  // Abrir el modal para editar un minero
  const handleEditClick = (miner) => {
    console.log("MinerManagement: Editando minero:", miner);
    setEditingMiner({ ...miner });

    if (miner.type === 'user') {
      setNewMinerUserId(miner.userId);
      setNewMinerWorkerName(miner.workerName);
      setNewMinerHashrate(miner.currentHashrate || 0);
      setNewMinerStatus(miner.status || 'inactivo');
      // Limpiar estados de minero de tienda al editar un minero de usuario
      setNewStoreMinerName('');
      setNewStoreMinerImageUrl('');
      setNewStoreMinerCost(0);
      setNewStoreMinerHashrate('');
      setNewStoreMinerPowerConsumption('');
      setNewStoreMinerProfitability('');
    } else if (miner.type === 'store') {
      setNewStoreMinerName(miner.name || '');
      setNewStoreMinerImageUrl(miner.imageUrl || '');
      setNewStoreMinerCost(miner.cost || 0);
      setNewStoreMinerHashrate(miner.hashrate || '');
      setNewStoreMinerPowerConsumption(miner.powerConsumption || '');
      setNewStoreMinerProfitability(miner.profitability || '');
      // Limpiar estados de minero de usuario al editar un minero de tienda
      setNewMinerUserId('');
      setNewMinerWorkerName('');
      setNewMinerHashrate(0);
      setNewMinerStatus('inactivo');
    }
    setIsModalOpen(true);
  };

  // Manejar cambios en el formulario de edición del minero
  const handleMinerEditChange = (e) => {
    const { name, value } = e.target;
    console.log(`MinerManagement: Cambiando campo '${name}' a '${value}'`);

    if (editingMiner.type === 'user') {
      if (name === "userId") {
        setNewMinerUserId(value);
      } else if (name === "workerName") {
        setNewMinerWorkerName(value);
      } else if (name === "currentHashrate") {
        setNewMinerHashrate(parseFloat(value) || 0);
      } else if (name === "status") {
        setNewMinerStatus(value);
      }
    } else if (editingMiner.type === 'store') {
      if (name === "name") {
        setNewStoreMinerName(value);
      } else if (name === "imageUrl") {
        setNewStoreMinerImageUrl(value);
      } else if (name === "cost") {
        setNewStoreMinerCost(parseFloat(value) || 0);
      } else if (name === "hashrate") {
        setNewStoreMinerHashrate(value);
      } else if (name === "powerConsumption") {
        setNewStoreMinerPowerConsumption(value);
      } else if (name === "profitability") {
        setNewStoreMinerProfitability(value);
      }
    }
    setEditingMiner((prevMiner) => ({
      ...prevMiner,
      [name]: value,
      // Asegurarse de que los valores de hashrate, cost, etc. se actualicen correctamente en editingMiner
      ...(name === "currentHashrate" && { currentHashrate: parseFloat(value) || 0 }),
      ...(name === "cost" && { cost: parseFloat(value) || 0 }),
      ...(name === "hashrate" && { hashrate: value }),
      ...(name === "powerConsumption" && { powerConsumption: value }),
      ...(name === "profitability" && { profitability: value }),
      ...(name === "name" && { name: value }),
      ...(name === "imageUrl" && { imageUrl: value }),
    }));
  };

  const handleAddMiner = async (minerData, type) => {
    try {
      const dataToSave = { ...minerData, type, createdAt: new Date() };
      const docRef = await addDoc(collection(db, 'miners'), dataToSave);
      showSuccess(`${type === 'user' ? 'Minero de usuario' : 'Minero de la tienda'} añadido exitosamente.`);
      console.log(`${type === 'user' ? 'Minero de usuario' : 'Minero de la tienda'} añadido a Firebase con ID:`, docRef.id);
      return true; // Éxito al añadir
    } catch (error) {
      console.error(`Error al añadir ${type === 'user' ? 'minero de usuario' : 'minero de la tienda'}:`, error);
      showError(`Error al añadir ${type === 'user' ? 'minero de usuario' : 'minero de la tienda'}: ${error.message}`);
      return false; // Fallo al añadir
    }
  };

  const handleAddNewUserMiner = async () => {
    if (!newMinerUserId.trim() || !newMinerWorkerName.trim()) {
      showError('El ID de usuario y el nombre del worker no pueden estar vacíos.');
      return;
    }
    const minerData = {
      userId: newMinerUserId,
      workerName: newMinerWorkerName,
      currentHashrate: newMinerHashrate,
      status: newMinerStatus,
    };
    const success = await handleAddMiner(minerData, 'user');
    if (success) {
      setNewMinerUserId('');
      setNewMinerWorkerName('');
      setNewMinerHashrate(0);
      setNewMinerStatus('inactivo');
    }
  };

  const handleAddNewStoreMiner = async () => {
    if (!newStoreMinerName.trim() || !newStoreMinerImageUrl.trim() || !newStoreMinerHashrate.trim() || newStoreMinerCost <= 0) {
      showError('Todos los campos de Nombre, URL de Imagen, Hashrate y Costo (mayor a 0) son obligatorios para un minero de la tienda.');
      return;
    }
    const minerData = {
      name: newStoreMinerName,
      imageUrl: newStoreMinerImageUrl,
      cost: newStoreMinerCost,
      hashrate: newStoreMinerHashrate,
      powerConsumption: newStoreMinerPowerConsumption,
      profitability: newStoreMinerProfitability,
    };
    const success = await handleAddMiner(minerData, 'store');
    if (success) {
      setNewStoreMinerName('');
      setNewStoreMinerImageUrl('');
      setNewStoreMinerCost(0);
      setNewStoreMinerHashrate('');
      setNewStoreMinerPowerConsumption('');
      setNewStoreMinerProfitability('');
    }
  };

  const handleDeleteMiner = async (minerId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este minero?')) {
      try {
        console.log("MinerManagement: Eliminando minero con ID:", minerId);
        await deleteDoc(doc(db, 'miners', minerId));
        showSuccess('Minero eliminado exitosamente.');
        console.log("MinerManagement: Minero eliminado exitosamente.");
      } catch (error) {
        console.error("MinerManagement: Error deleting miner: ", error);
        showError(`Error al eliminar minero: ${error.message}`);
      }
    }
  };

  const handleSaveChanges = async () => {
    if (editingMiner.type === 'user') { // Es un minero asignado a un usuario
      console.log("MinerManagement: Guardando cambios para minero de usuario:", editingMiner.id);
      console.log("MinerManagement: Nuevos valores - userId:", newMinerUserId, "workerName:", newMinerWorkerName, "hashrate:", newMinerHashrate, "status:", newMinerStatus);
      try {
        const minerRef = doc(db, 'miners', editingMiner.id);
        await updateDoc(minerRef, {
          userId: newMinerUserId,
          workerName: newMinerWorkerName,
          currentHashrate: newMinerHashrate,
          status: newMinerStatus
        });
        setIsModalOpen(false);
        setEditingMiner(null);
        showSuccess('Minero de usuario actualizado exitosamente.');
        console.log("MinerManagement: Minero de usuario actualizado exitosamente.");
      } catch (error) {
        console.error("MinerManagement: Error updating user miner: ", error);
        showError(`Error al actualizar minero de usuario: ${error.message}`);
      }
    } else if (editingMiner.type === 'store') { // Es un minero de la tienda
      console.log("MinerManagement: Guardando cambios para minero de la tienda:", editingMiner.id);
      console.log("MinerManagement: Nuevos valores - name:", newStoreMinerName, "imageUrl:", newStoreMinerImageUrl, "cost:", newStoreMinerCost, "hashrate:", newStoreMinerHashrate, "powerConsumption:", newStoreMinerPowerConsumption, "profitability:", newStoreMinerProfitability);
      try {
        const minerRef = doc(db, 'miners', editingMiner.id);
        await updateDoc(minerRef, {
          name: newStoreMinerName,
          imageUrl: newStoreMinerImageUrl,
          cost: newStoreMinerCost,
          hashrate: newStoreMinerHashrate,
          powerConsumption: newStoreMinerPowerConsumption,
          profitability: newStoreMinerProfitability,
        });
        setIsModalOpen(false);
        setEditingMiner(null);
        showSuccess('Minero de la tienda actualizado exitosamente.');
        console.log("MinerManagement: Minero de la tienda actualizado exitosamente.");
      } catch (error) {
        console.error("MinerManagement: Error updating store miner: ", error);
        showError(`Error al actualizar minero de la tienda: ${error.message}`);
      }
    }
  };

  // Lógica de paginación para mineros de usuario
  const indexOfLastMiner = currentPage * minersPerPage;
  const indexOfFirstMiner = indexOfLastMiner - minersPerPage;
  const currentUserMiners = userMiners
    .filter(miner => {
      const matchesSearch = searchTerm === '' || 
                            miner.workerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (users.find(user => user.id === miner.userId)?.email || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || miner.status === filterStatus;
      return matchesSearch && matchesStatus;
    })
    .slice(indexOfFirstMiner, indexOfLastMiner);

  const totalPages = Math.ceil(userMiners.length / minersPerPage); // Paginación solo para mineros de usuario

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handleSelectAllMiners = (e) => {
    if (e.target.checked) {
      const allMinerIds = currentUserMiners.map(miner => miner.id);
      setSelectedMiners(allMinerIds);
    } else {
      setSelectedMiners([]);
    }
  };

  const handleSelectMiner = (minerId) => {
    setSelectedMiners(prevSelected =>
      prevSelected.includes(minerId)
        ? prevSelected.filter(id => id !== minerId)
        : [...prevSelected, minerId]
    );
  };

  const handleDeleteSelectedMiners = async () => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar ${selectedMiners.length} minero(s) seleccionado(s)?`)) {
      try {
        console.log("MinerManagement: Eliminando mineros seleccionados:", selectedMiners);
        const deletePromises = selectedMiners.map(minerId => deleteDoc(doc(db, 'miners', minerId)));
        await Promise.all(deletePromises);
        setSelectedMiners([]); // Limpiar selección después de eliminar
        showSuccess('Mineros eliminados exitosamente.');
        console.log("MinerManagement: Mineros eliminados exitosamente.");
      } catch (error) {
        console.error("MinerManagement: Error deleting selected miners: ", error);
        showError(`Error al eliminar mineros seleccionados: ${error.message}`);
      }
    }
  };

  // Datos para la gráfica de estado de mineros
  const minerStatusData = userMiners.reduce((acc, miner) => {
    acc[miner.status] = (acc[miner.status] || 0) + 1; // Solo mineros de usuario para la gráfica de estado
    return acc;
  }, {});

  const chartData = {
    labels: Object.keys(minerStatusData).length > 0 ? Object.keys(minerStatusData) : ["No hay mineros"],
    datasets: [{
      label: 'Mineros por Estado',
      data: Object.values(minerStatusData),
      backgroundColor: ['rgba(75, 192, 192, 0.6)', 'rgba(255, 206, 86, 0.6)', 'rgba(255, 99, 132, 0.6)'],
      borderColor: ['rgba(75, 192, 192, 1)', 'rgba(255, 206, 86, 1)', 'rgba(255, 99, 132, 1)'],
      borderWidth: 1,
    }],
  };

  console.log("Mineros de usuario filtrados y paginados (currentUserMiners):", currentUserMiners); // Log para depuración

  return (
    <div className={`${darkMode ? 'bg-dark_card text-light_text' : 'bg-gray-800 text-white'} p-6 rounded-lg`}>
      <h2 className="text-2xl font-semibold mb-4">Gestión de Mineros</h2>
      
      {/* Formulario para añadir nuevo minero de usuario */}
      <h3 className="text-xl font-semibold mb-3">Añadir Minero de Usuario</h3>
      <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4 border p-4 rounded-lg shadow-sm">
        <div>
          <label htmlFor="newMinerUserId" className={`block text-sm font-medium mb-1 ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>ID de Usuario:</label>
          <select
            id="newMinerUserId"
            value={newMinerUserId}
            onChange={(e) => setNewMinerUserId(e.target.value)}
            className={`w-full rounded-md shadow-sm sm:text-sm p-2 ${darkMode ? 'bg-dark_bg border-dark_border text-light_text' : 'bg-gray-700 border-gray-600 text-white'}`}
          >
            <option value="">Selecciona un Usuario</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>{user.email} (ID: {user.id})</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="newMinerWorkerName" className={`block text-sm font-medium mb-1 ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>Nombre del Worker:</label>
          <input
            type="text"
            id="newMinerWorkerName"
            value={newMinerWorkerName}
            onChange={(e) => setNewMinerWorkerName(e.target.value)}
            placeholder="Ej: worker01 o wuisem.345076"
            className={`w-full rounded-md shadow-sm sm:text-sm p-2 ${darkMode ? 'bg-dark_bg border-dark_border text-light_text' : 'bg-gray-700 border-gray-600 text-white'}`}
          />
        </div>
        <div>
          <label htmlFor="newMinerHashrate" className={`block text-sm font-medium mb-1 ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>Hashrate (TH/s):</label>
          <input
            type="number"
            id="newMinerHashrate"
            value={newMinerHashrate}
            onChange={(e) => setNewMinerHashrate(parseFloat(e.target.value))}
            placeholder="0"
            step="0.01"
            className={`w-full rounded-md shadow-sm sm:text-sm p-2 ${darkMode ? 'bg-dark_bg border-dark_border text-light_text' : 'bg-gray-700 border-gray-600 text-white'}`}
          />
        </div>
        <div>
          <label htmlFor="newMinerStatus" className={`block text-sm font-medium mb-1 ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>Estado:</label>
          <select
            id="newMinerStatus"
            value={newMinerStatus}
            onChange={(e) => setNewMinerStatus(e.target.value)}
            className={`w-full rounded-md shadow-sm sm:text-sm p-2 ${darkMode ? 'bg-dark_bg border-dark_border text-light_text' : 'bg-gray-700 border-gray-600 text-white'}`}
          >
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
            <option value="offline">Offline</option>
          </select>
        </div>
        <div className="md:col-span-4 flex justify-end">
          <button
            onClick={handleAddNewUserMiner}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Añadir Minero de Usuario
          </button>
        </div>
      </div>

      {/* Formulario para añadir nuevo minero de la tienda */}
      <h3 className="text-xl font-semibold mb-3 mt-8">Añadir Minero a la Tienda</h3>
      <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border p-4 rounded-lg shadow-sm">
        <div>
          <label htmlFor="newStoreMinerName" className={`block text-sm font-medium mb-1 ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>Nombre del Minero:</label>
          <input
            type="text"
            id="newStoreMinerName"
            value={newStoreMinerName}
            onChange={(e) => setNewStoreMinerName(e.target.value)}
            placeholder="Ej: Limerminer 17M"
            className={`w-full rounded-md shadow-sm sm:text-sm p-2 ${darkMode ? 'bg-dark_bg border-dark_border text-light_text' : 'bg-gray-700 border-gray-600 text-white'}`}
          />
        </div>
        <div>
          <label htmlFor="newStoreMinerImageUrl" className={`block text-sm font-medium mb-1 ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>URL de la Imagen:</label>
          <input
            type="text"
            id="newStoreMinerImageUrl"
            value={newStoreMinerImageUrl}
            onChange={(e) => setNewStoreMinerImageUrl(e.target.value)}
            placeholder="https://example.com/miner.gif"
            className={`w-full rounded-md shadow-sm sm:text-sm p-2 ${darkMode ? 'bg-dark_bg border-dark_border text-light_text' : 'bg-gray-700 border-gray-600 text-white'}`}
          />
        </div>
        <div>
          <label htmlFor="newStoreMinerCost" className={`block text-sm font-medium mb-1 ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>Costo:</label>
          <input
            type="number"
            id="newStoreMinerCost"
            value={newStoreMinerCost}
            onChange={(e) => setNewStoreMinerCost(parseFloat(e.target.value))}
            placeholder="0"
            step="1"
            className={`w-full rounded-md shadow-sm sm:text-sm p-2 ${darkMode ? 'bg-dark_bg border-dark_border text-light_text' : 'bg-gray-700 border-gray-600 text-white'}`}
          />
        </div>
        <div>
          <label htmlFor="newStoreMinerHashrate" className={`block text-sm font-medium mb-1 ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>Hashrate:</label>
          <input
            type="text"
            id="newStoreMinerHashrate"
            value={newStoreMinerHashrate}
            onChange={(e) => setNewStoreMinerHashrate(e.target.value)}
            placeholder="Ej: 17 MH/s o 5 TH/s"
            className={`w-full rounded-md shadow-sm sm:text-sm p-2 ${darkMode ? 'bg-dark_bg border-dark_border text-light_text' : 'bg-gray-700 border-gray-600 text-white'}`}
          />
        </div>
        <div>
          <label htmlFor="newStoreMinerPowerConsumption" className={`block text-sm font-medium mb-1 ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>Consumo de Energía (W):</label>
          <input
            type="text"
            id="newStoreMinerPowerConsumption"
            value={newStoreMinerPowerConsumption}
            onChange={(e) => setNewStoreMinerPowerConsumption(e.target.value)}
            placeholder="Ej: 60W"
            className={`w-full rounded-md shadow-sm sm:text-sm p-2 ${darkMode ? 'bg-dark_bg border-dark_border text-light_text' : 'bg-gray-700 border-gray-600 text-white'}`}
          />
        </div>
        <div>
          <label htmlFor="newStoreMinerProfitability" className={`block text-sm font-medium mb-1 ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>Rentabilidad (BTC/día):</label>
          <input
            type="text"
            id="newStoreMinerProfitability"
            value={newStoreMinerProfitability}
            onChange={(e) => setNewStoreMinerProfitability(e.target.value)}
            placeholder="Ej: 0.00000005 BTC/día"
            className={`w-full rounded-md shadow-sm sm:text-sm p-2 ${darkMode ? 'bg-dark_bg border-dark_border text-light_text' : 'bg-gray-700 border-gray-600 text-white'}`}
          />
        </div>
        <div className="md:col-span-3 flex justify-end">
          <button
            onClick={handleAddNewStoreMiner}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            Añadir Minero a la Tienda
          </button>
        </div>
      </div>

      {/* Sección de Búsqueda y Filtro */}
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <input
          type="text"
          placeholder="Buscar por nombre de worker, ID de usuario o nombre de minero..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`w-full md:w-2/3 rounded-md shadow-sm sm:text-sm p-2 ${darkMode ? 'bg-dark_bg border-dark_border text-light_text' : 'bg-gray-700 border-gray-600 text-white'}`}
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className={`w-full md:w-1/3 rounded-md shadow-sm sm:text-sm p-2 ${darkMode ? 'bg-dark_bg border-dark_border text-light_text' : 'bg-gray-700 border-gray-600 text-white'}`}
        >
          <option value="all">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
          <option value="offline">Offline</option>
        </select>
      </div>

      {/* Tabla de Gestión de Mineros de la Tienda */}
      <h3 className="text-xl font-semibold mt-8 mb-4">Mineros de la Tienda</h3>
      <div className="overflow-x-auto rounded-lg shadow-md mb-8">
        <table className={`min-w-full divide-y ${darkMode ? 'divide-dark_border' : 'divide-gray-700'}`}>
          <thead className={`${darkMode ? 'bg-dark_bg' : 'bg-gray-700'}`}>
            <tr>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>Nombre</th>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>Imagen</th>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>Costo</th>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>Hashrate</th>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>Consumo</th>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>Rentabilidad</th>
              <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>Acciones</th>
            </tr>
          </thead>
          <tbody className={`${darkMode ? 'bg-dark_card divide-dark_border' : 'bg-gray-800 divide-gray-700'} divide-y`}>
            {storeMiners.filter(miner => 
                searchTerm === '' || 
                miner.name.toLowerCase().includes(searchTerm.toLowerCase())
            ).map((miner) => (
              <tr key={miner.id} className={`${darkMode ? 'hover:bg-dark_border' : 'hover:bg-gray-700'} transition-colors duration-200`}>
                <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>{miner.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <img src={miner.imageUrl} alt={miner.name} className="h-10 w-10 object-cover rounded-full" />
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>{miner.cost}</td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>{miner.hashrate}</td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>{miner.powerConsumption}</td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>{miner.profitability}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleEditClick(miner)}
                    className="text-indigo-400 hover:text-indigo-600 mr-3 transition-colors duration-200"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDeleteMiner(miner.id)}
                    className="text-red-400 hover:text-red-600 transition-colors duration-200"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {storeMiners.filter(miner => 
                searchTerm === '' || 
                miner.name.toLowerCase().includes(searchTerm.toLowerCase())
            ).length === 0 && (
              <tr>
                <td colSpan="7" className={`px-6 py-4 text-center text-sm ${darkMode ? 'text-light_text' : 'text-gray-400'}`}>No se encontraron mineros de la tienda.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Sección de Gestión de Mineros de Usuario */}
      <h3 className="text-xl font-semibold mt-8 mb-4">Mineros Asignados a Usuarios</h3>

      {/* Tabla de Gestión de Mineros */}
      <div className="overflow-x-auto rounded-lg shadow-md">
        <table className={`min-w-full divide-y ${darkMode ? 'divide-dark_border' : 'divide-gray-700'}`}>
          <thead className={`${darkMode ? 'bg-dark_bg' : 'bg-gray-700'}`}>
            <tr>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>
                <input
                  type="checkbox"
                  className="form-checkbox h-4 w-4 text-blue-600 transition duration-150 ease-in-out"
                  onChange={handleSelectAllMiners}
                  checked={currentUserMiners.length > 0 && selectedMiners.length === currentUserMiners.length}
                />
              </th>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>Usuario (Email)</th>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>Nombre del Worker</th>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>Hashrate (TH/s)</th>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>Estado</th>
              <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>Acciones</th>
            </tr>
          </thead>
          <tbody className={`${darkMode ? 'bg-dark_card divide-dark_border' : 'bg-gray-800 divide-gray-700'} divide-y`}>
            {currentUserMiners.map((miner) => (
              <tr key={miner.id} className={`${darkMode ? 'hover:bg-dark_border' : 'hover:bg-gray-700'} transition-colors duration-200`}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 text-blue-600 transition duration-150 ease-in-out"
                    checked={selectedMiners.includes(miner.id)}
                    onChange={() => handleSelectMiner(miner.id)}
                  />
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>
                  {users.find(user => user.id === miner.userId)?.email || miner.userId}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>{miner.workerName}</td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>{miner.currentHashrate ? miner.currentHashrate.toFixed(2) : '0.00'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    miner.status === 'activo' ? 'bg-green-100 text-green-800' :
                    miner.status === 'inactivo' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {miner.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleEditClick(miner)}
                    className="text-indigo-400 hover:text-indigo-600 mr-3 transition-colors duration-200"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDeleteMiner(miner.id)}
                    className="text-red-400 hover:text-red-600 transition-colors duration-200"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {currentUserMiners.length === 0 && (
              <tr>
                <td colSpan="6" className={`px-6 py-4 text-center text-sm ${darkMode ? 'text-light_text' : 'text-gray-400'}`}>No se encontraron mineros.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Botón de Eliminar Seleccionados */}
      {selectedMiners.length > 0 && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleDeleteSelectedMiners}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Eliminar Seleccionados ({selectedMiners.length})
          </button>
        </div>
      )}

      {/* Controles de Paginación */}
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center">
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
            {[...Array(totalPages).keys()].map((number) => (
              <button
                key={number + 1}
                onClick={() => paginate(number + 1)}
                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                  currentPage === number + 1
                    ? 'bg-blue-600 text-white'
                    : (darkMode ? 'bg-dark_bg border-dark_border text-light_text hover:bg-dark_border' : 'bg-gray-700 border-gray-700 text-gray-300 hover:bg-gray-600')
                }`}
              >
                {number + 1}
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Gráfica de Estado de Mineros */}
      <div className={`mt-8 p-6 rounded-lg shadow-md ${darkMode ? 'bg-dark_card' : 'bg-gray-800'}`}>
        <h3 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-light_text' : 'text-white'}`}>Estado de Mineros de Usuario</h3>
        <div className="h-64">
          {userMiners.length > 0 ? (
            <Bar data={chartData} options={{ maintainAspectRatio: false, responsive: true }} />
          ) : (
            <p className={`${darkMode ? 'text-light_text' : 'text-gray-400'} text-center py-8`}>No hay datos de mineros de usuario para mostrar en la gráfica.</p>
          )}
        </div>
      </div>

      {/* Modal de Edición */}
      {isModalOpen && editingMiner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`${darkMode ? 'bg-dark_card text-light_text' : 'bg-gray-800 text-white'} p-8 rounded-lg shadow-xl w-full max-w-md`}>
            <h2 className="text-2xl font-bold mb-4">Editar Minero</h2>
            {editingMiner.type === 'user' ? (
              <div className="space-y-4">
                {/* Campos para mineros de usuario */}
                <div>
                  <label htmlFor="editMinerUserId" className={`block text-sm font-medium ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>ID de Usuario</label>
                  <select
                    id="editMinerUserId"
                    name="userId"
                    value={newMinerUserId}
                    onChange={handleMinerEditChange}
                    className={`w-full rounded-md shadow-sm sm:text-sm p-2 ${darkMode ? 'bg-dark_bg border-dark_border text-light_text' : 'bg-gray-700 border-gray-600 text-white'}`}
                  >
                    <option value="">Selecciona un Usuario</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>{user.email} (ID: {user.id})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="editWorkerName" className={`block text-sm font-medium ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>Nombre del Worker</label>
                  <input
                    type="text"
                    name="workerName"
                    id="editWorkerName"
                    value={newMinerWorkerName}
                    onChange={handleMinerEditChange}
                    className={`mt-1 block w-full rounded-md p-2 ${darkMode ? 'bg-dark_bg border-dark_border text-light_text' : 'bg-gray-700 border-gray-600 text-white'}`}
                  />
                </div>
                <div>
                  <label htmlFor="editCurrentHashrate" className={`block text-sm font-medium ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>Hashrate (TH/s)</label>
                  <input
                    type="number"
                    name="currentHashrate"
                    id="editCurrentHashrate"
                    value={newMinerHashrate}
                    onChange={handleMinerEditChange}
                    step="0.01"
                    className={`mt-1 block w-full rounded-md p-2 ${darkMode ? 'bg-dark_bg border-dark_border text-light_text' : 'bg-gray-700 border-gray-600 text-white'}`}
                  />
                </div>
                <div>
                  <label htmlFor="editStatus" className={`block text-sm font-medium ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>Estado</label>
                  <select
                    name="status"
                    id="editStatus"
                    value={newMinerStatus}
                    onChange={handleMinerEditChange}
                    className={`mt-1 block w-full rounded-md p-2 ${darkMode ? 'bg-dark_bg border-dark_border text-light_text' : 'bg-gray-700 border-gray-600 text-white'}`}
                  >
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                    <option value="offline">Offline</option>
                  </select>
                </div>
              </div>
            ) : editingMiner.type === 'store' ? (
              <div className="space-y-4">
                {/* Campos para mineros de la tienda */}
                <div>
                  <label htmlFor="editStoreMinerName" className={`block text-sm font-medium ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>Nombre del Minero</label>
                  <input type="text" name="name" id="editStoreMinerName" value={newStoreMinerName} onChange={handleMinerEditChange} className={`mt-1 block w-full rounded-md p-2 ${darkMode ? 'bg-dark_bg border-dark_border text-light_text' : 'bg-gray-700 border-gray-600 text-white'}`} />
                </div>
                <div>
                  <label htmlFor="editStoreMinerImageUrl" className={`block text-sm font-medium ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>URL de la Imagen</label>
                  <input type="text" name="imageUrl" id="editStoreMinerImageUrl" value={newStoreMinerImageUrl} onChange={handleMinerEditChange} className={`mt-1 block w-full rounded-md p-2 ${darkMode ? 'bg-dark_bg border-dark_border text-light_text' : 'bg-gray-700 border-gray-600 text-white'}`} />
                </div>
                <div>
                  <label htmlFor="editStoreMinerCost" className={`block text-sm font-medium ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>Costo</label>
                  <input type="number" name="cost" id="editStoreMinerCost" value={newStoreMinerCost} onChange={handleMinerEditChange} step="1" className={`mt-1 block w-full rounded-md p-2 ${darkMode ? 'bg-dark_bg border-dark_border text-light_text' : 'bg-gray-700 border-gray-600 text-white'}`} />
                </div>
                <div>
                  <label htmlFor="editStoreMinerHashrate" className={`block text-sm font-medium ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>Hashrate (MH/s o TH/s)</label>
                  <input type="text" name="hashrate" id="editStoreMinerHashrate" value={newStoreMinerHashrate} onChange={handleMinerEditChange} className={`mt-1 block w-full rounded-md p-2 ${darkMode ? 'bg-dark_bg border-dark_border text-light_text' : 'bg-gray-700 border-gray-600 text-white'}`} />
                </div>
                <div>
                  <label htmlFor="editStoreMinerPowerConsumption" className={`block text-sm font-medium ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>Consumo de Energía (W)</label>
                  <input type="text" name="powerConsumption" id="editStoreMinerPowerConsumption" value={newStoreMinerPowerConsumption} onChange={handleMinerEditChange} className={`mt-1 block w-full rounded-md p-2 ${darkMode ? 'bg-dark_bg border-dark_border text-light_text' : 'bg-gray-700 border-gray-600 text-white'}`} />
                </div>
                <div>
                  <label htmlFor="editStoreMinerProfitability" className={`block text-sm font-medium ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>Rentabilidad (BTC/día)</label>
                  <input type="text" name="profitability" id="editStoreMinerProfitability" value={newStoreMinerProfitability} onChange={handleMinerEditChange} className={`mt-1 block w-full rounded-md p-2 ${darkMode ? 'bg-dark_bg border-dark_border text-light_text' : 'bg-gray-700 border-gray-600 text-white'}`} />
                </div>
              </div>
            ) : null}
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveChanges}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MinerManagement;
