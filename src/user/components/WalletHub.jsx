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
        }, (err) => {
            console.error("error fetching user balance:", err);
            setLoading(false); // Safety fallback
        });

        const safetyTimeout = setTimeout(() => {
            setLoading(false);
        }, 3000);

        const qAddr = query(collection(db, 'depositAddresses'), where('isActive', '==', true));
        const unsubAddr = onSnapshot(qAddr, (snapshot) => {
            const addresses = {};
            snapshot.docs.forEach(doc => addresses[doc.id] = doc.data().address);
            setDepositAddresses(addresses);
        }, (err) => console.error(err));

        const depositsQ = query(collection(db, 'deposits'), where('userId', '==', currentUser.uid));
        const withdrawalsQ = query(collection(db, 'withdrawals'), where('userId', '==', currentUser.uid));

        const botsQ = query(collection(db, 'userBots'), where('userId', '==', currentUser.uid));
        const unsubBots = onSnapshot(botsQ, snap => {
            setUserBots(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        const updateHistory = () => {
            // Placeholder for real logic (similar to previous WalletHub)
        };

        return () => {
            unsubUser();
            unsubAddr();
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
        { id: 'spot', label: 'Cuenta Spot', icon: FaChartLine },
        { id: 'finances', label: 'Cuenta financiera', icon: FaExchangeAlt },
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

    if (loading) return <div className="p-20 text-center text-white bg-black min-h-screen">Cargando...</div>;

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

                    <h1 className={styles.pageTitle}>{sidebarItems.find(i => i.id === activeTab)?.label}</h1>

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
                                    {showBalance ? totalEstimatedBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '******'}
                                    <span className={styles.currency}>USDT <FaChevronRight size={10} className="inline ml-2 opacity-50" /></span>
                                </div>
                                <div className={styles.balanceFiat}>
                                    ≈ ${showBalance ? totalEstimatedBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '******'}
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
                        <div className="bg-[#1e2026] p-8 rounded-3xl border border-white/5 space-y-8 animate-in fade-in duration-300">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-2 block uppercase">Moneda</label>
                                    <select
                                        value={selectedDepositCrypto}
                                        onChange={(e) => setSelectedDepositCrypto(e.target.value)}
                                        className="w-full bg-black border border-white/10 rounded-xl p-4 text-white outline-none focus:border-[var(--accent)]"
                                    >
                                        {cryptoOptions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                    </select>
                                </div>
                                <div className="bg-white p-4 rounded-2xl flex flex-col items-center">
                                    {depositQrUrl ? <img src={depositQrUrl} alt="QR" className="w-40 h-40" /> : <div className="w-40 h-40 bg-slate-100 animate-pulse"></div>}
                                </div>
                            </div>
                            <div className="p-6 bg-black rounded-xl border border-white/5 flex items-center justify-between">
                                <div className="overflow-hidden">
                                    <p className="text-[10px] text-slate-500 font-black mb-1 uppercase">Dirección ({selectedDepositCrypto})</p>
                                    <p className="text-sm font-mono text-[var(--accent)] break-all">{depositAddresses[selectedDepositCrypto] || 'No disponible'}</p>
                                </div>
                                <button className="p-4 hover:bg-white/5 rounded-full" onClick={() => { navigator.clipboard.writeText(depositAddresses[selectedDepositCrypto]); showSuccess('Copiado'); }}>
                                    <FaCopy />
                                </button>
                            </div>
                            <form onSubmit={handleAddDeposit} className="space-y-4">
                                <input type="number" placeholder="Monto enviado" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} className="w-full bg-black border border-white/10 p-4 rounded-xl outline-none" />
                                <input type="text" placeholder="TXID / Hash" value={txHash} onChange={e => setTxHash(e.target.value)} className="w-full bg-black border border-white/10 p-4 rounded-xl outline-none" />
                                <button type="submit" className="w-full bg-[var(--accent)] text-black font-black py-4 rounded-xl">Confirmar Depósito</button>
                            </form>
                        </div>
                    )}

                    {activeTab === 'withdraw' && (
                        <div className="bg-[#1e2026] p-8 rounded-3xl border border-white/5 space-y-8 animate-in fade-in duration-300">
                            <form onSubmit={handleAddWithdrawal} className="space-y-6">
                                <select value={withdrawCurrency} onChange={e => setWithdrawCurrency(e.target.value)} className="w-full bg-black border border-white/10 p-4 rounded-xl outline-none">
                                    {cryptoOptions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                </select>
                                <input type="number" placeholder="Monto" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} className="w-full bg-black border border-white/10 p-4 rounded-xl outline-none" />
                                <input type="text" placeholder="Dirección de billetera" value={withdrawAddress} onChange={e => setWithdrawAddress(e.target.value)} className="w-full bg-black border border-white/10 p-4 rounded-xl outline-none" />
                                <button type="submit" className="w-full bg-[var(--accent)] text-black font-black py-4 rounded-xl">Retirar Fondos</button>
                            </form>
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="bg-[#1e2026] rounded-3xl border border-white/5 overflow-hidden animate-in fade-in duration-300">
                            <div className="p-8 border-b border-white/5 bg-white/[0.01]">
                                <h3 className="text-xl font-black text-white uppercase tracking-tighter">Historial Transaccional</h3>
                                <p className="text-slate-500 text-[10px] font-black uppercase mt-1">Registros de tus movimientos recientes</p>
                            </div>
                            <div className="p-10 text-center text-slate-500">
                                <FaHistory size={40} className="mx-auto mb-4 opacity-20" />
                                <p className="text-xs uppercase font-black tracking-widest">No hay transacciones recientes para mostrar</p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'bot' && (
                        <div className="bg-[#1e2329] rounded-xl border border-white/5 p-8 animate-in fade-in duration-300">
                            <div className="flex gap-6 mb-8 text-[11px] font-black uppercase text-[#848e9c] border-b border-white/5 pb-4">
                                <span className="text-[#F3BA2F] border-b-2 border-[#F3BA2F] pb-4 -mb-[17px]">Bots de spot</span>
                                <span className="hover:text-white cursor-pointer">UM Grid</span>
                                <span className="hover:text-white cursor-pointer">CM Grid</span>
                                <span className="hover:text-white cursor-pointer">Position Snowball</span>
                                <span className="hover:text-white cursor-pointer">Futures DCA</span>
                            </div>

                            <div className="flex justify-between items-start mb-10">
                                <div>
                                    <p className="text-[#848e9c] text-xs font-bold mb-2">Saldo (USDT)</p>
                                    <p className="text-2xl font-black text-white">
                                        {userBots.reduce((acc, b) => acc + parseFloat(b.config?.capital || 0), 0).toFixed(8)}
                                    </p>
                                    <p className="text-[#848e9c] text-xs mt-1">
                                        ≈ ${userBots.reduce((acc, b) => acc + parseFloat(b.config?.capital || 0), 0).toFixed(2)}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[#848e9c] text-xs font-bold mb-2">Ganancias totales (USDT)</p>
                                    <p className="text-2xl font-black text-[#00C087]">
                                        {/* Ideally syncs with live stats, here we'll mock a small dynamic PnL or 0 for now as WalletHub doesn't store BotZone's live simulator */}
                                        +0.00000000
                                    </p>
                                    <p className="text-[#00C087] text-xs mt-1">≈ $0.00</p>
                                </div>
                            </div>

                            <div className="flex gap-4 mb-6">
                                <button onClick={() => setBotSubTab('en_ejecucion')} className={`px-4 py-2 text-xs font-bold rounded-lg ${botSubTab === 'en_ejecucion' ? 'bg-[#2b3139] text-white' : 'text-[#848e9c] hover:text-white'}`}>En ejecución</button>
                                <button onClick={() => setBotSubTab('activos')} className={`px-4 py-2 text-xs font-bold rounded-lg ${botSubTab === 'activos' ? 'bg-[#2b3139] text-white' : 'text-[#848e9c] hover:text-white'}`}>Activos</button>
                            </div>

                            <table className="w-full text-left text-xs text-[#848e9c] border-collapse">
                                <thead>
                                    <tr className="border-b border-white/5">
                                        <th className="py-4 font-normal">Estrategia</th>
                                        <th className="py-4 font-normal">Inversión inicial</th>
                                        <th className="py-4 font-normal">Saldo actual</th>
                                        <th className="py-4 font-normal text-right">Acción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {userBots.map(bot => (
                                        <tr key={bot.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                                            <td className="py-4 text-white font-bold">{bot.config?.pair || 'BOT'} <span className="text-[9px] text-[#F3BA2F] ml-2 border border-[#F3BA2F]/30 px-1 rounded">{bot.botName || 'Grid'}</span></td>
                                            <td className="py-4 text-white">{parseFloat(bot.config?.capital || 0).toFixed(4)} USDT</td>
                                            <td className="py-4 text-white">{parseFloat(bot.config?.capital || 0).toFixed(4)} USDT</td>
                                            <td className="py-4 text-right">
                                                <div className="flex justify-end gap-3">
                                                    <button className="text-[#848e9c] hover:text-red-500 border border-white/10 hover:border-red-500/50 p-2 rounded bg-white/5 transition-colors" title="Detener Bot">
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10" /></svg>
                                                    </button>
                                                    <button className="text-[#848e9c] hover:text-white border border-white/10 hover:border-white/30 p-2 rounded bg-white/5 transition-colors" title="Ver Detalles">
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
                                                    </button>
                                                    <button className="text-[#848e9c] hover:text-white border border-white/10 hover:border-white/30 p-2 rounded bg-white/5 transition-colors" title="Más opciones">
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {userBots.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="py-10 text-center opacity-50">No hay información de los datos.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WalletHub;
