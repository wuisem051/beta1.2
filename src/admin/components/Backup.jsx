import React from 'react'; // React base

const Backup = () => {
  return (
    <div className="p-6 rounded-2xl shadow-xl space-y-8" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>
      <div className="flex justify-between items-center border-b border-slate-700 pb-4">
        <h2 className="text-3xl font-bold text-white flex items-center gap-2">
          <span className="bg-blue-500/10 p-2 rounded-lg text-lg">💾</span>
          Respaldo y Seguridad de Datos
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Exportar Datos */}
        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 shadow-lg space-y-6">
          <h3 className="text-xl font-semibold text-blue-400 flex items-center gap-2">
            <span className="bg-blue-500/10 p-2 rounded-lg text-sm">📤</span>
            Exportar Backup
          </h3>
          <p className="text-sm text-slate-400">Selecciona los módulos que deseas incluir en el archivo de respaldo comprimido:</p>

          <ul className="space-y-3">
            {[
              { id: 'miners', label: 'Datos de Usuarios y Actividad' },
              { id: 'config', label: 'Configuraciones Globales del Sitio' },
              { id: 'payments', label: 'Historial de Pagos y Retiros' },
              { id: 'content', label: 'Contenido Estático y Noticias' }
            ].map((item) => (
              <li key={item.id} className="group">
                <label className="flex items-center gap-3 p-3 bg-slate-900/50 border border-slate-700 rounded-xl cursor-pointer hover:border-blue-500 transition-all">
                  <input type="checkbox" className="form-checkbox h-5 w-5 text-blue-500 bg-slate-950 border-slate-700 rounded transition-all" />
                  <span className="text-sm font-medium text-slate-300 group-hover:text-white">{item.label}</span>
                </label>
              </li>
            ))}
          </ul>

          <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2 mt-4 text-sm uppercase tracking-wider">
            ⚡ Generar y Descargar Backup
          </button>
        </div>

        {/* Importar Datos */}
        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 shadow-lg space-y-6 flex flex-col">
          <h3 className="text-xl font-semibold text-red-400 flex items-center gap-2">
            <span className="bg-red-500/10 p-2 rounded-lg text-sm">📥</span>
            Restaurar Sistema
          </h3>
          <p className="text-sm text-slate-400">Carga un archivo de respaldo previo para restaurar el estado de la plataforma:</p>

          <div className="flex-1 flex flex-col justify-center border-2 border-dashed border-slate-700 rounded-2xl p-8 text-center bg-slate-900/20 group hover:border-red-500/50 transition-all">
            <input type="file" id="restoreFile" className="hidden" />
            <label htmlFor="restoreFile" className="cursor-pointer">
              <span className="block text-3xl mb-3 group-hover:scale-110 transition-transform">📂</span>
              <span className="block text-sm font-bold text-slate-400 group-hover:text-red-400 underline decoration-slate-600 underline-offset-4">Seleccionar Archivo .JSON</span>
            </label>
          </div>

          <label className="flex items-center gap-3 p-3 bg-red-500/5 border border-red-500/10 rounded-xl cursor-pointer">
            <input type="checkbox" className="form-checkbox h-5 w-5 text-red-500 bg-slate-950 border-slate-700 rounded transition-all" />
            <span className="text-xs font-bold text-red-400 uppercase tracking-tighter">Combinar con datos registrados actualmente</span>
          </label>

          <div className="space-y-3">
            <button className="w-full bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white border border-red-600/30 font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wider">
              ☢️ Iniciar Restauración
            </button>
            <p className="text-[10px] text-red-500/70 text-center font-medium leading-tight">
              ⚠️ ATENCIÓN: Esta acción sobrescribirá datos críticos. Se recomienda discreción extrema.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Backup;
