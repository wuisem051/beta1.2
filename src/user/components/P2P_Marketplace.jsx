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
  FaChevronDown, FaShieldAlt, FaHistory, FaSearch, FaRegIdBadge,
  FaRegClock, FaHeadset, FaExternalLinkAlt, FaUserCheck, FaWallet,
  FaChartLine, FaExchangeAlt, FaHandshake, FaBtc
} from 'react-icons/fa';
import styles from './P2PMarketplace.module.css';

const P2P_Marketplace = ({ userBalances, isSidebarHidden = false, dashboardMaxWidth = 1600 }) => {
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
    { id: 'USDT-TRC20', name: 'USDT', icon: '₮', color: 'var(--accent)' },
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

  const [activeView, setActiveView] = useState('marketplace'); // 'marketplace', 'profile', or 'orders'

  return (
    <div className={styles.marketplaceContainer} style={{ maxWidth: isSidebarHidden ? '100%' : `${dashboardMaxWidth}px`, margin: isSidebarHidden ? '0' : '0 auto', transition: 'all 0.3s ease' }}>

      {/* Bitunix P2P Submenu */}
      <div className="flex gap-8 mb-10 border-b border-white/5 pb-1 overflow-x-auto no-scrollbar">
        {['Compra con un clic', 'Depósito Fiat', 'Tarjeta de crédito/débito', 'Comercio P2P', 'Express'].map((item) => (
          <button
            key={item}
            onClick={() => setActiveView('marketplace')}
            className={`text-sm font-bold whitespace-nowrap pb-3 px-1 transition-all relative ${item === 'Comercio P2P' && activeView !== 'profile' && activeView !== 'orders' ? 'text-white' : 'text-slate-500 hover:text-white'}`}
          >
            {item}
            {item === 'Comercio P2P' && activeView !== 'profile' && activeView !== 'orders' && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white rounded-full"></div>}
          </button>
        ))}
        <div className="ml-auto flex gap-6 pb-3">
          <button
            onClick={() => setActiveView('orders')}
            className={`text-sm font-bold transition-all relative ${activeView === 'orders' ? 'text-white' : 'text-slate-500 hover:text-white'}`}
          >
            Mis pedidos
            {activeView === 'orders' && <div className="absolute bottom-[-5px] left-0 right-0 h-[3px] bg-white rounded-full"></div>}
          </button>
          <button
            onClick={() => setActiveView('profile')}
            className={`text-sm font-bold transition-all relative ${activeView === 'profile' ? 'text-white' : 'text-slate-500 hover:text-white'}`}
          >
            Perfil
            {activeView === 'profile' && <div className="absolute bottom-[-5px] left-0 right-0 h-[3px] bg-white rounded-full"></div>}
          </button>
        </div>
      </div>

      {activeView === 'orders' ? (
        <div className={styles.ordersContainer}>
          <div className={styles.ordersSidebar}>
            <div className={styles.sidebarOrderItem}><FaChartLine /> Orden de futuros</div>
            <div className={styles.sidebarOrderItem}><FaExchangeAlt /> Orden Spot</div>
            <div className={styles.sidebarOrderItem}><FaHistory /> Historial de conversión</div>
            <div className={styles.sidebarOrderItem}><FaWallet /> historia financiera</div>
            <div className={`${styles.sidebarOrderItem} ${styles.sidebarOrderActive}`}><FaHandshake /> Órdenes P2P</div>
            <div className={styles.sidebarOrderItem}><FaBtc /> Órdenes Fiat</div>
            <div className={styles.sidebarOrderItem}><FaRegIdBadge /> Órdenes de compra/venta de criptomonedas</div>
          </div>

          <div className={styles.ordersMainContent}>
            <div className={styles.ordersTabs}>
              <div className={`${styles.orderTab} ${styles.orderTabActive}`}>En curso</div>
              <div className={styles.orderTab}>Terminado</div>
            </div>

            <div className={styles.ordersFilters}>
              <div className={styles.filterBox}>2026-01-17 - 2026-04-17 <FaRegIdBadge /></div>
              <div className={styles.filterBox}><span className={styles.filterLabel}>Lado</span> Todo</div>
              <div className={styles.filterBox}><span className={styles.filterLabel}>Cripto</span> Todo</div>
              <div className={styles.filterBox}><span className={styles.filterLabel}>Fiat</span> Todo</div>
              <div className={styles.filterBox}><span className={styles.filterLabel}>Esta...</span> Todo</div>
            </div>

            <div className={styles.ordersTable}>
              <div className={styles.ordersTableHeader}>
                <div>Orden</div>
                <div>Lado</div>
                <div>Cantidad</div>
                <div>Cantidad</div>
                <div>Precio</div>
                <div>Contraparte</div>
                <div className="text-right">Estado</div>
              </div>
              <div className={styles.noOrders}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                <p className={styles.noOrdersText}>Sin datos disponibles</p>
              </div>
            </div>
          </div>
        </div>
      ) : activeView === 'profile' ? (
        <div className={styles.profileContainer}>
          <div className={styles.profileHeader}>
            <div className={styles.profileAvatar}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="#a4c639"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08s5.97 1.09 6 3.08c-1.29 1.94-3.5 3.22-6 3.22z" /></svg>
            </div>
            <div className={styles.profileInfo}>
              <div className={styles.profileEmail}>
                {currentUser?.email ? `${currentUser.email.split('@')[0].substring(0, 3)}****@${currentUser.email.split('@')[1]}` : 'Cargando...'}
                <span className={styles.userBadge}>Usuario habitual</span>
              </div>
              <div className={styles.uidText}>
                UID: {currentUser?.uid?.substring(0, 8) || '********'}
                <FaRegIdBadge className="cursor-pointer hover:text-white" />
              </div>
            </div>
          </div>

          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <h3 className={styles.statTitle}>Últimos 30 días</h3>
              <div className={styles.statRow}>
                <span>Pedidos de 30 días</span>
                <span className="opacity-40">--</span>
              </div>
              <div className={styles.statRow}>
                <div className={styles.statLabelSub}><div className={`${styles.statBar} ${styles.barGreen}`}></div> Comprar</div>
                <span>0</span>
              </div>
              <div className={styles.statRow}>
                <div className={styles.statLabelSub}><div className={`${styles.statBar} ${styles.barRed}`}></div> Vender</div>
                <span>0</span>
              </div>
              <div className={styles.statDivider}></div>
              <div className={styles.statRow}>
                <span>Tasa de finalización de 30 días</span>
                <span className="text-[var(--accent)]">0.00%</span>
              </div>
              <div className={styles.statRow}>
                <span className={styles.statLabelSub}>Monto total (USDT)</span>
                <span>0.00</span>
              </div>
            </div>

            <div className={styles.statCard}>
              <h3 className={styles.statTitle}>Total</h3>
              <div className={styles.statRow}>
                <span>Órdenes totales</span>
                <span className="opacity-40">--</span>
              </div>
              <div className={styles.statRow}>
                <div className={styles.statLabelSub}><div className={`${styles.statBar} ${styles.barGreen}`}></div> Comprar</div>
                <span>0</span>
              </div>
              <div className={styles.statRow}>
                <div className={styles.statLabelSub}><div className={`${styles.statBar} ${styles.barRed}`}></div> Vender</div>
                <span>0</span>
              </div>
              <div className={styles.statDivider}></div>
              <div className={styles.statRow}>
                <span>Tasa total de finalización</span>
                <span className="text-[var(--accent)]">0.00%</span>
              </div>
              <div className={styles.statRow}>
                <span className={styles.statLabelSub}>Monto total (USDT)</span>
                <span>0.00</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>

          {/* Header Bitunix Style */}
          <div className={styles.marketplaceHeader}>
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

            <div className="flex flex-wrap items-center gap-4 mt-4">
              <div className="flex items-center gap-2 bg-[#14151a] p-2 rounded-lg border border-white/5">
                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] text-white">T</div>
                <select
                  value={activeAsset}
                  onChange={(e) => setActiveAsset(e.target.value)}
                  className="bg-transparent text-white text-sm font-bold outline-none cursor-pointer pr-4"
                >
                  {assets.map(a => <option key={a.id} value={a.id} className="bg-[#14151a]">{a.name}</option>)}
                </select>
              </div>

              <div className="bg-[#14151a] px-4 py-2 rounded-lg border border-white/5 min-w-[120px]">
                <input
                  type="text"
                  placeholder="0.00"
                  className="bg-transparent text-white text-sm font-bold outline-none w-full"
                  value={amountFilter}
                  onChange={(e) => setAmountFilter(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 bg-[#14151a] p-2 rounded-lg border border-white/5">
                <div className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center text-[10px] text-white">Bs</div>
                <select
                  value={fiatFilter}
                  onChange={(e) => setFiatFilter(e.target.value)}
                  className="bg-transparent text-white text-sm font-bold outline-none cursor-pointer pr-4"
                >
                  {fiats.map(f => <option key={f} value={f} className="bg-[#14151a]">{f}</option>)}
                </select>
              </div>

              <div className="bg-[#14151a] px-4 py-2 rounded-lg border border-white/5">
                <select
                  className="bg-transparent text-slate-400 text-sm font-bold outline-none cursor-pointer"
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                >
                  <option value="all">Todos los métodos de pago</option>
                  {paymentOptions.map(p => <option key={p} value={p} className="bg-[#14151a]">{p}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Offers Table */}
          <div className={styles.offersSection}>
            <div className={styles.tableHeader}>
              <div>Comerciante</div>
              <div>Precio</div>
              <div>Cantidad / Límite</div>
              <div>Método de pago</div>
              <div className="text-right">Operar</div>
            </div>

            {loading ? (
              <div className="py-24 text-center">
                <div className="w-10 h-10 border-4 border-[var(--accent)]/10 border-t-[var(--accent)] rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Buscando Comerciantes...</p>
              </div>
            ) : filteredOffers.length === 0 ? (
              <div className="py-24 text-center opacity-30">
                <FaHistory size={60} className="mx-auto mb-4" />
                <p className="text-sm font-bold text-slate-500">No hay ofertas disponibles</p>
              </div>
            ) : (
              filteredOffers.map((offer) => {
                const profile = userProfiles[offer.ownerId];
                const isOnline = profile?.lastSeen && (new Date() - profile.lastSeen.toDate()) < 10 * 60 * 1000;
                const initials = (profile?.displayName || profile?.username || offer.ownerEmail).substring(0, 1).toUpperCase();

                return (
                  <div key={offer.id} className={styles.tableRow}>
                    {/* Advertiser */}
                    <div>
                      <div className={styles.advertiserInfo}>
                        <div className={styles.avatar} style={{ backgroundColor: `hsl(${offer.ownerId.charCodeAt(0) * 10}, 70%, 50%)` }}>
                          {initials}
                          {isOnline && <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-black rounded-full" />}
                        </div>
                        <div>
                          <h4 className={styles.advertiserName}>
                            {profile?.displayName || profile?.username || offer.ownerEmail.split('@')[0]}
                          </h4>
                          <p className={styles.trustMetrics}>
                            1 Órdenes | 100.00% | <FaRegClock className="inline mr-1" /> {getTimeAgo(offer.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Price */}
                    <div>
                      <h3 className={styles.priceText}>
                        {offer.price.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className={styles.fiatUnit}>{offer.fiatCurrency}</span>
                      </h3>
                    </div>

                    {/* Limits */}
                    <div>
                      <div className={styles.limitRow}>
                        {offer.amount.toLocaleString()} {offer.coin.split('-')[0]}
                      </div>
                      <div className={styles.limitValue}>
                        10,000.00 - {(offer.amount * offer.price).toLocaleString()} {offer.fiatCurrency}
                      </div>
                    </div>

                    {/* Payment */}
                    <div>
                      <div className={styles.paymentList}>
                        {offer.paymentMethods.map(pm => (
                          <div key={pm} className={styles.paymentTag} title={pm}>
                            <div className="w-full h-full bg-blue-500 flex items-center justify-center text-[8px] text-white">
                              {pm === 'Binance Pay' ? 'B' : pm === 'Pago Móvil' ? 'PM' : 'P'}
                            </div>
                          </div>
                        ))}
                        <FaCheckCircle className="text-blue-500 ml-1" size={14} />
                      </div>
                    </div>

                    {/* Action */}
                    <div className="text-right">
                      <button
                        onClick={() => {
                          if (!currentUser) return (window.location.hash = '#/login');
                          // Trading logic
                        }}
                        className={activeSide === 'sell' ? styles.buyButtonBinance : styles.sellButtonBinance}
                      >
                        {activeSide === 'sell' ? 'Comprar' : 'Vender'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Tutorial Section: ¿Cómo utilizar el comercio P2P? */}
          <div className={styles.howToSection}>
            <h2 className={styles.howToTitle}>¿Cómo utilizar el comercio P2P?</h2>

            <div className={styles.howToTabs}>
              <button className={`${styles.howToTab} ${styles.howToTabActive}`}>Comprar cripto</button>
              <button className={styles.howToTab}>Vender</button>
            </div>

            <div className={styles.stepsGrid}>
              {/* Card 1 */}
              <div className={styles.stepCard}>
                <div className={styles.stepIcon}>
                  <FaExternalLinkAlt />
                </div>
                <h3 className={styles.stepTitle}>Realizar pedido</h3>
                <p className={styles.stepDescription}>
                  Seleccione un precio, método de pago y oferta de criptomonedas del mercado que cumpla con sus requisitos,
                  ingrese el monto y la cantidad de la compra y realice su pedido. Después de realizar su pedido,
                  la plataforma mantendrá sus criptoactivos bajo custodia segura.
                </p>
              </div>

              {/* Card 2 */}
              <div className={styles.stepCard}>
                <div className={styles.stepIcon}>
                  <FaUserCheck />
                </div>
                <h3 className={styles.stepTitle}>Aceptar cripto</h3>
                <p className={styles.stepDescription}>
                  Después de recibir el pago, el vendedor confirma que se ha recibido el pago y la criptomoneda
                  custodiada se liberará a su cuenta de inmediato. Puede ver las criptomonedas recibidas consultando su cuenta de fondos.
                </p>
              </div>

              {/* Card 3 */}
              <div className={styles.stepCard}>
                <div className={styles.stepIcon}>
                  <FaWallet />
                </div>
                <h3 className={styles.stepTitle}>Liberar criptografía</h3>
                <p className={styles.stepDescription}>
                  La criptomoneda se entregará al comprador sólo después de que se haya confirmado el pago total por parte del comprador.
                </p>
              </div>
            </div>
          </div>

          {/* FAQ Section: Preguntas frecuentes */}
          <div className={styles.faqSection}>
            <h2 className={styles.faqTitle}>Preguntas frecuentes</h2>

            {[
              '¿Qué es el comercio P2P?',
              '¿Cómo garantizar la seguridad de la transacción?',
              '¿Qué métodos de pago se admiten para el comercio P2P?',
              '¿Cómo cancelo un pedido P2P?',
              '¿Cómo iniciar el comercio P2P?'
            ].map((q, idx) => (
              <div key={idx} className={styles.faqItem}>
                <span className={styles.faqQuestion}>{q}</span>
                <span className={styles.faqIcon}>+</span>
              </div>
            ))}
          </div>

          {/* Support Bubble */}
          <div className={styles.supportBubble}>
            <FaHeadset />
          </div>

          {/* Modal Bitunix Style */}
          <Modal
            show={showCreateOfferModal}
            onClose={() => setShowCreateOfferModal(false)}
            title="Nueva Publicación P2P"
            className={styles.binanceModal}
          >
            <div className={styles.modalInner}>
              <form onSubmit={handleCreateOffer} className="space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Operación</label>
                    <select
                      className="bg-[#14151a] border border-white/5 p-4 rounded-xl text-white outline-none"
                      value={newOffer.type}
                      onChange={e => setNewOffer({ ...newOffer, type: e.target.value })}
                    >
                      <option value="sell">QUIERO VENDER</option>
                      <option value="buy">QUIERO COMPRAR</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Activo</label>
                    <select
                      className="bg-[#14151a] border border-white/5 p-4 rounded-xl text-white outline-none"
                      value={newOffer.coin}
                      onChange={e => setNewOffer({ ...newOffer, coin: e.target.value })}
                    >
                      {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Cantidad</label>
                    <input
                      type="number"
                      className="bg-[#14151a] border border-white/5 p-4 rounded-xl text-white outline-none"
                      value={newOffer.amount}
                      onChange={e => setNewOffer({ ...newOffer, amount: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Precio</label>
                    <input
                      type="number"
                      className="bg-[#14151a] border border-white/5 p-4 rounded-xl text-white outline-none"
                      value={newOffer.price}
                      onChange={e => setNewOffer({ ...newOffer, price: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <button type="submit" className="w-full py-5 bg-[var(--accent)] text-black rounded-xl font-bold uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all">
                  Publicar Ahora
                </button>
              </form>
            </div>
          </Modal>
        </>
      )}
    </div>
  );
};

export default P2P_Marketplace;
