import { History, Trash2, Calendar, FileType, CheckCircle, Scale, HardDrive } from 'lucide-react';
import { HistoryItem } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface HistorySectionProps {
  items: HistoryItem[];
  onDeleteItem: (id: string) => void;
  onClearAll: () => void;
}

export default function HistorySection({ items, onDeleteItem, onClearAll }: HistorySectionProps) {
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getModeLabel = (mode: string) => {
    switch (mode) {
      case 'light': return 'Cepat';
      case 'medium': return 'Rekomendasi';
      case 'high': return 'Agresif';
      default: return mode;
    }
  };

  const getModeBadgeClass = (mode: string) => {
    switch (mode) {
      case 'light': return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      case 'medium': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'high': return 'bg-amber-50 text-amber-700 border-amber-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  if (items.length === 0) {
    return null;
  }

  // Calculate cumulative local savings
  const totalOriginal = items.reduce((acc, curr) => acc + curr.originalSize, 0);
  const totalCompressed = items.reduce((acc, curr) => acc + curr.compressedSize, 0);
  const totalSaved = Math.max(0, totalOriginal - totalCompressed);

  return (
    <motion.div
      id="history-panel-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white border border-slate-200/80 rounded-2xl p-5 md:p-6 space-y-4 shadow-sm"
    >
      <div id="history-header" className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-indigo-500" />
          <h3 className="font-bold text-slate-800 text-base md:text-lg">Riwayat Kompresi Lokal</h3>
          <span className="text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded-full font-bold">
            {items.length} Berkas
          </span>
        </div>
        
        <button
          id="btn-clear-history"
          onClick={onClearAll}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:border-red-200 text-slate-500 hover:text-red-600 rounded-lg text-xs font-semibold hover:bg-red-50/50 cursor-pointer transition-all duration-150 focus:outline-none"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Bersihkan Semua</span>
        </button>
      </div>

      {/* HISTORICAL SAVINGS CARD */}
      <div id="savings-dashboard" className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-100/70 text-indigo-600 rounded-lg">
            <HardDrive className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Penyimpanan Terselamatkan</h4>
            <div className="text-slate-800 font-extrabold text-xl font-sans mt-0.5">{formatSize(totalSaved)}</div>
          </div>
        </div>
        <div className="text-xs text-slate-500 max-w-[280px] text-center sm:text-right font-medium leading-relaxed">
          Semua catatan riwayat ini disimpan secara privat di dalam peramban local storage Anda.
        </div>
      </div>

      {/* HISTORIES CARDS LIST */}
      <div id="histories-grid" className="space-y-2.5 overflow-hidden">
        <AnimatePresence initial={false}>
          {items.map((item) => {
            const savings = item.originalSize - item.compressedSize;
            const savingsPercent = Math.max(0, item.reductionPercentage);
            return (
              <motion.div
                key={item.id}
                id={`history-item-${item.id}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="flex items-center justify-between p-3.5 bg-white border border-slate-100 hover:border-slate-300 rounded-xl shadow-xs hover:shadow-sm transition-all duration-150 flex-wrap sm:flex-nowrap gap-3"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-400 shrink-0 mt-0.5">
                    <FileType className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <h5 className="text-xs sm:text-sm font-semibold text-slate-800 line-clamp-1 break-all" title={item.fileName}>
                      {item.fileName}
                    </h5>
                    <div className="flex items-center gap-2 text-[10px] sm:text-xs font-medium text-slate-500 flex-wrap">
                      <span className="flex items-center gap-0.5">
                        <Calendar className="h-3 w-3 text-slate-400" /> {item.date}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className={`px-1.5 py-0.5 rounded border text-[9px] font-bold ${getModeBadgeClass(item.mode)}`}>
                        {getModeLabel(item.mode)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 justify-between w-full sm:w-auto pt-2 sm:pt-0 sm:border-l sm:border-slate-100 sm:pl-4">
                  <div className="space-y-0.5 sm:text-right">
                    <div className="flex items-baseline gap-1">
                      <span className="text-[10px] text-slate-400">Hasil:</span>
                      <span className="text-xs font-bold text-emerald-600 font-mono">
                        {formatSize(item.compressedSize)}
                      </span>
                    </div>
                    {savings > 0 ? (
                      <div className="text-[9px] font-semibold text-emerald-500 font-mono">
                        Hemat {formatSize(savings)} ({savingsPercent.toFixed(0)}%)
                      </div>
                    ) : (
                      <div className="text-[9px] font-semibold text-slate-400 font-mono">
                        Sudah Maksimum
                      </div>
                    )}
                  </div>

                  <button
                    id={`btn-delete-history-${item.id}`}
                    onClick={() => onDeleteItem(item.id)}
                    className="p-2 border border-slate-100 hover:border-red-100 text-slate-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer hover:bg-red-50/50"
                    title="Hapus riwayat"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
