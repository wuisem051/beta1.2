import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, query, onSnapshot, doc, setDoc, updateDoc } from 'firebase/firestore';
import { useError } from '../../context/ErrorContext';
import { useAuth } from '../../context/AuthContext';

const DepositAddressSettings = () => {
    const { showError, showSuccess } = useError();
    const { currentUser } = useAuth();
    const [addresses, setAddresses] = useState({
        'USDT-TRC20': { address: '', network: 'TRC20', isActive: true },
        'TRX': { address: '', network: 'TRX', isActive: true },
        'LTC': { address: '', network: 'LTC', isActive: true },
        'DOGE': { address: '', network: 'DOGE', isActive: true },
    });
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const q = query(collection(db, 'depositAddresses'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedAddresses = {};
            snapshot.docs.forEach(doc => {
                fetchedAddresses[doc.id] = doc.data();
            });
            setAddresses(prev => ({
                ...prev,
                ...fetchedAddresses
            }));
        }, (err) => {
            console.error("Error fetching deposit addresses:", err);
            showError('Error al cargar las direcciones de depósito.');
        });

        return () => unsubscribe();
    }, [showError]);

    const handleAddressChange = (currency, value) => {
        setAddresses(prev => ({
            ...prev,
            [currency]: {
                ...prev[currency],
                address: value
            }
        }));
    };

    const handleToggleActive = (currency) => {
        setAddresses(prev => ({
            ...prev,
            [currency]: {
                ...prev[currency],
                isActive: !prev[currency].isActive
            }
        }));
    };

    const handleSaveAddress = async (currency) => {
        if (!currentUser || !currentUser.uid) {
            showError('Debes iniciar sesión para guardar direcciones.');
            return;
        }

        setIsLoading(true);
        try {
            const addressData = addresses[currency];
            const addressRef = doc(db, 'depositAddresses', currency);
            await setDoc(addressRef, {
                currency,
                address: addressData.address,
                network: addressData.network,
                isActive: addressData.isActive,
                updatedAt: new Date(),
                updatedBy: currentUser.uid
            });
            showSuccess(`Dirección de ${currency} guardada exitosamente.`);
        } catch (err) {
            console.error("Error saving deposit address:", err);
            showError(`Error al guardar dirección: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const getCurrencyIcon = (currency) => {
        const icons = {
            'USDT-TRC20': '💵',
            'TRX': '🔴',
            'LTC': '⚡',
            'DOGE': '🐕'
        };
        return icons[currency] || '💰';
    };

    return (
        <div className="p-6 rounded-2xl shadow-xl space-y-8" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>
            <h1 className="text-3xl font-bold text-white border-b border-slate-700 pb-4">
                Configuración de Direcciones de Depósito
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.keys(addresses).map(currency => (
                    <div key={currency} className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <span className="text-3xl">{getCurrencyIcon(currency)}</span>
                                <div>
                                    <h3 className="text-xl font-bold text-white">{currency}</h3>
                                    <p className="text-sm text-slate-400">Red: {addresses[currency].network}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleToggleActive(currency)}
                                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${addresses[currency].isActive
                                        ? 'bg-green-600/20 text-green-500 border border-green-600/30 hover:bg-green-600 hover:text-white'
                                        : 'bg-slate-700 text-slate-400 border border-slate-600 hover:bg-slate-600'
                                    }`}
                            >
                                {addresses[currency].isActive ? '✓ Activa' : '✗ Inactiva'}
                            </button>
                        </div>

                        <div className="space-y-3">
                            <label className="text-sm font-medium text-slate-400">
                                Dirección de Depósito
                            </label>
                            <input
                                type="text"
                                value={addresses[currency].address}
                                onChange={(e) => handleAddressChange(currency, e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all font-mono text-sm"
                                placeholder={`Ingresa la dirección ${currency}...`}
                                disabled={isLoading}
                            />

                            <button
                                onClick={() => handleSaveAddress(currency)}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                                disabled={isLoading || !addresses[currency].address}
                            >
                                {isLoading ? (
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : (
                                    <>💾 Guardar Dirección</>
                                )}
                            </button>
                        </div>

                        {addresses[currency].address && (
                            <div className="mt-4 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                                <p className="text-xs text-slate-400 mb-1">Vista previa:</p>
                                <p className="text-xs text-white font-mono break-all">{addresses[currency].address}</p>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                <div className="flex gap-3">
                    <span className="text-2xl">ℹ️</span>
                    <div>
                        <p className="text-blue-400 font-bold mb-1">Importante</p>
                        <ul className="text-sm text-slate-300 space-y-1">
                            <li>• Verifica que las direcciones sean correctas antes de guardar</li>
                            <li>• Solo usa direcciones que controles completamente</li>
                            <li>• USDT debe ser red TRC20 (Tron)</li>
                            <li>• Las direcciones inactivas no se mostrarán a los usuarios</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DepositAddressSettings;
