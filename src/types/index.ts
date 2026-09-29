export type Unit = 'mm' | 'inch' | 'px';

export type CropMode = 'smart-portrait' | 'center-crop' | 'fit-background' | 'stretch';

export type ImageFormat = 'image/jpeg' | 'image/png' | 'image/webp';

export interface PassportPreset {
  id: string;
  name: string;
  country: string;
  widthMm: number;
  heightMm: number;
  widthInch: number;
  heightInch: number;
  standardDpi: number;
  description: string;
}

export interface PaperSizePreset {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  widthInch: number;
  heightInch: number;
}

export interface ProcessingSettings {
  presetId: string;
  unit: Unit;
  width: number; // in current unit
  height: number; // in current unit
  dpi: number;
  cropMode: CropMode;
  targetKb: number | null; // null for original/max quality
  format: ImageFormat;
  jpegQuality: number; // 0.05 to 1.0 default fallback
  backgroundColor: string; // hex
  customDimensions: {
    mm: { width: number; height: number };
    inch: { width: number; height: number };
    px: { width: number; height: number };
  };
}

export interface IndividualCrop {
  zoom: number; // 1 to 3
  offsetX: number; // -1 to 1 (-100% to +100%)
  offsetY: number; // -1 to 1
  rotation: number; // 0, 90, 180, 270
}

export interface PhotoItem {
  id: string;
  file: File;
  name: string;
  originalSize: number; // bytes
  originalWidth: number;
  originalHeight: number;
  originalUrl: string;
  
  // Custom manual adjustment per photo (optional override)
  customCrop?: IndividualCrop;

  // Processed results
  status: 'pending' | 'processing' | 'completed' | 'error';
  errorMessage?: string;
  processedUrl?: string;
  processedBlob?: Blob;
  processedSize?: number; // bytes
  processedWidth?: number; // px
  processedHeight?: number; // px
  appliedQuality?: number;
  processTimeMs?: number;
}

export interface SheetSettings {
  paperId: string;
  orientation: 'portrait' | 'landscape';
  photosMode: 'all' | 'single-repeat';
  selectedPhotoId?: string;
  repeatCount?: number;
  columns?: number; // auto if 0
  rows?: number; // auto if 0
  spacingMm: number;
  marginMm: number;
  showCutMarks: boolean;
  cutMarkStyle: 'crosshairs' | 'corners' | 'dashed-box';
}
