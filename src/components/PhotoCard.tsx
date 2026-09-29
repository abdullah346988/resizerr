import React, { useState } from 'react';
import { PhotoItem, ProcessingSettings } from '../types';
import { formatFileSize } from '../utils/presets';
import {
  Download,
  Trash2,
  Crop,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Maximize,
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface PhotoCardProps {
  photo: PhotoItem;
  index: number;
  settings: ProcessingSettings;
  onRemove: (id: string) => void;
  onAdjustCrop: (photo: PhotoItem) => void;
  onProcessSingle: (photo: PhotoItem) => void;
  isProcessing: boolean;
}

export const PhotoCard: React.FC<PhotoCardProps> = ({
  photo,
  index,
  settings,
  onRemove,
  onAdjustCrop,
  onProcessSingle,
  isProcessing
}) => {
  const [activeTab, setActiveTab] = useState<'comparison' | 'result' | 'original'>('comparison');

  const handleDownload = () => {
    if (!photo.processedBlob && !photo.processedUrl) return;

    const url = photo.processedUrl || URL.createObjectURL(photo.processedBlob!);
    const a = document.createElement('a');
    a.href = url;
    const ext =
      settings.format === 'image/png'
        ? 'png'
        : settings.format === 'image/webp'
        ? 'webp'
        : 'jpg';
    const cleanName = photo.name.replace(/\.[^/.]+$/, '');
    a.download = `passport_${String(index + 1).padStart(3, '0')}_${cleanName}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const isCompleted = photo.status === 'completed';
  const isItemProcessing = photo.status === 'processing';
  const isError = photo.status === 'error';

  // KB target delta
  let targetDeltaText: string | null = null;
  let targetDeltaColor: string = 'text-slate-500';

  if (isCompleted && photo.processedSize && settings.targetKb) {
    const actualKb = photo.processedSize / 1024;
    const diff = actualKb - settings.targetKb;
    if (Math.abs(diff) < 1.5) {
      targetDeltaText = `🎯 Spot on (~${settings.targetKb} KB)`;
      targetDeltaColor = 'text-emerald-600 font-semibold';
    } else if (diff < 0) {
      targetDeltaText = `✓ ${Math.abs(diff).toFixed(1)} KB under limit`;
      targetDeltaColor = 'text-emerald-700 font-medium';
    } else {
      targetDeltaText = `+${diff.toFixed(1)} KB (minimum quality reached)`;
      targetDeltaColor = 'text-amber-600 font-medium';
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col hover:border-slate-300 transition group">
      {/* Top Bar */}
      <div className="px-3.5 py-2.5 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 truncate pr-2">
          <span className="font-mono text-[11px] font-semibold text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded-md">
            #{String(index + 1).padStart(3, '0')}
          </span>
          <span className="font-medium text-slate-800 truncate" title={photo.name}>
            {photo.name}
          </span>
        </div>

        {/* Status Badge */}
        <div className="shrink-0 flex items-center gap-1.5">
          {isCompleted && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Done
            </span>
          )}
          {isItemProcessing && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
              Processing
            </span>
          )}
          {isError && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
              <AlertCircle className="w-3 h-3 text-rose-600" />
              Error
            </span>
          )}
          {photo.status === 'pending' && (
            <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              Pending
            </span>
          )}

          <button
            onClick={() => onRemove(photo.id)}
            disabled={isProcessing}
            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
            title="Remove this photo"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Image Preview Area */}
      <div className="p-3.5 bg-slate-50/40 grow flex flex-col justify-center">
        {isCompleted && photo.processedUrl ? (
          <div className="grid grid-cols-2 gap-2">
            {/* Original thumbnail */}
            <div className="space-y-1">
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex justify-between">
                <span>Original</span>
                <span>{formatFileSize(photo.originalSize)}</span>
              </div>
              <div className="relative aspect-3/4 rounded-xl overflow-hidden bg-slate-200 border border-slate-200 flex items-center justify-center">
                <img
                  src={photo.originalUrl}
                  alt="Original"
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-1 left-1 text-[9px] bg-slate-900/70 text-white px-1.5 py-0.5 rounded-sm">
                  {photo.originalWidth} × {photo.originalHeight}
                </span>
              </div>
            </div>

            {/* Passport Processed Result */}
            <div className="space-y-1">
              <div className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider flex justify-between">
                <span>Passport</span>
                <span>{photo.processedSize ? formatFileSize(photo.processedSize) : ''}</span>
              </div>
              <div className="relative aspect-3/4 rounded-xl overflow-hidden bg-white border-2 border-blue-400 shadow-xs flex items-center justify-center">
                <img
                  src={photo.processedUrl}
                  alt="Passport Sized"
                  className="w-full h-full object-contain"
                />
                <span className="absolute bottom-1 right-1 text-[9px] bg-blue-700/80 text-white font-mono px-1.5 py-0.5 rounded-sm">
                  {photo.processedWidth} × {photo.processedHeight}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Pending / Single View */
          <div className="space-y-1">
            <div className="relative aspect-4/3 rounded-xl overflow-hidden bg-slate-200 border border-slate-200 flex items-center justify-center">
              <img
                src={photo.originalUrl}
                alt={photo.name}
                className="w-full h-full object-contain"
              />
              <span className="absolute bottom-1.5 left-1.5 text-[10px] bg-slate-900/80 text-white px-2 py-0.5 rounded-md">
                Original: {photo.originalWidth} × {photo.originalHeight} px • {formatFileSize(photo.originalSize)}
              </span>
            </div>
          </div>
        )}

        {/* Processing Details Footer */}
        {isCompleted && (
          <div className="mt-3 p-2 rounded-xl bg-slate-100/80 text-[11px] text-slate-600 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Output Size:</span>
              <span className="font-bold text-slate-800">
                {photo.processedSize ? formatFileSize(photo.processedSize) : '—'}
              </span>
            </div>

            {targetDeltaText && (
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-slate-500">Target Match:</span>
                <span className={targetDeltaColor}>{targetDeltaText}</span>
              </div>
            )}

            <div className="flex justify-between items-center text-[10px]">
              <span className="text-slate-500">Quality / Time:</span>
              <span>
                {photo.appliedQuality ? `${Math.round(photo.appliedQuality * 100)}% quality` : ''} •{' '}
                {photo.processTimeMs}ms
              </span>
            </div>
          </div>
        )}

        {isError && (
          <div className="mt-2 p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {photo.errorMessage || 'Failed to resize image.'}
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="px-3.5 py-2.5 bg-white border-t border-slate-100 flex items-center justify-between gap-2">
        <button
          onClick={() => onAdjustCrop(photo)}
          className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 font-medium px-2 py-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          title="Adjust zoom, crop framing and alignment"
        >
          <Crop className="w-3.5 h-3.5 text-blue-600" />
          <span>Adjust Framing</span>
        </button>

        {isCompleted ? (
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
            title="Download individual passport photo"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>
        ) : (
          <button
            onClick={() => onProcessSingle(photo)}
            disabled={isItemProcessing}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-blue-300 text-blue-700 hover:bg-blue-50 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
          >
            <span>Process</span>
          </button>
        )}
      </div>
    </div>
  );
};
