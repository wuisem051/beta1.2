import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { db } from '../../services/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, doc, updateDoc, setDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useError } from '../../context/ErrorContext';
import { ThemeContext } from '../../context/ThemeContext';
import QRCode from 'qrcode';
import {
    FaWallet, FaArrowDown, FaArrowUp, FaHistory, FaCopy,
    FaCheckCircle, FaTimesCircle, FaClock, FaChartLine,
    FaUsers, FaEye, FaEyeSlash, FaExchangeAlt,
    FaRobot, FaChevronRight, FaQuestionCircle, FaBtc
} from 'react-icons/fa';
import useCryptoPrice from '../../hooks/useCryptoPrice';
import styles from './WalletHub.module.css';

const WalletHub = ({ initialTab: propTab, dashboardMaxWidth }) => {
    const { currentUser } = useAuth();
    const { showError, showSuccess } = useError();
    const { darkMode } = useContext(ThemeContext);
    const location = useLocation();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('overview');
    const [showBalance, setShowBalance] = useState(true);

    // Wallet States
    const [userBalances, setUserBalances] = useState({
        USD: 0,
        'USDT-TRC20': 0,
        BTC: 0,
        LTC: 0,
        DOGE: 0,
        TRX: 0,
        VES: 0
    });
    const [loading, setLoading] = useState(true);
    const [depositAddresses, setDepositAddresses] = useState({});
    const [selectedDepositCrypto, setSelectedDepositCrypto] = useState('USDT-TRC20');
    const [depositAmount, setDepositAmount] = useState('');
    const [txHash, setTxHash] = useState('');
    const [depositQrUrl, setDepositQrUrl] = useState('');
    const [isProcessingDeposit, setIsProcessingDeposit] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawCurrency, setWithdrawCurrency] = useState('USDT-TRC20');
    const [withdrawAddress, setWithdrawAddress] = useState('');
    const [withdrawBinanceId, setWithdrawBinanceId] = useState('');
    const [useBinancePay, setUseBinancePay] = useState(false);
    const [isProcessingWithdraw, setIsProcessingWithdraw] = useState(false);
    const [financialHistory, setFinancialHistory] = useState([]);
    const [isCollectiveModalOpen, setIsCollectiveModalOpen] = useState(false);
    const [collectiveAmount, setCollectiveAmount] = useState('');
    const [isProcessingCollective, setIsProcessingCollective] = useState(false);
    const [userBots, setUserBots] = useState([]);
    const [botSubTab, setBotSubTab] = useState('en_ejecucion');

    // Crypto prices
    const { price: btcPrice } = useCryptoPrice('bitcoin');
    const { price: ltcPrice } = useCryptoPrice('litecoin');
    const { price: dogePrice } = useCryptoPrice('dogecoin');
    const { price: trxPrice } = useCryptoPrice('tron');

    const rates = useMemo(() => ({
        BTC: btcPrice || 43000,
        LTC: ltcPrice || 70,
        DOGE: dogePrice || 0.08,
        TRX: trxPrice || 0.11,
        VES: 0.027
    }), [btcPrice, ltcPrice, dogePrice, trxPrice]);

    const totalEstimatedBalance = useMemo(() => {
        if (!userBalances) return 0;
        return (userBalances.USD || 0) +
            (userBalances['USDT-TRC20'] || 0) +
            ((userBalances.BTC || 0) * rates.BTC) +
            ((userBalances.LTC || 0) * rates.LTC) +
            ((userBalances.DOGE || 0) * rates.DOGE) +
            ((userBalances.TRX || 0) * rates.TRX) +
            ((userBalances.VES || 0) * rates.VES);
    }, [userBalances, rates]);

    const cryptoOptions = [
        { value: 'BTC', label: 'Bitcoin', icon: '₿', color: '#f7931a', network: 'Bitcoin' },
        { value: 'USDT-TRC20', label: 'USDT (TRC20)', icon: '₮', color: '#26a17b', network: 'Tron (TRC20)' },
        { value: 'TRX', label: 'Tron', icon: '🔴', color: '#ef0027', network: 'Tron' },
        { value: 'LTC', label: 'Litecoin', icon: 'Ł', color: '#345d9d', network: 'Litecoin' },
        { value: 'DOGE', label: 'Dogecoin', icon: 'Ð', color: '#c2a633', network: 'Dogecoin' }
    ];

    // Listen to data
    useEffect(() => {
        if (!currentUser?.uid) return;
        const userDocRef = doc(db, 'users', currentUser.uid);
        const unsubUser = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setUserBalances({
                    BTC: data.balanceBTC || 0,
                    LTC: data.balanceLTC || 0,
                    DOGE: data.balanceDOGE || 0,
                    'USDT-TRC20': data.balanceUSDTTRC20 || 0,
                    TRX: data.balanceTRX || 0,
                    VES: data.balanceVES || 0,
                    USD: data.balanceUSD || 0,
                });
            }
            setLoading(false);
        }, (err) => { console.error(err); setLoading(false); });

        setTimeout(() => setLoading(false), 3000);

        const qAddr = query(collection(db, 'depositAddresses'), where('isActive', '==', true));
        const unsubAddr = onSnapshot(qAddr, (snapshot) => {
            const addresses = {};
            snapshot.docs.forEach(doc => addresses[doc.id] = doc.data().address);
            setDepositAddresses(addresses);
        }, (err) => console.error(err));

        // ✅ FIX 1: Suscripción REAL a depósitos y retiros
        const depositsQ = query(
            collection(db, 'deposits'),
            where('userId', '==', currentUser.uid)
        );
        const withdrawalsQ = query(
            collection(db, 'withdrawals'),
            where('userId', '==', currentUser.uid)
        );

        let deposits = [];
        let withdrawals = [];

        const mergeAndSort = () => {
            const safeDeposits = Array.isArray(deposits) ? deposits : [];
            const safeWithdrawals = Array.isArray(withdrawals) ? withdrawals : [];

            const all = [
                ...safeDeposits.map(d => ({ ...d, _type: 'deposit' })),
                ...safeWithdrawals.map(w => ({ ...w, _type: 'withdrawal' }))
            ].sort((a, b) => {
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
                return dateB - dateA;
            });
            setFinancialHistory(all);
        };

        const unsubDeposits = onSnapshot(depositsQ, snap => {
            deposits = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            mergeAndSort();
        }, err => console.error(err));

        const unsubWithdrawals = onSnapshot(withdrawalsQ, snap => {
            withdrawals = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            mergeAndSort();
        }, err => console.error(err));

        const botsQ = query(collection(db, 'userBots'), where('userId', '==', currentUser.uid));
        const unsubBots = onSnapshot(botsQ, snap => {
            setUserBots(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => {
            unsubUser();
            unsubAddr();
            unsubDeposits();
            unsubWithdrawals();
            unsubBots();
        };
    }, [currentUser]);

    // QR Code generation
    useEffect(() => {
        const address = depositAddresses[selectedDepositCrypto];
        if (address) {
            QRCode.toDataURL(address, { width: 200, margin: 1 }).then(setDepositQrUrl);
        }
    }, [selectedDepositCrypto, depositAddresses]);

    const sidebarItems = [
        { id: 'overview', label: 'Activos', icon: FaWallet },
        // ✅ FIX 2: Tabs vacías reasignadas a secciones funcionales
        { id: 'bot', label: 'Cuenta Bot', icon: FaRobot },
        { id: 'deposit', label: 'Depositar', icon: FaArrowDown },
        { id: 'withdraw', label: 'Retirar', icon: FaArrowUp },
        { id: 'history', label: 'Historial de transacciones', icon: FaHistory, hasArrow: true }
    ];

    const handleAddDeposit = async (e) => {
        e.preventDefault();
        if (isProcessingDeposit) return;
        if (!depositAmount || parseFloat(depositAmount) <= 0) return showError('Monto inválido');
        if (!txHash.trim()) return showError('TxHash requerido');
        setIsProcessingDeposit(true);
        try {
            await addDoc(collection(db, 'deposits'), {
                userId: currentUser.uid,
                userEmail: currentUser.email,
                currency: selectedDepositCrypto,
                amount: parseFloat(depositAmount),
                txHash: txHash.trim(),
                status: 'Pendiente',
                createdAt: new Date()
            });
            showSuccess('Deposit reported successfully');
            setDepositAmount(''); setTxHash('');
            setActiveTab('history');
        } catch (err) { showError(err.message); } finally { setIsProcessingDeposit(false); }
    };

    const handleAddWithdrawal = async (e) => {
        e.preventDefault();
        if (isProcessingWithdraw) return;
        const amount = parseFloat(withdrawAmount);
        const balanceField = withdrawCurrency === 'USDT-TRC20' ? 'balanceUSDTTRC20' : `balance${withdrawCurrency}`;
        const balance = userBalances[withdrawCurrency] || 0;
        if (!amount || amount <= 0 || amount > balance) return showError('Monto inválido');
        setIsProcessingWithdraw(true);
        try {
            await addDoc(collection(db, 'withdrawals'), {
                userId: currentUser.uid, amount, currency: withdrawCurrency,
                method: useBinancePay ? 'Binance Pay' : 'Wallet',
                addressOrId: useBinancePay ? withdrawBinanceId : withdrawAddress,
                status: 'Pendiente', createdAt: new Date()
            });
            await updateDoc(doc(db, 'users', currentUser.uid), { [balanceField]: balance - amount });
            showSuccess('Withdrawal requested');
            setWithdrawAmount(''); setActiveTab('history');
        } catch (err) { showError(err.message); } finally { setIsProcessingWithdraw(false); }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-[var(--bg-main)]">
            <div className="text-center">
                <div className="w-10 h-10 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-[var(--text-secondary)] text-xs font-black uppercase tracking-widest">Cargando billetera...</p>
            </div>
        </div>
    );


    return (
        <div className={styles.container}>
            <div className={styles.layout}>
                <div className={styles.sidebar}>
                    {sidebarItems.map(item => (
                        <div
                            key={item.id}
                            className={`${styles.sidebarItem} ${activeTab === item.id ? styles.sidebarActive : ''}`}
                            onClick={() => setActiveTab(item.id)}
                        >
                            <item.icon /> {item.label}
                        </div>
                    ))}
                </div>

                <div className={styles.mainContent}>
                    <div className={styles.headerActions}>
                        <button className={`${styles.actionBtn} ${styles.btnPrimary}`} onClick={() => setActiveTab('deposit')}>Depositar</button>
                        <button className={`${styles.actionBtn} ${styles.btnPrimary}`} onClick={() => navigate('/user/p2p-marketplace')}>Comprar cripto</button>
                        <button className={styles.actionBtn} onClick={() => setActiveTab('withdraw')}>Retirar</button>
                        <button className={styles.actionBtn}>Transferir</button>
                    </div>

                    <h1 className={`${styles.pageTitle} italic`}>{sidebarItems.find(i => i.id === activeTab)?.label}</h1>

                    {activeTab === 'overview' && (
                        <>
                            <div className={styles.balanceSection}>
                                <div className={styles.balanceLabel}>
                                    Activos totales
                                    <div className="cursor-pointer" onClick={() => setShowBalance(!showBalance)}>
                                        {showBalance ? <FaEye size={16} /> : <FaEyeSlash size={16} />}
                                    </div>
                                </div>
                                <div className={styles.balanceValue}>
                                    {showBalance ? totalEstimatedBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '••••••'}
                                    <span className={styles.currency}>USDT <FaChevronRight size={10} className="inline ml-2 opacity-50" /></span>
                                </div>
                                <div className={styles.balanceFiat}>
                                    ≈ ${showBalance ? totalEstimatedBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '••••••'}
                                </div>
                            </div>
                            <div className={styles.historyGrid}>
                                <div className={styles.supportCard}>
                                    <div className={styles.cardNumber}>1</div>
                                    <h3 className={styles.supportTitle}>¿Cómo depositar en MaxiOS?</h3>
                                    <span className={styles.supportLink}>Más información</span>
                                </div>
                                <div className={styles.supportCard}>
                                    <div className={styles.cardNumber}>2</div>
                                    <h3 className={styles.supportTitle}>Preguntas frecuentes sobre depósito</h3>
                                    <span className={styles.supportLink}>Más información</span>
                                </div>
                                <div className={styles.supportCard}>
                                    <div className={styles.cardNumber}>3</div>
                                    <h3 className={styles.supportTitle}>¿El depósito no ha llegado?</h3>
                                    <span className={styles.supportLink}>Más información</span>
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'deposit' && (
                        <div className="bg-[var(--bg-card)] p-8 rounded-[2rem] border border-[var(--border-color)] space-y-8 animate-in fade-in duration-300 shadow-xl">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <label className="text-[10px] font-black text-[var(--text-secondary)] mb-3 block uppercase tracking-widest">Moneda a Depositar</label>
                                    <select
                                        value={selectedDepositCrypto}
                                        onChange={(e) => setSelectedDepositCrypto(e.target.value)}
                                        className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl p-4 text-[var(--text-main)] outline-none focus:border-[var(--accent)] transition-colors"
                                    >
                                        {cryptoOptions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                    </select>
                                </div>
                                <div className="bg-white p-4 rounded-2xl flex flex-col items-center justify-center">
                                    {depositQrUrl ? <img src={depositQrUrl} alt="QR" className="w-40 h-40" /> : <div className="w-40 h-40 bg-slate-100 animate-pulse rounded-xl"></div>}
                                    <p className="text-black text-[9px] font-black uppercase tracking-widest mt-3 opacity-50">{selectedDepositCrypto}</p>
                                </div>
                            </div>
                            <div className="p-5 bg-[var(--bg-main)] rounded-2xl border border-[var(--border-color)] flex items-center justify-between gap-4">
                                <div className="overflow-hidden flex-1">
                                    <p className="text-[10px] text-[var(--text-secondary)] font-black mb-1 uppercase tracking-widest">Dirección de red ({selectedDepositCrypto})</p>
                                    <p className="text-sm font-mono text-[var(--accent)] break-all">{depositAddresses[selectedDepositCrypto] || 'No disponible'}</p>
                                </div>
                                <button className="p-3 bg-[var(--glass-bg)] hover:bg-[var(--border-color)] rounded-xl transition-colors flex-shrink-0" onClick={() => { navigator.clipboard.writeText(depositAddresses[selectedDepositCrypto]); showSuccess('Copiado'); }}>
                                    <FaCopy />
                                </button>
                            </div>
                            <form onSubmit={handleAddDeposit} className="space-y-4">
                                <input type="number" placeholder="Monto enviado" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-main)] p-4 rounded-2xl outline-none focus:border-[var(--accent)] transition-colors" />
                                <input type="text" placeholder="TXID / Hash de la transacción" value={txHash} onChange={e => setTxHash(e.target.value)} className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-main)] p-4 rounded-2xl outline-none focus:border-[var(--accent)] transition-colors font-mono text-sm" />
                                <button type="submit" disabled={isProcessingDeposit} className="w-full bg-[var(--accent)] text-black font-black py-5 rounded-2xl uppercase tracking-widest text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
                                    {isProcessingDeposit ? 'Procesando...' : 'Confirmar Depósito'}
                                </button>
                            </form>
                        </div>
                    )}

                    {activeTab === 'withdraw' && (
                        <div className="bg-[var(--bg-card)] p-8 rounded-[2rem] border border-[var(--border-color)] space-y-6 animate-in fade-in duration-300 shadow-xl">
                            <form onSubmit={handleAddWithdrawal} className="space-y-5">
                                <div>
                                    <label className="text-[10px] font-black text-[var(--text-secondary)] mb-3 block uppercase tracking-widest">Moneda</label>
                                    <select value={withdrawCurrency} onChange={e => setWithdrawCurrency(e.target.value)} className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-main)] p-4 rounded-2xl outline-none focus:border-[var(--accent)] transition-colors">
                                        {cryptoOptions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <div className="flex justify-between mb-3">
                                        <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Monto</label>
                                        <span className="text-[10px] font-black text-[var(--text-secondary)]">Disponible: <span className="text-[var(--accent)]">{(userBalances[withdrawCurrency] || 0).toFixed(4)} {withdrawCurrency}</span></span>
                                    </div>
                                    <input type="number" placeholder="0.00" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-main)] p-4 rounded-2xl outline-none focus:border-[var(--accent)] transition-colors text-lg font-bold" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-[var(--text-secondary)] mb-3 block uppercase tracking-widest">Dirección de billetera destino</label>
                                    <input type="text" placeholder="Ingresa la dirección..." value={withdrawAddress} onChange={e => setWithdrawAddress(e.target.value)} className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-main)] p-4 rounded-2xl outline-none focus:border-[var(--accent)] transition-colors font-mono text-sm" />
                                </div>
                                <button type="submit" disabled={isProcessingWithdraw} className="w-full bg-[var(--accent)] text-black font-black py-5 rounded-2xl uppercase tracking-widest text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
                                    {isProcessingWithdraw ? 'Procesando...' : 'Retirar Fondos'}
                                </button>
                            </form>
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="bg-[var(--bg-card)] rounded-[2rem] border border-[var(--border-color)] overflow-hidden animate-in fade-in duration-300 shadow-xl">
                            <div className="p-8 border-b border-[var(--border-color)] flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-black text-[var(--text-main)] uppercase tracking-tighter italic">Historial Transaccional</h3>
                                    <p className="text-[var(--text-secondary)] text-[10px] font-black uppercase mt-1 tracking-widest">Todos tus movimientos en tiempo real</p>
                                </div>
                                <span className="text-[10px] font-black text-[var(--text-secondary)] bg-[var(--glass-bg)] border border-[var(--border-color)] px-3 py-1 rounded-full">{financialHistory.length} registros</span>
                            </div>

                            {financialHistory.length === 0 ? (
                                <div className="p-20 text-center text-[var(--text-secondary)]">
                                    <FaHistory size={40} className="mx-auto mb-4 opacity-20" />
                                    <p className="text-xs uppercase font-black tracking-widest">No hay transacciones registradas</p>
                                    <p className="text-[10px] mt-2 opacity-50">Tus depósitos y retiros aparecerán aquí</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-[var(--border-color)]">
                                    {financialHistory.map(tx => {
                                        const isDeposit = tx._type === 'deposit';
                                        const date = tx.createdAt?.toDate ? tx.createdAt.toDate() : new Date(tx.createdAt || Date.now());
                                        const statusColor = {
                                            'Aprobado': 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
                                            'Completado': 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
                                            'Pendiente': 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
                                            'Rechazado': 'text-red-400 bg-red-400/10 border-red-400/20',
                                        }[tx.status] || 'text-[var(--text-secondary)] bg-[var(--glass-bg)] border-[var(--border-color)]';

                                        return (
                                            <div key={tx.id} className="flex items-center gap-5 px-8 py-5 hover:bg-[var(--glass-bg)] transition-colors">
                                                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${isDeposit ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-400'}`}>
                                                    {isDeposit ? <FaArrowDown size={14} /> : <FaArrowUp size={14} />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-black text-[var(--text-main)] uppercase tracking-tight">
                                                        {isDeposit ? 'Depósito' : 'Retiro'} · {tx.currency}
                                                    </p>
                                                    <p className="text-[10px] text-[var(--text-secondary)] font-mono mt-0.5 truncate opacity-60">
                                                        {tx.txHash || tx.addressOrId || '—'}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`text-sm font-black ${isDeposit ? 'text-emerald-500' : 'text-red-400'}`}>
                                                        {isDeposit ? '+' : '-'}{parseFloat(tx.amount || 0).toFixed(4)}
                                                    </p>
                                                    <p className="text-[9px] text-[var(--text-secondary)] font-bold mt-0.5 opacity-60">
                                                        {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border flex-shrink-0 ${statusColor}`}>
                                                    {tx.status || 'Pendiente'}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}


                    {activeTab === 'bot' && (
                        <div className="bg-[var(--bg-card)] rounded-[2rem] border border-[var(--border-color)] overflow-hidden animate-in fade-in duration-300 shadow-xl">
                            <div className="p-8 border-b border-[var(--border-color)]">
                                <div className="flex gap-6 text-[11px] font-black uppercase text-[var(--text-secondary)]">
                                    <span className="text-[var(--accent)] border-b-2 border-[var(--accent)] pb-2">Bots de spot</span>
                                    <span className="hover:text-[var(--text-main)] cursor-pointer transition-colors">UM Grid</span>
                                    <span className="hover:text-[var(--text-main)] cursor-pointer transition-colors">CM Grid</span>
                                    <span className="hover:text-[var(--text-main)] cursor-pointer transition-colors">Futures DCA</span>
                                </div>
                            </div>
                            <div className="p-8">
                                <div className="flex justify-between items-start mb-10">
                                    <div>
                                        <p className="text-[var(--text-secondary)] text-xs font-black mb-2 uppercase tracking-wider">Saldo (USDT)</p>
                                        <p className="text-3xl font-black text-[var(--text-main)] italic tracking-tighter">
                                            {userBots.reduce((acc, b) => acc + parseFloat(b.config?.capital || 0), 0).toFixed(4)}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[var(--text-secondary)] text-xs font-black mb-2 uppercase tracking-wider">Ganancias totales</p>
                                        <p className="text-3xl font-black text-emerald-500 italic tracking-tighter">+0.0000</p>
                                    </div>
                                </div>

                                <div className="flex gap-3 mb-6">
                                    <button onClick={() => setBotSubTab('en_ejecucion')} className={`px-4 py-2 text-xs font-black rounded-xl transition-all ${botSubTab === 'en_ejecucion' ? 'bg-[var(--glass-bg)] text-[var(--text-main)] border border-[var(--border-color)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'}`}>En ejecución</button>
                                    <button onClick={() => setBotSubTab('activos')} className={`px-4 py-2 text-xs font-black rounded-xl transition-all ${botSubTab === 'activos' ? 'bg-[var(--glass-bg)] text-[var(--text-main)] border border-[var(--border-color)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'}`}>Activos</button>
                                </div>

                                <table className="w-full text-left text-xs text-[var(--text-secondary)] border-collapse">
                                    <thead>
                                        <tr className="border-b border-[var(--border-color)]">
                                            <th className="py-4 font-black uppercase tracking-wider">Estrategia</th>
                                            <th className="py-4 font-black uppercase tracking-wider">Inversión inicial</th>
                                            <th className="py-4 font-black uppercase tracking-wider">Saldo actual</th>
                                            <th className="py-4 font-black uppercase tracking-wider text-right">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {userBots.map(bot => (
                                            <tr key={bot.id} className="border-b border-[var(--border-color)] hover:bg-[var(--glass-bg)] transition-colors">
                                                <td className="py-4 text-[var(--text-main)] font-bold">{bot.config?.pair || 'BOT'} <span className="text-[9px] text-[var(--accent)] ml-2 border border-[var(--accent)]/30 px-1.5 py-0.5 rounded-full">{bot.botName || 'Grid'}</span></td>
                                                <td className="py-4">{parseFloat(bot.config?.capital || 0).toFixed(4)} USDT</td>
                                                <td className="py-4">{parseFloat(bot.config?.capital || 0).toFixed(4)} USDT</td>
                                                <td className="py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button className="text-[var(--text-secondary)] hover:text-red-500 border border-[var(--border-color)] hover:border-red-500/50 p-2 rounded-xl bg-[var(--glass-bg)] transition-colors" title="Detener">
                                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10" /></svg>
                                                        </button>
                                                        <button className="text-[var(--text-secondary)] hover:text-[var(--text-main)] border border-[var(--border-color)] hover:border-[var(--accent)]/30 p-2 rounded-xl bg-[var(--glass-bg)] transition-colors" title="Ver Detalles">
                                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {userBots.length === 0 && (
                                            <tr>
                                                <td colSpan="4" className="py-16 text-center opacity-30">
                                                    <FaRobot size={32} className="mx-auto mb-3" />
                                                    <p className="text-xs uppercase font-black tracking-widest">No hay bots activos</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WalletHub;
