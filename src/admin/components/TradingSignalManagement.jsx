import React, { useContext, useEffect, useState, useRef } from 'react';
import { ThemeContext } from '../../context/ThemeContext';
import { db, storage } from '../../services/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useError } from '../../context/ErrorContext';
import { useAuth } from '../../context/AuthContext';

// Icons
import { FaBinoculars, FaBolt, FaChartLine, FaCheckCircle, FaExclamationTriangle, FaMagic, FaPlus, FaSearch, FaTrash, FaTimes } from 'react-icons/fa';

const TradingSignalManagement = () => {
  const { darkMode } = useContext(ThemeContext);
  const { showError, showSuccess } = useError();
  const { currentUser } = useAuth();

  // Data State
  const [signals, setSignals] = useState([]);
  const [marketPairs, setMarketPairs] = useState([]);
  const [filteredPairs, setFilteredPairs] = useState([]);
  const [isPairDropdownOpen, setIsPairDropdownOpen] = useState(false);
  const [pairSearch, setPairSearch] = useState('');

  // UI State
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('new'); // 'new', 'list'

  // Form State
  const [asset, setAsset] = useState('');
  const [type, setType] = useState('Compra');
  const [entryPrice, setEntryPrice] = useState('');
  const [currentPrice, setCurrentPrice] = useState(0);

  // Strategy State
  const [riskPercent, setRiskPercent] = useState(2); // 2% default risk
  const [rewardRatio, setRewardRatio] = useState(2); // 1:2 R:R default
  const [stopLoss, setStopLoss] = useState('');
  const [stopLossPercentage, setStopLossPercentage] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [maxInvestment, setMaxInvestment] = useState('100');

  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('Activa');
  const [imageFile, setImageFile] = useState(null);

  // Initial Data Fetch
  useEffect(() => {
    fetchBinancePairs();
    const q = query(collection(db, 'tradingSignals'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSignals(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })));
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Filter Pairs
  useEffect(() => {
    if (!pairSearch) {
      setFilteredPairs([]);
      return;
    }
    const filtered = marketPairs.filter(p => p.symbol.includes(pairSearch.toUpperCase())).slice(0, 10);
    setFilteredPairs(filtered);
  }, [pairSearch, marketPairs]);

  // Auto-Calculate Strategy when Entry or Risk changes
  useEffect(() => {
    if (!entryPrice || !riskPercent || !rewardRatio) return;

    const entry = parseFloat(entryPrice);
    if (isNaN(entry)) return;

    // Calculate Stop Loss based on Risk %
    let sl;
    if (type === 'Compra') {
      sl = entry * (1 - (riskPercent / 100));
    } else {
      sl = entry * (1 + (riskPercent / 100));
    }
    setStopLoss(sl.toFixed(8));
    setStopLossPercentage(riskPercent);

    // Calculate Take Profit based on R:R
    const riskAmount = Math.abs(entry - sl);
    const rewardAmount = riskAmount * rewardRatio;

    let tp;
    if (type === 'Compra') {
      tp = entry + rewardAmount;
    } else {
      tp = entry - rewardAmount;
    }
    setTakeProfit(tp.toFixed(8));

  }, [entryPrice, riskPercent, rewardRatio, type]);


  const fetchBinancePairs = async () => {
    try {
      const response = await fetch('https://api.binance.com/api/v3/exchangeInfo');
      const data = await response.json();
      const usdtPairs = data.symbols
        .filter(s => s.quoteAsset === 'USDT' && s.status === 'TRADING')
        .map(s => ({ symbol: s.symbol, baseAsset: s.baseAsset, quoteAsset: s.quoteAsset }));
      setMarketPairs(usdtPairs);
    } catch (error) {
      console.error("Error fetching pairs:", error);
    }
  };

  const fetchCurrentPrice = async (symbol) => {
    try {
      const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
      const data = await response.json();
      const price = parseFloat(data.price);
      setCurrentPrice(price);
      setEntryPrice(price.toString()); // Auto-fill entry
    } catch (error) {
      console.error("Error fetching price:", error);
    }
  };

  const handleSelectPair = (pair) => {
    setAsset(pair.symbol);
    setPairSearch(pair.symbol);
    setIsPairDropdownOpen(false);
    fetchCurrentPrice(pair.symbol);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!asset || !entryPrice) return showError("Faltan datos obligatorios");

    setIsSubmitting(true);
    try {
      let imageUrl = '';
      if (imageFile) {
        const storageRef = ref(storage, `trading-signals/${Date.now()}_${imageFile.name}`);
        const snapshot = await uploadBytes(storageRef, imageFile);
        imageUrl = await getDownloadURL(snapshot.ref);
      }

      await addDoc(collection(db, 'tradingSignals'), {
        asset, type,
        entryPrice: parseFloat(entryPrice),
        takeProfit: parseFloat(takeProfit),
        stopLoss: parseFloat(stopLoss),
        stopLossPercentage: parseFloat(stopLossPercentage),
        maxInvestment: parseFloat(maxInvestment),
        status, notes, imageUrl,
        createdAt: new Date()
      });

      showSuccess("Señal creada con éxito");
      // Reset form simple
      setAsset(''); setPairSearch(''); setEntryPrice(''); setNotes('');
      setActiveTab('list');
    } catch (error) {
      showError("Error al crear señal");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await updateDoc(doc(db, 'tradingSignals', id), {
        status: newStatus,
        updatedAt: new Date()
      });
      showSuccess(`Señal marcada como ${newStatus}`);
    } catch (err) {
      showError('Error al actualizar el estado');
      console.error(err);
    }
  };


  const handleDeleteSignal = async (id) => {
    if (window.confirm('¿Eliminar esta señal?')) {
      try {
        await deleteDoc(doc(db, 'tradingSignals', id));
        showSuccess('Señal eliminada');
      } catch (err) {
        showError('Error al eliminar');
      }
    }
  };


  return (
    <div className="min-h-screen bg-slate-950 p-6 md:p-12 text-slate-100 font-sans">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 border-b border-slate-800 pb-8">
          <div>
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 mb-2">
              Centro de Comando
            </h1>
            <p className="text-slate-400 font-medium tracking-wide">Gestión Avanzada de Señales Algorítmicas</p>
          </div>
          <div className="flex gap-4 mt-6 md:mt-0">
            <button
              onClick={() => setActiveTab('new')}
              className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === 'new' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
            >
              <FaMagic /> Nueva Señal
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === 'list' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
            >
              <FaBinoculars /> Señales Activas <span className="ml-2 bg-slate-900 px-2 py-0.5 rounded-md text-xs">{signals.length}</span>
            </button>
          </div>
        </div>

        {activeTab === 'new' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Left Column: Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Market Data Section */}
              <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-xl">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                  <span className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><FaSearch /></span>
                  Datos de Mercado
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Pair Selector */}
                  <div className="relative z-50">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Par (Binance)</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={pairSearch}
                        onChange={(e) => {
                          setPairSearch(e.target.value);
                          setIsPairDropdownOpen(true);
                        }}
                        onFocus={() => setIsPairDropdownOpen(true)}
                        placeholder="Buscar par (ej. BTC)"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-4 text-white font-mono font-bold focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                      />
                      {isPairDropdownOpen && filteredPairs.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto z-50">
                          {filteredPairs.map(pair => (
                            <button
                              key={pair.symbol}
                              onClick={() => handleSelectPair(pair)}
                              className="w-full text-left px-4 py-3 hover:bg-slate-700 transition-colors flex justify-between items-center group"
                            >
                              <span className="font-bold text-white group-hover:text-blue-400">{pair.symbol}</span>
                              <span className="text-xs text-slate-500">{pair.baseAsset}/{pair.quoteAsset}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Signal Type */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Dirección</label>
                    <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-700">
                      <button
                        type="button"
                        onClick={() => setType('Compra')}
                        className={`py-3 rounded-lg font-bold text-sm transition-all ${type === 'Compra' ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'text-slate-400 hover:text-white'}`}
                      >
                        LONG (Compra)
                      </button>
                      <button
                        type="button"
                        onClick={() => setType('Venta')}
                        className={`py-3 rounded-lg font-bold text-sm transition-all ${type === 'Venta' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'text-slate-400 hover:text-white'}`}
                      >
                        SHORT (Venta)
                      </button>
                    </div>
                  </div>

                  {/* Entry Price */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Precio de Entrada</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="any"
                        value={entryPrice}
                        onChange={(e) => setEntryPrice(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-4 text-white font-mono font-bold text-lg focus:ring-2 focus:ring-blue-500/50 outline-none transition-all pl-12"
                      />
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                      {currentPrice > 0 && (
                        <button
                          type="button"
                          onClick={() => setEntryPrice(currentPrice.toString())}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-xs bg-blue-500/10 text-blue-400 px-2 py-1 rounded hover:bg-blue-500/20 transition-colors"
                        >
                          Usar Actual: ${currentPrice}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Risk Strategy Section */}
              <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-xl">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                  <span className="p-2 bg-purple-500/10 rounded-lg text-purple-400"><FaBolt /></span>
                  Estrategia Automática
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  {/* Risk Slider */}
                  <div>
                    <div className="flex justify-between mb-4">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Riesgo (Stop Loss %)</label>
                      <span className="text-white font-bold bg-slate-800 px-2 py-0.5 rounded">{riskPercent}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="10"
                      step="0.1"
                      value={riskPercent}
                      onChange={(e) => setRiskPercent(parseFloat(e.target.value))}
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                    <div className="flex justify-between mt-2 text-xs text-slate-600 font-mono">
                      <span>Conservador (1%)</span>
                      <span>Agresivo (5%+)</span>
                    </div>
                  </div>

                  {/* Reward Ratio Slider */}
                  <div>
                    <div className="flex justify-between mb-4">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ratio Beneficio (R:R)</label>
                      <span className="text-white font-bold bg-slate-800 px-2 py-0.5 rounded">1:{rewardRatio}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="0.5"
                      value={rewardRatio}
                      onChange={(e) => setRewardRatio(parseFloat(e.target.value))}
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-green-500"
                    />
                    <div className="flex justify-between mt-2 text-xs text-slate-600 font-mono">
                      <span>Scalp (1:1.5)</span>
                      <span>Swing (1:3+)</span>
                    </div>
                  </div>
                </div>

                {/* Calculated Values Preview */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4">
                    <span className="text-xs text-red-400 font-bold uppercase block mb-1">Stop Loss (Calc)</span>
                    <div className="text-xl font-mono font-black text-red-500">{stopLoss || '---'}</div>
                    <span className="text-[10px] text-red-400/60 font-mono">-{riskPercent}% del capital</span>
                  </div>
                  <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-4">
                    <span className="text-xs text-green-400 font-bold uppercase block mb-1">Take Profit (Calc)</span>
                    <div className="text-xl font-mono font-black text-green-500">{takeProfit || '---'}</div>
                    <span className="text-[10px] text-green-400/60 font-mono">Target 1:{rewardRatio}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-5 rounded-2xl shadow-xl shadow-blue-600/20 transform transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-lg flex items-center justify-center gap-3"
              >
                {isSubmitting ? <span className="animate-spin">⏳</span> : <FaMagic />}
                Publicar Señal Maestra
              </button>

            </div>

            {/* Right Column: Preview & Extras */}
            <div className="space-y-6">
              {/* Live Preview Card */}
              <div className="sticky top-6">
                <h4 className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-4">Vista Previa Usuario</h4>
                <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative">
                  {/* Accent Line */}
                  <div className={`h-1 w-full ${type === 'Compra' ? 'bg-green-500' : 'bg-red-500'}`}></div>

                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h2 className="text-2xl font-black text-white">{asset || 'BTC/USDT'}</h2>
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase mt-1 ${type === 'Compra' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {type}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500 font-bold uppercase">Entrada</div>
                        <div className="font-mono text-white font-bold">{entryPrice || '0.00'}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-6">
                      <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                        <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Take Profit</div>
                        <div className="font-mono text-green-400 font-bold">{takeProfit || '---'}</div>
                      </div>
                      <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                        <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Stop Loss</div>
                        <div className="font-mono text-red-400 font-bold">{stopLoss || '---'}</div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-slate-500 font-bold block mb-1">Inversión Máxima</label>
                        <input
                          type="number"
                          value={maxInvestment}
                          onChange={(e) => setMaxInvestment(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 font-bold block mb-1">Nota del Trader</label>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Análisis técnico..."
                          rows="2"
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm resize-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* List View */}
        {activeTab === 'list' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {signals.map(signal => (
              <div key={signal.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 group hover:border-blue-500/30 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">{signal.asset}</h3>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${signal.type === 'Compra' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                      {signal.type}
                    </span>
                  </div>
                  <button onClick={() => handleDeleteSignal(signal.id)} className="text-slate-600 hover:text-red-500 transition-colors">
                    <FaTrash />
                  </button>
                </div>
                <div className="space-y-2 text-sm text-slate-400 font-mono">
                  <div className="flex justify-between">
                    <span>Entrada:</span>
                    <span className="text-white">{signal.entryPrice}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TP:</span>
                    <span className="text-green-400">{signal.takeProfit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SL:</span>
                    <span className="text-red-400">{signal.stopLoss}</span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center text-xs text-slate-500">
                  <span>{new Date(signal.createdAt).toLocaleDateString()}</span>
                  <span className={`px-2 py-0.5 rounded ${signal.status === 'Activa' ? 'bg-blue-500/10 text-blue-400' : signal.status === 'Completada' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                    {signal.status}
                  </span>
                </div>

                {signal.status === 'Activa' && (
                  <div className="mt-4 grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <button
                      onClick={() => handleUpdateStatus(signal.id, 'Completada')}
                      className="flex items-center justify-center gap-2 py-2 rounded-xl bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white transition-all font-bold text-xs border border-green-500/20"
                    >
                      <FaCheckCircle /> Éxito
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(signal.id, 'Fallida')}
                      className="flex items-center justify-center gap-2 py-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-bold text-xs border border-red-500/20"
                    >
                      <FaTimes /> Fallo
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default TradingSignalManagement;
