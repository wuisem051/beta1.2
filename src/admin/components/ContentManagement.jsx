import React, { useState, useEffect } from 'react'; // Importar React y hooks necesarios
import { db } from '../../services/firebase';
import { doc, getDocs, setDoc, query, collection, where } from 'firebase/firestore';
import { ThemeContext } from '../../context/ThemeContext'; // Importar ThemeContext
import { useError } from '../../context/ErrorContext'; // Importar useError

const ContentManagement = () => {
  const { showError, showSuccess, error } = useError(); // Usar el contexto de errores
  const [aboutContent, setAboutContent] = useState('');
  const [termsContent, setTermsContent] = useState('');
  const [privacyContent, setPrivacyContent] = useState('');
  const [message, setMessage] = useState(''); // Declarar el estado message

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const q = query(collection(db, 'settings'), where('key', '==', 'content'));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const record = querySnapshot.docs[0].data();
          setAboutContent(record.about || '');
          setTermsContent(record.terms || '');
          setPrivacyContent(record.privacy || '');
        }
      } catch (err) {
        console.error("Error fetching content from Firebase:", err);
        showError('Error al cargar el contenido.');
      }
    };
    fetchContent();
  }, [showError]);

  const handleSaveContent = async () => {
    setMessage('');
    showError(null); // Limpiar errores
    try {
      const contentData = {
        key: 'content',
        about: aboutContent,
        terms: termsContent,
        privacy: privacyContent,
        updatedAt: new Date(),
      };

      const q = query(collection(db, 'settings'), where('key', '==', 'content'));
      const querySnapshot = await getDocs(q);
      let docId;

      if (!querySnapshot.empty) {
        docId = querySnapshot.docs[0].id;
      } else {
        // Si no existe, Firebase creará un ID automáticamente con setDoc si no se especifica
        // Para mantener la consistencia, podemos usar un ID fijo o dejar que Firebase lo genere.
        // Aquí, asumimos que 'content' es un documento único y podemos usar un ID fijo si lo deseamos,
        // o simplemente dejar que setDoc lo cree si no existe.
        // Para este caso, buscaremos el documento y si no existe, lo crearemos con un ID específico 'content_settings'
        // o simplemente lo actualizaremos si ya existe.
        // Usaremos 'content_settings' como ID fijo para el documento de configuración de contenido.
        docId = 'content_settings';
      }

      await setDoc(doc(db, 'settings', docId), contentData, { merge: true });
      showSuccess('Contenido guardado exitosamente.');
    } catch (err) {
      console.error("Error saving content to Firebase:", err);
      showError(`Error al guardar el contenido: ${err.message}`);
    }
  };

  return (
    <div className="p-6 rounded-2xl shadow-xl space-y-8" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>
      <div className="flex justify-between items-center border-b border-slate-700 pb-4">
        <h2 className="text-3xl font-bold text-white flex items-center gap-2">
          <span className="bg-blue-500/10 p-2 rounded-lg text-lg">📝</span>
          Gestión de Contenido
        </h2>
      </div>

      <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700 shadow-lg space-y-8">
        <div className="grid grid-cols-1 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="bg-blue-500/10 p-2 rounded-lg text-sm">ℹ️</span>
              <label htmlFor="aboutContent" className="text-sm font-bold text-slate-300 uppercase tracking-wider">Sección "Acerca de"</label>
            </div>
            <textarea
              id="aboutContent"
              rows="6"
              className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-5 py-4 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all placeholder:text-slate-600 resize-none leading-relaxed"
              value={aboutContent}
              onChange={(e) => setAboutContent(e.target.value)}
              placeholder="Escribe la historia o información general de la plataforma..."
            ></textarea>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="bg-blue-500/10 p-2 rounded-lg text-sm">⚖️</span>
              <label htmlFor="termsContent" className="text-sm font-bold text-slate-300 uppercase tracking-wider">Términos y Condiciones</label>
            </div>
            <textarea
              id="termsContent"
              rows="6"
              className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-5 py-4 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all placeholder:text-slate-600 resize-none leading-relaxed"
              value={termsContent}
              onChange={(e) => setTermsContent(e.target.value)}
              placeholder="Define los términos legales del servicio..."
            ></textarea>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="bg-blue-500/10 p-2 rounded-lg text-sm">🛡️</span>
              <label htmlFor="privacyContent" className="text-sm font-bold text-slate-300 uppercase tracking-wider">Política de Privacidad</label>
            </div>
            <textarea
              id="privacyContent"
              rows="6"
              className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-5 py-4 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all placeholder:text-slate-600 resize-none leading-relaxed"
              value={privacyContent}
              onChange={(e) => setPrivacyContent(e.target.value)}
              placeholder="Detalla cómo manejas los datos de los usuarios..."
            ></textarea>
          </div>
        </div>

        <button
          onClick={handleSaveContent}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-8 rounded-2xl shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-3 text-lg"
        >
          💾 Guardar Todo el Contenido
        </button>
      </div>
    </div>
  );
};

export default ContentManagement;
