import React, { useState, useEffect, useContext } from 'react';
import { db } from '../../services/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { FaHistory, FaRocket, FaBug, FaMagic, FaRegNewspaper } from 'react-icons/fa';
import { ThemeContext } from '../../context/ThemeContext';

const UpdatesContent = ({ styles }) => {
    const { darkMode } = useContext(ThemeContext);
    const [updates, setUpdates] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const systemUpdates = [
        {
            id: 'trading-suite-v2.6',
            title: "Suite de Trading Profesional 2.6",
            description: "Actualización masiva de la experiencia de trading. Hemos limpiado el Dashboard principal para un enfoque más minimalista y potenciado la sección de Exchange con herramientas de análisis técnico y gestión de pares personalizada.",
            type: "feature",
            version: "v2.6",
            tag: "BINANCE PRO",
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

            const allUpdates = [...systemUpdates, ...fetchedUpdates].sort((a, b) => b.createdAt - a.createdAt);
            setUpdates(allUpdates);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching updates:", error);
            setUpdates(systemUpdates);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const getIcon = (type) => {
        switch (type) {
            case 'feature': return <FaRocket className="text-[#fcd535]" />;
            case 'fix': return <FaBug className="text-rose-500" />;
            case 'improvement': return <FaMagic className="text-amber-400" />;
            default: return <FaHistory className="text-slate-400" />;
        }
    };

    return (
        <div className="p-4 lg:p-10 bg-[#0b0e11] min-h-screen animate-in fade-in duration-500">
            <div className="max-w-5xl mx-auto">
                <div className="mb-16">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-[#fcd535]/10 rounded-2xl">
                            <FaRegNewspaper className="text-[#fcd535]" size={24} />
                        </div>
                        <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">Bitácora de Desarrollo</h1>
                    </div>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] ml-1">Evolución del Nodo Global • Actualización en Tiempo Real</p>
                </div>

                <div className="space-y-12 relative border-l border-white/5 pl-8 ml-4">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-4">
                            <div className="w-12 h-12 border-4 border-[#fcd535]/10 border-t-[#fcd535] rounded-full animate-spin"></div>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Sincronizando Nodos...</p>
                        </div>
                    ) : updates.length === 0 ? (
                        <div className="text-center py-20 bg-[#1e2329] rounded-[3rem] border border-white/5">
                            <p className="text-white font-black uppercase tracking-widest italic">Iniciando protocolo de actualización...</p>
                        </div>
                    ) : (
                        updates.map((update, index) => (
                            <div key={update.id} className="relative group animate-in slide-in-from-left-4 duration-700" style={{ animationDelay: `${index * 100}ms` }}>
                                <div className="absolute -left-[45px] top-0 w-8 h-8 bg-[#1e2329] border border-white/10 rounded-full flex items-center justify-center shadow-2xl group-hover:border-[#fcd535]/50 transition-all z-10">
                                    <div className="w-2 h-2 bg-[#fcd535] rounded-full animate-pulse"></div>
                                </div>

                                <div className="bg-[#1e2329] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl group-hover:bg-[#2b3139] transition-all duration-500 relative overflow-hidden backdrop-blur-sm">
                                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                        {getIcon(update.type)}
                                    </div>

                                    <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
                                        <div>
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="text-[9px] font-black text-[#fcd535] bg-[#fcd535]/10 px-3 py-1 rounded-full uppercase tracking-widest">{update.tag || 'SYSTEM'}</span>
                                                <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">{update.version || 'v2.0'}</span>
                                            </div>
                                            <h3 className="text-2xl font-black text-white italic uppercase tracking-tight">{update.title}</h3>
                                        </div>
                                        <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest bg-black/20 px-4 py-2 rounded-xl border border-white/5">
                                            {update.createdAt.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </span>
                                    </div>

                                    <p className="text-slate-400 text-sm font-bold leading-relaxed mb-8 max-w-3xl">
                                        {update.description}
                                    </p>

                                    {update.changes && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-8 border-t border-white/5">
                                            {update.changes.map((change, i) => (
                                                <div key={i} className="flex items-start gap-3">
                                                    <div className="mt-1.5 w-1.5 h-1.5 bg-[#fcd535] rounded-full shadow-[0_0_8px_#fcd535]"></div>
                                                    <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wide">{change}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default UpdatesContent;
