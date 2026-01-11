import React, { useState, useEffect } from 'react'; // Importar React y hooks necesarios
import { db } from '../../services/firebase'; // Importar Firebase Firestore
import { collection, getDocs, onSnapshot, doc, addDoc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { ThemeContext } from '../../context/ThemeContext'; // Importar ThemeContext
import { useError } from '../../context/ErrorContext'; // Importar useError

const NewsManagement = () => {
  const { showError, showSuccess } = useError(); // Usar el contexto de errores
  const [news, setNews] = useState([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('General');
  const [content, setContent] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [editingNews, setEditingNews] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'news'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log("NewsManagement: Firebase suscripción - Evento recibido.");
      const fetchedNews = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(), // Convertir Timestamp a Date
        updatedAt: doc.data().updatedAt ? doc.data().updatedAt.toDate() : doc.data().createdAt.toDate(), // Convertir Timestamp a Date
      }));
      setNews(fetchedNews);
    }, (err) => {
      console.error("Error fetching news from Firebase:", err);
      showError('Error al cargar noticias.');
    });

    return () => {
      unsubscribe(); // Desuscribirse de los cambios de Firebase
    };
  }, [showError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    showError(null);
    showSuccess(null);

    if (!title.trim() || !content.trim()) {
      showError('El título y el contenido no pueden estar vacíos.');
      return;
    }

    try {
      if (editingNews) {
        const newsRef = doc(db, 'news', editingNews.id);
        await updateDoc(newsRef, {
          title,
          category,
          content,
          isFeatured,
          updatedAt: new Date(), // Usar un objeto Date para Firebase Timestamp
        });
        showSuccess('Noticia actualizada exitosamente.');
        setEditingNews(null);
      } else {
        await addDoc(collection(db, 'news'), {
          title,
          category,
          content,
          isFeatured,
          createdAt: new Date(), // Usar un objeto Date para Firebase Timestamp
          updatedAt: new Date(), // Usar un objeto Date para Firebase Timestamp
        });
        showSuccess('Noticia publicada exitosamente.');
      }
      setTitle('');
      setCategory('General');
      setContent('');
      setIsFeatured(false);
      // No es necesario llamar a fetchNews() aquí, onSnapshot se encargará de la actualización
    } catch (err) {
      console.error("Error saving news to Firebase:", err);
      showError(`Error al guardar noticia: ${err.message}`);
    }
  };

  const handleEdit = (newsItem) => {
    setEditingNews(newsItem);
    setTitle(newsItem.title);
    setCategory(newsItem.category);
    setContent(newsItem.content);
    setIsFeatured(newsItem.isFeatured);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta noticia?')) {
      try {
        await deleteDoc(doc(db, 'news', id));
        showSuccess('Noticia eliminada exitosamente.');
        // No es necesario filtrar el estado, onSnapshot se encargará de la actualización
      } catch (err) {
        console.error("Error deleting news from Firebase:", err);
        showError(`Error al eliminar noticia: ${err.message}`);
      }
    }
  };

  return (
    <div className="p-6 rounded-2xl shadow-xl space-y-8" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>
      <div className="flex justify-between items-center border-b border-slate-700 pb-4">
        <h2 className="text-3xl font-bold text-white flex items-center gap-2">
          <span className="bg-blue-500/10 p-2 rounded-lg text-lg">📰</span>
          Gestión de Noticias
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Añadir Nueva Noticia */}
        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 shadow-lg flex flex-col h-fit">
          <h3 className="text-xl font-semibold text-blue-400 mb-6 flex items-center gap-2">
            <span className="bg-blue-500/10 p-2 rounded-lg text-sm">{editingNews ? '✏️' : '➕'}</span>
            {editingNews ? 'Editar Noticia' : 'Añadir Nueva Noticia'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium text-slate-400">Título de la Noticia</label>
              <input
                type="text"
                id="title"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all placeholder:text-slate-600"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ingrese el titular..."
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="category" className="text-sm font-medium text-slate-400">Categoría</label>
              <select
                id="category"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="General">General</option>
                <option value="Actualizaciones">Actualizaciones</option>
                <option value="Mantenimiento">Mantenimiento</option>
                <option value="Eventos">Eventos</option>
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="content" className="text-sm font-medium text-slate-400">Contenido del Artículo</label>
              <textarea
                id="content"
                rows="6"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all placeholder:text-slate-600 resize-none"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Escriba el cuerpo de la noticia de forma clara..."
                required
              ></textarea>
            </div>
            <div className="flex items-center gap-3 p-3 bg-blue-500/5 rounded-xl border border-blue-500/10">
              <input
                type="checkbox"
                id="isFeatured"
                className="form-checkbox h-5 w-5 text-blue-500 bg-slate-900 border-slate-700 rounded transition-all cursor-pointer"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
              />
              <label htmlFor="isFeatured" className="text-sm font-bold text-blue-400 cursor-pointer select-none">
                🌟 Marcar como Noticia Destacada
              </label>
            </div>
            <div className="flex gap-3 pt-2">
              {editingNews && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingNews(null);
                    setTitle('');
                    setCategory('General');
                    setContent('');
                    setIsFeatured(false);
                  }}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-6 rounded-xl transition-all"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2"
              >
                {editingNews ? '💾 Guardar Cambios' : '🚀 Publicar Ahora'}
              </button>
            </div>
          </form>
        </div>

        {/* Noticias Publicadas */}
        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 shadow-lg flex flex-col h-[700px]">
          <h3 className="text-xl font-semibold text-blue-400 mb-6 flex items-center gap-2">
            <span className="bg-blue-500/10 p-2 rounded-lg text-sm">📜</span>
            Noticias Publicadas
          </h3>
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
            {news.length > 0 ? (
              news.map((item) => (
                <div key={item.id} className="bg-slate-900/50 border border-slate-700 p-5 rounded-2xl hover:border-slate-500 transition-all group relative overflow-hidden">
                  {item.isFeatured && (
                    <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-tighter shadow-lg">
                      🌟 Destacada
                    </div>
                  )}
                  <div className="flex justify-between items-start mb-2 pr-12">
                    <h4 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors uppercase tracking-tight">{item.title}</h4>
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="bg-slate-700/50 text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest border border-slate-600">
                      {item.category}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {item.createdAt.toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 line-clamp-3 leading-relaxed mb-4">
                    {item.content}
                  </p>
                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-800/50 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(item)}
                      className="text-blue-400 hover:text-blue-300 text-xs font-bold uppercase tracking-wider underline-offset-4 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-red-400 hover:text-red-300 text-xs font-bold uppercase tracking-wider underline-offset-4 hover:underline"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-4 opacity-50 italic py-12">
                <span className="text-4xl italic font-serif">Empty</span>
                <p>No hay noticias publicadas en el sistema.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewsManagement;
