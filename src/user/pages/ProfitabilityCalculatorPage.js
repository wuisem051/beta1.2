import React, { useContext } from 'react';
import ProfitabilityCalculator from '../components/ProfitabilityCalculator';
import { ThemeContext } from '../../context/ThemeContext'; // Importar ThemeContext

const ProfitabilityCalculatorPage = () => {
  const { theme } = useContext(ThemeContext); // Usar ThemeContext

  return (
    <div className={`min-h-screen ${theme.background} ${theme.text} flex flex-col items-center justify-center p-4`}>
      <div className={`container mx-auto p-4 ${theme.backgroundAlt} rounded-xl shadow-lg`}>
        <ProfitabilityCalculator />
      </div>
    </div>
  );
};

export default ProfitabilityCalculatorPage;
