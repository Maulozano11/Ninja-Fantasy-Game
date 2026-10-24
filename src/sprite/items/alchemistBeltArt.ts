// The alchemist's belt with its buckle, potion vials and satchel: the owner's pixels from his sheet of Aurelia's outfits
// (docs/reference/aurelia-outfits-owner-reference.jpg), brought down to our scale by
// tools/refs/aurelia-alchemist-belt-from-ref.py (tools/refs/aurelia_outfits_ref.py). Generated: rerun the script to change it.

import type { SkirtPiece } from './aureliaLower';

/** His black line (never recoloured). */
export const ALCH_BELT_LINE = '#000008';
/** The colours the slots recolour from: at these every pixel stays his. */
export const ALCH_BELT_BASE: Record<string, string> = {
  leather: '#342222',
  metal: '#7a7a78',
  glass: '#0a1920',
  gold: '#966842',
};
/** The letters of each slot's colours. */
export const ALCH_BELT_CHARS: Record<string, string> = {
  leather: '!#$0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefhijlmnpqrstuvwxyz',
  metal: '%&()*+,-/:;<=',
  glass: '>?@[]^_{|}~',
  gold: 'ÀÁÂÃ',
};

/** The band round the waist (it rides the torso). */
export const ALCH_BELT_BAND: SkirtPiece = {
  rows: [
    '.......................ck.',
    '........kk^^[F.......$cck.',
    '......kkXXpy^G...T~PZ$$cck',
    '......k;;ÁFFÀ2rn-*:lHHccdk',
    '......k]#(>E,mK}%%Tt|Acddk',
    '......k])<wÁi9R!;VTs}Tc3dk',
    '.....ku8/J&>?X5{{=1XXTvXd.',
    'Yk..kSSGnn@?{D5{{wN}WÃÃ...',
  ],
  fill: [
    '........................c.',
    '........X^..............c.',
    '......;X.................c',
    '......;..................d',
    '......]..................d',
    '......]..................d',
    '.....u....................',
    '.Y..S.....................',
  ],
  origin: [111, 163],
  cols: [[111, 163, 111, 171], [124, 163, 124, 171], [137, 163, 137, 171]],
  hang: false,
  openTop: 0,
  front: 0,
  colors: { k: '#000008', '!': '#141312', '#': '#0e0a12', '$': '#000518', '%': '#fcfeff', '&': '#e8fce7', '(': '#dfded6', ')': '#cce3df', '*': '#d0d2ce', ',': '#a6a9a0', '-': '#9ea79c', '/': '#909e9e', '1': '#201a26', '2': '#281811', '3': '#281425', '5': '#181a1a', '8': '#250c22', '9': '#161220', ':': '#888b84', ';': '#7a7a78', '<': '#767470', '=': '#6e6c6c', '>': '#7c8c90', '?': '#25565e', '@': '#36444c', A: '#745041', D: '#704b38', E: '#624e48', F: '#68493e', G: '#6a4436', H: '#544a44', J: '#5a4431', K: '#62402c', N: '#583a30', P: '#4c3634', R: '#443032', S: '#4a2c20', T: '#462a28', V: '#342a32', W: '#382828', X: '#342222', Y: '#2e2230', Z: '#282022', '[': '#203a36', ']': '#3c0a2e', '^': '#102222', c: '#c69c76', d: '#bc8965', i: '#986c5a', l: '#8e6658', m: '#7c6c64', n: '#8b664a', p: '#7d6756', r: '#895c46', s: '#776054', t: '#805c44', u: '#6c5c5a', v: '#725a4e', w: '#765846', y: '#6c544a', '{': '#0a1920', '|': '#200f12', '}': '#180a10', '~': '#140408', À: '#d09d67', Á: '#a07454', Ã: '#966842' },
  roles: { '!': 'leather', '#': 'leather', '$': 'leather', '%': 'metal', '&': 'metal', '(': 'metal', ')': 'metal', '*': 'metal', ',': 'metal', '-': 'metal', '/': 'metal', '1': 'leather', '2': 'leather', '3': 'leather', '5': 'leather', '8': 'leather', '9': 'leather', ':': 'metal', ';': 'metal', '<': 'metal', '=': 'metal', '>': 'glass', '?': 'glass', '@': 'glass', A: 'leather', D: 'leather', E: 'leather', F: 'leather', G: 'leather', H: 'leather', J: 'leather', K: 'leather', N: 'leather', P: 'leather', R: 'leather', S: 'leather', T: 'leather', V: 'leather', W: 'leather', X: 'leather', Y: 'leather', Z: 'leather', '[': 'glass', ']': 'glass', '^': 'glass', c: 'leather', d: 'leather', i: 'leather', l: 'leather', m: 'leather', n: 'leather', p: 'leather', r: 'leather', s: 'leather', t: 'leather', u: 'leather', v: 'leather', w: 'leather', y: 'leather', '{': 'glass', '|': 'glass', '}': 'glass', '~': 'glass', À: 'gold', Á: 'gold', Ã: 'gold' },
  line: '#000008',
};

