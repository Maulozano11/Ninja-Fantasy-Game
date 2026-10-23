// The owner's book and hands from his two frames of his Trunks reading (tools/refs/roman-read-from-ref.py from
// docs/reference/trunks-read-owner-reference.jpg), for the male read (rig.ts READ_MALE, campfx.ts). Generated:
// rerun the script to change it.

/** One of his pieces where he drew it in our frame: its first cell at fine pixel `at`. */
export interface ReadPiece {
  at: [number, number];
  rows: string[];
  colors: Record<string, string>;
}

/** His Roman skin's base (maleSkinArt.ts MALE_SKIN_BASE): the hands' tones are his Roman fists' tones in it. */
export const READ_SKIN_BASE = '#f3c39c';

/** Below this brightness (each channel) a colour of his hands is his black line, never recoloured. */
export const READ_LINE = 24;

/** His book in each of his frames ('Leyendo': open, held up; 'Libro cerrado': shut, tilted at the chest), his colours. */
export const READ_BOOK: (ReadPiece)[] = [
  {
    at: [119, 163],
    rows: [
      'aaabbbbcdbbb......',
      'efffffffdfffffff..',
      'cghhijklfmnonphic.',
      'fqrrrprsturrrrvwf.',
      'fxyjvzzjtwihAgBCf.',
      'fhrrjrrDtorrErrFf.',
      'fpnGioBBtHjCBIhnc.',
      '.n.rrrJKtmrrrLrMf.',
      '....ttttttttttttrf',
      '....NNNOtNNO.N.N.P',
      '....fffffff.......',
    ],
    colors: {
      a: '#402120',
      b: '#000000',
      c: '#2a0f16',
      d: '#1c1936',
      e: '#92704b',
      f: '#1b0f0f',
      g: '#f8f4eb',
      h: '#f7f3e7',
      i: '#f7f3e8',
      j: '#f8f4e9',
      k: '#f7f4e7',
      l: '#f6f2e5',
      m: '#f6f2e6',
      n: '#f8f4e8',
      o: '#f7f5e9',
      p: '#f8f3e7',
      q: '#f7f2e8',
      r: '#ebdcbf',
      s: '#faf3ea',
      t: '#dcbb88',
      u: '#f7f4e9',
      v: '#f9f5ea',
      w: '#f9f5ec',
      x: '#f8f2e7',
      y: '#f9f3e8',
      z: '#f9f3e7',
      A: '#f9f4e8',
      B: '#f8f5ea',
      C: '#f9f5eb',
      D: '#f7f4e8',
      E: '#f6f3e8',
      F: '#f8f2e5',
      G: '#f8f3e9',
      H: '#f6f3e5',
      I: '#f8f4ea',
      J: '#f6f6ea',
      K: '#f7f5ea',
      L: '#f5f2e6',
      M: '#f8f6ea',
      N: '#7d4532',
      O: '#704c33',
      P: '#763034',
    },
  },
  {
    at: [120, 160],
    rows: [
      'aabcaaa.........',
      'cdedafagga......',
      'dbdhhfgigjaa....',
      'eaaaakiglgmaga..',
      'agnoopgigigpoqaa',
      'geddqoogigroqhsa',
      'hceektqogroudea.',
      'hcdccedqoqddsea.',
      'c..hcee..dsssa..',
      's...ces.v..ssa..',
      '..h.ces....sa...',
      '.........d.sa...',
      '...........a....',
      '..........sa....',
      '......f...g.....',
    ],
    colors: {
      a: '#000000',
      b: '#916d49',
      c: '#4c2f2b',
      d: '#2a0f16',
      e: '#402220',
      f: '#1c1936',
      g: '#08070d',
      h: '#100f1c',
      i: '#d68970',
      j: '#313038',
      k: '#1f241d',
      l: '#cb7c65',
      m: '#3e343c',
      n: '#e1c493',
      o: '#ece0cb',
      p: '#ad8157',
      q: '#d6b581',
      r: '#c39e6e',
      s: '#331e1b',
      t: '#704d32',
      u: '#ba9261',
      v: '#65402d',
    },
  },
];

/** His near hand in each frame: his hand's shape, his glove's tones as the Roman's skin (his Roman fists' tones). */
export const READ_HAND_N: (ReadPiece | null)[] = [
  {
    at: [114, 170],
    rows: [
      '.a.a.a.a.',
      'ababababa',
      'abcbcbcba',
      'accccccca',
      'abbbbbbca',
      'acbbbbbca',
      '.acbbdcaa',
      '..acbca..',
      'aeadbba..',
      'aaa......',
    ],
    colors: {
      a: '#000000',
      b: '#edb892',
      c: '#95504b',
      d: '#d88a67',
      e: '#da896a',
    },
  },
  {
    at: [117, 168],
    rows: [
      '..........aa..',
      '....b.....a.cc',
      '...bd.b...bbec',
      'cbbddabbbbfe.c',
      'bdadddeddacceb',
      'ddddddddabdeb.',
      'aeaddddde.bcc.',
      'b.aadddeabdb..',
      '.bdbbbbbbbb...',
      '.cb...........',
    ],
    colors: {
      a: '#8c4746',
      b: '#000000',
      c: '#08070d',
      d: '#de8a68',
      e: '#f0bf98',
      f: '#f2c29e',
    },
  },
];

/** His far hand in each frame (in 'Libro cerrado' only its fingertip beside the book; the hand is behind it). */
export const READ_HAND_F: (ReadPiece | null)[] = [
  {
    at: [130, 172],
    rows: [
      '.a.a.a.a.',
      'ababababa',
      'abcbcbcba',
      'accccccca',
      'abbbbbbca',
      'acbbbbbca',
      '.acbbbca.',
      '..acbca..',
      '..abbba..',
    ],
    colors: {
      a: '#000000',
      b: '#edb892',
      c: '#95504b',
    },
  },
  {
    at: [120, 168],
    rows: [
      '.ab.',
      '.cba',
      'cd.c',
    ],
    colors: {
      a: '#08070d',
      b: '#f2c29e',
      c: '#000000',
      d: '#de8a68',
    },
  },
];
