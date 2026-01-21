import React, { useState, useEffect, useContext, useMemo } from 'react';
import { collection, query, where, onSnapshot, addDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { ThemeContext } from '../../context/ThemeContext';
import { useError } from '../../context/ErrorContext';
import Modal from '../../common/layout/Modal';
import { FaPlus, FaFilter, FaUserCircle, FaMoneyBillWave, FaCoins, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import styles from './P2PMarketplace.module.css';

const P2P_Marketplace = ({ userBalances }) => {
  const { currentUser } = useAuth();
  const { darkMode } = useContext(ThemeContext);
  const { showError, showSuccess } = useError();
  const [offers, setOffers] = useState([]);
  const [userProfiles, setUserProfiles] = useState({});
  const [showCreateOfferModal, setShowCreateOfferModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filterType, setFilterType] = useState('all'); // all, buy, sell
  const [filterCoin, setFilterCoin] = useState('all');

  const [newOffer, setNewOffer] = useState({
    type: 'sell',
    coin: 'USDT-TRC20',
    fiatCurrency: 'USD',
    amount: '',
    price: '',
    paymentMethods: ['Binance Pay'],
  });

  const commonCurrencies = [
    { id: 'USDT-TRC20', name: 'USDT (TRC20)', icon: '₮', color: '#26a17b' },
    { id: 'BTC', name: 'Bitcoin (BTC)', icon: '₿', color: '#f7931a' },
    { id: 'LTC', name: 'Litecoin (LTC)', icon: 'Ł', color: '#345d9d' },
    { id: 'TRX', name: 'Tron (TRX)', icon: '🔴', color: '#ef0027' },
    { id: 'DOGE', name: 'Dogecoin (DOGE)', icon: 'Ð', color: '#c2a633' },
  ];

  const commonFiats = [
    { id: 'USD', name: 'Dólar (USD)', symbol: '$' },
    { id: 'VES', name: 'Bolívares (VES)', symbol: 'Bs' },
    { id: 'COP', name: 'Peso Col (COP)', symbol: '$' },
  ];

  const paymentOptions = ['Binance Pay', 'Pago Móvil', 'Zelle', 'Banesco', 'PayPal'];

  useEffect(() => {
    const q = query(collection(db, 'p2p_offers'), where('status', '==', 'active'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOffers(fetched);
      setLoading(false);

      // Cargar perfiles de forma optimizada
      const uids = [...new Set(fetched.map(o => o.ownerId))];
      uids.forEach(uid => {
        if (!userProfiles[uid]) {
          onSnapshot(doc(db, 'users', uid), (docSnap) => {
            if (docSnap.exists()) {
              setUserProfiles(prev => ({ ...prev, [uid]: docSnap.data() }));
            }
          });
        }
      });
    }, (err) => {
      showError("Error al cargar ofertas.");
      setLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser]);

  const filteredOffers = useMemo(() => {
    return offers.filter(o => {
      const typeMatch = filterType === 'all' || o.type === filterType;
      const coinMatch = filterCoin === 'all' || o.coin === filterCoin;
      return typeMatch && coinMatch;
    }).sort((a, b) => b.createdAt?.toDate() - a.createdAt?.toDate());
  }, [offers, filterType, filterCoin]);

  const handleCreateOffer = async (e) => {
    e.preventDefault();
    if (!currentUser) return showError("Inicia sesión primero");

    const amount = parseFloat(newOffer.amount);
    const price = parseFloat(newOffer.price);
    if (!amount || amount <= 0 || !price || price <= 0) return showError("Monto y precio inválidos");

    // Validación de saldo para vendedores
    if (newOffer.type === 'sell') {
      const balanceKey = `balance${newOffer.coin.replace('-', '')}`;
      const balance = userBalances[balanceKey] || 0;
      if (balance < amount) return showError(`Saldo insuficiente de ${newOffer.coin}`);
    }

    try {
      await addDoc(collection(db, 'p2p_offers'), {
        ...newOffer,
        amount,
        price,
        ownerId: currentUser.uid,
        ownerEmail: currentUser.email,
        status: 'active',
        createdAt: serverTimestamp(),
      });
      showSuccess("Oferta publicada");
      setShowCreateOfferModal(false);
      setNewOffer({ ...newOffer, amount: '', price: '' });
    } catch (err) {
      showError("Error al publicar: " + err.message);
    }
  };

  const handleCancelOffer = async (id) => {
    if (!window.confirm("¿Cancelar esta oferta?")) return;
    try {
      await updateDoc(doc(db, 'p2p_offers', id), { status: 'cancelled' });
      showSuccess("Oferta cancelada");
    } catch (err) {
      showError("Error al cancelar");
    }
  };

  const isOnline = (uid) => {
    const profile = userProfiles[uid];
    if (!profile?.lastSeen) return false;
    return (new Date() - profile.lastSeen.toDate()) < 10 * 60 * 1000;
  };

  return (
    <div className={styles.marketplaceContainer}>
      <div className={styles.marketplaceHeader}>
        <div>
          <h2 className={styles.marketplaceTitle}>Mercado P2P Elite</h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Intercambio descentralizado entre usuarios</p>
        </div>
        <button onClick={() => setShowCreateOfferModal(true)} className={styles.createOfferButton}>
          <FaPlus /> Publicar Oferta
        </button>
      </div>

      {/* Controles de Filtros */}
      <div className="flex flex-wrap gap-4 mb-8 bg-slate-900/40 p-4 rounded-3xl border border-white/5 backdrop-blur-xl">
        <div className="flex bg-slate-950/50 p-1 rounded-2xl border border-white/5">
          {['all', 'buy', 'sell'].map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterType === type ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-white'}`}
            >
              {type === 'all' ? 'Todos' : type === 'buy' ? 'Compras' : 'Ventas'}
            </button>
          ))}
        </div>

        <select
          value={filterCoin}
          onChange={(e) => setFilterCoin(e.target.value)}
          className="bg-slate-950/50 border border-white/5 rounded-2xl px-4 py-2 text-[10px] font-black text-slate-300 uppercase outline-none focus:border-blue-500"
        >
          <option value="all">Todas las Monedas</option>
          {commonCurrencies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className={styles.offersSection}>
        {loading ? (
          <div className="py-20 text-center animate-pulse text-slate-500 font-bold uppercase tracking-widest text-xs">Sincronizando Mercado...</div>
        ) : filteredOffers.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs italic">No hay ofertas que coincidan con tus filtros</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.offersTable}>
              <thead className={styles.tableHead}>
                <tr>
                  <th className={styles.tableHeader}>Anunciante</th>
                  <th className={styles.tableHeader}>Tipo / Moneda</th>
                  <th className={styles.tableHeader}>Cantidad</th>
                  <th className={styles.tableHeader}>Precio</th>
                  <th className={styles.tableHeader}>Pagos</th>
                  <th className={styles.tableHeader} style={{ textAlign: 'right' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredOffers.map((offer) => {
                  const coinInfo = commonCurrencies.find(c => c.id === offer.coin) || commonCurrencies[0];
                  return (
                    <tr key={offer.id} className={styles.tableRow}>
                      <td className={styles.tableCell}>
                        <div className={styles.userCell}>
                          <div className="relative">
                            <FaUserCircle size={32} className="text-slate-700" />
                            <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${isOnline(offer.ownerId) ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-slate-600'}`}></div>
                          </div>
                          <div>
                            <p className="text-white font-black text-sm">{userProfiles[offer.ownerId]?.email?.split('@')[0] || 'Usuario'}</p>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">ID: {offer.ownerId.substring(0, 8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className={styles.tableCell}>
                        <div className="flex items-center gap-3">
                          <span className={offer.type === 'sell' ? styles.typeBadgeSell : styles.typeBadgeBuy}>
                            {offer.type === 'sell' ? 'Venta' : 'Compra'}
                          </span>
                          <span className="text-white font-bold text-xs">{offer.coin}</span>
                        </div>
                      </td>
                      <td className={styles.tableCell}>
                        <p className="text-white font-mono font-bold text-sm">{offer.amount.toLocaleString()} <span className="text-[10px] text-slate-500">{offer.coin}</span></p>
                      </td>
                      <td className={styles.tableCell}>
                        <p className="text-blue-400 font-black text-lg">
                          {offer.price.toLocaleString()} <span className="text-[10px] uppercase text-slate-500">{offer.fiatCurrency}</span>
                        </p>
                      </td>
                      <td className={styles.tableCell}>
                        <div className="flex flex-wrap gap-1">
                          {offer.paymentMethods.map(pm => (
                            <span key={pm} className="bg-slate-800/80 text-slate-400 text-[9px] font-black uppercase px-2 py-1 rounded-md border border-white/5">
                              {pm}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className={styles.tableCell} style={{ textAlign: 'right' }}>
                        {currentUser?.uid === offer.ownerId ? (
                          <button onClick={() => handleCancelOffer(offer.id)} className={styles.cancelButton}>Cancelar</button>
                        ) : (
                          <button className={offer.type === 'sell' ? styles.buyButton : styles.sellButton}>
                            {offer.type === 'sell' ? 'Comprar' : 'Vender'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal show={showCreateOfferModal} onClose={() => setShowCreateOfferModal(false)} title="Publicar Nuevo Anuncio">
        <form onSubmit={handleCreateOffer} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Tipo</label>
              <select name="type" value={newOffer.type} onChange={e => setNewOffer({ ...newOffer, type: e.target.value })} className={styles.formSelect}>
                <option value="sell">Vender (Tú das Crypto)</option>
                <option value="buy">Comprar (Tú das Fiat)</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Moneda</label>
              <select name="coin" value={newOffer.coin} onChange={e => setNewOffer({ ...newOffer, coin: e.target.value })} className={styles.formSelect}>
                {commonCurrencies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Cantidad</label>
              <input type="number" step="any" value={newOffer.amount} onChange={e => setNewOffer({ ...newOffer, amount: e.target.value })} className={styles.formInput} placeholder="0.00" required />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Precio Unitario</label>
              <div className="relative">
                <input type="number" step="any" value={newOffer.price} onChange={e => setNewOffer({ ...newOffer, price: e.target.value })} className={styles.formInput} placeholder="0.00" required />
                <select value={newOffer.fiatCurrency} onChange={e => setNewOffer({ ...newOffer, fiatCurrency: e.target.value })} className="absolute right-2 top-1/2 -translate-y-1/2 bg-slate-800 text-[10px] font-bold rounded-lg border-none outline-none py-1.5 px-2">
                  {commonFiats.map(f => <option key={f.id} value={f.id}>{f.id}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Método de Pago</label>
            <div className="grid grid-cols-2 gap-2">
              {paymentOptions.map(pm => (
                <button
                  key={pm}
                  type="button"
                  onClick={() => {
                    const exists = newOffer.paymentMethods.includes(pm);
                    setNewOffer({
                      ...newOffer,
                      paymentMethods: exists
                        ? newOffer.paymentMethods.filter(p => p !== pm)
                        : [...newOffer.paymentMethods, pm]
                    });
                  }}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase border transition-all ${newOffer.paymentMethods.includes(pm) ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-slate-900 border-white/5 text-slate-500'}`}
                >
                  {pm}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" className={styles.submitButton}>🚀 Publicar Oferta P2P</button>
        </form>
      </Modal>
    </div>
  );
};

export default P2P_Marketplace;
