export interface ColorPreset {
  id: string;
  name: string;
  bgHex: string;
  textHex: string;
  borderHex: string;
  sampleCss: string;
}

export const PRESET_COLORS: ColorPreset[] = [
  {
    id: 'blue',
    name: 'Xanh dương nhạt (Pastel Blue)',
    bgHex: '#DBEAFE', // tailwind blue-100
    textHex: '#1E3A8A', // blue-900
    borderHex: '#93C5FD',
    sampleCss: 'bg-blue-100 text-blue-900 border-blue-300'
  },
  {
    id: 'pink',
    name: 'Hồng phấn (Pastel Pink)',
    bgHex: '#FCE7F3', // pink-100
    textHex: '#831843', // pink-900
    borderHex: '#F9A8D4',
    sampleCss: 'bg-pink-100 text-pink-900 border-pink-300'
  },
  {
    id: 'orange',
    name: 'Cam nhạt (Pastel Orange)',
    bgHex: '#FFEDD5', // orange-100
    textHex: '#7C2D12', // orange-900
    borderHex: '#FDBA74',
    sampleCss: 'bg-orange-100 text-orange-900 border-orange-300'
  },
  {
    id: 'yellow',
    name: 'Vàng kem (Pastel Yellow)',
    bgHex: '#FEF9C3', // yellow-100
    textHex: '#713F12', // yellow-900
    borderHex: '#FDE047',
    sampleCss: 'bg-yellow-100 text-yellow-900 border-yellow-300'
  },
  {
    id: 'green',
    name: 'Xanh ngọc / Xanh lá (Pastel Green)',
    bgHex: '#DCFCE7', // green-100
    textHex: '#14532D', // green-900
    borderHex: '#86EFAC',
    sampleCss: 'bg-green-100 text-green-900 border-green-300'
  },
  {
    id: 'red',
    name: 'Đỏ san hô nhạt (Pastel Red/Coral)',
    bgHex: '#FFE4E6', // rose-100
    textHex: '#881337', // rose-900
    borderHex: '#FDA4AF',
    sampleCss: 'bg-rose-100 text-rose-900 border-rose-300'
  },
  {
    id: 'purple',
    name: 'Tím nhạt (Pastel Purple)',
    bgHex: '#F3E8FF', // purple-100
    textHex: '#581C87', // purple-900
    borderHex: '#D8B4FE',
    sampleCss: 'bg-purple-100 text-purple-900 border-purple-300'
  },
  {
    id: 'teal',
    name: 'Lam ngọc nhạt (Pastel Teal)',
    bgHex: '#CCFBF1', // teal-100
    textHex: '#134E4A', // teal-900
    borderHex: '#5EEAD4',
    sampleCss: 'bg-teal-100 text-teal-900 border-teal-300'
  },
  {
    id: 'cyan',
    name: 'Xanh da trời (Pastel Cyan)',
    bgHex: '#CFFAFE', // cyan-100
    textHex: '#164E63', // cyan-900
    borderHex: '#67E8F9',
    sampleCss: 'bg-cyan-100 text-cyan-900 border-cyan-300'
  },
  {
    id: 'gray',
    name: 'Xám sáng (Light Slate)',
    bgHex: '#F1F5F9', // slate-100
    textHex: '#0F172A', // slate-900
    borderHex: '#CBD5E1',
    sampleCss: 'bg-slate-100 text-slate-900 border-slate-300'
  }
];

export function getPresetColor(index: number): ColorPreset {
  return PRESET_COLORS[index % PRESET_COLORS.length];
}

// Convert Hex to ARGB for ExcelJS
export function hexToExcelARGB(hex: string): string {
  const clean = hex.replace('#', '').toUpperCase();
  if (clean.length === 6) {
    return 'FF' + clean;
  }
  return 'FFFFFFFF';
}
