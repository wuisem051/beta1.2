import React, { useContext } from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { ThemeContext } from '../../context/ThemeContext';
import styles from '../pages/UserPanel.module.css';

ChartJS.register(ArcElement, Tooltip, Legend);

const CollectiveFundContent = () => {
  const { darkMode } = useContext(ThemeContext);

  const data = {
    labels: ['Fondo Desarrollo', 'Trading/Inversiones', 'Fondo Usuarios'],
    datasets: [
      {
        data: [30, 50, 20],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(16, 185, 129, 0.8)',
        ],
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 2,
        hoverOffset: 15,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: darkMode ? '#94a3b8' : '#64748b',
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle',
          font: {
            size: 12,
            weight: '700',
            family: "'Inter', sans-serif",
          },
        },
      },
      tooltip: {
        backgroundColor: darkMode ? '#1e293b' : '#ffffff',
        titleColor: darkMode ? '#f1f5f9' : '#0f172a',
        bodyColor: darkMode ? '#f1f5f9' : '#0f172a',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
      },
      datalabels: {
        color: '#fff',
        font: {
          size: 14,
          weight: '800',
        },
        formatter: (value, context) => {
          const total = context.chart.data.datasets[0].data.reduce((sum, val) => sum + val, 0);
          return ((value / total) * 100).toFixed(0) + '%';
        },
        dropShadow: {
          enabled: true,
          color: 'rgba(0,0,0,0.5)',
          blur: 4
        }
      },
    },
  };

  return (
    <div className={styles.dashboardContent}>
      <h1 className={styles.mainContentTitle}>Fondo Colectivo</h1>
      <p className={styles.statTitle} style={{ marginBottom: '2rem' }}>
        Participa en inversiones conjuntas y obtén rendimientos gestionados por profesionales.
      </p>

      <div className={styles.sectionCard} style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h2 className={styles.sectionTitle} style={{ textAlign: 'center', marginBottom: '2rem' }}>Distribución de Fondos</h2>
        <div className={styles.chartContainer} style={{ height: '400px', position: 'relative' }}>
          <Pie data={data} options={options} plugins={[ChartDataLabels]} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className={styles.summaryCard}>
            <p className={styles.statTitle}>Capital Total</p>
            <p className={styles.statsValueGreen}>$1,250,000</p>
          </div>
          <div className={styles.summaryCard}>
            <p className={styles.statTitle}>Rendimiento 30d</p>
            <p className={styles.statsValueBlue}>+12.4%</p>
          </div>
          <div className={styles.summaryCard}>
            <p className={styles.statTitle}>Miembros</p>
            <p className={styles.statsTitle} style={{ marginBottom: 0 }}>2,450</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollectiveFundContent;
