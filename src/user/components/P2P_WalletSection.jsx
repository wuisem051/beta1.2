import React, { useState, useEffect, useContext } from 'react';
import { doc, onSnapshot, getFirestore } from 'firebase/firestore'; // Importar Firestore
import WalletDisplay from './WalletDisplay';
import P2P_Marketplace from './P2P_Marketplace';
import { useAuth } from '../../context/AuthContext';
import { ThemeContext } from '../../context/ThemeContext';

const P2P_WalletSection = () => {
  const { currentUser } = useAuth();
  const { theme } = useContext(ThemeContext);
  const [userBalances, setUserBalances] = useState({
    balanceUSD: 0,
    balanceBTC: 0,
    balanceLTC: 0,
    balanceDOGE: 0,
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
          });
        } else {
          // Si el documento no existe, establecer balances a 0
          setUserBalances({
            balanceUSD: 0,
            balanceBTC: 0,
            balanceLTC: 0,
            balanceDOGE: 0,
          });
        }
      }, (error) => {
        console.error("Error al obtener balances de usuario en P2P_WalletSection:", error);
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

  if (!currentUser) {
    return (
      <div className={`p-6 rounded-lg shadow-xl max-w-4xl mx-auto my-8 ${theme.backgroundAlt} ${theme.text}`}>
        <p className="text-center text-red-500">Por favor, inicia sesión para acceder a la sección P2P y tu billetera.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <WalletDisplay currentUser={currentUser} />
      {/* Pasar userBalances como prop al P2P_Marketplace */}
      <P2P_Marketplace userBalances={userBalances} />
    </div>
  );
};

export default P2P_WalletSection;
