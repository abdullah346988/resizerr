import React, { useState } from 'react';
import {
  ProcessingSettings,
  Unit,
  CropMode,
  ImageFormat
} from '../types';
import {
  PASSPORT_PRESETS,
  TARGET_KB_OPTIONS,
  convertDimensions
} from '../utils/presets';
import { calculateTargetPixels } from '../utils/imageProcessor';
import {
  Settings2,
  Sliders,
  Maximize2,
  FileImage,
  Palette,
  Info,
  ChevronDown,
  ChevronUp,
  RotateCcw
} from 'lucide-react';

interface SettingsPanelProps {
  settings: ProcessingSettings;
  onChange: (newSettings: ProcessingSettings) => void;
  onReset: () => void;
  disabled?: boolean;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onChange,
  onReset,
  disabled = false
}) => {
  const [isCustomPreset, setIsCustomPreset] = useState(settings.presetId === 'custom');
  const [customKbInput, setCustomKbInput] = useState<string>(
    settings.targetKb && !TARGET_KB_OPTIONS.some((o) => o.value === settings.targetKb)
      ? String(settings.targetKb)
      : '35'
  );
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const { widthPx, heightPx } = calculateTargetPixels(settings);

  // Handle preset change
  const handlePresetSelect = (presetId: string) => {
    if (presetId === 'custom') {
      setIsCustomPreset(true);
      onChange({ ...settings, presetId: 'custom' });
      return;
    }

    const preset = PASSPORT_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    setIsCustomPreset(false);

    let w = preset.widthMm;
    let h = preset.heightMm;

    if (settings.unit === 'inch') {
      w = preset.widthInch;
      h = preset.heightInch;
    } else if (settings.unit === 'px') {
      w = Math.round((preset.widthMm / 25.4) * preset.standardDpi);
      h = Math.round((preset.heightMm / 25.4) * preset.standardDpi);
    }

    onChange({
      ...settings,
      presetId,
      width: w,
      height: h,
      dpi: preset.standardDpi
    });
  };

  // Handle unit switch
  const handleUnitChange = (newUnit: Unit) => {
    if (newUnit === settings.unit) return;

    const converted = convertDimensions(
      settings.width,
      settings.height,
      settings.unit,
      newUnit,
      settings.dpi
    );

    onChange({
      ...settings,
      unit: newUnit,
      width: converted.width,
      height: converted.height
    });
  };

  // Handle Target KB quick buttons
  const handleTargetKbSelect = (val: number | null) => {
    if (val === -1) {
      const parsed = parseInt(customKbInput, 10);
      onChange({ ...settings, targetKb: isNaN(parsed) ? 35 : parsed });
    } else {
      onChange({ ...settings, targetKb: val });
    }
  };

  const handleCustomKbChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const str = e.target.value;
    setCustomKbInput(str);
    const parsed = parseInt(str, 10);
    if (!isNaN(parsed) && parsed > 0) {
      onChange({ ...settings, targetKb: parsed });
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
      {/* Panel Header */}
      <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-semibold text-slate-800">Passport Photo Specifications</h2>
        </div>
        <button
          onClick={onReset}
          disabled={disabled}
          className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 hover:underline cursor-pointer disabled:opacity-50"
          title="Reset to default 35 × 45 mm @ 300 DPI"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      <div className="p-5 space-y-6 text-sm">
        {/* SECTION 1: PRESET SELECTION */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Standard Passport Presets
          </label>
          <select
            value={isCustomPreset ? 'custom' : settings.presetId}
            onChange={(e) => handlePresetSelect(e.target.value)}
            disabled={disabled}
            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition cursor-pointer"
          >
            {PASSPORT_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
            <option value="custom">⚙️ Custom Dimensions...</option>
          </select>

          {/* Description for selected preset */}
          {!isCustomPreset && (
            <p className="mt-1.5 text-xs text-slate-500">
              {PASSPORT_PRESETS.find((p) => p.id === settings.presetId)?.description}
            </p>
          )}
        </div>

        {/* SECTION 2: DIMENSIONS & DPI */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">Dimensions & Unit</span>
            {/* Unit Toggle */}
            <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-white text-xs">
              {(['mm', 'inch', 'px'] as Unit[]).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => handleUnitChange(u)}
                  disabled={disabled}
                  className={`px-2.5 py-0.5 rounded-md font-medium capitalize transition cursor-pointer ${
                    settings.unit === u
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                Width ({settings.unit})
              </label>
              <input
                type="number"
                step={settings.unit === 'px' ? '1' : '0.1'}
                min="1"
                value={settings.width}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val > 0) {
                    setIsCustomPreset(true);
                    onChange({ ...settings, width: val, presetId: 'custom' });
                  }
                }}
                disabled={disabled}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                Height ({settings.unit})
              </label>
              <input
                type="number"
                step={settings.unit === 'px' ? '1' : '0.1'}
                min="1"
                value={settings.height}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val > 0) {
                    setIsCustomPreset(true);
                    onChange({ ...settings, height: val, presetId: 'custom' });
                  }
                }}
                disabled={disabled}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                Print DPI
              </label>
              <select
                value={settings.dpi}
                onChange={(e) => {
                  const dpi = parseInt(e.target.value, 10);
                  onChange({ ...settings, dpi });
                }}
                disabled={disabled}
                className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="300">300 (Standard)</option>
                <option value="600">600 (Ultra-Fine)</option>
                <option value="200">200 DPI</option>
                <option value="150">150 DPI</option>
              </select>
            </div>
          </div>

          {/* Dynamic calculated pixel box */}
          <div className="flex items-center justify-between text-xs bg-blue-50/70 border border-blue-100 rounded-lg px-3 py-2 text-blue-900">
            <span className="font-medium">Output Resolution:</span>
            <span className="font-bold font-mono">
              {widthPx} × {heightPx} px
            </span>
          </div>
        </div>

        {/* SECTION 3: TARGET FILE SIZE (KB) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <span>Target File Size</span>
              <span className="text-[10px] lowercase font-normal bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-sm">
                auto-compress
              </span>
            </label>
            {settings.targetKb ? (
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                Target: {settings.targetKb} KB
              </span>
            ) : (
              <span className="text-xs text-slate-500 font-medium">Original Quality</span>
            )}
          </div>

          {/* Quick Target KB chips */}
          <div className="grid grid-cols-4 gap-1.5 mb-2.5">
            {[
              { label: 'Off', val: null },
              { label: '20 KB', val: 20 },
              { label: '30 KB', val: 30 },
              { label: '40 KB', val: 40 },
              { label: '50 KB', val: 50 },
              { label: '100 KB', val: 100 },
              { label: '200 KB', val: 200 },
              { label: 'Custom', val: -1 }
            ].map((opt) => {
              const isSelected =
                opt.val === -1
                  ? settings.targetKb !== null &&
                    !TARGET_KB_OPTIONS.some((o) => o.value === settings.targetKb && o.value !== -1)
                  : settings.targetKb === opt.val;

              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => handleTargetKbSelect(opt.val)}
                  disabled={disabled}
                  className={`py-1.5 px-1 rounded-lg text-xs font-medium border text-center transition cursor-pointer ${
                    isSelected
                      ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Custom KB Input if selected */}
          {settings.targetKb !== null && (
            <div className="flex items-center gap-2 mt-2">
              <input
                type="number"
                min="5"
                max="5000"
                value={customKbInput}
                onChange={handleCustomKbChange}
                disabled={disabled}
                placeholder="Target KB"
                className="w-28 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-xs text-slate-500 font-medium">KB max limit</span>
            </div>
          )}

          <p className="mt-1.5 text-[11px] text-slate-500 flex items-start gap-1">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span>
              Intelligently optimizes compression quality to hit within ~3% of your exact KB limit for official application portals.
            </span>
          </p>
        </div>

        {/* SECTION 4: CROPPING & FRAMING MODE */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Face Framing & Fit Mode
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              {
                mode: 'smart-portrait' as CropMode,
                title: 'Smart Upper-Center',
                desc: 'Preserves head/hair room & centers face'
              },
              {
                mode: 'center-crop' as CropMode,
                title: 'Exact Center Crop',
                desc: 'Geometric center crop to fill'
              },
              {
                mode: 'fit-background' as CropMode,
                title: 'Fit with Background',
                desc: 'No crop, letterbox with chosen color'
              },
              {
                mode: 'stretch' as CropMode,
                title: 'Stretch (Distort)',
                desc: 'Force stretches to exact aspect'
              }
            ].map((f) => (
              <button
                key={f.mode}
                type="button"
                onClick={() => onChange({ ...settings, cropMode: f.mode })}
                disabled={disabled}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  settings.cropMode === f.mode
                    ? 'border-blue-600 bg-blue-50/50 text-blue-950 ring-1 ring-blue-600'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="font-semibold text-xs">{f.title}</div>
                <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">{f.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* SECTION 5: BACKGROUND COLOR */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Background Color
          </label>
          <div className="flex items-center flex-wrap gap-2">
            {[
              { label: 'White', color: '#ffffff', border: true },
              { label: 'Light Blue', color: '#e8f2fe', border: false },
              { label: 'Light Grey', color: '#f3f4f6', border: false },
              { label: 'Original / None', color: 'transparent', border: true }
            ].map((b) => (
              <button
                key={b.label}
                type="button"
                onClick={() => onChange({ ...settings, backgroundColor: b.color })}
                disabled={disabled}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition cursor-pointer ${
                  settings.backgroundColor === b.color
                    ? 'border-blue-600 bg-blue-50 text-blue-900 ring-1 ring-blue-600'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span
                  className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0"
                  style={{ backgroundColor: b.color === 'transparent' ? '#ffffff' : b.color }}
                />
                <span>{b.label}</span>
              </button>
            ))}

            {/* Custom color picker */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-slate-200 bg-white">
              <input
                type="color"
                value={settings.backgroundColor === 'transparent' ? '#ffffff' : settings.backgroundColor}
                onChange={(e) => onChange({ ...settings, backgroundColor: e.target.value })}
                disabled={disabled}
                className="w-5 h-5 rounded cursor-pointer border-0 p-0"
                title="Choose custom background color"
              />
              <span className="text-xs text-slate-600">Custom</span>
            </div>
          </div>
        </div>

        {/* SECTION 6: ADVANCED / OUTPUT FORMAT */}
        <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            className="w-full flex items-center justify-between text-xs font-semibold text-slate-600 hover:text-slate-900 py-1 cursor-pointer"
          >
            <span>Output Format & JPEG Quality</span>
            {isAdvancedOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {isAdvancedOpen && (
            <div className="mt-3 space-y-3.5 bg-slate-50 p-3 rounded-xl border border-slate-200/70">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Image Format
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { fmt: 'image/jpeg' as ImageFormat, label: 'JPG / JPEG (Standard)' },
                    { fmt: 'image/webp' as ImageFormat, label: 'WEBP' },
                    { fmt: 'image/png' as ImageFormat, label: 'PNG' }
                  ].map((f) => (
                    <button
                      key={f.fmt}
                      type="button"
                      onClick={() => onChange({ ...settings, format: f.fmt })}
                      className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition cursor-pointer ${
                        settings.format === f.fmt
                          ? 'border-blue-600 bg-white text-blue-900 shadow-xs'
                          : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-white'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {settings.targetKb === null && settings.format !== 'image/png' && (
                <div>
                  <div className="flex justify-between text-[11px] font-medium text-slate-600 mb-1">
                    <span>JPEG Quality</span>
                    <span>{Math.round(settings.jpegQuality * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.02"
                    value={settings.jpegQuality}
                    onChange={(e) => onChange({ ...settings, jpegQuality: parseFloat(e.target.value) })}
                    className="w-full accent-blue-600"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