/** What hangs from it, swinging a little with the thighs. */
export const ALCH_BELT_HANG: SkirtPiece = {
  rows: [
    'Yk..zzzLGjW5ZaABFR0.MÂÂ',
    'Yk..fffLeÁX4TbF......Â.',
    '...kZ~+LvXX1Xk.........',
    '...hhjqqqU7K$x.........',
    '...FFFDL~UXCkÃ.........',
    '...727Dv}TKk0k.........',
    '..k{{XQA}XWOk..........',
    '...k{6_}_kIqk..........',
  ],
  fill: [
    '.Y.....................',
    '.Y.....................',
    '...Z.........X.........',
    '.......................',
    '.......................',
    '.............0.........',
    '..{.........O..........',
    '...{.....I..q..........',
  ],
  origin: [111, 171],
  cols: [[111, 171, 111, 179], [134, 171, 134, 179]],
  hang: true,
  openTop: 0,
  front: 0,
  colors: { k: '#000008', '$': '#000518', '+': '#c2b8b3', '0': '#2e1e18', '1': '#201a26', '2': '#281811', '4': '#1f1812', '5': '#181a1a', '6': '#0f1c18', '7': '#1e131a', A: '#745041', B: '#6c543d', C: '#7a4f30', D: '#704b38', F: '#68493e', G: '#6a4436', I: '#62423f', K: '#62402c', L: '#643c38', M: '#5a403a', O: '#443d32', Q: '#4c302c', R: '#443032', T: '#462a28', U: '#402820', W: '#382828', X: '#342222', Y: '#2e2230', Z: '#282022', _: '#2a161a', a: '#d9bda8', b: '#d0aa98', e: '#a68064', f: '#a06f62', h: '#8e7560', j: '#896e58', q: '#866256', v: '#725a4e', x: '#7e5440', z: '#765238', '{': '#0a1920', '}': '#180a10', '~': '#140408', Á: '#a07454', Â: '#a4713e', Ã: '#966842' },
  roles: { '$': 'leather', '+': 'metal', '0': 'leather', '1': 'leather', '2': 'leather', '4': 'leather', '5': 'leather', '6': 'leather', '7': 'leather', A: 'leather', B: 'leather', C: 'leather', D: 'leather', F: 'leather', G: 'leather', I: 'leather', K: 'leather', L: 'leather', M: 'leather', O: 'leather', Q: 'leather', R: 'leather', T: 'leather', U: 'leather', W: 'leather', X: 'leather', Y: 'leather', Z: 'leather', _: 'glass', a: 'leather', b: 'leather', e: 'leather', f: 'leather', h: 'leather', j: 'leather', q: 'leather', v: 'leather', x: 'leather', z: 'leather', '{': 'glass', '}': 'glass', '~': 'glass', Á: 'gold', Â: 'gold', Ã: 'gold' },
  line: '#000008',
};
