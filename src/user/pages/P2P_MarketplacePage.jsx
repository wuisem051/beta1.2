import React, { useState, useEffect, useContext } from 'react';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { ThemeContext } from '../../context/ThemeContext';
import P2P_Marketplace from '../components/P2P_Marketplace';

const P2P_MarketplacePage = () => {
  const { currentUser } = useAuth();
  const { theme } = useContext(ThemeContext);
  const [userBalances, setUserBalances] = useState({
    balanceUSD: 0,
    balanceBTC: 0,
    balanceLTC: 0,
    balanceDOGE: 0,
    balanceUSDT: 0, // Añadir USDT
    balanceVES: 0, // Añadir VES
  });
  const db = getFirestore();

  useEffect(() => {
    if (currentUser?.uid) {
      const userDocRef = doc(db, `users/${currentUser.uid}`);
      const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const userData = docSnap.data();
          setUserBalances({
            balanceUSD: userData.balanceUSD || 0,
            balanceBTC: userData.balanceBTC || 0,
            balanceLTC: userData.balanceLTC || 0,
            balanceDOGE: userData.balanceDOGE || 0,
            balanceUSDT: userData.balanceUSDT || 0, // Incluir USDT
            balanceVES: userData.balanceVES || 0, // Incluir VES
          });
        } else {
          setUserBalances({
            balanceUSD: 0,
            balanceBTC: 0,
            balanceLTC: 0,
            balanceDOGE: 0,
            balanceUSDT: 0, // Incluir USDT
            balanceVES: 0, // Incluir VES
          });
        }
      }, (error) => {
        console.error("Error al obtener balances de usuario en P2P_MarketplacePage:", error);
      });
      return () => unsubscribe();
    } else {
      setUserBalances({
        balanceUSD: 0,
        balanceBTC: 0,
        balanceLTC: 0,
        balanceDOGE: 0,
      });
    }
  }, [currentUser, db]);

  return (
    <div className="space-y-8">
      <P2P_Marketplace userBalances={userBalances} />
    </div>
  );
};

export default P2P_MarketplacePage;
