// The alchemist's engraved leather and steel pauldron: the owner's pixels from his sheet of Aurelia's outfits
// (docs/reference/aurelia-outfits-owner-reference.jpg), brought down to our scale by
// tools/refs/aurelia-alchemist-pauldron-from-ref.py (tools/refs/aurelia_outfits_ref.py). Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His black line (never recoloured). */
export const ALCH_PAULDRON_LINE = '#000008';
/** The colours the slots recolour from: at these every pixel stays his. */
export const ALCH_PAULDRON_BASE: Record<string, string> = {
  leather: '#59493b',
  metal: '#544e50',
  gold: '#fae8c2',
};
/** The letters of each slot's colours. */
export const ALCH_PAULDRON_CHARS: Record<string, string> = {
  leather: 'abcdefhi',
  metal: 'jlmnpqr',
  gold: 'stu',
};

/** The alchemist's engraved leather and steel pauldron. */
export const ALCH_PAULDRON_PIECE: PaintedPiece = {
  pivot: [3, 5],
  angle: 107.10,
  rows: [
    '....kkkkkuas',
    '...kebbcuaas',
    '..kcbjnbbaas',
    '..kcbndcek.s',
    '.kccaccccc.k',
    'kccbbpqecbbc',
    'keeccqdbfcek',
    '.klreccbife.',
    'kbrdbbaaife.',
    'kmrdbba.hf..',
    'krdbeebhff..',
    'kaaaabkhhe..',
    'kttttk.khh..',
  ],
  colors: {
    k: '#000008',
    a: '#b29e80',
    b: '#59493b',
    c: '#643c38',
    d: '#414348',
    e: '#4c3634',
    f: '#462a28',
    h: '#342222',
    i: '#0f1c18',
    j: '#f0e8de',
    l: '#dfded6',
    m: '#cdcfc2',
    n: '#969692',
    p: '#767470',
    q: '#5b5257',
    r: '#544e50',
    s: '#ffeec9',
    t: '#fae8c2',
    u: '#d4aa7a',
  },
};
