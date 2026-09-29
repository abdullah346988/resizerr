import { ProcessingSettings, PhotoItem, IndividualCrop } from '../types';
import { mmToPx, inchToPx } from './presets';

/**
 * Loads an image from a URL or File into an HTMLImageElement
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error('Failed to load image. File may be corrupted.'));
    img.src = src;
  });
}

/**
 * Calculates pixel dimensions from the current processing settings
 */
export function calculateTargetPixels(settings: ProcessingSettings): { widthPx: number; heightPx: number } {
  const { unit, width, height, dpi } = settings;
  if (unit === 'px') {
    return {
      widthPx: Math.max(10, Math.round(width)),
      heightPx: Math.max(10, Math.round(height))
    };
  } else if (unit === 'inch') {
    return {
      widthPx: Math.max(10, inchToPx(width, dpi)),
      heightPx: Math.max(10, inchToPx(height, dpi))
    };
  } else {
    // mm
    return {
      widthPx: Math.max(10, mmToPx(width, dpi)),
      heightPx: Math.max(10, mmToPx(height, dpi))
    };
  }
}

/**
 * Renders an image to an HTMLCanvasElement with high quality and cropping/fitting logic
 */
export function renderToCanvas(
  img: HTMLImageElement,
  targetWidth: number,
  targetHeight: number,
  settings: ProcessingSettings,
  customCrop?: IndividualCrop
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: false });

  if (!ctx) {
    throw new Error('Could not get canvas 2D context.');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Fill canvas with background color if specified or when fit-background is chosen
  const bgColor = settings.backgroundColor || '#ffffff';
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  const imgWidth = img.naturalWidth || img.width;
  const imgHeight = img.naturalHeight || img.height;

  const targetAspect = targetWidth / targetHeight;
  const imgAspect = imgWidth / imgHeight;

  // Handle custom manual crop adjustments if provided
  if (customCrop && (customCrop.zoom !== 1 || customCrop.offsetX !== 0 || customCrop.offsetY !== 0 || customCrop.rotation !== 0)) {
    ctx.save();
    
    // Move to center
    ctx.translate(targetWidth / 2, targetHeight / 2);
    
    // Apply rotation
    if (customCrop.rotation) {
      ctx.rotate((customCrop.rotation * Math.PI) / 180);
    }

    // Base scale to cover
    const scaleToCover = Math.max(targetWidth / imgWidth, targetHeight / imgHeight);
    const effectiveScale = scaleToCover * customCrop.zoom;

    const drawW = imgWidth * effectiveScale;
    const drawH = imgHeight * effectiveScale;

    // Offsets normalized to canvas dimensions
    const drawX = -drawW / 2 + (customCrop.offsetX * targetWidth);
    const drawY = -drawH / 2 + (customCrop.offsetY * targetHeight);

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    ctx.restore();
    return canvas;
  }

  // Standard processing modes
  if (settings.cropMode === 'stretch') {
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
    return canvas;
  }

  if (settings.cropMode === 'fit-background') {
    // Letterbox / Pillarbox with background color
    let drawW: number;
    let drawH: number;
    let drawX: number;
    let drawY: number;

    if (imgAspect > targetAspect) {
      // Image is wider than target
      drawW = targetWidth;
      drawH = targetWidth / imgAspect;
      drawX = 0;
      drawY = (targetHeight - drawH) / 2;
    } else {
      // Image is taller than target
      drawH = targetHeight;
      drawW = targetHeight * imgAspect;
      drawX = (targetWidth - drawW) / 2;
      drawY = 0;
    }

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    return canvas;
  }

  if (settings.cropMode === 'smart-portrait') {
    // Smart Portrait framing:
    // Biometric passport standard requires the face to be in the upper 50-70% of the photo
    // with adequate head room. When cropping vertically, shift crop focus towards the upper 20-30%.
    if (imgAspect > targetAspect) {
      // Image is wider than target aspect ratio (landscape or wide portrait)
      // Scale so height fits exactly, crop sides centered
      const drawH = targetHeight;
      const drawW = targetHeight * imgAspect;
      const drawX = (targetWidth - drawW) / 2; // Center horizontally
      const drawY = 0;
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
    } else {
      // Image is taller than target aspect ratio (long portrait/full body shot)
      // Scale so width fits exactly, crop vertical with smart head positioning
      const drawW = targetWidth;
      const drawH = targetWidth / imgAspect;
      const drawX = 0;
      
      // Rather than center vertical (drawY = (targetHeight - drawH)/2),
      // we position the crop slightly closer to the top (12% margin from head)
      // to avoid chopping off the subject's crown/hair
      const excessHeight = drawH - targetHeight;
      const topBias = 0.18; // bias towards top 18% where eyes/forehead typically sit
      const drawY = -excessHeight * topBias;

      ctx.drawImage(img, drawX, drawY, drawW, drawH);
    }
    return canvas;
  }

  // 'center-crop' (Exact geometric center crop)
  let drawW: number;
  let drawH: number;
  let drawX: number;
  let drawY: number;

  if (imgAspect > targetAspect) {
    drawH = targetHeight;
    drawW = targetHeight * imgAspect;
    drawX = (targetWidth - drawW) / 2;
    drawY = 0;
  } else {
    drawW = targetWidth;
    drawH = targetWidth / imgAspect;
    drawX = 0;
    drawY = (targetHeight - drawH) / 2;
  }

  ctx.drawImage(img, drawX, drawY, drawW, drawH);
  return canvas;
}

