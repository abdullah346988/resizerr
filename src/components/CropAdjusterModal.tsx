import React, { useState, useEffect, useRef } from 'react';
import { PhotoItem, ProcessingSettings, IndividualCrop } from '../types';
import { calculateTargetPixels, renderToCanvas, loadPhotoSourceImage } from '../utils/imageProcessor';
import { X, ZoomIn, Move, RotateCw, Check, RotateCcw } from 'lucide-react';

interface CropAdjusterModalProps {
  photo: PhotoItem;
  settings: ProcessingSettings;
  isOpen: boolean;
  onClose: () => void;
  onApplyCrop: (photoId: string, crop: IndividualCrop) => void;
}

export const CropAdjusterModal: React.FC<CropAdjusterModalProps> = ({
  photo,
  settings,
  isOpen,
  onClose,
  onApplyCrop
}) => {
  const [zoom, setZoom] = useState<number>(photo.customCrop?.zoom ?? 1);
  const [offsetX, setOffsetX] = useState<number>(photo.customCrop?.offsetX ?? 0);
  const [offsetY, setOffsetY] = useState<number>(photo.customCrop?.offsetY ?? 0);
  const [rotation, setRotation] = useState<number>(photo.customCrop?.rotation ?? 0);
  const [showGuides, setShowGuides] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { widthPx, heightPx } = calculateTargetPixels(settings);

  // Render preview on canvas when parameters change
  useEffect(() => {
    if (!isOpen) return;
    let isCancelled = false;

    loadPhotoSourceImage(photo, settings).then(({ img, isSvg }) => {
      if (isCancelled || !canvasRef.current) return;
      const previewCanvas = canvasRef.current;
      previewCanvas.width = widthPx;
      previewCanvas.height = heightPx;

      const rendered = renderToCanvas(
        img,
        widthPx,
        heightPx,
        settings,
        { zoom, offsetX, offsetY, rotation },
        isSvg
      );

      const ctx = previewCanvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, widthPx, heightPx);
        ctx.drawImage(rendered, 0, 0);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [isOpen, photo, settings, zoom, offsetX, offsetY, rotation, widthPx, heightPx]);

  if (!isOpen) return null;

  const handleApply = () => {
    onApplyCrop(photo.id, { zoom, offsetX, offsetY, rotation });
    onClose();
  };

  const handleReset = () => {
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
    setRotation(0);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Adjust Framing & Biometric Alignment
            </h3>
            <p className="text-xs text-slate-500 truncate max-w-xs">{photo.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex flex-col md:flex-row items-center gap-6">
          {/* Canvas Preview with Guides */}
          <div className="relative shrink-0 flex items-center justify-center bg-slate-100 p-2 rounded-xl border border-slate-300">
            <canvas
              ref={canvasRef}
              className="max-h-[260px] w-auto rounded shadow-sm object-contain bg-white"
            />

            {/* Passport Biometric Overlay Lines */}
            {showGuides && (
              <div className="absolute inset-2 pointer-events-none flex flex-col justify-between border border-blue-400/50">
                {/* Crown level */}
                <div
                  className="absolute w-full border-t border-dashed border-red-500/70"
                  style={{ top: '15%' }}
                >
                  <span className="text-[9px] bg-red-500 text-white px-1 py-0.2 rounded-xs absolute right-1 -top-3">
                    Crown Top
                  </span>
                </div>
                {/* Eye level */}
                <div
                  className="absolute w-full border-t border-dashed border-blue-500/80"
                  style={{ top: '42%' }}
                >
                  <span className="text-[9px] bg-blue-500 text-white px-1 py-0.2 rounded-xs absolute right-1 -top-3">
                    Eye Line
                  </span>
                </div>
                {/* Chin level */}
                <div
                  className="absolute w-full border-t border-dashed border-amber-600/70"
                  style={{ top: '78%' }}
                >
                  <span className="text-[9px] bg-amber-600 text-white px-1 py-0.2 rounded-xs absolute right-1 -top-3">
                    Chin
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="w-full space-y-4 text-xs">
            {/* Zoom Slider */}
            <div>
              <div className="flex justify-between font-medium text-slate-700 mb-1">
                <span className="flex items-center gap-1">
                  <ZoomIn className="w-3.5 h-3.5 text-blue-600" />
                  Zoom
                </span>
                <span>{zoom.toFixed(2)}×</span>
              </div>
              <input
                type="range"
                min="0.8"
                max="2.5"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>

            {/* Vertical Pan */}
            <div>
              <div className="flex justify-between font-medium text-slate-700 mb-1">
                <span className="flex items-center gap-1">
                  <Move className="w-3.5 h-3.5 text-blue-600" />
                  Vertical Position (Up/Down)
                </span>
                <span>{(offsetY * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="-0.5"
                max="0.5"
                step="0.02"
                value={offsetY}
                onChange={(e) => setOffsetY(parseFloat(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>

            {/* Horizontal Pan */}
            <div>
              <div className="flex justify-between font-medium text-slate-700 mb-1">
                <span className="flex items-center gap-1">
                  <Move className="w-3.5 h-3.5 text-blue-600" />
                  Horizontal Position (Left/Right)
                </span>
                <span>{(offsetX * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="-0.5"
                max="0.5"
                step="0.02"
                value={offsetX}
                onChange={(e) => setOffsetX(parseFloat(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>

            {/* Rotation & Guide Toggles */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleRotate}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Rotate 90° ({rotation}°)</span>
              </button>

              <button
                type="button"
                onClick={() => setShowGuides(!showGuides)}
                className={`px-2.5 py-1.5 rounded-lg border font-medium cursor-pointer transition ${
                  showGuides
                    ? 'border-blue-500 bg-blue-50 text-blue-800'
                    : 'border-slate-300 bg-white text-slate-600'
                }`}
              >
                {showGuides ? 'Guides: ON' : 'Guides: OFF'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Position</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="inline-flex items-center gap-1 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply & Reprocess</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
