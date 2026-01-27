import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../services/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, limit, where, getDocs, doc, updateDoc, serverTimestamp, Timestamp, deleteDoc, writeBatch } from 'firebase/firestore';
import { FaHistory, FaRocket, FaBug, FaMagic, FaTrash, FaTrashAlt, FaEraser } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';

const ChatManagement = () => {
    const { currentUser, isAdmin } = useAuth();
    const [activeTab, setActiveTab] = useState('public'); // 'public' or 'private'
    const [publicMessages, setPublicMessages] = useState([]);
    const [privateRooms, setPrivateRooms] = useState([]);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [currentPrivateMessages, setCurrentPrivateMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const scrollRef = useRef();

    // Public Chat Subscription
    useEffect(() => {
        if (activeTab !== 'public') return;

        const q = query(collection(db, 'vipChat'), orderBy('createdAt', 'desc'), limit(100));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedMessages = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date(),
            })).reverse();
            setPublicMessages(fetchedMessages);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [activeTab]);

    // Private Rooms Subscription
    useEffect(() => {
        if (activeTab !== 'private') return;

        // To list rooms, we look for unique userIds in the 'privateVipMessages' collection
        // In a real app, you'd have a 'chatRooms' collection, but let's try to derive it or assume a structure
        const q = query(collection(db, 'privateVipMessages'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const roomsMap = {};
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (!roomsMap[data.userId]) {
                    roomsMap[data.userId] = {
                        userId: data.userId,
                        username: data.username || 'Usuario',
                        displayName: data.displayName || 'Usuario',
                        profilePhotoUrl: data.profilePhotoUrl || '',
                        lastMessage: data.text,
                        lastDate: data.createdAt?.toDate() || new Date(),
                    };
                }
            });
            setPrivateRooms(Object.values(roomsMap));
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [activeTab]);

    // Selected Private Room Messages
    useEffect(() => {
        if (!selectedRoom) return;

        const q = query(
            collection(db, 'privateVipMessages'),
            where('userId', '==', selectedRoom.userId),
            orderBy('createdAt', 'asc')
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedMessages = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date(),
            }));
            setCurrentPrivateMessages(fetchedMessages);
        });

        return () => unsubscribe();
    }, [selectedRoom]);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [publicMessages, currentPrivateMessages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentUser) {
            console.error("No se puede enviar el mensaje: Mensaje vacío o usuario no autenticado.", { newMessage, currentUser });
            return;
        }

        try {
            if (activeTab === 'public') {
                await addDoc(collection(db, 'vipChat'), {
                    text: newMessage,
                    userId: currentUser.uid,
                    username: 'Admin Trader',
                    displayName: 'Admin Trader',
                    profilePhotoUrl: '',
                    isAdmin: true,
                    createdAt: serverTimestamp(),
                });
            } else if (selectedRoom) {
                await addDoc(collection(db, 'privateVipMessages'), {
                    text: newMessage,
                    userId: selectedRoom.userId, // El chat pertenece a la sesión de este usuario
                    senderId: currentUser.uid,
                    username: 'Admin Trader',
                    displayName: 'Admin Trader',
                    profilePhotoUrl: '',
                    isAdmin: true,
                    createdAt: serverTimestamp(),
                });
            }
            setNewMessage('');
        } catch (err) {
            console.error("Error al enviar mensaje (Firestore):", err);
            alert("Error al enviar mensaje: " + err.message + " (Código: " + err.code + ")");
        }
    };

    const handleDeleteMessage = async (msgId) => {
        if (!window.confirm("¿Estás seguro de que deseas eliminar este mensaje?")) return;

        const collName = activeTab === 'public' ? 'vipChat' : 'privateVipMessages';
        try {
            await deleteDoc(doc(db, collName, msgId));
        } catch (err) {
            console.error("Error al eliminar mensaje:", err);
            alert("Error al eliminar mensaje: " + err.message);
        }
    };

    const handleResetChat = async () => {
        const chatName = activeTab === 'public' ? 'PÚBLICO' : `PRIVADO con ${selectedRoom?.displayName || selectedRoom?.username}`;
        if (!window.confirm(`⚠️ ADVERTENCIA: ¿Estás seguro de que deseas BORRAR TODOS los mensajes del chat ${chatName}? Esta acción es irreversible.`)) return;

        setIsLoading(true);
        try {
            const collName = activeTab === 'public' ? 'vipChat' : 'privateVipMessages';
            const q = activeTab === 'public'
                ? query(collection(db, collName))
                : query(collection(db, collName), where('userId', '==', selectedRoom.userId));

            const snapshot = await getDocs(q);
            const batch = writeBatch(db);

            snapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });

            await batch.commit();
            alert("Chat reiniciado con éxito.");
        } catch (err) {
            console.error("Error al reiniciar chat:", err);
            alert("Error al reiniciar chat: " + err.message);
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <div className="flex flex-col h-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
            {/* Header / Tabs */}
            <div className="flex bg-slate-800 p-2 gap-2 border-b border-slate-700">
                <button
                    onClick={() => { setActiveTab('public'); setSelectedRoom(null); }}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'public' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}
                >
                    Chat Público VIP
                </button>
                <button
                    onClick={() => setActiveTab('private')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'private' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}
                >
                    Chats Privados
                </button>

                <div className="flex-1"></div>

                {(activeTab === 'public' || (activeTab === 'private' && selectedRoom)) && (
                    <button
                        onClick={handleResetChat}
                        className="flex items-center gap-2 px-3 py-1.5 bg-red-600/10 hover:bg-red-600 border border-red-500/20 text-red-500 hover:text-white rounded-lg text-xs font-black uppercase tracking-widest transition-all"
                        title="Borrar todos los mensajes"
                    >
                        <FaEraser />
                        <span className="hidden sm:inline">Reiniciar Chat</span>
                    </button>
                )}
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Private Rooms List (Sidebar) */}
                {activeTab === 'private' && (
                    <div className="w-64 border-r border-slate-800 overflow-y-auto bg-slate-900/50">
                        {privateRooms.length === 0 ? (
                            <div className="p-4 text-center text-slate-500 text-xs italic">No hay chats privados activos.</div>
                        ) : (
                            privateRooms.map(room => (
                                <div
                                    key={room.userId}
                                    onClick={() => setSelectedRoom(room)}
                                    className={`p-4 border-b border-slate-800 cursor-pointer transition-colors hover:bg-slate-800 ${selectedRoom?.userId === room.userId ? 'bg-slate-800 border-l-4 border-l-blue-500' : ''}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-700 overflow-hidden flex-shrink-0">
                                            {room.profilePhotoUrl ? <img src={room.profilePhotoUrl} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-xs">👤</div>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-sm truncate text-white">{room.displayName || room.username}</p>
                                            <p className="text-xs text-slate-500 truncate">{room.lastMessage}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Chat Window */}
                <div className="flex-1 flex flex-col bg-slate-900">
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {activeTab === 'private' && !selectedRoom ? (
                            <div className="h-full flex items-center justify-center text-slate-500 italic">Selecciona un chat para comenzar a hablar.</div>
                        ) : (
                            (activeTab === 'public' ? publicMessages : currentPrivateMessages).map((msg) => (
                                <div key={msg.id} className={`flex ${msg.isAdmin ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`flex max-w-[80%] ${msg.isAdmin ? 'flex-row-reverse' : 'flex-row'}`}>
                                        <div className={`w-8 h-8 rounded-full overflow-hidden flex-shrink-0 mt-auto ${msg.isAdmin ? 'ml-2' : 'mr-2'}`}>
                                            {msg.profilePhotoUrl ? (
                                                <img src={msg.profilePhotoUrl} alt="Avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className={`w-full h-full ${msg.isAdmin ? 'bg-blue-600' : 'bg-slate-700'} flex items-center justify-center text-[10px]`}>
                                                    {msg.isAdmin ? 'TR' : 'US'}
                                                </div>
                                            )}
                                        </div>
                                        <div className={`flex flex-col ${msg.isAdmin ? 'items-end' : 'items-start'}`}>
                                            <span className="text-[10px] text-slate-500 mb-1 px-2 font-bold" style={{ color: msg.isAdmin ? '#3b82f6' : '#eab308' }}>
                                                {msg.displayName || msg.username}
                                            </span>
                                            <div className={`p-3 rounded-2xl text-xs font-medium shadow-sm ${msg.isAdmin ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-100 rounded-tl-none'}`}>
                                                {msg.text}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[9px] text-slate-600 px-2">
                                                    {msg.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                <button
                                                    onClick={() => handleDeleteMessage(msg.id)}
                                                    className="p-1 text-slate-700 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Eliminar mensaje"
                                                >
                                                    <FaTrashAlt size={10} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={scrollRef} />
                    </div>

                    {(activeTab === 'public' || selectedRoom) && (
                        <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800 flex gap-2 bg-slate-800/50">
                            <input
                                type="text"
                                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-blue-500/50 outline-none text-sm transition-all"
                                placeholder="Escribe un mensaje de respuesta..."
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                            />
                            <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-xl shadow-lg transition-all flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polyline points="22 2 15 22 11 13 2 9 22 2" /></svg>
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatManagement;
