import React, { useContext, useEffect, useState } from 'react';
import { ThemeContext } from '../../context/ThemeContext';
import { db } from '../../services/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useError } from '../../context/ErrorContext';
import { useAuth } from '../../context/AuthContext';
import { SolidSectionStyled, CardStyled, InputStyled, SelectStyled } from '../../user/styles/StyledComponents';
import styles from '../../user/pages/UserPanel.module.css';

const TradingHistoryManagement = () => {
    const { showError, showSuccess } = useError();
    const { currentUser } = useAuth();
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form states
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [pair, setPair] = useState('');
    const [type, setType] = useState('Long');
    const [result, setResult] = useState('Exitosa');
    const [profit, setProfit] = useState('');

    // Edit states
    const [editingId, setEditingId] = useState(null);
    const [editDate, setEditDate] = useState('');
    const [editPair, setEditPair] = useState('');
    const [editType, setEditType] = useState('Long');
    const [editResult, setEditResult] = useState('Exitosa');
    const [editProfit, setEditProfit] = useState('');

    useEffect(() => {
        const q = query(collection(db, 'tradingHistory'), orderBy('date', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedHistory = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setHistory(fetchedHistory);
            setIsLoading(false);
        }, (err) => {
            console.error("Error fetching trading history:", err);
            showError('Error al cargar el historial de trading.');
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [showError]);

    const handleAddEntry = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        if (!currentUser) {
            showError('Debes iniciar sesión.');
            setIsSubmitting(false);
            return;
        }

        if (!date || !pair || !profit) {
            showError('Todos los campos son obligatorios.');
            setIsSubmitting(false);
            return;
        }

        try {
            await addDoc(collection(db, 'tradingHistory'), {
                date,
                pair,
                type,
                result,
                profit: parseFloat(profit),
                createdAt: new Date()
            });
            showSuccess('Operación añadida al historial.');
            setPair('');
            setProfit('');
        } catch (err) {
            console.error("Error adding entry:", err);
            showError(`Error: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditClick = (entry) => {
        setEditingId(entry.id);
        setEditDate(entry.date);
        setEditPair(entry.pair);
        setEditType(entry.type);
        setEditResult(entry.result);
        setEditProfit(entry.profit);
    };

    const handleUpdateEntry = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const docRef = doc(db, 'tradingHistory', editingId);
            await updateDoc(docRef, {
                date: editDate,
                pair: editPair,
                type: editType,
                result: editResult,
                profit: parseFloat(editProfit)
            });
            showSuccess('Operación actualizada.');
            setEditingId(null);
        } catch (err) {
            console.error("Error updating entry:", err);
            showError(`Error: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteEntry = async (id) => {
        if (window.confirm('¿Eliminar esta operación del historial?')) {
            setIsSubmitting(true);
            try {
                await deleteDoc(doc(db, 'tradingHistory', id));
                showSuccess('Operación eliminada.');
            } catch (err) {
                console.error("Error deleting entry:", err);
                showError(`Error: ${err.message}`);
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    return (
        <div className="p-6 rounded-2xl shadow-xl space-y-8" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>
            <h1 className="text-3xl font-bold text-white border-b border-slate-700 pb-4">Gestión de Historial de Operaciones</h1>

            {isLoading && (
                <div className="flex justify-center p-8">
                    <div className="animate-pulse text-slate-400 text-lg">Cargando historial...</div>
                </div>
            )}

            {isSubmitting && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
                    <div className="bg-slate-800 p-6 rounded-2xl shadow-2xl flex items-center gap-4 text-white">
                        <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="font-medium">Procesando...</span>
                    </div>
                </div>
            )}

            {/* Form for new operation */}
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 shadow-lg">
                <h2 className="text-xl font-semibold text-blue-400 mb-6 flex items-center gap-2">
                    <span className="bg-blue-500/10 p-2 rounded-lg">➕</span> Añadir Nueva Operación
                </h2>
                <form onSubmit={handleAddEntry} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-400">Fecha</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-400">Par</label>
                            <input
                                type="text"
                                value={pair}
                                onChange={(e) => setPair(e.target.value)}
                                placeholder="Ej: BTC/USDT"
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all placeholder:text-slate-600"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-400">Tipo</label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                            >
                                <option value="Long">Long</option>
                                <option value="Short">Short</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-400">Resultado</label>
                            <select
                                value={result}
                                onChange={(e) => setResult(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                            >
                                <option value="Exitosa">Exitosa</option>
                                <option value="Fallida">Fallida</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-400">P/L (USD)</label>
                            <input
                                type="number"
                                step="any"
                                value={profit}
                                onChange={(e) => setProfit(e.target.value)}
                                placeholder="Ej: 150.50"
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all placeholder:text-slate-600"
                                required
                            />
                        </div>
                        <div className="flex items-end">
                            <button
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-6 rounded-xl shadow-lg transition-all"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Procesando...' : '🚀 Añadir al Historial'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {/* Table */}
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 shadow-lg">
                <h2 className="text-xl font-semibold text-blue-400 mb-6 flex items-center gap-2">
                    <span className="bg-blue-500/10 p-2 rounded-lg">📊</span> Historial Existente
                </h2>
                <div className="overflow-x-auto rounded-xl border border-slate-700">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-900/50">
                                <th className="px-4 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">Fecha</th>
                                <th className="px-4 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">Par</th>
                                <th className="px-4 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">Tipo</th>
                                <th className="px-4 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">Resultado</th>
                                <th className="px-4 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">P/L</th>
                                <th className="px-4 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {history.map(entry => (
                                <tr key={entry.id} className="hover:bg-slate-700/30 transition-colors">
                                    {editingId === entry.id ? (
                                        <>
                                            <td className="px-4 py-4"><input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white" /></td>
                                            <td className="px-4 py-4"><input type="text" value={editPair} onChange={(e) => setEditPair(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white" /></td>
                                            <td className="px-4 py-4">
                                                <select value={editType} onChange={(e) => setEditType(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white">
                                                    <option value="Long">Long</option>
                                                    <option value="Short">Short</option>
                                                </select>
                                            </td>
                                            <td className="px-4 py-4">
                                                <select value={editResult} onChange={(e) => setEditResult(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white">
                                                    <option value="Exitosa">Exitosa</option>
                                                    <option value="Fallida">Fallida</option>
                                                </select>
                                            </td>
                                            <td className="px-4 py-4"><input type="number" step="any" value={editProfit} onChange={(e) => setEditProfit(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white" /></td>
                                            <td className="px-4 py-4 text-right space-x-2">
                                                <button onClick={handleUpdateEntry} className="text-green-500 hover:text-green-400 text-sm font-bold">Guardar</button>
                                                <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-white text-sm">Cancelar</button>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="px-4 py-4 text-slate-300 text-sm whitespace-nowrap">{entry.date}</td>
                                            <td className="px-4 py-4 font-medium text-white">{entry.pair}</td>
                                            <td className="px-4 py-4 text-slate-400">{entry.type}</td>
                                            <td className="px-4 py-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${entry.result === 'Exitosa' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                                                    {entry.result}
                                                </span>
                                            </td>
                                            <td className={`px-4 py-4 font-bold ${entry.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                {entry.profit >= 0 ? '+' : ''}{entry.profit}
                                            </td>
                                            <td className="px-4 py-4 text-right space-x-3">
                                                <button onClick={() => handleEditClick(entry)} className="text-blue-400 hover:text-blue-300 text-sm font-medium">Editar</button>
                                                <button onClick={() => handleDeleteEntry(entry.id)} className="text-red-400 hover:text-red-300 text-sm font-medium" disabled={isSubmitting}>Eliminar</button>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default TradingHistoryManagement;
