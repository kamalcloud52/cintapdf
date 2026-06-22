import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

// Dynamically link workerSrc to CDN based on installed version of pdfjs-dist.
// This is the cleanest and most robust way to ensure worker compatibility inside Web sandbox environments.
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

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
