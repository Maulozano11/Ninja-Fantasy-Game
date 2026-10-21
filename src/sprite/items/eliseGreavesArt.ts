// Elise's thigh-high white steel boots, from the owner's Elise picture brought down to our scale
// (tools/refs/elise-boots-from-ref.py from docs/reference/elise-owner-reference.jpg).
// Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** Her colours the colour slots recolour from (at these, every pixel is hers). */
export const AZURE_STEEL = '#ced0dc';
export const AZURE_LEATHER = '#7d564c';
export const AZURE_TRIM = '#e6b75e';

/** What each colour of hers in these pieces is: her black line and sole (they stay), steel, leather or gold. */
export const AZURE_KIND: Record<string, 'line' | 'steel' | 'leather' | 'gold'> = {
  '#080613': 'line',
  '#181b37': 'line',
  '#fefef9': 'steel',
  '#efeff9': 'steel',
  '#ced0dc': 'steel',
  '#8d8ea0': 'steel',
  '#6a6b80': 'steel',
  '#525368': 'steel',
  '#a0765a': 'leather',
  '#7d564c': 'leather',
  '#4e3739': 'leather',
  '#342325': 'leather',
  '#f8dc92': 'gold',
  '#e6b75e': 'gold',
  '#cf9b48': 'gold',
  '#905f3c': 'gold',
};

/** The near cuff and the greave over the thigh: they turn with the thigh about the knee. */
export const AZURE_THIGH_N: PaintedPiece = {
  pivot: [6, 10],
  angle: 87.21,
  rows: [
    '0KKKKKKKKKKK0',
    '0gbbbBBBBBBk0',
    '0gbBBBBBBBkk0',
    '0GggggggggGG0',
    '.0wLLLLLLMd0.',
    '.0wLLLLLLMd0.',
    '.0wLLLLLLMd0.',
    '.0wLLLLLLMd0.',
    '.0wLLLLLLMd0.',
    '.0wLLLLLLMd0.',
    '.0wLLLLLLMd0.',
    '..0wLLLLLMd0.',
  ],
  colors: {
    '0': '#080613',
    w: '#fefef9',
    L: '#ced0dc',
    M: '#8d8ea0',
    d: '#6a6b80',
    b: '#a0765a',
    B: '#7d564c',
    k: '#4e3739',
    K: '#342325',
    g: '#e6b75e',
    G: '#cf9b48',
  },
};

/** The near greave over the shin and the ankle guard: they turn with the shin about the ankle. */
export const AZURE_SHIN_N: PaintedPiece = {
  pivot: [3, 15],
  angle: 103.41,
  rows: [
    '..0wLLLLLLMd0',
    '...0wLLLLLMd0',
    '...0wLLLLLMd0',
    '...0wLXLLMd0.',
    '...0wLXLLMd0.',
    '...0wLXLLMd0.',
    '...0wLXLLMd0.',
    '...0wLXLLMd0.',
    '...0wLXLMd0..',
    '...0wLXLMd0..',
    '...0wLXLMd0..',
    '...0wLXLMd0..',
    '..0wLXLMd0...',
    '.0ggggggG0...',
    '0gbBBBBkG0...',
    '0gbBBBkkG0...',
    '.0GgggGoo0...',
  ],
  colors: {
    '0': '#080613',
    w: '#fefef9',
    L: '#ced0dc',
    M: '#8d8ea0',
    d: '#6a6b80',
    X: '#525368',
    b: '#a0765a',
    B: '#7d564c',
    k: '#4e3739',
    g: '#e6b75e',
    G: '#cf9b48',
    o: '#905f3c',
  },
};

/** The near sabaton, seen from the front: it stays flat under the ankle. */
export const AZURE_FOOT_N: PaintedPiece = {
  pivot: [5, 0],
  angle: 103.41,
  rows: [
    '..0wLLLLMd0',
    '.0weLLLLMd0',
    '0weLLLLLMd0',
    '0LMMMMMMMd0',
    '0weLLLLMMd0',
    '0eLLLLLMdd0',
    '0sssssssss0',
    '.000000000.',
  ],
  colors: {
    '0': '#080613',
    s: '#181b37',
    w: '#fefef9',
    e: '#efeff9',
    L: '#ced0dc',
    M: '#8d8ea0',
    d: '#6a6b80',
  },
};

