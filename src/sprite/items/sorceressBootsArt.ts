// The sorceress's black thigh stockings and buckled heeled boots: the owner's pixels from his sheet of Aurelia's outfits
// (docs/reference/aurelia-outfits-owner-reference.jpg), brought down to our scale by
// tools/refs/aurelia-sorceress-boots-from-ref.py (tools/refs/aurelia_outfits_ref.py). Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His black line (never recoloured). */
export const NIGHT_BOOTS_LINE = '#000008';
/** The colours the slots recolour from: at these every pixel stays his. */
export const NIGHT_BOOTS_BASE: Record<string, string> = {
  leather: '#201a26',
  metal: '#6a6a74',
};
/** The letters of each slot's colours. */
export const NIGHT_BOOTS_CHARS: Record<string, string> = {
  leather: 'ABCDEFGHabcdefhijlmnpqrstuvwxyz',
  metal: 'IJKLMNOPQRS',
};

/** The near boot over the knee and what of the leg above it (pivot: the knee). */
export const NIGHT_BOOTS_THIGH_N: PaintedPiece = {
  pivot: [5, 11],
  angle: 99.25,
  rows: [
    '..xxxhd......',
    '.xxxxhz......',
    '.xxxbhzk.....',
    'eeeaasFAvk...',
    '.zAhxwAtvxAkA',
    '.ddbFEtflvEDD',
    '.zuuEAfffxDDD',
    'xxxFEtfffADDD',
    'nnDFEqffqADD.',
    'DDDEAvfixFD..',
    '.DFEEArvEGG..',
    '.....AAAGGG..',
  ],
  colors: {
    k: '#000008',
    A: '#201a26',
    D: '#250c22',
    E: '#161220',
    F: '#120c1a',
    G: '#1a071a',
    a: '#62446c',
    b: '#5c4066',
    d: '#633866',
    e: '#53415a',
    f: '#553e50',
    h: '#543a60',
    i: '#4c4048',
    l: '#483842',
    n: '#46344e',
    q: '#3e2e3c',
    r: '#322f3a',
    s: '#3c2642',
    t: '#342a32',
    u: '#33263f',
    v: '#2e2230',
    w: '#301e3a',
    x: '#26202c',
    z: '#2a1a32',
  },
};

/** The near boot from the knee to the ankle (pivot: the ankle). */
export const NIGHT_BOOTS_SHIN_N: PaintedPiece = {
  pivot: [5, 15],
  angle: 105.42,
  rows: [
    '.....DAAA......',
    '....CqFAAAEEGDD',
    '...CCttHAAAFDD.',
    '..CCCCvqScAED..',
    '.BBDRKIxFtAA...',
    '.DDGNxKycjAx...',
    'BGDGPOOvqxxx...',
    'BDDGFExEAAA....',
    'BkkHAAtCvCC....',
    '...kIMAqACC....',
    '...kOLAxEDDD...',
    '...kPQtvkkD....',
    '...kOAEk.......',
    '...kxDtk.......',
    '...kvEtk.......',
    '...kvGvk.......',
    '...kvqxk.......',
    '...kCtk........',
    '..kNFltk.......',
    '..kNrxEk.......',
    '..kxqitk.......',
  ],
  colors: {
    k: '#000008',
    A: '#201a26',
    B: '#2c0d2a',
    C: '#1e131a',
    D: '#250c22',
    E: '#161220',
    F: '#120c1a',
    G: '#1a071a',
    H: '#0e0a12',
    I: '#b5bbb9',
    K: '#aeacaf',
    L: '#a8aea8',
    M: '#9e9e98',
    N: '#6e6c6c',
    O: '#6a6a74',
    P: '#666064',
    Q: '#585e60',
    R: '#52565c',
    S: '#4e484c',
    c: '#544a44',
    i: '#4c4048',
    j: '#414348',
    l: '#483842',
    q: '#3e2e3c',
    r: '#322f3a',
    t: '#342a32',
    v: '#2e2230',
    x: '#26202c',
    y: '#282022',
  },
};

