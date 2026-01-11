import React, { useState, useEffect, useContext, useMemo } from 'react';
import { db } from '../../services/firebase';
import { collection, onSnapshot, doc, updateDoc, getDocs } from 'firebase/firestore';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { useError } from '../../context/ErrorContext';

ChartJS.register(ArcElement, Tooltip, Legend);

const VIPMemberManagement = () => {
    const { showError, showSuccess } = useError();
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterVip, setFilterVip] = useState('all');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [editVipStatus, setEditVipStatus] = useState('none');
    const [editVipExpiry, setEditVipExpiry] = useState('');

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setUsers(usersData);
        }, (error) => {
            console.error("Error fetching users:", error);
            showError('Error al cargar la lista de miembros.');
        });

        return () => unsubscribe();
    }, [showError]);

    const handleEditClick = (user) => {
        setEditingUser(user);
        setEditVipStatus(user.vipStatus || 'none');
        setEditVipExpiry(user.vipExpiry ? (user.vipExpiry.toDate ? user.vipExpiry.toDate().toISOString().substring(0, 10) : user.vipExpiry.substring(0, 10)) : '');
        setIsEditModalOpen(true);
    };

    const handleUpdateVip = async (e) => {
        e.preventDefault();
        try {
            const userRef = doc(db, 'users', editingUser.id);
            await updateDoc(userRef, {
                vipStatus: editVipStatus,
                vipExpiry: editVipExpiry ? new Date(editVipExpiry) : null
            });
            showSuccess('Estado VIP actualizado exitosamente.');
            setIsEditModalOpen(false);
        } catch (error) {
            console.error("Error updating VIP status:", error);
            showError('Error al actualizar el estado VIP.');
        }
    };

    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            const matchesSearch = user.email?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesVip = filterVip === 'all' ? true :
                filterVip === 'none' ? (!user.vipStatus || user.vipStatus === 'none') :
                    user.vipStatus === filterVip;
            return matchesSearch && matchesVip;
        });
    }, [users, searchTerm, filterVip]);

    const vipStats = useMemo(() => {
        const counts = { none: 0, 'vip-standard': 0, 'vip-gold': 0, 'vip-diamond': 0 };
        users.forEach(user => {
            const status = user.vipStatus || 'none';
            if (counts.hasOwnProperty(status)) counts[status]++;
        });
        return counts;
    }, [users]);

    const pieData = {
        labels: ['Sin VIP', 'Bronze', 'Gold', 'Diamond'],
        datasets: [{
            data: [vipStats.none, vipStats['vip-standard'], vipStats['vip-gold'], vipStats['vip-diamond']],
            backgroundColor: ['#6B7280', '#CD7F32', '#FFD700', '#B9F2FF'],
            borderWidth: 1,
        }]
    };

    return (
        <div className="p-6 rounded-2xl shadow-xl space-y-8" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>
            <div className="flex justify-between items-center border-b border-slate-700 pb-4">
                <h2 className="text-3xl font-bold text-white flex items-center gap-2">
                    <span className="bg-blue-500/10 p-2 rounded-lg text-lg">💎</span>
                    Seguimiento de Miembros VIP
                </h2>
                <div className="text-right flex items-center gap-4">
                    <div className="bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-700">
                        <p className="text-[10px] text-slate-400 uppercase font-black">Total Miembros</p>
                        <p className="text-xl font-bold text-white">{users.length}</p>
                    </div>
                    <div className="bg-blue-500/10 px-4 py-2 rounded-xl border border-blue-500/20">
                        <p className="text-[10px] text-blue-400 uppercase font-black">VIP Activos</p>
                        <p className="text-xl font-bold text-blue-400">{users.length - vipStats.none}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-grow">
                            <input
                                type="text"
                                placeholder="Buscar por email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-11 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all placeholder:text-slate-600"
                            />
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
                        </div>
                        <select
                            value={filterVip}
                            onChange={(e) => setFilterVip(e.target.value)}
                            className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all text-sm font-bold"
                        >
                            <option value="all">Filtro: Todos</option>
                            <option value="none">Sin VIP</option>
                            <option value="vip-standard">Solo Bronze</option>
                            <option value="vip-gold">Solo Gold</option>
                            <option value="vip-diamond">Solo Diamond</option>
                        </select>
                    </div>

                    <div className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden shadow-lg">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-900/50">
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">Usuario</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">Estado VIP</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">Expira el</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700 text-right">Mantenimiento</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {filteredUsers.map(user => (
                                    <tr key={user.id} className="hover:bg-slate-700/30 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white group-hover:text-blue-400 transition-colors">
                                            {user.email}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border shadow-sm ${user.vipStatus === 'vip-diamond' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                    user.vipStatus === 'vip-gold' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                                        user.vipStatus === 'vip-standard' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                                                            'bg-slate-500/10 text-slate-500 border-slate-700'
                                                }`}>
                                                {user.vipStatus === 'vip-standard' ? 'Bronze' :
                                                    user.vipStatus === 'vip-gold' ? 'Gold' :
                                                        user.vipStatus === 'vip-diamond' ? 'Diamond' : 'Ninguno'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-400">
                                            {user.vipExpiry ? (user.vipExpiry.toDate ? user.vipExpiry.toDate().toLocaleDateString() : new Date(user.vipExpiry).toLocaleDateString()) : '∞'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <button
                                                onClick={() => handleEditClick(user)}
                                                className="bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold border border-blue-500/20 transition-all"
                                            >
                                                ⚙️ Gestionar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredUsers.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-12 text-center text-slate-500 italic text-sm">
                                            No se han encontrado miembros con los criterios seleccionados.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700 shadow-lg h-fit space-y-8">
                    <h3 className="text-xl font-bold text-center text-white">Cuota de Mercado VIP</h3>
                    <div className="h-64 relative flex items-center justify-center">
                        <Pie
                            data={pieData}
                            options={{
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: { display: false }
                                }
                            }}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-2 h-2 rounded-full bg-[#CD7F32]"></div>
                                <span className="text-[10px] text-slate-500 uppercase font-bold">Bronze</span>
                            </div>
                            <span className="text-lg font-black text-white">{vipStats['vip-standard']}</span>
                        </div>
                        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-2 h-2 rounded-full bg-[#FFD700]"></div>
                                <span className="text-[10px] text-slate-500 uppercase font-bold">Gold</span>
                            </div>
                            <span className="text-lg font-black text-white">{vipStats['vip-gold']}</span>
                        </div>
                        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-2 h-2 rounded-full bg-[#B9F2FF]"></div>
                                <span className="text-[10px] text-slate-500 uppercase font-bold">Diamond</span>
                            </div>
                            <span className="text-lg font-black text-white">{vipStats['vip-diamond']}</span>
                        </div>
                        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-2 h-2 rounded-full bg-[#6B7280]"></div>
                                <span className="text-[10px] text-slate-500 uppercase font-bold">Sin VIP</span>
                            </div>
                            <span className="text-lg font-black text-white">{vipStats.none}</span>
                        </div>
                    </div>
                </div>
            </div>

            {isEditModalOpen && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-700 p-8 rounded-3xl shadow-2xl w-full max-w-md space-y-6">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                            <h3 className="text-2xl font-bold text-white">Editar Membresía</h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">✕</button>
                        </div>
                        <div className="p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">
                            <p className="text-xs text-blue-400 font-bold uppercase mb-1">Gestión para:</p>
                            <p className="text-sm text-white font-mono">{editingUser.email}</p>
                        </div>
                        <form onSubmit={handleUpdateVip} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">Nivel de Suscripción</label>
                                <select
                                    value={editVipStatus}
                                    onChange={(e) => setEditVipStatus(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                                >
                                    <option value="none">Sin VIP (Regular)</option>
                                    <option value="vip-standard">VIP Bronze</option>
                                    <option value="vip-gold">VIP Gold</option>
                                    <option value="vip-diamond">VIP Diamond</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">Vencimiento de la Suscripción</label>
                                <input
                                    type="date"
                                    value={editVipExpiry}
                                    onChange={(e) => setEditVipExpiry(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 rounded-xl transition-all"
                                >
                                    Cerrar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-900/20 transition-all uppercase tracking-wider"
                                >
                                    Actualizar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VIPMemberManagement;
