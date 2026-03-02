import React from 'react';
import { FaCircleNotch } from 'react-icons/fa';

const Loader = ({ text = "Cargando..." }) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] w-full animate-in fade-in duration-500">
            <div className="relative flex items-center justify-center mb-6">
                {/* Glow effect */}
                <div className="absolute inset-0 bg-[#fcd535] rounded-full blur-[30px] opacity-20 animate-pulse"></div>
                {/* Primary spinner */}
                <FaCircleNotch className="w-12 h-12 text-[#fcd535] animate-spin drop-shadow-[0_0_15px_rgba(252,213,53,0.5)]" />
                {/* Inner pulsing core */}
                <div className="absolute w-4 h-4 bg-[#fcd535] rounded-full animate-ping opacity-75"></div>
            </div>
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">
                {text}
            </h3>
        </div>
    );
};

export default Loader;
