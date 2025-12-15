import React, { useContext } from 'react';
import { ThemeContext } from '../../context/ThemeContext';
import styles from '../pages/UserPanel.module.css'; // Reutilizar estilos del panel de usuario
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, plugins } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

// Registrar los componentes y plugins necesarios de Chart.js
ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

const CollectiveFundContent = () => {
  const { darkMode } = useContext(ThemeContext);

  const data = {
    labels: ['Fondo para Desarrollo', 'Fondo para Trading/Inversiones', 'Fondo para Usuarios'],
    datasets: [
      {
        label: 'Distribución del Fondo Colectivo',
        data: [30, 50, 20], // Datos de ejemplo: 30% Desarrollo, 50% Trading, 20% Usuarios
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)', // Rojo para Desarrollo
          'rgba(54, 162, 235, 0.6)', // Azul para Trading/Inversiones
          'rgba(75, 192, 192, 0.6)', // Verde para Usuarios
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(75, 192, 192, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false, // Permitir que el gráfico no mantenga la relación de aspecto
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: darkMode ? '#e0e0e0' : '#333333', // Color de las etiquetas de la leyenda
          font: {
            size: 14, // Tamaño de fuente de la leyenda
          },
        },
      },
      title: {
        display: true,
        text: 'Distribución del Fondo Colectivo',
        color: darkMode ? '#e0e0e0' : '#333333', // Color del título del gráfico
        font: {
          size: 18, // Tamaño de fuente del título
          weight: 'bold',
        },
      },
      datalabels: {
        color: '#fff', // Color de los porcentajes
        font: {
          size: 16, // Tamaño de fuente de los porcentajes
          weight: 'bold',
        },
        formatter: (value, context) => {
          const total = context.chart.data.datasets[0].data.reduce((sum, val) => sum + val, 0);
          const percentage = ((value / total) * 100).toFixed(1) + '%';
          return percentage;
        },
      },
    },
  };

  return (
    <div className={`${styles.collectiveFundContent} ${darkMode ? styles.dark : styles.light}`}>
      <h1 className={styles.pageTitle}>Fondo Colectivo</h1>
      <p className={styles.developmentText}>
        ¡Bienvenido a la sección de Fondo Colectivo!
      </p>
      <p className={styles.developmentSubText}>
        Aquí podrás participar en inversiones conjuntas y obtener rendimientos. Esta sección está actualmente en desarrollo.
      </p>

      <div className={`${styles.sectionCard} ${darkMode ? styles.dark : styles.light} mt-8 p-6 rounded-lg shadow-xl`}>
        <h2 className={`${styles.sectionTitle} text-2xl font-bold mb-6 text-center`}>Distribución Actual de Fondos</h2>
        <div className={`${styles.chartContainer} relative h-96 w-full`} style={{ maxWidth: '700px', margin: 'auto' }}>
          <Pie data={data} options={options} />
        </div>
      </div>
    </div>
  );
};

export default CollectiveFundContent;
