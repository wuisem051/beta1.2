import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, getDoc, where } from 'firebase/firestore';
import { useError } from '../../context/ErrorContext';
import { useAuth } from '../../context/AuthContext';

const DepositManagement = () => {
    const { showError, showSuccess } = useError();
    const { currentUser } = useAuth();
    const [deposits, setDeposits] = useState([]);
    const [filter, setFilter] = useState('Pendiente'); // 'Todos', 'Pendiente', 'Aprobado', 'Rechazado'
    const [isLoading, setIsLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [previewImage, setPreviewImage] = useState(null);

    useEffect(() => {
        let q;
        if (filter === 'Todos') {
            q = query(collection(db, 'deposits'), orderBy('createdAt', 'desc'));
        } else {
            q = query(
                collection(db, 'deposits'),
                where('status', '==', filter),
                orderBy('createdAt', 'desc')
            );
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedDeposits = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date(),
                processedAt: doc.data().processedAt?.toDate()
            }));
            setDeposits(fetchedDeposits);
            setIsLoading(false);
        }, (err) => {
            console.error("Error fetching deposits:", err);
            showError('Error al cargar los depósitos.');
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [filter, showError]);

    const handleApprove = async (deposit) => {
        if (!currentUser || !currentUser.uid) {
            showError('Debes iniciar sesión.');
            return;
        }

        if (!window.confirm(`¿Aprobar depósito de ${deposit.amount} ${deposit.currency} para ${deposit.userEmail}?`)) {
            return;
        }

        setProcessingId(deposit.id);
        try {
            // Actualizar el depósito
            const depositRef = doc(db, 'deposits', deposit.id);
            await updateDoc(depositRef, {
                status: 'Aprobado',
                processedAt: new Date(),
                processedBy: currentUser.uid
            });

            // Actualizar balance del usuario
            const userRef = doc(db, 'users', deposit.userId);
            const balanceField = `balance${deposit.currency.replace('-', '')}`;

            // Obtener balance actual y sumar (Usando sintaxis modular de Firebase v9)
            const userSnap = await getDoc(userRef);
            const currentBalance = userSnap.exists() ? (userSnap.data()[balanceField] || 0) : 0;

            await updateDoc(userRef, {
                [balanceField]: currentBalance + deposit.amount
            });

            showSuccess(`Depósito aprobado. ${deposit.amount} ${deposit.currency} acreditados a ${deposit.userEmail}`);
        } catch (err) {
            console.error("Error approving deposit:", err);
            showError(`Error al aprobar depósito: ${err.message}`);
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (deposit) => {
        if (!currentUser || !currentUser.uid) {
            showError('Debes iniciar sesión.');
            return;
        }

        const reason = window.prompt('Motivo del rechazo (opcional):');
        if (reason === null) return; // Usuario canceló

        setProcessingId(deposit.id);
        try {
            const depositRef = doc(db, 'deposits', deposit.id);
            await updateDoc(depositRef, {
                status: 'Rechazado',
                processedAt: new Date(),
                processedBy: currentUser.uid,
                notes: reason || 'Sin motivo especificado'
            });

            showSuccess(`Depósito rechazado.`);
        } catch (err) {
            console.error("Error rejecting deposit:", err);
            showError(`Error al rechazar depósito: ${err.message}`);
        } finally {
            setProcessingId(null);
        }
    };

    const getExplorerLink = (currency, txHash) => {
        const explorers = {
            'USDT-TRC20': `https://tronscan.org/#/transaction/${txHash}`,
            'TRX': `https://tronscan.org/#/transaction/${txHash}`,
            'LTC': `https://blockchair.com/litecoin/transaction/${txHash}`,
            'DOGE': `https://blockchair.com/dogecoin/transaction/${txHash}`
        };
        return explorers[currency] || '#';
    };

    const getStatusColor = (status) => {
        const colors = {
            'Pendiente': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
            'Aprobado': 'bg-green-500/10 text-green-500 border-green-500/20',
            'Rechazado': 'bg-red-500/10 text-red-500 border-red-500/20'
        };
        return colors[status] || 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    };

    return (
        <div className="p-6 rounded-2xl shadow-xl space-y-8" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>
            <div className="flex justify-between items-center border-b border-slate-700 pb-4">
                <h1 className="text-3xl font-bold text-white">Gestión de Depósitos</h1>
                <div className="flex gap-2">
                    {['Todos', 'Pendiente', 'Aprobado', 'Rechazado'].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${filter === status
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-8">
                    <div className="animate-pulse text-slate-400 text-lg">Cargando depósitos...</div>
                </div>
            ) : deposits.length === 0 ? (
                <div className="text-center p-8 bg-slate-800/50 rounded-xl border border-slate-700">
                    <p className="text-slate-400">No hay depósitos con el filtro seleccionado.</p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-700">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-900/50">
                                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">Usuario</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">Cripto</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">Monto</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">TxHash</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">Comprobante</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">Fecha</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">Estado</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {deposits.map(deposit => (
                                <tr key={deposit.id} className="hover:bg-slate-700/30 transition-colors">
                                    <td className="px-4 py-4">
                                        <div>
                                            <p className="text-white font-medium text-sm">{deposit.userEmail}</p>
                                            <p className="text-slate-400 text-xs font-mono">{deposit.userId.substring(0, 8)}...</p>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4">
                                        <span className="px-3 py-1 rounded-lg text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                            {deposit.currency}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4">
                                        <span className="text-white font-bold">{deposit.amount}</span>
                                    </td>
                                    <td className="px-4 py-4">
                                        <a
                                            href={getExplorerLink(deposit.currency, deposit.txHash)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-400 hover:text-blue-300 text-xs font-mono underline"
                                        >
                                            {deposit.txHash.substring(0, 10)}...
                                        </a>
                                    </td>
                                    <td className="px-4 py-4">
                                        {deposit.proofImage ? (
                                            <button
                                                onClick={() => setPreviewImage(deposit.proofImage)}
                                                className="group relative w-12 h-12 rounded border border-slate-600 overflow-hidden bg-slate-800"
                                            >
                                                <img src={deposit.proofImage} alt="Proof" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <span className="text-[10px] text-white font-bold">VER</span>
                                                </div>
                                            </button>
                                        ) : (
                                            <span className="text-slate-500 text-xs italic">Sin imagen</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-4 text-slate-300 text-sm whitespace-nowrap">
                                        {deposit.createdAt.toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-4">
                                        <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${getStatusColor(deposit.status)}`}>
                                            {deposit.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4">
                                        {deposit.status === 'Pendiente' && (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleApprove(deposit)}
                                                    disabled={processingId === deposit.id}
                                                    className="bg-green-600/20 hover:bg-green-600 text-green-500 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold border border-green-600/30 transition-all disabled:opacity-50"
                                                >
                                                    ✓ Aprobar
                                                </button>
                                                <button
                                                    onClick={() => handleReject(deposit)}
                                                    disabled={processingId === deposit.id}
                                                    className="bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold border border-red-600/30 transition-all disabled:opacity-50"
                                                >
                                                    ✗ Rechazar
                                                </button>
                                            </div>
                                        )}
                                        {deposit.notes && (
                                            <p className="text-xs text-slate-400 mt-1 italic">{deposit.notes}</p>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal de Previsualización de Imagen */}
            {previewImage && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                    onClick={() => setPreviewImage(null)}
                >
                    <div className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-700">
                        <button
                            onClick={() => setPreviewImage(null)}
                            className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-red-600 text-white w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                        >
                            ✕
                        </button>
                        <img
                            src={previewImage}
                            alt="Full Proof Representation"
                            className="max-w-full max-h-[85vh] object-contain"
                            onClick={(e) => e.stopPropagation()}
                        />
                        <div className="p-4 bg-slate-900 border-t border-slate-700 flex justify-between items-center text-sm font-medium">
                            <span className="text-slate-300">Comprobante de Pago</span>
                            <a
                                href={previewImage}
                                download="comprobante-deposito.png"
                                className="text-blue-400 hover:underline"
                                onClick={(e) => e.stopPropagation()}
                            >
                                Descargar Imagen
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DepositManagement;
