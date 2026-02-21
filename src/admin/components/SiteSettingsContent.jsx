import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase'; // Importar la instancia de Firebase Firestore
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useError } from '../../context/ErrorContext'; // Importar useError

const SiteSettingsContent = () => {
  const [siteName, setSiteName] = useState('');
  const [homeText, setHomeText] = useState('');
  const [heroTitle, setHeroTitle] = useState('');
  const [heroBadge, setHeroBadge] = useState('');
  const [siteDomain, setSiteDomain] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [faviconFile, setFaviconFile] = useState(null);
  const [footerText, setFooterText] = useState('');
  const [airtmExtensionUrl, setAirtmExtensionUrl] = useState('');
  const [airtmExtensionVersion, setAirtmExtensionVersion] = useState('');
  const [showExchangeSection, setShowExchangeSection] = useState(true);
  const [showRoadmap, setShowRoadmap] = useState(true);

  // Features
  const [f1Title, setF1Title] = useState('');
  const [f1Desc, setF1Desc] = useState('');
  const [f2Title, setF2Title] = useState('');
  const [f2Desc, setF2Desc] = useState('');
  const [f3Title, setF3Title] = useState('');
  const [f3Desc, setF3Desc] = useState('');

  // How it works
  const [hiwTitle, setHiwTitle] = useState('');
  const [s1Title, setS1Title] = useState('');
  const [s1Desc, setS1Desc] = useState('');
  const [s2Title, setS2Title] = useState('');
  const [s2Desc, setS2Desc] = useState('');
  const [s3Title, setS3Title] = useState('');
  const [s3Desc, setS3Desc] = useState('');

  // CTA
  const [ctaTitle, setCtaTitle] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [ctaBtnText, setCtaBtnText] = useState('');

  // Buttons
  const [heroBtn1Text, setHeroBtn1Text] = useState('');
  const [heroBtn2Text, setHeroBtn2Text] = useState('');

  // Footer Links
  const [footerLink1Text, setFooterLink1Text] = useState('');
  const [footerLink2Text, setFooterLink2Text] = useState('');
  const [footerLink3Text, setFooterLink3Text] = useState('');
  const [footerLink4Text, setFooterLink4Text] = useState('');

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const { showError, showSuccess, error } = useError(); // Usar el contexto de errores
  const storage = getStorage();

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      showError(null); // Limpiar errores al iniciar la carga
      setMessage('');
      try {
        const docRef = doc(db, 'settings', 'siteConfig');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setSiteName(data.siteName || '');
          setHomeText(data.homeText || '');
          setHeroTitle(data.heroTitle || '');
          setHeroBadge(data.heroBadge || '');
          setSiteDomain(data.siteDomain || '');
          setFaviconUrl(data.faviconUrl || '');
          setFooterText(data.footerText || '');

          setF1Title(data.f1Title || '');
          setF1Desc(data.f1Desc || '');
          setF2Title(data.f2Title || '');
          setF2Desc(data.f2Desc || '');
          setF3Title(data.f3Title || '');
          setF3Desc(data.f3Desc || '');

          setHiwTitle(data.hiwTitle || '');
          setS1Title(data.s1Title || '');
          setS1Desc(data.s1Desc || '');
          setS2Title(data.s2Title || '');
          setS2Desc(data.s2Desc || '');
          setS3Title(data.s3Title || '');
          setS3Desc(data.s3Desc || '');

          setCtaTitle(data.ctaTitle || '');
          setCtaText(data.ctaText || '');
          setCtaBtnText(data.ctaBtnText || 'Crear Cuenta Gratis');

          setHeroBtn1Text(data.heroBtn1Text || 'Empezar Ahora');
          setHeroBtn2Text(data.heroBtn2Text || 'Explorar Panel');

          setFooterLink1Text(data.footerLink1Text || 'Legal');
          setFooterLink2Text(data.footerLink2Text || 'Privacidad');
          setFooterLink3Text(data.footerLink3Text || 'Seguridad');
          setFooterLink4Text(data.footerLink4Text || 'Twitter');
          setAirtmExtensionUrl(data.airtmExtensionUrl || '');
          setAirtmExtensionVersion(data.airtmExtensionVersion || '1.0.0');
          setShowExchangeSection(data.showExchangeSection !== undefined ? data.showExchangeSection : true);
          setShowRoadmap(data.showRoadmap !== undefined ? data.showRoadmap : true);
        } else {
          // Si no existe, crear con valores por defecto
          try {
            await setDoc(docRef, {
              siteName: 'MaxiOS',
              homeText: 'Maximiza tus ganancias replicando a los mejores traders en tiempo real.',
              heroTitle: 'El Futuro del Trading está aquí',
              performanceStatsResetDate: null,
              siteDomain: '',
              faviconUrl: '',
              footerText: `© ${new Date().getFullYear()} MaxiOS. Todos los derechos reservados. Versión del proyecto 1.0 Beta`,
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
              footerLink4Text: 'Twitter',
              airtmExtensionUrl: '',
              airtmExtensionVersion: '1.0.0',
              showExchangeSection: true,
              showRoadmap: true
            });
            setSiteName('MaxiOS');
            setHomeText('Maximiza tus ganancias replicando a los mejores traders en tiempo real.');
            setHeroTitle('El Futuro del Trading está aquí');
            setSiteDomain('');
            setFaviconUrl('');
            setFooterText(`© ${new Date().getFullYear()} MaxiOS. Todos los derechos reservados. Versión del proyecto 1.0 Beta`);
          } catch (createError) {
            console.error("Error creating default site settings in Firebase:", createError);
            showError('Error al crear la configuración por defecto del sitio.');
          }
        }
      } catch (err) {
        console.error("Error fetching site settings from Firebase:", err);
        showError('Error al cargar la configuración del sitio.');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [showError]);

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFaviconFile(e.target.files[0]);
      showError(null); // Limpiar errores al seleccionar un archivo
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    showError(null); // Limpiar errores al intentar guardar
    setMessage('');
    setLoading(true);
    try {
      let updatedFaviconUrl = faviconUrl;
      if (faviconFile) {
        const faviconRef = ref(storage, `favicons/${faviconFile.name}`);
        await uploadBytes(faviconRef, faviconFile);
        updatedFaviconUrl = await getDownloadURL(faviconRef);
      }

      const dataToUpdate = {
        siteName: siteName,
        homeText: homeText,
        heroTitle: heroTitle,
        heroBadge: heroBadge,
        siteDomain: siteDomain,
        faviconUrl: updatedFaviconUrl,
        footerText: footerText,
        f1Title, f1Desc, f2Title, f2Desc, f3Title, f3Desc,
        hiwTitle, s1Title, s1Desc, s2Title, s2Desc, s3Title, s3Desc,
        ctaTitle, ctaText, ctaBtnText,
        heroBtn1Text, heroBtn2Text,
        footerLink1Text, footerLink2Text, footerLink3Text, footerLink4Text,
        airtmExtensionUrl, airtmExtensionVersion,
        showExchangeSection,
        showRoadmap
      };

      const docRef = doc(db, 'settings', 'siteConfig');
      await updateDoc(docRef, dataToUpdate);

      setFaviconUrl(updatedFaviconUrl); // Actualizar el estado con la nueva URL
      showSuccess('Configuración del sitio guardada exitosamente!');
    } catch (err) {
      console.error("Error saving site settings:", err);
      showError(`Fallo al guardar la configuración: ${err.message}`);
    } finally {
      setLoading(false);
      setFaviconFile(null); // Limpiar el archivo seleccionado en la UI
    }
  };

  const handleResetPerformanceStats = async () => {
    if (!window.confirm('¿Estás seguro de que quieres reiniciar las estadísticas de rendimiento? Esto borrará los datos históricos para el cálculo del gráfico.')) {
      return;
    }
    showError(null); // Limpiar errores al intentar reiniciar
    setMessage('');
    setLoading(true);
    try {
      const docRef = doc(db, 'settings', 'siteConfig');
      await updateDoc(docRef, {
        performanceStatsResetDate: new Date(),
      });
      showSuccess('Estadísticas de rendimiento reiniciadas exitosamente!');
    } catch (err) {
      console.error("Error resetting performance stats:", err);
      showError(`Fallo al reiniciar estadísticas: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 rounded-2xl shadow-xl space-y-8" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>
      <div className="flex justify-between items-center border-b border-slate-700 pb-4">
        <h2 className="text-3xl font-bold text-white flex items-center gap-2">
          <span className="bg-blue-500/10 p-2 rounded-lg text-lg">⚙️</span>
          Configuración Personalizada del Sitio
        </h2>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-8">
        {/* Sección General */}
        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 shadow-lg space-y-6">
          <h3 className="text-xl font-semibold text-blue-400 flex items-center gap-2 mb-2">
            <span className="bg-blue-500/10 p-2 rounded-lg text-sm">🌐</span>
            Identidad Visual y General
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="siteName" className="text-sm font-medium text-slate-400">Nombre de la Plataforma</label>
              <input
                type="text"
                id="siteName"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all placeholder:text-slate-600"
                placeholder="Ej: MaxiOS Trading"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="siteDomain" className="text-sm font-medium text-slate-400">Dominio Principal</label>
              <input
                type="text"
                id="siteDomain"
                value={siteDomain}
                onChange={(e) => setSiteDomain(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all placeholder:text-slate-600"
                placeholder="www.tusitio.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="faviconUrl" className="text-sm font-medium text-slate-400">URL del Favicon (Manual)</label>
              <input
                type="text"
                id="faviconUrl"
                value={faviconUrl}
                onChange={(e) => setFaviconUrl(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all placeholder:text-slate-600"
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="faviconUpload" className="text-sm font-medium text-slate-400">Subir Nuevo Favicon</label>
              <input
                type="file"
                id="faviconUpload"
                accept=".ico,.png"
                onChange={handleFileChange}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-slate-400 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Sección Hero */}
        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 shadow-lg space-y-6">
          <h3 className="text-xl font-semibold text-blue-400 flex items-center gap-2 mb-2">
            <span className="bg-blue-500/10 p-2 rounded-lg text-sm">🚀</span>
            Sección Principal (Hero)
          </h3>

          <div className="space-y-2">
            <label htmlFor="heroBadge" className="text-sm font-bold text-slate-500 uppercase tracking-widest">Badge Superior (Texto Destacado)</label>
            <input
              type="text"
              id="heroBadge"
              value={heroBadge}
              onChange={(e) => setHeroBadge(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="heroTitle" className="text-sm font-bold text-slate-500 uppercase tracking-widest">Título Principal H1</label>
            <input
              type="text"
              id="heroTitle"
              value={heroTitle}
              onChange={(e) => setHeroTitle(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="homeText" className="text-sm font-bold text-slate-500 uppercase tracking-widest">Subtítulo Descriptivo</label>
            <textarea
              id="homeText"
              rows="3"
              value={homeText}
              onChange={(e) => setHomeText(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all resize-none"
              required
            ></textarea>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Texto Botón Primario</label>
              <input type="text" value={heroBtn1Text} onChange={(e) => setHeroBtn1Text(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Texto Botón Secundario</label>
              <input type="text" value={heroBtn2Text} onChange={(e) => setHeroBtn2Text(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white" />
            </div>
          </div>
        </div>

        {/* Sección Características */}
        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 shadow-lg space-y-6">
          <h3 className="text-xl font-semibold text-blue-400 flex items-center gap-2 mb-2">
            <span className="bg-blue-500/10 p-2 rounded-lg text-sm">✨</span>
            Módulos de Características (Features)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-700/50 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter bg-slate-800 px-2 py-0.5 rounded">Módulo 01</span>
              </div>
              <input type="text" value={f1Title} onChange={(e) => setF1Title(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm font-bold" placeholder="Título" />
              <textarea value={f1Desc} onChange={(e) => setF1Desc(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs resize-none" placeholder="Descripción corta" rows="3"></textarea>
            </div>
            {/* Feature 2 */}
            <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-700/50 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter bg-slate-800 px-2 py-0.5 rounded">Módulo 02</span>
              </div>
              <input type="text" value={f2Title} onChange={(e) => setF2Title(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm font-bold" placeholder="Título" />
              <textarea value={f2Desc} onChange={(e) => setF2Desc(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs resize-none" placeholder="Descripción corta" rows="3"></textarea>
            </div>
            {/* Feature 3 */}
            <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-700/50 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter bg-slate-800 px-2 py-0.5 rounded">Módulo 03</span>
              </div>
              <input type="text" value={f3Title} onChange={(e) => setF3Title(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm font-bold" placeholder="Título" />
              <textarea value={f3Desc} onChange={(e) => setF3Desc(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs resize-none" placeholder="Descripción corta" rows="3"></textarea>
            </div>
          </div>
        </div>

        {/* Sección Cómo Funciona */}
        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 shadow-lg space-y-6">
          <h3 className="text-xl font-semibold text-blue-400 flex items-center gap-2 mb-2">
            <span className="bg-blue-500/10 p-2 rounded-lg text-sm">🛠️</span>
            Sección "Cómo Funciona"
          </h3>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Título de la Sección</label>
            <input type="text" value={hiwTitle} onChange={(e) => setHiwTitle(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-slate-900/30 rounded-2xl border border-slate-700/30 space-y-3">
              <span className="text-[10px] font-black text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-full">PASO 01</span>
              <input type="text" value={s1Title} onChange={(e) => setS1Title(e.target.value)} className="w-full bg-transparent border-b border-slate-700 py-1 text-white font-bold text-sm outline-none focus:border-blue-500 transition-colors" placeholder="Título" />
              <textarea value={s1Desc} onChange={(e) => setS1Desc(e.target.value)} className="w-full bg-transparent p-2 text-slate-400 text-xs resize-none outline-none leading-relaxed" placeholder="Descripción del paso..." rows="3"></textarea>
            </div>
            <div className="p-4 bg-slate-900/30 rounded-2xl border border-slate-700/30 space-y-3">
              <span className="text-[10px] font-black text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-full">PASO 02</span>
              <input type="text" value={s2Title} onChange={(e) => setS2Title(e.target.value)} className="w-full bg-transparent border-b border-slate-700 py-1 text-white font-bold text-sm outline-none focus:border-blue-500 transition-colors" placeholder="Título" />
              <textarea value={s2Desc} onChange={(e) => setS2Desc(e.target.value)} className="w-full bg-transparent p-2 text-slate-400 text-xs resize-none outline-none leading-relaxed" placeholder="Descripción del paso..." rows="3"></textarea>
            </div>
            <div className="p-4 bg-slate-900/30 rounded-2xl border border-slate-700/30 space-y-3">
              <span className="text-[10px] font-black text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-full">PASO 03</span>
              <input type="text" value={s3Title} onChange={(e) => setS3Title(e.target.value)} className="w-full bg-transparent border-b border-slate-700 py-1 text-white font-bold text-sm outline-none focus:border-blue-500 transition-colors" placeholder="Título" />
              <textarea value={s3Desc} onChange={(e) => setS3Desc(e.target.value)} className="w-full bg-transparent p-2 text-slate-400 text-xs resize-none outline-none leading-relaxed" placeholder="Descripción del paso..." rows="3"></textarea>
            </div>
          </div>
        </div>

        {/* Sección CTA Final */}
        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 shadow-lg space-y-6">
          <h3 className="text-xl font-semibold text-blue-400 flex items-center gap-2 mb-2">
            <span className="bg-blue-500/10 p-2 rounded-lg text-sm">🎯</span>
            Llamado a la Acción Final (CTA)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Título del CTA</label>
                <input type="text" value={ctaTitle} onChange={(e) => setCtaTitle(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Texto del Botón Final</label>
                <input type="text" value={ctaBtnText} onChange={(e) => setCtaBtnText(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white" />
              </div>
            </div>
            <div className="space-y-2 flex flex-col">
              <label className="text-sm font-medium text-slate-400">Descripción del CTA</label>
              <textarea value={ctaText} onChange={(e) => setCtaText(e.target.value)} className="flex-1 w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white resize-none" rows="4"></textarea>
            </div>
          </div>
        </div>

        {/* Footer Settings */}
        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 shadow-lg space-y-6">
          <h3 className="text-xl font-semibold text-blue-400 flex items-center gap-2 mb-2">
            <span className="bg-blue-500/10 p-2 rounded-lg text-sm">⚓</span>
            Configuración del Pie de Página (Footer)
          </h3>

          <div className="space-y-2">
            <label htmlFor="footerText" className="text-sm font-medium text-slate-400">Texto Legal / Copyright</label>
            <textarea
              id="footerText"
              rows="2"
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white resize-none"
              required
            ></textarea>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 px-1">LINK 1</label>
              <input type="text" value={footerLink1Text} onChange={(e) => setFooterLink1Text(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 px-1">LINK 2</label>
              <input type="text" value={footerLink2Text} onChange={(e) => setFooterLink2Text(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 px-1">LINK 3</label>
              <input type="text" value={footerLink3Text} onChange={(e) => setFooterLink3Text(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 px-1">LINK 4</label>
              <input type="text" value={footerLink4Text} onChange={(e) => setFooterLink4Text(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs" />
            </div>
          </div>
        </div>

        {/* Sección Airtm Extension */}
        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 shadow-lg space-y-6">
          <h3 className="text-xl font-semibold text-blue-400 flex items-center gap-2 mb-2">
            <span className="bg-blue-500/10 p-2 rounded-lg text-sm">🧩</span>
            Configuración de Extensión Airtm
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="airtmExtensionUrl" className="text-sm font-medium text-slate-400">URL de Descarga de la Extensión</label>
              <input
                type="text"
                id="airtmExtensionUrl"
                value={airtmExtensionUrl}
                onChange={(e) => setAirtmExtensionUrl(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all placeholder:text-slate-600"
                placeholder="https://ejemplo.com/extension.zip"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="airtmExtensionVersion" className="text-sm font-medium text-slate-400">Versión de la Extensión</label>
              <input
                type="text"
                id="airtmExtensionVersion"
                value={airtmExtensionVersion}
                onChange={(e) => setAirtmExtensionVersion(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all placeholder:text-slate-600"
                placeholder="Ej: 1.0.5"
              />
            </div>
          </div>
        </div>

        {/* Sección Funcionalidades */}
        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 shadow-lg space-y-6">
          <h3 className="text-xl font-semibold text-blue-400 flex items-center gap-2 mb-2">
            <span className="bg-blue-500/10 p-2 rounded-lg text-sm">🛠️</span>
            Control de Funcionalidades
          </h3>

          <div className="flex items-center justify-between p-4 bg-slate-900 border border-slate-700 rounded-2xl">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white uppercase tracking-widest">Sección Conexión Exchange</span>
              <span className="text-[10px] text-slate-500 font-medium">Si se desactiva, los usuarios no verán la opción de vincular exchanges.</span>
            </div>
            <button
              type="button"
              onClick={() => setShowExchangeSection(!showExchangeSection)}
              className={`w-14 h-7 rounded-full transition-all relative ${showExchangeSection ? 'bg-blue-600' : 'bg-slate-700'}`}
            >
              <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all shadow-md ${showExchangeSection ? 'left-8' : 'left-1'}`}></div>
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-900 border border-slate-700 rounded-2xl">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white uppercase tracking-widest">Sección Roadmap (Home)</span>
              <span className="text-[10px] text-slate-500 font-medium">Muestra la hoja de ruta del proyecto en la página de inicio.</span>
            </div>
            <button
              type="button"
              onClick={() => setShowRoadmap(!showRoadmap)}
              className={`w-14 h-7 rounded-full transition-all relative ${showRoadmap ? 'bg-blue-600' : 'bg-slate-700'}`}
            >
              <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all shadow-md ${showRoadmap ? 'left-8' : 'left-1'}`}></div>
            </button>
          </div>
        </div>

        {/* Botón Guardar Flotante / Final */}
        <div className="sticky bottom-6 flex justify-center pt-4">
          <button
            type="submit"
            className="w-full md:w-2/3 bg-blue-600 hover:bg-blue-500 text-white font-black py-5 px-10 rounded-2xl shadow-2xl shadow-blue-900/40 transition-all flex items-center justify-center gap-3 text-xl uppercase tracking-widest disabled:opacity-50"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Sincronizando...
              </>
            ) : (
              <>💾 Aplicar Cambios Globales</>
            )}
          </button>
        </div>
      </form>

      {/* Herramientas de Administración Peligrosas */}
      <div className="mt-12 pt-8 border-t border-red-900/30">
        <h3 className="text-xl font-bold text-red-500 mb-6 flex items-center gap-2">
          <span className="bg-red-500/10 p-2 rounded-lg text-sm">⚠️</span>
          Zona de Peligro
        </h3>
        <div className="bg-red-900/5 border border-red-900/20 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-sm text-slate-400 text-center md:text-left">
            <strong className="text-red-400 block mb-1">Reiniciar Estadísticas de Rendimiento</strong>
            Esto borrará los datos históricos acumulados para el gráfico de operaciones. Esta acción es irreversible.
          </div>
          <button
            onClick={handleResetPerformanceStats}
            className="whitespace-nowrap bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-600/30 px-8 py-4 rounded-xl font-bold transition-all text-sm"
            disabled={loading}
          >
            💀 Reiniciar Todo el Historial
          </button>
        </div>
      </div>
    </div>
  );
};

export default SiteSettingsContent;
