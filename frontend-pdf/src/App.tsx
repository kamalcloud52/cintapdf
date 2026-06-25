import React, { useState, useEffect } from 'react';
import PrivacyBanner from './components/PrivacyBanner';
import UploadArea from './components/UploadArea';
import CompressionSelector from './components/CompressionSelector';
import ResultSection from './components/ResultSection';
import HistorySection from './components/HistorySection';
import { CompressionMode, PDFMetadata, CompressionResult, HistoryItem, PDFTool } from './types';
import { getPDFMetadata, compressLight, compressMedium, compressHigh, mergePDFs, parsePageRanges, extractPDFPages, rotatePDFPages, addWatermarkToPDF, addPageNumbersToPDF, deletePDFPages } from './utils/pdfProcessor';
import { FileDown, ShieldAlert, FileSliders, CircleAlert, Cpu, Heart, CheckCircle2, Layers, Scissors, RotateCw, Plus, Trash2, ArrowUp, ArrowDown, Lock, FileSignature } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<PDFMetadata | null>(null);
  const [mode, setMode] = useState<CompressionMode>('medium');
  
  // Custom states for aggressive mode
  const [highQuality, setHighQuality] = useState<number>(0.5);
  const [highScale, setHighScale] = useState<number>(1.2);

  // New PDF Tools States
  const [activeTool, setActiveTool] = useState<PDFTool>('compress');
  const [mergeFiles, setMergeFiles] = useState<{ id: string; file: File; name: string; size: number; pageCount: number }[]>([]);
  const [splitRange, setSplitRange] = useState<string>('1');
  const [rotateAngle, setRotateAngle] = useState<number>(90);
  const [isMergeDragActive, setIsMergeDragActive] = useState(false);
  
  // Watermark States
  const [watermarkText, setWatermarkText] = useState<string>('CONTOH WATERMARK');
  const [watermarkFontSize, setWatermarkFontSize] = useState<number>(40);
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(0.3);
  const [watermarkColor, setWatermarkColor] = useState<string>('#64748b');
  const [watermarkRotation, setWatermarkRotation] = useState<number>(45);

  // Page Numbering States
  const [numberingPosition, setNumberingPosition] = useState<'bottom-center' | 'bottom-right' | 'top-center' | 'top-right'>('bottom-center');
  const [numberingFontSize, setNumberingFontSize] = useState<number>(10);
  const [numberingStart, setNumberingStart] = useState<number>(1);
  const [numberingFormat, setNumberingFormat] = useState<string>('Halaman {n} dari {total}');

  // Delete Pages State
  const [deletePagesInput, setDeletePagesInput] = useState<string>('2');
  
  // App operations state
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'compressing' | 'completed' | 'error'>('idle');
  const [progressText, setProgressText] = useState<string>('');
  const [errorText, setErrorText] = useState<string | null>(null);
  const [result, setResult] = useState<CompressionResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Load history on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('localpdf_history');
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load history from browser storage:', e);
    }
  }, []);

  const handleFileSelect = async (selectedFile: File) => {
    // Reset any existing results, URLs, or errors
    if (result?.downloadUrl) {
      URL.revokeObjectURL(result.downloadUrl);
    }
    setResult(null);
    setErrorText(null);
    setFile(selectedFile);
    setStatus('analyzing');
    setProgressText('Membaca berkas dan mengurai metadata...');

    try {
      // Read arrayBuffer from file
      const arrayBuffer = await selectedFile.arrayBuffer();
      const meta = await getPDFMetadata(arrayBuffer);
      
      setMetadata({
        name: selectedFile.name,
        size: selectedFile.size,
        pageCount: meta.pageCount,
        title: meta.title,
        author: meta.author,
      });
      setStatus('idle');
    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || 'Berkas PDF gagal dibaca. Pastikan dokumen tidak dikunci kata sandi.');
      setFile(null);
      setMetadata(null);
      setStatus('error');
    }
  };

  const handleCompress = async () => {
    if (!file) return;
    
    setStatus('compressing');
    setErrorText(null);
    setProgressText('Menyiapkan pemroses kompresi...');

    const startTime = performance.now();

    try {
      const arrayBuffer = await file.arrayBuffer();
      let compressedBytes: Uint8Array;

      if (mode === 'light') {
        setProgressText('Mengompresi tabel referensi silang dan mengecilkan stream...');
        compressedBytes = await compressLight(arrayBuffer);
      } else if (mode === 'medium') {
        setProgressText('Membakar ulang halaman, membersihkan font tak terpakai, dan mengompresi stream...');
        compressedBytes = await compressMedium(arrayBuffer);
      } else {
        // High aggressive mode
        compressedBytes = await compressHigh(
          arrayBuffer,
          highQuality,
          highScale,
          (current, total) => {
            setProgressText(`Merasterisasi dan menekan resolusi halaman: Halaman ${current} / ${total}...`);
          }
        );
      }

      const duration = performance.now() - startTime;
      
      // Create final blob
      const compressedBlob = new Blob([compressedBytes], { type: 'application/pdf' });
      const downloadUrl = URL.createObjectURL(compressedBlob);
      
      const customFileName = file.name.replace(/\.pdf$/i, '') + '_compressed.pdf';
      const reduction = ((file.size - compressedBlob.size) / file.size) * 100;

      const compressionResult: CompressionResult = {
        fileName: customFileName,
        originalSize: file.size,
        compressedSize: compressedBlob.size,
        reductionPercentage: reduction,
        downloadUrl,
        durationMs: duration,
        blob: compressedBlob,
      };

      setResult(compressionResult);

      // Append to local history list
      const newHistoryItem: HistoryItem = {
        id: Date.now().toString(),
        fileName: file.name,
        originalSize: file.size,
        compressedSize: compressedBlob.size,
        mode,
        date: new Date().toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        reductionPercentage: reduction,
      };

      const updatedHistory = [newHistoryItem, ...history].slice(0, 50); // cap history logs at 50 to avoid local storage limit
      setHistory(updatedHistory);
      localStorage.setItem('localpdf_history', JSON.stringify(updatedHistory));

      setStatus('completed');
    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || 'Proses kompresi gagal di tengah jalan. Silakan coba mode lain.');
      setStatus('error');
    }
  };

  const handleMergeFilesSelect = async (files: FileList) => {
    setStatus('analyzing');
    setProgressText('Membaca berkas PDF masukan...');
    setErrorText(null);
    try {
      const newFiles = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        if (f.type !== 'application/pdf' && !f.name.endsWith('.pdf')) {
          continue;
        }
        const ab = await f.arrayBuffer();
        const meta = await getPDFMetadata(ab);
        newFiles.push({
          id: Date.now().toString() + '-' + i + '-' + Math.random().toString(36).substring(2, 6),
          file: f,
          name: f.name,
          size: f.size,
          pageCount: meta.pageCount
        });
      }
      setMergeFiles((prev) => [...prev, ...newFiles]);
      setStatus('idle');
    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || 'Gagal mengurai salah satu berkas PDF.');
      setStatus('error');
    }
  };

  const handleMergeDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsMergeDragActive(true);
    } else if (e.type === "dragleave") {
      setIsMergeDragActive(false);
    }
  };

  const handleMergeDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMergeDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleMergeFilesSelect(e.dataTransfer.files);
    }
  };

  const handleMergeAction = async () => {
    if (mergeFiles.length < 2) {
      setErrorText('Silakan unggah minimal 2 berkas PDF untuk digabungkan.');
      setStatus('error');
      return;
    }
    
    setStatus('compressing');
    setErrorText(null);
    setProgressText('Menggabungkan seluruh dokumen PDF Anda...');
    const startTime = performance.now();
    
    try {
      const arrayBuffers = [];
      let totalInputSize = 0;
      for (const item of mergeFiles) {
        const ab = await item.file.arrayBuffer();
        arrayBuffers.push(ab);
        totalInputSize += item.size;
      }
      
      const mergedBytes = await mergePDFs(arrayBuffers);
      const duration = performance.now() - startTime;
      
      const mergedBlob = new Blob([mergedBytes], { type: 'application/pdf' });
      const downloadUrl = URL.createObjectURL(mergedBlob);
      const mergedFileName = 'cintapdf_gabungan_' + Math.floor(Date.now() / 1000) + '.pdf';
      
      const mergeResult: CompressionResult = {
        fileName: mergedFileName,
        originalSize: totalInputSize,
        compressedSize: mergedBlob.size,
        reductionPercentage: 0,
        downloadUrl,
        durationMs: duration,
        blob: mergedBlob
      };
      
      setResult(mergeResult);

      // Log into history
      const newHistoryItem: HistoryItem = {
        id: Date.now().toString(),
        fileName: `${mergeFiles.length} Dokumen Gabungan`,
        originalSize: totalInputSize,
        compressedSize: mergedBlob.size,
        mode: 'medium', // mock default for compatibility
        date: new Date().toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        reductionPercentage: 0,
      };
      const updatedHistory = [newHistoryItem, ...history].slice(0, 50);
      setHistory(updatedHistory);
      localStorage.setItem('localpdf_history', JSON.stringify(updatedHistory));

      setStatus('completed');
    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || 'Gagal menggabungkan berkas PDF. Silakan pastikan semua berkas valid.');
      setStatus('error');
    }
  };

  const handleSplitAction = async () => {
    if (!file || !metadata) return;
    
    setStatus('compressing');
    setErrorText(null);
    setProgressText('Mengekstrak halaman terpilih...');
    const startTime = performance.now();
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const targetIndices = parsePageRanges(splitRange, metadata.pageCount);
      
      if (targetIndices.length === 0) {
        throw new Error('Format halaman tidak valid atau di luar jangkauan halaman dokumen ini.');
      }
      
      const splitBytes = await extractPDFPages(arrayBuffer, targetIndices);
      const duration = performance.now() - startTime;
      
      const splitBlob = new Blob([splitBytes], { type: 'application/pdf' });
      const downloadUrl = URL.createObjectURL(splitBlob);
      const splitFileName = file.name.replace(/\.pdf$/i, '') + `_ekstrak_hal_${splitRange.replace(/[\s,]+/g, '_')}.pdf`;
      
      const splitResult: CompressionResult = {
        fileName: splitFileName,
        originalSize: file.size,
        compressedSize: splitBlob.size,
        reductionPercentage: 0,
        downloadUrl,
        durationMs: duration,
        blob: splitBlob
      };
      
      setResult(splitResult);

      const newHistoryItem: HistoryItem = {
        id: Date.now().toString(),
        fileName: splitFileName,
        originalSize: file.size,
        compressedSize: splitBlob.size,
        mode: 'light',
        date: new Date().toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        reductionPercentage: 0,
      };
      const updatedHistory = [newHistoryItem, ...history].slice(0, 50);
      setHistory(updatedHistory);
      localStorage.setItem('localpdf_history', JSON.stringify(updatedHistory));

      setStatus('completed');
    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || 'Gagal mengekstrak halaman PDF. Pastikan format penulisan halaman sudah benar (misal: 1-3, 5).');
      setStatus('error');
    }
  };

  const handleRotateAction = async () => {
    if (!file || !metadata) return;
    
    setStatus('compressing');
    setErrorText(null);
    setProgressText('Memutar halaman dokumen...');
    const startTime = performance.now();
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const rotatedBytes = await rotatePDFPages(arrayBuffer, rotateAngle);
      const duration = performance.now() - startTime;
      
      const rotatedBlob = new Blob([rotatedBytes], { type: 'application/pdf' });
      const downloadUrl = URL.createObjectURL(rotatedBlob);
      const rotateFileName = file.name.replace(/\.pdf$/i, '') + `_rotated_${rotateAngle}deg.pdf`;
      
      const rotateResult: CompressionResult = {
        fileName: rotateFileName,
        originalSize: file.size,
        compressedSize: rotatedBlob.size,
        reductionPercentage: 0,
        downloadUrl,
        durationMs: duration,
        blob: rotatedBlob
      };
      
      setResult(rotateResult);

      const newHistoryItem: HistoryItem = {
        id: Date.now().toString(),
        fileName: rotateFileName,
        originalSize: file.size,
        compressedSize: rotatedBlob.size,
        mode: 'light',
        date: new Date().toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        reductionPercentage: 0,
      };
      const updatedHistory = [newHistoryItem, ...history].slice(0, 50);
      setHistory(updatedHistory);
      localStorage.setItem('localpdf_history', JSON.stringify(updatedHistory));

      setStatus('completed');
    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || 'Gagal memutar halaman PDF.');
      setStatus('error');
    }
  };

  const handleWatermarkAction = async () => {
    if (!file || !metadata) return;
    if (!watermarkText.trim()) {
      setErrorText('Silakan isi teks watermark terlebih dahulu.');
      setStatus('error');
      return;
    }
    
    setStatus('compressing');
    setErrorText(null);
    setProgressText('Menambahkan watermark ke dokumen PDF...');
    const startTime = performance.now();
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const watermarkedBytes = await addWatermarkToPDF(arrayBuffer, watermarkText, {
        fontSize: watermarkFontSize,
        opacity: watermarkOpacity,
        colorHex: watermarkColor,
        rotationAngle: watermarkRotation
      });
      const duration = performance.now() - startTime;
      
      const watermarkedBlob = new Blob([watermarkedBytes], { type: 'application/pdf' });
      const downloadUrl = URL.createObjectURL(watermarkedBlob);
      const watermarkFileName = file.name.replace(/\.pdf$/i, '') + `_watermark.pdf`;
      
      const watermarkResult: CompressionResult = {
        fileName: watermarkFileName,
        originalSize: file.size,
        compressedSize: watermarkedBlob.size,
        reductionPercentage: 0,
        downloadUrl,
        durationMs: duration,
        blob: watermarkedBlob
      };
      
      setResult(watermarkResult);

      const newHistoryItem: HistoryItem = {
        id: Date.now().toString(),
        fileName: watermarkFileName,
        originalSize: file.size,
        compressedSize: watermarkedBlob.size,
        mode: 'light',
        date: new Date().toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        reductionPercentage: 0,
      };
      const updatedHistory = [newHistoryItem, ...history].slice(0, 50);
      setHistory(updatedHistory);
      localStorage.setItem('localpdf_history', JSON.stringify(updatedHistory));

      setStatus('completed');
    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || 'Gagal menambahkan watermark pada berkas PDF.');
      setStatus('error');
    }
  };

  const handleNumberingAction = async () => {
    if (!file || !metadata) return;
    if (!numberingFormat.trim()) {
      setErrorText('Format penomoran halaman tidak boleh kosong.');
      setStatus('error');
      return;
    }
    
    setStatus('compressing');
    setErrorText(null);
    setProgressText('Menambahkan nomor halaman ke berkas PDF...');
    const startTime = performance.now();
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const numberedBytes = await addPageNumbersToPDF(arrayBuffer, {
        position: numberingPosition,
        fontSize: numberingFontSize,
        startNumber: numberingStart,
        format: numberingFormat
      });
      const duration = performance.now() - startTime;
      
      const numberedBlob = new Blob([numberedBytes], { type: 'application/pdf' });
      const downloadUrl = URL.createObjectURL(numberedBlob);
      const numberedFileName = file.name.replace(/\.pdf$/i, '') + `_bernomor.pdf`;
      
      const numberedResult: CompressionResult = {
        fileName: numberedFileName,
        originalSize: file.size,
        compressedSize: numberedBlob.size,
        reductionPercentage: 0,
        downloadUrl,
        durationMs: duration,
        blob: numberedBlob
      };
      
      setResult(numberedResult);

      const newHistoryItem: HistoryItem = {
        id: Date.now().toString(),
        fileName: numberedFileName,
        originalSize: file.size,
        compressedSize: numberedBlob.size,
        mode: 'light',
        date: new Date().toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        reductionPercentage: 0,
      };
      const updatedHistory = [newHistoryItem, ...history].slice(0, 50);
      setHistory(updatedHistory);
      localStorage.setItem('localpdf_history', JSON.stringify(updatedHistory));

      setStatus('completed');
    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || 'Gagal menambahkan nomor halaman pada berkas PDF.');
      setStatus('error');
    }
  };

  const handleDeleteAction = async () => {
    if (!file || !metadata) return;
    if (!deletePagesInput.trim()) {
      setErrorText('Silakan masukkan nomor halaman yang ingin dihapus.');
      setStatus('error');
      return;
    }
    
    setStatus('compressing');
    setErrorText(null);
    setProgressText('Menghapus halaman terpilih dari berkas PDF...');
    const startTime = performance.now();
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const deletedBytes = await deletePDFPages(arrayBuffer, deletePagesInput);
      const duration = performance.now() - startTime;
      
      const deletedBlob = new Blob([deletedBytes], { type: 'application/pdf' });
      const downloadUrl = URL.createObjectURL(deletedBlob);
      const deletedFileName = file.name.replace(/\.pdf$/i, '') + `_dipangkas.pdf`;
      
      const deletedResult: CompressionResult = {
        fileName: deletedFileName,
        originalSize: file.size,
        compressedSize: deletedBlob.size,
        reductionPercentage: 0,
        downloadUrl,
        durationMs: duration,
        blob: deletedBlob
      };
      
      setResult(deletedResult);

      const newHistoryItem: HistoryItem = {
        id: Date.now().toString(),
        fileName: deletedFileName,
        originalSize: file.size,
        compressedSize: deletedBlob.size,
        mode: 'light',
        date: new Date().toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        reductionPercentage: 0,
      };
      const updatedHistory = [newHistoryItem, ...history].slice(0, 50);
      setHistory(updatedHistory);
      localStorage.setItem('localpdf_history', JSON.stringify(updatedHistory));

      setStatus('completed');
    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || 'Gagal menghapus halaman dari berkas PDF. Pastikan jangkauan halaman benar (contoh: 2, 4-6).');
      setStatus('error');
    }
  };

  const handleReset = () => {
    if (result?.downloadUrl) {
      URL.revokeObjectURL(result.downloadUrl);
    }
    setFile(null);
    setMetadata(null);
    setResult(null);
    setErrorText(null);
    setMergeFiles([]);
    setStatus('idle');
  };

  const handleDeleteHistoryItem = (id: string) => {
    const updated = history.filter((item) => item.id !== id);
    setHistory(updated);
    localStorage.setItem('localpdf_history', JSON.stringify(updated));
  };

  const handleClearAllHistory = () => {
    if (window.confirm('Apakah Anda yakin ingin menghapus seluruh riwayat kompresi di peramban ini?')) {
      setHistory([]);
      localStorage.removeItem('localpdf_history');
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div id="application-root" className="min-h-screen bg-slate-50 text-slate-800 antialiased flex flex-col justify-between">
      {/* HEADER SECTION */}
      <header id="main-navigation" className="bg-white border-b border-slate-200/85 sticky top-0 z-50 transition-shadow">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div id="app-logo-badge" className="h-10 w-10 rounded-xl overflow-hidden shadow-md shadow-indigo-600/10 ring-2 ring-indigo-50 border border-slate-100 flex items-center justify-center bg-white">
              <img 
                src="https://raw.githubusercontent.com/kamalcloud52/cintapdf/refs/heads/main/iconpdf.jpg" 
                alt="CintaPDF Logo" 
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5 leading-none">
                <span>CintaPDF</span>
              </h1>
            </div>
          </div>
          
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 font-mono">WASM Optimized v2.4</span>
          </div>
        </div>
      </header>

      {/* CORE WRAPPER SECTION */}
      <main id="primary-content" className="max-w-4xl mx-auto px-4 py-6 md:py-10 w-full flex-grow space-y-6">
        {/* PRIVACY WARNING NOTICE BANNER */}
        {!file && !result && mergeFiles.length === 0 && <PrivacyBanner />}

        {/* TABS SELECTOR FOR VARIOUS SERVERLESS PDF TOOLS */}
        <div id="pdf-tools-navbar" className="bg-white border border-slate-200 rounded-2xl p-1.5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 shadow-xs">
          <button
            onClick={() => { setActiveTool('compress'); handleReset(); }}
            className={`py-2.5 px-2 rounded-xl font-bold text-[11px] flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all cursor-pointer ${activeTool === 'compress' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <FileSliders className="h-3.5 w-3.5 shrink-0" />
            <span className="text-center">Kompres</span>
          </button>
          <button
            onClick={() => { setActiveTool('merge'); handleReset(); }}
            className={`py-2.5 px-2 rounded-xl font-bold text-[11px] flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all cursor-pointer ${activeTool === 'merge' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Layers className="h-3.5 w-3.5 shrink-0" />
            <span className="text-center">Gabung</span>
          </button>
          <button
            onClick={() => { setActiveTool('split'); handleReset(); }}
            className={`py-2.5 px-2 rounded-xl font-bold text-[11px] flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all cursor-pointer ${activeTool === 'split' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Scissors className="h-3.5 w-3.5 shrink-0" />
            <span className="text-center">Pisah</span>
          </button>
          <button
            onClick={() => { setActiveTool('rotate'); handleReset(); }}
            className={`py-2.5 px-2 rounded-xl font-bold text-[11px] flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all cursor-pointer ${activeTool === 'rotate' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <RotateCw className="h-3.5 w-3.5 shrink-0" />
            <span className="text-center">Putar</span>
          </button>
          <button
            onClick={() => { setActiveTool('watermark'); handleReset(); }}
            className={`py-2.5 px-2 rounded-xl font-bold text-[11px] flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all cursor-pointer ${activeTool === 'watermark' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <FileSignature className="h-3.5 w-3.5 shrink-0" />
            <span className="text-center">Watermark</span>
          </button>
          <button
            onClick={() => { setActiveTool('numbering'); handleReset(); }}
            className={`py-2.5 px-2 rounded-xl font-bold text-[11px] flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all cursor-pointer ${activeTool === 'numbering' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Plus className="h-3.5 w-3.5 shrink-0" />
            <span className="text-center">No. Halaman</span>
          </button>
          <button
            onClick={() => { setActiveTool('delete'); handleReset(); }}
            className={`py-2.5 px-2 rounded-xl font-bold text-[11px] flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all cursor-pointer ${activeTool === 'delete' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Trash2 className="h-3.5 w-3.5 shrink-0" />
            <span className="text-center">Hapus Hal</span>
          </button>
        </div>

        {/* WORKSTAGE INTERACTIVE CARD CONTAINER */}
        <section id="compression-workbench" className="bg-white border border-slate-200/90 rounded-3xl p-5 md:p-8 space-y-6 shadow-xs">
          <AnimatePresence mode="wait">
            {/* UPLOAD ZONE */}
            {status !== 'compressing' && !result && (
              <motion.div
                key="upload-zone-stage"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {activeTool === 'merge' ? (
                  /* MERGE PDF FILE WORKFLOW */
                  mergeFiles.length === 0 ? (
                    <div
                      onDragEnter={handleMergeDrag}
                      onDragOver={handleMergeDrag}
                      onDragLeave={handleMergeDrag}
                      onDrop={handleMergeDrop}
                      onClick={() => {
                        const input = document.getElementById('merge-file-input');
                        if (input) input.click();
                      }}
                      className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 select-none group min-h-[220px] flex flex-col justify-center items-center ${
                        isMergeDragActive
                          ? "border-indigo-500 bg-indigo-50/50 scale-[0.99] shadow-inner"
                          : "border-slate-200/90 hover:border-indigo-400 hover:bg-indigo-50/5"
                      }`}
                    >
                      <input
                        id="merge-file-input"
                        type="file"
                        accept=".pdf,application/pdf"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files) handleMergeFilesSelect(e.target.files);
                        }}
                      />
                      <div className="space-y-4 max-w-md pointer-events-none flex flex-col items-center">
                        <div className={`p-4 rounded-2xl border transition-all duration-300 group-hover:scale-105 ${
                          isMergeDragActive
                            ? "bg-indigo-100 border-indigo-200 text-indigo-600 shadow-sm"
                            : "bg-slate-50 border-slate-100 text-slate-400 group-hover:bg-indigo-50 group-hover:border-indigo-100 group-hover:text-indigo-500"
                        }`}>
                          <Layers className="h-10 w-10 animate-pulse" />
                        </div>
                        <div className="space-y-1.5 text-center">
                          <p className="text-slate-700 font-medium text-sm sm:text-base">
                            Seret & lepas beberapa berkas PDF di sini, atau <span className="text-indigo-600 font-semibold underline decoration-2 decoration-indigo-200 group-hover:decoration-indigo-400">pilih berkas manual</span>
                          </p>
                          <p className="text-xs text-slate-400">
                            Pilih beberapa berkas PDF sekaligus untuk digabungkan menjadi satu dokumen secara instan dan privat
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* FILES LIST FOR MERGING */
                    <div className="space-y-4">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Daftar Dokumen PDF yang Akan Digabungkan</span>
                        <span className="text-xs font-bold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">{mergeFiles.length} Berkas</span>
                      </div>
                      
                      <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                        {mergeFiles.map((item, index) => (
                          <div key={item.id} className="p-3 bg-slate-50/70 border border-slate-100/80 rounded-xl flex items-center justify-between gap-3 text-xs md:text-sm hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="h-6 w-6 rounded-md bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center shrink-0 text-xs">
                                {index + 1}
                              </div>
                              <div className="min-w-0">
                                <h5 className="font-semibold text-slate-800 truncate text-xs sm:text-sm" title={item.name}>{item.name}</h5>
                                <p className="text-[10px] text-slate-400 font-medium font-mono mt-0.5">{formatSize(item.size)} • {item.pageCount} Halaman</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => {
                                  if (index === 0) return;
                                  const newList = [...mergeFiles];
                                  const temp = newList[index];
                                  newList[index] = newList[index - 1];
                                  newList[index - 1] = temp;
                                  setMergeFiles(newList);
                                }}
                                disabled={index === 0}
                                className="p-1 hover:bg-slate-200 text-slate-500 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                                title="Naikkan urutan"
                              >
                                <ArrowUp className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  if (index === mergeFiles.length - 1) return;
                                  const newList = [...mergeFiles];
                                  const temp = newList[index];
                                  newList[index] = newList[index + 1];
                                  newList[index + 1] = temp;
                                  setMergeFiles(newList);
                                }}
                                disabled={index === mergeFiles.length - 1}
                                className="p-1 hover:bg-slate-200 text-slate-500 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                                title="Turunkan urutan"
                              >
                                <ArrowDown className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setMergeFiles((prev) => prev.filter((f) => f.id !== item.id))}
                                className="p-1 hover:bg-red-50 hover:text-red-600 text-slate-400 rounded-lg cursor-pointer"
                                title="Hapus"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <label className="flex-1 border border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-4 flex items-center justify-center gap-2 cursor-pointer transition-colors text-xs font-bold text-slate-600 bg-white">
                          <Plus className="h-4 w-4 text-indigo-500" />
                          <span>Tambah Berkas PDF Lain</span>
                          <input
                            type="file"
                            accept=".pdf,application/pdf"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files) handleMergeFilesSelect(e.target.files);
                            }}
                          />
                        </label>
                        
                        <button
                          onClick={handleMergeAction}
                          disabled={mergeFiles.length < 2}
                          className="px-6 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed text-xs sm:text-sm"
                        >
                          <Layers className="h-4 w-4" />
                          <span>Gabung PDF Sekarang ({mergeFiles.length} Berkas)</span>
                        </button>
                      </div>
                    </div>
                  )
                ) : (
                  /* SINGLE PDF FILE WORKFLOWS (COMPRESS, SPLIT, ROTATE) */
                  <>
                    <UploadArea
                      onFileSelect={handleFileSelect}
                      selectedFileName={metadata?.name}
                      selectedFileSize={metadata?.size}
                    />

                    {metadata && (
                      <motion.div
                        id="metadata-and-picker-container"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-6 pt-2"
                      >
                        {/* METADATA SUMMARY CHIPS */}
                        <div id="metadata-chips-row" className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl flex flex-wrap gap-4 items-center justify-between">
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dokumen Terpilih</span>
                            <h4 className="text-sm font-bold text-slate-800 line-clamp-1 max-w-[280px] md:max-w-md">{metadata.name}</h4>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <span className="text-[10px] font-medium text-slate-400 uppercase">Halaman</span>
                              <div className="font-bold text-slate-700 text-sm font-mono">{metadata.pageCount} Hal</div>
                            </div>
                            <div className="border-l border-slate-200 h-8"></div>
                            <div className="text-right">
                              <span className="text-[10px] font-medium text-slate-400 uppercase">Input Size</span>
                              <div className="font-bold text-indigo-600 text-sm font-mono">{formatSize(metadata.size)}</div>
                            </div>
                          </div>
                        </div>

                        {/* SELECT COMPRESSION CONFIG */}
                        {activeTool === 'compress' && (
                          <>
                            <CompressionSelector
                              mode={mode}
                              onModeChange={setMode}
                              highQuality={highQuality}
                              onHighQualityChange={setHighQuality}
                              highScale={highScale}
                              onHighScaleChange={setHighScale}
                              pageCount={metadata.pageCount}
                            />

                            <div id="compression-trigger-row" className="pt-2">
                              <button
                                id="btn-trigger-compression"
                                onClick={handleCompress}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 px-6 rounded-2xl font-bold font-sans tracking-wide shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 hover:scale-[1.002] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 text-xs sm:text-sm"
                              >
                                <FileSliders className="h-5 w-5" />
                                <span>Kompres Dokumen PDF Saya Sekarang</span>
                              </button>
                            </div>
                          </>
                        )}

                        {/* SPLIT / EXTRACT FLOW */}
                        {activeTool === 'split' && (
                          <div className="space-y-4 pt-2">
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Masukkan Rentang Halaman yang Ingin Diekstrak</label>
                              <input
                                type="text"
                                value={splitRange}
                                onChange={(e) => setSplitRange(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-3 font-semibold text-sm outline-none text-slate-800 transition-all font-mono"
                                placeholder="Contoh: 1-3, 5, 8-10"
                              />
                              <p className="text-[10px] text-slate-400 leading-normal">
                                Gunakan tanda hubung <code className="bg-slate-100 px-1 py-0.5 rounded font-bold font-mono text-indigo-600 text-[9px]">1-3</code> untuk jangkauan, dan koma <code className="bg-slate-100 px-1 py-0.5 rounded font-bold font-mono text-indigo-600 text-[9px]">,</code> untuk pemisah halaman tunggal (Jangkauan Dokumen: 1 sampai {metadata.pageCount}).
                              </p>
                            </div>

                            <div className="p-3 bg-indigo-50/50 border border-indigo-100/60 rounded-xl flex items-center gap-2.5">
                              <CheckCircle2 className="h-4 w-4 text-indigo-500 shrink-0 animate-pulse" />
                              <span className="text-[11px] font-medium text-indigo-800 leading-normal">
                                Halaman terpilih akan dikloning ke dokumen PDF baru secara instan di peramban lokal Anda. Berkas asli tidak akan diunggah ke mana pun.
                              </span>
                            </div>

                            <button
                              onClick={handleSplitAction}
                              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 px-6 rounded-2xl font-bold tracking-wide shadow-lg hover:scale-[1.002] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 text-xs sm:text-sm"
                            >
                              <Scissors className="h-5 w-5" />
                              <span>Ekstrak Halaman Terpilih</span>
                            </button>
                          </div>
                        )}

                        {/* ROTATE FLOW */}
                        {activeTool === 'rotate' && (
                          <div className="space-y-4 pt-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Pilih Sudut Putar Halaman PDF</label>
                            
                            <div className="grid grid-cols-3 gap-3">
                              {[
                                { label: '90° Kanan', angle: 90 },
                                { label: '180° Balik', angle: 180 },
                                { label: '90° Kiri', angle: 270 }
                              ].map((opt) => (
                                <button
                                  key={opt.angle}
                                  onClick={() => setRotateAngle(opt.angle)}
                                  className={`py-3 px-2 rounded-xl border text-center font-bold text-xs flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${rotateAngle === opt.angle ? 'bg-indigo-50 border-indigo-500 text-indigo-700 ring-2 ring-indigo-50' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                >
                                  <RotateCw className={`h-4 w-4 transition-transform ${opt.angle === 90 ? 'rotate-90' : opt.angle === 180 ? 'rotate-180' : '-rotate-90'}`} />
                                  <span>{opt.label}</span>
                                </button>
                              ))}
                            </div>

                            <div className="p-3 bg-amber-50/50 border border-amber-100/60 rounded-xl flex items-center gap-2.5">
                              <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0" />
                              <span className="text-[11px] font-medium text-amber-800 leading-normal">
                                Seluruh halaman dokumen PDF Anda akan diputar searah jarum jam sebesar {rotateAngle} derajat secara instan di memori perangkat.
                              </span>
                            </div>

                            <button
                              onClick={handleRotateAction}
                              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 px-6 rounded-2xl font-bold tracking-wide shadow-lg hover:scale-[1.002] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 text-xs sm:text-sm"
                            >
                              <RotateCw className="h-5 w-5" />
                              <span>Putar Halaman Dokumen PDF</span>
                            </button>
                          </div>
                        )}

                        {/* WATERMARK FLOW */}
                        {activeTool === 'watermark' && (
                          <div className="space-y-5 pt-2">
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Teks Watermark</label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={watermarkText}
                                  onChange={(e) => setWatermarkText(e.target.value)}
                                  className="flex-grow bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 font-semibold text-sm outline-none text-slate-800 transition-all"
                                  placeholder="Masukkan teks watermark Anda..."
                                />
                              </div>
                              {/* Quick presets badges */}
                              <div className="flex flex-wrap gap-1.5 pt-1.5">
                                {['CONFIDENTIAL', 'DRAFT', 'SALINAN', 'PRIBADI', 'CintaPDF'].map((preset) => (
                                  <button
                                    key={preset}
                                    type="button"
                                    onClick={() => setWatermarkText(preset)}
                                    className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer border ${watermarkText === preset ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'}`}
                                  >
                                    {preset}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {/* Slider Font Size */}
                              <div className="space-y-1.5">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="font-bold text-slate-500 uppercase tracking-wider">Ukuran Huruf</span>
                                  <span className="font-mono font-bold text-slate-700">{watermarkFontSize}px</span>
                                </div>
                                <input
                                  type="range"
                                  min="12"
                                  max="120"
                                  value={watermarkFontSize}
                                  onChange={(e) => setWatermarkFontSize(Number(e.target.value))}
                                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                />
                              </div>

                              {/* Slider Opacity */}
                              <div className="space-y-1.5">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="font-bold text-slate-500 uppercase tracking-wider">Transparansi</span>
                                  <span className="font-mono font-bold text-slate-700">{Math.round(watermarkOpacity * 100)}%</span>
                                </div>
                                <input
                                  type="range"
                                  min="0.05"
                                  max="1.00"
                                  step="0.05"
                                  value={watermarkOpacity}
                                  onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
                                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                />
                              </div>

                              {/* Slider Rotasi */}
                              <div className="space-y-1.5">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="font-bold text-slate-500 uppercase tracking-wider">Sudut Kemiringan</span>
                                  <span className="font-mono font-bold text-slate-700">{watermarkRotation}°</span>
                                </div>
                                <input
                                  type="range"
                                  min="0"
                                  max="360"
                                  value={watermarkRotation}
                                  onChange={(e) => setWatermarkRotation(Number(e.target.value))}
                                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                />
                              </div>

                              {/* Color Picker with presets */}
                              <div className="space-y-1.5">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="font-bold text-slate-500 uppercase tracking-wider">Warna Watermark</span>
                                  <span className="font-mono font-bold text-slate-700">{watermarkColor.toUpperCase()}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="color"
                                    value={watermarkColor}
                                    onChange={(e) => setWatermarkColor(e.target.value)}
                                    className="h-8 w-12 border border-slate-200 rounded-lg cursor-pointer bg-transparent"
                                  />
                                  <div className="flex gap-1">
                                    {['#64748b', '#ef4444', '#f59e0b', '#10b981', '#3b82f6'].map((color) => (
                                      <button
                                        key={color}
                                        type="button"
                                        onClick={() => setWatermarkColor(color)}
                                        className="h-6 w-6 rounded-full border border-slate-200/60 shadow-xs cursor-pointer transition-transform hover:scale-110 shrink-0"
                                        style={{ backgroundColor: color }}
                                        title={color}
                                      />
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="p-3 bg-indigo-50/50 border border-indigo-100/60 rounded-xl flex items-center gap-2.5">
                              <CheckCircle2 className="h-4 w-4 text-indigo-500 shrink-0 animate-pulse" />
                              <span className="text-[11px] font-medium text-indigo-800 leading-normal">
                                Watermark teks akan dicetak diagonal di tengah-tengah setiap halaman PDF Anda langsung di memori browser lokal.
                              </span>
                            </div>

                            <button
                              onClick={handleWatermarkAction}
                              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 px-6 rounded-2xl font-bold tracking-wide shadow-lg hover:scale-[1.002] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 text-xs sm:text-sm"
                            >
                              <FileSignature className="h-5 w-5" />
                              <span>Sematkan Watermark ke PDF Sekarang</span>
                            </button>
                          </div>
                        )}

                        {/* TAMBAH NOMOR HALAMAN (NUMBERING) FLOW */}
                        {activeTool === 'numbering' && (
                          <div className="space-y-4 pt-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Format Penomoran</label>
                                <input
                                  type="text"
                                  value={numberingFormat}
                                  onChange={(e) => setNumberingFormat(e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 font-semibold text-sm outline-none text-slate-800 transition-all font-mono"
                                  placeholder="Contoh: Halaman {n} dari {total}"
                                />
                                <p className="text-[10px] text-slate-400">
                                  Gunakan <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-indigo-600 text-[9px] font-bold">{'{n}'}</code> untuk halaman aktif dan <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-indigo-600 text-[9px] font-bold">{'{total}'}</code> untuk total halaman.
                                </p>
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Posisi Nomor</label>
                                <select
                                  value={numberingPosition}
                                  onChange={(e: any) => setNumberingPosition(e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 font-semibold text-sm outline-none text-slate-800 transition-all"
                                >
                                  <option value="bottom-center">Bawah Tengah (Rekomendasi)</option>
                                  <option value="bottom-right">Bawah Kanan</option>
                                  <option value="top-center">Atas Tengah</option>
                                  <option value="top-right">Atas Kanan</option>
                                </select>
                              </div>

                              <div className="space-y-1.5">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="font-bold text-slate-500 uppercase tracking-wider">Mulai dari Angka</span>
                                  <span className="font-mono font-bold text-slate-700">{numberingStart}</span>
                                </div>
                                <input
                                  type="number"
                                  min="1"
                                  value={numberingStart}
                                  onChange={(e) => setNumberingStart(Math.max(1, parseInt(e.target.value) || 1))}
                                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 font-semibold text-sm outline-none text-slate-800 transition-all font-mono"
                                />
                              </div>

                              <div className="space-y-1.5">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="font-bold text-slate-500 uppercase tracking-wider">Ukuran Huruf</span>
                                  <span className="font-mono font-bold text-slate-700">{numberingFontSize}px</span>
                                </div>
                                <input
                                  type="range"
                                  min="8"
                                  max="24"
                                  value={numberingFontSize}
                                  onChange={(e) => setNumberingFontSize(Number(e.target.value))}
                                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600 mt-2.5"
                                />
                              </div>
                            </div>

                            <div className="p-3 bg-indigo-50/50 border border-indigo-100/60 rounded-xl flex items-center gap-2.5">
                              <CheckCircle2 className="h-4 w-4 text-indigo-500 shrink-0" />
                              <span className="text-[11px] font-medium text-indigo-800 leading-normal">
                                Nomor halaman akan dicantumkan secara presisi pada posisi terpilih di seluruh halaman PDF Anda secara instan.
                              </span>
                            </div>

                            <button
                              onClick={handleNumberingAction}
                              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 px-6 rounded-2xl font-bold tracking-wide shadow-lg hover:scale-[1.002] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 text-xs sm:text-sm"
                            >
                              <Plus className="h-5 w-5" />
                              <span>Tambah Nomor Halaman Sekarang</span>
                            </button>
                          </div>
                        )}

                        {/* HAPUS HALAMAN (DELETE PAGES) FLOW */}
                        {activeTool === 'delete' && (
                          <div className="space-y-4 pt-2">
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Halaman yang Ingin Dihapus</label>
                              <input
                                type="text"
                                value={deletePagesInput}
                                onChange={(e) => setDeletePagesInput(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-3 font-semibold text-sm outline-none text-slate-800 transition-all font-mono"
                                placeholder="Contoh: 2, 4, 6-8"
                              />
                              <p className="text-[10px] text-slate-400">
                                Gunakan koma <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-indigo-600 text-[9px] font-bold">,</code> untuk pemisah dan tanda hubung <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-indigo-600 text-[9px] font-bold">-</code> untuk jangkauan halaman (Total halaman dokumen ini: {metadata.pageCount}).
                              </p>
                            </div>

                            <div className="p-4 bg-amber-50/50 border border-amber-200/60 rounded-xl flex items-start gap-3">
                              <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                              <div className="text-xs text-amber-800 leading-normal">
                                <p className="font-bold">⚠️ PERHATIAN:</p>
                                <p className="mt-1">Tindakan ini akan secara permanen memotong halaman-halaman terpilih dan menghasilkan dokumen baru. Pastikan nomor halaman yang Anda masukkan tidak melebih total halaman dokumen ({metadata.pageCount} Hal).</p>
                              </div>
                            </div>

                            <button
                              onClick={handleDeleteAction}
                              className="w-full bg-red-600 hover:bg-red-500 text-white py-4 px-6 rounded-2xl font-bold tracking-wide shadow-lg hover:scale-[1.002] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 text-xs sm:text-sm"
                            >
                              <Trash2 className="h-5 w-5" />
                              <span>Hapus Halaman Terpilih</span>
                            </button>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </>
                )}
              </motion.div>
            )}

            {/* PROCESSING LOADING STATE */}
            {status === 'compressing' && (
              <motion.div
                key="loading-stage"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center text-center py-16 space-y-6"
              >
                <div id="spinner-animation" className="relative flex items-center justify-center">
                  <span className="absolute animate-ping inline-flex h-16 w-16 rounded-full bg-indigo-400 opacity-20"></span>
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-indigo-600 shadow-md"></div>
                  <Cpu className="absolute h-5 w-5 text-indigo-600" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-bold text-slate-800 text-lg md:text-xl">
                    {activeTool === 'compress' ? 'Sedang Mengompresi PDF' : activeTool === 'merge' ? 'Sedang Menggabungkan PDF' : activeTool === 'split' ? 'Sedang Mengekstrak Halaman PDF' : activeTool === 'watermark' ? 'Sedang Menambahkan Watermark' : activeTool === 'numbering' ? 'Sedang Menambahkan Nomor Halaman' : activeTool === 'delete' ? 'Sedang Menghapus Halaman' : 'Sedang Memutar PDF'}
                  </h3>
                  <p className="text-sm text-slate-500 font-medium max-w-sm mx-auto leading-relaxed">
                    Harap tidak menutup tab ini. Semua kalkulasi dilakukan penuh di CPU perangkat lokal Anda demi keamanan data.
                  </p>
                </div>

                <div className="px-5 py-2.5 bg-indigo-50 border border-indigo-100 rounded-full inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
                  <span className="text-xs font-semibold text-indigo-800 font-mono tracking-wide">{progressText}</span>
                </div>
              </motion.div>
            )}

            {/* RESULT COMPLETED OUTPUT */}
            {status === 'completed' && result && (
              <motion.div
                key="result-stage"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <ResultSection
                  result={result}
                  tool={activeTool}
                  mode={mode}
                  onReset={handleReset}
                  originalFilesCount={activeTool === 'merge' ? mergeFiles.length : 1}
                />
              </motion.div>
            )}

            {/* ERROR BOUNDARY DISPLAY */}
            {status === 'error' && errorText && (
              <motion.div
                key="error-stage"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-6 bg-red-50 border border-red-200 rounded-2xl text-center space-y-4 max-w-lg mx-auto"
              >
                <div className="inline-flex p-3 bg-red-100 text-red-600 rounded-full mx-auto">
                  <ShieldAlert className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="font-bold text-red-950 text-base md:text-lg">Gagal Memproses Dokumen</h3>
                  <p className="text-xs sm:text-sm text-red-700/90 leading-relaxed mt-1">{errorText}</p>
                </div>
                <div className="pt-2 flex justify-center gap-3">
                  <button
                    onClick={handleReset}
                    className="px-5 py-2.5 bg-white border border-red-200 hover:border-red-300 text-red-800 font-semibold rounded-xl text-xs sm:text-sm transition-all shadow-sm cursor-pointer"
                  >
                    Pilih Berkas Lain
                  </button>
                  <button
                    onClick={() => {
                      if (activeTool === 'compress') handleCompress();
                      else if (activeTool === 'split') handleSplitAction();
                      else if (activeTool === 'rotate') handleRotateAction();
                      else if (activeTool === 'merge') handleMergeAction();
                      else if (activeTool === 'watermark') handleWatermarkAction();
                      else if (activeTool === 'numbering') handleNumberingAction();
                      else if (activeTool === 'delete') handleDeleteAction();
                    }}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl text-xs sm:text-sm transition-all shadow-sm cursor-pointer"
                  >
                    Coba Lagi
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* LOCAL STORAGE HISTORY LOGGER */}
        <HistorySection
          items={history}
          onDeleteItem={handleDeleteHistoryItem}
          onClearAll={handleClearAllHistory}
        />
      </main>

      {/* FOOTER METRICS COPYRIGHT */}
      <footer id="global-credits" className="bg-white border-t border-slate-150 py-6 text-xs text-slate-400/80 mt-12">
        <div className="max-w-4xl mx-auto px-4 flex flex-col items-center justify-center text-center gap-1.5 font-medium">
          <div className="flex flex-wrap items-center justify-center gap-1.5 text-slate-500/90">
            <span>&copy; 2026</span>
            <span className="font-bold text-indigo-600/80">CintaPDF</span>
            <span className="text-slate-300">•</span>
            <span>100% Client-Side Privacy Protection</span>
          </div>
          <p className="text-[11px] text-slate-400/60 font-normal">
            Proses kompresi dijalankan sepenuhnya di dalam peramban perangkat Anda secara aman demi privasi mutlak.
          </p>
        </div>
      </footer>
    </div>
  );
}
