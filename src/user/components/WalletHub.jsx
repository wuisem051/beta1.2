import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { db } from '../../services/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, doc, updateDoc, setDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useError } from '../../context/ErrorContext';
import { ThemeContext } from '../../context/ThemeContext';
import QRCode from 'qrcode';
import { FaWallet, FaArrowDown, FaArrowUp, FaHistory, FaCopy, FaCheckCircle, FaTimesCircle, FaClock, FaChartLine, FaUsers } from 'react-icons/fa';
import useCryptoPrice from '../../hooks/useCryptoPrice';


const WalletHub = ({ initialTab: propTab }) => {
    const { currentUser } = useAuth();
    const { showError, showSuccess } = useError();
    const { darkMode } = useContext(ThemeContext);
    const location = useLocation();

    // Determinar la pestaña inicial basada en la prop o la URL
    const getInitialTab = () => {
        if (propTab) return propTab;
        const path = location.pathname;
        if (path.includes('deposits')) return 'deposit';
        if (path.includes('withdrawals')) return 'withdraw';
        if (path.includes('history')) return 'history';
        return 'overview';
    };

    const [activeTab, setActiveTab] = useState(getInitialTab());

    // Actualizar pestaña si cambia la URL
    useEffect(() => {
        const path = location.pathname;
        if (path.includes('deposits')) setActiveTab('deposit');
        else if (path.includes('withdrawals')) setActiveTab('withdraw');
        else if (path.includes('history')) setActiveTab('history');
        else if (path.includes('my-wallet')) setActiveTab('overview');
    }, [location.pathname]);

    // Estados Compartidos
    const [userBalances, setUserBalances] = useState({
        USD: 0,
        'USDT-TRC20': 0,
        USDTFiat: 0,
        BTC: 0,
        LTC: 0,
        DOGE: 0,
        TRX: 0,
        VES: 0
    });
    const [loading, setLoading] = useState(true);

    // Fetch real-time prices
    const { price: btcPrice } = useCryptoPrice('bitcoin');
    const { price: ltcPrice } = useCryptoPrice('litecoin');
    const { price: dogePrice } = useCryptoPrice('dogecoin');
    const { price: trxPrice } = useCryptoPrice('tron');

    // Estimaciones de fallback si la API falla
    const rates = useMemo(() => ({
        BTC: btcPrice || 43000,
        LTC: ltcPrice || 70,
        DOGE: dogePrice || 0.08,
        TRX: trxPrice || 0.11,
        VES: 0.027 // Aproximadamente 1/36
    }), [btcPrice, ltcPrice, dogePrice, trxPrice]);

    const totalEstimatedBalance = useMemo(() => {
        if (!userBalances) return 0;
        return (userBalances.USD || 0) +
            (userBalances['USDT-TRC20'] || 0) +
            (userBalances.USDTFiat || 0) +
            ((userBalances.BTC || 0) * rates.BTC) +
            ((userBalances.LTC || 0) * rates.LTC) +
            ((userBalances.DOGE || 0) * rates.DOGE) +
            ((userBalances.TRX || 0) * rates.TRX) +
            ((userBalances.VES || 0) * rates.VES);
    }, [userBalances, rates]);

    // Estados de Depósito
    const [depositAddresses, setDepositAddresses] = useState({});
    const [selectedDepositCrypto, setSelectedDepositCrypto] = useState('USDT-TRC20');
    const [depositAmount, setDepositAmount] = useState('');
    const [txHash, setTxHash] = useState('');
    const [depositQrUrl, setDepositQrUrl] = useState('');
    const [proofImageBase64, setProofImageBase64] = useState('');
    const [isProcessingDeposit, setIsProcessingDeposit] = useState(false);

    // Estados de Retiro
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawCurrency, setWithdrawCurrency] = useState('BTC');
    const [withdrawAddress, setWithdrawAddress] = useState('');
    const [withdrawBinanceId, setWithdrawBinanceId] = useState('');
    const [useBinancePay, setUseBinancePay] = useState(false);
    const [isProcessingWithdraw, setIsProcessingWithdraw] = useState(false);

    // Historial
    const [financialHistory, setFinancialHistory] = useState([]);

    // Estado Fondo Colectivo
    const [isCollectiveModalOpen, setIsCollectiveModalOpen] = useState(false);
    const [collectiveAmount, setCollectiveAmount] = useState('');
    const [isProcessingCollective, setIsProcessingCollective] = useState(false);

    const cryptoOptions = [
        { value: 'BTC', label: 'Bitcoin', icon: '₿', color: '#f7931a', network: 'Bitcoin' },
        { value: 'USDT-TRC20', label: 'USDT (TRC20)', icon: '₮', color: '#26a17b', network: 'Tron (TRC20)' },
        { value: 'TRX', label: 'Tron', icon: '🔴', color: '#ef0027', network: 'Tron' },
        { value: 'LTC', label: 'Litecoin', icon: 'Ł', color: '#345d9d', network: 'Litecoin' },
        { value: 'DOGE', label: 'Dogecoin', icon: 'Ð', color: '#c2a633', network: 'Dogecoin' }
    ];

    const fiatOptions = [
        { value: 'VES', label: 'Bolívares (VES)', icon: 'Bs', color: '#2563eb' },
        { value: 'USDTFiat', label: 'USDT (Fiat)', icon: '$', color: '#10b981' }
    ];

    // 1. Cargar Balances en Tiempo Real
    useEffect(() => {
        if (!currentUser?.uid) return;
        const userDocRef = doc(db, 'users', currentUser.uid);
        const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setUserBalances({
                    BTC: data.balanceBTC || 0,
                    LTC: data.balanceLTC || 0,
                    DOGE: data.balanceDOGE || 0,
                    'USDT-TRC20': data.balanceUSDTTRC20 || 0,
                    TRX: data.balanceTRX || 0,
                    VES: data.balanceVES || 0,
                    USDTFiat: data.balanceUSDTFiat || 0,
                    USD: data.balanceUSD || 0, // Añadido balance general en USD
                    paymentAddresses: data.paymentAddresses || {}
                });
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [currentUser]);

    // 2. Cargar Direcciones de Depósito
    useEffect(() => {
        const q = query(collection(db, 'depositAddresses'), where('isActive', '==', true));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const addresses = {};
            snapshot.docs.forEach(doc => addresses[doc.id] = doc.data().address);
            setDepositAddresses(addresses);
        });
        return () => unsubscribe();
    }, []);

    // 3. Generar QR de Depósito
    useEffect(() => {
        const address = depositAddresses[selectedDepositCrypto] || 'Dirección no configurada';
        if (address && address !== 'Dirección no configurada') {
            QRCode.toDataURL(address, { width: 200, margin: 1 }).then(setDepositQrUrl);
        } else {
            setDepositQrUrl('');
        }
    }, [selectedDepositCrypto, depositAddresses]);

    // 4. Cargar Historial Unificado (Depósitos, Retiros, Fondo, Arbitraje, Trading)
    useEffect(() => {
        if (!currentUser?.uid) return;

        const historyState = {
            DEPOSITS: [],
            WITHDRAWALS: [],
            COLLECTIVE: [],
            ARBITRAGE: [],
            TRADING: []
        };

        const updateUnifiedHistory = () => {
            const combined = [
                ...historyState.DEPOSITS,
                ...historyState.WITHDRAWALS,
                ...historyState.COLLECTIVE,
                ...historyState.ARBITRAGE,
                ...historyState.TRADING
            ].sort((a, b) => b.createdAt - a.createdAt);
            setFinancialHistory(combined);
        };

        const depositsQ = query(collection(db, 'deposits'), where('userId', '==', currentUser.uid));
        const unsubDeposits = onSnapshot(depositsQ, (snap) => {
            historyState.DEPOSITS = snap.docs.map(d => ({
                ...d.data(), id: d.id, type: 'DEPOSIT',
                createdAt: d.data().createdAt?.toDate() || new Date()
            }));
            updateUnifiedHistory();
        });

        const withdrawalsQ = query(collection(db, 'withdrawals'), where('userId', '==', currentUser.uid));
        const unsubWithdraws = onSnapshot(withdrawalsQ, (snap) => {
            historyState.WITHDRAWALS = snap.docs.map(d => ({
                ...d.data(), id: d.id, type: 'WITHDRAW',
                createdAt: d.data().createdAt?.toDate() || new Date()
            }));
            updateUnifiedHistory();
        });

        const collectiveQ = query(collection(db, 'collectiveFundContributions'), where('userId', '==', currentUser.uid));
        const unsubCollective = onSnapshot(collectiveQ, (snap) => {
            historyState.COLLECTIVE = snap.docs.map(d => ({
                ...d.data(), id: d.id, type: 'COLLECTIVE',
                label: 'Aporte Fondo',
                currency: 'USD',
                createdAt: d.data().createdAt?.toDate() || new Date(),
                status: 'Completado'
            }));
            updateUnifiedHistory();
        });

        const arbitrageQ = query(collection(db, 'userArbitragePools'), where('userId', '==', currentUser.uid));
        const unsubArbitrage = onSnapshot(arbitrageQ, (snap) => {
            historyState.ARBITRAGE = snap.docs.map(d => ({
                ...d.data(), id: d.id, type: 'ARBITRAGE',
                label: `Arbitraje: ${d.data().poolName || 'Pool'}`,
                amount: d.data().earnings || 0,
                currency: 'USD',
                createdAt: d.data().joinedAt?.toDate() || d.data().createdAt?.toDate() || new Date(),
                status: 'Activa'
            }));
            updateUnifiedHistory();
        });

        const tradingQ = query(collection(db, 'tradingHistory'), orderBy('date', 'desc'));
        const unsubTrading = onSnapshot(tradingQ, (snap) => {
            historyState.TRADING = snap.docs.map(d => {
                const data = d.data();
                // Simular historial personal si es VIP (basado en TradingPortfolioContent)
                return {
                    ...data, id: d.id, type: 'TRADING',
                    label: `Trading: ${data.pair}`,
                    amount: data.profit || 0,
                    currency: 'USD',
                    createdAt: data.date ? new Date(data.date) : new Date(),
                    status: data.result || 'Exitosa'
                };
            });
            updateUnifiedHistory();
        });

        return () => {
            unsubDeposits();
            unsubWithdraws();
            unsubCollective();
            unsubArbitrage();
            unsubTrading();
        };
    }, [currentUser]);

    // Handlers
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
                proofImage: proofImageBase64 || '',
                status: 'Pendiente',
                createdAt: new Date()
            });
            showSuccess('Comprobante enviado exitosamente');
            setDepositAmount('');
            setTxHash('');
            setProofImageBase64('');
            setActiveTab('history');
        } catch (err) {
            showError('Error al procesar depósito: ' + err.message);
        } finally {
            setIsProcessingDeposit(false);
        }
    };

    const handleAddWithdrawal = async (e) => {
        e.preventDefault();
        if (isProcessingWithdraw) return;
        const amount = parseFloat(withdrawAmount);
        const balance = userBalances?.[withdrawCurrency] || 0;

        if (!amount || amount <= 0) return showError('Monto inválido');
        if (amount > balance) return showError('Fondos insuficientes');

        setIsProcessingWithdraw(true);
        try {
            const method = useBinancePay ? 'Binance Pay' : 'Wallet';
            const addressOrId = useBinancePay ? withdrawBinanceId : withdrawAddress;

            if (!addressOrId) throw new Error('Dirección o ID requerido');

            await addDoc(collection(db, 'withdrawals'), {
                userId: currentUser.uid,
                userEmail: currentUser.email,
                amount,
                currency: withdrawCurrency,
                method,
                addressOrId,
                status: 'Pendiente',
                createdAt: new Date()
            });

            // Actualizar balance local (optimista) y en Firebase
            const balanceField = withdrawCurrency === 'USDT-TRC20' ? 'balanceUSDTTRC20' : `balance${withdrawCurrency}`;
            await updateDoc(doc(db, 'users', currentUser.uid), {
                [balanceField]: balance - amount
            });

            showSuccess('Solicitud de retiro enviada');
            setWithdrawAmount('');
            setActiveTab('history');
        } catch (err) {
            showError('Error al retirar: ' + err.message);
        } finally {
            setIsProcessingWithdraw(false);
        }
    };

    const handleCollectiveTransfer = async (e) => {
        e.preventDefault();
        if (isProcessingCollective) return;
        const amount = parseFloat(collectiveAmount);
        const balance = userBalances?.USD || 0;

        if (!amount || amount <= 0) return showError('Monto inválido');
        if (amount > balance) return showError('Saldo insuficiente en USD');

        setIsProcessingCollective(true);
        try {
            const userRef = doc(db, 'users', currentUser.uid);

            await runTransaction(db, async (transaction) => {
                const userDoc = await transaction.get(userRef);
                if (!userDoc.exists()) throw new Error("¡El usuario no existe!");

                const currentBalance = userDoc.data().balanceUSD || 0;
                if (currentBalance < amount) {
                    throw new Error("Saldo insuficiente.");
                }

                // Deduct balance
                transaction.update(userRef, {
                    balanceUSD: currentBalance - amount
                });

                // Add contribution record
                const contributionRef = collection(db, 'collectiveFundContributions');
                const newContribution = {
                    userId: currentUser.uid,
                    username: userDoc.data().username || userDoc.data().displayName || 'Usuario Privado',
                    amount: amount,
                    createdAt: serverTimestamp()
                };
                transaction.set(doc(contributionRef), newContribution);
            });

            showSuccess(`¡Éxito! Has transferido $${amount} al fondo colectivo.`);
            setCollectiveAmount('');
            setIsCollectiveModalOpen(false);
        } catch (err) {
            console.error("Error in collective transfer:", err);
            showError(err.message || 'Error al procesar la transferencia.');
        } finally {
            setIsProcessingCollective(false);
        }
    };

    if (loading) return <div className="flex items-center justify-center p-20 text-blue-500 font-bold">Cargando Billetera...</div>;

    return (
        <div className="max-w-6xl mx-auto p-4 lg:p-6 animate-fadeIn">
            {/* Header / Tabs */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-3xl font-black text-white flex items-center gap-3">
                        <FaWallet className="text-blue-500" /> Mi Billetera
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">Centro unificado de activos y transacciones</p>
                </div>

                <div className="flex bg-slate-900/50 p-1 rounded-2xl border border-white/5 backdrop-blur-xl">
                    {[
                        { id: 'overview', label: 'Vista General', icon: FaWallet },
                        { id: 'deposit', label: 'Depósito', icon: FaArrowDown },
                        { id: 'withdraw', label: 'Retiro', icon: FaArrowUp },
                        { id: 'history', label: 'Historial', icon: FaHistory }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            <tab.icon size={14} />
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab: Overview */}
            {activeTab === 'overview' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                    {/* Resumen Principal - Estilo Binance Spot */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <div className="lg:col-span-8 bg-[#1e2329] p-8 rounded-3xl border border-white/5 relative overflow-hidden group shadow-2xl">
                            <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity pointer-events-none">
                                <FaWallet size={200} />
                            </div>

                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Balance Estimado</span>
                                    <div className="px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded text-[9px] font-black text-green-500 uppercase tracking-tighter">Spot</div>
                                </div>

                                <div className="flex items-baseline gap-3 mb-8">
                                    <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter">
                                        {totalEstimatedBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </h2>
                                    <span className="text-xl font-bold text-slate-500">USDT</span>
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    <button
                                        onClick={() => setActiveTab('deposit')}
                                        className="px-6 py-3 bg-[#fcd535] hover:bg-[#f0b90b] text-[#0b0e11] rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-[#fcd535]/10 active:scale-95"
                                    >
                                        Depositar
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('withdraw')}
                                        className="px-6 py-3 bg-[#2b3139] hover:bg-[#363d47] text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 border border-white/5"
                                    >
                                        Retirar
                                    </button>
                                    <button
                                        onClick={() => setIsCollectiveModalOpen(true)}
                                        className="px-6 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95"
                                    >
                                        Transferir
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-4 bg-[#1e2329] p-6 rounded-3xl border border-white/5 shadow-xl">
                            <div className="flex justify-between items-center mb-6">
                                <h4 className="text-white text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                    <FaHistory className="text-[#fcd535] text-xs" /> Recientes
                                </h4>
                                <button onClick={() => setActiveTab('history')} className="text-[10px] font-bold text-[#fcd535] hover:underline">Ver todo</button>
                            </div>
                            <div className="space-y-3">
                                {financialHistory.slice(0, 4).map(h => (
                                    <div key={h.id} className="flex justify-between items-center p-3 hover:bg-white/[0.02] rounded-xl transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${h.type === 'DEPOSIT' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                                {h.type === 'DEPOSIT' ? <FaArrowDown size={12} /> : <FaArrowUp size={12} />}
                                            </div>
                                            <div>
                                                <p className="text-white text-[11px] font-black">{h.amount} {h.currency}</p>
                                                <p className="text-[9px] text-slate-500 uppercase tracking-tighter">{h.status}</p>
                                            </div>
                                        </div>
                                        <span className="text-[9px] text-slate-600 font-mono italic">{h.createdAt.toLocaleDateString([], { day: '2-digit', month: '2-digit' })}</span>
                                    </div>
                                ))}
                                {financialHistory.length === 0 && (
                                    <div className="text-center py-10 opacity-30">
                                        <FaHistory size={30} className="mx-auto mb-2" />
                                        <p className="text-[10px] uppercase font-black">Sin actividad</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Lista de Activos - Estilo Tabla Binance */}
                    <div className="bg-[#1e2329] rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
                            <div>
                                <h3 className="text-white font-black uppercase tracking-widest text-sm">Activos Spot</h3>
                                <p className="text-[10px] text-slate-500 font-bold mt-0.5">Valores actualizados en tiempo real</p>
                            </div>
                            <div className="flex gap-2">
                                <div className="px-3 py-1 bg-white/5 rounded-lg border border-white/5 text-[9px] font-black text-slate-400 uppercase">Filtro: Balance {'>'} 0</div>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-[#12161c]">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Moneda</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Saldo Total</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Valor USD</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {[...cryptoOptions, ...fiatOptions.map(f => ({ ...f, type: 'fiat' }))].map(coin => {
                                        const balance = userBalances?.[coin.value] || 0;
                                        return (
                                            <tr key={coin.value} className="hover:bg-white/[0.03] transition-colors group cursor-default">
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shadow-inner" style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: `1px solid ${coin.color}40` }}>
                                                            <span style={{ color: coin.color }}>{coin.icon}</span>
                                                        </div>
                                                        <div>
                                                            <p className="text-white font-black text-sm tracking-tight">{coin.label.split(' ')[0]}</p>
                                                            <p className="text-[9px] text-slate-500 font-black uppercase tracking-tighter">{coin.network || 'Asset'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <p className="text-white font-mono font-black text-sm">{balance.toFixed(coin.type === 'fiat' ? 2 : 8)}</p>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <p className="text-slate-400 font-mono text-[11px] font-bold">
                                                        $ {(balance * (rates[coin.value.split('-')[0]] || rates[coin.value] || 1)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </p>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <div className="flex justify-end gap-3">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setSelectedDepositCrypto(coin.value); setActiveTab('deposit'); }}
                                                            className="text-[10px] font-black text-[#fcd535] hover:text-white transition-colors uppercase tracking-widest"
                                                        >
                                                            Depositar
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setWithdrawCurrency(coin.value); setActiveTab('withdraw'); }}
                                                            className="text-[10px] font-black text-slate-500 hover:text-white transition-colors uppercase tracking-widest"
                                                        >
                                                            Retirar
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab: Deposit - Binance Professional Look */}
            {activeTab === 'deposit' && (
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-[#1e2329] p-6 rounded-3xl border border-white/5 shadow-xl">
                            <h3 className="text-white font-black text-xs uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                                <span className="w-6 h-6 bg-[#fcd535] text-[#0b0e11] rounded-full flex items-center justify-center text-[10px]">1</span>
                                Seleccionar Moneda
                            </h3>
                            <div className="grid grid-cols-1 gap-2">
                                {cryptoOptions.map(c => (
                                    <button
                                        key={c.value}
                                        onClick={() => setSelectedDepositCrypto(c.value)}
                                        className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${selectedDepositCrypto === c.value
                                            ? 'bg-blue-600/10 border-blue-500/50 shadow-lg'
                                            : 'bg-white/5 border-white/5 hover:border-white/10'
                                            }`}
                                    >
                                        <div className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center text-sm" style={{ color: c.color }}>
                                            {c.icon}
                                        </div>
                                        <div className="text-left">
                                            <p className="text-xs font-black text-white">{c.label}</p>
                                            <p className="text-[9px] text-slate-500 font-bold uppercase">{c.network}</p>
                                        </div>
                                        {selectedDepositCrypto === c.value && <div className="ml-auto w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {depositQrUrl && (
                            <div className="bg-white p-6 rounded-3xl flex flex-col items-center justify-center shadow-2xl relative">
                                <div className="absolute top-2 left-2 text-[8px] font-black text-slate-300 uppercase italic">QR Secure</div>
                                <img src={depositQrUrl} alt="QR" className="w-40 h-40" />
                                <div className="mt-4 px-4 py-1.5 bg-black/[0.03] rounded-full text-[9px] text-slate-400 font-bold uppercase tracking-widest border border-slate-100">Escaneame</div>
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-3 bg-[#1e2329] p-8 rounded-3xl border border-white/5 shadow-xl">
                        <h3 className="text-white font-black text-xs uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                            <span className="w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[10px]">2</span>
                            Detalles de Depósito
                        </h3>

                        <div className="p-5 bg-black/20 rounded-2xl border border-white/5 mb-8 relative group">
                            <p className="text-[9px] text-slate-500 font-black uppercase mb-3 tracking-widest">Dirección de Billetera ({selectedDepositCrypto})</p>
                            <div className="flex items-center gap-4">
                                <code className="flex-1 text-blue-400 text-sm break-all font-mono font-bold select-all leading-relaxed bg-blue-500/5 p-3 rounded-xl border border-blue-500/10">
                                    {depositAddresses[selectedDepositCrypto] || 'Buscando dirección...'}
                                </code>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(depositAddresses[selectedDepositCrypto]);
                                        showSuccess('Copiado');
                                    }}
                                    className="p-4 bg-white/5 rounded-xl hover:bg-blue-600 hover:text-white transition-all border border-white/5 active:scale-95 shadow-lg"
                                    title="Copiar"
                                >
                                    <FaCopy />
                                </button>
                            </div>
                            <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 rounded text-[8px] font-black text-rose-500 uppercase tracking-tighter">Red: {cryptoOptions.find(c => c.value === selectedDepositCrypto)?.network}</div>
                        </div>

                        <form onSubmit={handleAddDeposit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest mb-2 block">Monto Enviado</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            value={depositAmount}
                                            onChange={(e) => setDepositAmount(e.target.value)}
                                            className="w-full bg-[#12161c] border border-white/5 rounded-2xl px-6 py-4 text-white font-black outline-none focus:border-blue-500 transition-all font-mono text-xl"
                                        />
                                        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-600 font-black text-xs">{selectedDepositCrypto.split('-')[0]}</div>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest mb-2 block">Hash de Transacción</label>
                                    <input
                                        type="text"
                                        placeholder="Pega el TxID aquí..."
                                        value={txHash}
                                        onChange={(e) => setTxHash(e.target.value)}
                                        className="w-full bg-[#12161c] border border-white/5 rounded-2xl px-6 py-4 text-white font-mono text-sm outline-none focus:border-blue-500 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="pt-4">
                                <button
                                    disabled={isProcessingDeposit}
                                    className="w-full bg-[#fcd535] hover:bg-[#f0b90b] text-[#0b0e11] font-black py-5 rounded-2xl shadow-2xl shadow-[#fcd535]/10 transition-all active:scale-95 disabled:opacity-50 uppercase tracking-[0.2em] text-xs"
                                >
                                    {isProcessingDeposit ? 'Procesando...' : 'Confirmar Depósito'}
                                </button>
                                <p className="text-[9px] text-slate-600 text-center mt-4 font-bold max-w-xs mx-auto italic">
                                    El proceso de verificación puede tardar entre 5 y 15 minutos dependiendo de la congestión de la red.
                                </p>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Tab: Withdraw - Binance Elite Style */}
            {activeTab === 'withdraw' && (
                <div className="max-w-4xl mx-auto bg-[#1e2329] p-8 lg:p-12 rounded-[40px] border border-white/5 relative overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none">
                        <FaArrowUp size={300} />
                    </div>

                    <div className="relative z-10">
                        <h3 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter">Retirar Activos</h3>
                        <p className="text-slate-500 mb-10 text-sm font-bold uppercase tracking-widest">Retiros rápidos y seguros a tu billetera externa</p>

                        <form onSubmit={handleAddWithdrawal} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-8">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase ml-4 tracking-[0.2em] mb-3 block">Moneda a Retirar</label>
                                        <select
                                            value={withdrawCurrency}
                                            onChange={(e) => setWithdrawCurrency(e.target.value)}
                                            className="w-full bg-[#12161c] border border-white/5 rounded-3xl px-6 py-5 text-white font-black outline-none focus:border-blue-500 appearance-none bg-no-repeat transition-all shadow-inner"
                                            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'white\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundPosition: 'right 1.5rem center', backgroundSize: '1.2rem' }}
                                        >
                                            {[...cryptoOptions, ...fiatOptions].map(c => (
                                                <option key={c.value} value={c.value} className="bg-[#1e2329] font-bold">{c.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <div className="flex justify-between items-center mb-3 ml-4">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Monto</label>
                                            <span className="text-[9px] font-black text-[#fcd535] uppercase">Disponible: {userBalances?.[withdrawCurrency]?.toFixed(2)}</span>
                                        </div>
                                        <div className="relative group">
                                            <input
                                                type="number"
                                                placeholder="0.00"
                                                value={withdrawAmount}
                                                onChange={(e) => setWithdrawAmount(e.target.value)}
                                                className="w-full bg-[#12161c] border border-white/5 rounded-3xl px-6 py-6 text-white text-4xl font-black outline-none focus:border-blue-500 transition-all placeholder-slate-800 shadow-inner"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setWithdrawAmount(userBalances[withdrawCurrency])}
                                                className="absolute right-6 top-1/2 -translate-y-1/2 text-[#fcd535] font-black uppercase text-xs hover:text-white transition-colors"
                                            >
                                                MAX
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-8 flex flex-col justify-center">
                                    <div className="flex items-center gap-4 bg-[#12161c] p-5 rounded-3xl border border-white/5 shadow-inner">
                                        <div className="flex items-center gap-3 cursor-pointer select-none w-full" onClick={() => setUseBinancePay(!useBinancePay)}>
                                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${useBinancePay ? 'bg-blue-600 border-blue-500 shadow-lg' : 'border-slate-700 bg-black/20'}`}>
                                                {useBinancePay && <FaCheckCircle className="text-white text-xs" />}
                                            </div>
                                            <span className="text-xs font-black text-slate-300 uppercase tracking-widest leading-none">Usar Binance Pay</span>
                                        </div>
                                    </div>

                                    {useBinancePay ? (
                                        <div className="animate-in zoom-in-95 duration-300">
                                            <label className="text-[10px] font-black text-slate-500 uppercase ml-4 tracking-[0.2em] mb-3 block">Binance ID / Email</label>
                                            <input
                                                type="text"
                                                value={withdrawBinanceId}
                                                onChange={(e) => setWithdrawBinanceId(e.target.value)}
                                                placeholder="UID del destinatario"
                                                className="w-full bg-[#12161c] border border-white/5 rounded-3xl px-6 py-5 text-white font-mono outline-none focus:border-blue-500 transition-all shadow-inner"
                                            />
                                            <p className="mt-4 text-[9px] text-slate-500 font-bold px-4 italic leading-relaxed">Retiros instantáneos y sin comisiones entre usuarios de Binance.</p>
                                        </div>
                                    ) : (
                                        <div className="animate-in zoom-in-95 duration-300">
                                            <label className="text-[10px] font-black text-slate-500 uppercase ml-4 tracking-[0.2em] mb-3 block">Dirección de Billetera Externa</label>
                                            <input
                                                type="text"
                                                value={withdrawAddress}
                                                onChange={(e) => setWithdrawAddress(e.target.value)}
                                                placeholder=" bc1q..."
                                                className="w-full bg-[#12161c] border border-white/5 rounded-3xl px-6 py-5 text-white font-mono text-sm outline-none focus:border-blue-500 transition-all shadow-inner"
                                            />
                                            <p className="mt-4 text-[9px] text-slate-500 font-bold px-4 italic leading-relaxed text-rose-400">Asegúrate de que la red sea la correcta para evitar pérdida de fondos.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button
                                disabled={isProcessingWithdraw}
                                className="w-full py-6 bg-[#fcd535] hover:bg-[#f0b90b] text-[#0b0e11] font-black rounded-3xl text-sm uppercase tracking-[0.3em] shadow-2xl shadow-[#fcd535]/10 transition-all active:scale-[0.98] disabled:opacity-50 mt-4"
                            >
                                {isProcessingWithdraw ? 'Procesando...' : 'Confirmar Retiro'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Tab: History - Binance Clean Table */}
            {activeTab === 'history' && (
                <div className="bg-[#1e2329] rounded-[40px] border border-white/5 overflow-hidden shadow-2xl animate-in fade-in duration-500">
                    <div className="p-10 border-b border-white/5 bg-white/[0.01]">
                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Historial Transaccional</h3>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Registros inmutables de tus movimientos</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-[#12161c]">
                                <tr>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Fecha y Hora</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Tipo</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Monto</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Estado</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">ID Operación</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {financialHistory.map(item => {
                                    const isPositive = ['DEPOSIT', 'ARBITRAGE'].includes(item.type) || (item.type === 'TRADING' && parseFloat(item.amount) >= 0);
                                    const isNegative = ['WITHDRAW', 'COLLECTIVE'].includes(item.type) || (item.type === 'TRADING' && parseFloat(item.amount) < 0);

                                    return (
                                        <tr key={item.id} className="hover:bg-white/[0.02] transition-colors border-l-4 border-l-transparent hover:border-l-[#fcd535]">
                                            <td className="px-8 py-6 text-[11px] text-slate-400 font-bold uppercase tracking-tighter">
                                                {item.createdAt.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' })} <br />
                                                <span className="text-[9px] opacity-40 font-mono">{item.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded border ${item.type === 'DEPOSIT' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                        item.type === 'WITHDRAW' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                                                            item.type === 'COLLECTIVE' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                                                'bg-purple-500/10 text-purple-500 border-purple-500/20'
                                                    }`}>
                                                    {item.label || (item.type === 'DEPOSIT' ? 'Depósito' : 'Retiro')}
                                                </span>
                                            </td>
                                            <td className={`px-8 py-6 font-mono font-black text-sm ${isPositive ? 'text-emerald-500' : isNegative ? 'text-rose-500' : 'text-white'}`}>
                                                {isPositive ? '+' : isNegative ? '-' : ''}{Math.abs(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-[10px] opacity-50">{item.currency}</span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-2">
                                                    {(item.status === 'Pendiente' || item.status === 'En Espera') && <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]"></div>}
                                                    {(item.status === 'Aprobado' || item.status === 'Completado' || item.status === 'Exitosa' || item.status === 'Activa') && <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></div>}
                                                    {(item.status === 'Rechazado' || item.status === 'Fallida') && <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e]"></div>}
                                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{item.status}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right font-mono text-[9px] text-slate-600 font-bold group-hover:text-slate-400 transition-colors">
                                                {(item.txHash || item.addressOrId || item.poolId || item.id).substring(0, 16).toUpperCase()}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {financialHistory.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="px-8 py-32 text-center">
                                            <div className="opacity-20">
                                                <FaHistory size={60} className="mx-auto mb-4" />
                                                <p className="text-xs font-black uppercase tracking-[0.5em]">Sin registros</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal Fondo Colectivo - Rediseñado */}
            {isCollectiveModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
                    <div className="bg-[#1e2329] border border-white/5 rounded-[40px] p-8 md:p-12 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 mb-8 border border-emerald-500/20 shadow-xl shadow-emerald-500/5">
                            <FaUsers size={32} />
                        </div>
                        <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter">Invertir Capital</h2>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-10 leading-relaxed">Mueve fondos al nodo de inversión colectiva administrado.</p>

                        <form onSubmit={handleCollectiveTransfer} className="space-y-8">
                            <div>
                                <div className="flex justify-between items-center mb-3 px-2">
                                    <label className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em]">Monto en USD</label>
                                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Disponible: ${userBalances?.USD?.toLocaleString()}</span>
                                </div>
                                <div className="relative group">
                                    <input
                                        type="number"
                                        value={collectiveAmount}
                                        onChange={(e) => setCollectiveAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full bg-[#12161c] border border-white/5 rounded-3xl px-8 py-6 text-white text-3xl font-black outline-none focus:border-emerald-500 transition-all font-mono shadow-inner"
                                        disabled={isProcessingCollective}
                                    />
                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-700 font-black text-sm">$</div>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsCollectiveModalOpen(false)}
                                    className="px-6 py-5 bg-[#12161c] text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-[#1e2329] transition-all flex-1 border border-white/5"
                                >
                                    Cerrar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isProcessingCollective}
                                    className="px-10 py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex-[2] shadow-2xl shadow-emerald-600/20 active:scale-95 disabled:opacity-50"
                                >
                                    {isProcessingCollective ? 'Enviando...' : 'Confirmar Inversión'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WalletHub;
