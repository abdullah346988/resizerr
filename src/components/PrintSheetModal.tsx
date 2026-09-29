import React, { useState, useEffect, useRef } from 'react';
import { PhotoItem, SheetSettings, ProcessingSettings } from '../types';
import { PAPER_PRESETS } from '../utils/presets';
import {
  computeSheetLayout,
  renderSheetToCanvas,
  generateSheetPdf
} from '../utils/sheetGenerator';
import {
  X,
  Printer,
  Download,
  FileText,
  Sliders,
  Maximize2,
  Grid,
  Check,
  Loader2,
  Sparkles,
  Info
} from 'lucide-react';

interface PrintSheetModalProps {
  photos: PhotoItem[];
  processingSettings: ProcessingSettings;
  isOpen: boolean;
  onClose: () => void;
}

export const PrintSheetModal: React.FC<PrintSheetModalProps> = ({
  photos,
  processingSettings,
  isOpen,
  onClose
}) => {
  const availablePhotos = photos.filter((p) => p.processedUrl || p.originalUrl);

  const [sheetSettings, setSheetSettings] = useState<SheetSettings>({
    paperId: '4x6', // Default 4x6" is most common for home photo printers & pharmacy kiosks!
    orientation: 'portrait',
    photosMode: 'single-repeat',
    selectedPhotoId: availablePhotos[0]?.id,
    repeatCount: 6,
    spacingMm: 4,
    marginMm: 8,
    showCutMarks: true,
    cutMarkStyle: 'crosshairs'
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [isPdfExporting, setIsPdfExporting] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Compute layout specs
  const layout = computeSheetLayout(sheetSettings, processingSettings);

  // Update selected photo if empty or not set
  useEffect(() => {
    if (!sheetSettings.selectedPhotoId && availablePhotos.length > 0) {
      setSheetSettings((s) => ({ ...s, selectedPhotoId: availablePhotos[0].id }));
    }
  }, [availablePhotos, sheetSettings.selectedPhotoId]);

  // Render sheet preview
  useEffect(() => {
    if (!isOpen || availablePhotos.length === 0) return;

    let isCancelled = false;
    setIsGenerating(true);

    // Render at 150 DPI for snappy responsive UI preview
    renderSheetToCanvas(photos, sheetSettings, processingSettings, 150)
      .then((canvas) => {
        if (!isCancelled) {
          setPreviewDataUrl(canvas.toDataURL('image/jpeg', 0.85));
          setIsGenerating(false);
        }
      })
      .catch((err) => {
        console.error('Failed to render preview', err);
        if (!isCancelled) setIsGenerating(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [isOpen, photos, sheetSettings, processingSettings, availablePhotos.length]);

  if (!isOpen) return null;

  // Download high-res PNG / JPG
  const handleDownloadImage = async (format: 'png' | 'jpeg') => {
    try {
      setIsGenerating(true);
      // Full 300 DPI print quality
      const canvas = await renderSheetToCanvas(photos, sheetSettings, processingSettings, 300);
      const dataUrl = canvas.toDataURL(`image/${format}`, format === 'jpeg' ? 0.95 : undefined);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `passport_print_sheet_${sheetSettings.paperId}_300dpi.${format === 'jpeg' ? 'jpg' : 'png'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Download PDF
  const handleDownloadPdf = async () => {
    try {
      setIsPdfExporting(true);
      const pdfBlob = await generateSheetPdf(photos, sheetSettings, processingSettings);
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `passport_sheet_${sheetSettings.paperId}_print_ready.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsPdfExporting(false);
    }
  };

  // Direct Browser Print via hidden iframe (clean, popup-free)
  const handleDirectPrint = async () => {
    try {
      setIsGenerating(true);
      const canvas = await renderSheetToCanvas(photos, sheetSettings, processingSettings, 300);
      const dataUrl = canvas.toDataURL('image/png');

      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const frameDoc = iframe.contentWindow?.document || iframe.contentDocument;
      if (frameDoc) {
        frameDoc.open();
        frameDoc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Print Passport Photo Sheet</title>
              <style>
                @page { size: auto; margin: 0; }
                body { margin: 0; display: flex; align-items: center; justify-content: center; background: white; }
                img { max-width: 100%; height: auto; display: block; }
              </style>
            </head>
            <body>
              <img src="${dataUrl}" />
            </body>
          </html>
        `);
        frameDoc.close();
        iframe.contentWindow?.focus();
        setTimeout(() => {
          iframe.contentWindow?.print();
          setTimeout(() => {
            if (iframe.parentNode) document.body.removeChild(iframe);
          }, 1500);
        }, 500);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                Passport Photo Print Sheet Generator
              </h2>
              <p className="text-xs text-slate-500">
                Auto-tiled print layouts with cutting marks & 100% true physical print scale
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Configuration Controls (5 cols) */}
          <div className="lg:col-span-5 space-y-5 text-xs">
            {/* Paper Size Preset */}
            <div>
              <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Paper Size
              </label>
              <select
                value={sheetSettings.paperId}
                onChange={(e) => setSheetSettings({ ...sheetSettings, paperId: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {PAPER_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Orientation */}
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">Orientation</span>
              <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-slate-100 text-xs">
                <button
                  type="button"
                  onClick={() => setSheetSettings({ ...sheetSettings, orientation: 'portrait' })}
                  className={`px-3 py-1 rounded-md font-medium transition cursor-pointer ${
                    sheetSettings.orientation === 'portrait'
                      ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                      : 'text-slate-600'
                  }`}
                >
                  Portrait
                </button>
                <button
                  type="button"
                  onClick={() => setSheetSettings({ ...sheetSettings, orientation: 'landscape' })}
                  className={`px-3 py-1 rounded-md font-medium transition cursor-pointer ${
                    sheetSettings.orientation === 'landscape'
                      ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                      : 'text-slate-600'
                  }`}
                >
                  Landscape
                </button>
              </div>
            </div>

            {/* Photos Mode */}
            <div className="space-y-2">
              <label className="block font-semibold text-slate-700 uppercase tracking-wider">
                Photo Selection Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSheetSettings({ ...sheetSettings, photosMode: 'single-repeat' })}
                  className={`p-2.5 rounded-xl border text-left cursor-pointer transition ${
                    sheetSettings.photosMode === 'single-repeat'
                      ? 'border-indigo-600 bg-indigo-50/60 text-indigo-950 ring-1 ring-indigo-600'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-semibold">Repeat Single Photo</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Multiple copies for 1 applicant
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSheetSettings({ ...sheetSettings, photosMode: 'all' })}
                  className={`p-2.5 rounded-xl border text-left cursor-pointer transition ${
                    sheetSettings.photosMode === 'all'
                      ? 'border-indigo-600 bg-indigo-50/60 text-indigo-950 ring-1 ring-indigo-600'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-semibold">All Uploaded Photos</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Tile photos of different applicants
                  </div>
                </button>
              </div>

              {sheetSettings.photosMode === 'single-repeat' && (
                <div className="pt-2 space-y-2">
                  <div>
                    <label className="block font-medium text-slate-600 mb-1">
                      Select Photo to Repeat
                    </label>
                    <select
                      value={sheetSettings.selectedPhotoId}
                      onChange={(e) =>
                        setSheetSettings({ ...sheetSettings, selectedPhotoId: e.target.value })
                      }
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                    >
                      {availablePhotos.map((p, i) => (
                        <option key={p.id} value={p.id}>
                          #{i + 1} - {p.name} {p.status === 'completed' ? '(Processed)' : '(Original)'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between font-medium text-slate-600 mb-1">
                      <span>Number of Copies:</span>
                      <span className="font-bold text-indigo-600">
                        {sheetSettings.repeatCount || layout.totalSlots} photos
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max={layout.totalSlots}
                      value={sheetSettings.repeatCount || layout.totalSlots}
                      onChange={(e) =>
                        setSheetSettings({
                          ...sheetSettings,
                          repeatCount: parseInt(e.target.value, 10)
                        })
                      }
                      className="w-full accent-indigo-600"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Cut Marks & Trimming Guides */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">Crop / Cutting Marks</span>
                <input
                  type="checkbox"
                  checked={sheetSettings.showCutMarks}
                  onChange={(e) =>
                    setSheetSettings({ ...sheetSettings, showCutMarks: e.target.checked })
                  }
                  className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                />
              </div>

              {sheetSettings.showCutMarks && (
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  {[
                    { style: 'crosshairs' as const, label: '+ Crosshairs' },
                    { style: 'corners' as const, label: '⌐ Corners' },
                    { style: 'dashed-box' as const, label: '╌ Dashed' }
                  ].map((m) => (
                    <button
                      key={m.style}
                      type="button"
                      onClick={() => setSheetSettings({ ...sheetSettings, cutMarkStyle: m.style })}
                      className={`py-1 px-1.5 rounded-lg border text-center font-medium transition cursor-pointer text-[11px] ${
                        sheetSettings.cutMarkStyle === m.style
                          ? 'border-indigo-600 bg-white text-indigo-900 shadow-xs font-semibold'
                          : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-white'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Spacing & Margins */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex justify-between font-medium text-slate-600 mb-1">
                  <span>Photo Gap</span>
                  <span>{sheetSettings.spacingMm} mm</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="15"
                  step="1"
                  value={sheetSettings.spacingMm}
                  onChange={(e) =>
                    setSheetSettings({
                      ...sheetSettings,
                      spacingMm: parseInt(e.target.value, 10)
                    })
                  }
                  className="w-full accent-indigo-600"
                />
              </div>

              <div>
                <div className="flex justify-between font-medium text-slate-600 mb-1">
                  <span>Sheet Margin</span>
                  <span>{sheetSettings.marginMm} mm</span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="25"
                  step="1"
                  value={sheetSettings.marginMm}
                  onChange={(e) =>
                    setSheetSettings({
                      ...sheetSettings,
                      marginMm: parseInt(e.target.value, 10)
                    })
                  }
                  className="w-full accent-indigo-600"
                />
              </div>
            </div>

            {/* Physical Calibration Stats */}
            <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-1 text-[11px] text-indigo-900">
              <div className="flex justify-between">
                <span>Layout Grid:</span>
                <span className="font-bold">
                  {layout.cols} cols × {layout.rows} rows (Up to {layout.totalSlots} photos)
                </span>
              </div>
              <div className="flex justify-between">
                <span>Passport Unit Size:</span>
                <span className="font-bold">
                  {layout.photoWidthMm.toFixed(1)} × {layout.photoHeightMm.toFixed(1)} mm
                </span>
              </div>
              <div className="flex justify-between text-indigo-700">
                <span>Paper Dimensions:</span>
                <span>
                  {layout.pageWidthMm.toFixed(0)} × {layout.pageHeightMm.toFixed(0)} mm
                </span>
              </div>
            </div>
          </div>

          {/* Right: Live Interactive Sheet Preview (7 cols) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center bg-slate-100/90 rounded-2xl p-4 border border-slate-200 relative min-h-[350px]">
            {isGenerating && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center z-10 rounded-2xl">
                <div className="flex items-center gap-2 text-indigo-700 text-xs font-semibold">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Calculating Millimeter Layout...</span>
                </div>
              </div>
            )}

            {previewDataUrl ? (
              <div className="shadow-lg border border-slate-300 rounded-md bg-white p-1 max-h-[460px] overflow-auto flex items-center justify-center">
                <img
                  src={previewDataUrl}
                  alt="Print Sheet Preview"
                  className="max-h-[440px] w-auto object-contain rounded-xs"
                />
              </div>
            ) : (
              <div className="text-slate-400 text-xs flex flex-col items-center gap-2">
                <Grid className="w-8 h-8 opacity-40" />
                <span>Generating layout preview...</span>
              </div>
            )}

            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span>
                To print at exact physical size, select <strong>"Actual Size" (100% scale)</strong> in your printer dialog.
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
          >
            Close
          </button>

          <div className="flex items-center flex-wrap gap-2.5">
            <button
              onClick={() => handleDownloadImage('jpeg')}
              disabled={isGenerating}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download High-Res JPG</span>
            </button>

            <button
              onClick={handleDirectPrint}
              disabled={isGenerating}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Directly</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isPdfExporting || isGenerating}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50"
            >
              {isPdfExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Building PDF...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>Download Print PDF (Accurate 300 DPI)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
