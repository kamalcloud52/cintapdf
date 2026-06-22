import { Zap, Sparkles, Flame, Sliders, Eye, FileText, CheckCircle2 } from 'lucide-react';
import { CompressionMode } from '../types';
import { motion } from 'motion/react';

interface CompressionSelectorProps {
  mode: CompressionMode;
  onModeChange: (mode: CompressionMode) => void;
  highQuality: number;
  onHighQualityChange: (quality: number) => void;
  highScale: number;
  onHighScaleChange: (scale: number) => void;
  pageCount?: number;
}

export default function CompressionSelector({
  mode,
  onModeChange,
  highQuality,
  onHighQualityChange,
  highScale,
  onHighScaleChange,
  pageCount,
}: CompressionSelectorProps) {
  return (
    <div id="compression-mode-panel" className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <h3 className="font-semibold text-slate-800 text-base flex items-center gap-2">
          <Sliders className="h-4.5 w-4.5 text-indigo-500" />
          <span>Pilih Mode Kompresi</span>
        </h3>
        {pageCount && (
          <span className="text-xs font-medium text-slate-500 bg-slate-50 border border-slate-100 px-2 py-1 rounded-md">
            Total Halaman: <span className="font-semibold font-mono text-indigo-600">{pageCount} Halaman</span>
          </span>
        )}
      </div>

      <div id="modes-grid" className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* LIGHT MODE */}
        <div
          id="mode-card-light"
          onClick={() => onModeChange('light')}
          className={`relative border rounded-2xl p-4.5 cursor-pointer transition-all duration-300 flex flex-col justify-between ${
            mode === 'light'
              ? 'border-indigo-500 bg-indigo-50/20 ring-1 ring-indigo-500/30 shadow-md'
              : 'border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-sm'
          }`}
        >
          {mode === 'light' && (
            <div className="absolute top-3 right-3 text-indigo-500">
              <CheckCircle2 className="h-5 w-5 fill-indigo-50 text-indigo-500" />
            </div>
          )}
          <div className="space-y-3">
            <div className={`p-2 w-10 h-10 rounded-xl flex items-center justify-center ${
              mode === 'light' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'
            }`}>
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-base">Ringan (Cepat)</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Optimasi struktur internal dokumen tanpa merekonstruksi elemen visual.
              </p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100/70 space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-700">
              <Eye className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span>Kualitas Visual: <strong className="text-emerald-700">100% Asli</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-700">
              <FileText className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span>Teks: <strong className="text-emerald-700">Tetap Dapat Dicari</strong></span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium">Estimasi: Bekas berkurang tipis ~10-25%</div>
          </div>
        </div>

        {/* MEDIUM MODE */}
        <div
          id="mode-card-medium"
          onClick={() => onModeChange('medium')}
          className={`relative border rounded-2xl p-4.5 cursor-pointer transition-all duration-300 flex flex-col justify-between ${
            mode === 'medium'
              ? 'border-emerald-500 bg-emerald-50/10 ring-1 ring-emerald-500/30 shadow-md'
              : 'border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-sm'
          }`}
        >
          {mode === 'medium' && (
            <div className="absolute top-3 right-3 text-emerald-500">
              <CheckCircle2 className="h-5 w-5 fill-emerald-50 text-emerald-500" />
            </div>
          )}
          <div className="space-y-3">
            <div className={`p-2 w-10 h-10 rounded-xl flex items-center justify-center ${
              mode === 'medium' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'
            }`}>
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-base">Sedang (Rekomendasi)</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Membangun ulang struktur PDF, menghapus sisa revisi lama, dan font tak terpakai.
              </p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100/70 space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-700">
              <Eye className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span>Kualitas Visual: <strong className="text-emerald-700">100% Sempurna</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-700">
              <FileText className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span>Teks: <strong className="text-emerald-700">Tetap Dapat Dicari</strong></span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium">Estimasi: Berkas berkurang ~20-50%</div>
          </div>
        </div>

        {/* HIGH MODE */}
        <div
          id="mode-card-high"
          onClick={() => onModeChange('high')}
          className={`relative border rounded-2xl p-4.5 cursor-pointer transition-all duration-300 flex flex-col justify-between ${
            mode === 'high'
              ? 'border-amber-500 bg-amber-50/10 ring-1 ring-amber-500/30 shadow-md'
              : 'border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-sm'
          }`}
        >
          {mode === 'high' && (
            <div className="absolute top-3 right-3 text-amber-500">
              <CheckCircle2 className="h-5 w-5 fill-amber-50 text-amber-500" />
            </div>
          )}
          <div className="space-y-3">
            <div className={`p-2 w-10 h-10 rounded-xl flex items-center justify-center ${
              mode === 'high' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'
            }`}>
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-base">Agresif (Maksimum)</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Merasterisasi halaman dan menekan data foto. Berkas menjadi sangat kecil!
              </p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100/70 space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-700">
              <Eye className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span>Kualitas Visual: <strong className="text-amber-700">Terkompresi (~50-90% JPEG)</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-700">
              <FileText className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span>Teks: <strong className="text-amber-700">Dirasterisasi (Gambar)</strong></span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium">Estimasi: Berkas menyusut drastis ~50-85%</div>
          </div>
        </div>
      </div>

      {/* DYNAMIC SETTINGS FOR HIGH MODE */}
      {mode === 'high' && (
        <motion.div
          id="high-mode-params"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-slate-50/80 border border-slate-100 rounded-2xl p-5 mt-3 space-y-4 shadow-inner"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
              Parameter Kustom Kompresi Agresif
            </span>
            <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-mono font-medium">
              Mode Raster
            </span>
          </div>

          <div id="quality-slider" className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                Kualitas Foto (JPEG Ratio)
                <span className="text-slate-400 font-normal">(Lebih kecil = berkas lebih kecil, gambar buram)</span>
              </label>
              <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200/50 px-2 py-0.5 rounded-md">
                {Math.round(highQuality * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="0.9"
              step="0.05"
              value={highQuality}
              onChange={(e) => onHighQualityChange(parseFloat(e.target.value))}
              className="w-full accent-amber-500 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>Lembek (10%)</span>
              <span>Rekomendasi (50%)</span>
              <span>Tajam (90%)</span>
            </div>
          </div>

          <div id="scale-slider" className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                Resolusi Kepadatan (Scale Dimensi)
                <span className="text-slate-400 font-normal">(Skala rendering pixel)</span>
              </label>
              <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200/50 px-2 py-0.5 rounded-md">
                {highScale.toFixed(1)}x Scale
              </span>
            </div>
            <input
              type="range"
              min="0.6"
              max="1.5"
              step="0.1"
              value={highScale}
              onChange={(e) => onHighScaleChange(parseFloat(e.target.value))}
              className="w-full accent-amber-500 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>HP Kecil (0.6x)</span>
              <span>Layar Monitor (1.0x)</span>
              <span>Retina/Cetak (1.5x)</span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
