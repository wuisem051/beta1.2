import React, { useState, useEffect, useContext } from 'react';
import { db } from '../../services/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ThemeContext } from '../../context/ThemeContext';
import { useError } from '../../context/ErrorContext';
import { FaHistory, FaPlus, FaTrash, FaEdit, FaRocket, FaBug, FaMagic } from 'react-icons/fa';

const UpdateManagement = () => {
    const { darkMode } = useContext(ThemeContext);
    const { showError, showSuccess } = useError();
    const [updates, setUpdates] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState('improvement'); // feature, fix, improvement
    const [version, setVersion] = useState('v1.0');
    const [tag, setTag] = useState('MEJORA');
    const [changesText, setChangesText] = useState('');
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        const q = query(collection(db, 'siteUpdates'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setUpdates(snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date()
            })));
        });
        return () => unsubscribe();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title || !description) return showError("Título y descripción son obligatorios");

        setIsSubmitting(true);
        try {
            const updateData = {
                title,
                description,
                type,
                version,
                tag,
                changes: changesText.split('\n').filter(l => l.trim() !== ''),
                updatedAt: new Date()
            };

            if (editingId) {
                await updateDoc(doc(db, 'siteUpdates', editingId), updateData);
                showSuccess("Actualización modificada");
            } else {
                await addDoc(collection(db, 'siteUpdates'), {
                    ...updateData,
                    createdAt: new Date()
                });
                showSuccess("Actualización publicada");
            }

            resetForm();
        } catch (error) {
            showError("Error al procesar la actualización");
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setType('improvement');
        setVersion('v1.0');
        setTag('MEJORA');
        setChangesText('');
        setEditingId(null);
    };

    const handleEdit = (update) => {
        setEditingId(update.id);
        setTitle(update.title);
        setDescription(update.description);
        setType(update.type);
        setVersion(update.version || 'v1.0');
        setTag(update.tag || 'MEJORA');
        setChangesText(update.changes ? update.changes.join('\n') : '');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (window.confirm('¿Eliminar esta actualización?')) {
            try {
                await deleteDoc(doc(db, 'siteUpdates', id));
                showSuccess('Actualización eliminada');
            } catch (err) {
                showError('Error al eliminar');
            }
        }
    };

    return (
        <div className="p-6 md:p-12 min-h-screen bg-slate-950 text-slate-100">
            <div className="max-w-5xl mx-auto">
                <h1 className="text-3xl font-black mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">
                    Gestión de Actualizaciones
                </h1>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Form Section */}
                    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-xl h-fit">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <FaHistory className="text-blue-500" />
                            {editingId ? 'Editar Actualización' : 'Nueva Actualización'}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Título</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                                    placeholder="Ej: Nuevos Botones en Señales"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tipo</label>
                                    <select
                                        value={type}
                                        onChange={(e) => setType(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                                    >
                                        <option value="feature">Nueva Función</option>
                                        <option value="fix">Corrección</option>
                                        <option value="improvement">Mejora</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Versión</label>
                                    <input
                                        type="text"
                                        value={version}
                                        onChange={(e) => setVersion(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                                        placeholder="v1.0"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tag (Badge)</label>
                                <input
                                    type="text"
                                    value={tag}
                                    onChange={(e) => setTag(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                                    placeholder="EXCLUSIVO, NUEVO, MEJORA..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Descripción Corta</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all resize-none"
                                    rows="3"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Lista de Cambios (uno por línea)</label>
                                <textarea
                                    value={changesText}
                                    onChange={(e) => setChangesText(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white font-mono text-xs focus:ring-2 focus:ring-blue-500/50 outline-none transition-all resize-none"
                                    rows="5"
                                    placeholder="- Añadido botón de éxito&#10;- Añadido botón de fallo&#10;- Mejorada interfaz"
                                />
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? '...' : editingId ? <FaEdit /> : <FaPlus />}
                                    {editingId ? 'Actualizar' : 'Publicar'}
                                </button>
                                {editingId && (
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="px-6 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all"
                                    >
                                        Cancelar
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    {/* List Section */}
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold mb-6">Historial de Actualizaciones</h2>
                        {updates.map(update => (
                            <div key={update.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 group">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{update.version}</span>
                                        <h3 className="text-lg font-bold text-white uppercase tracking-tight">{update.title}</h3>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleEdit(update)} className="p-2 text-slate-500 hover:text-blue-400 transition-colors">
                                            <FaEdit />
                                        </button>
                                        <button onClick={() => handleDelete(update)} className="p-2 text-slate-500 hover:text-red-500 transition-colors">
                                            <FaTrash />
                                        </button>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-400 line-clamp-2">{update.description}</p>
                                <div className="mt-4 flex justify-between items-center text-[10px] font-black text-slate-600 uppercase">
                                    <span>{update.createdAt.toLocaleDateString()}</span>
                                    <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-400">{update.type}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UpdateManagement;
