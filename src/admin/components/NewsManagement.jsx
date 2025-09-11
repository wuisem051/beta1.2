import React, { useState, useEffect, useContext } from 'react'; // Importar useContext
import { db } from '../../services/firebase'; // Importar Firebase Firestore
import { collection, getDocs, onSnapshot, doc, addDoc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { ThemeContext } from '../../context/ThemeContext'; // Importar ThemeContext
import { useError } from '../../context/ErrorContext'; // Importar useError

const NewsManagement = () => {
  const { darkMode } = useContext(ThemeContext); // Usar ThemeContext
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
    <div className={`p-6 min-h-screen ${darkMode ? 'bg-dark_bg text-light_text' : 'bg-gray-900 text-white'}`}>
      <h1 className={`text-3xl font-bold mb-6 ${darkMode ? 'text-light_text' : 'text-white'}`}>Noticias</h1>
      {/* Los mensajes de error y éxito ahora se manejan globalmente */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Añadir Nueva Noticia */}
        <div className={`${darkMode ? 'bg-dark_card border-dark_border' : 'bg-gray-800'} p-6 rounded-lg shadow-md border`}>
          <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-light_text' : 'text-white'}`}>{editingNews ? 'Editar Noticia' : 'Añadir Nueva Noticia'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="title" className={`block text-sm font-medium mb-1 ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>Título</label>
              <input
                type="text"
                id="title"
                className={`w-full p-2 rounded-md text-sm focus:outline-none focus:border-yellow-500 ${darkMode ? 'bg-dark_bg border-dark_border text-light_text' : 'bg-gray-700 border-gray-600 text-white'}`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label htmlFor="category" className={`block text-sm font-medium mb-1 ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>Categoría</label>
              <select
                id="category"
                className={`w-full p-2 rounded-md text-sm focus:outline-none focus:border-yellow-500 ${darkMode ? 'bg-dark_bg border-dark_border text-light_text' : 'bg-gray-700 border-gray-600 text-white'}`}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="General">General</option>
                <option value="Actualizaciones">Actualizaciones</option>
                <option value="Mantenimiento">Mantenimiento</option>
                <option value="Eventos">Eventos</option>
              </select>
            </div>
            <div className="mb-4">
              <label htmlFor="content" className={`block text-sm font-medium mb-1 ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>Contenido</label>
              <textarea
                id="content"
                rows="5"
                className={`w-full p-2 rounded-md text-sm focus:outline-none focus:border-yellow-500 ${darkMode ? 'bg-dark_bg border-dark_border text-light_text' : 'bg-gray-700 border-gray-600 text-white'}`}
                value={content}
                onChange={(e) => setContent(e.target.value)}
              ></textarea>
            </div>
            <div className="mb-6">
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  className={`form-checkbox h-5 w-5 text-blue-600 rounded ${darkMode ? 'bg-dark_bg border-dark_border' : 'bg-gray-700 border-gray-600'}`}
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                />
                <span className={`ml-2 text-sm ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>Noticia destacada</span>
              </label>
            </div>
            <button
              type="submit"
              className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-md w-full"
            >
              {editingNews ? 'Guardar Cambios' : 'Publicar Noticia'}
            </button>
          </form>
        </div>

        {/* Noticias Publicadas */}
        <div className={`${darkMode ? 'bg-dark_card border-dark_border' : 'bg-gray-800'} p-6 rounded-lg shadow-md border`}>
          <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-light_text' : 'text-white'}`}>Noticias Publicadas</h2>
          {news.length > 0 ? (
            <div className="space-y-4">
              {news.map((item) => (
                <div key={item.id} className={`${darkMode ? 'bg-dark_bg' : 'bg-gray-700'} p-4 rounded-md shadow-sm`}>
                  <h3 className={`text-lg font-semibold ${darkMode ? 'text-light_text' : 'text-white'}`}>{item.title}</h3>
                  <p className={`text-sm mb-2 ${darkMode ? 'text-light_text' : 'text-gray-400'}`}>Categoría: {item.category} {item.isFeatured && <span className={`${darkMode ? 'text-accent' : 'text-yellow-400'}`}>(Destacada)</span>}</p>
                  <p className={`text-sm line-clamp-3 ${darkMode ? 'text-light_text' : 'text-gray-300'}`}>{item.content}</p>
                  <div className="mt-3 flex space-x-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="text-indigo-400 hover:text-indigo-600 text-sm"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-red-400 hover:text-red-600 text-sm"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className={`${darkMode ? 'text-light_text' : 'text-gray-400'} text-center py-6`}>No hay noticias publicadas.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewsManagement;
