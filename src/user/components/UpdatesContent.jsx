import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { FaHistory, FaRocket, FaBug, FaMagic } from 'react-icons/fa';

const UpdatesContent = ({ styles }) => {
    const [updates, setUpdates] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, 'siteUpdates'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedUpdates = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date(),
            }));
            setUpdates(fetchedUpdates);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching updates:", error);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const getIcon = (type) => {
        switch (type) {
            case 'feature': return <FaRocket className="text-blue-400" />;
            case 'fix': return <FaBug className="text-red-400" />;
            case 'improvement': return <FaMagic className="text-purple-400" />;
            default: return <FaHistory className="text-slate-400" />;
        }
    };

    return (
        <div className={styles.dashboardContent}>
            <div className="mb-8">
                <h1 className={styles.mainContentTitle}>Actualizaciones del Sistema</h1>
                <p className={styles.statTitle}>Mantente al tanto de todas las mejoras y nuevas funcionalidades añadidas a la plataforma.</p>
            </div>

            <div className="max-w-4xl space-y-6">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-4">
                        <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 animate-pulse">Sincronizando Historial...</p>
                    </div>
                ) : updates.length === 0 ? (
                    <div className="text-center py-20 bg-slate-900/50 rounded-[2rem] border border-white/5">
                        <div className="text-4xl mb-4">📢</div>
                        <p className="text-white font-bold">No hay actualizaciones registradas</p>
                        <p className="text-xs text-slate-500 uppercase tracking-widest font-black mt-2">Próximamente más novedades</p>
                    </div>
                ) : (
                    updates.map((update, index) => (
                        <div
                            key={update.id}
                            className="group relative bg-[#020617]/40 backdrop-blur-3xl rounded-[2rem] border border-white/10 p-8 shadow-2xl animate-in slide-in-from-bottom-4 duration-500"
                            style={{ animationDelay: `${index * 100}ms` }}
                        >
                            <div className="absolute top-0 left-0 w-1.5 h-full rounded-l-full bg-gradient-to-b from-blue-500 to-indigo-600 opacity-50 group-hover:opacity-100 transition-opacity"></div>

                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-xl border border-white/5 shadow-inner">
                                        {getIcon(update.type)}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors uppercase tracking-tight">{update.title}</h3>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{update.createdAt.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                                            <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                                            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{update.version || 'v1.0'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest">
                                    {update.tag || 'MEJORA'}
                                </div>
                            </div>

                            <div className="pl-16">
                                <p className="text-slate-400 leading-relaxed text-sm font-medium">
                                    {update.description}
                                </p>
                                {update.changes && (
                                    <ul className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {update.changes.map((change, i) => (
                                            <li key={i} className="flex items-center gap-2 text-[11px] text-slate-500 font-bold">
                                                <span className="w-1 h-1 bg-blue-500 rounded-full"></span>
                                                {change}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default UpdatesContent;
