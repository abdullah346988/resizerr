import React, { useState, useRef, useCallback, useEffect } from 'react';
import JSZip from 'jszip';
import { PhotoItem, ProcessingSettings, IndividualCrop } from './types';
import { PASSPORT_PRESETS, formatFileSize } from './utils/presets';
import { processSinglePhoto } from './utils/imageProcessor';
import { createSamplePortraitFiles } from './utils/samplePortraits';
import { Header } from './components/Header';
import { SettingsPanel } from './components/SettingsPanel';
import { UploadZone } from './components/UploadZone';
import { BatchProgressBar } from './components/BatchProgressBar';
import { PhotoCard } from './components/PhotoCard';
import { CropAdjusterModal } from './components/CropAdjusterModal';
import { PrintSheetModal } from './components/PrintSheetModal';
import {
  FolderArchive,
  Printer,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  Filter,
  Search,
  SlidersHorizontal,
  Info
} from 'lucide-react';

const DEFAULT_SETTINGS: ProcessingSettings = {
  presetId: 'uk-eu-35x45',
  unit: 'mm',
  width: 35,
  height: 45,
  dpi: 300,
  cropMode: 'smart-portrait',
  targetKb: 50, // Standard 50 KB passport target
  format: 'image/jpeg',
  jpegQuality: 0.92,
  backgroundColor: 'transparent',
  customDimensions: {
    mm: { width: 35, height: 45 },
    inch: { width: 2, height: 2 },
    px: { width: 600, height: 600 }
  }
};

