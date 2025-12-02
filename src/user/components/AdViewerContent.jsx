import React, { useState, useEffect, useContext, useCallback } from 'react';
import { ThemeContext } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useError } from '../../context/ErrorContext';
import { db } from '../../services/firebase';
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import styles from './AdViewerContent.module.css';

const AdViewerContent = () => {
  const { darkMode } = useContext(ThemeContext);
  const { currentUser } = useAuth();
  const { showError, showSuccess } = useError();

  const [ads, setAds] = useState([]);
  const [userWatchedAds, setUserWatchedAds] = useState({}); // {adId: timestamp}
  const [activeAd, setActiveAd] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const ADS_COLLECTION = 'ads';
  const USERS_COLLECTION = 'users';
  const VIEW_HISTORY_COLLECTION = 'adViewHistory';

  // Fetch Ads and User's Ad View History
  useEffect(() => {
    if (!currentUser?.uid) {
      setAds([]);
      setUserWatchedAds({});
      return;
    }

    setIsLoading(true);

    // Fetch available ads
    const unsubscribeAds = onSnapshot(collection(db, ADS_COLLECTION), (snapshot) => {
      const fetchedAds = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAds(fetchedAds);
    }, (error) => {
      console.error("Error fetching ads:", error);
      showError('Error al cargar los anuncios disponibles.');
    });

    // Fetch user's ad view history for today
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    const q = query(
      collection(db, VIEW_HISTORY_COLLECTION),
      where('userId', '==', currentUser.uid),
      where('viewedAt', '>=', today)
    );

    const unsubscribeHistory = onSnapshot(q, (snapshot) => {
      const watched = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        watched[data.adId] = data.viewedAt.toDate(); // Store timestamp
      });
      setUserWatchedAds(watched);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching user ad history:", error);
      showError('Error al cargar el historial de anuncios vistos.');
      setIsLoading(false);
    });

    return () => {
      unsubscribeAds();
      unsubscribeHistory();
    };
  }, [currentUser, showError]);

  // Timer logic for active ad
  useEffect(() => {
    let timer;
    if (timerRunning && timeLeft > 0) {
      timer = setTimeout(() => {
        setTimeLeft(prevTime => prevTime - 1);
      }, 1000);
    } else if (timerRunning && timeLeft === 0) {
      setTimerRunning(false);
      if (activeAd) {
        creditUserReward(activeAd);
      }
    }
    return () => clearTimeout(timer);
  }, [timeLeft, timerRunning, activeAd]);

  const hasWatchedToday = useCallback((adId) => {
    const lastViewed = userWatchedAds[adId];
    if (!lastViewed) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return lastViewed >= today;
  }, [userWatchedAds]);

  const startAdViewing = (ad) => {
    if (!currentUser) {
      showError('Debes iniciar sesión para ver anuncios.');
      return;
    }
    if (hasWatchedToday(ad.id)) {
      showError('Ya has visto este anuncio hoy. Vuelve mañana para ganar más.');
      return;
    }

    setActiveAd(ad);
    setTimeLeft(ad.durationSeconds || 5); // Default to 5 seconds if not set
    setTimerRunning(true);

    if (ad.type === 'direct_link' && ad.url) {
      window.open(ad.url, '_blank', 'noopener,noreferrer');
    }
  };

  const creditUserReward = async (ad) => {
    if (!currentUser?.uid) return;

    try {
      const userRef = doc(db, USERS_COLLECTION, currentUser.uid);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data();

      const currentBalanceUSD = userData.balanceUSD || 0;
      const newBalanceUSD = currentBalanceUSD + (ad.rewardUSD || 0);

      await updateDoc(userRef, {
        balanceUSD: newBalanceUSD,
      });

      // Record in ad view history
      await addDoc(collection(db, VIEW_HISTORY_COLLECTION), {
        userId: currentUser.uid,
        adId: ad.id,
        reward: ad.rewardUSD || 0,
        viewedAt: serverTimestamp(),
      });

      showSuccess(`¡Ganaste $${(ad.rewardUSD || 0).toFixed(2)} por ver este anuncio!`);
      setActiveAd(null); // Clear active ad after reward
      // Force refresh of userWatchedAds by triggering useEffect dependency
      setUserWatchedAds(prev => ({ ...prev, [ad.id]: new Date() }));

    } catch (error) {
      console.error("Error crediting user reward:", error);
      showError('Fallo al acreditar la recompensa.');
    }
  };

  if (isLoading) {
    return (
      <div className={`${styles.adViewerContainer} ${darkMode ? styles.dark : styles.light}`}>
        <p>Cargando anuncios y tu historial...</p>
      </div>
    );
  }

  return (
    <div className={`${styles.adViewerContainer} ${darkMode ? styles.dark : styles.light}`}>
      <h1 className={styles.pageTitle}>Ver Anuncios</h1>
      <p className={styles.description}>
        ¡Gana recompensas viendo anuncios! Cada anuncio tiene un tiempo de visualización y una recompensa.
        Puedes ver cada anuncio una vez al día.
      </p>

      {activeAd ? (
        <div className={`${styles.activeAdSection} ${darkMode ? styles.darkCard : styles.lightCard}`}>
          <h2>Viendo Anuncio: {activeAd.name}</h2>
          <p>Recompensa: <b>${(activeAd.rewardUSD || 0).toFixed(2)}</b></p>
          {activeAd.type === 'banner' && activeAd.imageUrl && (
            <a href={activeAd.url} target="_blank" rel="noopener noreferrer">
              <img src={activeAd.imageUrl} alt={activeAd.name} className={styles.adBanner} />
            </a>
          )}
          <p className={styles.warningText}>Por favor, mantén esta ventana abierta y concéntrate en el anuncio.</p>
          <p>Tiempo restante: <b>{timeLeft}</b> segundos</p>
          {timeLeft === 0 && <p>¡Anuncio completado! Recompensa acreditada.</p>}
        </div>
      ) : (
        <div className={styles.adList}>
          {ads.length === 0 ? (
            <p className={styles.description}>No hay anuncios disponibles en este momento. Vuelve más tarde.</p>
          ) : (
            ads.map((ad) => (
              <div key={ad.id} className={`${styles.adCard} ${darkMode ? styles.darkCard : styles.lightCard}`}>
                <h3>{ad.name}</h3>
                {ad.type === 'banner' && ad.imageUrl && (
                  <img src={ad.imageUrl} alt={ad.name} className={styles.adListBanner} />
                )}
                <p>{ad.description}</p>
                <p>Tipo: <b>{ad.type === 'direct_link' ? 'Enlace Directo' : 'Banner'}</b></p>
                <p>Duración: <b>{ad.durationSeconds || 5} segundos</b></p>
                <p>Recompensa: <b>${(ad.rewardUSD || 0).toFixed(2)}</b></p>
                <button
                  onClick={() => startAdViewing(ad)}
                  className={styles.viewAdButton}
                  disabled={timerRunning || hasWatchedToday(ad.id)}
                >
                  {hasWatchedToday(ad.id) ? 'Visto hoy' : (timerRunning ? 'Viendo otro...' : 'Ver Anuncio')}
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default AdViewerContent;
