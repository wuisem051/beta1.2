import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext'; // Importar useAuth

const UserPoolArbitrage = () => {
  const { currentUser } = useAuth(); // Obtener el usuario actual
  const [availablePools, setAvailablePools] = useState([]);
  const [userActivePools, setUserActivePools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Estados para las estadísticas de arbitraje
  const [activePoolsCount, setActivePoolsCount] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [bestRate, setBestRate] = useState(0);
  const [poolToJoin, setPoolToJoin] = useState(null); // Nuevo estado para la pool a unirse
  const [poolToLeave, setPoolToLeave] = useState(null); // Nuevo estado para la pool a desconectarse

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      console.log("UserPoolArbitrage: No hay usuario autenticado.");
      return;
    }
    console.log("UserPoolArbitrage: currentUser", currentUser);
    console.log("UserPoolArbitrage: availablePools (antes de fetch)", availablePools);
    console.log("UserPoolArbitrage: userActivePools (antes de fetch)", userActivePools);

    const fetchPools = async () => {
      try {
        // Suscripción a pools de arbitraje disponibles
        const availablePoolsQuery = query(collection(db, 'arbitragePools'));
        const unsubscribeAvailable = onSnapshot(availablePoolsQuery, (snapshot) => {
          const poolsList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            thsRate: parseFloat(doc.data().thsRate || 0), // Asegurar que thsRate sea un número
            commission: parseFloat(doc.data().commission || 0), // Asegurar que commission sea un número
            url: doc.data().url || '', // Asegurar que url esté presente
            port: doc.data().port || '', // Asegurar que port esté presente
            defaultWorkerName: doc.data().defaultWorkerName || '', // Asegurar que defaultWorkerName esté presente
          }));
          setAvailablePools(poolsList);
        }, (err) => {
          console.error("Error subscribing to available arbitrage pools:", err);
          setError('Error al cargar las pools de arbitraje disponibles.');
        });

        // Suscripción a las pools activas del usuario
        const userActivePoolsQuery = query(
          collection(db, 'userArbitragePools'),
          where('userId', '==', currentUser.uid)
        );
        const unsubscribeUserActive = onSnapshot(userActivePoolsQuery, (snapshot) => {
          const activeList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            earnings: parseFloat(doc.data().earnings || 0), // Asegurar que earnings sea un número
            thsRate: parseFloat(doc.data().thsRate || 0), // Asegurar que thsRate sea un número para las estadísticas
            url: doc.data().url || '', // Asegurar que url esté presente
            port: doc.data().port || '', // Asegurar que port esté presente
            defaultWorkerName: doc.data().defaultWorkerName || '', // Asegurar que defaultWorkerName esté presente
          }));
          setUserActivePools(activeList);
          setActivePoolsCount(activeList.length); // Actualizar el contador de pools activas
          console.log("UserPoolArbitrage: userActivePools (después de fetch)", JSON.stringify(activeList, null, 2)); // Log para depuración detallado

          // Calcular ganancias totales y mejor tasa (ejemplo simplificado)
          let totalEarn = 0;
          let highestRate = 0;
          activeList.forEach(pool => {
            totalEarn += pool.earnings;
            if (pool.thsRate > highestRate) {
              highestRate = pool.thsRate;
            }
          });
          setTotalEarnings(totalEarn);
          setBestRate(highestRate);

          setLoading(false);
        }, (err) => {
          console.error("Error subscribing to user's active arbitrage pools:", err);
          setError('Error al cargar tus pools de arbitraje activas.');
          setLoading(false);
        });

        return () => {
          unsubscribeAvailable();
          unsubscribeUserActive();
        };
      } catch (fetchError) {
        console.error("Error fetching arbitrage pools:", fetchError);
        setError('Error al cargar las pools de arbitraje.');
        setLoading(false);
      }
    };

    fetchPools();
  }, [currentUser]);

  const handleJoinPool = async (pool) => {
    if (!currentUser) {
      setError('Debes iniciar sesión para unirte a una pool.');
      return;
    }
    setPoolToJoin(pool); // Establecer la pool seleccionada para confirmación
    console.log("handleJoinPool: pool seleccionada para unirse", pool);
  };

  const confirmJoinPool = async () => {
    console.log("confirmJoinPool: poolToJoin (antes de guardar)", JSON.stringify(poolToJoin, null, 2)); // Log detallado
    if (!currentUser || !poolToJoin) {
      setError('No se ha seleccionado ninguna pool o no hay usuario autenticado.');
      return;
    }
    try {
      // Verificar si el usuario ya está unido a esta pool
      const existingPoolQuery = query(
        collection(db, 'userArbitragePools'),
        where('userId', '==', currentUser.uid),
        where('poolId', '==', poolToJoin.id)
      );
      const existingPoolSnapshot = await addDoc(collection(db, 'userArbitragePools'), {
        userId: currentUser.uid,
        poolId: poolToJoin.id,
        poolName: poolToJoin.name,
        cryptocurrency: poolToJoin.cryptocurrency,
        thsRate: poolToJoin.thsRate,
        commission: poolToJoin.commission,
        url: poolToJoin.url, // Guardar URL de la pool
        port: poolToJoin.port, // Guardar Puerto de la pool
        defaultWorkerName: poolToJoin.defaultWorkerName, // Guardar Nombre de Worker por Defecto
        status: 'Activa', // O 'Pendiente', dependiendo de la lógica de negocio
        earnings: 0, // Inicializar ganancias
        joinedAt: new Date(),
      });
      setError('');
      alert(`Te has unido a la pool ${poolToJoin.name} exitosamente!`);
      setPoolToJoin(null); // Cerrar el modal de confirmación
    } catch (err) {
      console.error("Error al unirse a la pool:", err);
      setError('Fallo al unirse a la pool de arbitraje.');
    }
  };

  const cancelJoinPool = () => {
    console.log("cancelJoinPool: Cancelando unión a pool.");
    setPoolToJoin(null); // Cerrar el modal de confirmación sin unirse
    setError(''); // Limpiar cualquier error previo
  };

  const handleLeavePool = async (pool) => {
    setPoolToLeave(pool); // Establecer la pool seleccionada para confirmación de desconexión
  };

  const confirmLeavePool = async () => {
    if (!currentUser || !poolToLeave) {
      setError('No se ha seleccionado ninguna pool para desconectar o no hay usuario autenticado.');
      return;
    }
    try {
      console.log("Intentando eliminar documento con ID:", poolToLeave.id); // Log para depuración
      await deleteDoc(doc(db, 'userArbitragePools', poolToLeave.id));
      setError('');
      alert(`Te has desconectado de la pool ${poolToLeave.poolName} exitosamente!`);
      setPoolToLeave(null); // Cerrar el modal de confirmación
    } catch (err) {
      console.error("Error detallado al desconectarse de la pool:", err); // Log para depuración
      setError('Fallo al desconectarse de la pool de arbitraje. Consulta la consola para más detalles.');
    }
  };

  const cancelLeavePool = () => {
    setPoolToLeave(null); // Cerrar el modal de confirmación sin desconectarse
    setError(''); // Limpiar cualquier error previo
  };

  if (loading) {
    return <div className="text-center text-gray-800 p-8">Cargando panel de arbitraje...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500 p-8">{error}</div>;
  }

  return (
    <div className="p-4 space-y-6 bg-gray-50 text-gray-900">
      {/* Pools de Arbitraje Disponibles */}
      <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
        <div className="flex items-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-yellow-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-800">Pools de Arbitraje Disponibles</h2>
        </div>
        <p className="text-gray-600 mb-6">Participa en pools de arbitraje para maximizar tus ganancias en diferentes criptomonedas</p>

        {availablePools.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p className="mb-2">No hay pools de arbitraje disponibles en este momento.</p>
            <p>Vuelve más tarde para ver nuevas oportunidades.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availablePools.map((pool) => (
              <div key={pool.id} className="bg-gray-100 p-5 rounded-lg flex items-center justify-between border border-gray-200">
                <div>
                  <h3 className="text-xl font-semibold text-blue-700">{pool.name} ({pool.cryptocurrency})</h3>
                  <p className="text-gray-700 text-sm">${pool.thsRate.toFixed(3)} por TH/s | Comisión: {pool.commission.toFixed(1)}%</p>
                </div>
                <button
                  onClick={() => handleJoinPool(pool)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md text-sm"
                >
                  Unirse
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mis Pools de Arbitraje Activas */}
      <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
        <div className="flex items-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-green-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-800">Mis Pools de Arbitraje Activas</h2>
        </div>

        {userActivePools.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mt-4 mb-2 text-gray-600">No has aceptado ninguna pool de arbitraje aún</p>
            <p className="text-sm text-gray-500">Acepta pools arriba para ver la información de minería aquí</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {userActivePools.map((pool) => (
              <div key={pool.id} className="bg-gray-100 p-5 rounded-lg flex items-center justify-between border border-gray-200">
                <div>
                  <h3 className="text-xl font-semibold text-green-700">{pool.poolName} ({pool.cryptocurrency})</h3>
                  <p className="text-gray-700 text-sm">Estado: {pool.status} | Ganancias: ${pool.earnings.toFixed(2)}</p>
                  <p className="text-gray-700 text-sm">Tasa TH/s: ${pool.thsRate.toFixed(3)} | Comisión: {pool.commission.toFixed(1)}%</p>
                  {pool.url && pool.port && (
                    <p className="text-gray-700 text-sm">Conexión: {pool.url}:{pool.port} | Worker: {pool.defaultWorkerName}</p>
                  )}
                </div>
                <button
                  onClick={() => handleLeavePool(pool)}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md text-sm"
                >
                  Desconectar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Estadísticas de Arbitraje */}
      <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
        <div className="flex items-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-orange-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9 0 1020.945 13H11V3.055z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-800">Estadísticas de Arbitraje</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="bg-gray-100 p-5 rounded-lg border border-gray-200 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11.356 2H15M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-gray-800">{activePoolsCount}</p>
            <p className="text-gray-600 text-sm">Pools Activas</p>
          </div>

          <div className="bg-gray-100 p-5 rounded-lg border border-gray-200 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V3a1 1 0 00-1-1H4a1 1 0 00-1 1v18a1 1 0 001 1h12a1 1 0 001-1v-5m-1-10v4m-4 0h4" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-gray-800">${totalEarnings.toFixed(2)}</p>
            <p className="text-gray-600 text-sm">Ganancias Totales</p>
          </div>

          <div className="bg-gray-100 p-5 rounded-lg border border-gray-200 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-gray-800">{bestRate.toFixed(2)}%</p>
            <p className="text-gray-600 text-sm">Mejor Tasa</p>
          </div>
        </div>
      </div>

      {/* Modal de Confirmación para Unirse a la Pool */}
      {poolToJoin && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full text-center">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Confirmar Unión a Pool</h3>
            <p className="text-gray-700 mb-6">
              ¿Estás seguro de que quieres unirte a la pool <span className="font-semibold">{poolToJoin.name} ({poolToJoin.cryptocurrency})</span>?
              <br />
              Tasa: ${poolToJoin.thsRate.toFixed(3)} por TH/s | Comisión: {poolToJoin.commission.toFixed(1)}%
              {poolToJoin.url && poolToJoin.port && (
                <>
                  <br />
                  Conexión: {poolToJoin.url}:{poolToJoin.port} | Worker: {poolToJoin.defaultWorkerName}
                </>
              )}
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={confirmJoinPool}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-5 rounded-md text-lg"
              >
                Confirmar Unión
              </button>
              <button
                onClick={cancelJoinPool}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-5 rounded-md text-lg"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación para Desconectarse de la Pool */}
      {poolToLeave && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full text-center">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Confirmar Desconexión de Pool</h3>
            <p className="text-gray-700 mb-6">
              ¿Estás seguro de que quieres desconectarte de la pool <span className="font-semibold">{poolToLeave.poolName} ({poolToLeave.cryptocurrency})</span>?
              <br />
              Esta acción marcará la pool como inactiva.
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={confirmLeavePool}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-5 rounded-md text-lg"
              >
                Confirmar Desconexión
              </button>
              <button
                onClick={cancelLeavePool}
                className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-5 rounded-md text-lg"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserPoolArbitrage;
