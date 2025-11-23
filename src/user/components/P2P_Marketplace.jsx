import React, { useState, useEffect, useContext } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore'; // Añadir deleteDoc, doc, updateDoc
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { ThemeContext } from '../../context/ThemeContext';
import Modal from '../../common/layout/Modal'; // Asume que tienes un componente Modal básico en common/layout

const P2P_Marketplace = ({ userBalances }) => {
  const { currentUser } = useAuth();
  const { theme, darkMode } = useContext(ThemeContext);
  const [offers, setOffers] = useState([]);
  const [userProfiles, setUserProfiles] = useState({}); // Para almacenar perfiles de usuarios de ofertas (incluyendo lastSeen)
  const [showCreateOfferModal, setShowCreateOfferModal] = useState(false);
  const [newOffer, setNewOffer] = useState({
    type: 'sell', // 'buy' or 'sell'
    coin: 'USDT',
    fiatCurrency: 'VES',
    amount: '',
    price: '',
    paymentMethods: ['Banco de Venezuela'],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'p2p_offers'), where('status', '==', 'active'));
    const unsubscribeOffers = onSnapshot(q,
      (snapshot) => {
        const fetchedOffers = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setOffers(fetchedOffers);
        setLoading(false);

        // Recolectar UIDs de los propietarios de las ofertas para obtener su estado online
        const ownerIds = [...new Set(fetchedOffers.map(offer => offer.ownerId))];
        if (ownerIds.length > 0) {
          // Crear un listener para cada perfil de usuario o usar una consulta 'where in' si es posible (limitado a 10)
          // Para simplicidad y escalabilidad limitada, haremos un listener por cada uno o podríamos optar por no tiempo real
          // Por ahora, para la funcionalidad sencilla, haremos lecturas individuales o no en tiempo real.
          // Para esta tarea, nos limitaremos a una lógica de "lastSeen" en UserPanel, no en tiempo real aquí.
        }
      },
      (err) => {
        console.error("Error fetching P2P offers:", err);
        setError("Error al cargar las ofertas P2P.");
        setLoading(false);
      }
    );
    return () => unsubscribeOffers();
  }, [currentUser]);

  // Efecto para obtener perfiles de usuarios de las ofertas (incluyendo lastSeen)
  useEffect(() => {
    if (offers.length > 0) {
      const uniqueOwnerIds = [...new Set(offers.map(offer => offer.ownerId))];
      const unsubscribes = [];

      // Limpiar listeners antiguos antes de establecer nuevos
      setUserProfiles({});

      uniqueOwnerIds.forEach(ownerId => {
        const userRef = doc(db, 'users', ownerId);
        const unsubscribe = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserProfiles(prev => ({
              ...prev,
              [ownerId]: docSnap.data(),
            }));
          } else {
            setUserProfiles(prev => ({ ...prev, [ownerId]: null }));
          }
        });
        unsubscribes.push(unsubscribe);
      });

      return () => unsubscribes.forEach(unsub => unsub());
    }
  }, [offers, db]); // Depende de las ofertas para reaccionar a nuevos propietarios

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
    const userFiatBalance = userBalances[`balance${newOffer.fiatCurrency}`] || 0; // Obtener el saldo fiat dinámicamente
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
      
      if (userFiatBalance < totalFiatCost) {
        alert(`Saldo fiat insuficiente para comprar. Necesitas ${totalFiatCost.toFixed(2)} ${newOffer.fiatCurrency} y tienes ${userFiatBalance.toFixed(2)} ${newOffer.fiatCurrency}.`);
        return;
      }
    }

    try {
      await addDoc(collection(db, 'p2p_offers'), {
        ...newOffer,
        amount: offerAmount,
        price: offerPrice,
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

  const handleCancelOffer = async (offerId) => {
    if (!currentUser) {
      alert("Debes iniciar sesión para cancelar una oferta.");
      return;
    }
    const offerToCancel = offers.find(offer => offer.id === offerId);
    if (!offerToCancel || offerToCancel.ownerId !== currentUser.uid) {
      alert("No tienes permiso para cancelar esta oferta.");
      return;
    }

    if (window.confirm("¿Estás seguro de que quieres cancelar esta oferta?")) {
      try {
        await updateDoc(doc(db, 'p2p_offers', offerId), {
          status: 'cancelled',
          updatedAt: serverTimestamp(),
        });
        alert("Oferta cancelada exitosamente.");
      } catch (err) {
        console.error("Error al cancelar la oferta:", err);
        alert("Error al cancelar la oferta: " + err.message);
      }
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
    alert(`Iniciando ${offer.type === 'buy' ? 'compra' : 'venta'} de ${offer.amount} ${offer.coin} a ${offer.price} ${offer.fiatCurrency} con ${offer.ownerId}`);
    console.log("Iniciar Trade:", offer);
  };

  const isUserOnline = (ownerId) => {
    const profile = userProfiles[ownerId];
    if (!profile || !profile.lastSeen) return false;
    const lastSeenTime = profile.lastSeen.toDate(); // Asume que lastSeen es un Timestamp de Firestore
    const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000); // 20 minutos de inactividad
    return lastSeenTime > twentyMinutesAgo;
  };

  const commonCurrencies = [
    { id: 'USDT', name: 'Tether (USDT)' },
    { id: 'BTC', name: 'Bitcoin (BTC)' },
    { id: 'ETH', name: 'Ethereum (ETH)' },
    { id: 'LTC', name: 'Litecoin (LTC)' }, // Añadir LTC
    { id: 'DOGE', name: 'Dogecoin (DOGE)' }, // Añadir DOGE
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
                  <td className="py-3 px-4 truncate flex items-center">
                    {offer.ownerId.substring(0, 8)}...
                    {userProfiles[offer.ownerId] && (
                      <span className={`ml-2 w-3 h-3 rounded-full ${isUserOnline(offer.ownerId) ? 'bg-green-500' : 'bg-gray-500'}`} title={isUserOnline(offer.ownerId) ? 'En línea' : 'Fuera de línea'}></span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {currentUser && currentUser.uid === offer.ownerId ? (
                      <button
                        onClick={() => handleCancelOffer(offer.id)}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold py-1.5 px-3 rounded-md text-sm transition duration-300"
                      >
                        Cancelar Oferta
                      </button>
                    ) : (
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
                    )}
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
