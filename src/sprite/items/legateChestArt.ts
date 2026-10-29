// The owner's Roman legate's grey cuirass with the gold eagle.
// Lifted from the owner's Roman legate (docs/reference/roman-legate-owner-reference.jpg) and
// brought down to our scale by tools/refs/legate-chest-from-ref.py (tools/refs/legate_ref.py).
// Generated: rerun the script to change it:
//   python3 -I tools/refs/legate-chest-from-ref.py src/sprite/items/legateChestArt.ts

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const LEGATE_STEEL = '#35343c';
export const LEGATE_GOLD = '#a3703a';

/** Where each piece lands in our male idle frame 0 (his joints), unturned: the fine pixel of its first row's first cell. */
export const LEGATE_CHEST_REST: Record<string, [number, number]> = {
  LEGATE_CHEST: [116, 147],
};

/** His grey cuirass: rides the neck, leaning with the torso. */
export const LEGATE_CHEST: PaintedPiece = {
  pivot: [11, 0],
  angle: -89.65,
  rows: [
    '.....aaa.....a.....',
    '..aaabcdaaaaabaa...',
    '..aeedffbbhheeba...',
    '..aceeccbfbbbbea...',
    '..aeeeebaddiidda...',
    '..aeeeebbbbbjjfa...',
    '..aebjbeeehheeaa...',
    '...abeeeehfche.....',
    '...abehfcfdfceb....',
    '..akjehhfcfdfdf....',
    '..aiibehefffefcedi.',
    '..alijbeeebbdffdkka',
    '.allikjjbbbjfdmmmja',
    'allikjnnnebffdmpmba',
    'aliijjninccbefpmmba',
    'aakjjjinnbeeeeeebja',
    '..abbkhqqqecchmmmba',
    '..aebjqhhqedfmhhmba',
    '...abdqhqqeefmhmmba',
    '..aabbqhhhcefmhhhka',
    '...aeebddefeefeffia',
    '..aaaebcbeeffdhffka',
    '..aaaaaafbbbehhebda',
    '........aajbehhedda',
    '..........aaaaaaaa.',
  ],
  colors: {
    a: '#000220',
    b: '#2e2e36',
    c: '#dca64e',
    d: '#82532c',
    e: '#35343c',
    f: '#a3703a',
    h: '#3e3a3e',
    i: '#262128',
    j: '#2e2826',
    k: '#282632',
    l: '#1b1c29',
    m: '#ba8447',
    n: '#af7637',
    p: '#241824',
    q: '#b28040',
  },
};

/** What each colour of LEGATE_CHEST is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const LEGATE_CHEST_KIND: Record<string, 'dark' | 'grey' | 'hair' | 'line' | 'purple' | 'warm'> = {
  '#000220': 'line',
  '#1b1c29': 'dark',
  '#241824': 'dark',
  '#262128': 'purple',
  '#282632': 'hair',
  '#2e2826': 'hair',
  '#2e2e36': 'hair',
  '#35343c': 'hair',
  '#3e3a3e': 'grey',
  '#82532c': 'warm',
  '#a3703a': 'warm',
  '#af7637': 'warm',
  '#b28040': 'warm',
  '#ba8447': 'warm',
  '#dca64e': 'warm',
};
