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
                <div className="space-y-6">
                    {/* Resumen Principal */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-3xl shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 opacity-10 transform group-hover:scale-110 transition-transform">
                                <FaWallet size={120} />
                            </div>
                            <p className="text-blue-100 text-sm font-bold uppercase tracking-widest mb-2">Balance Total Estimado</p>
                            <div className="flex items-baseline gap-4">
                                <h2 className="text-5xl font-black text-white mb-6">
                                    ${totalEstimatedBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    <span className="text-xl ml-2 text-blue-200">USD</span>
                                </h2>
                                {(btcPrice || ltcPrice) && (
                                    <div className="mb-6 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                                        <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">En Vivo</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <button onClick={() => setActiveTab('deposit')} className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all">
                                    <FaArrowDown /> Depositar
                                </button>
                                <button onClick={() => setActiveTab('withdraw')} className="bg-black/20 hover:bg-black/30 backdrop-blur-md text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all">
                                    <FaArrowUp /> Retirar
                                </button>
                                <button onClick={() => setIsCollectiveModalOpen(true)} className="bg-emerald-500/20 hover:bg-emerald-500/30 backdrop-blur-md text-white px-6 py-3 rounded-2xl font-bold border border-emerald-500/30 flex items-center gap-2 transition-all">
                                    <FaUsers className="text-emerald-400" /> Fondo Colectivo
                                </button>
                            </div>
                        </div>

                        <div className="bg-slate-800/40 p-6 rounded-3xl border border-white/5 backdrop-blur-md">
                            <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                                <FaClock className="text-yellow-500" /> Actividad Reciente
                            </h4>
                            <div className="space-y-4">
                                {financialHistory.slice(0, 3).map(h => (
                                    <div key={h.id} className="flex justify-between items-center p-3 bg-white/5 rounded-2xl border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${h.type === 'DEPOSIT' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                                                {h.type === 'DEPOSIT' ? <FaArrowDown size={12} /> : <FaArrowUp size={12} />}
                                            </div>
                                            <div>
                                                <p className="text-white text-xs font-bold">{h.amount} {h.currency}</p>
                                                <p className="text-[10px] text-slate-500">{h.status}</p>
                                            </div>
                                        </div>
                                        <span className="text-[9px] text-slate-600">{h.createdAt.toLocaleDateString()}</span>
                                    </div>
                                ))}
                                {financialHistory.length === 0 && <p className="text-xs text-slate-500 italic">Sin transacciones recientes</p>}
                            </div>
                        </div>
                    </div>

                    {/* Lista de Activos */}
                    <div className="bg-slate-900/40 rounded-3xl border border-white/5 overflow-hidden">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center">
                            <h3 className="text-white font-bold">Tus Activos</h3>
                            <span className="text-xs text-slate-500">Valor real según mercado</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-white/5">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase">Moneda</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase">Saldo</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase">Equivalente USD</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {[...cryptoOptions, ...fiatOptions.map(f => ({ ...f, type: 'fiat' }))].map(coin => {
                                        const balance = userBalances?.[coin.value] || 0;
                                        return (
                                            <tr key={coin.value} className="hover:bg-white/5 transition-colors group">
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl font-bold" style={{ backgroundColor: coin.color + '20', color: coin.color }}>
                                                            {coin.icon}
                                                        </div>
                                                        <div>
                                                            <p className="text-white font-bold text-sm tracking-tight">{coin.label}</p>
                                                            <p className="text-[10px] text-slate-500 uppercase">{coin.network || 'P2P Fund'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <p className="text-white font-mono font-bold">{balance.toFixed(coin.type === 'fiat' ? 2 : 8)}</p>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <p className="text-slate-400 font-mono text-xs">
                                                        $ {(balance * (rates[coin.value.split('-')[0]] || rates[coin.value] || 1)).toFixed(2)}
                                                    </p>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => { setSelectedDepositCrypto(coin.value); setActiveTab('deposit'); }}
                                                            className="p-2 bg-blue-600/10 text-blue-500 rounded-lg hover:bg-blue-600 hover:text-white transition-all"
                                                            title="Depositar"
                                                        >
                                                            <FaArrowDown size={12} />
                                                        </button>
                                                        <button
                                                            onClick={() => { setWithdrawCurrency(coin.value); setActiveTab('withdraw'); }}
                                                            className="p-2 bg-indigo-600/10 text-indigo-500 rounded-lg hover:bg-indigo-600 hover:text-white transition-all"
                                                            title="Retirar"
                                                        >
                                                            <FaArrowUp size={12} />
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

            {/* Tab: Deposit */}
            {activeTab === 'deposit' && (
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 max-w-5xl mx-auto">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-slate-900/60 p-6 rounded-3xl border border-white/5">
                            <h3 className="text-white font-bold mb-6 flex items-center gap-2">
                                <span className="bg-blue-500/20 text-blue-500 p-2 rounded-lg text-sm">1</span> Seleccionar Moneda
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                {cryptoOptions.map(c => (
                                    <button
                                        key={c.value}
                                        onClick={() => setSelectedDepositCrypto(c.value)}
                                        className={`p-4 rounded-3xl border transition-all text-left group ${selectedDepositCrypto === c.value ? 'bg-blue-600 border-blue-500 shadow-xl shadow-blue-600/20' : 'bg-white/5 border-white/5 hover:border-white/20'
                                            }`}
                                    >
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-lg mb-2 ${selectedDepositCrypto === c.value ? 'bg-white/20' : 'bg-slate-800'}`} style={{ color: selectedDepositCrypto === c.value ? 'white' : c.color }}>
                                            {c.icon}
                                        </div>
                                        <p className={`text-[10px] font-black uppercase ${selectedDepositCrypto === c.value ? 'text-white' : 'text-slate-400'}`}>{c.label}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {depositQrUrl && (
                            <div className="bg-white p-6 rounded-3xl flex flex-col items-center justify-center">
                                <img src={depositQrUrl} alt="QR" className="w-40 h-40" />
                                <p className="text-[10px] text-slate-400 mt-2 font-black uppercase">Escanea para pagar</p>
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-3 bg-slate-900/60 p-8 rounded-3xl border border-white/5 flex flex-col">
                        <h3 className="text-white font-bold mb-6 flex items-center gap-2">
                            <span className="bg-green-500/20 text-green-500 p-2 rounded-lg text-sm">2</span> Dirección de Envío
                        </h3>

                        <div className="p-4 bg-black/40 rounded-2xl border border-white/5 mb-8">
                            <p className="text-[10px] text-slate-500 font-black uppercase mb-2">Red: {cryptoOptions.find(c => c.value === selectedDepositCrypto)?.network}</p>
                            <div className="flex items-center gap-3">
                                <code className="flex-1 text-blue-400 text-sm break-all font-mono font-bold">
                                    {depositAddresses[selectedDepositCrypto] || 'No disponible'}
                                </code>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(depositAddresses[selectedDepositCrypto]);
                                        showSuccess('Copiado');
                                    }}
                                    className="p-3 bg-slate-800 rounded-xl hover:bg-blue-600 transition-colors"
                                >
                                    <FaCopy />
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleAddDeposit} className="space-y-6 mt-auto">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Monto Depositado</label>
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        value={depositAmount}
                                        onChange={(e) => setDepositAmount(e.target.value)}
                                        className="w-full bg-slate-800/50 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-blue-500 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">TxHash (ID de Transacción)</label>
                                    <input
                                        type="text"
                                        placeholder="Pega aquí el hash..."
                                        value={txHash}
                                        onChange={(e) => setTxHash(e.target.value)}
                                        className="w-full bg-slate-800/50 border border-white/5 rounded-2xl px-6 py-4 text-white font-mono text-sm outline-none focus:border-blue-500 transition-all"
                                    />
                                </div>
                            </div>
                            <button
                                disabled={isProcessingDeposit}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-3xl shadow-2xl shadow-blue-600/30 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {isProcessingDeposit ? 'Procesando...' : 'NOTIFICAR TRANSFERENCIA'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Tab: Withdraw */}
            {activeTab === 'withdraw' && (
                <div className="max-w-3xl mx-auto bg-slate-900/60 p-8 lg:p-12 rounded-[50px] border border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-12 opacity-5">
                        <FaArrowUp size={200} />
                    </div>

                    <h3 className="text-3xl font-black text-white mb-2">Retirar Fondos</h3>
                    <p className="text-slate-500 mb-10">Solicita transferencias a tu wallet externa</p>

                    <form onSubmit={handleAddWithdrawal} className="space-y-8 relative z-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase ml-4">Moneda</label>
                                    <select
                                        value={withdrawCurrency}
                                        onChange={(e) => setWithdrawCurrency(e.target.value)}
                                        className="w-full bg-slate-800/80 border border-white/5 rounded-3xl px-6 py-5 text-white font-bold outline-none focus:border-blue-500 appearance-none bg-no-repeat"
                                        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'white\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundPosition: 'right 1.5rem center', backgroundSize: '1.2rem' }}
                                    >
                                        {[...cryptoOptions, ...fiatOptions].map(c => (
                                            <option key={c.value} value={c.value} className="bg-slate-900">{c.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase ml-4">Monto</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            value={withdrawAmount}
                                            onChange={(e) => setWithdrawAmount(e.target.value)}
                                            className="w-full bg-slate-800/80 border border-white/5 rounded-3xl px-6 py-5 text-white text-3xl font-black outline-none focus:border-blue-500 transition-all placeholder-slate-700"
                                        />
                                        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-600 font-bold uppercase text-xs">
                                            MAX: {userBalances?.[withdrawCurrency]?.toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center gap-4 bg-slate-800/40 p-4 rounded-3xl border border-white/5">
                                    <input
                                        type="checkbox"
                                        id="useBinancePay"
                                        checked={useBinancePay}
                                        onChange={(e) => setUseBinancePay(e.target.checked)}
                                        className="w-6 h-6 rounded-xl border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
                                    />
                                    <label htmlFor="useBinancePay" className="text-sm font-bold text-slate-300 pointer-cursor">Usar Binance Pay (Email/ID)</label>
                                </div>

                                {useBinancePay ? (
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase ml-4">Binance ID / Email</label>
                                        <input
                                            type="text"
                                            value={withdrawBinanceId}
                                            onChange={(e) => setWithdrawBinanceId(e.target.value)}
                                            placeholder="12345678"
                                            className="w-full bg-slate-800/80 border border-white/5 rounded-3xl px-6 py-5 text-white font-mono outline-none focus:border-blue-500 transition-all"
                                        />
                                    </div>
                                ) : (
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase ml-4">Dirección Wallet Escrita</label>
                                        <input
                                            type="text"
                                            value={withdrawAddress}
                                            onChange={(e) => setWithdrawAddress(e.target.value)}
                                            placeholder="bc1q..."
                                            className="w-full bg-slate-800/80 border border-white/5 rounded-3xl px-6 py-5 text-white font-mono text-xs outline-none focus:border-blue-500 transition-all"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            disabled={isProcessingWithdraw}
                            className="w-full py-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black rounded-3xl text-xl shadow-2xl shadow-blue-600/20 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {isProcessingWithdraw ? 'PROCESANDO...' : 'ENVIAR SOLICITUD DE RETIRO'}
                        </button>
                    </form>
                </div>
            )}

            {/* Tab: History */}
            {activeTab === 'history' && (
                <div className="bg-slate-900/40 rounded-3xl border border-white/5 overflow-hidden">
                    <div className="p-8 border-b border-white/5">
                        <h3 className="text-xl font-bold text-white">Historial de Transacciones</h3>
                        <p className="text-slate-500 text-sm">Registros de todos tus movimientos financieros</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-white/5">
                                <tr>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase">Fecha</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase">Tipo</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase">Monto</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase">Estado</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase text-right">Referencia</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {financialHistory.map(item => {
                                    const isPositive = ['DEPOSIT', 'ARBITRAGE'].includes(item.type) || (item.type === 'TRADING' && parseFloat(item.amount) >= 0);
                                    const isNegative = ['WITHDRAW', 'COLLECTIVE'].includes(item.type) || (item.type === 'TRADING' && parseFloat(item.amount) < 0);

                                    return (
                                        <tr key={item.id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-8 py-6 text-xs text-slate-400 font-medium">
                                                {item.createdAt.toLocaleDateString()} {item.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${item.type === 'DEPOSIT' ? 'bg-green-500/10 text-green-500' :
                                                        item.type === 'WITHDRAW' ? 'bg-red-500/10 text-red-500' :
                                                            item.type === 'COLLECTIVE' ? 'bg-blue-500/10 text-blue-500' :
                                                                item.type === 'ARBITRAGE' ? 'bg-emerald-500/10 text-emerald-500' :
                                                                    'bg-purple-500/10 text-purple-500'
                                                    }`}>
                                                    {item.label || (item.type === 'DEPOSIT' ? 'Depósito' : 'Retiro')}
                                                </span>
                                            </td>
                                            <td className={`px-8 py-6 font-mono font-bold ${isPositive ? 'text-green-500' : isNegative ? 'text-red-500' : 'text-white'}`}>
                                                {isPositive ? '+' : isNegative ? '-' : ''}{Math.abs(item.amount)} {item.currency}
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-2">
                                                    {(item.status === 'Pendiente' || item.status === 'En Espera') && <FaClock className="text-yellow-500" size={12} />}
                                                    {(item.status === 'Aprobado' || item.status === 'Completado' || item.status === 'Exitosa' || item.status === 'Activa') ? <FaCheckCircle className="text-green-500" size={12} /> : null}
                                                    {(item.status === 'Rechazado' || item.status === 'Fallida') && <FaTimesCircle className="text-red-500" size={12} />}
                                                    <span className="text-xs font-bold text-slate-300">{item.status}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right font-mono text-[10px] text-slate-500">
                                                {item.txHash || item.addressOrId || item.poolId || item.id.substring(0, 8)}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {financialHistory.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="px-8 py-20 text-center text-slate-500 italic">No se han encontrado registros de transacciones</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {/* Modal Fondo Colectivo */}
            {isCollectiveModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="bg-slate-900 border border-white/10 rounded-[40px] p-8 md:p-10 w-full max-w-md shadow-2xl animate-scaleIn">
                        <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 mb-6">
                            <FaUsers size={30} />
                        </div>
                        <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter">Invertir en Fondo Colectivo</h2>
                        <p className="text-slate-500 text-sm mb-8">Transfiere saldo de tu billetera principal directamente al fondo gestionado.</p>

                        <form onSubmit={handleCollectiveTransfer} className="space-y-6">
                            <div>
                                <label className="block text-[10px] text-slate-500 font-black uppercase tracking-widest mb-3 ml-2">Monto a Transferir (USD)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={collectiveAmount}
                                        onChange={(e) => setCollectiveAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full bg-slate-800/50 border border-white/10 rounded-2xl px-6 py-4 text-white text-2xl font-bold outline-none focus:border-emerald-500/50 transition-all font-mono"
                                        disabled={isProcessingCollective}
                                    />
                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col items-end">
                                        <span className="text-[10px] text-slate-500 font-bold uppercase">Saldo Disponible</span>
                                        <span className="text-emerald-400 font-black text-xs">${userBalances?.USD?.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsCollectiveModalOpen(false)}
                                    className="flex-1 px-4 py-4 bg-slate-800 text-slate-400 rounded-2xl font-bold hover:bg-slate-700 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isProcessingCollective}
                                    className="flex-1 px-4 py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-500 transition-all disabled:opacity-50 shadow-lg shadow-emerald-600/20"
                                >
                                    {isProcessingCollective ? 'Procesando...' : 'Confirmar'}
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
