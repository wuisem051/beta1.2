import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

const NewsSection = () => {
  const [news, setNews] = useState([]);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const q = query(collection(db, 'news'), orderBy('createdAt', 'desc'), limit(3));
        const querySnapshot = await getDocs(q);
        const fetchedNews = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt.toDate(), // Convertir Timestamp a Date
        }));
        setNews(fetchedNews);
      } catch (error) {
        console.error("Error fetching news from Firebase:", error);
      }
    };

    fetchNews();
  }, []);

  return (
    <section className="py-12 bg-light_bg">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center text-dark_text mb-8">Últimas Noticias</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {news.length > 0 ? (
            news.map(item => (
              <div key={item.id} className="bg-light_card p-6 rounded-lg shadow-md border border-gray_border">
                <h3 className="text-xl font-semibold text-dark_text mb-2">{item.title}</h3>
                <p className="text-gray_text text-sm">{item.createdAt.toLocaleDateString()}</p>
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

export default NewsSection;
