import React from 'react';

const StatsSection = ({ totalHashrate, activeMiners, pricePerTHs }) => {
  return (
     <section className="mb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto"> {/* Cambiado a 3 columnas */}
            <div className="stat-card p-6 rounded-lg text-center shadow-md">
                <h3 className="text-gray_text text-sm font-medium uppercase">Hashrate Total</h3>
                <p className="text-3xl font-bold text-dark_text mt-2">{totalHashrate.toFixed(2)} TH/s</p>
            </div>
            <div className="stat-card p-6 rounded-lg text-center shadow-md">
                <h3 className="text-gray_text text-sm font-medium uppercase">Mineros Activos</h3>
                <p className="text-3xl font-bold text-dark_text mt-2">{activeMiners}</p>
            </div>
            <div className="stat-card p-6 rounded-lg text-center shadow-md">
                <h3 className="text-gray_text text-sm font-medium uppercase">Precio por TH/s (USD)</h3>
                <p className="text-3xl font-bold text-dark_text mt-2">${pricePerTHs.toFixed(2)}</p>
            </div>
        </div>
    </section>
  );
};

export default StatsSection;
