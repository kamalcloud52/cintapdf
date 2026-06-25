import { PDFDocument, degrees, rgb } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Gunakan bundler lokal Vite untuk memuat worker.
// Ini menjamin kelancaran muat mandiri tanpa CORS, tanpa error CSP, dan tanpa bergantung pada CDN luar.
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

/**
 * Extracts key metadata from a PDF file buffer using pdf-lib.
 * This runs fully synchronously/client-side and avoids spawning heavy workers.
 */
export async function getPDFMetadata(arrayBuffer: ArrayBuffer) {
  try {
    const doc = await PDFDocument.load(arrayBuffer, { 
      ignoreEncryption: true,
      updateMetadata: false 
    });
    
    return {
      pageCount: doc.getPageCount(),
      title: doc.getTitle() || undefined,
      author: doc.getAuthor() || undefined,
      creator: doc.getCreator() || undefined,
      producer: doc.getProducer() || undefined,
    };
  } catch (error) {
    console.error('Failed to parse PDF metadata client-side:', error);
    throw new Error('The file seems to be corrupted, encrypted, or holds an invalid PDF signature.');
  }
}

/**
 * LIGHT COMPRESSION MODE
 * Runs quick object stream compression on the original PDF structural definition.
 * Keeps 100% original graphics and editable vectors intact.
 */
export async function compressLight(arrayBuffer: ArrayBuffer): Promise<Uint8Array> {
  const doc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  // Save with useObjectStreams: true compressing cross-reference tables and meta objects
  return await doc.save({ useObjectStreams: true });
}

/**
 * MEDIUM COMPRESSION MODE
 * Rebuilds the PDF by copying pages into a pristine document.
 * This naturally flushes revision history edits, unused embedded fonts, and dead metadata.
 */
export async function compressMedium(arrayBuffer: ArrayBuffer): Promise<Uint8Array> {
  const oldDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const newDoc = await PDFDocument.create();
  
  const pageIndices = Array.from({ length: oldDoc.getPageCount() }, (_, i) => i);
  const copiedPages = await newDoc.copyPages(oldDoc, pageIndices);
  
  for (const page of copiedPages) {
    newDoc.addPage(page);
  }
  
  // Re-append key metadata
  const title = oldDoc.getTitle();
  if (title) newDoc.setTitle(title);
  const author = oldDoc.getAuthor();
  if (author) newDoc.setAuthor(author);
  
  return await newDoc.save({ useObjectStreams: true });
}

/**
 * HIGH COMPRESSION MODE
 * Renders pages onto high-density canvases and re-encodes them as compact, screen-optimized JPEGs.
 * Achieving up to 90% size reduction on graphical portfolios, slides, or scanned documents.
 */
export async function compressHigh(
  arrayBuffer: ArrayBuffer,
  quality: number, // 0.1 to 1.0
  scale: number, // resolution scale e.g. 1.0 to 1.5
  onProgress?: (current: number, total: number) => void
): Promise<Uint8Array> {
  // Load using PDFJS
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdfInstance = await loadingTask.promise;
  const numPages = pdfInstance.numPages;
  
  const newDoc = await PDFDocument.create();
  
  for (let i = 1; i <= numPages; i++) {
    onProgress?.(i, numPages);
    
    const pageInstance = await pdfInstance.getPage(i);
    const viewport = pageInstance.getViewport({ scale });
    
    // Create canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Unable to create canvas rendering context.');
    }
    
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    // Draw white background (especially for scans with transparent backings)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Render PDF page onto Canvas
    await pageInstance.render({
      canvasContext: ctx,
      viewport: viewport,
      canvas: canvas,
    }).promise;
    
    // Convert canvas image back into compressed JPEG format
    const imgDataUrl = canvas.toDataURL('image/jpeg', quality);
    
    // Inject JPEG into new document
    const imgObj = await newDoc.embedJpg(imgDataUrl);
    
    // Add page and draw JPG content to match exactly
    const addedPage = newDoc.addPage([viewport.width, viewport.height]);
    addedPage.drawImage(imgObj, {
      x: 0,
      y: 0,
      width: viewport.width,
      height: viewport.height,
    });
  }
  
  return await newDoc.save({ useObjectStreams: true });
}

