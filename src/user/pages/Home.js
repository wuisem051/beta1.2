import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import HeroSection from '../components/HeroSection';
import ConnectionInfo from '../../admin/components/ConnectionInfo';
import StatsSection from '../components/StatsSection';
import NewsSection from '../components/NewsSection';
import ProfitabilityCalculator from '../components/ProfitabilityCalculator';
import PerformanceStatsSection from '../components/PerformanceStatsSection'; // Importar el nuevo componente
import { db } from '../../services/firebase'; // Importar db desde firebase.js
import { collection, doc, getDoc, query, where, getDocs } from 'firebase/firestore';

const Home = () => {
  const [poolConfig, setPoolConfig] = useState({
    url: 'pool.ejemplo.com',
    port: '1234',
    defaultWorkerName: 'worker1',
  });
  const [siteConfig, setSiteConfig] = useState({
    siteName: 'BitcoinPool',
    homeText: 'Minando el futuro, un bloque a la vez.',
    heroTitle: 'Bienvenido a nuestra Pool de Minería Bitcoin',
  });
  const [totalHashrateAllUsers, setTotalHashrateAllUsers] = useState(0);
  const [activeMinersAllUsers, setActiveMinersAllUsers] = useState(0);
  const [pricePerTHs, setPricePerTHs] = useState(0); // Nuevo estado para el precio por TH/s

  useEffect(() => {
    const fetchSiteConfig = async () => {
      try {
        const docRef = doc(db, 'settings', 'siteConfig');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setSiteConfig(data || {
            siteName: 'BitcoinPool',
            homeText: 'Minando el futuro, un bloque a la vez.',
            heroTitle: 'Bienvenido a nuestra Pool de Minería Bitcoin',
          });
        } else {
          // Si no existe, usar valores por defecto
          setSiteConfig({
            siteName: 'BitcoinPool',
            homeText: 'Minando el futuro, un bloque a la vez.',
            heroTitle: 'Bienvenido a nuestra Pool de Minería Bitcoin',
          });
        }
      } catch (err) {
        console.error("Error fetching site config for Home page from Firebase:", err);
        setSiteConfig({
          siteName: 'BitcoinPool',
          homeText: 'Minando el futuro, un bloque a la vez.',
          heroTitle: 'Bienvenido a nuestra Pool de Minería Bitcoin',
        });
      }
    };

    const fetchAllMinersStats = async () => {
      try {
        const minersRef = collection(db, "miners");
        const querySnapshot = await getDocs(minersRef);
        const data = querySnapshot.docs.map(doc => doc.data());

        let totalHash = 0;
        let activeCount = 0;
        if (data) {
          data.forEach((miner) => {
            totalHash += miner.currentHashrate || 0;
            activeCount += 1;
          });
        }
        setTotalHashrateAllUsers(totalHash);
        setActiveMinersAllUsers(activeCount);
      } catch (err) {
        console.error("Error fetching all miners stats from Firebase:", err);
      }
    };

    const fetchPoolConfig = async () => {
      try {
        const settingsRef = collection(db, "settings");
        const q = query(settingsRef, where("key", "==", "poolConfig"));
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.length > 0 ? querySnapshot.docs[0].data() : null;
        setPoolConfig(data || {
          url: 'pool.ejemplo.com',
          port: '1234',
          defaultWorkerName: 'worker1',
        });
        setPricePerTHs(data?.obsoletePrice || 0); // Obtener el precio por TH/s
      } catch (err) {
        console.error("Error fetching pool config from Firebase:", err);
        setPoolConfig({
          url: 'pool.ejemplo.com',
          port: '1234',
          defaultWorkerName: 'worker1',
        });
        setPricePerTHs(0);
      }
    };

    fetchSiteConfig();
    fetchAllMinersStats();
    fetchPoolConfig();
  }, []);

  return (
    <div className="min-h-screen py-8">
      <HeroSection homeText={siteConfig.homeText} heroTitle={siteConfig.heroTitle} />
      <PerformanceStatsSection /> {/* Mover el componente aquí */}
      <StatsSection totalHashrate={totalHashrateAllUsers} activeMiners={activeMinersAllUsers} pricePerTHs={pricePerTHs} />
      <ProfitabilityCalculator />
      <ConnectionInfo poolConfig={poolConfig} />
      
      {/* Sección de Configuración del Pool - Minimalista y Compacta */}
      <div className="bg-light_card p-6 rounded-lg shadow-md mb-8 border border-gray_border max-w-xl mx-auto">
        <h3 className="text-xl font-bold text-dark_text mb-4 text-center">Configuración del Pool</h3>
        <p className="text-gray_text text-center text-sm mb-6">
          Estos son los datos de configuración actuales del pool.
        </p>
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-gray_border pb-2">
            <span className="font-semibold text-dark_text text-base">URL del Pool:</span>
            <code className="bg-gray-100 text-dark_text px-2 py-0.5 rounded-md text-base">{poolConfig.url}</code>
          </div>
          <div className="flex justify-between items-center border-b border-gray_border pb-2">
            <span className="font-semibold text-dark_text text-base">Puerto:</span>
            <code className="bg-gray-100 text-dark_text px-2 py-0.5 rounded-md text-base">{poolConfig.port}</code>
          </div>
          <div className="flex justify-between items-center border-b border-gray_border pb-2">
            <span className="font-semibold text-dark_text text-base">Worker por Defecto:</span>
            <code className="bg-gray-100 text-dark_text px-2 py-0.5 rounded-md text-base">{poolConfig.defaultWorkerName}</code>
          </div>
          <div className="pt-3">
            <p className="text-gray_text text-xs">
              <span className="font-semibold text-dark_text">Formato de Usuario:</span> <code className="bg-gray-100 px-1.5 py-0.5 rounded-md text-xs">tu_nombre_usuario.nombre_del_worker</code> (ej: juan.antminer01)
            </p>
            <p className="text-gray_text text-xs mt-1.5">
              <span className="font-semibold text-dark_text">Contraseña:</span> Siempre usar "x" (estándar en pools de Bitcoin)
            </p>
          </div>
        </div>
      </div>

      <NewsSection />
    </div>
  );
};

export default Home;
