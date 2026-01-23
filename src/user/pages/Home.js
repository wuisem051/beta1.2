import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { ThemeContext } from '../../context/ThemeContext';
import { db } from '../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';

const Home = () => {
  const { darkMode } = useContext(ThemeContext);
  const [siteConfig, setSiteConfig] = useState({
    siteName: 'MaxiOS Pool',
    homeText: 'Maximiza tus ganancias replicando a los mejores trading en tiempo real.',
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
    <div className={`min-h-screen ${darkMode ? 'bg-[#020617] text-slate-200' : 'bg-slate-50 text-slate-900'} transition-colors duration-500`}>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        {/* Modern Animated Blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-6xl pointer-events-none">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-accent rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>

        <div className="container mx-auto px-6 relative z-10 text-center animate-fade-in-up">
          <div className="animate-float">
            <span className="inline-block py-2 px-4 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-black uppercase tracking-[0.2em] mb-8 backdrop-blur-sm">
              ✨ Trading de Nueva Generación
            </span>
          </div>
          <h1 className="text-5xl md:text-8xl font-black mb-8 tracking-tighter leading-[0.9] animate-float-delayed">
            <span className="bg-gradient-to-br from-white via-blue-400 to-accent bg-clip-text text-transparent italic">
              {siteConfig.heroTitle}
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-500 max-w-3xl mx-auto mb-12 font-medium leading-relaxed">
            {siteConfig.homeText}
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Link to="/register" className="group relative px-10 py-5 bg-accent text-white rounded-[2rem] font-black text-xl shadow-2xl shadow-accent/20 hover:scale-105 active:scale-95 transition-all duration-300 overflow-hidden animate-shine">
              <span className="relative z-10 flex items-center gap-2">
                Empezar Ahora <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </span>
            </Link>
            <Link to="/user/dashboard" className="px-10 py-5 bg-white/5 border border-white/10 rounded-[2rem] font-black text-xl hover:bg-white/10 hover:border-white/20 transition-all active:scale-95">
              Ver Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Section (Why choose us) */}
      <section className="py-24 bg-opacity-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black mb-4 tracking-tight">¿Por qué elegir MaxiOS Pool?</h2>
            <div className="w-20 h-1.5 bg-accent mx-auto rounded-full"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20" /><path d="m17 5-5-3-5 3" /><path d="m17 19-5 3-5-3" /><path d="M22 12h-4" /><path d="M6 12H2" /><path d="m16 7-4 5-4-5" /><path d="m16 17-4-5-4 5" /></svg>}
              title="Copy Trading Automático"
              description="Nuestros expertos operan por ti. Solo elige un plan VIP y observa cómo crecen tus balances."
              color="blue"
            />
            <FeatureCard
              icon={<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1v22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>}
              title="Ganancias Reales"
              description="Transparencia absoluta. El 100% de las operaciones se reflejan en tu portafolio personal."
              color="green"
            />
            <FeatureCard
              icon={<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>}
              title="Seguridad Garantizada"
              description="Tus fondos y datos están protegidos con los más altos estándares de cifrado y seguridad."
              color="accent"
            />
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-24 border-t border-white border-opacity-5">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2">
              <h2 className="text-4xl md:text-5xl font-black mb-8 leading-tight tracking-tighter">
                Tu camino hacia la <span className="text-accent underline decoration-4 underline-offset-8">Libertad Financiera</span>
              </h2>
              <div className="space-y-8">
                <StepItem
                  number="01"
                  title="Regístrate"
                  description="Crea tu cuenta de forma gratuita en segundos y accede al panel de control."
                />
                <StepItem
                  number="02"
                  title="Elige tu Plan"
                  description="Selecciona entre nuestros cupos VIP (Bronze, Gold o Diamond) según tus objetivos."
                />
                <StepItem
                  number="03"
                  title="Disfruta los Resultados"
                  description="Recibe señales y observa cómo se ejecutan las ganancias en tu cuenta automáticamente."
                />
              </div>
            </div>
            <div className="lg:w-1/2 relative">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white border-opacity-10 aspect-square md:aspect-video bg-gradient-to-br from-blue-500/10 to-accent/10 flex items-center justify-center p-8">
                <div className="w-full h-full rounded-2xl bg-white bg-opacity-5 backdrop-blur-xl border border-white border-opacity-10 p-6 flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-8">
                    <div className="h-2 w-24 bg-slate-500/20 rounded-full"></div>
                    <div className="h-8 w-8 rounded-full bg-accent/20"></div>
                  </div>
                  <div className="space-y-4">
                    <div className="h-10 w-full bg-blue-500/10 rounded-xl"></div>
                    <div className="h-10 w-2/3 bg-slate-500/10 rounded-xl"></div>
                    <div className="h-10 w-full bg-green-500/10 rounded-xl"></div>
                  </div>
                  <div className="mt-8 flex justify-end">
                    <div className="h-10 w-32 bg-accent rounded-xl"></div>
                  </div>
                </div>
                {/* Floating elements to simulate a UI */}
                <div className="absolute top-1/4 -right-4 w-32 h-32 bg-accent/20 rounded-3xl blur-2xl animate-pulse"></div>
                <div className="absolute -bottom-4 -left-4 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-12 text-center text-white relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-12 translate-x-12"></div>
            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-black mb-6 tracking-tight">¿Listo para transformar tu capital?</h2>
              <p className="text-xl opacity-80 mb-10 max-w-2xl mx-auto">
                Únete hoy a los cientos de usuarios que ya están aprovechando el poder del Copy Trading.
              </p>
              <Link to="/register" className="px-10 py-5 bg-white text-blue-700 rounded-2xl font-black text-xl hover:scale-105 transition-transform inline-block">
                Crear Cuenta Gratis
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer minimalista */}
      <footer className="py-12 border-t border-white border-opacity-5">
        <div className="container mx-auto px-6 text-center text-slate-500 text-sm">
          <p>© 2026 {siteConfig.siteName}. Todos los derechos reservados.</p>
          <div className="flex justify-center gap-6 mt-4">
            <a href="#" className="hover:text-accent transition-colors">Términos</a>
            <a href="#" className="hover:text-accent transition-colors">Privacidad</a>
            <a href="#" className="hover:text-accent transition-colors">Soporte</a>
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
  <div className="flex gap-8 group py-6 first:pt-0 border-b border-white/5 last:border-0">
    <div className="text-5xl font-black text-white/5 group-hover:text-accent/40 transition-all duration-500 transform group-hover:scale-110 italic">
      {number}
    </div>
    <div className="pt-2">
      <h4 className="text-2xl font-black mb-3 tracking-tight group-hover:translate-x-2 transition-transform duration-300">{title}</h4>
      <p className="text-slate-500 text-sm md:text-lg font-medium leading-normal">{description}</p>
    </div>
  </div>
);

export default Home;
