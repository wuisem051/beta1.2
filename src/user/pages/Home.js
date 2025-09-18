import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import HeroSection from '../components/HeroSection';
import ProfitabilityCalculator from '../components/ProfitabilityCalculator';
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

    fetchSiteConfig();
  }, []);

  return (
    <div className="min-h-screen py-8">
      <HeroSection homeText={siteConfig.homeText} heroTitle={siteConfig.heroTitle} />
      <ProfitabilityCalculator />
    </div>
  );
};

export default Home;
