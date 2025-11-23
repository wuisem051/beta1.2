import React, { useState, useEffect, useContext } from 'react';
import { doc, onSnapshot, getFirestore, setDoc } from 'firebase/firestore';
import { ThemeContext } from '../../context/ThemeContext'; // Importar ThemeContext

const WalletDisplay = ({ currentUser }) => {
  const { theme, darkMode } = useContext(ThemeContext);
  const [userPortfolio, setUserPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const db = getFirestore();

  useEffect(() => {
    if (currentUser?.uid) {
          setLoading(true);
          const portfolioRef = doc(db, `users/${currentUser.uid}/portfolios/default`);
          const unsubscribe = onSnapshot(portfolioRef, async (docSnap) => { // Añadir 'async' aquí
            if (docSnap.exists()) {
              setUserPortfolio(docSnap.data());
            } else {
              console.log("No se encontró el portfolio del usuario. Inicializando uno por defecto.");
              // Inicializar un portfolio por defecto si no existe
              const defaultPortfolio = {
                virtualBalance: 0,
                holdings: {},
                updatedAt: new Date(),
              };
              try {
                await setDoc(portfolioRef, defaultPortfolio);
                setUserPortfolio(defaultPortfolio); // Establecer el portfolio por defecto
                console.log("Portfolio por defecto creado exitosamente.");
              } catch (setDocError) {
                console.error("Error al crear el portfolio por defecto:", setDocError);
                setError("Error al inicializar el saldo de la wallet.");
              }
            }
            setLoading(false);
          }, (err) => {
            console.error("Error al obtener el portfolio en tiempo real:", err);
            setError("Error al cargar el saldo de la wallet.");
            setLoading(false);
          });
          return () => unsubscribe();
        } else {
          setUserPortfolio(null);
          setLoading(false);
        }
      }, [currentUser, db]);

      if (loading) {
        return (
          <div className={`p-6 rounded-lg shadow-xl max-w-4xl mx-auto my-8 ${theme.backgroundAlt} ${theme.text}`}>
            <p className="text-center text-gray-400">Cargando tu billetera...</p>
          </div>
        );
      }

      if (error) {
        return (
          <div className={`p-6 rounded-lg shadow-xl max-w-4xl mx-auto my-8 ${theme.backgroundAlt} ${theme.text}`}>
            <p className="text-center text-red-500">{error}</p>
          </div>
        );
      }

      // Si userPortfolio es null aquí, significa que no hay currentUser o hubo un error en la inicialización
      if (!userPortfolio) {
        return (
          <div className={`p-6 rounded-lg shadow-xl max-w-4xl mx-auto my-8 ${theme.backgroundAlt} ${theme.text}`}>
            <p className="text-center text-gray-400">No se pudo cargar la información de tu billetera. Por favor, intenta de nuevo o contacta a soporte.</p>
          </div>
        );
      }

  return (
    <div className={`p-6 rounded-lg shadow-xl max-w-4xl mx-auto my-8 ${theme.backgroundAlt} ${theme.text}`}>
      <h2 className="text-3xl font-bold text-center mb-6">Mi Wallet</h2>

      <div className="mb-8 text-center">
        <p className="text-xl">Saldo Virtual Fiat (USD):</p>
        <p className="text-5xl font-extrabold text-green-500 mt-2">
          ${userPortfolio.virtualBalance ? userPortfolio.virtualBalance.toFixed(2) : '0.00'}
        </p>
      </div>

      <h3 className="text-2xl font-semibold mb-4 text-center">Tus Criptomonedas (Holdings):</h3>
      {userPortfolio.holdings && Object.keys(userPortfolio.holdings).length > 0 ? (
        <div className="overflow-x-auto">
          <table className={`min-w-full rounded-lg overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <thead className={`${darkMode ? 'bg-gray-600' : 'bg-gray-200'} ${theme.text}`}>
              <tr>
                <th className="py-3 px-4 text-left">Moneda</th>
                <th className="py-3 px-4 text-left">Cantidad</th>
              </tr>
            </thead>
            <tbody className={`${theme.text}`}>
              {Object.entries(userPortfolio.holdings).map(([coin, qty]) => (
                <tr key={coin} className={`${darkMode ? 'border-gray-600' : 'border-gray-300'} border-t`}>
                  <td className="py-3 px-4">{coin.toUpperCase()}</td>
                  <td className="py-3 px-4">{qty.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-center text-gray-400">No tienes criptomonedas en tu wallet.</p>
      )}
    </div>
  );
};

export default WalletDisplay;
