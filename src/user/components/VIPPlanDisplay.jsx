import React, { useContext, useState } from 'react';
import { ThemeContext } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useError } from '../../context/ErrorContext';
import { db } from '../../services/firebase';
import { doc, getDoc, updateDoc, addDoc, collection } from 'firebase/firestore';
import styles from './MinerDisplay.module.css'; // Reusing styles for now, or I could create VIPPlanDisplay.module.css

const VIPPlanDisplay = ({ plan, onPlanPurchased }) => {
    const { darkMode } = useContext(ThemeContext);
    const { currentUser } = useAuth();
    const { showError, showSuccess } = useError();
    const [isLoading, setIsLoading] = useState(false);

    const handleBuy = async () => {
        if (!currentUser) {
            showError('Debes iniciar sesión para adquirir un cupo VIP.');
            return;
        }

        setIsLoading(true);
        try {
            const userDocRef = doc(db, 'users', currentUser.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (!userDocSnap.exists()) {
                showError('Datos de usuario no encontrados.');
                setIsLoading(false);
                return;
            }

            const userData = userDocSnap.data();
            const currentBalanceUSD = userData.balanceUSD || 0;

            if (currentBalanceUSD < plan.price) {
                showError('Saldo insuficiente para adquirir este plan VIP.');
                setIsLoading(false);
                return;
            }

            // Realizar la compra
            const newBalanceUSD = currentBalanceUSD - plan.price;
            await updateDoc(userDocRef, {
                balanceUSD: newBalanceUSD,
                vipStatus: plan.id,
                vipExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 días
            });

            // Registrar la transacción
            await addDoc(collection(db, 'subscriptions'), {
                userId: currentUser.uid,
                planId: plan.id,
                planName: plan.name,
                price: plan.price,
                status: 'active',
                createdAt: new Date(),
                expiryAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            });

            showSuccess(`¡Has adquirido el ${plan.name} exitosamente!`);
            if (onPlanPurchased) {
                onPlanPurchased();
            }

        } catch (error) {
            console.error("Error al adquirir plan VIP:", error);
            showError(`Fallo al adquirir plan VIP: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`${styles.minerCard} ${darkMode ? styles.dark : styles.light} border-2 ${plan.id === 'vip-diamond' ? 'border-accent' : 'border-transparent'}`}>
            <div className="flex justify-between items-start mb-4">
                <h3 className={styles.minerTitle}>{plan.name}</h3>
                <span className="bg-accent text-white text-xs px-2 py-1 rounded-full">{plan.duration}</span>
            </div>

            <div className="text-center mb-6">
                <span className="text-3xl font-bold text-accent">${plan.price}</span>
            </div>

            <p className="text-sm mb-4 opacity-80">{plan.description}</p>

            <div className={styles.minerStats}>
                <ul className="text-xs space-y-1">
                    {plan.benefits.map((benefit, index) => (
                        <li key={index} className="flex items-center">
                            <svg className="h-4 w-4 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                            {benefit}
                        </li>
                    ))}
                </ul>
            </div>

            <button
                className={`${styles.buyButton} mt-6 w-full py-2 rounded-lg font-semibold transition-all ${plan.id === 'vip-diamond' ? 'bg-accent text-white hover:opacity-90' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
                onClick={handleBuy}
                disabled={isLoading}
            >
                {isLoading ? 'Procesando...' : 'Adquirir Cupo'}
            </button>
        </div>
    );
};

export default VIPPlanDisplay;
