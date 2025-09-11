import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase'; // Importar Firebase Firestore
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext'; // Importar useAuth
const ConnectionInfo = () => {
  const { currentUser } = useAuth(); // Obtener el usuario actual
  const [poolUrl, setPoolUrl] = useState('No configurado');
  const [poolPort, setPoolPort] = useState('No configurado');
  const [defaultWorkerName, setDefaultWorkerName] = useState('worker1');
  const [userMiningId, setUserMiningId] = useState('Cargando...'); // Nuevo estado para el ID de minería del usuario

  useEffect(() => {
    const fetchPoolConfig = async () => {
      try {
        const q = query(collection(db, 'settings'), where('key', '==', 'poolConfig'));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const record = querySnapshot.docs[0].data();
          setPoolUrl(record.url || 'No configurado');
          setPoolPort(record.port || 'No configurado');
          setDefaultWorkerName(record.defaultWorkerName || 'worker1');
        } else {
          setPoolUrl('No configurado');
          setPoolPort('No configurado');
          setDefaultWorkerName('worker1');
        }
      } catch (error) {
        console.error("Error fetching pool config from Firebase:", error);
        setPoolUrl('No configurado');
        setPoolPort('No configurado');
        setDefaultWorkerName('worker1');
      }
    };

    const fetchUserMiningId = async () => {
      if (currentUser && currentUser.uid) {
        try {
          const q = query(collection(db, 'miners'), where('userId', '==', currentUser.uid));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const record = querySnapshot.docs[0].data();
            setUserMiningId(record.workerName || 'No asignado');
          } else {
            setUserMiningId('No se encontró minero asociado');
          }
        } catch (error) {
          console.error("Error fetching miner info from Firebase:", error);
          setUserMiningId('No se encontró minero asociado');
        }
      } else {
        setUserMiningId('Inicia sesión para ver tu ID');
      }
    };

    fetchPoolConfig();
    fetchUserMiningId();

    // Suscripción en tiempo real para la configuración del pool
    const unsubscribePoolConfig = onSnapshot(
      query(collection(db, 'settings'), where('key', '==', 'poolConfig')),
      (snapshot) => {
        console.log("ConnectionInfo: Firebase suscripción - Evento recibido para poolConfig.");
        if (!snapshot.empty) {
          const record = snapshot.docs[0].data();
          setPoolUrl(record.url || 'No configurado');
          setPoolPort(record.port || 'No configurado');
          setDefaultWorkerName(record.defaultWorkerName || 'worker1');
        } else {
          setPoolUrl('No configurado');
          setPoolPort('No configurado');
          setDefaultWorkerName('worker1');
        }
      },
      (error) => {
        console.error("Error subscribing to pool config:", error);
      }
    );

    // Suscripción en tiempo real para los mineros del usuario actual
    let unsubscribeMiner;
    if (currentUser && currentUser.uid) {
      unsubscribeMiner = onSnapshot(
        query(collection(db, 'miners'), where('userId', '==', currentUser.uid)),
        (snapshot) => {
          console.log("ConnectionInfo: Firebase suscripción - Evento recibido para miners.");
          if (!snapshot.empty) {
            const record = snapshot.docs[0].data();
            setUserMiningId(record.workerName || 'No asignado');
          } else {
            setUserMiningId('No se encontró minero asociado');
          }
        },
        (error) => {
          console.error("Error subscribing to user miners:", error);
        }
      );
    }

    return () => {
      unsubscribePoolConfig();
      if (unsubscribeMiner) {
        unsubscribeMiner();
      }
    };
  }, [currentUser]);

  return (
    <section className="mb-12 bg-light_card p-8 rounded-lg shadow-md max-w-4xl mx-auto">
      <h2 className="text-2xl font-semibold text-dark_text mb-6 text-center">
        Información de Conexión del Pool
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
        <div>
            <label className="block text-sm font-medium text-gray_text mb-1">URL del Pool:</label>
            <input type="text" className="w-full bg-gray-100 p-3 rounded-md border border-gray_border text-dark_text" value={poolUrl} readOnly />
        </div>
        <div>
            <label className="block text-sm font-medium text-gray_text mb-1">Worker:</label>
            <input type="text" className="w-full bg-gray-100 p-3 rounded-md border border-gray_border text-dark_text" value={defaultWorkerName} readOnly />
        </div>
        <div>
            <label className="block text-sm font-medium text-gray_text mb-1">Puerto:</label>
            <input type="text" className="w-full bg-gray-100 p-3 rounded-md border border-gray_border text-dark_text" value={poolPort} readOnly />
        </div>
        <div>
            <label className="block text-sm font-medium text-gray_text mb-1">Contraseña:</label>
            <input type="text" className="w-full bg-gray-100 p-3 rounded-md border border-gray_border text-dark_text" value="x" readOnly />
        </div>
      </div>
    </section>
  );
};

export default ConnectionInfo;
