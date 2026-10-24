// The alchemist's tan leggings, steel knee cops and greaves over brown boots: the owner's pixels from his sheet of Aurelia's outfits
// (docs/reference/aurelia-outfits-owner-reference.jpg), brought down to our scale by
// tools/refs/aurelia-alchemist-greaves-from-ref.py (tools/refs/aurelia_outfits_ref.py). Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His black line (never recoloured). */
export const ALCH_GREAVES_LINE = '#000008';
/** The colours the slots recolour from: at these every pixel stays his. */
export const ALCH_GREAVES_BASE: Record<string, string> = {
  cloth: '#ab8f6a',
  leather: '#382828',
  metal: '#666064',
};
/** The letters of each slot's colours. */
export const ALCH_GREAVES_CHARS: Record<string, string> = {
  cloth: 'ab',
  leather: 'cdefhijlmn',
  metal: 'pqrs',
};

/** The near boot over the knee and what of the leg above it (pivot: the knee). */
export const ALCH_GREAVES_THIGH_N: PaintedPiece = {
  pivot: [3, 24],
  angle: 99.25,
  rows: [
    '....lliecef.',
    '....lliecef.',
    '....lliecef.',
    '....lliecef.',
    '....lliecef.',
    '....lliecef.',
    '....lliecef.',
    '....lliece..',
    '....lliecef.',
    '....iilcceff',
    '...bbbfcbef.',
    '...ecfcbbe..',
    '...ifebbbei.',
    '..mmiebbbfcb',
    '..mmjfeccibb',
    '.mmmfefijjb.',
    '.mmieeeijk..',
    'mmmjeefimm..',
    'jjjfeejmmm..',
    'iijmcfimk...',
    'jjfcccmm....',
    'mmrbbbfk....',
    '.khbbbh..bb.',
    'khhrbrh.bbbb',
    '...hhhf.bbbb',
    '.........bb.',
  ],
  colors: {
    k: '#000008',
    b: '#ab8f6a',
    c: '#896e58',
    e: '#765238',
    f: '#68493e',
    h: '#414348',
    i: '#583a30',
    j: '#4c302c',
    l: '#42331c',
    m: '#382828',
    r: '#666064',
  },
};

/** The near boot from the knee to the ankle (pivot: the ankle). */
export const ALCH_GREAVES_SHIN_N: PaintedPiece = {
  pivot: [3, 15],
  angle: 105.42,
  rows: [
    '...iirh....',
    '...mmhrrhhm',
    '..mljjrfffm',
    '..mmrrmmmm.',
    '.jmrrbbrmk.',
    '.jmrcbrhk..',
    '.kmrbbrfh..',
    '.kjrbrrhh..',
    '.khrbrrr...',
    '.khrbrrk...',
    '.khrrrrk...',
    '.khrrrk....',
    '.krrrrk....',
    '.krrrhk....',
    '.krrfk.....',
    '.khrrk.....',
    '.krhmk.....',
    'krbbh......',
    'krbbr......',
    'krbbr......',
  ],
  colors: {
    k: '#000008',
    b: '#ab8f6a',
    c: '#896e58',
    f: '#68493e',
    h: '#414348',
    i: '#583a30',
    j: '#4c302c',
    l: '#42331c',
    m: '#382828',
    r: '#666064',
  },
};

/** The near shoe, flat (pivot: the ankle). */
export const ALCH_GREAVES_FOOT_N: PaintedPiece = {
  pivot: [4, -3],
  angle: 0.00,
  rows: [
    '.krbbr.',
    '.krbbr.',
    '.kjijm.',
    '.kiffjk',
    'kjfeeik',
    'kmmjmmk',
    '.kkkkk.',
  ],
  colors: {
    k: '#000008',
    b: '#ab8f6a',
    e: '#765238',
    f: '#68493e',
    i: '#583a30',
    j: '#4c302c',
    m: '#382828',
    r: '#666064',
  },
};

/** Where the near shoe meets the shin, from the ankle at rest (fine pixels): the shoe follows it. */
export const ALCH_GREAVES_JOIN_N: [number, number] = [-1.00, 3.00];
/** How far above the near knee our leg goes under the boot (fine pixels along the thigh). */
export const ALCH_GREAVES_CUT_N = 24.64;

/** The far boot over the knee and what of the leg above it (pivot: the knee). */
export const ALCH_GREAVES_THIGH_F: PaintedPiece = {
  pivot: [3, 18],
  angle: 91.36,
  rows: [
    '...d....',
    '..ddd...',
    '.dddd...',
    '.ddddk..',
    '.bbddak.',
    '.bbbdak.',
    '.bbbdak.',
    '.bbbsabk',
    'nnmejjbk',
    'nnniijbk',
    '.njeek..',
    '.jjiik..',
    '.eeeik..',
    '.iiidk..',
    '.rrrrh..',
    '.brrbr..',
    'hhhbbr..',
    'sssrbs..',
  ],
  colors: {
    k: '#000008',
    a: '#fad464',
    b: '#ab8f6a',
    d: '#725a4e',
    e: '#765238',
    h: '#414348',
    i: '#583a30',
    j: '#4c302c',
    m: '#382828',
    n: '#180a10',
    r: '#666064',
    s: '#544e50',
  },
};

/** The far boot from the knee to the ankle (pivot: the ankle). */
export const ALCH_GREAVES_SHIN_F: PaintedPiece = {
  pivot: [6, 14],
  angle: 88.03,
  rows: [
    '...hhsss....',
    '...sshhk....',
    '...isrk.....',
    '...nmmm.....',
    '..jsrbs.....',
    '.jibrbr.....',
    'jjmrrbr.....',
    'kmmrrbk.....',
    '.kjjrbk.....',
    '.kjhrbk.....',
    '.kjmrrk.....',
    '..kjrrk.....',
    '..kmsrk.....',
    '..kjsrk.....',
    '..kjsrk.....',
    '..kjmmmk....',
    '..kjijbk....',
    '.kmmjhrpk...',
    '.kmmjmsqhk..',
    '.kmmmmmhjikk',
  ],
  colors: {
    k: '#000008',
    b: '#ab8f6a',
    h: '#414348',
    i: '#583a30',
    j: '#4c302c',
    m: '#382828',
    n: '#180a10',
    p: '#f6f4e8',
    q: '#828386',
    r: '#666064',
    s: '#544e50',
  },
};

/** The far shoe, flat (pivot: the ankle). */
export const ALCH_GREAVES_FOOT_F: PaintedPiece = {
  pivot: [5, -4],
  angle: 0.00,
  rows: [
    'kmmjmsqhk....',
    'kmmmmmhjikk..',
    '.kmmmmjieeekk',
    '.kkkkkkmmmjjk',
    '.......kkkkkk',
  ],
  colors: {
    k: '#000008',
    e: '#765238',
    h: '#414348',
    i: '#583a30',
    j: '#4c302c',
    m: '#382828',
    q: '#828386',
    s: '#544e50',
  },
};

/** Where the far shoe meets the shin, from the ankle at rest (fine pixels): the shoe follows it. */
export const ALCH_GREAVES_JOIN_F: [number, number] = [-1.00, 4.00];
/** How far above the far knee our leg goes under the boot (fine pixels along the thigh). */
export const ALCH_GREAVES_CUT_F = 17.25;
