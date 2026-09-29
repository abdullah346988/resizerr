import { jsPDF } from 'jspdf';
import { PhotoItem, SheetSettings, ProcessingSettings } from '../types';
import { PAPER_PRESETS, PASSPORT_PRESETS } from './presets';
import { loadImage } from './imageProcessor';

export interface LayoutCalculations {
  cols: number;
  rows: number;
  totalSlots: number;
  pageWidthMm: number;
  pageHeightMm: number;
  photoWidthMm: number;
  photoHeightMm: number;
  startXmm: number;
  startYmm: number;
  spacingMm: number;
  marginMm: number;
}

export function computeSheetLayout(
  sheetSettings: SheetSettings,
  processingSettings: ProcessingSettings
): LayoutCalculations {
  const paper = PAPER_PRESETS.find((p) => p.id === sheetSettings.paperId) || PAPER_PRESETS[0];

  let pageWidthMm = paper.widthMm;
  let pageHeightMm = paper.heightMm;

  if (sheetSettings.orientation === 'landscape') {
    pageWidthMm = Math.max(paper.widthMm, paper.heightMm);
    pageHeightMm = Math.min(paper.widthMm, paper.heightMm);
  } else {
    pageWidthMm = Math.min(paper.widthMm, paper.heightMm);
    pageHeightMm = Math.max(paper.widthMm, paper.heightMm);
  }

  // Calculate photo width and height in mm
  let photoWidthMm = 35;
  let photoHeightMm = 45;

  if (processingSettings.unit === 'mm') {
    photoWidthMm = processingSettings.width;
    photoHeightMm = processingSettings.height;
  } else if (processingSettings.unit === 'inch') {
    photoWidthMm = processingSettings.width * 25.4;
    photoHeightMm = processingSettings.height * 25.4;
  } else {
    // px
    photoWidthMm = (processingSettings.width / processingSettings.dpi) * 25.4;
    photoHeightMm = (processingSettings.height / processingSettings.dpi) * 25.4;
  }

  const marginMm = sheetSettings.marginMm ?? 8;
  const spacingMm = sheetSettings.spacingMm ?? 4;

  const printableW = pageWidthMm - 2 * marginMm;
  const printableH = pageHeightMm - 2 * marginMm;

  let cols = Math.floor((printableW + spacingMm) / (photoWidthMm + spacingMm));
  let rows = Math.floor((printableH + spacingMm) / (photoHeightMm + spacingMm));

  if (sheetSettings.columns && sheetSettings.columns > 0) {
    cols = Math.min(cols, sheetSettings.columns);
  }
  if (sheetSettings.rows && sheetSettings.rows > 0) {
    rows = Math.min(rows, sheetSettings.rows);
  }

  cols = Math.max(1, cols);
  rows = Math.max(1, rows);

  // Center the grid within the sheet
  const totalGridWidth = cols * photoWidthMm + (cols - 1) * spacingMm;
  const totalGridHeight = rows * photoHeightMm + (rows - 1) * spacingMm;

  const startXmm = Math.max(marginMm, (pageWidthMm - totalGridWidth) / 2);
  const startYmm = Math.max(marginMm, (pageHeightMm - totalGridHeight) / 2);

  return {
    cols,
    rows,
    totalSlots: cols * rows,
    pageWidthMm,
    pageHeightMm,
    photoWidthMm,
    photoHeightMm,
    startXmm,
    startYmm,
    spacingMm,
    marginMm
  };
}

/**
 * Draws cut marks onto a 2D canvas context
 */
