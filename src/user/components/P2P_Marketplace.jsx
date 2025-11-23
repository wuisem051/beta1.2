import React, { useState, useEffect, useContext } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { ThemeContext } from '../../context/ThemeContext';
import Modal from '../../common/layout/Modal'; // Asume que tienes un componente Modal básico en common/layout

const P2P_Marketplace = ({ userBalances }) => { // Aceptar userBalances como prop
  const { currentUser } = useAuth();
  const { theme, darkMode } = useContext(ThemeContext);
  const [offers, setOffers] = useState([
    // Ofertas de prueba
    {
      id: 'offer1',
      type: 'sell',
      coin: 'USDT',
      fiatCurrency: 'VES',
      amount: 100,
      price: 38.5,
      paymentMethods: ['Banco de Venezuela'],
      ownerId: 'test_seller_id_1',
      status: 'active',
    },
    {
      id: 'offer2',
      type: 'buy',
      coin: 'BTC',
      fiatCurrency: 'USD',
      amount: 0.005,
      price: 60000,
      paymentMethods: ['Zelle'],
      ownerId: 'test_buyer_id_1',
      status: 'active',
    },
    {
      id: 'offer3',
      type: 'sell',
      coin: 'ETH',
      fiatCurrency: 'COP',
      amount: 0.1,
      price: 15000000,
      paymentMethods: ['Mercado Pago'],
      ownerId: 'test_seller_id_2',
      status: 'active',
    },
  ]);
  const [showCreateOfferModal, setShowCreateOfferModal] = useState(false);
  const [newOffer, setNewOffer] = useState({
    type: 'sell', // 'buy' or 'sell'
    coin: 'USDT',
    fiatCurrency: 'VES',
    amount: '',
    price: '',
    paymentMethods: ['Banco de Venezuela'], // Valor por defecto
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'p2p_offers'), where('status', '==', 'active'));
    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const fetchedOffers = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setOffers(fetchedOffers);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching P2P offers:", err);
        setError("Error al cargar las ofertas P2P.");
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [currentUser]); // Añadir currentUser como dependencia

  const handleCreateOfferChange = (e) => {
    const { name, value } = e.target;
    setNewOffer(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateOfferSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      alert("Debes iniciar sesión para crear una oferta.");
      return;
    }
    const offerAmount = parseFloat(newOffer.amount);
    const offerPrice = parseFloat(newOffer.price);

    if (offerAmount <= 0 || offerPrice <= 0) {
      alert("La cantidad y el precio deben ser mayores que cero.");
      return;
    }

    // Validación de saldo
    const userFiatBalance = userBalances.balanceUSD; // Asumiendo que 'USD' es la moneda fiat principal
    const userCryptoHoldings = userBalances.holdings;

    if (newOffer.type === 'sell') { // Vender cripto, el usuario necesita la cripto
      const cryptoToSell = newOffer.coin;
      const amountToSell = offerAmount;
      const userHasCrypto = userCryptoHoldings && userCryptoHoldings[cryptoToSell];

      if (!userHasCrypto || userCryptoHoldings[cryptoToSell] < amountToSell) {
        alert(`Saldo insuficiente de ${cryptoToSell}. Tienes ${userHasCrypto ? userCryptoHoldings[cryptoToSell].toFixed(4) : '0.0000'} ${cryptoToSell}.`);
        return;
      }
    } else if (newOffer.type === 'buy') { // Comprar cripto, el usuario necesita fiat
      const totalFiatCost = offerAmount * offerPrice;
      // Asumiendo que newOffer.fiatCurrency se refiere a la moneda fiat que el usuario va a "gastar"
      // Si solo manejamos balanceUSD en el perfil del usuario, la validación se hace contra USD
      // Si el fiatCurrency no es USD, la lógica sería más compleja (conversión, otros campos de balance fiat)
      if (newOffer.fiatCurrency !== 'USD') {
        alert(`Actualmente solo se soporta la compra/venta de cripto usando USD como moneda fiat. Tu oferta usa ${newOffer.fiatCurrency}.`);
        return;
      }
      
      if (userFiatBalance < totalFiatCost) {
        alert(`Saldo fiat insuficiente para comprar. Necesitas $${totalFiatCost.toFixed(2)} USD y tienes $${userFiatBalance.toFixed(2)} USD.`);
        return;
      }
    }

    try {
      await addDoc(collection(db, 'p2p_offers'), {
        ...newOffer,
        amount: offerAmount, // Usar parseFloat
        price: offerPrice,   // Usar parseFloat
        ownerId: currentUser.uid,
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      alert("Oferta creada exitosamente!");
      setNewOffer({
        type: 'sell',
        coin: 'USDT',
        fiatCurrency: 'VES', // Mantener VES o cambiar a USD si es la única soportada
        amount: '',
        price: '',
        paymentMethods: ['Banco de Venezuela'],
      });
      setShowCreateOfferModal(false);
    } catch (err) {
      console.error("Error creating P2P offer:", err);
      alert("Error al crear la oferta: " + err.message);
    }
  };

  const handleInitiateTrade = (offer) => {
    if (!currentUser) {
      alert("Debes iniciar sesión para iniciar un intercambio.");
      return;
    }
    if (currentUser.uid === offer.ownerId) {
      alert("No puedes iniciar un intercambio con tu propia oferta.");
      return;
    }
    // Aquí se implementaría la lógica para iniciar un trade
    // Por ahora, solo una alerta
    alert(`Iniciando ${offer.type === 'buy' ? 'compra' : 'venta'} de ${offer.amount} ${offer.coin} a ${offer.price} ${offer.fiatCurrency} con ${offer.ownerId}`);
    console.log("Iniciar Trade:", offer);
  };

  const commonCurrencies = [
    { id: 'USDT', name: 'Tether (USDT)' },
    { id: 'BTC', name: 'Bitcoin (BTC)' },
    { id: 'ETH', name: 'Ethereum (ETH)' },
  ];

  const commonFiatCurrencies = [
    { id: 'VES', name: 'Bolívar Soberano (VES)' },
    { id: 'COP', name: 'Peso Colombiano (COP)' },
    { id: 'USD', name: 'Dólar Estadounidense (USD)' },
  ];

  const commonPaymentMethods = [
    { id: 'Banco de Venezuela', name: 'Banco de Venezuela' },
    { id: 'Pago Móvil', name: 'Pago Móvil' },
    { id: 'Mercado Pago', name: 'Mercado Pago' },
    { id: 'Zelle', name: 'Zelle' },
    { id: 'PayPal', name: 'PayPal' },
  ];

  return (
    <div className={`p-6 rounded-lg shadow-xl max-w-7xl mx-auto my-8 ${theme.backgroundAlt} ${theme.text}`}>
      <h2 className="text-3xl font-bold text-center mb-6">Mercado P2P</h2>

      {error && <p className="text-red-500 text-center mb-4">{error}</p>}
      {loading && <p className="text-center text-gray-400 mb-4">Cargando ofertas...</p>}

      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowCreateOfferModal(true)}
          className="bg-accent hover:bg-accent-dark text-white font-bold py-2 px-4 rounded-md transition duration-300"
        >
          Crear Nueva Oferta
        </button>
      </div>

      <h3 className="text-2xl font-semibold mb-4">Ofertas Activas</h3>
      {offers.length === 0 && !loading && <p className="text-center text-gray-400">No hay ofertas activas en este momento.</p>}

      {offers.length > 0 && (
        <div className="overflow-x-auto">
          <table className={`min-w-full rounded-lg overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <thead className={`${darkMode ? 'bg-gray-600' : 'bg-gray-200'} ${theme.text}`}>
              <tr>
                <th className="py-3 px-4 text-left">Tipo</th>
                <th className="py-3 px-4 text-left">Moneda Crypto</th>
                <th className="py-3 px-4 text-left">Moneda Fiat</th>
                <th className="py-3 px-4 text-left">Cantidad</th>
                <th className="py-3 px-4 text-left">Precio por unidad</th>
                <th className="py-3 px-4 text-left">Métodos de Pago</th>
                <th className="py-3 px-4 text-left">Vendedor/Comprador</th>
                <th className="py-3 px-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className={`${theme.text}`}>
              {offers.map((offer) => (
                <tr key={offer.id} className={`${darkMode ? 'border-gray-600' : 'border-gray-300'} border-t`}>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      offer.type === 'sell' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                      {offer.type === 'sell' ? 'Venta' : 'Compra'}
                    </span>
                  </td>
                  <td className="py-3 px-4">{offer.coin}</td>
                  <td className="py-3 px-4">{offer.fiatCurrency}</td>
                  <td className="py-3 px-4">{offer.amount.toFixed(2)}</td>
                  <td className="py-3 px-4">{offer.price.toFixed(2)}</td>
                  <td className="py-3 px-4">{offer.paymentMethods.join(', ')}</td>
                  <td className="py-3 px-4 truncate">{offer.ownerId.substring(0, 8)}...</td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleInitiateTrade(offer)}
                      className={`font-bold py-1.5 px-3 rounded-md text-sm transition duration-300 ${
                        offer.type === 'sell'
                          ? 'bg-green-600 hover:bg-green-700 text-white' // Botón "Comprar" para ofertas de venta
                          : 'bg-red-600 hover:bg-red-700 text-white'   // Botón "Vender" para ofertas de compra
                      }`}
                    >
                      {offer.type === 'sell' ? 'Comprar' : 'Vender'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal para Crear Nueva Oferta */}
      <Modal show={showCreateOfferModal} onClose={() => setShowCreateOfferModal(false)} title="Crear Nueva Oferta P2P">
        <form onSubmit={handleCreateOfferSubmit} className="space-y-4">
          <div>
            <label htmlFor="type" className={`block text-sm font-medium ${theme.textSoft}`}>Tipo de Oferta</label>
            <select
              id="type"
              name="type"
              value={newOffer.type}
              onChange={handleCreateOfferChange}
              className={`mt-1 block w-full p-2 border rounded-md shadow-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
            >
              <option value="sell">Vender Crypto</option>
              <option value="buy">Comprar Crypto</option>
            </select>
          </div>
          <div>
            <label htmlFor="coin" className={`block text-sm font-medium ${theme.textSoft}`}>Moneda Crypto</label>
            <select
              id="coin"
              name="coin"
              value={newOffer.coin}
              onChange={handleCreateOfferChange}
              className={`mt-1 block w-full p-2 border rounded-md shadow-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
            >
              {commonCurrencies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="fiatCurrency" className={`block text-sm font-medium ${theme.textSoft}`}>Moneda Fiat</label>
            <select
              id="fiatCurrency"
              name="fiatCurrency"
              value={newOffer.fiatCurrency}
              onChange={handleCreateOfferChange}
              className={`mt-1 block w-full p-2 border rounded-md shadow-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
            >
              {commonFiatCurrencies.map(fc => <option key={fc.id} value={fc.id}>{fc.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="amount" className={`block text-sm font-medium ${theme.textSoft}`}>Cantidad de Crypto</label>
            <input
              type="number"
              id="amount"
              name="amount"
              value={newOffer.amount}
              onChange={handleCreateOfferChange}
              step="any"
              min="0"
              className={`mt-1 block w-full p-2 border rounded-md shadow-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
              placeholder="Ej: 100.5"
            />
          </div>
          <div>
            <label htmlFor="price" className={`block text-sm font-medium ${theme.textSoft}`}>Precio por unidad (en {newOffer.fiatCurrency})</label>
            <input
              type="number"
              id="price"
              name="price"
              value={newOffer.price}
              onChange={handleCreateOfferChange}
              step="any"
              min="0"
              className={`mt-1 block w-full p-2 border rounded-md shadow-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
              placeholder="Ej: 3.85"
            />
          </div>
          {/* Implementación simple para PaymentMethods, podría ser más sofisticada con multi-select */}
          <div>
            <label htmlFor="paymentMethods" className={`block text-sm font-medium ${theme.textSoft}`}>Métodos de Pago (solo uno por ahora)</label>
            <select
              id="paymentMethods"
              name="paymentMethods"
              value={newOffer.paymentMethods[0]}
              onChange={(e) => setNewOffer(prev => ({ ...prev, paymentMethods: [e.target.value] }))}
              className={`mt-1 block w-full p-2 border rounded-md shadow-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
            >
              {commonPaymentMethods.map(pm => <option key={pm.id} value={pm.id}>{pm.name}</option>)}
            </select>
          </div>
          <button
            type="submit"
            className="w-full bg-accent hover:bg-accent-dark text-white font-bold py-2 px-4 rounded-md transition duration-300"
          >
            Publicar Oferta
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default P2P_Marketplace;
