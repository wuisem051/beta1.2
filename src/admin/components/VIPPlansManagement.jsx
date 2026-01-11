import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, onSnapshot, doc, updateDoc, setDoc, getDocs } from 'firebase/firestore';
import { ThemeContext } from '../../context/ThemeContext';
import { useError } from '../../context/ErrorContext';
import vipPlansDefault from '../../data/vipPlans';

const VIPPlansManagement = () => {
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
        <div className="p-6 rounded-2xl shadow-xl space-y-8" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-700 pb-4">
                <h1 className="text-3xl font-bold text-white">Gestión de Planes VIP</h1>
                {plans.length === 0 && (
                    <button
                        onClick={handleInitializeDefaults}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20"
                    >
                        ✨ Inicializar Planes
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans.map(plan => (
                    <div key={plan.id} className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 shadow-lg hover:border-blue-500/30 transition-all group">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-xl font-bold text-blue-400 group-hover:text-blue-300 transition-colors">{plan.name}</h3>
                                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{plan.duration}</span>
                            </div>
                            <div className="bg-blue-500/10 p-2 rounded-lg">
                                <span className="text-xl">💎</span>
                            </div>
                        </div>
                        <div className="flex items-baseline gap-1 mb-4">
                            <span className="text-3xl font-bold text-white">${plan.price}</span>
                            <span className="text-slate-500 text-sm">USD</span>
                        </div>
                        <p className="text-slate-400 text-sm mb-6 h-12 overflow-hidden leading-relaxed">{plan.description}</p>

                        <div className="space-y-3 mb-8">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Incluye:</p>
                            <ul className="space-y-2">
                                {plan.benefits.map((b, i) => (
                                    <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                                        <span className="text-blue-500 mt-0.5">✓</span>
                                        {b}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <button
                            onClick={() => handleEditClick(plan)}
                            className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl transition-all border border-slate-600"
                        >
                            Editar Plan
                        </button>
                    </div>
                ))}
            </div>

            {editingPlan && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 border border-slate-700 p-8 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-bold text-white">Editar Plan: {editingPlan.name}</h3>
                            <button onClick={() => setEditingPlan(null)} className="text-slate-400 hover:text-white text-2xl">&times;</button>
                        </div>
                        <form onSubmit={handleUpdatePlan} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-400 uppercase tracking-wider">Nombre del Plan</label>
                                    <input
                                        type="text"
                                        value={editingPlan.name}
                                        onChange={e => setEditingPlan({ ...editingPlan, name: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-400 uppercase tracking-wider">Precio ($ USD)</label>
                                    <input
                                        type="number"
                                        value={editingPlan.price}
                                        onChange={e => setEditingPlan({ ...editingPlan, price: parseFloat(e.target.value) })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400 uppercase tracking-wider">Descripción Breve</label>
                                <textarea
                                    value={editingPlan.description}
                                    onChange={e => setEditingPlan({ ...editingPlan, description: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all resize-none"
                                    rows="3"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400 uppercase tracking-wider">Beneficios (separados por coma)</label>
                                <textarea
                                    value={editingPlan.benefitsStr}
                                    onChange={e => setEditingPlan({ ...editingPlan, benefitsStr: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                                    rows="4"
                                    placeholder="Acceso señales VIP, Soporte 24/7, Canal privado..."
                                    required
                                />
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setEditingPlan(null)}
                                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-4 rounded-xl font-bold transition-all border border-slate-600"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20"
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
