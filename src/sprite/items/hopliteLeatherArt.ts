// The owner's leather chest, iron pauldrons and navy sleeves (his second set).
// Lifted from the owner's bronze warrior (docs/reference/bronze-warrior-leather-chest-owner-reference.jpg) and
// brought down to our scale by tools/refs/bronze-leather-from-ref.py (tools/refs/bronze_ref.py).
// Generated: rerun the script to change it:
//   python3 -I tools/refs/bronze-leather-from-ref.py src/sprite/items/hopliteLeatherArt.ts

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const HOPLITE_LEATHER_MAIN = '#4e3026';
export const HOPLITE_LEATHER_COLLAR = '#152032';
export const HOPLITE_LEATHER_IRON = '#6c6260';
export const HOPLITE_LEATHER_GOLD = '#6c4632';

/** Where each piece lands in our male idle frame 0 (his joints), unturned: the fine pixel of its first row's first cell. */
export const HOPLITE_LEATHER_REST: Record<string, [number, number]> = {
  HOPLITE_LCHEST: [119, 151],
  HOPLITE_LCOLLAR: [122, 146],
  HOPLITE_LPAULDRON_N: [109, 149],
  HOPLITE_LPAULDRON_F: [135, 150],
  HOPLITE_SLEEVE_N: [110, 156],
  HOPLITE_SLEEVE_F: [134, 157],
};

/** His leather chest with its belt: rides the neck, leaning with the torso. */
export const HOPLITE_LCHEST: PaintedPiece = {
  pivot: [9, -1],
  angle: -87.46,
  rows: [
    '.aaaaaaaaaaaaaaaa.',
    '.abcccdceefhihjea.',
    '.akcccdleeemlneha.',
    '.akcccddaaaaaaaja.',
    '..acccpa.......aa.',
    '..acqqqpaa....appa',
    '...aqdqddaaaaakpda',
    '..amdqqlaeelrkffsa',
    '.attcuieeevvakvewa',
    '.atccpcaeevxamveka',
    'atpcccckeeeyrdneka',
    'accccaaaaaaaafaaaa',
    'accpakkakeetaftea.',
    'aplakkhazAktrttAa.',
    'aaakkkkazkeeameka.',
    '.akkkbhAaeetrttia.',
    '.akmhhhkapptahtia.',
    '.akkbhhbamAvamvia.',
    '.akkkkhhaAABabBna.',
    '.aknnnhazkpBrBBnna',
    '.appnnnnnnnkmbtnna',
    'apCBnBziizmDDDjyna',
    'acltlBpppicDbDuAna',
    '.acdaEkppBcDDDulaa',
    '.ppa..aAAAAkkkmma.',
    '.aa....aafvAAvha..',
    '.........aaaaaa...',
  ],
  colors: {
    a: '#000418',
    b: '#12101c',
    c: '#402824',
    d: '#4e3026',
    e: '#443633',
    f: '#171820',
    h: '#362c2a',
    i: '#785436',
    j: '#222029',
    k: '#2b2122',
    l: '#54362c',
    m: '#22161e',
    n: '#6c4632',
    p: '#352222',
    q: '#e2a454',
    r: '#e7b560',
    s: '#c08a4d',
    t: '#5c3a32',
    u: '#885d36',
    v: '#584d49',
    w: '#9c6e44',
    x: '#4a3a3a',
    y: '#774a33',
    z: '#82563a',
    A: '#43302a',
    B: '#644030',
    C: '#301a1c',
    D: '#ecbe5f',
    E: '#f6c262',
  },
};

/** What each colour of HOPLITE_LCHEST is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const HOPLITE_LCHEST_KIND: Record<string, 'dark' | 'hair' | 'line' | 'warm'> = {
  '#000418': 'line',
  '#12101c': 'dark',
  '#171820': 'dark',
  '#22161e': 'dark',
  '#222029': 'hair',
  '#2b2122': 'warm',
  '#301a1c': 'warm',
  '#352222': 'warm',
  '#362c2a': 'warm',
  '#402824': 'warm',
  '#43302a': 'warm',
  '#443633': 'warm',
  '#4a3a3a': 'warm',
  '#4e3026': 'warm',
  '#54362c': 'warm',
  '#584d49': 'warm',
  '#5c3a32': 'warm',
  '#644030': 'warm',
  '#6c4632': 'warm',
  '#774a33': 'warm',
  '#785436': 'warm',
  '#82563a': 'warm',
  '#885d36': 'warm',
  '#9c6e44': 'warm',
  '#c08a4d': 'warm',
  '#e2a454': 'warm',
  '#e7b560': 'warm',
  '#ecbe5f': 'warm',
  '#f6c262': 'warm',
};

/** His high navy collar and the square clasp on it, in front of the scarf. */
export const HOPLITE_LCOLLAR: PaintedPiece = {
  pivot: [6, 4],
  angle: -87.46,
  rows: [
    'aa.........',
    '.a.........',
    '.aaa.......',
    '.abbaa.....',
    '..bbcda..aa',
    '..abdda..aa',
    '.aefbaaa.a.',
    '.aeha......',
    '.aija......',
    '..aa.......',
  ],
  colors: {
    a: '#000418',
    b: '#152032',
    c: '#262f3e',
    d: '#2f3646',
    e: '#402824',
    f: '#4e3026',
    h: '#43302a',
    i: '#785436',
    j: '#9c6e44',
  },
};

