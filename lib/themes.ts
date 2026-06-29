export const THEMES = {
  indigo: {
    label: 'Indigo',
    sidebar: 'bg-indigo-900',
    active: 'bg-indigo-700',
    hover: 'hover:bg-indigo-800',
    border: 'border-indigo-800',
    accent: 'bg-indigo-600 hover:bg-indigo-700',
    accentText: 'text-indigo-600',
    ring: 'focus:ring-indigo-500',
    preview: '#4338ca',
  },
  blue: {
    label: 'Blue',
    sidebar: 'bg-blue-900',
    active: 'bg-blue-700',
    hover: 'hover:bg-blue-800',
    border: 'border-blue-800',
    accent: 'bg-blue-600 hover:bg-blue-700',
    accentText: 'text-blue-600',
    ring: 'focus:ring-blue-500',
    preview: '#1d4ed8',
  },
  emerald: {
    label: 'Green',
    sidebar: 'bg-emerald-900',
    active: 'bg-emerald-700',
    hover: 'hover:bg-emerald-800',
    border: 'border-emerald-800',
    accent: 'bg-emerald-600 hover:bg-emerald-700',
    accentText: 'text-emerald-600',
    ring: 'focus:ring-emerald-500',
    preview: '#059669',
  },
  violet: {
    label: 'Purple',
    sidebar: 'bg-violet-900',
    active: 'bg-violet-700',
    hover: 'hover:bg-violet-800',
    border: 'border-violet-800',
    accent: 'bg-violet-600 hover:bg-violet-700',
    accentText: 'text-violet-600',
    ring: 'focus:ring-violet-500',
    preview: '#7c3aed',
  },
  rose: {
    label: 'Rose',
    sidebar: 'bg-rose-900',
    active: 'bg-rose-700',
    hover: 'hover:bg-rose-800',
    border: 'border-rose-800',
    accent: 'bg-rose-600 hover:bg-rose-700',
    accentText: 'text-rose-600',
    ring: 'focus:ring-rose-500',
    preview: '#e11d48',
  },
  slate: {
    label: 'Dark',
    sidebar: 'bg-slate-900',
    active: 'bg-slate-700',
    hover: 'hover:bg-slate-800',
    border: 'border-slate-700',
    accent: 'bg-slate-700 hover:bg-slate-600',
    accentText: 'text-slate-700',
    ring: 'focus:ring-slate-500',
    preview: '#334155',
  },
} as const;

export type ThemeKey = keyof typeof THEMES;

export function getTheme(key?: string): typeof THEMES[ThemeKey] {
  return THEMES[(key as ThemeKey) in THEMES ? (key as ThemeKey) : 'indigo'];
}
