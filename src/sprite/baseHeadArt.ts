// The owner's bare female body's head, his pixels (tools/refs/base-head-from-ref.py from
// docs/reference/female-base-owner-reference.jpg): the 'base' face shape, the head his messy ponytail
// was drawn on. Generated: rerun the script to change it.

import type { PaintedPiece } from './painted';

/** The skin he painted it in: a player's skin moves every colour of it as far. */
export const BASE_SKIN = '#f6c9a8';

/** His iris: the eye colour moves it as far. */
export const BASE_IRIS = '#1f1f2b';

/** What each of his colours is. */
export const BASE_FACE_KIND: Record<string, 'line' | 'skin' | 'iris' | 'white'> = {
  '#000000': 'line',
  '#070819': 'line',
  '#1f1f2b': 'iris',
  '#363844': 'iris',
  '#372936': 'skin',
  '#583a38': 'skin',
  '#9c5e54': 'skin',
  '#a76859': 'skin',
  '#c47a66': 'skin',
  '#d38971': 'skin',
  '#d7d7e2': 'white',
  '#e3987e': 'skin',
  '#f1b293': 'skin',
  '#f1f1f6': 'white',
  '#f6c9a8': 'skin',
  '#f6d1b0': 'white',
  '#fee4cb': 'white',
};

/** His head, skull to chin, its pivot on the face anchor (the near eye's lash column and row). */
export const BASE_HEAD: PaintedPiece = {
  pivot: [7, 13],
  angle: 0.00,
  rows: [
    '......aaaaaa.....',
    '....aabbbbbbaa...',
    '...abbbbbbbbbba..',
    '..abbbbbbbbbbbba.',
    '.abbbbbbbbbbbbba.',
    '.abbbbbbbbbbbbba.',
    'abbbbbbbbbcdbbba.',
    'abbbbbbbbdbbbbba.',
    'abbbbbbbbbbbdbbd.',
    'abbbbbeeddddfdbd.',
    'abbdbbedeeeegbd..',
    'abdhbbeeeijebbba.',
    'abbhbbebdkjjbbbba',
    '.aabaaebbbbbbblmn',
    '...a..ebbbbbbbdbn',
    '......ebbbbbbbbb.',
    '.......dbbbboobd.',
    '........dbbbbbd..',
    '.....p.dqpdbbd...',
    '.....d.ggg.......',
    '....hbbbggg......',
    '....dbbbbggp.....',
  ],
  colors: {
    a: '#000000',
    b: '#f6c9a8',
    c: '#f1b293',
    d: '#e3987e',
    e: '#070819',
    f: '#1f1f2b',
    g: '#d38971',
    h: '#a76859',
    i: '#d7d7e2',
    j: '#363844',
    k: '#f1f1f6',
    l: '#fee4cb',
    m: '#f6d1b0',
    n: '#583a38',
    o: '#c47a66',
    p: '#9c5e54',
    q: '#372936',
  },
};
