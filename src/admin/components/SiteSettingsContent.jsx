import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase'; // Importar la instancia de Firebase Firestore
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useTheme } from '../../context/ThemeContext';
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
              ctaText: 'Únete a la plataforma de Copy Trading más avanzada y transparente del mercado.'
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
        ctaTitle, ctaText
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

  const { theme } = useTheme();

  return (
    <div className={`${theme.background} ${theme.text} p-6 rounded-lg shadow-md`}>
      <h2 className="text-2xl font-bold mb-6">Configuración del Sitio</h2>

      {loading && <p className={`${theme.textSoft} mb-4`}>Cargando configuración...</p>}
      {error && <div className="bg-red-500 text-white p-3 rounded mb-4">{error}</div>}
      {message && <div className="bg-green-500 text-white p-3 rounded mb-4">{message}</div>}

      <form onSubmit={handleSaveSettings} className="space-y-6">
        <div>
          <label htmlFor="siteName" className={`block ${theme.textSoft} text-sm font-medium mb-2`}>Nombre del Sitio</label>
          <input
            type="text"
            id="siteName"
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            className={`w-full p-3 ${theme.inputBackground} ${theme.borderColor} rounded-md ${theme.text} text-base focus:outline-none focus:border-yellow-500`}
            placeholder="Ej: Mi Plataforma de Minería"
            required
          />
        </div>
        <div>
          <label htmlFor="heroTitle" className={`block ${theme.textSoft} text-sm font-medium mb-2`}>Título Principal (Hero)</label>
          <input
            type="text"
            id="heroTitle"
            value={heroTitle}
            onChange={(e) => setHeroTitle(e.target.value)}
            className={`w-full p-3 ${theme.inputBackground} ${theme.borderColor} rounded-md ${theme.text} text-base focus:outline-none focus:border-yellow-500`}
            placeholder="Ej: Bienvenido a nuestra Pool de Minería Bitcoin"
            required
          />
        </div>
        <div>
          <label htmlFor="homeText" className={`block ${theme.textSoft} text-sm font-medium mb-2`}>Texto de la Página de Inicio (Home)</label>
          <textarea
            id="homeText"
            rows="4"
            value={homeText}
            onChange={(e) => setHomeText(e.target.value)}
            className={`w-full p-3 ${theme.inputBackground} ${theme.borderColor} rounded-md ${theme.text} text-base focus:outline-none focus:border-yellow-500`}
            placeholder="Ej: Minando el futuro, un bloque a la vez."
            required
          ></textarea>
        </div>

        <div className="pt-6 border-t border-gray-700">
          <h3 className="text-lg font-bold mb-4 text-accent">Sección Hero & Badge</h3>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className={`block ${theme.textSoft} text-xs font-bold mb-2 uppercase`}>Hero Badge (Texto pequeño superior)</label>
              <input type="text" value={heroBadge} onChange={(e) => setHeroBadge(e.target.value)} className={`w-full p-3 ${theme.inputBackground} ${theme.borderColor} rounded-md ${theme.text} text-base focus:outline-none focus:border-yellow-500`} placeholder="Ej: Trading de Nueva Generación" />
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-gray-700">
          <h3 className="text-lg font-bold mb-4 text-accent">Sección Características (Features)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-bold text-sm underline">Feature 1</h4>
              <input type="text" value={f1Title} onChange={(e) => setF1Title(e.target.value)} className={`w-full p-2 ${theme.inputBackground} ${theme.borderColor} rounded-md ${theme.text} text-sm`} placeholder="Título" />
              <textarea value={f1Desc} onChange={(e) => setF1Desc(e.target.value)} className={`w-full p-2 ${theme.inputBackground} ${theme.borderColor} rounded-md ${theme.text} text-sm`} placeholder="Descripción" rows="2"></textarea>
            </div>
            <div className="space-y-4">
              <h4 className="font-bold text-sm underline">Feature 2</h4>
              <input type="text" value={f2Title} onChange={(e) => setF2Title(e.target.value)} className={`w-full p-2 ${theme.inputBackground} ${theme.borderColor} rounded-md ${theme.text} text-sm`} placeholder="Título" />
              <textarea value={f2Desc} onChange={(e) => setF2Desc(e.target.value)} className={`w-full p-2 ${theme.inputBackground} ${theme.borderColor} rounded-md ${theme.text} text-sm`} placeholder="Descripción" rows="2"></textarea>
            </div>
            <div className="space-y-4">
              <h4 className="font-bold text-sm underline">Feature 3</h4>
              <input type="text" value={f3Title} onChange={(e) => setF3Title(e.target.value)} className={`w-full p-2 ${theme.inputBackground} ${theme.borderColor} rounded-md ${theme.text} text-sm`} placeholder="Título" />
              <textarea value={f3Desc} onChange={(e) => setF3Desc(e.target.value)} className={`w-full p-2 ${theme.inputBackground} ${theme.borderColor} rounded-md ${theme.text} text-sm`} placeholder="Descripción" rows="2"></textarea>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-gray-700">
          <h3 className="text-lg font-bold mb-4 text-accent">Sección Cómo Funciona</h3>
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className={`block ${theme.textSoft} text-xs font-bold mb-2 uppercase`}>Título de la Sección</label>
              <input type="text" value={hiwTitle} onChange={(e) => setHiwTitle(e.target.value)} className={`w-full p-3 ${theme.inputBackground} ${theme.borderColor} rounded-md ${theme.text} text-base focus:outline-none focus:border-yellow-500`} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <h4 className="font-bold text-xs uppercase opacity-60">Paso 01</h4>
                <input type="text" value={s1Title} onChange={(e) => setS1Title(e.target.value)} className={`w-full p-2 rounded bg-opacity-10 bg-white border border-white/10 ${theme.text} text-sm`} placeholder="Título" />
                <textarea value={s1Desc} onChange={(e) => setS1Desc(e.target.value)} className={`w-full p-2 rounded bg-opacity-10 bg-white border border-white/10 ${theme.text} text-xs`} placeholder="Descripción" rows="2"></textarea>
              </div>
              <div className="space-y-2">
                <h4 className="font-bold text-xs uppercase opacity-60">Paso 02</h4>
                <input type="text" value={s2Title} onChange={(e) => setS2Title(e.target.value)} className={`w-full p-2 rounded bg-opacity-10 bg-white border border-white/10 ${theme.text} text-sm`} placeholder="Título" />
                <textarea value={s2Desc} onChange={(e) => setS2Desc(e.target.value)} className={`w-full p-2 rounded bg-opacity-10 bg-white border border-white/10 ${theme.text} text-xs`} placeholder="Descripción" rows="2"></textarea>
              </div>
              <div className="space-y-2">
                <h4 className="font-bold text-xs uppercase opacity-60">Paso 03</h4>
                <input type="text" value={s3Title} onChange={(e) => setS3Title(e.target.value)} className={`w-full p-2 rounded bg-opacity-10 bg-white border border-white/10 ${theme.text} text-sm`} placeholder="Título" />
                <textarea value={s3Desc} onChange={(e) => setS3Desc(e.target.value)} className={`w-full p-2 rounded bg-opacity-10 bg-white border border-white/10 ${theme.text} text-xs`} placeholder="Descripción" rows="2"></textarea>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-gray-700">
          <h3 className="text-lg font-bold mb-4 text-accent">Sección CTA Final</h3>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className={`block ${theme.textSoft} text-xs font-bold mb-2 uppercase`}>Título Invitación</label>
              <input type="text" value={ctaTitle} onChange={(e) => setCtaTitle(e.target.value)} className={`w-full p-3 ${theme.inputBackground} ${theme.borderColor} rounded-md ${theme.text} text-base focus:outline-none focus:border-yellow-500`} />
            </div>
            <div>
              <label className={`block ${theme.textSoft} text-xs font-bold mb-2 uppercase`}>Texto Invitación</label>
              <textarea value={ctaText} onChange={(e) => setCtaText(e.target.value)} className={`w-full p-3 ${theme.inputBackground} ${theme.borderColor} rounded-md ${theme.text} text-base focus:outline-none focus:border-yellow-500`} rows="3"></textarea>
            </div>
          </div>
        </div>
        <div>
          <label htmlFor="siteDomain" className={`block ${theme.textSoft} text-sm font-medium mb-2`}>Dominio del Sitio Web</label>
          <input
            type="text"
            id="siteDomain"
            value={siteDomain}
            onChange={(e) => setSiteDomain(e.target.value)}
            className={`w-full p-3 ${theme.inputBackground} ${theme.borderColor} rounded-md ${theme.text} text-base focus:outline-none focus:border-yellow-500`}
            placeholder="Ej: www.tusitio.com"
          />
        </div>
        <div>
          <label htmlFor="faviconUrl" className={`block ${theme.textSoft} text-sm font-medium mb-2`}>URL del Favicon</label>
          <input
            type="text"
            id="faviconUrl"
            value={faviconUrl}
            onChange={(e) => setFaviconUrl(e.target.value)}
            className={`w-full p-3 ${theme.inputBackground} ${theme.borderColor} rounded-md ${theme.text} text-base focus:outline-none focus:border-yellow-500`}
            placeholder="Ej: https://tusitio.com/favicon.ico"
          />
          {faviconUrl && (
            <p className={`${theme.textSoft} text-sm mt-2`}>Favicon actual: <a href={faviconUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Ver Favicon</a></p>
          )}
          <label htmlFor="faviconUpload" className={`block ${theme.textSoft} text-sm font-medium mb-2 mt-4`}>Subir Favicon (.ico, .png) - (Funcionalidad de subida directa no disponible en esta migración)</label>
          <input
            type="file"
            id="faviconUpload"
            accept=".ico,.png"
            onChange={handleFileChange}
            className={`w-full p-3 ${theme.inputBackground} ${theme.borderColor} rounded-md ${theme.text} text-base focus:outline-none focus:border-yellow-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-yellow-50 file:text-yellow-700 hover:file:bg-yellow-100`}
            disabled // Deshabilitar la subida directa de archivos
          />
        </div>
        <div>
          <label htmlFor="footerText" className={`block ${theme.textSoft} text-sm font-medium mb-2`}>Texto del Pie de Página (Footer)</label>
          <textarea
            id="footerText"
            rows="3"
            value={footerText}
            onChange={(e) => setFooterText(e.target.value)}
            className={`w-full p-3 ${theme.inputBackground} ${theme.borderColor} rounded-md ${theme.text} text-base focus:outline-none focus:border-yellow-500`}
            placeholder="Ej: © 2023 Mi Sitio. Todos los derechos reservados."
            required
          ></textarea>
        </div>
        <button
          type="submit"
          className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-4 rounded-md focus:outline-none focus:shadow-outline transition duration-200"
          disabled={loading}
        >
          {loading ? 'Guardando...' : 'Guardar Configuración'}
        </button>
      </form>

      <div className={`mt-8 pt-6 border-t ${theme.borderColor}`}>
        <h3 className="text-xl font-bold mb-4">Herramientas de Administración</h3>
        <button
          onClick={handleResetPerformanceStats}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-md focus:outline-none focus:shadow-outline transition duration-200"
          disabled={loading}
        >
          Reiniciar Estadísticas de Rendimiento
        </button>
      </div>
    </div>
  );
};

export default SiteSettingsContent;