/**
 * GABUNG PDF (MERGE)
 * Combines multiple PDF file buffers into a single PDF document in the specified order.
 */
export async function mergePDFs(arrayBuffers: ArrayBuffer[]): Promise<Uint8Array> {
  const mergedDoc = await PDFDocument.create();
  
  for (const buffer of arrayBuffers) {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const pagesToCopy = doc.getPageIndices();
    const copiedPages = await mergedDoc.copyPages(doc, pagesToCopy);
    
    for (const page of copiedPages) {
      mergedDoc.addPage(page);
    }
  }
  
  return await mergedDoc.save({ useObjectStreams: true });
}

/**
 * Parses user input ranges like "1-3, 5, 7" into 0-indexed page indices.
 */
export function parsePageRanges(rangeStr: string, maxPages: number): number[] {
  const pages = new Set<number>();
  const parts = rangeStr.split(',');
  
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    
    if (trimmed.includes('-')) {
      const [startStr, endStr] = trimmed.split('-');
      const start = parseInt(startStr.trim(), 10);
      const end = parseInt(endStr.trim(), 10);
      
      if (!isNaN(start) && !isNaN(end)) {
        const s = Math.max(1, Math.min(start, maxPages));
        const e = Math.max(1, Math.min(end, maxPages));
        const min = Math.min(s, e);
        const max = Math.max(s, e);
        
        for (let i = min; i <= max; i++) {
          pages.add(i - 1);
        }
      }
    } else {
      const page = parseInt(trimmed, 10);
      if (!isNaN(page) && page >= 1 && page <= maxPages) {
        pages.add(page - 1);
      }
    }
  }
  
  return Array.from(pages).sort((a, b) => a - b);
}

/**
 * PISAH / EKSTRAK HALAMAN (SPLIT)
 * Extracts a subset of page indices from an existing PDF into a brand-new PDF.
 */
export async function extractPDFPages(arrayBuffer: ArrayBuffer, pageIndices: number[]): Promise<Uint8Array> {
  if (pageIndices.length === 0) {
    throw new Error('Paling tidak satu halaman harus dipilih untuk diekstrak.');
  }
  
  const oldDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const newDoc = await PDFDocument.create();
  const copiedPages = await newDoc.copyPages(oldDoc, pageIndices);
  
  for (const page of copiedPages) {
    newDoc.addPage(page);
  }
  
  return await newDoc.save({ useObjectStreams: true });
}

/**
 * PUTAR HALAMAN (ROTATE)
 * Rotates the specified page indices of a PDF by a given angle (90, 180, 270).
 */
export async function rotatePDFPages(
  arrayBuffer: ArrayBuffer,
  rotationAngle: number, // in degrees, e.g. 90, 180, 270
  pageIndices?: number[] // if undefined, rotate all pages
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const pages = doc.getPages();
  const indices = pageIndices || Array.from({ length: pages.length }, (_, i) => i);
  
  for (const index of indices) {
    if (index >= 0 && index < pages.length) {
      const page = pages[index];
      const currentRotation = page.getRotation().angle;
      // standard angles: 0, 90, 180, 270
      page.setRotation(degrees((currentRotation + rotationAngle) % 360));
    }
  }
  
  return await doc.save({ useObjectStreams: true });
}

/**
 * TAMBAH WATERMARK PDF
 * Menambahkan teks watermark dengan kustomisasi font size, opacity, warna, dan rotasi.
 */
