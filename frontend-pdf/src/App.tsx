import { useState, useEffect } from 'react';
import PrivacyBanner from './components/PrivacyBanner';
import UploadArea from './components/UploadArea';
import CompressionSelector from './components/CompressionSelector';
import ResultSection from './components/ResultSection';
import HistorySection from './components/HistorySection';
import { CompressionMode, PDFMetadata, CompressionResult, HistoryItem } from './types';
import { getPDFMetadata, compressLight, compressMedium, compressHigh } from './utils/pdfProcessor';
import { FileDown, ShieldAlert, FileSliders, CircleAlert, Cpu, Heart, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<PDFMetadata | null>(null);
  const [mode, setMode] = useState<CompressionMode>('medium');
  
  // Custom states for aggressive mode
  const [highQuality, setHighQuality] = useState<number>(0.5);
  const [highScale, setHighScale] = useState<number>(1.2);
  
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

  const handleReset = () => {
    if (result?.downloadUrl) {
      URL.revokeObjectURL(result.downloadUrl);
    }
    setFile(null);
    setMetadata(null);
    setResult(null);
    setErrorText(null);
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
            <div id="app-logo-badge" className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-md shadow-indigo-600/10">
              <FileDown className="h-5.5 w-5.5" />
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
        {!file && !result && <PrivacyBanner />}

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
                <UploadArea
                  onFileSelect={handleFileSelect}
                  selectedFileName={metadata?.name}
                  selectedFileSize={metadata?.size}
                />

                {/* FILE PROPERTIES & OPTIONS SELECTOR */}
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
                    <CompressionSelector
                      mode={mode}
                      onModeChange={setMode}
                      highQuality={highQuality}
                      onHighQualityChange={setHighQuality}
                      highScale={highScale}
                      onHighScaleChange={setHighScale}
                      pageCount={metadata.pageCount}
                    />

                    {/* BOTTOM CONFIRM BUTTON */}
                    <div id="compression-trigger-row" className="pt-2">
                      <button
                        id="btn-trigger-compression"
                        onClick={handleCompress}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 px-6 rounded-2xl font-bold font-sans tracking-wide shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 hover:scale-[1.005] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <FileSliders className="h-5.5 w-5.5" />
                        <span>Kompres Dokumen PDF Saya Sekarang</span>
                      </button>
                    </div>
                  </motion.div>
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
                  <h3 className="font-bold text-slate-800 text-lg md:text-xl">Sedang Mengompresi PDF</h3>
                  <p className="text-sm text-slate-500 font-medium max-w-sm mx-auto leading-relaxed">
                    Harap tidak menutup tab ini. Semua kalkulasi dilakukan penuh di CPU perangkat local Anda demi keamanan data.
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
                  mode={mode}
                  onReset={handleReset}
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
                  {file && (
                    <button
                      onClick={handleCompress}
                      className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl text-xs sm:text-sm transition-all shadow-sm cursor-pointer"
                    >
                      Coba Lagi
                    </button>
                  )}
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
