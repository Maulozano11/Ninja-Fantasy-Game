// The owner's leather chest, iron pauldrons and navy sleeves (his second set).
// Lifted from the owner's bronze warrior (docs/reference/bronze-warrior-leather-chest-owner-reference.jpg) and
// brought down to our scale by tools/refs/bronze-leather-from-ref.py (tools/refs/bronze_ref.py).
// Generated: rerun the script to change it:
//   python3 -I tools/refs/bronze-leather-from-ref.py src/sprite/items/hopliteLeatherArt.ts

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const HOPLITE_LEATHER_MAIN = '#443633';
export const HOPLITE_LEATHER_COLLAR = '#1f2638';
export const HOPLITE_LEATHER_IRON = '#443633';
export const HOPLITE_LEATHER_GOLD = '#8e643e';

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
    '.abcccdceeefhfiea.',
    '.ajklmdnenpqnrefa.',
    '.akcccddaaaaaaaia.',
    '..acccsa.......aa.',
    '..aftttsaa....assa',
    '...atdtddaaaaajsda',
    '..aqdttnanpnujvwxa',
    '.ammchyppmzzajzeAa',
    '.apncscannBpaqzeja',
    'aesccccjdkpCudrffa',
    'akcccaaaaaaaavaaaa',
    'accsajjajeemavmna.',
    'asnackfaDkBmummma.',
    'aaasbfjaDjeealeja.',
    '.ajsjbkdademummya.',
    '.aEqcfkkakkmafmya.',
    '.ajjbfkbakkpaqzya.',
    '.ajsjfkeaknlablra.',
    '.ajrrrkaDjslullrra',
    '.assllrrrrrjqbprra',
    'akEpllyyyyqFFFirra',
    'afdnnnsssycFbFDkra',
    '.afkaGjsslcFFFyeaa',
    '.sca..akseejjjqqa.',
    '.aa....aavpmBBfa..',
    '.........aaaaaa...',
  ],
  colors: {
    a: '#000418',
    b: '#12101c',
    c: '#402824',
    d: '#4e3026',
    e: '#443633',
    f: '#362c2a',
    h: '#8e643e',
    i: '#222029',
    j: '#2b2122',
    k: '#43302a',
    l: '#644030',
    m: '#5c3a32',
    n: '#54362c',
    p: '#4a3a3a',
    q: '#22161e',
    r: '#6c4632',
    s: '#352222',
    t: '#e2a454',
    u: '#e7b560',
    v: '#171820',
    w: '#a57544',
    x: '#9c6e44',
    y: '#785436',
    z: '#584d49',
    A: '#9a643a',
    B: '#4c4240',
    C: '#774a33',
    D: '#82563a',
    E: '#301a1c',
    F: '#ecbe5f',
    G: '#f6c262',
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
  '#4c4240': 'warm',
  '#4e3026': 'warm',
  '#54362c': 'warm',
  '#584d49': 'warm',
  '#5c3a32': 'warm',
  '#644030': 'warm',
  '#6c4632': 'warm',
  '#774a33': 'warm',
  '#785436': 'warm',
  '#82563a': 'warm',
  '#8e643e': 'warm',
  '#9a643a': 'warm',
  '#9c6e44': 'warm',
  '#a57544': 'warm',
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
    '..cbcda..aa',
    '..abdda..aa',
    '.aefbaaa.a.',
    '.aeha......',
    '.aiia......',
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
    i: '#9c6e44',
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
  '#9c6e44': 'warm',
};

/** His near iron pauldron: rides the near shoulder. */
export const HOPLITE_LPAULDRON_N: PaintedPiece = {
  pivot: [7, 6],
  angle: 105.61,
  rows: [
    '......aaaa....',
    '.....abbbba...',
    'a...accbddda..',
    'aaaaeecbfhdda.',
    '.aaaeeicddddba',
    '...aiiiiibfffa',
    '...aebciijkcca',
    '...abdlciiibaa',
    '..abfdbccmaa..',
    '..aammnmma....',
    '....aaaaa.....',
  ],
  colors: {
    a: '#000418',
    b: '#443633',
    c: '#2b2122',
    d: '#4c4240',
    e: '#362c2a',
    f: '#4a3a3a',
    h: '#584d49',
    i: '#8e643e',
    j: '#222029',
    k: '#171820',
    l: '#352222',
    m: '#885d36',
    n: '#22161e',
  },
};

/** What each colour of HOPLITE_LPAULDRON_N is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const HOPLITE_LPAULDRON_N_KIND: Record<string, 'dark' | 'grey' | 'line' | 'warm'> = {
  '#000418': 'line',
  '#171820': 'dark',
  '#22161e': 'dark',
  '#222029': 'grey',
  '#2b2122': 'grey',
  '#352222': 'warm',
  '#362c2a': 'grey',
  '#443633': 'grey',
  '#4a3a3a': 'grey',
  '#4c4240': 'grey',
  '#584d49': 'grey',
  '#885d36': 'warm',
  '#8e643e': 'warm',
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
    '...aba',
    '....aa',
  ],
  colors: {
    a: '#000418',
    b: '#443633',
    c: '#4a3a3a',
    d: '#43302a',
    e: '#584d49',
    f: '#362c2a',
    h: '#a57544',
    i: '#6c4632',
  },
};

/** What each colour of HOPLITE_LPAULDRON_F is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const HOPLITE_LPAULDRON_F_KIND: Record<string, 'grey' | 'line' | 'warm'> = {
  '#000418': 'line',
  '#362c2a': 'grey',
  '#43302a': 'warm',
  '#443633': 'grey',
  '#4a3a3a': 'grey',
  '#584d49': 'grey',
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
    '.acccccccba.',
    'adddefffcba.',
    'ahijdeffca..',
    'aaakdddca...',
    '...aaidda...',
    '.....ala....',
    '......aa....',
  ],
  colors: {
    a: '#000418',
    b: '#152032',
    c: '#262f3e',
    d: '#a57544',
    e: '#304155',
    f: '#28374e',
    h: '#9a643a',
    i: '#82563a',
    j: '#43302a',
    k: '#d3994d',
    l: '#12101c',
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
  '#9a643a': 'warm',
  '#a57544': 'warm',
  '#d3994d': 'warm',
};

/** His far navy sleeve and gold cuff: rides the far shoulder. */
export const HOPLITE_SLEEVE_F: PaintedPiece = {
  pivot: [3, -2],
  angle: 84.29,
  rows: [
    '....a..',
    '...aba.',
    '...abba',
    '...aca.',
    '...aca.',
    '...ada.',
    '.aacefa',
    'ahhbfia',
    'ahjfka.',
    '.aaaa..',
  ],
  colors: {
    a: '#000418',
    b: '#152032',
    c: '#1f2638',
    d: '#262f3e',
    e: '#304155',
    f: '#54362c',
    h: '#352222',
    i: '#6c4632',
    j: '#4e3026',
    k: '#8e643e',
  },
};

/** What each colour of HOPLITE_SLEEVE_F is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const HOPLITE_SLEEVE_F_KIND: Record<string, 'line' | 'navy' | 'warm'> = {
  '#000418': 'line',
  '#152032': 'navy',
  '#1f2638': 'navy',
  '#262f3e': 'navy',
  '#304155': 'navy',
  '#352222': 'warm',
  '#4e3026': 'warm',
  '#54362c': 'warm',
  '#6c4632': 'warm',
  '#8e643e': 'warm',
};
