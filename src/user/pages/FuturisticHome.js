import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { ThemeContext } from '../../context/ThemeContext';
import { db } from '../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';

const FuturisticHome = () => {
  const { darkMode } = useContext(ThemeContext);
  const [siteConfig, setSiteConfig] = useState({
    siteName: 'MaxiOS Pool',
    homeText: 'Maximiza tus ganancias replicando a los mejores traders en tiempo real.',
    heroTitle: 'El Futuro del Trading está aquí',
  });

  useEffect(() => {
    const fetchSiteConfig = async () => {
      try {
        const docRef = doc(db, 'settings', 'siteConfig');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSiteConfig(docSnap.data());
        }
      } catch (err) {
        console.error("Error fetching site config:", err);
      }
    };
    fetchSiteConfig();
  }, []);

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-[#020617] text-slate-200' : 'bg-slate-50 text-slate-900'} transition-colors duration-500 font-sans`}>

      {/* Hero Section */}
      <section className="relative pt-24 pb-32 overflow-hidden">
        {/* Animated Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-6xl pointer-events-none opacity-30">
          <div className="absolute top-10 left-10 w-72 h-72 bg-blue-600 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="container mx-auto px-6 relative z-10 text-center">
          <div className="inline-flex items-center py-1.5 px-4 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-black uppercase tracking-[0.2em] mb-8 animate-fade-in">
            <span className="relative flex h-2 w-2 mr-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
            </span>
            Trading de Nueva Generación
          </div>

          <h1 className="text-5xl md:text-8xl font-black mb-8 tracking-tighter leading-[0.9] animate-fade-in-up">
            <span className="block">{siteConfig.heroTitle.split(' ').slice(0, 3).join(' ')}</span>
            <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-accent bg-clip-text text-transparent">
              {siteConfig.heroTitle.split(' ').slice(3).join(' ')}
            </span>
          </h1>

          <p className="text-lg md:text-2xl text-slate-500 max-w-3xl mx-auto mb-12 font-medium leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            {siteConfig.homeText}
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <Link to="/signup" className="group relative px-10 py-5 bg-accent text-white rounded-2xl font-black text-xl shadow-2xl shadow-orange-500/40 transition-all hover:scale-105 hover:shadow-orange-500/60">
              Empezar Ahora
              <svg xmlns="http://www.w3.org/2000/svg" className="inline-block ml-2 w-6 h-6 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </Link>
            <Link to="/user/dashboard" className="px-10 py-5 bg-white bg-opacity-5 border border-white border-opacity-10 rounded-2xl font-black text-xl hover:bg-opacity-10 transition-all backdrop-blur-md">
              Explorar Panel
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Grid */}
      <section className="py-24 relative">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.29 7 12 12 20.71 7" /><line x1="12" y1="22" x2="12" y2="12" /></svg>}
              title="Copy Trading VIP"
              description="Replica las estrategias de traders expertos de Binance de forma 100% automática y transparente."
              color="blue"
            />
            <FeatureCard
              icon={<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>}
              title="Ganancias Pasivas"
              description="Genera rendimientos diarios sin necesidad de conocimientos técnicos. Tu capital trabaja para ti."
              color="green"
            />
            <FeatureCard
              icon={<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>}
              title="Seguridad de Elite"
              description="Protección multicapa para tus fondos y datos personales con cifrado de grado institucional."
              color="accent"
            />
          </div>
        </div>
      </section>

      {/* How it Works with Mock UI */}
      <section className="py-24 border-y border-white border-opacity-5">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-20">
            <div className="lg:w-1/2">
              <h2 className="text-4xl md:text-6xl font-black mb-10 leading-tight tracking-tighter">
                Control Total sobre tus <span className="text-accent">Ganancias</span>
              </h2>
              <div className="space-y-12">
                <StepItem
                  number="01"
                  title="Crea tu Perfil"
                  description="Regístrate en menos de un minuto y configura tu billetera segura."
                />
                <StepItem
                  number="02"
                  title="Activa un Cupo VIP"
                  description="Elige entre Bronze, Gold o Diamond para empezar a recibir operaciones."
                />
                <StepItem
                  number="03"
                  title="Monitorea en Real-Time"
                  description="Observa cada operación ganadora reflejada en tu historial instantáneamente."
                />
              </div>
            </div>

            <div className="lg:w-1/2 relative">
              {/* Mock UI Card */}
              <div className="relative z-10 p-1 bg-gradient-to-br from-white/20 to-transparent rounded-[2.5rem] shadow-2xl backdrop-blur-xl">
                <div className={`p-8 rounded-[2.3rem] ${darkMode ? 'bg-slate-900/90' : 'bg-white'}`}>
                  <div className="flex justify-between items-center mb-10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-accent"></div>
                      <div className="h-3 w-32 bg-slate-500/20 rounded-full"></div>
                    </div>
                    <div className="h-8 w-24 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center text-[10px] font-black tracking-widest">+12.45%</div>
                  </div>
                  <div className="space-y-6">
                    <div className="h-12 w-full bg-slate-500/5 rounded-2xl flex items-center px-4 justify-between">
                      <div className="h-2 w-1/3 bg-slate-500/20 rounded-full"></div>
                      <div className="h-4 w-12 bg-blue-500/20 rounded-lg"></div>
                    </div>
                    <div className="h-12 w-full bg-slate-500/5 rounded-2xl flex items-center px-4 justify-between">
                      <div className="h-2 w-1/2 bg-slate-500/20 rounded-full"></div>
                      <div className="h-4 w-16 bg-accent/20 rounded-lg"></div>
                    </div>
                    <div className="h-24 w-full bg-gradient-to-t from-accent/5 to-transparent rounded-2xl relative overflow-hidden">
                      <svg className="absolute bottom-0 left-0 w-full h-1/2" viewBox="0 0 100 20" preserveAspectRatio="none">
                        <path d="M0 20 C 20 15, 40 18, 60 10 C 80 2, 100 8, 100 5 L 100 20 L 0 20 Z" fill="url(#grad)" />
                        <defs><linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style={{ stopColor: 'var(--accent)', stopOpacity: 0.3 }} /><stop offset="100%" style={{ stopColor: 'var(--accent)', stopOpacity: 0 }} /></linearGradient></defs>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
              {/* Floating blobs */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-blue-500/10 rounded-full blur-[100px] -z-10"></div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-32">
        <div className="container mx-auto px-6">
          <div className="relative group p-1 bg-gradient-to-r from-blue-500 via-accent to-blue-500 rounded-[3rem] overflow-hidden">
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className={`relative z-10 p-16 md:p-24 rounded-[2.9rem] text-center ${darkMode ? 'bg-slate-950' : 'bg-white'}`}>
              <h2 className="text-4xl md:text-7xl font-black mb-8 tracking-tighter">¿Listo para Operar?</h2>
              <p className="text-xl md:text-2xl text-slate-500 mb-12 max-w-2xl mx-auto font-medium">
                Únete a la plataforma de Copy Trading más avanzada y transparente del mercado.
              </p>
              <Link to="/signup" className="inline-block px-12 py-6 bg-accent text-white rounded-2xl font-black text-2xl shadow-2xl shadow-orange-500/30 hover:scale-105 transition-transform">
                Crear Cuenta Gratis
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-16 border-t border-white border-opacity-5">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-2xl font-black italic tracking-tighter">
              <span className="text-accent">{siteConfig.siteName.charAt(0)}</span>{siteConfig.siteName.substring(1)}
            </div>
            <div className="flex gap-10 text-slate-500 font-bold text-sm">
              <a href="#" className="hover:text-accent transition-colors">Legal</a>
              <a href="#" className="hover:text-accent transition-colors">Privacidad</a>
              <a href="#" className="hover:text-accent transition-colors">Seguridad</a>
              <a href="#" className="hover:text-accent transition-colors">Twitter</a>
            </div>
            <div className="text-slate-600 text-xs font-medium">
              © 2026 {siteConfig.siteName}. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description, color }) => {
  const colorMap = {
    blue: 'text-blue-500 bg-blue-500/10',
    green: 'text-green-500 bg-green-500/10',
    accent: 'text-accent bg-accent/10'
  };

  return (
    <div className="p-10 rounded-[2.5rem] bg-white bg-opacity-5 border border-white border-opacity-5 hover:border-accent/40 transition-all duration-500 group hover:-translate-y-3 shadow-xl">
      <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-8 transition-transform duration-700 group-hover:scale-110 group-hover:rotate-[10deg] ${colorMap[color]}`}>
        {icon}
      </div>
      <h3 className="text-2xl font-black mb-4 tracking-tight">{title}</h3>
      <p className="text-slate-500 font-medium leading-relaxed">
        {description}
      </p>
    </div>
  );
};

const StepItem = ({ number, title, description }) => (
  <div className="flex gap-8 group">
    <div className="text-5xl font-black text-accent/10 group-hover:text-accent transition-colors duration-500 tabular-nums">
      {number}
    </div>
    <div>
      <h4 className="text-2xl font-black mb-3 tracking-tight">{title}</h4>
      <p className="text-slate-500 text-lg font-medium leading-relaxed">{description}</p>
    </div>
  </div>
);

export default FuturisticHome;
