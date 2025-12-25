import React, { useState, useEffect, useContext } from 'react';
import { db } from '../../services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { ThemeContext } from '../../context/ThemeContext';
import styles from './AdBanner.module.css';

const AdBanner = () => {
  const [adCode, setAdCode] = useState('');
  const { darkMode } = useContext(ThemeContext);

  useEffect(() => {
    const docRef = doc(db, 'settings', 'adConfig'); // Usar un documento separado para el anuncio
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAdCode(data.adBannerCode || '');
      } else {
        setAdCode('');
      }
    }, (error) => {
      console.error("Error fetching ad banner code from Firebase:", error);
    });

    return () => unsubscribe();
  }, []);

  if (!adCode) {
    return null; // No renderizar si no hay código de anuncio
  }

  return (
    <div className={`${styles.adBannerContainer} ${darkMode ? styles.dark : styles.light}`}>
      <div
        className={styles.adContent}
        dangerouslySetInnerHTML={{ __html: adCode }}
      />
    </div>
  );
};

export default AdBanner;
