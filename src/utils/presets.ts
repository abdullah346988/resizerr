import { PassportPreset, PaperSizePreset, Unit } from '../types';

export const PASSPORT_PRESETS: PassportPreset[] = [
  {
    id: 'uk-eu-35x45',
    name: '35 × 45 mm (UK, Schengen, EU, India, AU)',
    country: 'UK, EU, Schengen, India, Australia, Singapore, NZ',
    widthMm: 35,
    heightMm: 45,
    widthInch: +(35 / 25.4).toFixed(3),
    heightInch: +(45 / 25.4).toFixed(3),
    standardDpi: 300,
    description: 'Universal standard for UK, Europe, Australia, India passport & Schengen Visa.'
  },
  {
    id: 'us-2x2',
    name: '2 × 2 inch (US Passport & Visa, India OCI)',
    country: 'United States, India OCI, Philippines, Colombia',
    widthMm: 50.8,
    heightMm: 50.8,
    widthInch: 2.0,
    heightInch: 2.0,
    standardDpi: 300,
    description: 'Mandatory standard for US Passports, Green Cards, Visas (600 × 600 px @ 300 DPI).'
  },
  {
    id: 'canada-50x70',
    name: '50 × 70 mm (Canada Passport)',
    country: 'Canada',
    widthMm: 50,
    heightMm: 70,
    widthInch: +(50 / 25.4).toFixed(3),
    heightInch: +(70 / 25.4).toFixed(3),
    standardDpi: 300,
    description: 'Standard Canadian Passport photograph specification.'
  },
  {
    id: 'china-33x48',
    name: '33 × 48 mm (China Passport & Visa)',
    country: 'China',
    widthMm: 33,
    heightMm: 48,
    widthInch: +(33 / 25.4).toFixed(3),
    heightInch: +(48 / 25.4).toFixed(3),
    standardDpi: 300,
    description: 'Standard Chinese Passport and Visa photo requirement.'
  },
  {
    id: 'japan-30x40',
    name: '30 × 40 mm (Japan, Korea, Russia ID)',
    country: 'Japan, South Korea, Russia',
    widthMm: 30,
    heightMm: 40,
    widthInch: +(30 / 25.4).toFixed(3),
    heightInch: +(40 / 25.4).toFixed(3),
    standardDpi: 300,
    description: 'Common size for Asian ID documents and driver licenses.'
  },
  {
    id: 'sq-35x35',
    name: '35 × 35 mm (Square ID / India Visa)',
    country: 'India (Visa alternative), Various IDs',
    widthMm: 35,
    heightMm: 35,
    widthInch: +(35 / 25.4).toFixed(3),
    heightInch: +(35 / 25.4).toFixed(3),
    standardDpi: 300,
    description: 'Square format used for various specialized visas and badges.'
  },
  {
    id: 'stamp-25x30',
    name: '25 × 30 mm (Stamp / Mini Photo)',
    country: 'International',
    widthMm: 25,
    heightMm: 30,
    widthInch: +(25 / 25.4).toFixed(3),
    heightInch: +(30 / 25.4).toFixed(3),
    standardDpi: 300,
    description: 'Compact stamp size for certificates, cards, and resumes.'
  }
];

export const PAPER_PRESETS: PaperSizePreset[] = [
  {
    id: '4x6',
    name: '4 × 6 inch (102 × 152 mm) - Standard Photo Paper',
    widthMm: 101.6,
    heightMm: 152.4,
    widthInch: 4,
    heightInch: 6
  },
  {
    id: 'a4',
    name: 'A4 (210 × 297 mm)',
    widthMm: 210,
    heightMm: 297,
    widthInch: 8.27,
    heightInch: 11.69
  },
  {
    id: 'a5',
    name: 'A5 (148 × 210 mm)',
    widthMm: 148,
    heightMm: 210,
    widthInch: 5.83,
    heightInch: 8.27
  },
  {
    id: 'letter',
    name: 'US Letter (8.5 × 11 inch)',
    widthMm: 215.9,
    heightMm: 279.4,
    widthInch: 8.5,
    heightInch: 11.0
  },
  {
    id: '5x7',
    name: '5 × 7 inch (127 × 178 mm)',
    widthMm: 127,
    heightMm: 177.8,
    widthInch: 5,
    heightInch: 7
  }
];

export const TARGET_KB_OPTIONS = [
  { label: 'Original Quality', value: null },
  { label: '20 KB', value: 20 },
  { label: '30 KB', value: 30 },
  { label: '40 KB', value: 40 },
  { label: '50 KB', value: 50 },
  { label: '100 KB', value: 100 },
  { label: '200 KB', value: 200 },
  { label: 'Custom', value: -1 }
];

export function mmToPx(mm: number, dpi: number = 300): number {
  return Math.round((mm / 25.4) * dpi);
}

export function inchToPx(inch: number, dpi: number = 300): number {
  return Math.round(inch * dpi);
}

export function pxToMm(px: number, dpi: number = 300): number {
  return +((px / dpi) * 25.4).toFixed(2);
}

export function pxToInch(px: number, dpi: number = 300): number {
  return +(px / dpi).toFixed(3);
}

export function convertDimensions(
  width: number,
  height: number,
  fromUnit: Unit,
  toUnit: Unit,
  dpi: number = 300
): { width: number; height: number } {
  if (fromUnit === toUnit) return { width, height };

  let widthMm = width;
  let heightMm = height;

  if (fromUnit === 'inch') {
    widthMm = width * 25.4;
    heightMm = height * 25.4;
  } else if (fromUnit === 'px') {
    widthMm = (width / dpi) * 25.4;
    heightMm = (height / dpi) * 25.4;
  }

  if (toUnit === 'mm') {
    return { width: +widthMm.toFixed(1), height: +heightMm.toFixed(1) };
  } else if (toUnit === 'inch') {
    return { width: +(widthMm / 25.4).toFixed(3), height: +(heightMm / 25.4).toFixed(3) };
  } else {
    return { width: Math.round((widthMm / 25.4) * dpi), height: Math.round((heightMm / 25.4) * dpi) };
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
