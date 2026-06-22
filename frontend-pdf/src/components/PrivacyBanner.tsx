import { ShieldCheck, Lock, Cpu, ServerOff } from 'lucide-react';
import { motion } from 'motion/react';

export default function PrivacyBanner() {
  return (
    <motion.div
      id="privacy-banner-container"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-emerald-50/70 border border-emerald-100/90 rounded-2xl p-5 md:p-6 shadow-sm mb-6"
    >
      <div className="flex flex-col sm:flex-row items-start gap-4">
        <div id="privacy-icon-badge" className="p-3 bg-white border border-emerald-100 rounded-xl text-emerald-600 shadow-sm shrink-0">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-emerald-900 font-semibold text-base sm:text-lg flex items-center gap-1.5 flex-wrap">
            <span>Privasi Anda Terjamin secara Total</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100/80 text-emerald-800">
              <Lock className="h-3 w-3" /> 100% Client-Side
            </span>
          </h3>
          <p className="text-emerald-700/90 text-sm mt-1 sm:mt-1.5 leading-relaxed">
            Semua proses kompresi dilakukan secara <strong>lokal di dalam browser</strong> menggunakan WebAssembly dan pemrosesan stream. Dokumen Anda tidak pernah diunggah ke server mana pun, memberikan keamanan mutlak untuk berkas rahasia, akademis, atau laporan kerja Anda.
          </p>
          <div id="privacy-features-grid" className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-4 border-t border-emerald-100/50">
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-800">
              <ServerOff className="h-4 w-4 text-emerald-600" />
              <span>Tanpa Upload Server (Hemat Kuota)</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-800">
              <Cpu className="h-4 w-4 text-emerald-600" />
              <span>Pemrosesan Lokal Super Cepat</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
