import React, { useState, useEffect } from 'react';
import useCryptoPrice from '../../hooks/useCryptoPrice'; // Asegúrate de que la ruta sea correcta
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth } from 'firebase/auth';
import { doc, onSnapshot, getFirestore } from 'firebase/firestore'; // Importar Firestore

const TradingPanel = () => {
  const [selectedCoin, setSelectedCoin] = useState('bitcoin'); // CoinGecko ID, ej: 'bitcoin', 'ethereum'
  const [amount, setAmount] = useState('');
  const [userPortfolio, setUserPortfolio] = useState(null);
  const [tradeError, setTradeError] = useState(null);
  const [tradeSuccess, setTradeSuccess] = useState(null);

  const { price, loading, error } = useCryptoPrice(selectedCoin);
  const auth = getAuth();
  const db = getFirestore();
  const functions = getFunctions();
  const executeTradeCallable = httpsCallable(functions, 'executeTrade');

  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (userId) {
      const userDocRef = doc(db, `users/${userId}`); // Ahora lee el documento principal del usuario
      const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const userData = docSnap.data();
          // Mapear los balances del documento de usuario a la estructura esperada por userPortfolio
          setUserPortfolio({
            virtualBalance: userData.balanceUSD || 0,
            holdings: {
              BTC: userData.balanceBTC || 0,
              LTC: userData.balanceLTC || 0,
              DOGE: userData.balanceDOGE || 0,
              USDT: userData.balanceUSDT || 0, // Incluir USDT
              // Agrega otras criptomonedas aquí si también se gestionan en el documento del usuario
            },
          });
        } else {
          console.log("No se encontró el documento del usuario. Los balances serán 0.");
          setUserPortfolio({
            virtualBalance: 0,
            holdings: {
              BTC: 0,
              LTC: 0,
              DOGE: 0,
              USDT: 0,
            },
          });
        }
      }, (error) => {
        console.error("Error al obtener balances de usuario en tiempo real para TradingPanel:", error);
        // Manejar error si es necesario
        setTradeError("Error al cargar tu saldo virtual.");
      });
      return () => unsubscribe();
    } else {
      setUserPortfolio(null);
    }
  }, [auth, db]); // Dependencias: auth y db

  const handleTrade = async (type) => {
    setTradeError(null);
    setTradeSuccess(null);
    if (!auth.currentUser) {
      setTradeError('Debes iniciar sesión para operar.');
      return;
    }
    if (!selectedCoin || !amount || parseFloat(amount) <= 0) {
      setTradeError('Por favor, ingresa una moneda válida y una cantidad mayor que cero.');
      return;
    }
    if (loading || error || price === null) {
      setTradeError('El precio de la moneda no está disponible en este momento. Inténtalo de nuevo.');
      return;
    }

    try {
      const tradeData = {
        coinId: selectedCoin,
        amount: parseFloat(amount),
        priceAtMoment: price,
        type: type,
      };
      const result = await executeTradeCallable(tradeData);
      setTradeSuccess(result.data.message);
      setAmount(''); // Limpiar el input después de una operación exitosa
    } catch (e) {
      console.error("Error al ejecutar la operación de trading:", e);
      setTradeError(e.message);
    }
  };

  const availableCoins = [
    { id: 'bitcoin', name: 'Bitcoin (BTC)' },
    { id: 'ethereum', name: 'Ethereum (ETH)' },
    { id: 'cardano', name: 'Cardano (ADA)' },
    { id: 'dogecoin', name: 'Dogecoin (DOGE)' },
    // Agrega más monedas según necesites, usando sus IDs de CoinGecko
  ];

  return (
    <div className="p-6 bg-gray-800 text-white rounded-lg shadow-xl max-w-4xl mx-auto my-8">
      <h2 className="text-3xl font-bold text-center mb-6">Panel de Trading (Paper Trading)</h2>

      {userPortfolio ? (
        <div className="mb-8 text-center">
          <p className="text-xl">Saldo Virtual Disponible:</p>
          <p className="text-5xl font-extrabold text-green-500 mt-2">${userPortfolio.virtualBalance ? userPortfolio.virtualBalance.toFixed(2) : '0.00'}</p>
        </div>
      ) : (
        <p className="text-center text-red-400 mb-8">Cargando portfolio o no encontrado...</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
          <label htmlFor="coin-select" className="block text-lg font-medium text-gray-300 mb-2">Seleccionar Moneda:</label>
          <select
            id="coin-select"
            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-green-500 focus:border-green-500"
            value={selectedCoin}
            onChange={(e) => setSelectedCoin(e.target.value)}
          >
            {availableCoins.map((coin) => (
              <option key={coin.id} value={coin.id}>{coin.name}</option>
            ))}
          </select>
          {price !== null && !loading && !error && (
            <p className="text-green-400 text-sm mt-2">Precio actual de {selectedCoin}: ${price.toFixed(2)}</p>
          )}
          {loading && <p className="text-yellow-400 text-sm mt-2">Cargando precio...</p>}
          {error && <p className="text-red-400 text-sm mt-2">Error al obtener precio: {error}</p>}
        </div>

        <div>
          <label htmlFor="amount-input" className="block text-lg font-medium text-gray-300 mb-2">Cantidad a Invertir:</label>
          <input
            id="amount-input"
            type="number"
            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-green-500 focus:border-green-500"
            placeholder="Ej. 0.05 BTC o 10 ETH"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="0"
            step="any"
          />
        </div>
      </div>

      {tradeError && <p className="text-red-500 text-center mb-4">{tradeError}</p>}
      {tradeSuccess && <p className="text-green-500 text-center mb-4">{tradeSuccess}</p>}

      <div className="flex justify-center gap-4 mb-8">
        <button
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg text-xl transition duration-300 ease-in-out disabled:opacity-50"
          onClick={() => handleTrade('buy')}
          disabled={loading || price === null || parseFloat(amount) <= 0}
        >
          Comprar (Long)
        </button>
        <button
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg text-xl transition duration-300 ease-in-out disabled:opacity-50"
          onClick={() => handleTrade('sell')}
          disabled={loading || price === null || parseFloat(amount) <= 0}
        >
          Vender (Short)
        </button>
      </div>

      <h3 className="text-2xl font-semibold mb-4 text-center">Tus Holdings Actuales:</h3>
      {userPortfolio?.holdings && Object.keys(userPortfolio.holdings).length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-gray-700 rounded-lg">
            <thead>
              <tr>
                <th className="py-3 px-4 text-left text-gray-300">Moneda</th>
                <th className="py-3 px-4 text-left text-gray-300">Cantidad</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(userPortfolio.holdings).map(([coin, qty]) => (
                <tr key={coin} className="border-t border-gray-600">
                  <td className="py-3 px-4">{coin.toUpperCase()}</td>
                  <td className="py-3 px-4">{qty.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-center text-gray-400">No tienes holdings en este momento.</p>
      )}
    </div>
  );
};

export default TradingPanel;
