import React from 'react';
import WalletDisplay from './WalletDisplay';
import P2P_Marketplace from './P2P_Marketplace';
import { useAuth } from '../../context/AuthContext';
import { useContext } from 'react';
import { ThemeContext } from '../../context/ThemeContext';

const P2P_WalletSection = () => {
  const { currentUser } = useAuth();
  const { theme } = useContext(ThemeContext);

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
      <P2P_Marketplace />
    </div>
  );
};

export default P2P_WalletSection;