/** What each colour of HOPLITE_LCOLLAR is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const HOPLITE_LCOLLAR_KIND: Record<string, 'line' | 'navy' | 'warm'> = {
  '#000418': 'line',
  '#152032': 'navy',
  '#262f3e': 'navy',
  '#2f3646': 'navy',
  '#402824': 'warm',
  '#43302a': 'warm',
  '#4e3026': 'warm',
  '#785436': 'warm',
  '#9c6e44': 'warm',
};

/** His near iron pauldron: rides the near shoulder. */
export const HOPLITE_LPAULDRON_N: PaintedPiece = {
  pivot: [7, 6],
  angle: 105.61,
  rows: [
    '......aaaa....',
    '.....abcdea...',
    'a...afffhiha..',
    'aaaajffckkkla.',
    '.aaaffeminihca',
    '...aeeeeepqqqa',
    '...afhfeersffa',
    '...afldfeeetaa',
    '..auqicffvaa..',
    '..aavvwvva....',
    '....aaaaa.....',
  ],
  colors: {
    a: '#000418',
    b: '#5c3a32',
    c: '#443633',
    d: '#352222',
    e: '#8e643e',
    f: '#2b2122',
    h: '#4c4240',
    i: '#665c5a',
    j: '#785436',
    k: '#8f8583',
    l: '#6c6260',
    m: '#6c4632',
    n: '#7c7c82',
    p: '#9c6e44',
    q: '#4a3a3a',
    r: '#222029',
    s: '#171820',
    t: '#82563a',
    u: '#54362c',
    v: '#885d36',
    w: '#22161e',
  },
};

/** What each colour of HOPLITE_LPAULDRON_N is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const HOPLITE_LPAULDRON_N_KIND: Record<string, 'dark' | 'grey' | 'hair' | 'line' | 'warm'> = {
  '#000418': 'line',
  '#171820': 'dark',
  '#22161e': 'dark',
  '#222029': 'hair',
  '#2b2122': 'warm',
  '#352222': 'warm',
  '#443633': 'warm',
  '#4a3a3a': 'warm',
  '#4c4240': 'warm',
  '#54362c': 'warm',
  '#5c3a32': 'warm',
  '#665c5a': 'grey',
  '#6c4632': 'warm',
  '#6c6260': 'grey',
  '#785436': 'warm',
  '#7c7c82': 'grey',
  '#82563a': 'warm',
  '#885d36': 'warm',
  '#8e643e': 'warm',
  '#8f8583': 'grey',
  '#9c6e44': 'warm',
};

/** His far iron pauldron: rides the far shoulder. */
export const HOPLITE_LPAULDRON_F: PaintedPiece = {
  pivot: [2, 5],
  angle: 84.29,
  rows: [
    'a.....',
    'aaa...',
    '.aba..',
    '.aca..',
    '.adea.',
    '.afha.',
    '..aha.',
    '..aia.',
    '...aja',
    '....aa',
  ],
  colors: {
    a: '#000418',
    b: '#443633',
    c: '#584d49',
    d: '#43302a',
    e: '#665c5a',
    f: '#362c2a',
    h: '#a57544',
    i: '#6c4632',
    j: '#64483c',
  },
};

/** What each colour of HOPLITE_LPAULDRON_F is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const HOPLITE_LPAULDRON_F_KIND: Record<string, 'grey' | 'line' | 'warm'> = {
  '#000418': 'line',
  '#362c2a': 'warm',
  '#43302a': 'warm',
  '#443633': 'warm',
  '#584d49': 'warm',
  '#64483c': 'warm',
  '#665c5a': 'grey',
  '#6c4632': 'warm',
  '#a57544': 'warm',
};

/** His near navy sleeve and gold cuff: rides the near shoulder. */
export const HOPLITE_SLEEVE_N: PaintedPiece = {
  pivot: [6, -1],
  angle: 105.61,
  rows: [
    '.........aaa',
    '........abba',
    '..aaaaaabbba',
    '.abbbbbbbbba',
    '.abbcdbceba.',
    'afffccdccba.',
    'ahhifcbcba..',
    'aaajfffea...',
    '...aahffa...',
    '.....aka....',
    '......aa....',
  ],
  colors: {
    a: '#000418',
    b: '#152032',
    c: '#304155',
    d: '#262f3e',
    e: '#28374e',
    f: '#a57544',
    h: '#82563a',
    i: '#43302a',
    j: '#eab153',
    k: '#12101c',
  },
};

/** What each colour of HOPLITE_SLEEVE_N is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const HOPLITE_SLEEVE_N_KIND: Record<string, 'dark' | 'line' | 'navy' | 'warm'> = {
  '#000418': 'line',
  '#12101c': 'dark',
  '#152032': 'navy',
  '#262f3e': 'navy',
  '#28374e': 'navy',
  '#304155': 'navy',
  '#43302a': 'warm',
  '#82563a': 'warm',
  '#a57544': 'warm',
  '#eab153': 'warm',
};

/** His far navy sleeve and gold cuff: rides the far shoulder. */
export const HOPLITE_SLEEVE_F: PaintedPiece = {
  pivot: [3, -2],
  angle: 84.29,
  rows: [
    '....a..',
    '...aba.',
    '...abba',
    '...aba.',
    '...aca.',
    '...aca.',
    '.aabcda',
    'aefbdha',
    'aifdfa.',
    '.aaaa..',
  ],
  colors: {
    a: '#000418',
    b: '#152032',
    c: '#304155',
    d: '#54362c',
    e: '#352222',
    f: '#8e643e',
    h: '#6c4632',
    i: '#2b2122',
  },
};

/** What each colour of HOPLITE_SLEEVE_F is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const HOPLITE_SLEEVE_F_KIND: Record<string, 'line' | 'navy' | 'warm'> = {
  '#000418': 'line',
  '#152032': 'navy',
  '#2b2122': 'warm',
  '#304155': 'navy',
  '#352222': 'warm',
  '#54362c': 'warm',
  '#6c4632': 'warm',
  '#8e643e': 'warm',
};
