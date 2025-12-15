import { useState, useEffect } from 'react';

const useCryptoPrice = (cryptoSymbol) => {
  const [price, setPrice] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrice = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoSymbol}&vs_currencies=usd`
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data[cryptoSymbol] && data[cryptoSymbol].usd) {
          setPrice(data[cryptoSymbol].usd);
        } else {
          throw new Error('Precio no encontrado para el símbolo proporcionado.');
        }
      } catch (e) {
        console.error("Error fetching crypto price:", e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    if (cryptoSymbol) {
      fetchPrice();
      // Opcional: Refrescar el precio periódicamente, por ejemplo cada 60 segundos
      // const intervalId = setInterval(fetchPrice, 60000);
      // return () => clearInterval(intervalId);
    } else {
      setPrice(null);
      setLoading(false);
    }
  }, [cryptoSymbol]);

  return { price, loading, error };
};

export default useCryptoPrice;
