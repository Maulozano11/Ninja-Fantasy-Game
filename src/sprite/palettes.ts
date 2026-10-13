// Curated swatches for the creator. Every color slot also has a free picker.

export const SKIN_TONES = [
  '#ffe6d2', '#f8d3b6', '#f2c7a0', '#e3b088', '#c98c5f', '#a86b43', '#7d4a2b', '#5a3220', '#3d2216', '#c9d4e8', '#9fbf8f',
];

export const HAIR_COLORS = [
  '#16161d', '#1c2233', '#3a2a20', '#6b3f22', '#a0522d', '#d4a056', '#f5c518', '#fff2a8', '#e2e8f0',
  '#9aa3b2', '#c81e2a', '#ff7b2e', '#2f6fd6', '#7c3aed', '#2e9e5b', '#ff8fc7',
];

export const EYE_COLORS = ['#3b82f6', '#38bdf8', '#22c55e', '#a16207', '#5b3a29', '#6b7280', '#d81b2a', '#7c3aed', '#f59e0b', '#e5e7eb'];

export const CLOTH_COLORS = [
  '#14161c', '#2b3346', '#22304d', '#1e3a8a', '#2f5fa8', '#0e7490', '#55703a', '#166534', '#7a1f2b', '#b3202a',
  '#ea580c', '#d97706', '#d4af37', '#6b4226', '#b87333', '#4b5563', '#9ca3af', '#e8e2d4', '#f8fafc', '#7c3aed',
];

/**
 * The big cloth and leather palette for the creator: color families from
 * dark to light, so every outfit color has a deep and a pale version. Metal
 * slots keep CLOTH_COLORS above.
 */
export const CLOTH_FAMILIES: { name: string; colors: string[] }[] = [
  { name: 'Black & grey', colors: ['#0f1115', '#1b1e26', '#2a2f3a', '#3d4350', '#5a6170', '#7d8594', '#a3aab6', '#c9ced6'] },
  { name: 'White & cream', colors: ['#e6e8ec', '#f8fafc', '#f3ede0', '#efe5cc', '#d9c9a3', '#b8a27c'] },
  { name: 'Brown', colors: ['#2e1d14', '#4a2e1f', '#6b4226', '#8b5a2b', '#a87442', '#c99a63'] },
  { name: 'Khaki & sand', colors: ['#3b3127', '#5c4d3c', '#8a7658', '#a8956c', '#c7b48a'] },
  { name: 'Crimson', colors: ['#3d0d12', '#5e141c', '#7a1f2b', '#a3202c', '#c8323a', '#e35b5b'] },
  { name: 'Wine', colors: ['#3a1024', '#5a1a38', '#7d2850', '#a3386a'] },
  { name: 'Orange', colors: ['#5a2a0e', '#8a3f12', '#c2561a', '#ea7a2a', '#f5a35c'] },
  { name: 'Gold & ochre', colors: ['#5a4410', '#8a6a16', '#b8901f', '#d9b23a', '#f0d36b', '#f8e9a8'] },
  { name: 'Olive', colors: ['#2c3218', '#434b22', '#5d6830', '#7f8c45', '#a3ad6b'] },
  { name: 'Green', colors: ['#0f2a1a', '#164428', '#1f6038', '#2e8049', '#4ca865', '#8fd19e'] },
  { name: 'Jade & teal', colors: ['#0b2e2e', '#0f4a4a', '#146b68', '#1f8f88', '#3bb3a8', '#8ad9cf'] },
  { name: 'Sky', colors: ['#0c2f45', '#0f4c6e', '#1670a0', '#2a95c8', '#5dbbe6', '#a7dcf5'] },
  { name: 'Navy & blue', colors: ['#0d1530', '#15224d', '#1e3a8a', '#2b55b8', '#4a7ad8', '#8fb0ee'] },
  { name: 'Indigo', colors: ['#1a1440', '#2a2066', '#3d2f8f', '#5a4bb5', '#8a7fd6'] },
  { name: 'Violet', colors: ['#24123a', '#3b1d5c', '#5a2a86', '#7c3aed', '#a07ae6', '#cdb6f2'] },
  { name: 'Pink', colors: ['#3d0f2c', '#6b1a4a', '#9c2a6b', '#c94a8e', '#e67fb3', '#f5b8d6'] },
  { name: 'Rose & peach', colors: ['#8a4a48', '#b86b62', '#e8a598', '#f2c4b0', '#f5d6c6'] },
];

export const CLOTH_PALETTE: string[] = CLOTH_FAMILIES.flatMap((f) => f.colors);
