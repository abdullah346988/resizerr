import React from 'react';
import { Camera, ShieldCheck, Download, Printer, Trash2, Sparkles, FolderArchive } from 'lucide-react';

interface HeaderProps {
  photoCount: number;
  completedCount: number;
  onClearAll: () => void;
  onLoadSamples: () => void;
  onOpenPrintSheet: () => void;
  onDownloadZip: () => void;
  isProcessing: boolean;
  isZipping: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  photoCount,
  completedCount,
  onClearAll,
  onLoadSamples,
  onOpenPrintSheet,
  onDownloadZip,
  isProcessing,
  isZipping
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      {/* Top Banner: Privacy Assurance */}
      <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-1.5 text-xs text-emerald-800 flex items-center justify-center gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
        <span className="font-medium">100% Client-Side Privacy:</span>
        <span className="text-emerald-700 hidden sm:inline">
          Your photos are processed entirely within your browser. No files are ever sent to an external server.
        </span>
        <span className="text-emerald-700 sm:hidden">
          Processed locally in your browser. Safe & private.
        </span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Passport Photo Bulk Resizer
              </h1>
              <span className="text-[11px] font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                Pro
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              Compliant passport sizing, target KB compression & printable photo sheets
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          {photoCount === 0 && (
            <button
              onClick={onLoadSamples}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-xs font-medium transition cursor-pointer shadow-xs"
              title="Load 4 sample portraits to test the tool immediately"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Try Sample Photos</span>
            </button>
          )}

          {completedCount > 0 && (
            <>
              <button
                onClick={onOpenPrintSheet}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold transition cursor-pointer shadow-xs"
                title="Create 4x6 inch or A4 printable passport sheets with cut marks"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Create Print Sheet</span>
              </button>

              <button
                onClick={onDownloadZip}
                disabled={isZipping || isProcessing}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 text-xs font-semibold transition cursor-pointer shadow-sm disabled:opacity-50"
              >
                <FolderArchive className="w-3.5 h-3.5" />
                <span>{isZipping ? 'Creating ZIP...' : `Download ZIP (${completedCount})`}</span>
              </button>
            </>
          )}

          {photoCount > 0 && (
            <button
              onClick={onClearAll}
              disabled={isProcessing}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-medium transition cursor-pointer disabled:opacity-50"
              title="Remove all uploaded photos"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear All</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
