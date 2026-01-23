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
    heroBadge: 'Trading de Nueva Generación',
    f1Title: 'Copy Trading VIP',
    f1Desc: 'Replica las estrategias de traders expertos de Binance de forma 100% automática y transparente.',
    f2Title: 'Ganancias Pasivas',
    f2Desc: 'Genera rendimientos diarios sin necesidad de conocimientos técnicos. Tu capital trabaja para ti.',
    f3Title: 'Seguridad de Elite',
    f3Desc: 'Protección multicapa para tus fondos y datos personales con cifrado de grado institucional.',
    hiwTitle: 'Control Total sobre tus Ganancias',
    s1Title: 'Crea tu Perfil',
    s1Desc: 'Regístrate en menos de un minuto y configura tu billetera segura.',
    s2Title: 'Activa un Cupo VIP',
    s2Desc: 'Elige entre Bronze, Gold o Diamond para empezar a recibir operaciones.',
    s3Title: 'Monitorea en Real-Time',
    s3Desc: 'Observa cada operación ganadora reflejada en tu historial instantáneamente.',
    ctaTitle: '¿Listo para Operar?',
    ctaText: 'Únete a la plataforma de Copy Trading más avanzada y transparente del mercado.',
    ctaBtnText: 'Crear Cuenta Gratis',
    heroBtn1Text: 'Empezar Ahora',
    heroBtn2Text: 'Explorar Panel',
    footerLink1Text: 'Legal',
    footerLink2Text: 'Privacidad',
    footerLink3Text: 'Seguridad',
    footerLink4Text: 'Twitter'
  });

  useEffect(() => {
    const fetchSiteConfig = async () => {
      try {
        const docRef = doc(db, 'settings', 'siteConfig');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSiteConfig(prev => ({ ...prev, ...data }));
        }
      } catch (err) {
        console.error("Error fetching site config:", err);
      }
    };
    fetchSiteConfig();
  }, []);

  return (
    <div className={`min-h-screen transition-colors duration-500 font-sans ${darkMode ? 'text-slate-200' : 'text-slate-900'}`} style={{ backgroundColor: 'var(--bg-main)' }}>

      {/* Hero Section */}
      <section className="relative pt-24 pb-32 overflow-hidden">
        {/* Modern Animated Blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-6xl pointer-events-none">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-accent rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>

        <div className="container mx-auto px-6 relative z-10 text-center animate-fade-in-up">
          <div className="animate-float">
            <span className="inline-flex items-center py-2 px-5 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-black uppercase tracking-[0.3em] mb-10 backdrop-blur-sm">
              <span className="relative flex h-2 w-2 mr-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
              </span>
              {siteConfig.heroBadge}
            </span>
          </div>

          <h1 className="text-5xl md:text-8xl font-black mb-8 tracking-tighter leading-[0.9] animate-float-delayed">
            <span className="block">{siteConfig.heroTitle.split(' ').slice(0, 3).join(' ')}</span>
            <span className="bg-gradient-to-br from-white via-blue-400 to-accent bg-clip-text text-transparent italic">
              {siteConfig.heroTitle.split(' ').slice(3).join(' ')}
            </span>
          </h1>

          <p className="text-lg md:text-2xl text-slate-500 max-w-3xl mx-auto mb-12 font-medium leading-relaxed">
            {siteConfig.homeText}
          </p>

          <div className="flex flex-col sm:flex-row gap-8 justify-center items-center">
            <Link to="/signup" className="group relative px-12 py-6 bg-accent text-white rounded-[2rem] font-black text-2xl shadow-2xl shadow-accent/40 transition-all hover:scale-105 active:scale-95 overflow-hidden animate-shine">
              <span className="relative z-10 flex items-center gap-3">
                {siteConfig.heroBtn1Text}
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 transition-transform group-hover:translate-x-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </span>
            </Link>
            <Link to="/user/dashboard" className="px-12 py-6 bg-white/5 border border-white/10 rounded-[2rem] font-black text-2xl hover:bg-white/10 hover:border-white/20 transition-all active:scale-95 backdrop-blur-md">
              {siteConfig.heroBtn2Text}
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
              title={siteConfig.f1Title}
              description={siteConfig.f1Desc}
              color="blue"
            />
            <FeatureCard
              icon={<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>}
              title={siteConfig.f2Title}
              description={siteConfig.f2Desc}
              color="green"
            />
            <FeatureCard
              icon={<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>}
              title={siteConfig.f3Title}
              description={siteConfig.f3Desc}
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
                {siteConfig.hiwTitle}
              </h2>
              <div className="space-y-12">
                <StepItem
                  number="01"
                  title={siteConfig.s1Title}
                  description={siteConfig.s1Desc}
                />
                <StepItem
                  number="02"
                  title={siteConfig.s2Title}
                  description={siteConfig.s2Desc}
                />
                <StepItem
                  number="03"
                  title={siteConfig.s3Title}
                  description={siteConfig.s3Desc}
                />
              </div>
            </div>

            <div className="lg:w-1/2 relative">
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
            <div className={`relative z-10 p-16 md:p-24 rounded-[2.9rem] text-center`} style={{ backgroundColor: 'var(--bg-main)' }}>
              <h2 className="text-4xl md:text-7xl font-black mb-8 tracking-tighter">{siteConfig.ctaTitle}</h2>
              <p className="text-xl md:text-2xl text-slate-500 mb-12 max-w-2xl mx-auto font-medium">
                {siteConfig.ctaText}
              </p>
              <Link to="/signup" className="inline-block px-12 py-6 bg-accent text-white rounded-2xl font-black text-2xl shadow-2xl shadow-orange-500/30 hover:scale-105 transition-transform animate-shine">
                {siteConfig.ctaBtnText}
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
              <a href="#" className="hover:text-accent transition-colors">{siteConfig.footerLink1Text}</a>
              <a href="#" className="hover:text-accent transition-colors">{siteConfig.footerLink2Text}</a>
              <a href="#" className="hover:text-accent transition-colors">{siteConfig.footerLink3Text}</a>
              <a href="#" className="hover:text-accent transition-colors">{siteConfig.footerLink4Text}</a>
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
    blue: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    green: 'text-green-500 bg-green-500/10 border-green-500/20',
    accent: 'text-accent bg-accent/10 border-accent/20'
  };

  return (
    <div className="p-10 rounded-[2.5rem] bg-white/5 border border-white/5 hover:border-accent/30 transition-all duration-500 group hover:-translate-y-4 hover:shadow-2xl hover:shadow-accent/10 animate-shine">
      <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-8 transition-all duration-500 group-hover:scale-110 group-hover:rotate-12 border ${colorMap[color]}`}>
        {icon}
      </div>
      <h3 className="text-2xl font-black mb-4 tracking-tight group-hover:text-accent transition-colors">{title}</h3>
      <p className="text-slate-500 font-medium leading-relaxed text-sm md:text-base">
        {description}
      </p>
    </div>
  );
};

const StepItem = ({ number, title, description }) => (
  <div className="flex gap-8 group py-6 first:pt-0 border-b border-white/5 last:border-0 items-start">
    <div className="text-5xl font-black text-white/5 group-hover:text-accent/40 transition-all duration-500 transform group-hover:scale-110 italic">
      {number}
    </div>
    <div className="pt-2">
      <h4 className="text-2xl font-black mb-3 tracking-tight group-hover:translate-x-2 transition-transform duration-300">{title}</h4>
      <p className="text-slate-400 text-sm md:text-lg font-medium leading-normal">{description}</p>
    </div>
  </div>
);

export default FuturisticHome;
