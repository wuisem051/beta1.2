import React, { useState, useEffect, useContext } from 'react'; // Importar useContext
import { Link } from 'react-router-dom';
import { db } from '../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ThemeContext } from '../../context/ThemeContext'; // Importar ThemeContext
const Footer = () => {
  const [footerText, setFooterText] = useState('');

  useEffect(() => {
    const fetchFooterText = async () => {
      try {
        const docRef = doc(db, 'settings', 'siteConfig'); // Referencia al documento siteConfig
        const docSnap = await getDoc(docRef); // Obtener el documento

        if (docSnap.exists()) {
          const data = docSnap.data();
          setFooterText(data.footerText || `© ${new Date().getFullYear()} MaxiOS Pool. Todos los derechos reservados. Versión del proyecto 1.0 Beta`);
        } else {
          setFooterText(`© ${new Date().getFullYear()} MaxiOS Pool. Todos los derechos reservados. Versión del proyecto 1.0 Beta`);
        }
      } catch (err) {
        console.error("Error fetching footer text from Firebase:", err);
        setFooterText(`© ${new Date().getFullYear()} MaxiOS Pool. Todos los derechos reservados. Versión del proyecto 1.0 Beta`); // Fallback en caso de error
      }
    };
    fetchFooterText();
  }, []);

  const { theme } = useContext(ThemeContext); // Usar ThemeContext

  return (
    <footer className={`border-t ${theme.borderColor}`} style={{ backgroundColor: 'var(--bg-main)' }}> {/* Aplicar clases de tema y fondo dinámico */}
      <div className={`container mx-auto py-6 px-4 text-center ${theme.textSoft}`}> {/* Aplicar clases de tema */}
        <div className="flex justify-center mb-4">
          <img src="/logo.png" alt="MaxiOS Logo" className="w-12 h-12 object-contain opacity-80 hover:opacity-100 transition-opacity" />
        </div>
        <p>{footerText}</p> {/* Aplicar clases de tema */}
      </div>
    </footer>
  );
};

export default Footer;