export default function App() {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [settings, setSettings] = useState<ProcessingSettings>(DEFAULT_SETTINGS);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'pending' | 'error'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [activeCropPhoto, setActiveCropPhoto] = useState<PhotoItem | null>(null);
  const [isPrintSheetOpen, setIsPrintSheetOpen] = useState(false);

  // References for processing loop control
  const isPausedRef = useRef(false);
  const isCancelledRef = useRef(false);

  // Keep ref synced with state
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Clean up ObjectURLs when photos change or component unmounts to prevent memory leaks
  const cleanUpUrls = (items: PhotoItem[]) => {
    items.forEach((p) => {
      if (p.originalUrl && p.originalUrl.startsWith('blob:')) {
        URL.revokeObjectURL(p.originalUrl);
      }
      if (p.processedUrl && p.processedUrl.startsWith('blob:')) {
        URL.revokeObjectURL(p.processedUrl);
      }
    });
  };

  const handleClearAll = useCallback(() => {
    isCancelledRef.current = true;
    setIsProcessing(false);
    setIsPaused(false);
    cleanUpUrls(photos);
    setPhotos([]);
  }, [photos]);

  // Add newly uploaded photos
  const handlePhotosAdded = (newItems: PhotoItem[]) => {
    setPhotos((prev) => [...prev, ...newItems]);
  };

  // Remove a single photo
  const handleRemovePhoto = (id: string) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) {
        if (target.originalUrl?.startsWith('blob:')) URL.revokeObjectURL(target.originalUrl);
        if (target.processedUrl?.startsWith('blob:')) URL.revokeObjectURL(target.processedUrl);
      }
      return prev.filter((p) => p.id !== id);
    });
  };

  // Load sample photos for instant testing
  const handleLoadSamples = async () => {
    try {
      const files = await createSamplePortraitFiles();
      const newItems: PhotoItem[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const url = URL.createObjectURL(file);
        newItems.push({
          id: `sample_${Date.now()}_${i}`,
          file,
          name: file.name,
          originalSize: file.size,
          originalWidth: 800,
          originalHeight: 1000,
          originalUrl: url,
          status: 'pending'
        });
      }

      setPhotos((prev) => [...prev, ...newItems]);
    } catch (err) {
      console.error('Failed to load samples', err);
    }
  };

  // Process a single photo on demand
  const handleProcessSingle = async (photo: PhotoItem) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === photo.id ? { ...p, status: 'processing' } : p))
    );

    const update = await processSinglePhoto(photo, settings);

    setPhotos((prev) =>
      prev.map((p) => (p.id === photo.id ? { ...p, ...update } : p))
    );
  };

  // Apply custom crop to a photo and immediately reprocess it
  const handleApplyCrop = async (photoId: string, crop: IndividualCrop) => {
    const target = photos.find((p) => p.id === photoId);
    if (!target) return;

    const updatedPhoto = { ...target, customCrop: crop, status: 'processing' as const };

    setPhotos((prev) =>
      prev.map((p) => (p.id === photoId ? updatedPhoto : p))
    );

    const result = await processSinglePhoto(updatedPhoto, settings);

    setPhotos((prev) =>
      prev.map((p) => (p.id === photoId ? { ...p, ...result } : p))
    );
  };

  // Bulk Process All Photos (Queue with non-blocking concurrency)
  const handleStartProcessing = async () => {
    if (photos.length === 0 || isProcessing) return;

    setIsProcessing(true);
    setIsPaused(false);
    isPausedRef.current = false;
    isCancelledRef.current = false;

    // Grab all photos to process
    const toProcess = [...photos];

    for (let i = 0; i < toProcess.length; i++) {
      if (isCancelledRef.current) break;

      // Handle pause
      while (isPausedRef.current && !isCancelledRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      const current = toProcess[i];

      // Set item to processing
      setPhotos((prev) =>
        prev.map((p) => (p.id === current.id ? { ...p, status: 'processing' } : p))
      );

      // Process photo
      const update = await processSinglePhoto(current, settings);

      setPhotos((prev) =>
        prev.map((p) => (p.id === current.id ? { ...p, ...update } : p))
      );

      // Small tick to ensure browser yields to UI paint
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    setIsProcessing(false);
    setIsPaused(false);
  };

  const handlePauseProcessing = () => {
    setIsPaused(true);
  };

  const handleResumeProcessing = () => {
    setIsPaused(false);
  };

  // Download All as ZIP
  const handleDownloadZip = async () => {
    const completed = photos.filter((p) => p.status === 'completed' && p.processedBlob);
    if (completed.length === 0) return;

    try {
      setIsZipping(true);
      const zip = new JSZip();
      const folder = zip.folder('passport_photos') || zip;

      const ext =
        settings.format === 'image/png'
          ? 'png'
          : settings.format === 'image/webp'
          ? 'webp'
          : 'jpg';

      completed.forEach((photo, idx) => {
        const numStr = String(idx + 1).padStart(3, '0');
        const cleanName = photo.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
        const mime = photo.processedBlob?.type || settings.format;
        const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
        const filename = `passport_${numStr}_${cleanName}.${ext}`;
        if (photo.processedBlob) {
          folder.file(filename, photo.processedBlob);
        }
      });

      // Add a helpful readme.txt in the zip
      folder.file(
        'passport_info.txt',
        `Passport Photo Bulk Resizer Export\n` +
          `-----------------------------------\n` +
          `Dimensions: ${settings.width} × ${settings.height} ${settings.unit} (@ ${settings.dpi} DPI)\n` +
          `Target File Size: ${settings.targetKb ? `${settings.targetKb} KB` : 'Original Quality'}\n` +
          `Format: ${settings.format}\n` +
          `Framing Mode: ${settings.cropMode}\n` +
          `Total Photos Processed: ${completed.length}\n` +
          `Generated locally & safely in browser.`
      );

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `passport_photos_${settings.width}x${settings.height}${settings.unit}_${completed.length}_photos.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      console.error('Failed to create ZIP', err);
    } finally {
      setIsZipping(false);
    }
  };

  // Filtered photos list
  const filteredPhotos = photos.filter((p) => {
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    if (searchQuery.trim() && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const completedCount = photos.filter((p) => p.status === 'completed').length;
  const errorCount = photos.filter((p) => p.status === 'error').length;

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-900 flex flex-col font-sans">
      {/* Top Navigation */}
      <Header
        photoCount={photos.length}
        completedCount={completedCount}
        onClearAll={handleClearAll}
        onLoadSamples={handleLoadSamples}
        onOpenPrintSheet={() => setIsPrintSheetOpen(true)}
        onDownloadZip={handleDownloadZip}
        isProcessing={isProcessing}
        isZipping={isZipping}
      />

      {/* Main Dashboard Layout */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 grow flex flex-col gap-6">
        {/* Upload Zone & Bulk Controls (Top Area) */}
        <section className="space-y-4">
          <UploadZone
            onPhotosAdded={handlePhotosAdded}
            onLoadSamples={handleLoadSamples}
            disabled={isProcessing}
          />

          <BatchProgressBar
            total={photos.length}
            completed={completedCount}
            errors={errorCount}
            isProcessing={isProcessing}
            isPaused={isPaused}
            isZipping={isZipping}
            onStartProcessing={handleStartProcessing}
            onPauseProcessing={handlePauseProcessing}
            onResumeProcessing={handleResumeProcessing}
            onDownloadZip={handleDownloadZip}
            onOpenPrintSheet={() => setIsPrintSheetOpen(true)}
          />
        </section>

        {/* Settings Panel & Photos Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Settings Panel (4 cols on lg) */}
          <aside className="lg:col-span-4 lg:sticky lg:top-20 space-y-4">
            <SettingsPanel
              settings={settings}
              onChange={(newSettings) => setSettings(newSettings)}
              onReset={() => setSettings(DEFAULT_SETTINGS)}
              disabled={isProcessing}
            />

            {/* Quick Tips Box */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-2 text-xs text-slate-600">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <Info className="w-4 h-4 text-blue-600" />
                <span>Passport Photo Requirements</span>
              </div>
              <ul className="list-disc pl-4 space-y-1 text-slate-500 text-[11px]">
                <li>Subject should face camera directly with neutral expression.</li>
                <li>Both ears and eyes must be clearly visible without shadows.</li>
                <li>Uniform plain white or off-white background required by most embassies.</li>
                <li>Use 300 DPI for high-definition print submissions.</li>
              </ul>
            </div>
          </aside>

          {/* Right Column: Photos Grid & Comparison (8 cols on lg) */}
          <div className="lg:col-span-8 space-y-4">
            {photos.length > 0 ? (
              <>
                {/* Search & Filter Bar */}
                <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-700">Filter:</span>
                    {(['all', 'completed', 'pending', 'error'] as const).map((status) => (
                      <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`px-2.5 py-1 rounded-lg capitalize font-medium transition cursor-pointer ${
                          filterStatus === status
                            ? 'bg-blue-600 text-white font-semibold shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {status} (
                        {status === 'all'
                          ? photos.length
                          : status === 'completed'
                          ? completedCount
                          : status === 'error'
                          ? errorCount
                          : photos.length - completedCount - errorCount}
                        )
                      </button>
                    ))}
                  </div>

                  <div className="relative w-full sm:w-48">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search photo name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Photos Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredPhotos.map((photo, idx) => (
                    <PhotoCard
                      key={photo.id}
                      photo={photo}
                      index={idx}
                      settings={settings}
                      onRemove={handleRemovePhoto}
                      onAdjustCrop={(p) => setActiveCropPhoto(p)}
                      onProcessSingle={handleProcessSingle}
                      isProcessing={isProcessing}
                    />
                  ))}
                </div>

                {filteredPhotos.length === 0 && (
                  <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8 space-y-2">
                    <p className="text-sm font-semibold text-slate-700">No photos match your filter</p>
                    <p className="text-xs text-slate-500">
                      Try selecting "All" or clearing the search box.
                    </p>
                  </div>
                )}
              </>
            ) : (
              /* Empty State */
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center flex flex-col items-center justify-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                  <SlidersHorizontal className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">
                    No Photos Uploaded Yet
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mt-0.5">
                    Upload your portrait photos above or click below to load sample portraits for testing.
                  </p>
                </div>
                <button
                  onClick={handleLoadSamples}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs transition cursor-pointer border border-blue-200"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Load 4 Sample Portraits</span>
                </button>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Interactive Crop Adjuster Modal */}
      {activeCropPhoto && (
        <CropAdjusterModal
          photo={activeCropPhoto}
          settings={settings}
          isOpen={!!activeCropPhoto}
          onClose={() => setActiveCropPhoto(null)}
          onApplyCrop={handleApplyCrop}
        />
      )}

      {/* Print Sheet Modal */}
      {isPrintSheetOpen && (
        <PrintSheetModal
          photos={photos}
          processingSettings={settings}
          isOpen={isPrintSheetOpen}
          onClose={() => setIsPrintSheetOpen(false)}
        />
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-xs text-slate-500 text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>All image resizing & compression happens client-side in your browser for 100% privacy.</span>
          </div>
          <div>Passport Photo Bulk Resizer • High-Speed Batch Engine</div>
        </div>
      </footer>
    </div>
  );
}
