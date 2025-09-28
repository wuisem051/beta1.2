import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ThemeContext } from '../../context/ThemeContext';

const FuturisticHome = () => {
  const { theme } = useContext(ThemeContext);
  const [siteConfig, setSiteConfig] = useState({
    siteName: 'MaxiOS Pool',
    heroTitle: 'Bienvenido a nuestra Pool de Minería Bitcoin',
    homeText: 'Minando el futuro, un bloque a la vez.',
  });

  useEffect(() => {
    const fetchSiteConfig = async () => {
      try {
        const docRef = doc(db, 'settings', 'siteConfig');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setSiteConfig(data || {
            siteName: 'MaxiOS Pool',
            heroTitle: 'Bienvenido a nuestra Pool de Minería Bitcoin',
            homeText: 'Minando el futuro, un bloque a la vez.',
          });
        } else {
          setSiteConfig({
            siteName: 'MaxiOS Pool',
            heroTitle: 'Bienvenido a nuestra Pool de Minería Bitcoin',
            homeText: 'Minando el futuro, un un bloque a la vez.',
          });
        }
      } catch (err) {
        console.error("Error fetching site config for FuturisticHome page from Firebase:", err);
        setSiteConfig({
          siteName: 'MaxiOS Pool',
          heroTitle: 'Bienvenido a nuestra Pool de Minería Bitcoin',
          homeText: 'Minando el futuro, un bloque a la vez.',
        });
      }
    };

    fetchSiteConfig();
  }, []);

  return (
    <div className={`min-h-screen ${theme.background} ${theme.text} flex flex-col items-center justify-center p-4`}>
      <div className="text-center max-w-4xl">
        <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight animate-fade-in-up">
          <span className="text-accent">{siteConfig.siteName.charAt(0)}</span>{siteConfig.siteName.substring(1)}
        </h1>
        <p className="text-xl md:text-2xl mb-8 opacity-0 animate-fade-in-delay-1">
          {siteConfig.heroTitle}
        </p>
        <p className="text-lg md:text-xl mb-12 opacity-0 animate-fade-in-delay-2">
          {siteConfig.homeText}
        </p>
        <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-6 opacity-0 animate-fade-in-delay-3">
          <Link
            to="/signup"
            className="bg-accent hover:bg-accent-dark text-white font-bold py-3 px-8 rounded-full transition duration-300 ease-in-out transform hover:scale-105 shadow-lg"
          >
            Comenzar a Minar
          </Link>
          <Link
            to="/news"
            className={`border-2 ${theme.border} ${theme.text} hover:${theme.backgroundAlt} hover:${theme.text} font-bold py-3 px-8 rounded-full transition duration-300 ease-in-out transform hover:scale-105 shadow-lg`}
          >
            Últimas Noticias
          </Link>
        </div>
      </div>

      {/* Sección de características futuristas (ejemplo) */}
      <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full">
        <div className={`p-6 rounded-lg shadow-xl ${theme.backgroundAlt} opacity-0 animate-fade-in-delay-4`}>
          <h3 className="text-2xl font-bold mb-4 text-accent">Tecnología Avanzada</h3>
          <p className={`${theme.textSoft}`}>
            Utilizamos algoritmos de minería de última generación para maximizar tu rentabilidad.
          </p>
        </div>
        <div className={`p-6 rounded-lg shadow-xl ${theme.backgroundAlt} opacity-0 animate-fade-in-delay-5`}>
          <h3 className="text-2xl font-bold mb-4 text-accent">Seguridad Cuántica</h3>
          <p className={`${theme.textSoft}`}>
            Tus activos están protegidos con los más altos estándares de seguridad cibernética.
          </p>
        </div>
        <div className={`p-6 rounded-lg shadow-xl ${theme.backgroundAlt} opacity-0 animate-fade-in-delay-6`}>
          <h3 className="text-2xl font-bold mb-4 text-accent">Interfaz Intuitiva</h3>
          <p className={`${theme.textSoft}`}>
            Gestiona tus operaciones de minería con una experiencia de usuario sin precedentes.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FuturisticHome;
