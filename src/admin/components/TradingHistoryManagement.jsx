import React, { useContext, useEffect, useState } from 'react';
import { ThemeContext } from '../../context/ThemeContext';
import { db } from '../../services/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useError } from '../../context/ErrorContext';
import { useAuth } from '../../context/AuthContext';
import { SolidSectionStyled, CardStyled, InputStyled, SelectStyled } from '../../user/styles/StyledComponents';
import styles from '../../user/pages/UserPanel.module.css';

const TradingHistoryManagement = () => {
    const { darkMode } = useContext(ThemeContext);
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
        <SolidSectionStyled theme={darkMode ? 'dark' : 'light'} className={styles.settingsContent}>
            <h1 className={styles.pageTitle}>Gestión de Historial de Operaciones</h1>

            {isLoading && <div className={styles.loadingText}>Cargando historial...</div>}

            <CardStyled theme={darkMode ? 'dark' : 'light'} className={styles.sectionCard}>
                <h2 className={styles.sectionTitle}>Añadir Nueva Operación</h2>
                <form onSubmit={handleAddEntry} className={styles.form}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Fecha</label>
                            <InputStyled theme={darkMode ? 'dark' : 'light'} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Par</label>
                            <InputStyled theme={darkMode ? 'dark' : 'light'} type="text" value={pair} onChange={(e) => setPair(e.target.value)} placeholder="Ej: BTC/USDT" required />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Tipo</label>
                            <SelectStyled theme={darkMode ? 'dark' : 'light'} value={type} onChange={(e) => setType(e.target.value)}>
                                <option value="Long">Long</option>
                                <option value="Short">Short</option>
                            </SelectStyled>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Resultado</label>
                            <SelectStyled theme={darkMode ? 'dark' : 'light'} value={result} onChange={(e) => setResult(e.target.value)}>
                                <option value="Exitosa">Exitosa</option>
                                <option value="Fallida">Fallida</option>
                            </SelectStyled>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>P/L (USD)</label>
                            <InputStyled theme={darkMode ? 'dark' : 'light'} type="number" step="any" value={profit} onChange={(e) => setProfit(e.target.value)} placeholder="Ej: 150.50" required />
                        </div>
                    </div>
                    <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
                        {isSubmitting ? 'Procesando...' : 'Añadir al Historial'}
                    </button>
                </form>
            </CardStyled>

            <CardStyled theme={darkMode ? 'dark' : 'light'} className={styles.sectionCard}>
                <h2 className={styles.sectionTitle}>Historial Existente</h2>
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th className={styles.tableHeader}>Fecha</th>
                                <th className={styles.tableHeader}>Par</th>
                                <th className={styles.tableHeader}>Tipo</th>
                                <th className={styles.tableHeader}>Resultado</th>
                                <th className={styles.tableHeader}>P/L</th>
                                <th className={styles.tableHeader}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.map(entry => (
                                <tr key={entry.id}>
                                    {editingId === entry.id ? (
                                        <>
                                            <td className={styles.tableCell}><InputStyled theme={darkMode ? 'dark' : 'light'} type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} /></td>
                                            <td className={styles.tableCell}><InputStyled theme={darkMode ? 'dark' : 'light'} type="text" value={editPair} onChange={(e) => setEditPair(e.target.value)} /></td>
                                            <td className={styles.tableCell}>
                                                <SelectStyled theme={darkMode ? 'dark' : 'light'} value={editType} onChange={(e) => setEditType(e.target.value)}>
                                                    <option value="Long">Long</option>
                                                    <option value="Short">Short</option>
                                                </SelectStyled>
                                            </td>
                                            <td className={styles.tableCell}>
                                                <SelectStyled theme={darkMode ? 'dark' : 'light'} value={editResult} onChange={(e) => setEditResult(e.target.value)}>
                                                    <option value="Exitosa">Exitosa</option>
                                                    <option value="Fallida">Fallida</option>
                                                </SelectStyled>
                                            </td>
                                            <td className={styles.tableCell}><InputStyled theme={darkMode ? 'dark' : 'light'} type="number" step="any" value={editProfit} onChange={(e) => setEditProfit(e.target.value)} /></td>
                                            <td className={styles.tableCellActions}>
                                                <button onClick={handleUpdateEntry} className={styles.submitButton}>Guardar</button>
                                                <button onClick={() => setEditingId(null)} className={styles.deleteButton}>Cancelar</button>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className={styles.tableCell}>{entry.date}</td>
                                            <td className={styles.tableCell}>{entry.pair}</td>
                                            <td className={styles.tableCell}>{entry.type}</td>
                                            <td className={styles.tableCell}>
                                                <span className={`${styles.statusBadge} ${entry.result === 'Exitosa' ? styles.statusCompleted : styles.statusError}`}>
                                                    {entry.result}
                                                </span>
                                            </td>
                                            <td className={styles.tableCell} style={{ color: entry.profit >= 0 ? 'var(--green-check)' : 'var(--red-error)' }}>
                                                {entry.profit >= 0 ? '+' : ''}{entry.profit}
                                            </td>
                                            <td className={styles.tableCellActions}>
                                                <button onClick={() => handleEditClick(entry)} className={styles.editButton}>Editar</button>
                                                <button onClick={() => handleDeleteEntry(entry.id)} className={styles.deleteButton}>Eliminar</button>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardStyled>
        </SolidSectionStyled>
    );
};

export default TradingHistoryManagement;