/** The near knee cop, rimmed in gold: it turns with the shin about the knee, over the joint. */
export const AZURE_COP_N: PaintedPiece = {
  pivot: [4, 4],
  angle: 103.41,
  rows: [
    '.0gggG0.',
    '0gweLMG0',
    '0gwLLMo0',
    '0GLLMMo0',
    '0GLMMdo0',
    '.0Gooo0.',
    '..0000..',
  ],
  colors: {
    '0': '#080613',
    w: '#fefef9',
    e: '#efeff9',
    L: '#ced0dc',
    M: '#8d8ea0',
    d: '#6a6b80',
    g: '#e6b75e',
    G: '#cf9b48',
    o: '#905f3c',
  },
};

/** The far cuff and the greave over the thigh: they turn with the thigh about the knee. */
export const AZURE_THIGH_F: PaintedPiece = {
  pivot: [9, 4],
  angle: 52.27,
  rows: [
    '0KKKKKKKKKK0.',
    '0gbBBBBBBkk0.',
    '.0gBBBBBBkkK0',
    '.0GggggggggG0',
    '....0eLLLLMd0',
    '....0eLLLLMd0',
    '....0eLLLLMd0',
  ],
  colors: {
    '0': '#080613',
    e: '#efeff9',
    L: '#ced0dc',
    M: '#8d8ea0',
    d: '#6a6b80',
    b: '#a0765a',
    B: '#7d564c',
    k: '#4e3739',
    K: '#342325',
    g: '#e6b75e',
    G: '#cf9b48',
  },
};

/** The far greave over the shin and the ankle guard: they turn with the shin about the ankle. */
export const AZURE_SHIN_F: PaintedPiece = {
  pivot: [4, 15],
  angle: 106.19,
  rows: [
    '....0eLLLLMd0',
    '....0eLLLLMd0',
    '....0eLLLLMd0',
    '....0eLLLMd0.',
    '....0eLLLMd0.',
    '....0eLLLMd0.',
    '....0eLLLMd0.',
    '...0eLLLMd0..',
    '...0eLLLMd0..',
    '..0eLXLMd0...',
    '..0eLXLMd0...',
    '..0eLXLMd0...',
    '..0eLXLMd0...',
    '..0eLXMd0....',
    '.0eLXMd0.....',
    '.0ggggG0.....',
    '0GBBkkKG0....',
    '.0GgggGo0....',
  ],
  colors: {
    '0': '#080613',
    e: '#efeff9',
    L: '#ced0dc',
    M: '#8d8ea0',
    d: '#6a6b80',
    X: '#525368',
    B: '#7d564c',
    k: '#4e3739',
    K: '#342325',
    g: '#e6b75e',
    G: '#cf9b48',
    o: '#905f3c',
  },
};

/** The far sabaton pointing right: it stays flat under the ankle. */
export const AZURE_FOOT_F: PaintedPiece = {
  pivot: [5, -1],
  angle: 106.19,
  rows: [
    '0MLLLLLLew0...',
    '0MLLLLLLLLew0.',
    '0dMMLLLLLLLMd0',
    '0ss00ssssssss0',
    '000..00000000.',
  ],
  colors: {
    '0': '#080613',
    s: '#181b37',
    w: '#fefef9',
    e: '#efeff9',
    L: '#ced0dc',
    M: '#8d8ea0',
    d: '#6a6b80',
  },
};

/** The far knee cop, rimmed in gold: it turns with the shin about the knee, over the joint. */
export const AZURE_COP_F: PaintedPiece = {
  pivot: [4, 1],
  angle: 106.19,
  rows: [
    '.0gggG0.',
    '0gwLLMG0',
    '0gLLLMo0',
    '0GLLMMo0',
    '.0GGoo0.',
    '..0000..',
  ],
  colors: {
    '0': '#080613',
    w: '#fefef9',
    L: '#ced0dc',
    M: '#8d8ea0',
    g: '#e6b75e',
    G: '#cf9b48',
    o: '#905f3c',
  },
};
