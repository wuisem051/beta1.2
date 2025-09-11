import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { db } from '../../services/firebase'; // Importar Firebase Firestore
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';

// Registrar los componentes de Chart.js que se van a usar
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const PerformanceStatsSection = () => {
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [],
  });
  const [totalHashrate, setTotalHashrate] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        let resetDate = new Date(0);
        try {
          const siteConfigQuery = query(collection(db, 'settings'), where('key', '==', 'siteConfig'));
          const siteConfigSnapshot = await getDocs(siteConfigQuery);
          if (!siteConfigSnapshot.empty) {
            const siteConfigData = siteConfigSnapshot.docs[0].data();
            if (siteConfigData && siteConfigData.performanceStatsResetDate) {
              resetDate = siteConfigData.performanceStatsResetDate.toDate();
            }
          }
        } catch (err) {
          console.error("Error fetching site config from Firebase:", err);
        }

        const minersQuery = query(collection(db, 'miners'), where('createdAt', '>=', Timestamp.fromDate(resetDate)));
        const minersSnapshot = await getDocs(minersQuery);

        let currentTotalHashrate = 0;
        if (!minersSnapshot.empty) {
          minersSnapshot.docs.forEach((doc) => {
            const miner = doc.data();
            currentTotalHashrate += miner.currentHashrate || 0;
          });
        }
        setTotalHashrate(currentTotalHashrate);

        // Generar datos para el gráfico (simulados o reales si hay datos históricos de hashrate)
        const labels = [];
        const data = [];
        const today = new Date();
        for (let i = 6; i >= 0; i--) { // Últimos 7 días
          const date = new Date(today);
          date.setDate(today.getDate() - i);
          if (date >= resetDate) {
            labels.push(date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }));
            // Simular una variación para el gráfico de hashrate
            data.push((currentTotalHashrate * (0.9 + Math.random() * 0.2)).toFixed(2));
          }
        }

        setChartData({
          labels,
          datasets: [
            {
              label: `Hashrate Total de la Pool (TH/s)`,
              data: data,
              borderColor: '#3B82F6', // blue_link
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              fill: true,
              tension: 0.4,
            },
          ],
        });

      } catch (err) {
        console.error("Error fetching performance stats from Firebase:", err);
        setError('Error al cargar las estadísticas de rendimiento.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#1F2937', // dark_text
        },
      },
      title: {
        display: true,
        text: 'Rendimiento del Hashrate Total (Últimos 7 Días)',
        color: '#1F2937', // dark_text
      },
    },
    scales: {
      x: {
        ticks: {
          color: '#6B7280', // gray_text
        },
        grid: {
          color: '#E5E7EB', // gray_border
        },
      },
      y: {
        ticks: {
          color: '#6B7280', // gray_text
        },
        grid: {
          color: '#E5E7EB', // gray_border
        },
      },
    },
  };

  return (
    <section id="performance-stats" className="mb-12 p-6 bg-light_card rounded-lg shadow-md max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-dark_text mb-6 text-center">Estadísticas de Rendimiento de la Pool</h2>

      {loading && <p className="text-gray_text text-center">Cargando estadísticas...</p>}
      {error && <div className="bg-red_error text-white p-3 rounded mb-4 text-center">{error}</div>}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-1 gap-6 mb-8">
            <div className="bg-gray-100 p-4 rounded-lg text-center shadow-sm border border-gray_border">
              <h3 className="text-gray_text text-sm font-medium uppercase">Hashrate Total de la Pool</h3>
              <p className="text-3xl font-bold text-blue_link mt-2">{totalHashrate.toFixed(2)} TH/s</p>
            </div>
          </div>
          <div className="bg-gray-100 p-4 rounded-lg shadow-inner h-80 border border-gray_border">
            <Line data={chartData} options={chartOptions} />
          </div>
        </>
      )}
    </section>
  );
};

export default PerformanceStatsSection;
