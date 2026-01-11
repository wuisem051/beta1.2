import React, { useState, useEffect, useContext } from 'react';
import { db } from '../../services/firebase';
import { collection, onSnapshot, doc, updateDoc, setDoc, getDocs } from 'firebase/firestore';
import { ThemeContext } from '../../context/ThemeContext';
import { useError } from '../../context/ErrorContext';
import vipPlansDefault from '../../data/vipPlans';

const VIPPlansManagement = () => {
    const { darkMode } = useContext(ThemeContext);
    const { showError, showSuccess } = useError();
    const [plans, setPlans] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingPlan, setEditingPlan] = useState(null);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'vipPlans'), (snapshot) => {
            const plansData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setPlans(plansData);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching VIP plans:", error);
            showError('Error al cargar los planes VIP.');
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [showError]);

    const handleInitializeDefaults = async () => {
        if (!window.confirm('¿Deseas inicializar los planes VIP con los valores por defecto?')) return;

        setIsLoading(true);
        try {
            for (const plan of vipPlansDefault) {
                await setDoc(doc(db, 'vipPlans', plan.id), plan);
            }
            showSuccess('Planes VIP inicializados correctamente.');
        } catch (error) {
            console.error("Error initializing VIP plans:", error);
            showError('Error al inicializar los planes VIP.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditClick = (plan) => {
        setEditingPlan({ ...plan, benefitsStr: plan.benefits.join(', ') });
    };

    const handleUpdatePlan = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const { benefitsStr, id, ...planData } = editingPlan;
            const updatedPlan = {
                ...planData,
                benefits: benefitsStr.split(',').map(b => b.trim()).filter(b => b !== '')
            };

            await updateDoc(doc(db, 'vipPlans', id), updatedPlan);
            showSuccess('Plan VIP actualizado exitosamente.');
            setEditingPlan(null);
        } catch (error) {
            console.error("Error updating VIP plan:", error);
            showError('Error al actualizar el plan VIP.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading && plans.length === 0) {
        return <div className="p-6 text-center">Cargando planes...</div>;
    }

    return (
        <div className={`${darkMode ? 'bg-dark_card text-light_text' : 'bg-gray-800 text-white'} p-6 rounded-lg shadow-xl`}>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold">Gestión de Planes VIP</h2>
                {plans.length === 0 && (
                    <button
                        onClick={handleInitializeDefaults}
                        className="bg-accent hover:bg-opacity-80 text-white px-4 py-2 rounded font-bold transition-all"
                    >
                        Inicializar Planes
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans.map(plan => (
                    <div key={plan.id} className={`p-4 rounded-lg border ${darkMode ? 'border-dark_border bg-dark_bg' : 'border-gray-600 bg-gray-700'}`}>
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="text-xl font-bold text-accent">{plan.name}</h3>
                            <span className="text-xs bg-gray-600 px-2 py-1 rounded">{plan.duration}</span>
                        </div>
                        <p className="text-2xl font-bold mb-2">${plan.price}</p>
                        <p className="text-sm opacity-80 mb-4 h-12 overflow-hidden">{plan.description}</p>
                        <div className="mb-4">
                            <p className="text-xs font-bold uppercase opacity-50 mb-1">Beneficios:</p>
                            <ul className="text-xs list-disc list-inside">
                                {plan.benefits.map((b, i) => <li key={i}>{b}</li>)}
                            </ul>
                        </div>
                        <button
                            onClick={() => handleEditClick(plan)}
                            className="w-full bg-accent hover:bg-opacity-80 py-2 rounded font-bold transition-all"
                        >
                            Editar Plan
                        </button>
                    </div>
                ))}
            </div>

            {editingPlan && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                    <div className={`${darkMode ? 'bg-dark_card text-light_text' : 'bg-gray-800 text-white'} p-8 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto`}>
                        <h3 className="text-2xl font-bold mb-6">Editar Plan: {editingPlan.name}</h3>
                        <form onSubmit={handleUpdatePlan} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold mb-1">Nombre</label>
                                    <input
                                        type="text"
                                        value={editingPlan.name}
                                        onChange={e => setEditingPlan({ ...editingPlan, name: e.target.value })}
                                        className={`w-full p-2 rounded border ${darkMode ? 'bg-dark_bg border-dark_border' : 'bg-gray-700 border-gray-600'}`}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1">Precio ($)</label>
                                    <input
                                        type="number"
                                        value={editingPlan.price}
                                        onChange={e => setEditingPlan({ ...editingPlan, price: parseFloat(e.target.value) })}
                                        className={`w-full p-2 rounded border ${darkMode ? 'bg-dark_bg border-dark_border' : 'bg-gray-700 border-gray-600'}`}
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">Descripción</label>
                                <textarea
                                    value={editingPlan.description}
                                    onChange={e => setEditingPlan({ ...editingPlan, description: e.target.value })}
                                    className={`w-full p-2 rounded border ${darkMode ? 'bg-dark_bg border-dark_border' : 'bg-gray-700 border-gray-600'}`}
                                    rows="3"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">Beneficios (separados por coma)</label>
                                <textarea
                                    value={editingPlan.benefitsStr}
                                    onChange={e => setEditingPlan({ ...editingPlan, benefitsStr: e.target.value })}
                                    className={`w-full p-2 rounded border ${darkMode ? 'bg-dark_bg border-dark_border' : 'bg-gray-700 border-gray-600'}`}
                                    rows="3"
                                    placeholder="Beneficio 1, Beneficio 2, ..."
                                    required
                                />
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setEditingPlan(null)}
                                    className="flex-1 bg-gray-600 hover:bg-gray-700 py-3 rounded-lg font-bold transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-accent hover:bg-opacity-80 py-3 rounded-lg font-bold transition-colors shadow-lg"
                                >
                                    Guardar Cambios
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VIPPlansManagement;
