import { Download, Sparkles, RefreshCw, FileCheck, Gauge, Info, AlertCircle, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { CompressionResult, CompressionMode } from '../types';
import { motion } from 'motion/react';

interface ResultSectionProps {
  result: CompressionResult;
  mode: CompressionMode;
  onReset: () => void;
}

export default function ResultSection({ result, mode, onReset }: ResultSectionProps) {
  const [copied, setCopied] = useState(false);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1014;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handlesCopyToClipboard = () => {
    navigator.clipboard.writeText(result.fileName);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const savingRatio = Math.max(0, result.reductionPercentage);
  const isBigger = result.compressedSize >= result.originalSize;

  return (
    <motion.div
      id="result-panel-container"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-50 border border-slate-100 rounded-2xl p-5 md:p-6 space-y-6"
    >
      <div id="result-header" className="flex items-center justify-between border-b border-slate-200/60 pb-3">
        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
          <FileCheck className="h-5 w-5 text-emerald-500" />
          <span>Kompresi Berhasil Selesai!</span>
        </h3>
        <span className="text-[10px] sm:text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full flex items-center gap-1">
          <Sparkles className="h-3 w-3" />
          {mode === 'light' ? 'Mode Cepat' : mode === 'medium' ? 'Mode Rekomendasi' : 'Mode Agresif'}
        </span>
      </div>

      {isBigger && (
        <div id="bigger-file-alert" className="flex items-start gap-2.5 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-amber-800 leading-relaxed">
            <span className="font-semibold">Perbandingan Ukuran:</span> Berkas keluaran ({formatSize(result.compressedSize)}) lebih besar dari dokumen asli Anda ({formatSize(result.originalSize)}). Hal ini lumrah terjadi pada dokumen text-heavy berukuran kecil atau PDF yang sudah sangat padat. Kami menyarankan Anda menggunakan <strong>Mode Ringan (Cepat)</strong> atau mengunduh dokumen asli.
          </div>
        </div>
      )}

      {/* METERS & RATIOS GRID */}
      <div id="reduction-chart-grid" className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        {/* COMPREHENSIVE SAVING PERC BADGE */}
        <div className="md:col-span-5 flex flex-col items-center justify-center text-center p-5 bg-white border border-slate-100 rounded-2xl shadow-sm min-h-[160px]">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
            Ukuran Menyusut
          </span>
          <span className="text-4xl md:text-5xl font-extrabold text-emerald-600 font-sans tracking-tight mt-1.5">
            {isBigger ? '0' : savingRatio.toFixed(1)}%
          </span>
          <span className="text-xs text-slate-500 mt-2 font-medium">
            {isBigger ? 'Berkas sudah maksimal' : `Berhasil menghemat ${formatSize(result.originalSize - result.compressedSize)} space`}
          </span>
        </div>

        {/* DETAILS PATH PROGRESS */}
        <div className="md:col-span-7 space-y-4">
          <div className="space-y-1.5">
            <div className="flex justify-between items-end text-xs font-medium text-slate-600">
              <span className="flex items-center gap-1">Sebelum Kompresi</span>
              <span className="font-mono text-slate-500">{formatSize(result.originalSize)}</span>
            </div>
            <div className="w-full bg-slate-200/55 h-3 rounded-full overflow-hidden">
              <div className="bg-slate-400 h-full rounded-full w-full" />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-end text-xs font-semibold">
              <span className="flex items-center gap-1 text-slate-800">Setelah Kompresi</span>
              <span className="font-mono text-emerald-600">{formatSize(result.compressedSize)}</span>
            </div>
            <div className="w-full bg-slate-200/55 h-3 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, Math.max(5, (result.compressedSize / result.originalSize) * 100))}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className={`h-full rounded-full ${isBigger ? 'bg-amber-500' : 'bg-emerald-500'}`}
              />
            </div>
          </div>

          <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono pt-1">
            <span className="flex items-center gap-1">
              <Gauge className="h-3.5 w-3.5 text-slate-400" /> Waktu proses: {(result.durationMs / 1000).toFixed(2)} detik
            </span>
            <span className="flex items-center gap-1">
              <Info className="h-3.5 w-3.5 text-slate-400" /> Proses Lokal 100%
            </span>
          </div>
        </div>
      </div>

      {/* METADATA INFO */}
      <div id="result-meta-block" className="p-4 bg-white border border-slate-100 rounded-xl space-y-2">
        <div className="flex justify-between items-center text-xs text-slate-500 border-b border-slate-50 pb-2">
          <span className="font-semibold text-slate-600">Spesifikasi Dokumen Hasil:</span>
          <span className="font-medium text-slate-400 font-mono">PDF-1.5 Optimized</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 text-xs font-medium text-slate-700">
          <div className="flex items-center justify-between py-1 border-b border-slate-50">
            <span className="text-slate-400">Nama Dokumen:</span>
            <span className="text-slate-800 line-clamp-1 max-w-[170px] font-semibold" title={result.fileName}>{result.fileName}</span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-slate-50">
            <span className="text-slate-400">Total Halaman:</span>
            <span className="text-slate-800 font-semibold">Tersimpan Sempurna</span>
          </div>
        </div>
      </div>

      {/* ACTIONS ROW */}
      <div id="actions-grid" className="flex flex-col sm:flex-row gap-3">
        <a
          id="btn-download-pdf"
          href={result.downloadUrl}
          download={result.fileName}
          className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-center rounded-xl shadow-lg hover:shadow-emerald-600/10 active:scale-95 transition-all duration-200 cursor-pointer text-sm sm:text-base"
        >
          <Download className="h-5 w-5" />
          <span>Unduh Berkas Kompresi</span>
        </a>

        <button
          id="btn-copy-filename"
          onClick={handlesCopyToClipboard}
          className="px-5 py-3.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold text-center rounded-xl transition-all cursor-pointer text-xs sm:text-sm flex items-center justify-center gap-1.5 focus:outline-none"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-emerald-500" />
              <span>Tersalin</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 text-slate-400" />
              <span>Salin Nama</span>
            </>
          )}
        </button>

        <button
          id="btn-reset-compress"
          onClick={onReset}
          className="px-5 py-3.5 bg-slate-200/70 hover:bg-slate-200 text-slate-700 font-semibold text-center rounded-xl transition-all cursor-pointer text-xs sm:text-sm flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-slate-300"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Mulai Ulang</span>
        </button>
      </div>
    </motion.div>
  );
}
