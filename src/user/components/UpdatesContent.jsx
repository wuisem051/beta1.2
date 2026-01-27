import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { FaHistory, FaRocket, FaBug, FaMagic } from 'react-icons/fa';

const UpdatesContent = ({ styles }) => {
    const [updates, setUpdates] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const systemUpdates = [
        {
            id: 'trading-suite-v2.6',
            title: "Suite de Trading Profesional & Limpieza",
            description: "Actualización masiva de la experiencia de trading. Hemos limpiado el Dashboard principal para un enfoque más minimalista y potenciado la sección de Exchange con herramientas de análisis técnico y gestión de pares personalizada.",
            type: "feature",
            version: "v2.6",
            tag: "TRADING",
            changes: [
                "Herramientas de dibujo activadas en gráficos TradingView",
                "Soporte nativo para LTC/USDT y DOGE/USDT",
                "Nueva función para agregar cualquier par de trading",
                "Limpieza de widgets antiguos del Dashboard principal"
            ],
            createdAt: new Date()
        },
        {
            id: 'unified-activity-v2.5',
            title: "Historial Unificado & Transferencias",
            description: "Hemos unificado toda tu actividad financiera en un solo lugar. Además, ahora puedes invertir en el fondo colectivo directamente desde tu billetera con un solo clic, simplificando la gestión de tu capital.",
            type: "feature",
            version: "v2.5",
            tag: "SISTEMA",
            changes: [
                "Historial unificado de depósitos, retiros y fondos",
                "Integración de ganancias de arbitraje en tiempo real",
                "Botón de inversión directa al Fondo Colectivo",
                "Interfaz de transacciones optimizada"
            ],
            createdAt: new Date('2026-01-25T15:45:00')
        },
        {
            id: 'collective-fund-v2.4',
            title: "Fondo Colectivo & Gestión Admin",
            description: "Implementación integral del sistema de aportes colectivos. Ahora los usuarios pueden participar directamente desde su balance y los administradores tienen un panel de control dedicado para monitorear el crecimiento del fondo.",
            type: "feature",
            version: "v2.4",
            tag: "NUEVO",
            changes: [
                "Sistema de aportes directos desde balance USD",
                "Listado público de contribuciones en tiempo real",
                "Panel de administración del Fondo Colectivo",
                "Estadísticas globales de capital y aportadores"
            ],
            createdAt: new Date('2026-01-25T11:50:00')
        },
        {
            id: 'security-v2.2',
            title: "Seguridad de Conexión Avanzada",
            description: "Hemos implementado una nueva capa de cifrado de grado industrial para todas las conexiones externas. Tus credenciales ahora están protegidas por protocolos de seguridad de alto nivel, asegurando que tu información sensible permanezca privada y segura.",
            type: "improvement",
            version: "v2.2",
            tag: "SEGURIDAD",
            changes: [
                "Cifrado de grado militar para llaves de API",
                "Protección avanzada contra acceso no autorizado",
                "Manejo seguro de secretos en el servidor"
            ],
            createdAt: new Date('2026-01-23T10:00:00')
        },
        {
            id: 'aesthetics-v2.3',
            title: "Nueva Experiencia Visual Elite",
            description: "La plataforma se siente más viva que nunca. Hemos rediseñado la interfaz principal con animaciones modernas, fondos dinámicos y micro-interacciones fluidas que mejoran la navegación y resaltan el potencial tecnológico de nuestro ecosistema.",
            type: "improvement",
            version: "v2.3",
            tag: "INTERFAZ",
            changes: [
                "Fondos orgánicos animados",
                "Efectos de flotación y profundidad",
                "Micro-interacciones táctiles y de ratón",
                "Optimización de rendimiento visual"
            ],
            createdAt: new Date('2026-01-23T10:15:00')
        }
    ];

    useEffect(() => {
        const q = query(collection(db, 'siteUpdates'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedUpdates = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date(),
            }));

            // Merge system updates with fetched updates, sorting by date
            const allUpdates = [...systemUpdates, ...fetchedUpdates].sort((a, b) => b.createdAt - a.createdAt);
            setUpdates(allUpdates);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching updates:", error);
            // Fallback to only system updates if database fails
            setUpdates(systemUpdates);
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
