import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';

const AllNewsPage = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAllNews = async () => {
      try {
        const q = query(collection(db, 'news'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const fetchedNews = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt.toDate(), // Convertir Timestamp a Date
        }));
        setNews(fetchedNews);
      } catch (err) {
        console.error("Error fetching all news from Firebase:", err);
        setError("No se pudieron cargar las noticias. Inténtalo de nuevo más tarde.");
      } finally {
        setLoading(false);
      }
    };

    fetchAllNews();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-dark_text">Cargando noticias...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <section className="py-12 bg-light_bg min-h-screen">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold text-center text-dark_text mb-10">Todas las Noticias Publicadas</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {news.length > 0 ? (
            news.map(item => (
              <div key={item.id} className="bg-light_card p-6 rounded-lg shadow-md border border-gray_border">
                <h2 className="text-xl font-semibold text-dark_text mb-2">{item.title}</h2>
                <p className="text-gray_text text-sm mb-4">{item.createdAt.toLocaleDateString()}</p>
                <p className="text-dark_text">{item.content}</p> {/* Asumiendo que hay un campo 'content' */}
              </div>
            ))
          ) : (
            <p className="text-gray_text text-center col-span-full">No hay noticias disponibles.</p>
          )}
        </div>
      </div>
    </section>
  );
};

export default AllNewsPage;
