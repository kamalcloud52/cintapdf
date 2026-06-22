import React, { useState, useRef } from 'react';
import { Upload, FileUp, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface UploadAreaProps {
  onFileSelect: (file: File) => void;
  selectedFileName?: string;
  selectedFileSize?: number;
}

export default function UploadArea({ onFileSelect, selectedFileName, selectedFileSize }: UploadAreaProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const processFile = (file: File) => {
    setError(null);
    if (!file) return;

    // Strict validation
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith('.pdf')) {
      setError("Berkas tidak valid. Harap pilih dokumen berformat PDF saja.");
      return;
    }

    if (file.size === 0) {
      setError("Ukuran berkas kosong (0 Bytes). Harap periksa kembali berkas Anda.");
      return;
    }

    onFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleManualSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const triggerInputClick = () => {
    fileInputRef.current?.click();
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div id="upload-panel-container" className="space-y-4">
      <div
        id="drag-drop-zone"
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={triggerInputClick}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 select-none group min-h-[220px] flex flex-col justify-center items-center ${
          isDragActive
            ? "border-indigo-500 bg-indigo-50/50 scale-[0.99] shadow-inner"
            : selectedFileName
            ? "border-emerald-300 bg-emerald-50/10 hover:border-emerald-400 hover:bg-emerald-50/20"
            : "border-slate-200/90 hover:border-indigo-400 hover:bg-indigo-50/5"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={handleManualSelect}
          id="pdf-file-selector"
        />

        <div className="space-y-4 max-w-md pointer-events-none">
          <div className="flex justify-center">
            {selectedFileName ? (
              <div id="selected-file-badge" className="p-4 bg-emerald-100/70 border border-emerald-200 text-emerald-600 rounded-2xl shadow-sm transition-all group-hover:scale-105 duration-300">
                <FileSpreadsheet className="h-10 w-10 stroke-[2]" />
              </div>
            ) : (
              <div id="upload-empty-badge" className={`p-4 rounded-2xl border transition-all duration-300 group-hover:scale-105 ${
                isDragActive
                  ? "bg-indigo-100 border-indigo-200 text-indigo-600 shadow-sm"
                  : "bg-slate-50 border-slate-100 text-slate-400 group-hover:bg-indigo-50 group-hover:border-indigo-100 group-hover:text-indigo-500"
              }`}>
                <Upload className="h-10 w-10 animate-pulse" />
              </div>
            )}
          </div>

          <div>
            {selectedFileName ? (
              <div id="uploaded-meta" className="space-y-1">
                <h4 className="text-slate-800 font-semibold text-base line-clamp-1 max-w-xs md:max-w-md mx-auto group-hover:text-indigo-600 transition-colors">
                  {selectedFileName}
                </h4>
                <p className="text-xs font-mono text-slate-500">
                  Ukuran Berkas: <span className="font-semibold text-slate-700">{formatSize(selectedFileSize || 0)}</span>
                </p>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-medium rounded-full mt-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Berkas PDF Siap Dikompresi
                </div>
              </div>
            ) : (
              <div id="upload-placeholder" className="space-y-1.5">
                <p className="text-slate-700 font-medium text-sm sm:text-base">
                  Seret & tata dokumen PDF Anda di sini, atau <span className="text-indigo-600 font-semibold underline decoration-2 decoration-indigo-200 group-hover:decoration-indigo-400">pilih berkas manual</span>
                </p>
                <p className="text-xs text-slate-400">
                  Mendukung berkas digital, presentasi grafis, skripsi, & pindaian hingga 100MB
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedFileSize && selectedFileSize > 45 * 1024 * 1024 && (
        <div id="size-warning-badge" className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200/60 rounded-xl">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 leading-relaxed">
            <span className="font-semibold">Pemberitahuan Berkas Besar:</span> Dokumen Anda berukuran cukup besar ({formatSize(selectedFileSize)}). Pengompresan lokal membutuhkan alokasi memori browser yang mumpuni. Jika browser Anda memuat ulang atau terasa lambat, simpan pekerjaan Anda terlebih dahulu.
          </div>
        </div>
      )}

      <AnimatePresence>
        {error && (
          <motion.div
            id="error-feedback"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-xs sm:text-sm font-medium"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
