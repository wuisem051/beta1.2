import React, { useState, useEffect, useContext, useMemo } from 'react';
import { db } from '../../services/firebase';
import { collection, onSnapshot, doc, updateDoc, getDocs } from 'firebase/firestore';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { ThemeContext } from '../../context/ThemeContext';
import { useError } from '../../context/ErrorContext';

ChartJS.register(ArcElement, Tooltip, Legend);

const VIPMemberManagement = () => {
    const { darkMode } = useContext(ThemeContext);
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
        <div className={`${darkMode ? 'bg-dark_card text-light_text' : 'bg-gray-800 text-white'} p-6 rounded-lg shadow-xl`}>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold">Gestión de Miembros VIP</h2>
                <div className="text-right">
                    <p className="text-sm opacity-70">Total Miembros: {users.length}</p>
                    <p className="text-sm text-accent font-bold">VIP Activos: {users.length - vipStats.none}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-2">
                    <div className="flex flex-col md:flex-row gap-4 mb-4">
                        <input
                            type="text"
                            placeholder="Buscar por email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`flex-grow p-2 rounded border ${darkMode ? 'bg-dark_bg border-dark_border' : 'bg-gray-700 border-gray-600'}`}
                        />
                        <select
                            value={filterVip}
                            onChange={(e) => setFilterVip(e.target.value)}
                            className={`p-2 rounded border ${darkMode ? 'bg-dark_bg border-dark_border' : 'bg-gray-700 border-gray-600'}`}
                        >
                            <option value="all">Todos los Miembros</option>
                            <option value="none">Sin VIP</option>
                            <option value="vip-standard">VIP Bronze</option>
                            <option value="vip-gold">VIP Gold</option>
                            <option value="vip-diamond">VIP Diamond</option>
                        </select>
                    </div>

                    <div className="overflow-x-auto rounded-lg">
                        <table className="min-w-full divide-y divide-gray-700">
                            <thead className={darkMode ? 'bg-dark_bg' : 'bg-gray-700'}>
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Email</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Plan VIP</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Expiración</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className={`${darkMode ? 'bg-dark_card divide-dark_border' : 'bg-gray-800 divide-gray-700'} divide-y`}>
                                {filteredUsers.map(user => (
                                    <tr key={user.id} className="hover:bg-opacity-50 hover:bg-gray-600 transition-colors">
                                        <td className="px-4 py-3 whitespace-nowrap text-sm">{user.email}</td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${user.vipStatus === 'vip-diamond' ? 'bg-blue-100 text-blue-800' :
                                                    user.vipStatus === 'vip-gold' ? 'bg-yellow-100 text-yellow-800' :
                                                        user.vipStatus === 'vip-standard' ? 'bg-orange-100 text-orange-800' :
                                                            'bg-gray-200 text-gray-800'
                                                }`}>
                                                {user.vipStatus === 'vip-standard' ? 'BRONZE' :
                                                    user.vipStatus === 'vip-gold' ? 'GOLD' :
                                                        user.vipStatus === 'vip-diamond' ? 'DIAMOND' : 'NINGUNO'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                                            {user.vipExpiry ? (user.vipExpiry.toDate ? user.vipExpiry.toDate().toLocaleDateString() : new Date(user.vipExpiry).toLocaleDateString()) : '-'}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                                            <button
                                                onClick={() => handleEditClick(user)}
                                                className="text-accent hover:text-white font-bold transition-colors"
                                            >
                                                Gestionar VIP
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className={`p-6 rounded-lg ${darkMode ? 'bg-dark_bg' : 'bg-gray-700'}`}>
                    <h3 className="text-xl font-bold mb-4 text-center">Distribución VIP</h3>
                    <div className="h-64">
                        <Pie data={pieData} options={{ maintainAspectRatio: false }} />
                    </div>
                    <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>Bronze:</span>
                            <span className="font-bold">{vipStats['vip-standard']}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span>Gold:</span>
                            <span className="font-bold">{vipStats['vip-gold']}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span>Diamond:</span>
                            <span className="font-bold">{vipStats['vip-diamond']}</span>
                        </div>
                    </div>
                </div>
            </div>

            {isEditModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                    <div className={`${darkMode ? 'bg-dark_card text-light_text' : 'bg-gray-800 text-white'} p-8 rounded-xl shadow-2xl w-full max-w-md`}>
                        <h3 className="text-2xl font-bold mb-6">Gestionar VIP: {editingUser.email}</h3>
                        <form onSubmit={handleUpdateVip} className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold mb-2">Plan VIP</label>
                                <select
                                    value={editVipStatus}
                                    onChange={(e) => setEditVipStatus(e.target.value)}
                                    className={`w-full p-3 rounded-lg border ${darkMode ? 'bg-dark_bg border-dark_border' : 'bg-gray-700 border-gray-600'}`}
                                >
                                    <option value="none">Ninguno (Regular)</option>
                                    <option value="vip-standard">VIP Bronze</option>
                                    <option value="vip-gold">VIP Gold</option>
                                    <option value="vip-diamond">VIP Diamond</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-2">Fecha de Expiración</label>
                                <input
                                    type="date"
                                    value={editVipExpiry}
                                    onChange={(e) => setEditVipExpiry(e.target.value)}
                                    className={`w-full p-3 rounded-lg border ${darkMode ? 'bg-dark_bg border-dark_border' : 'bg-gray-700 border-gray-600'}`}
                                />
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
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

export default VIPMemberManagement;
