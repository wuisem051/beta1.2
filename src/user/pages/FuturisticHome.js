import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { ThemeContext } from '../../context/ThemeContext';
import { db } from '../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';

const FuturisticHome = () => {
  const { darkMode } = useContext(ThemeContext);
  const [siteConfig, setSiteConfig] = useState({
    siteName: 'MaxiOS',
    homeText: 'La plataforma definitiva de trading algorítmico y copy-trading de alta frecuencia.',
    heroTitle: 'Domina los Mercados con MaxiOS',
    heroBadge: 'Tecnología Financiera de Élite',
    f1Title: 'Ejecución Institucional',
    f1Desc: 'Accede a la misma tecnología que utilizan los fondos de cobertura más grandes del mundo con latencia ultra-baja.',
    f2Title: 'Estrategias Cuánticas',
    f2Desc: 'Nuestros algoritmos analizan miles de puntos de datos por segundo para encontrar oportunidades donde otros no ven nada.',
    f3Title: 'Seguridad Multicapa',
    f3Desc: 'Tus activos están protegidos por protocolos de grado bancario y custodia en frío descentralizada.',
    hiwTitle: 'Tu Camino a la Libertad Financiera',
    s1Title: 'Conecta tu Exchange',
    s1Desc: 'Vincula tus cuentas de Binance o BingX de forma segura mediante API Keys.',
    s2Title: 'Elige tu Algoritmo',
    s2Desc: 'Selecciona entre docenas de estrategias probadas en backtesting real.',
    s3Title: 'Escala tus Ganancias',
    s3Desc: 'Deja que la tecnología trabaje por ti 24/7 sin emociones ni errores humanos.',
    ctaTitle: 'Comienza tu Viaje Hoy',
    ctaText: 'Únete a miles de traders que ya están transformando su futuro con MaxiOS.',
    ctaBtnText: 'Empezar ahora',
    heroBtn1Text: 'Crear Cuenta',
    heroBtn2Text: 'Ver Mercados',
    footerLink1Text: 'Términos',
    footerLink2Text: 'Privacidad',
    footerLink3Text: 'Seguridad',
    footerLink4Text: 'Contacto'
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

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, ease: "easeOut" }
  };

  return (
    <div className={`min-h-screen transition-all duration-700 font-sans ${darkMode ? 'bg-[#000000] text-[#f8fafc]' : 'bg-[#f8fafc] text-[#0f172a]'}`}>

      {/* ─── NAV SIMULADO (ELITE STYLE) ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/5 px-6 py-4">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 100 100" className="w-8 h-8 filter drop-shadow(0 0 8px var(--accent))">
              <path d="M50 15 L85 50 L50 85 L15 50 Z" fill="none" stroke="var(--accent)" strokeWidth="4" />
              <path d="M50 30 L70 50 L50 70 L30 50 Z" fill="var(--accent)" />
            </svg>
            <span className="text-2xl font-black tracking-tighter uppercase italic bg-gradient-to-r from-accent to-white bg-clip-text text-transparent">MaxiOS</span>
          </div>
          <div className="hidden md:flex gap-8 text-[11px] font-bold uppercase tracking-widest text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Tecnología</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">Ecosistema</a>
            <a href="#community" className="hover:text-white transition-colors">Comunidad</a>
            <Link to="/login" className="text-white hover:text-accent transition-colors">Iniciar Sesión</Link>
          </div>
          <Link to="/signup" className="px-5 py-2 bg-white text-black text-[11px] font-bold uppercase tracking-widest rounded-lg hover:bg-accent transition-all">
            Unirse
          </Link>
        </div>
      </nav>

      {/* ─── HERO SECTION ─── */}
      <section className="relative pt-40 pb-20 overflow-hidden">
        {/* Glow Background Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] pointer-events-none -z-10">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#c1ff2e]/10 rounded-full blur-[120px]"></div>
          <div className="absolute top-[-5%] right-[-5%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]"></div>
        </div>

        <div className="container mx-auto px-6 text-center">
          <motion.div {...fadeInUp} className="mb-6">
            <span className="inline-flex items-center py-1 px-4 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-[0.4em] text-accent backdrop-blur-sm">
              <span className="w-1.5 h-1.5 bg-accent rounded-full mr-2 animate-pulse"></span>
              {siteConfig.heroBadge}
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="text-6xl md:text-[7.5rem] font-black mb-6 leading-[1] tracking-tighter"
          >
            {siteConfig.heroTitle.split(' ').slice(0, -1).join(' ')} <br />
            <span className="bg-gradient-to-r from-accent via-white to-accent bg-clip-text text-transparent italic drop-shadow-[0_0_15px_rgba(193,255,46,0.5)]">
              {siteConfig.heroTitle.split(' ').slice(-1)}
            </span>
          </motion.h1>

          <motion.p
            {...fadeInUp}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-12 font-medium leading-relaxed"
          >
            {siteConfig.homeText}
          </motion.p>

          <motion.div
            {...fadeInUp}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="flex flex-col sm:flex-row gap-6 justify-center items-center"
          >
            <Link to="/signup" className="px-10 py-5 bg-accent text-black rounded-xl font-bold text-lg hover:scale-105 active:scale-95 transition-all shadow-xl shadow-accent/20">
              {siteConfig.heroBtn1Text}
            </Link>
            <Link to="/user/dashboard" className="px-10 py-5 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-lg hover:bg-white/10 transition-all backdrop-blur-md">
              {siteConfig.heroBtn2Text}
            </Link>
          </motion.div>

          {/* Integrated Visual Element - THE 'UFO/FUTURE' LOGO USER LIKES */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, duration: 2, ease: "easeOut" }}
            className="mt-20 relative inline-block group"
          >
            {/* Multi-layered glow for 'UFO' feel */}
            <div className="absolute inset-0 bg-accent/20 blur-[120px] group-hover:bg-accent/40 transition-all duration-700 animate-pulse"></div>
            <div className="absolute inset-0 bg-blue-500/10 blur-[80px] group-hover:bg-blue-500/20 transition-all duration-700"></div>

            <div className="relative z-10 w-56 h-56 mx-auto flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full filter drop-shadow(0 0 20px rgba(193,255,46,0.4))">
                {/* Orbital Rings */}
                <circle cx="50" cy="50" r="48" fill="none" stroke="var(--accent)" strokeWidth="0.2" strokeDasharray="4 4" className="animate-spin-slow opacity-20" />
                <circle cx="50" cy="50" r="38" fill="none" stroke="var(--accent)" strokeWidth="0.5" strokeDasharray="1 5" className="animate-reverse-spin opacity-40" />

                {/* Core Geometric Shape (The 'UFO' Mark) */}
                <path d="M50 15 L85 50 L50 85 L15 50 Z" fill="none" stroke="var(--accent)" strokeWidth="1" className="animate-pulse" />
                <path d="M50 25 L75 50 L50 75 L25 50 Z" fill="rgba(193,255,46,0.1)" stroke="var(--accent)" strokeWidth="2" />

                {/* Inner Power Source */}
                <circle cx="50" cy="50" r="8" fill="var(--accent)" className="animate-float shadow-white shadow-2xl">
                  <animate attributeName="opacity" values="0.4;1;0.4" dur="3s" repeatCount="indefinite" />
                </circle>

                {/* Scifi Scanning Line */}
                <rect x="15" y="49" width="70" height="2" fill="var(--accent)" className="opacity-30">
                  <animate attributeName="y" values="15;85;15" dur="4s" repeatCount="indefinite" />
                </rect>
              </svg>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── TRUST INDICATORS ─── */}
      <section className="py-12 border-y border-white/5 bg-white/[0.01]">
        <div className="container mx-auto px-6 overflow-hidden">
          <div className="flex flex-wrap justify-center items-center gap-12 opacity-30 grayscale hover:grayscale-0 transition-all duration-500">
            <span className="text-2xl font-black tracking-tighter">BINANCE</span>
            <span className="text-2xl font-black tracking-tighter">FIREBASE</span>
            <span className="text-2xl font-black tracking-tighter">BINGX</span>
            <span className="text-2xl font-black tracking-tighter">TRADINGVIEW</span>
            <span className="text-2xl font-black tracking-tighter">STALINK</span>
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="features" className="py-32">
        <div className="container mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tight uppercase">Tecnología de Vanguardia</h2>
            <div className="w-20 h-1 bg-accent mx-auto rounded-full"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <FeatureCard
              title={siteConfig.f1Title}
              desc={siteConfig.f1Desc}
              icon="⚡"
            />
            <FeatureCard
              title={siteConfig.f2Title}
              desc={siteConfig.f2Desc}
              icon="⚛️"
            />
            <FeatureCard
              title={siteConfig.f3Title}
              desc={siteConfig.f3Desc}
              icon="🔒"
            />
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS (TECH STYLE) ─── */}
      <section id="how-it-works" className="py-32 bg-white/[0.02]">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-24">
            <div className="lg:w-1/2">
              <h2 className="text-5xl md:text-6xl font-black mb-12 tracking-tighter leading-none">
                {siteConfig.hiwTitle.split(' ').slice(0, 3).join(' ')} <br />
                <span className="text-accent italic">{siteConfig.hiwTitle.split(' ').slice(3).join(' ')}</span>
              </h2>
              <div className="space-y-4">
                <StepItem num="01" title={siteConfig.s1Title} desc={siteConfig.s1Desc} />
                <StepItem num="02" title={siteConfig.s2Title} desc={siteConfig.s2Desc} />
                <StepItem num="03" title={siteConfig.s3Title} desc={siteConfig.s3Desc} />
              </div>
            </div>
            <div className="lg:w-1/2">
              <div className="p-1.5 bg-gradient-to-br from-white/10 to-transparent rounded-[3rem] shadow-2xl">
                <div className="bg-[#0a0a0a] rounded-[2.8rem] p-10 overflow-hidden relative">
                  <div className="flex justify-between items-center mb-8">
                    <div className="flex gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    </div>
                    <div className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-[10px] uppercase font-black text-accent tracking-widest">
                      Terminal Active v4.2
                    </div>
                  </div>
                  <div className="space-y-4 opacity-50">
                    <div className="h-4 bg-white/5 rounded-full w-full"></div>
                    <div className="h-4 bg-white/5 rounded-full w-2/3"></div>
                    <div className="h-32 bg-accent/5 border border-accent/20 rounded-2xl flex items-center justify-center">
                      <div className="text-accent font-black text-4xl animate-pulse">89.4%</div>
                    </div>
                    <div className="h-4 bg-white/5 rounded-full w-full"></div>
                    <div className="h-4 bg-white/5 rounded-full w-4/5"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER (PROFESSIONAL) ─── */}
      <footer className="py-20 border-t border-white/5">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <img
                  src="/logo.png"
                  alt="MaxiOS"
                  className="h-10 w-auto mix-blend-lighten brightness-110"
                />
              </div>
              <p className="text-slate-500 font-medium max-w-sm leading-relaxed">
                Empoderando a la próxima generación de inversores con tecnología de trading algorítmico automatizado y transparente.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-black uppercase tracking-widest mb-6">Plataforma</h4>
              <ul className="space-y-4 text-slate-500 font-bold text-sm">
                <li><a href="#" className="hover:text-accent transition-colors">Estrategias</a></li>
                <li><a href="#" className="hover:text-accent transition-colors">Precios</a></li>
                <li><a href="#" className="hover:text-accent transition-colors">Seguridad</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-black uppercase tracking-widest mb-6">Legal</h4>
              <ul className="space-y-4 text-slate-500 font-bold text-sm">
                <li><a href="#" className="hover:text-accent transition-colors">{siteConfig.footerLink1Text}</a></li>
                <li><a href="#" className="hover:text-accent transition-colors">{siteConfig.footerLink2Text}</a></li>
                <li><a href="#" className="hover:text-accent transition-colors">{siteConfig.footerLink4Text}</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-slate-600 font-black uppercase tracking-[0.2em] text-[10px]">
              © 2026 MaxiOS Ecosystem. Todos los derechos reservados.
            </div>
            <div className="flex gap-6 opacity-30">
              {/* Iconos sociales simplificados */}
              <div className="w-5 h-5 bg-white rounded-sm"></div>
              <div className="w-5 h-5 bg-white rounded-sm"></div>
              <div className="w-5 h-5 bg-white rounded-sm"></div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ title, desc, icon }) => (
  <div className="p-8 rounded-3xl bg-white/[0.03] border border-white/5 hover:border-accent/30 transition-all group hover:-translate-y-2">
    <div className="text-4xl mb-6 group-hover:scale-110 transition-transform inline-block text-accent drop-shadow-[0_0_8px_rgba(193,255,46,0.3)]">{icon}</div>
    <h3 className="text-xl font-black mb-4 uppercase tracking-tight">{title}</h3>
    <p className="text-slate-500 font-medium leading-relaxed text-sm">{desc}</p>
  </div>
);

const StepItem = ({ num, title, desc }) => (
  <div className="flex gap-6 py-8 border-b border-white/5 last:border-0 group">
    <div className="text-4xl font-black text-white/10 group-hover:text-accent transition-colors italic">{num}</div>
    <div>
      <h4 className="text-xl font-black mb-2 uppercase tracking-tight group-hover:translate-x-1 transition-transform">{title}</h4>
      <p className="text-slate-500 font-medium text-sm leading-relaxed">{desc}</p>
    </div>
  </div>
);

export default FuturisticHome;
