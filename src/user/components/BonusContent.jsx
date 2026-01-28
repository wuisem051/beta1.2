import React, { useContext } from 'react';
import { ThemeContext } from '../../context/ThemeContext';
import { FaCrown, FaGift, FaLock, FaGem, FaArrowRight } from 'react-icons/fa';

const BonusContent = () => {
  const { darkMode } = useContext(ThemeContext);

  const rewards = [
    { title: 'Bono de Bienvenida', amount: '0.005 BTC', status: 'Disponible', type: 'Crédito', icon: <FaGift className="text-[#fcd535]" /> },
    { title: 'Recompensa VIP Nivel 2', amount: '0.012 BTC', status: 'Bloqueado', type: 'Vesting', icon: <FaLock className="text-slate-600" /> },
    { title: 'Mining Hashrate Boost', amount: '+5% TH/s', status: 'Activo', type: 'Multiplicador', icon: <FaGem className="text-[#fcd535] animate-pulse" /> },
  ];

  return (
    <div className="min-h-screen bg-[#0b0e11] p-4 lg:p-10 animate-in fade-in duration-700">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-[#fcd535] rounded-xl">
                <FaCrown className="text-black" size={20} />
              </div>
              <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">Centro de Recompensas</h1>
            </div>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] ml-1">Optimiza tu rendimiento con activos exclusivos</p>
          </div>

          <div className="bg-[#1e2329] border border-white/5 p-6 rounded-[2.5rem] flex items-center gap-6 shadow-2xl">
            <div className="text-right">
              <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mb-1">Nivel Actual</p>
              <p className="text-xl font-black text-white italic">ELITE INVESTOR</p>
            </div>
            <div className="w-[1px] h-12 bg-white/5"></div>
            <div className="flex -space-x-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-[#1e2329] bg-slate-800 flex items-center justify-center">
                  <span className="text-[10px] font-black text-[#fcd535]">V{i}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Progress Bar Section */}
        <div className="bg-[#1e2329] border border-white/5 rounded-[3rem] p-10 mb-10 relative overflow-hidden group shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#fcd535]/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h2 className="text-xl font-black text-[#fcd535] uppercase tracking-tighter mb-2">Progreso de Recompensa Mensual</h2>
                <p className="text-[10px] text-slate-400 font-bold">Completa 10.0 TH/s de volumen para desbloquear el siguiente nodo</p>
              </div>
              <p className="text-4xl font-black text-white italic">75%</p>
            </div>
            <div className="w-full h-4 bg-[#0b0e11] rounded-full p-1 shadow-inner">
              <div className="h-full bg-gradient-to-r from-[#fcd535] via-[#ffeb3b] to-[#fcd535] rounded-full shadow-[0_0_20px_rgba(252,213,53,0.3)] w-[75%] relative">
                <div className="absolute top-0 right-0 w-2 h-2 bg-white rounded-full animate-ping"></div>
              </div>
            </div>
            <div className="flex justify-between mt-4">
              <span className="text-[9px] font-black text-slate-700">7.5 TH/s</span>
              <span className="text-[9px] font-black text-slate-700">10.0 TH/s</span>
            </div>
          </div>
        </div>

        {/* Rewards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {rewards.map((reward, idx) => (
            <div key={idx} className="bg-[#1e2329] border border-white/5 rounded-[2.5rem] p-8 hover:bg-[#2b3139] transition-all duration-500 shadow-xl group cursor-pointer border-b-4 border-b-transparent hover:border-b-[#fcd535]">
              <div className="flex justify-between items-start mb-8">
                <div className="p-4 bg-white/5 rounded-2xl group-hover:bg-[#fcd535]/10 transition-all">
                  {reward.icon}
                </div>
                <span className={`text-[8px] font-black uppercase px-3 py-1 rounded-full ${reward.status === 'Disponible' ? 'bg-emerald-500/10 text-emerald-500' : reward.status === 'Activo' ? 'bg-[#fcd535]/10 text-[#fcd535]' : 'bg-slate-800 text-slate-600'}`}>
                  {reward.status}
                </span>
              </div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight mb-2">{reward.title}</h3>
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-6">{reward.type}</p>
              <div className="flex justify-between items-center">
                <p className="text-2xl font-black text-white italic">{reward.amount}</p>
                <div className="p-2 rounded-lg bg-white/5 opacity-0 group-hover:opacity-100 transition-all -translate-x-4 group-hover:translate-x-0">
                  <FaArrowRight className="text-[#fcd535]" size={14} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Note */}
        <div className="mt-16 text-center opacity-30">
          <p className="text-[9px] font-black uppercase tracking-[0.5em] text-white">Consulte los términos de uso del nodo global de recompensas</p>
        </div>
      </div>
    </div>
  );
};

export default BonusContent;