/**
 * Compresses a canvas element into a Blob, using binary search to match target KB if requested
 */
export async function compressCanvas(
  canvas: HTMLCanvasElement,
  format: 'image/jpeg' | 'image/png' | 'image/webp',
  targetKb: number | null,
  fallbackQuality: number = 0.92
): Promise<{ blob: Blob; qualityUsed: number; finalBytes: number }> {
  // Helper to convert canvas to blob with specific quality
  const getBlob = (c: HTMLCanvasElement, fmt: string, q: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      c.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error('Canvas toBlob returned null'));
        },
        fmt,
        q
      );
    });
  };

  // If PNG or targetKb is not specified, output standard quality
  if (format === 'image/png' || targetKb === null || targetKb <= 0) {
    const blob = await getBlob(canvas, format, fallbackQuality);
    return {
      blob,
      qualityUsed: fallbackQuality,
      finalBytes: blob.size
    };
  }

  const targetBytes = targetKb * 1024;
  
  // Binary search for optimal JPEG/WEBP quality
  // Range: 0.05 (maximum compression) to 0.98 (highest quality)
  let lowQuality = 0.05;
  let highQuality = 0.98;
  let bestBlob: Blob | null = null;
  let bestQuality = fallbackQuality;
  let closestDiff = Infinity;

  // Run 7 iterations of binary search (fast & reaches ~0.7% quality precision)
  for (let iter = 0; iter < 7; iter++) {
    const currentQuality = (lowQuality + highQuality) / 2;
    const currentBlob = await getBlob(canvas, format, currentQuality);
    const size = currentBlob.size;
    const diff = Math.abs(size - targetBytes);

    if (diff < closestDiff) {
      closestDiff = diff;
      bestBlob = currentBlob;
      bestQuality = currentQuality;
    }

    // Within 3% of target KB, accept immediately
    if (diff / targetBytes < 0.03) {
      bestBlob = currentBlob;
      bestQuality = currentQuality;
      break;
    }

    if (size > targetBytes) {
      highQuality = currentQuality;
    } else {
      lowQuality = currentQuality;
    }
  }

  // If even at minimum quality (0.05) the image is still significantly larger than targetKb
  // (e.g. user requested 15 KB on a high-res image), do a secondary pass with gentle downscale
  if (bestBlob && bestBlob.size > targetBytes * 1.15 && targetKb < 40) {
    // Attempt slightly downscaled version to hit strict portal limits (e.g., <= 20 KB portals)
    const scaleFactor = Math.sqrt(targetBytes / bestBlob.size);
    if (scaleFactor > 0.6 && scaleFactor < 0.95) {
      const scaledCanvas = document.createElement('canvas');
      scaledCanvas.width = Math.round(canvas.width * scaleFactor);
      scaledCanvas.height = Math.round(canvas.height * scaleFactor);
      const sCtx = scaledCanvas.getContext('2d');
      if (sCtx) {
        sCtx.imageSmoothingEnabled = true;
        sCtx.imageSmoothingQuality = 'high';
        sCtx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
        const scaledBlob = await getBlob(scaledCanvas, format, 0.75);
        if (scaledBlob.size <= targetBytes * 1.05) {
          return {
            blob: scaledBlob,
            qualityUsed: 0.75,
            finalBytes: scaledBlob.size
          };
        }
      }
    }
  }

  if (!bestBlob) {
    bestBlob = await getBlob(canvas, format, fallbackQuality);
    bestQuality = fallbackQuality;
  }

  return {
    blob: bestBlob,
    qualityUsed: +bestQuality.toFixed(2),
    finalBytes: bestBlob.size
  };
}

/**
 * Fully processes a single PhotoItem according to current settings
 */
export async function processSinglePhoto(
  photo: PhotoItem,
  settings: ProcessingSettings
): Promise<Partial<PhotoItem>> {
  const startTime = performance.now();
  const { widthPx, heightPx } = calculateTargetPixels(settings);

  try {
    const img = await loadImage(photo.originalUrl);
    const canvas = renderToCanvas(img, widthPx, heightPx, settings, photo.customCrop);
    const { blob, qualityUsed, finalBytes } = await compressCanvas(
      canvas,
      settings.format,
      settings.targetKb,
      settings.jpegQuality
    );

    const processedUrl = URL.createObjectURL(blob);
    const elapsed = Math.round(performance.now() - startTime);

    return {
      status: 'completed',
      processedUrl,
      processedBlob: blob,
      processedSize: finalBytes,
      processedWidth: widthPx,
      processedHeight: heightPx,
      appliedQuality: qualityUsed,
      processTimeMs: elapsed,
      errorMessage: undefined
    };
  } catch (err: any) {
    return {
      status: 'error',
      errorMessage: err?.message || 'Failed to process image'
    };
  }
}