export async function addWatermarkToPDF(
  arrayBuffer: ArrayBuffer,
  text: string,
  options: {
    fontSize: number;
    opacity: number;
    colorHex: string;
    rotationAngle: number;
  }
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const helveticaFont = await doc.embedFont('Helvetica-Bold');
  const pages = doc.getPages();
  
  // Parse hex color (e.g. #ff0000)
  const hex = options.colorHex.replace('#', '');
  const r = (parseInt(hex.substring(0, 2), 16) || 0) / 255;
  const g = (parseInt(hex.substring(2, 4), 16) || 0) / 255;
  const b = (parseInt(hex.substring(4, 6), 16) || 0) / 255;

  for (const page of pages) {
    const { width, height } = page.getSize();
    
    const textWidth = helveticaFont.widthOfTextAtSize(text, options.fontSize);
    const textHeight = helveticaFont.heightAtSize(options.fontSize);
    
    // Posisi di tengah halaman
    const x = width / 2 - (textWidth / 2) * Math.cos(options.rotationAngle * Math.PI / 180);
    const y = height / 2 - (textHeight / 2) * Math.sin(options.rotationAngle * Math.PI / 180);

    page.drawText(text, {
      x: x < 30 ? 40 : x,
      y: y < 30 ? height / 2 : y,
      size: options.fontSize,
      font: helveticaFont,
      color: rgb(r, g, b),
      opacity: options.opacity,
      rotate: degrees(options.rotationAngle),
    });
  }
  
  return await doc.save({ useObjectStreams: true });
}

/**
 * TAMBAH NOMOR HALAMAN PDF
 * Menyisipkan nomor halaman ke setiap lembar PDF secara dinamis.
 */
export async function addPageNumbersToPDF(
  arrayBuffer: ArrayBuffer,
  options: {
    position: 'bottom-center' | 'bottom-right' | 'top-center' | 'top-right';
    fontSize: number;
    startNumber: number;
    format: string;
  }
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const helveticaFont = await doc.embedFont('Helvetica');
  const pages = doc.getPages();
  const total = pages.length;
  
  for (let i = 0; i < total; i++) {
    const page = pages[i];
    const pageNum = options.startNumber + i;
    const text = options.format
      .replace('{n}', pageNum.toString())
      .replace('{total}', total.toString());
      
    const { width, height } = page.getSize();
    const textWidth = helveticaFont.widthOfTextAtSize(text, options.fontSize);
    const textHeight = helveticaFont.heightAtSize(options.fontSize);
    
    let x = width / 2 - textWidth / 2;
    let y = 30; // margin default
    
    if (options.position === 'bottom-right') {
      x = width - textWidth - 30;
    } else if (options.position === 'top-center') {
      y = height - 30;
    } else if (options.position === 'top-right') {
      x = width - textWidth - 30;
      y = height - 30;
    }
    
    page.drawText(text, {
      x,
      y,
      size: options.fontSize,
      font: helveticaFont,
      color: rgb(0.39, 0.45, 0.55), // Slate 500
    });
  }
  
  return await doc.save({ useObjectStreams: true });
}

/**
 * HAPUS HALAMAN PDF
 * Menghapus lembaran halaman tertentu dari dokumen PDF.
 */
export async function deletePDFPages(
  arrayBuffer: ArrayBuffer,
  pagesToDeleteStr: string
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const totalPages = doc.getPageCount();
  
  const targetIndices = parsePageRanges(pagesToDeleteStr, totalPages);
  if (targetIndices.length === 0) {
    throw new Error('Format jangkauan halaman tidak valid atau di luar batas dokumen.');
  }
  
  if (targetIndices.length >= totalPages) {
    throw new Error('Anda tidak diperkenankan menghapus seluruh halaman dokumen.');
  }
  
  const sortedIndicesDesc = [...targetIndices].sort((a, b) => b - a);
  
  for (const index of sortedIndicesDesc) {
    doc.removePage(index);
  }
  
  return await doc.save({ useObjectStreams: true });
}

