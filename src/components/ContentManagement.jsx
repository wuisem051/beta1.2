import React, { useState, useEffect, useContext } from 'react'; // Importar useContext
import { db } from '../services/firebase';
import { doc, getDocs, setDoc, query, collection, where } from 'firebase/firestore';
import { ThemeContext } from '../context/ThemeContext'; // Importar ThemeContext
import { useError } from '../context/ErrorContext'; // Importar useError
import TextArea from './common/TextArea'; // Importar el componente TextArea
import Button from './common/Button'; // Importar el componente Button

const ContentManagement = () => {
  const { darkMode } = useContext(ThemeContext); // Usar ThemeContext
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
    <div className={`p-6 min-h-screen ${darkMode ? 'bg-dark_bg text-light_text' : 'bg-gray-900 text-white'}`}>
      <h1 className={`text-3xl font-bold mb-6 ${darkMode ? 'text-light_text' : 'text-white'}`}>Gestión de Contenido</h1>
      {message && <div className="bg-green-500 text-white p-3 rounded mb-4">{message}</div>}
      {error && <div className="bg-red-500 text-white p-3 rounded mb-4">{error}</div>}

      <div className={`${darkMode ? 'bg-dark_card border-dark_border' : 'bg-gray-800'} p-6 rounded-lg shadow-md border`}>
        <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-light_text' : 'text-white'}`}>Gestión de Contenido</h2>
        
        <TextArea
          id="aboutContent"
          label="Sección 'Acerca de'"
          value={aboutContent}
          onChange={(e) => setAboutContent(e.target.value)}
          placeholder="Escribe aquí el contenido de la sección 'Acerca de'..."
        />

        <TextArea
          id="termsContent"
          label="Términos y Condiciones"
          value={termsContent}
          onChange={(e) => setTermsContent(e.target.value)}
          placeholder="Términos y condiciones del servicio..."
        />

        <TextArea
          id="privacyContent"
          label="Política de Privacidad"
          value={privacyContent}
          onChange={(e) => setPrivacyContent(e.target.value)}
          placeholder="Política de privacidad..."
        />

        <Button
          onClick={handleSaveContent}
          className="w-full"
        >
          Guardar Contenido
        </Button>
      </div>
    </div>
  );
};

export default ContentManagement;
