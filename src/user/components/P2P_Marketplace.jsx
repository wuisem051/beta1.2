import React, { useState, useEffect, useContext, useMemo } from 'react';
import { collection, query, where, onSnapshot, addDoc, doc, serverTimestamp, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { ThemeContext } from '../../context/ThemeContext';
import { useError } from '../../context/ErrorContext';
import Modal from '../../common/layout/Modal';
import {
  FaPlus, FaFilter, FaUserCircle, FaMoneyBillWave,
  FaCoins, FaCheckCircle, FaTimesCircle, FaGlobe,
  FaChevronDown, FaShieldAlt, FaHistory, FaSearch, FaRegIdBadge
} from 'react-icons/fa';
import styles from './P2PMarketplace.module.css';

const P2P_Marketplace = ({ userBalances }) => {
  const { currentUser } = useAuth();
  const { darkMode } = useContext(ThemeContext);
  const { showError, showSuccess } = useError();
  const [offers, setOffers] = useState([]);
  const [userProfiles, setUserProfiles] = useState({});
  const [showCreateOfferModal, setShowCreateOfferModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Filtros Avanzados (Binance Style)
  const [activeSide, setActiveSide] = useState('sell'); // 'buy' -> Compra Fiat/Vende Crypto, 'sell' -> Venta Fiat/Compra Crypto
  const [activeAsset, setActiveAsset] = useState('USDT-TRC20');
  const [amountFilter, setAmountFilter] = useState('');
  const [fiatFilter, setFiatFilter] = useState('USD');
  const [paymentFilter, setPaymentFilter] = useState('all');

  const [newOffer, setNewOffer] = useState({
    type: 'sell',
    coin: 'USDT-TRC20',
    fiatCurrency: 'USD',
    amount: '',
    price: '',
    paymentMethods: ['Binance Pay'],
  });

  const assets = [
    { id: 'USDT-TRC20', name: 'USDT', icon: '₮', color: '#fcd535' },
    { id: 'BTC', name: 'BTC', icon: '₿', color: '#f7931a' },
    { id: 'LTC', name: 'LTC', icon: 'Ł', color: '#345d9d' },
    { id: 'TRX', name: 'TRX', icon: '⚽', color: '#ef0027' },
    { id: 'DOGE', name: 'DOGE', icon: 'Ð', color: '#c2a633' },
  ];

  const fiats = ['USD', 'VES', 'COP', 'EUR', 'BRL'];
  const paymentOptions = ['Binance Pay', 'Pago Móvil', 'Zelle', 'Banesco', 'PayPal', 'Zinli', 'Mercantil'];

  useEffect(() => {
    // Filtrar por status activo y el crypto activo seleccionado para optimización
    const q = query(collection(db, 'p2p_offers'), where('status', '==', 'active'), where('coin', '==', activeAsset));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));
      setOffers(fetched);
      setLoading(false);

      // Cargar perfiles
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
      showError("Error al sincronizar mercado.");
      setLoading(false);
    });
    return () => unsubscribe();
  }, [activeAsset, db]);

  const filteredOffers = useMemo(() => {
    return offers.filter(o => {
      const sideMatch = o.type === (activeSide === 'buy' ? 'sell' : 'buy'); // Invertido porque mostramos lo que el otro hace
      const fiatMatch = fiatFilter === 'all' || o.fiatCurrency === fiatFilter;
      const paymentMatch = paymentFilter === 'all' || o.paymentMethods.includes(paymentFilter);
      const amount = parseFloat(amountFilter) || 0;
      const amountMatch = amount === 0 || o.amount >= amount;
      return sideMatch && fiatMatch && paymentMatch && amountMatch;
    }).sort((a, b) => activeSide === 'sell' ? a.price - b.price : b.price - a.price);
  }, [offers, activeSide, fiatFilter, paymentFilter, amountFilter]);

  const handleCreateOffer = async (e) => {
    e.preventDefault();
    if (!currentUser) return (window.location.hash = '#/login');

    const amount = parseFloat(newOffer.amount);
    const price = parseFloat(newOffer.price);
    if (!amount || amount <= 0 || !price || price <= 0) return showError("Monto y precio inválidos");

    // Block sell if no balance
    if (newOffer.type === 'sell') {
      const balanceKey = `balance${newOffer.coin.split('-')[0]}`;
      const balance = userBalances[balanceKey] || 0;
      if (balance < amount) {
        return showError(`Saldo insuficiente. Tienes ${balance} ${newOffer.coin}`);
      }
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
      showSuccess("Oferta P2P publicada exitosamente");
      setShowCreateOfferModal(false);
      setNewOffer({ ...newOffer, amount: '', price: '' });
    } catch (err) {
      showError("Error de red: " + err.message);
    }
  };

  const handleCancelOffer = async (id) => {
    if (!window.confirm("¿Estás seguro de cancelar esta oferta pública?")) return;
    try {
      await updateDoc(doc(db, 'p2p_offers', id), { status: 'cancelled' });
      showSuccess("Oferta removida del mercado");
    } catch (err) {
      showError("No se pudo cancelar la oferta.");
    }
  };

  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'Hace un momento';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Hace ${minutes}m`;
    return `Hace ${Math.floor(minutes / 60)}h`;
  };

  return (
    <div className={styles.marketplaceContainer}>
      {/* Header Binance Style */}
      <div className={styles.marketplaceHeader}>
        <div className="flex-1">
          <div className={styles.tabSwitcher}>
            <button
              onClick={() => setActiveSide('sell')}
              className={`${styles.tabButton} ${activeSide === 'sell' ? styles.tabButtonActiveBuy : ''}`}
            >
              Comprar
            </button>
            <button
              onClick={() => setActiveSide('buy')}
              className={`${styles.tabButton} ${activeSide === 'buy' ? styles.tabButtonActiveSell : ''}`}
            >
              Vender
            </button>
          </div>

          <div className={styles.assetList}>
            {assets.map(asset => (
              <button
                key={asset.id}
                onClick={() => setActiveAsset(asset.id)}
                className={`${styles.assetPill} ${activeAsset === asset.id ? styles.assetPillActive : ''}`}
              >
                {asset.name}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => currentUser ? setShowCreateOfferModal(true) : window.location.hash = '#/login'}
          className={styles.publishButton}
        >
          <FaPlus /> {currentUser ? 'Publicar Anuncio' : 'Inicia Sesión para Publicar'}
        </button>
      </div>

      {/* Filter Bar */}
      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Monto a transaccionar</label>
          <div className="relative">
            <input
              type="number"
              placeholder="0.00"
              className={styles.filterInput}
              value={amountFilter}
              onChange={(e) => setAmountFilter(e.target.value)}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-bold">{fiatFilter}</span>
          </div>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Moneda Fiat</label>
          <select
            className={styles.filterSelect}
            value={fiatFilter}
            onChange={(e) => setFiatFilter(e.target.value)}
          >
            {fiats.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Método de Pago</label>
          <select
            className={styles.filterSelect}
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
          >
            <option value="all">Filtro: Todos los Pagos</option>
            {paymentOptions.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {/* Offers Table */}
      <div className={styles.offersSection}>
        <div className="hidden lg:grid grid-cols-12 px-8 py-5 border-b border-white/5 bg-[#12161c]">
          <div className="col-span-3 text-[10px] font-black uppercase text-slate-600 tracking-widest">Anunciante (Ordenes | %)</div>
          <div className="col-span-3 text-[10px] font-black uppercase text-slate-600 tracking-widest">Precio por Unidad</div>
          <div className="col-span-3 text-[10px] font-black uppercase text-slate-600 tracking-widest">Límite / Disponible</div>
          <div className="col-span-3 text-[10px] font-black uppercase text-slate-600 tracking-widest text-right">Pago y Acción</div>
        </div>

        {loading ? (
          <div className="py-24 text-center">
            <div className="w-10 h-10 border-4 border-[#fcd535]/10 border-t-[#fcd535] rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Sincronizando Mercado Global...</p>
          </div>
        ) : filteredOffers.length === 0 ? (
          <div className="py-24 text-center grayscale opacity-30">
            <FaHistory size={60} className="mx-auto mb-4" />
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">Sin órdenes activas en este rango</p>
          </div>
        ) : (
          filteredOffers.map((offer) => {
            const profile = userProfiles[offer.ownerId];
            const isOnline = profile?.lastSeen && (new Date() - profile.lastSeen.toDate()) < 10 * 60 * 1000;

            return (
              <div key={offer.id} className="grid grid-cols-1 lg:grid-cols-12 px-8 py-10 items-center hover:bg-white/[0.01] transition-all border-b border-white/5">
                {/* Advertiser */}
                <div className="col-span-3">
                  <div className={styles.advertiserInfo}>
                    <div className="relative">
                      <div className={styles.avatar}>
                        <FaUserCircle size={36} />
                        <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#1e2329] ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-slate-600'}`}></div>
                      </div>
                    </div>
                    <div>
                      <h4 className={styles.advertiserName}>
                        {profile?.displayName || profile?.username || offer.ownerEmail.split('@')[0]}
                        <FaCheckCircle className="text-[#fcd535]" size={12} title="Verificado Elite" />
                      </h4>
                      <p className={styles.trustMetrics}>
                        1.258 Órdenes | 98.40% Completado
                      </p>
                      <p className="text-[8px] text-slate-700 font-black uppercase mt-1">ID: {offer.id.substring(0, 10).toUpperCase()}</p>
                    </div>
                  </div>
                </div>

                {/* Price */}
                <div className="col-span-3 py-6 lg:py-0">
                  <h3 className={styles.priceText}>
                    {offer.price.toLocaleString()} <span className={styles.fiatUnit}>{offer.fiatCurrency}</span>
                  </h3>
                  <p className="text-[8px] text-slate-600 font-bold uppercase tracking-widest mt-1">Precio Actual de Mercado</p>
                </div>

                {/* Limits */}
                <div className="col-span-3 space-y-2 mb-6 lg:mb-0">
                  <div className={styles.limitRow}>
                    <span>Disponible:</span>
                    <span className={styles.limitValue}>{offer.amount.toLocaleString()} {offer.coin}</span>
                  </div>
                  <div className={styles.limitRow}>
                    <span>Límites:</span>
                    <span className={styles.limitValue}>$20.00 - ${(offer.amount * offer.price).toLocaleString()} {offer.fiatCurrency}</span>
                  </div>
                </div>

                {/* Payment & Actions */}
                <div className="col-span-3 text-right">
                  <div className="flex flex-col lg:items-end gap-5">
                    <div className={styles.paymentList}>
                      {offer.paymentMethods.map(pm => (
                        <div key={pm} className={styles.paymentTag} data-method={pm}>
                          {pm}
                        </div>
                      ))}
                    </div>

                    {currentUser?.uid === offer.ownerId ? (
                      <button onClick={() => handleCancelOffer(offer.id)} className="px-8 py-3 bg-slate-800 text-slate-400 text-[10px] font-black uppercase rounded-xl border border-white/5 hover:bg-rose-600 hover:text-white transition-all">
                        Cancelar Oferta
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          if (!currentUser) return (window.location.hash = '#/login');
                          if (activeSide === 'buy') { // User wants to sell their crypto
                            const balanceKey = `balance${offer.coin.split('-')[0]}`;
                            const balance = userBalances[balanceKey] || 0;
                            if (balance <= 0) return showError(`No tienes saldo para vender ${offer.coin}`);
                          }
                          // Logica real de compra/venta iria aqui
                        }}
                        disabled={activeSide === 'buy' && currentUser && (userBalances[`balance${offer.coin.split('-')[0]}`] || 0) <= 0}
                        className={`${activeSide === 'sell' ? styles.buyButtonBinance : styles.sellButtonBinance} ${activeSide === 'buy' && currentUser && (userBalances[`balance${offer.coin.split('-')[0]}`] || 0) <= 0 ? 'opacity-50 cursor-not-allowed saturate-0' : ''}`}
                      >
                        {activeSide === 'sell' ? `Comprar ${offer.coin}` : (currentUser && (userBalances[`balance${offer.coin.split('-')[0]}`] || 0) <= 0 ? 'Sin Saldo' : `Vender ${offer.coin}`)}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Binance Style */}
      <Modal
        show={showCreateOfferModal}
        onClose={() => setShowCreateOfferModal(false)}
        title="Establecer Publicación Elite"
        className={styles.binanceModal}
      >
        <div className={styles.modalInner}>
          <form onSubmit={handleCreateOffer} className="space-y-8">
            <div className="grid grid-cols-2 gap-6">
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Protocolo de Transacción</label>
                <select
                  className={styles.filterSelect}
                  value={newOffer.type}
                  onChange={e => setNewOffer({ ...newOffer, type: e.target.value })}
                >
                  <option value="sell">QUIERO VENDER (Publicar Venta)</option>
                  <option value="buy">QUIERO COMPRAR (Publicar Compra)</option>
                </select>
              </div>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Activo Crypto</label>
                <select
                  className={styles.filterSelect}
                  value={newOffer.coin}
                  onChange={e => setNewOffer({ ...newOffer, coin: e.target.value })}
                >
                  {assets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.icon})</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Monto de Liquidez</label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    className={styles.filterInput}
                    value={newOffer.amount}
                    onChange={e => setNewOffer({ ...newOffer, amount: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-600 uppercase">{newOffer.coin}</span>
                </div>
              </div>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Precio Unitario</label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    className={styles.filterInput}
                    value={newOffer.price}
                    onChange={e => setNewOffer({ ...newOffer, price: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                  <select
                    value={newOffer.fiatCurrency}
                    onChange={e => setNewOffer({ ...newOffer, fiatCurrency: e.target.value })}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-slate-800 text-[10px] font-black rounded-lg border-none outline-none py-1.5 px-3 text-[#fcd535]"
                  >
                    {fiats.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Métodos de Pago Aceptados</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                    className={`px-3 py-3 rounded-xl text-[9px] font-black uppercase border transition-all ${newOffer.paymentMethods.includes(pm) ? 'bg-[#fcd535]/10 border-[#fcd535] text-[#fcd535]' : 'bg-[#12161c] border-white/5 text-slate-600'}`}
                  >
                    {pm}
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" className="w-full py-5 bg-[#fcd535] text-black rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-[#fcd535]/10">
              🚀 Lanzar Publicación al Mercado
            </button>
          </form>
        </div>
      </Modal>
    </div>
  );
};

export default P2P_Marketplace;
