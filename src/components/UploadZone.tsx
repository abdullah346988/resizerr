import React, { useRef, useState } from 'react';
import { UploadCloud, Image as ImageIcon, Sparkles, AlertCircle } from 'lucide-react';
import { PhotoItem } from '../types';

interface UploadZoneProps {
  onPhotosAdded: (newPhotos: PhotoItem[]) => void;
  onLoadSamples: () => void;
  disabled?: boolean;
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  onPhotosAdded,
  onLoadSamples,
  disabled = false
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];

  const processFiles = async (files: FileList | File[]) => {
    setErrorMessage(null);
    setIsReading(true);

    const validFiles: File[] = [];
    let invalidCount = 0;

    Array.from(files).forEach((file) => {
      if (
        supportedTypes.includes(file.type.toLowerCase()) ||
        /\.(jpe?g|png|webp|svg)$/i.test(file.name)
      ) {
        validFiles.push(file);
      } else {
        invalidCount++;
      }
    });

    if (invalidCount > 0) {
      setErrorMessage(
        `${invalidCount} file(s) were skipped because they are not supported image formats (JPG, PNG, WEBP, SVG only).`
      );
    }

    if (validFiles.length === 0) {
      setIsReading(false);
      return;
    }

    // Read image dimensions and create PhotoItem objects
    const newItems: PhotoItem[] = [];

    await Promise.all(
      validFiles.map((file, idx) => {
        return new Promise<void>((resolve) => {
          const url = URL.createObjectURL(file);
          const img = new Image();
          img.onload = () => {
            newItems.push({
              id: `${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
              file,
              name: file.name,
              originalSize: file.size,
              originalWidth: img.naturalWidth || img.width,
              originalHeight: img.naturalHeight || img.height,
              originalUrl: url,
              status: 'pending'
            });
            resolve();
          };
          img.onerror = () => {
            // Corrupted image fallback
            newItems.push({
              id: `${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
              file,
              name: file.name,
              originalSize: file.size,
              originalWidth: 0,
              originalHeight: 0,
              originalUrl: url,
              status: 'error',
              errorMessage: 'Corrupted or unreadable image file'
            });
            resolve();
          };
          img.src = url;
        });
      })
    );

    setIsReading(false);
    onPhotosAdded(newItems);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    // reset input so the same files can be re-uploaded if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full space-y-2">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && !isReading && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition cursor-pointer select-none ${
          isDragging
            ? 'border-blue-500 bg-blue-50/70 scale-[0.995]'
            : 'border-slate-300 bg-white hover:border-blue-400 hover:bg-slate-50/50'
        } ${disabled || isReading ? 'opacity-60 pointer-events-none' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/svg+xml,.svg"
          onChange={handleFileInputChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center transition ${
              isDragging ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'
            }`}
          >
            <UploadCloud className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-semibold text-slate-800">
              {isReading
                ? 'Analyzing photos...'
                : isDragging
                ? 'Drop photos right here'
                : 'Click or drag and drop photos here'}
            </h3>
            <p className="text-xs text-slate-500">
              Supports bulk upload of <span className="font-semibold text-slate-700">100+ images</span> at once • JPG, JPEG, PNG, WEBP
            </p>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold shadow-xs transition">
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Browse Photos</span>
            </span>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLoadSamples();
              }}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Load 4 Sample Portraits</span>
            </button>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
