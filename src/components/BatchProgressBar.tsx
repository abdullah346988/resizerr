import React from 'react';
import { Play, Pause, FolderArchive, CheckCircle2, AlertTriangle, RefreshCw, Printer } from 'lucide-react';

interface BatchProgressBarProps {
  total: number;
  completed: number;
  errors: number;
  isProcessing: boolean;
  isPaused: boolean;
  isZipping: boolean;
  onStartProcessing: () => void;
  onPauseProcessing: () => void;
  onResumeProcessing: () => void;
  onDownloadZip: () => void;
  onOpenPrintSheet: () => void;
}

export const BatchProgressBar: React.FC<BatchProgressBarProps> = ({
  total,
  completed,
  errors,
  isProcessing,
  isPaused,
  isZipping,
  onStartProcessing,
  onPauseProcessing,
  onResumeProcessing,
  onDownloadZip,
  onOpenPrintSheet
}) => {
  if (total === 0) return null;

  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const isFinished = completed + errors >= total && total > 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-3.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-800">
              {isProcessing
                ? 'Processing Photos in Bulk...'
                : isFinished
                ? 'Processing Complete!'
                : 'Bulk Processing Ready'}
            </h3>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                isFinished
                  ? 'bg-emerald-100 text-emerald-800'
                  : isProcessing
                  ? 'bg-blue-100 text-blue-800 animate-pulse'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {completed} / {total} Processed ({percent}%)
            </span>
          </div>

          <p className="text-xs text-slate-500 mt-0.5">
            Non-blocking client-side queue • Resizing & compression running at maximum efficiency
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2.5">
          {!isProcessing ? (
            <button
              onClick={onStartProcessing}
              disabled={isZipping}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs transition cursor-pointer shadow-sm disabled:opacity-50"
            >
              {isFinished ? (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>Reprocess All Photos</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Process All ({total})</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={isPaused ? onResumeProcessing : onPauseProcessing}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition cursor-pointer"
            >
              {isPaused ? (
                <>
                  <Play className="w-4 h-4 fill-slate-700" />
                  <span>Resume</span>
                </>
              ) : (
                <>
                  <Pause className="w-4 h-4 fill-slate-700" />
                  <span>Pause</span>
                </>
              )}
            </button>
          )}

          {completed > 0 && (
            <>
              <button
                onClick={onDownloadZip}
                disabled={isZipping || isProcessing}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-black text-white font-semibold text-xs transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                <FolderArchive className="w-4 h-4" />
                <span>{isZipping ? 'Generating ZIP...' : `Download All as ZIP (${completed})`}</span>
              </button>

              <button
                onClick={onOpenPrintSheet}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Sheet</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              isFinished ? 'bg-emerald-500' : 'bg-blue-600'
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              {completed} Completed
            </span>
            {errors > 0 && (
              <span className="flex items-center gap-1 text-rose-600">
                <AlertTriangle className="w-3.5 h-3.5" />
                {errors} Failed
              </span>
            )}
            <span>{total - (completed + errors)} Remaining</span>
          </div>

          <div>{percent}% Done</div>
        </div>
      </div>
    </div>
  );
};
