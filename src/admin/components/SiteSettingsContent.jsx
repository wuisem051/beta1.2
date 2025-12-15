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
  const [siteDomain, setSiteDomain] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [faviconFile, setFaviconFile] = useState(null); // Mantener para la UI, pero no se usará para subir directamente
  const [footerText, setFooterText] = useState('');
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
          setSiteDomain(data.siteDomain || '');
          setFaviconUrl(data.faviconUrl || '');
          setFooterText(data.footerText || '');
        } else {
          // Si no existe, crear con valores por defecto
          try {
            await setDoc(docRef, {
              siteName: 'BitcoinPool',
              homeText: 'Minando el futuro, un bloque a la vez.',
              heroTitle: 'Bienvenido a nuestra Pool de Minería Bitcoin',
              performanceStatsResetDate: null,
              siteDomain: '',
              faviconUrl: '',
              footerText: `© ${new Date().getFullYear()} BitcoinPool. Todos los derechos reservados. Versión del proyecto 1.0 Beta`,
            });
            setSiteName('BitcoinPool');
            setHomeText('Minando el futuro, un bloque a la vez.');
            setHeroTitle('Bienvenido a nuestra Pool de Minería Bitcoin');
            setSiteDomain('');
            setFaviconUrl('');
            setFooterText(`© ${new Date().getFullYear()} BitcoinPool. Todos los derechos reservados. Versión del proyecto 1.0 Beta`);
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
        siteDomain: siteDomain,
        faviconUrl: updatedFaviconUrl,
        footerText: footerText,
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