/** The near shoe, flat (pivot: the ankle). */
export const NIGHT_BOOTS_FOOT_N: PaintedPiece = {
  pivot: [3, -4],
  angle: 0.00,
  rows: [
    'kNrxEk',
    'kxqitk',
    'kvlltk',
    'ktq.qk',
    'kAvFFk',
    'kkkkkk',
  ],
  colors: {
    k: '#000008',
    A: '#201a26',
    E: '#161220',
    F: '#120c1a',
    N: '#6e6c6c',
    i: '#4c4048',
    l: '#483842',
    q: '#3e2e3c',
    r: '#322f3a',
    t: '#342a32',
    v: '#2e2230',
    x: '#26202c',
  },
};

/** Where the near shoe meets the shin, from the ankle at rest (fine pixels): the shoe follows it. */
export const NIGHT_BOOTS_JOIN_N: [number, number] = [0.00, 4.00];
/** How far above the near knee our leg goes under the boot (fine pixels along the thigh). */
export const NIGHT_BOOTS_CUT_N = 10.85;

/** The far boot over the knee and what of the leg above it (pivot: the knee). */
export const NIGHT_BOOTS_THIGH_F: PaintedPiece = {
  pivot: [3, 11],
  angle: 91.36,
  rows: [
    '.....eE..',
    '.....eEE.',
    '.k..kbEAk',
    '.AAAAhxxx',
    'AAAAAAbxx',
    'AAAvAAmxx',
    'AAAqAGnbb',
    'AAAqAGpbk',
    'AAAttGDtk',
    'AAAtADDt.',
    'AAAxDDDD.',
  ],
  colors: {
    k: '#000008',
    A: '#201a26',
    D: '#250c22',
    E: '#161220',
    G: '#1a071a',
    b: '#5c4066',
    e: '#53415a',
    h: '#543a60',
    m: '#4a3258',
    n: '#46344e',
    p: '#3c2e48',
    q: '#3e2e3c',
    t: '#342a32',
    v: '#2e2230',
    x: '#26202c',
  },
};

/** The far boot from the knee to the ankle (pivot: the ankle). */
export const NIGHT_BOOTS_SHIN_F: PaintedPiece = {
  pivot: [5, 14],
  angle: 88.03,
  rows: [
    '.AAAAFDDDD',
    '.AAAAFDDDD',
    '.AAACCDDDD',
    '.AAAAHDDDD',
    '.AAvvHDDD.',
    '.iiSiEDDD.',
    '.tttxEDDD.',
    '.kAAACDGGG',
    '.AAqvHkkG.',
    '.kqqAk....',
    '.kqqAk....',
    '.kqqAk....',
    '.kAAxk....',
    '.kxAqk....',
    '.kAqqk....',
    '.kAffxk...',
    'kAEAALk...',
    'kAAEAvJk..',
    'kEEFAAqqk.',
    '.kFFFvllqk',
  ],
  colors: {
    k: '#000008',
    A: '#201a26',
    C: '#1e131a',
    D: '#250c22',
    E: '#161220',
    F: '#120c1a',
    G: '#1a071a',
    H: '#0e0a12',
    J: '#b0b5af',
    L: '#a8aea8',
    S: '#4e484c',
    f: '#553e50',
    i: '#4c4048',
    l: '#483842',
    q: '#3e2e3c',
    t: '#342a32',
    v: '#2e2230',
    x: '#26202c',
  },
};

/** The far shoe, flat (pivot: the ankle). */
export const NIGHT_BOOTS_FOOT_F: PaintedPiece = {
  pivot: [5, -4],
  angle: 0.00,
  rows: [
    'kEEFAAqqk....',
    '.kFFFvllqk...',
    '.kAkkAvvfikk.',
    '.kkk.kEFAfxxk',
    '......kkkkkkk',
  ],
  colors: {
    k: '#000008',
    A: '#201a26',
    E: '#161220',
    F: '#120c1a',
    f: '#553e50',
    i: '#4c4048',
    l: '#483842',
    q: '#3e2e3c',
    v: '#2e2230',
    x: '#26202c',
  },
};

/** Where the far shoe meets the shin, from the ankle at rest (fine pixels): the shoe follows it. */
export const NIGHT_BOOTS_JOIN_F: [number, number] = [-1.00, 4.00];
/** How far above the far knee our leg goes under the boot (fine pixels along the thigh). */
export const NIGHT_BOOTS_CUT_F = 10.32;
