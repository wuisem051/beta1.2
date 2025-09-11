import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // Importar Link
import { db } from '../../services/firebase';
import { doc, getDoc } from 'firebase/firestore'; // Importar doc y getDoc
const Footer = () => {
  const [footerText, setFooterText] = useState('');

  useEffect(() => {
    const fetchFooterText = async () => {
      try {
        const docRef = doc(db, 'settings', 'siteConfig'); // Referencia al documento siteConfig
        const docSnap = await getDoc(docRef); // Obtener el documento

        if (docSnap.exists()) {
          const data = docSnap.data();
          setFooterText(data.footerText || `© ${new Date().getFullYear()} BitcoinPool. Todos los derechos reservados. Versión del proyecto 1.0 Beta`);
        } else {
          setFooterText(`© ${new Date().getFullYear()} BitcoinPool. Todos los derechos reservados. Versión del proyecto 1.0 Beta`);
        }
      } catch (err) {
        console.error("Error fetching footer text from Firebase:", err);
        setFooterText(`© ${new Date().getFullYear()} BitcoinPool. Todos los derechos reservados. Versión del proyecto 1.0 Beta`); // Fallback en caso de error
      }
    };
    fetchFooterText();
  }, []);

  return (
    <footer className="bg-light_card border-t border-gray_border">
      <div className="container mx-auto py-6 px-4 text-center text-gray_text">
        <p>{footerText} <Link to="/admin-login" className="text-gray_text">dev</Link></p>
      </div>
    </footer>
  );
};

export default Footer;
