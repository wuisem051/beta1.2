import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import {
    collection,
    onSnapshot,
    query,
    orderBy,
    doc,
    getDocs,
    setDoc
} from 'firebase/firestore';
import { FaTrash, FaUsers, FaCoins, FaListUl, FaEdit, FaSave, FaToggleOn, FaToggleOff } from 'react-icons/fa';

const CollectiveFundManagement = () => {
    const [contributions, setContributions] = useState([]);
    const [stats, setStats] = useState({
        totalCapital: 0,
        totalContributors: 0
    });
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Stats Management State
    const [isSaving, setIsSaving] = useState(false);
    const [config, setConfig] = useState({
        displayMode: 'real', // 'real' or 'manual'
        manualCapital: 1250000,
        manualYield: 12.4,
        manualMembers: 2450
    });

    useEffect(() => {
        const q = query(
            collection(db, 'collectiveFundContributions'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetched = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setContributions(fetched);

            const total = fetched.reduce((sum, c) => sum + (c.amount || 0), 0);
            const uniqueUsers = new Set(fetched.map(c => c.userId)).size;

            setStats({
                totalCapital: total,
                totalContributors: uniqueUsers
            });
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching contributions:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Fetch config
    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'siteSettings', 'collectiveFund'), (docSnap) => {
            if (docSnap.exists()) {
                setConfig(docSnap.data());
            }
        });
        return () => unsub();
    }, []);

    const handleSaveConfig = async () => {
        setIsSaving(true);
        try {
            await setDoc(doc(db, 'siteSettings', 'collectiveFund'), config);
            alert('Configuración guardada exitosamente.');
        } catch (error) {
            console.error("Error saving config:", error);
            alert('Error al guardar la configuración.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('¿Estás seguro de que deseas eliminar este aporte? Esto NO reembolsará el dinero al usuario automáticamente.')) {
            try {
                await deleteDoc(doc(db, 'collectiveFundContributions', id));
            } catch (error) {
                console.error("Error deleting contribution:", error);
                alert('Error al eliminar el aporte.');
            }
        }
    };

    const filteredContributions = contributions.filter(c =>
        c.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.userId?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-800/50 p-6 rounded-3xl border border-white/5 flex items-center gap-6">
                    <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center text-blue-500 text-2xl">
                        <FaCoins />
                    </div>
                    <div>
                        <p className="text-slate-500 text-xs font-black uppercase tracking-widest">Capital Total Acumulado</p>
                        <p className="text-3xl font-black text-white mt-1">${stats.totalCapital.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                </div>

                <div className="bg-slate-800/50 p-6 rounded-3xl border border-white/5 flex items-center gap-6">
                    <div className="w-16 h-16 bg-emerald-600/20 rounded-2xl flex items-center justify-center text-emerald-500 text-2xl">
                        <FaUsers />
                    </div>
                    <div>
                        <p className="text-slate-500 text-xs font-black uppercase tracking-widest">Total de Aportadores Únicos</p>
                        <p className="text-3xl font-black text-white mt-1">{stats.totalContributors}</p>
                    </div>
                </div>

                {/* Stats Editor */}
                <div className="bg-slate-800/50 p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent opacity-100 transition-opacity"></div>

                    <h3 className="text-xl font-black text-white mb-8 flex items-center gap-3 relative z-10">
                        <span className="w-10 h-10 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400">
                            <FaEdit />
                        </span>
                        Configuración de Estadísticas Visibles (User Panel)
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Modo de Visualización</label>
                            <button
                                onClick={() => setConfig({ ...config, displayMode: config.displayMode === 'real' ? 'manual' : 'real' })}
                                className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl border transition-all ${config.displayMode === 'real'
                                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                        : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                                    }`}
                            >
                                <span className="font-bold text-xs uppercase tracking-widest">
                                    {config.displayMode === 'real' ? 'Valores Reales' : 'Valores Manuales'}
                                </span>
                                {config.displayMode === 'real' ? <FaToggleOn size={24} /> : <FaToggleOff size={24} />}
                            </button>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Capital Total (Manual)</label>
                            <input
                                type="number"
                                value={config.manualCapital}
                                onChange={(e) => setConfig({ ...config, manualCapital: parseFloat(e.target.value) })}
                                className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold focus:border-blue-500 outline-none transition-all"
                                placeholder="Ej: 1500000"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Rendimiento % (Manual)</label>
                            <input
                                type="number"
                                step="0.1"
                                value={config.manualYield}
                                onChange={(e) => setConfig({ ...config, manualYield: parseFloat(e.target.value) })}
                                className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold focus:border-blue-500 outline-none transition-all"
                                placeholder="Ej: 12.4"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Miembros (Manual)</label>
                            <input
                                type="number"
                                value={config.manualMembers}
                                onChange={(e) => setConfig({ ...config, manualMembers: parseInt(e.target.value) })}
                                className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold focus:border-blue-500 outline-none transition-all"
                                placeholder="Ej: 2450"
                            />
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end relative z-10">
                        <button
                            onClick={handleSaveConfig}
                            disabled={isSaving}
                            className="flex items-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50"
                        >
                            <FaSave /> {isSaving ? 'Guardando...' : 'Guardar Configuración'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="bg-slate-800/50 rounded-3xl border border-white/5 overflow-hidden">
                <div className="p-6 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="text-blue-500"><FaListUl /></div>
                        <h2 className="text-xl font-bold">Listado de Aportes</h2>
                    </div>

                    <div className="relative w-full md:w-64">
                        <input
                            type="text"
                            placeholder="Buscar por usuario..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-500/50 transition-all"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5">
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-white/5">Usuario</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-white/5">ID de Usuario</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-white/5">Fecha</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-white/5">Monto</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-white/5 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-10 text-center text-slate-500 italic">Cargando aportes...</td>
                                </tr>
                            ) : filteredContributions.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-10 text-center text-slate-500 italic">No se encontraron aportes.</td>
                                </tr>
                            ) : (
                                filteredContributions.map((c) => (
                                    <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 font-bold text-xs">
                                                    {c.username ? c.username[0].toUpperCase() : 'U'}
                                                </div>
                                                <span className="font-bold text-slate-200">{c.username}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-mono text-slate-500">{c.userId}</td>
                                        <td className="px-6 py-4 text-xs text-slate-400">
                                            {c.createdAt?.toDate ? c.createdAt.toDate().toLocaleString() : 'Reciente'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-emerald-400 font-black">${c.amount?.toFixed(2)}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleDelete(c.id)}
                                                className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                                title="Eliminar registro"
                                            >
                                                <FaTrash />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default CollectiveFundManagement;
