import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useError } from '../../context/ErrorContext';
import { useContext } from 'react';
import { ThemeContext } from '../../context/ThemeContext';
import styles from '../pages/UserPanel.module.css';
import QRCode from 'qrcode';

const DepositContent = () => {
    const { currentUser } = useAuth();
    const { showError, showSuccess } = useError();
    const { darkMode } = useContext(ThemeContext);
    const [selectedCrypto, setSelectedCrypto] = useState('USDT-TRC20');
    const [depositAddresses, setDepositAddresses] = useState({});
    const [amount, setAmount] = useState('');
    const [txHash, setTxHash] = useState('');
    const [deposits, setDeposits] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [proofImage, setProofImage] = useState(null);
    const [proofImageBase64, setProofImageBase64] = useState('');

    const cryptoOptions = [
        { value: 'USDT-TRC20', label: 'USDT (TRC20)', icon: '💵', network: 'Tron (TRC20)' },
        { value: 'TRX', label: 'TRX (Tron)', icon: '🔴', network: 'Tron' },
        { value: 'LTC', label: 'Litecoin', icon: '⚡', network: 'Litecoin' },
        { value: 'DOGE', label: 'Dogecoin', icon: '🐕', network: 'Dogecoin' }
    ];

    // Cargar direcciones de depósito
    useEffect(() => {
        const q = query(collection(db, 'depositAddresses'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const addresses = {};
            snapshot.docs.forEach(doc => {
                if (doc.data().isActive) {
                    addresses[doc.id] = doc.data();
                }
            });
            setDepositAddresses(addresses);
        }, (err) => {
            console.error("Error fetching deposit addresses:", err);
        });

        return () => unsubscribe();
    }, []);

    // Cargar historial de depósitos del usuario
    useEffect(() => {
        if (!currentUser?.uid) {
            setDeposits([]);
            return;
        }

        const q = query(
            collection(db, 'deposits'),
            where('userId', '==', currentUser.uid),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedDeposits = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date()
            }));
            setDeposits(fetchedDeposits);
        }, (err) => {
            console.error("Error fetching user deposits:", err);
        });

        return () => unsubscribe();
    }, [currentUser]);

    // Generar QR code cuando cambia la dirección
    useEffect(() => {
        const address = depositAddresses[selectedCrypto]?.address || 'bc1qexampleaddress1234567890qwertyuiop';
        if (address) {
            QRCode.toDataURL(address, { width: 200, margin: 1 })
                .then(url => setQrCodeUrl(url))
                .catch(err => console.error('Error generating QR:', err));
        } else {
            setQrCodeUrl('');
        }
    }, [selectedCrypto, depositAddresses]);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { // 2MB limit
                showError('La imagen es demasiado grande. El límite es 2MB.');
                return;
            }
            setProofImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setProofImageBase64(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmitDeposit = async (e) => {
        e.preventDefault();

        if (!currentUser?.uid) {
            showError('Debes iniciar sesión para realizar un depósito.');
            return;
        }

        if (!amount || parseFloat(amount) <= 0) {
            showError('Ingresa un monto válido.');
            return;
        }

        if (!txHash.trim()) {
            showError('Ingresa el hash de la transacción.');
            return;
        }

        setIsLoading(true);
        try {
            await addDoc(collection(db, 'deposits'), {
                userId: currentUser.uid,
                userEmail: currentUser.email,
                currency: selectedCrypto,
                amount: parseFloat(amount),
                txHash: txHash.trim(),
                depositAddress: depositAddresses[selectedCrypto]?.address || 'Ejemplo (Admin no ha configurado)',
                proofImage: proofImageBase64 || '',
                status: 'Pendiente',
                createdAt: new Date()
            });

            showSuccess('Comprobante de depósito enviado. Será revisado por el administrador.');
            setAmount('');
            setTxHash('');
        } catch (err) {
            console.error("Error submitting deposit:", err);
            showError(`Error al enviar comprobante: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            'Pendiente': { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.2)' },
            'Aprobado': { bg: 'rgba(16, 185, 129, 0.1)', color: 'var(--green-check)', border: '1px solid rgba(16, 185, 129, 0.2)' },
            'Rechazado': { bg: 'rgba(239, 68, 68, 0.1)', color: 'var(--red-error)', border: '1px solid rgba(239, 68, 68, 0.2)' }
        };
        return colors[status] || colors['Pendiente'];
    };

    const currentCrypto = cryptoOptions.find(c => c.value === selectedCrypto);
    const configuredAddress = depositAddresses[selectedCrypto];
    const displayAddress = configuredAddress?.address || 'bc1qexampleaddress1234567890qwertyuiop'; // Fallback address

    return (
        <div className={styles.dashboardContent}>
            <h1 className={styles.mainContentTitle}>Depósitos de Criptomonedas</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Formulario de Depósito */}
                <div className={styles.sectionCard}>
                    <h2 className={styles.sectionTitle}>Realizar Depósito</h2>

                    {/* Selector de Criptomoneda */}
                    <div className="mb-6">
                        <label className={styles.formLabel}>Selecciona la Criptomoneda</label>
                        <div className="grid grid-cols-2 gap-3">
                            {cryptoOptions.map(crypto => (
                                <button
                                    key={crypto.value}
                                    onClick={() => setSelectedCrypto(crypto.value)}
                                    className={`p-4 rounded-xl border-2 transition-all ${selectedCrypto === crypto.value
                                        ? 'border-blue-500 bg-blue-500/10'
                                        : 'border-slate-700 bg-slate-800/50 hover:border-blue-500/30'
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl">{crypto.icon}</span>
                                        <div className="text-left">
                                            <p className="font-bold text-white text-sm">{crypto.label}</p>
                                            <p className="text-xs text-slate-400">{crypto.network}</p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {currentAddress ? (
                        <>
                            {/* Dirección de Depósito */}
                            <div className="mb-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                                <p className="text-sm text-slate-400 mb-2">Dirección de Depósito:</p>
                                <div className="flex items-center gap-2 mb-3">
                                    <input
                                        type="text"
                                        value={displayAddress}
                                        readOnly
                                        className={`flex-1 bg-slate-900 border ${!configuredAddress ? 'border-yellow-500/50' : 'border-slate-700'} rounded-lg px-3 py-2 text-white font-mono text-xs`}
                                    />
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(currentAddress.address);
                                            showSuccess('Dirección copiada al portapapeles');
                                        }}
                                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all"
                                    >
                                        📋 Copiar
                                    </button>
                                </div>

                                {qrCodeUrl && (
                                    <div className="flex justify-center">
                                        <img src={qrCodeUrl} alt="QR Code" className="rounded-lg border-2 border-slate-700" />
                                    </div>
                                )}

                                <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                                    <p className="text-xs text-yellow-500 font-bold">⚠️ Importante:</p>
                                    {!configuredAddress && (
                                        <p className="text-xs text-yellow-400 mt-1 mb-2 italic">
                                            Nota: Esta es una dirección de ejemplo. El administrador aún no ha configurado una real.
                                        </p>
                                    )}
                                    <p className="text-xs text-slate-300 mt-1">
                                        Solo envía <strong>{currentCrypto?.label}</strong> a esta dirección.
                                        Red: <strong>{currentCrypto?.network}</strong>
                                    </p>
                                </div>
                            </div>

                            {/* Formulario de Comprobante */}
                            <form onSubmit={handleSubmitDeposit} className="space-y-4">
                                <div className="bg-blue-600/5 p-4 rounded-xl border border-blue-500/20 mb-4">
                                    <p className="text-sm font-bold text-blue-400 mb-2">Paso 2: Reportar Pago</p>
                                    <div className={styles.formGroup}>
                                        <label className={styles.formLabel}>Monto a depositar ({selectedCrypto})</label>
                                        <input
                                            type="number"
                                            step="any"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            className={`${styles.formInput} ${darkMode ? styles.darkInput : styles.lightInput} !text-lg font-bold`}
                                            placeholder={`0.00`}
                                            required
                                            disabled={isLoading}
                                        />
                                    </div>
                                </div>

                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Hash de Transacción (TxHash)</label>
                                    <input
                                        type="text"
                                        value={txHash}
                                        onChange={(e) => setTxHash(e.target.value)}
                                        className={`${styles.formInput} ${darkMode ? styles.darkInput : styles.lightInput} font-mono`}
                                        placeholder="Pega el hash de tu transacción..."
                                        required
                                        disabled={isLoading}
                                    />
                                    <p className="text-xs text-slate-400 mt-1">
                                        Encuentra el TxHash en tu wallet después de enviar la transacción
                                    </p>
                                </div>

                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Captura de Comprobante (Opcional)</label>
                                    <div className="flex flex-col gap-3">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            className="hidden"
                                            id="proof-image-upload"
                                            disabled={isLoading}
                                        />
                                        <label
                                            htmlFor="proof-image-upload"
                                            className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-700 rounded-xl hover:border-blue-500 cursor-pointer transition-all bg-slate-800/30"
                                        >
                                            <span className="text-2xl">📸</span>
                                            <span className="text-sm text-slate-300">
                                                {proofImage ? proofImage.name : 'Subir captura del pago'}
                                            </span>
                                        </label>
                                        {proofImageBase64 && (
                                            <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-slate-700 bg-black/20">
                                                <img src={proofImageBase64} alt="Preview" className="w-full h-full object-contain" />
                                                <button
                                                    type="button"
                                                    onClick={() => { setProofImage(null); setProofImageBase64(''); }}
                                                    className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full text-xs"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className={`${styles.submitButton} !py-4 !text-lg shadow-lg shadow-blue-500/20`}
                                    disabled={isLoading}
                                >
                                    {isLoading ? 'Enviando...' : '📤 Confirmar Envío de Pago'}
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="text-center p-8 bg-slate-800/50 rounded-xl border border-slate-700">
                            <p className="text-slate-400">
                                Cargando información de depósito...
                            </p>
                        </div>
                    )}
                </div>

                {/* Historial de Depósitos */}
                <div className={styles.sectionCard}>
                    <h2 className={styles.sectionTitle}>Historial de Depósitos</h2>

                    {deposits.length === 0 ? (
                        <p className={styles.noDataText}>No has realizado depósitos aún.</p>
                    ) : (
                        <div className="space-y-3">
                            {deposits.map(deposit => (
                                <div key={deposit.id} className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="font-bold text-white">{deposit.amount} {deposit.currency}</p>
                                            <p className="text-xs text-slate-400">{deposit.createdAt.toLocaleString()}</p>
                                        </div>
                                        <span
                                            className={styles.statusBadge}
                                            style={getStatusColor(deposit.status)}
                                        >
                                            {deposit.status}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 font-mono break-all">
                                        TxHash: {deposit.txHash}
                                    </p>
                                    {deposit.notes && (
                                        <p className="text-xs text-red-400 mt-2 italic">
                                            Nota: {deposit.notes}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DepositContent;
