export type CompressionMode = 'light' | 'medium' | 'high';
export type PDFTool = 'compress' | 'merge' | 'split' | 'rotate' | 'watermark' | 'numbering' | 'delete';

export interface PDFMetadata {
  name: string;
  size: number; // in bytes
  pageCount: number;
  title?: string;
  author?: string;
}

export interface CompressionResult {
  fileName: string;
  originalSize: number; // bytes
  compressedSize: number; // bytes
  reductionPercentage: number;
  downloadUrl: string;
  durationMs: number;
  blob: Blob;
}

export interface HistoryItem {
  id: string;
  fileName: string;
  originalSize: number;
  compressedSize: number;
  mode: CompressionMode;
  date: string;
  reductionPercentage: number;
}
