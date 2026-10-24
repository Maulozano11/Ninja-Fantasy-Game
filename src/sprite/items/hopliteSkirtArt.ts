// The owner's navy pteruges skirt (skirt_hoplite).
// Lifted from the owner's bronze warrior (docs/reference/bronze-warrior-owner-reference.jpg) and
// brought down to our scale by tools/refs/bronze-skirt-from-ref.py (tools/refs/bronze_ref.py).
// Generated: rerun the script to change it:
//   python3 -I tools/refs/bronze-skirt-from-ref.py src/sprite/items/hopliteSkirtArt.ts

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const HOPLITE_SKIRT_NAVY = '#2b3b52';
export const HOPLITE_SKIRT_LEATHER = '#4a332e';

/** Where each piece lands in our male idle frame 0 (his joints), unturned: the fine pixel of its first row's first cell. */
export const HOPLITE_SKIRT_REST: Record<string, [number, number]> = {
  HOPLITE_SKIRT: [115, 169],
};

/** His skirt: hangs from the pelvis; the game cuts it into panels down his seams. */
export const HOPLITE_SKIRT: PaintedPiece = {
  pivot: [12, 13],
  angle: -87.46,
  rows: [
    '..aaaaaaaaaaaaaaaaaaaaa....',
    '..abcdefhijjjjijjjjjjka....',
    '..alcdediiijjjjjjjjjjika...',
    '..amcclnfiimjjjjjjjjjpka...',
    '..amcqchrsstujjaaattjkaa...',
    '...avvwxryuuuta...atta.....',
    '...amcwxryyuttva.attta.....',
    '...amzAzryyjttataaattta....',
    '..ambzczBCajjtajjjatja.....',
    '.aDmzzlnfasajjajjjajjaa....',
    'aeemzdlffaijjjajjjajjaEa...',
    '.aebdeeDFasjjjajjjajjaffa..',
    '..allccGaiajjaijjjajjaiHqa.',
    '..alcccHakajjaijjjajjaiEEa.',
    '.aAdeAccakatjaijjjajjaizEEa',
    '.atcAtcfikaujaijjjaujaifza.',
    '.aiiileakkIIIaittjapJJkiza.',
    'aiiiiiaikkIAAiiattaflkkia..',
    'aEiiKkCikkipdkkIIIIaHdkiKa.',
    'aLLLLkikkkkiakkLLLiaikkkLa.',
    'aakLkLLLkkkiakkLkLkaikLLka.',
    '..aaaLkLLLLLakkkikkaLLkLaa.',
    '.....aakkLkLaLLkkkLakLaa...',
    '.......aaaaaaLkkkMkaaa.....',
    '............aaaaaaaa.......',
  ],
  colors: {
    a: '#010216',
    b: '#4e2e25',
    c: '#764830',
    d: '#603c2e',
    e: '#6a3e2c',
    f: '#a66e41',
    h: '#dc9e54',
    i: '#172236',
    j: '#4a332e',
    k: '#2b3b52',
    l: '#56342a',
    m: '#442824',
    n: '#c58747',
    p: '#ac743a',
    q: '#85583a',
    r: '#14111c',
    s: '#202737',
    t: '#2e1a1c',
    u: '#22151a',
    v: '#2c2223',
    w: '#9c6842',
    x: '#1a1a20',
    y: '#6c4434',
    z: '#8e5a36',
    A: '#362222',
    B: '#bb8047',
    C: '#080e20',
    D: '#7c4d38',
    E: '#96603a',
    F: '#e4af5e',
    G: '#b37344',
    H: '#9d6738',
    I: '#e1a83c',
    J: '#3c241a',
    K: '#25354c',
    L: '#daac5c',
    M: '#263041',
  },
};

/** What each colour of HOPLITE_SKIRT is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const HOPLITE_SKIRT_KIND: Record<string, 'dark' | 'line' | 'navy' | 'warm'> = {
  '#010216': 'line',
  '#080e20': 'dark',
  '#14111c': 'dark',
  '#172236': 'navy',
  '#1a1a20': 'dark',
  '#202737': 'navy',
  '#22151a': 'dark',
  '#25354c': 'navy',
  '#263041': 'navy',
  '#2b3b52': 'navy',
  '#2c2223': 'warm',
  '#2e1a1c': 'warm',
  '#362222': 'warm',
  '#3c241a': 'warm',
  '#442824': 'warm',
  '#4a332e': 'warm',
  '#4e2e25': 'warm',
  '#56342a': 'warm',
  '#603c2e': 'warm',
  '#6a3e2c': 'warm',
  '#6c4434': 'warm',
  '#764830': 'warm',
  '#7c4d38': 'warm',
  '#85583a': 'warm',
  '#8e5a36': 'warm',
  '#96603a': 'warm',
  '#9c6842': 'warm',
  '#9d6738': 'warm',
  '#a66e41': 'warm',
  '#ac743a': 'warm',
  '#b37344': 'warm',
  '#bb8047': 'warm',
  '#c58747': 'warm',
  '#daac5c': 'warm',
  '#dc9e54': 'warm',
  '#e1a83c': 'warm',
  '#e4af5e': 'warm',
};