function drawCutMarksCanvas(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  style: SheetSettings['cutMarkStyle'],
  scalePxPerMm: number
) {
  const tickLength = 2.5 * scalePxPerMm;
  const gap = 0.5 * scalePxPerMm;

  ctx.save();
  ctx.strokeStyle = '#64748b'; // slate-500
  ctx.lineWidth = 1;

  if (style === 'dashed-box') {
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
  } else if (style === 'corners') {
    // L-shaped corners
    ctx.setLineDash([]);
    // Top-Left
    ctx.beginPath();
    ctx.moveTo(x - tickLength, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y - tickLength);
    ctx.stroke();

    // Top-Right
    ctx.beginPath();
    ctx.moveTo(x + w + tickLength, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y - tickLength);
    ctx.stroke();

    // Bottom-Left
    ctx.beginPath();
    ctx.moveTo(x - tickLength, y + h);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + h + tickLength);
    ctx.stroke();

    // Bottom-Right
    ctx.beginPath();
    ctx.moveTo(x + w + tickLength, y + h);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + w, y + h + tickLength);
    ctx.stroke();
  } else {
    // Crosshairs
    ctx.setLineDash([]);
    // TL
    ctx.beginPath();
    ctx.moveTo(x - tickLength - gap, y);
    ctx.lineTo(x - gap, y);
    ctx.moveTo(x, y - tickLength - gap);
    ctx.lineTo(x, y - gap);
    ctx.stroke();

    // TR
    ctx.beginPath();
    ctx.moveTo(x + w + gap, y);
    ctx.lineTo(x + w + tickLength + gap, y);
    ctx.moveTo(x + w, y - tickLength - gap);
    ctx.lineTo(x + w, y - gap);
    ctx.stroke();

    // BL
    ctx.beginPath();
    ctx.moveTo(x - tickLength - gap, y + h);
    ctx.lineTo(x - gap, y + h);
    ctx.moveTo(x, y + h + gap);
    ctx.lineTo(x, y + h + tickLength + gap);
    ctx.stroke();

    // BR
    ctx.beginPath();
    ctx.moveTo(x + w + gap, y + h);
    ctx.lineTo(x + w + tickLength + gap, y + h);
    ctx.moveTo(x + w, y + h + gap);
    ctx.lineTo(x + w, y + h + tickLength + gap);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Generates an ultra high-res Canvas of the print sheet for direct viewing & JPG/PNG download
 */
export async function renderSheetToCanvas(
  photos: PhotoItem[],
  sheetSettings: SheetSettings,
  processingSettings: ProcessingSettings,
  dpi: number = 300
): Promise<HTMLCanvasElement> {
  const layout = computeSheetLayout(sheetSettings, processingSettings);
  const pxPerMm = dpi / 25.4;

  const canvasWidth = Math.round(layout.pageWidthMm * pxPerMm);
  const canvasHeight = Math.round(layout.pageHeightMm * pxPerMm);

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // Fill sheet background (pure white)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Determine photo queue
  let photoQueue: (PhotoItem | null)[] = [];
  const validPhotos = photos.filter((p) => p.status === 'completed' && (p.processedUrl || p.originalUrl));

  if (sheetSettings.photosMode === 'single-repeat') {
    const targetPhoto = validPhotos.find((p) => p.id === sheetSettings.selectedPhotoId) || validPhotos[0];
    const count = sheetSettings.repeatCount && sheetSettings.repeatCount > 0 ? sheetSettings.repeatCount : layout.totalSlots;
    photoQueue = Array(Math.min(layout.totalSlots, count)).fill(targetPhoto);
  } else {
    photoQueue = validPhotos.slice(0, layout.totalSlots);
  }

  // Pre-load images
  const loadedImages: (HTMLImageElement | null)[] = [];
  for (const item of photoQueue) {
    if (item) {
      try {
        const img = await loadImage(item.processedUrl || item.originalUrl);
        loadedImages.push(img);
      } catch {
        loadedImages.push(null);
      }
    } else {
      loadedImages.push(null);
    }
  }

  const pW_px = layout.photoWidthMm * pxPerMm;
  const pH_px = layout.photoHeightMm * pxPerMm;
  const sp_px = layout.spacingMm * pxPerMm;
  const startX_px = layout.startXmm * pxPerMm;
  const startY_px = layout.startYmm * pxPerMm;

  let itemIdx = 0;
  for (let r = 0; r < layout.rows; r++) {
    for (let c = 0; c < layout.cols; c++) {
      if (itemIdx >= photoQueue.length) break;

      const posX = startX_px + c * (pW_px + sp_px);
      const posY = startY_px + r * (pH_px + sp_px);

      const img = loadedImages[itemIdx];
      if (img) {
        ctx.drawImage(img, posX, posY, pW_px, pH_px);
        
        // Optional subtle hairline border around the photo to distinguish edge on white paper
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 1;
        ctx.strokeRect(posX, posY, pW_px, pH_px);
      }

      if (sheetSettings.showCutMarks) {
        drawCutMarksCanvas(ctx, posX, posY, pW_px, pH_px, sheetSettings.cutMarkStyle, pxPerMm);
      }

      itemIdx++;
    }
  }

  // Header / footer metadata watermark for printer calibration (outside printable area)
  ctx.fillStyle = '#94a3b8';
  ctx.font = `${Math.round(2.6 * pxPerMm)}px sans-serif`;
  ctx.fillText(
    `Passport Photo Sheet • Size: ${layout.photoWidthMm.toFixed(1)} × ${layout.photoHeightMm.toFixed(1)} mm • DPI: ${dpi} • Print at 100% scale (Do not fit to page)`,
    startX_px,
    canvasHeight - (layout.marginMm * 0.35 * pxPerMm)
  );

  return canvas;
}

/**
 * Generates a millimeter-accurate vector PDF using jsPDF
 */
export async function generateSheetPdf(
  photos: PhotoItem[],
  sheetSettings: SheetSettings,
  processingSettings: ProcessingSettings
): Promise<Blob> {
  const layout = computeSheetLayout(sheetSettings, processingSettings);

  const doc = new jsPDF({
    orientation: sheetSettings.orientation,
    unit: 'mm',
    format: [layout.pageWidthMm, layout.pageHeightMm],
    compress: true
  });

  const validPhotos = photos.filter((p) => p.status === 'completed' && (p.processedUrl || p.originalUrl));
  let photoQueue: (PhotoItem | null)[] = [];

  if (sheetSettings.photosMode === 'single-repeat') {
    const targetPhoto = validPhotos.find((p) => p.id === sheetSettings.selectedPhotoId) || validPhotos[0];
    const count = sheetSettings.repeatCount && sheetSettings.repeatCount > 0 ? sheetSettings.repeatCount : layout.totalSlots;
    photoQueue = Array(Math.min(layout.totalSlots, count)).fill(targetPhoto);
  } else {
    photoQueue = validPhotos.slice(0, layout.totalSlots);
  }

  // Helper to convert blob/url to base64 for jsPDF
  const getBase64 = async (url: string): Promise<string> => {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  };

  const imageCache = new Map<string, string>();
  for (const item of photoQueue) {
    if (item) {
      const url = item.processedUrl || item.originalUrl;
      if (!imageCache.has(url)) {
        try {
          const b64 = await getBase64(url);
          imageCache.set(url, b64);
        } catch (e) {
          console.error('Failed to load image for PDF', e);
        }
      }
    }
  }

  let itemIdx = 0;
  for (let r = 0; r < layout.rows; r++) {
    for (let c = 0; c < layout.cols; c++) {
      if (itemIdx >= photoQueue.length) break;

      const posX = layout.startXmm + c * (layout.photoWidthMm + layout.spacingMm);
      const posY = layout.startYmm + r * (layout.photoHeightMm + layout.spacingMm);

      const item = photoQueue[itemIdx];
      if (item) {
        const url = item.processedUrl || item.originalUrl;
        const b64 = imageCache.get(url);
        if (b64) {
          doc.addImage(b64, 'JPEG', posX, posY, layout.photoWidthMm, layout.photoHeightMm, undefined, 'FAST');
        }
      }

      // Add cut marks in PDF vector mode
      if (sheetSettings.showCutMarks) {
        doc.setDrawColor(120, 120, 120);
        doc.setLineWidth(0.18);

        if (sheetSettings.cutMarkStyle === 'dashed-box') {
          doc.setLineDashPattern([1.5, 1], 0);
          doc.rect(posX, posY, layout.photoWidthMm, layout.photoHeightMm);
        } else if (sheetSettings.cutMarkStyle === 'corners') {
          doc.setLineDashPattern([], 0);
          const t = 2.5; // tick mm
          // TL
          doc.line(posX - t, posY, posX, posY);
          doc.line(posX, posY - t, posX, posY);
          // TR
          doc.line(posX + layout.photoWidthMm + t, posY, posX + layout.photoWidthMm, posY);
          doc.line(posX + layout.photoWidthMm, posY - t, posX + layout.photoWidthMm, posY);
          // BL
          doc.line(posX - t, posY + layout.photoHeightMm, posX, posY + layout.photoHeightMm);
          doc.line(posX, posY + layout.photoHeightMm + t, posX, posY + layout.photoHeightMm);
          // BR
          doc.line(posX + layout.photoWidthMm + t, posY + layout.photoHeightMm, posX + layout.photoWidthMm, posY + layout.photoHeightMm);
          doc.line(posX + layout.photoWidthMm, posY + layout.photoHeightMm + t, posX + layout.photoWidthMm, posY + layout.photoHeightMm);
        } else {
          // Crosshairs
          doc.setLineDashPattern([], 0);
          const t = 2.5;
          const g = 0.6;
          // TL
          doc.line(posX - t - g, posY, posX - g, posY);
          doc.line(posX, posY - t - g, posX, posY - g);
          // TR
          doc.line(posX + layout.photoWidthMm + g, posY, posX + layout.photoWidthMm + t + g, posY);
          doc.line(posX + layout.photoWidthMm, posY - t - g, posX + layout.photoWidthMm, posY - g);
          // BL
          doc.line(posX - t - g, posY + layout.photoHeightMm, posX - g, posY + layout.photoHeightMm);
          doc.line(posX, posY + layout.photoHeightMm + g, posX, posY + layout.photoHeightMm + t + g);
          // BR
          doc.line(posX + layout.photoWidthMm + g, posY + layout.photoHeightMm, posX + layout.photoWidthMm + t + g, posY + layout.photoHeightMm);
          doc.line(posX + layout.photoWidthMm, posY + layout.photoHeightMm + g, posX + layout.photoWidthMm, posY + layout.photoHeightMm + t + g);
        }
      }

      itemIdx++;
    }
  }

  // Footer instruction
  doc.setFontSize(7.5);
  doc.setTextColor(140, 140, 140);
  doc.text(
    `Passport Photo Sheet • Size: ${layout.photoWidthMm.toFixed(1)} × ${layout.photoHeightMm.toFixed(1)} mm • IMPORTANT: In print dialog, select "Actual Size" or 100% scale. Do not choose "Fit to printable area".`,
    layout.startXmm,
    layout.pageHeightMm - 3.5
  );

  return doc.output('blob');
}
