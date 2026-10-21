"""Aurelia's skirt and sash (docs/reference/aurelia-owner-reference.jpg, the owner's fourth heroine).

Her picture is not at our scale (tools/refs/heroine_ref.py: one of her pixels is about 0.48 of ours
across and 0.3 to 0.6 down; heroine_ref.reduced('aurelia') is her figure at our scale on our female at
idle frame 0). Nothing here is her pixels 1:1: every piece is drawn at our scale after her picture, in
her colours only (KEY: each one of heroine_ref.PALETTES['aurelia'], and checked to be common in her
picture where that piece is, REGION), on the reduced reference's places:

  waist    her gold sash round the waist (light, middle, light again and a dark fold, as her two
           folds), the brown belt under it (a row lower on the near side, as hers), its steel buckle,
           the leather pouch on the near hip with its flap and gold stud, the red charm on its gold
           cord beside it, and the gold sash end draped round the near hip under the pouch
  front    the long front panel under the belt: her line, the gold border, the white with the grey
           fold down its far side, her two embroideries (the lattice under the belt, the tree over the
           point) and the point
  near     the near side panel flaring back from the hip: her line, the grey of its edge turning
           back, the white face, the shade and the gold trim down its inner edge (the near leg stands
           in front of it), the hem slanting down toward the leg with its gold border, the gold edge
           of the turned part and her gold scrolls over the hem
  far      the far side panel beside the far leg: the grey of its inner face, the white strip with the
           gold trim down its inner edge, her line round it, the hem slanting down to its point, gold
           dots over the hem
  lining   the pale grey lining behind and between her legs (her picture hides most of it behind her
           legs: continued from what shows), in broad folds, darker under the skirt, its hem a little
           wavy

Each piece is placed on our female at idle frame 0 (fine pixels of our 256 x 256 frame) and given the
columns it hangs from (COLS: the top rides the torso, the bottom hangs below the hips); the game moves
those with the rig (src/sprite/items/aureliaLower.ts) and samples the piece between them, so at rest
every pixel is as drawn here.

It writes the TypeScript module and, in <study>, the pieces at 8x:

  python3 -I tools/refs/aurelia-lower-from-ref.py src/sprite/items/aureliaLowerArt.ts <study>

The same picture always gives the same bytes.
"""

import collections
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

import heroine_ref as R  # noqa: E402

WHICH = 'aurelia'

# Her colours, one character each (every one is in heroine_ref.PALETTES['aurelia']).
KEY = {
    'k': '#030101',  # her line
    'w': '#f9f2e1',  # cloth: lit
    'W': '#eadeca',  # cloth
    't': '#d2c2b2',  # cloth: shade; the lining's crests
    'c': '#d6c7b7',  # cloth: shade
    'C': '#c2b0a2',  # cloth: deep shade
    'T': '#b39f8f',  # the turned edges, the lining
    'F': '#a9968b',  # the turned edges, the lining
    'u': '#8b7675',  # the lining, the panels' inner faces
    'V': '#8e7b79',  # the lining: shade
    'y': '#fcd77a',  # gold: light
    'Y': '#ecc268',  # gold
    'G': '#deb05c',  # gold
    'o': '#d4a251',  # gold: shade
    'g': '#c4934c',  # gold: the embroidery
    'O': '#b88744',  # gold: deep shade
    'P': '#a9793c',  # gold: the sash's fold
    'p': '#966536',  # gold: the sash's deepest fold
    'B': '#86583d',  # gold: the sash's deepest fold
    'n': '#36221f',  # leather: darkest
    'N': '#4a312c',  # leather: dark
    'm': '#563832',  # leather: the belt's shade
    'b': '#6c4427',  # leather: shade
    'M': '#794f38',  # leather
    'D': '#8e6447',  # leather: lit
    'l': '#a17354',  # leather: light
    'J': '#b38761',  # leather: the flap's edge
    'E': '#acb1b6',  # steel
    's': '#5a4a42',  # steel: the buckle's dark
    'r': '#a02f36',  # the charm's red
    'R': '#7e2c34',  # the charm's red: shade
}
LINE = 'k'
# What each colour is, for the item's colour slots (her line and the charm's red keep hers).
_CLOTH = {c: 'cloth' for c in 'wWtcC'}
_GOLD = {c: 'gold' for c in 'yYGogOP'}
_LINING = {c: 'lining' for c in 'TFuV'}
ROLE = {
    'front': {**_CLOTH, **_GOLD},
    'near': {**_CLOTH, **_GOLD, **_LINING},
    'far': {**_CLOTH, **_GOLD, **_LINING},
    'lining': {**{c: 'lining' for c in 'tcC'}, **_LINING},
    'waist': {**{c: 'sash' for c in 'yYGogOPpB'}, **{c: 'leather' for c in 'nNmbMDlJ'}, **{c: 'buckle' for c in 'Es'}, 'c': 'buckle'},
}
# The colours each slot recolours from: at these every pixel stays hers.
BASE = {'cloth': 'w', 'gold': 'o', 'lining': 'u', 'sash': 'Y', 'leather': 'M', 'buckle': 'E'}

# Where in her picture (her pixels: x0, y0, x1, y1) each piece is: its colours must be common there.
REGION = {
    'waist': (76, 78, 132, 116),
    'front': (98, 94, 120, 168),
    'near': (36, 100, 80, 188),
    'far': (122, 110, 146, 186),
    'lining': (60, 120, 146, 186),
}
# The least number of her pixels of a colour in the piece's region (her buckle and charm are small).
COMMON = 3


def canvas(ops):
    """Rows from paint operations (y, x, text): '.' leaves a pixel, anything else paints it."""
    xs = [x for _, x, _ in ops] + [x + len(t) for _, x, t in ops]
    ys = [y for y, _, _ in ops]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys) + 1
    grid = [['.'] * (x1 - x0) for _ in range(y1 - y0)]
    for y, x, t in ops:
        for i, ch in enumerate(t):
            if ch != '.':
                grid[y - y0][x - x0 + i] = ch
    return (x0, y0), [''.join(r) for r in grid]


# The waist on our female's waist and hips (her body there: rows 166 .. 173, x 120 .. 139 at the top
# to 113 .. 141 at the hips). Back to front: the sash and the belt, the pouch, the charm, the drape.
WAIST = canvas([
    # the sash: her line; light; the middle; light again on the near side and the dark fold on the far
    # side, where the belt rides a row higher
    (166, 120, 'kkkkkkkkkkkkkkkkkkkk'),
    (167, 119, 'kyyyYYYYyyYYYYYYYGGook'),
    (168, 119, 'kgOgOOgOOgOOgOOgOPPPPk'),
    (169, 118, 'kYYGYYYYGPpPPPPPPPpppBk'),
    # the belt (lit top, dark below), the dark fold over it on the near side, the steel buckle
    (170, 117, 'kPpPPPpBccEMDlMMDlMMDMbk'),
    (171, 116, 'klMDlMMDMcsEmmNmmmNmmmNNmk'),
    (172, 115, 'kmmNmmmNmmEEskkkkkkkkkkkkkk'),
    (173, 113, 'kkkkkkkkkkkkkkk'),
    # the pouch on the near hip, its flap with the gold stud, its body under it
    (171, 112, '.kkkkkkk.'),
    (172, 112, 'klllllDMk'),
    (173, 112, 'klDylDMbk'),
    (174, 112, 'kDDDDMMbk'),
    (175, 112, 'kJJJJJJbk'),
    (176, 112, 'kmmmmmnnk'),
    (177, 112, 'kMDDMMMbk'),
    (178, 112, 'kbMMMMbNk'),
    (179, 112, '.kkkkkkk.'),
    # the red charm on its gold cord beside the pouch
    (172, 121, 'O'),
    (173, 121, 'ok'),
    (174, 121, 'rk'),
    (175, 121, 'rk'),
    (176, 121, 'Rk'),
    (177, 121, 'Ok'),
    (178, 121, 'k'),
    # the sash end hanging in a loop round the near hip under the pouch, up behind the hip at the back
    (179, 119, 'kkkk'),
    (180, 107, 'kk..........kyYok'),
    (181, 107, 'kyk......kkkyYoOk'),
    (182, 107, 'kYokkkkkkyYYYoOk'),
    (183, 108, 'koYyyYYYYooOOk'),
    (184, 109, 'kooOOOOOOPkk'),
    (185, 110, 'kkkkkkkkk'),
])

# The front panel (x 122 .. 131, rows 173 .. 200): her line, the gold border, the white with the grey
# fold down its far side, the lattice under the belt, the tree over the point, the point.
FRONT = ((122, 173), [
    'kYwwwwwtok',
    'kYwwwwwtok',
    'kYgwwwgtok',
    'kYwgggwtok',
    'kYgwgwgtok',
    'kYwgwgwtok',
    'kYwwgwwtok',
    'kYwgwgwtok',
    'kYgwwwgtok',
    'kYwwwwwtok',
    'kYwwwwttok',
    'kYwwwwtcok',
    'kYwwwwtcok',
    'kYwwwttcok',
    'kYwwwtcCok',
    'kYwwwtcCok',
    'kYwwwwtcok',
    'kYwwgwwtok',
    'kYwgYgwtok',
    'kYgwgwgtok',
    'kYggYggtok',
    'kYwgggwtok',
    'kYgwgwgCok',
    'kYwwgwwCok',
    '.kYwgwtok.',
    '..kYwtok..',
    '...kYok...',
    '....kk....',
])

# The near side panel (x 100 .. 115, rows 176 .. 206).
NEAR = ((100, 176), [
    '............kwok',
    '............kwok',
    '...........kTwok',
    '...........kTwok',
    '..........kTwtok',
    '..........kTwtok',
    '.........kFTwtok',
    '.........kFTwtok',
    '........kFTwwtok',
    '........kFTwwtok',
    '.......kuFTwwtok',
    '.......kuFtwwtok',
    '......kuFTtwwtok',
    '......kuFTtwwtok',
    '.....kuFTtwwwtok',
    '.....kuFTtwwwtok',
    '....kuFTtwwwwtok',
    '....kuFTtwwwwtok',
    '...kuFTtwwwwwtok',
    '...kuFTtwwwwwtok',
    '..kuFTtwgowwwtok',
    '..koFTtwowowwtok',
    '.koFTtwwwogwwtok',
    '.koTtwwwwwgowtok',
    '.kkootwwwwowotok',
    '...kkoowwwwogtok',
    '.....kkoowwwwtok',
    '.......kkoowttok',
    '.........kkootok',
    '...........kkoOk',
    '.............kkk',
])


def far_rows():
    """The far side panel: from the far hip down beside the far leg (its outer edge at rest: x 142 to
    row 193, then 141, 140, 139) to a point at the far side. Behind the leg, and between it and the
    strip, the grey of its inner face; the white strip with the gold trim down its inner edge; her
    line round it; the hem slanting down to the point with a gold border on the strip and two gold
    dots over it."""
    x0, y0, x1, y1 = 136, 175, 151, 208
    rows = []
    for y in range(y0, y1):
        xr = 142 + round((y - y0) * 7 / 30)
        row = ''
        for x in range(x0, x1):
            bot = 204 + max(0, x - 141) * 2 // 8
            if x > xr or y > bot:
                row += '.'
                continue
            if x == xr or y == bot or x == x0:
                row += LINE
                continue
            if y == bot - 1:
                ch = 'o' if x >= xr - 3 else 'V'
            elif x == xr - 3:
                ch = 'o'
            elif x == xr - 2:
                ch = 'w'
            elif x == xr - 1:
                ch = 't'
            elif x == xr - 4:
                ch = 'T'
            else:
                ch = 'V' if y < y0 + 9 else 'u'
            row += ch
        rows.append(row)
    # two gold dots over the hem on the strip
    for (x, y), ch in {(xr_at(200) - 2, 200): 'g', (xr_at(202) - 2, 202): 'o'}.items():
        r = rows[y - y0]
        rows[y - y0] = r[:x - x0] + ch + r[x - x0 + 1:]
    return (x0, y0), rows


def xr_at(y):
    return 142 + round((y - 175) * 7 / 30)


# Her lining's folds across the hem, back to front (x 117 .. 147): broad lit crests and shaded troughs
# of uneven widths, as hers between her legs and beside the far leg.
LINING_FOLDS = 'TtTFuVVuFTtcTFuuVuFTtTTFuVVuFTt'
# The folds fan out from a point above the waist (x, y) down to the hem.
LINING_APEX = (132, 150)


def lining_rows():
    """The lining behind both legs, from the hips to its hem: her greys in broad folds fanning out
    toward the hem, darker under the skirt at the top; the hem a little wavy, her line under her deep
    grey."""
    x0, y0, x1, y1 = 117, 176, 148, 207
    ax, ay = LINING_APEX
    dark = {'c': 'T', 't': 'T', 'T': 'F', 'F': 'u', 'u': 'V', 'V': 'V'}
    rows = []
    for y in range(y0, y1):
        xl = 118 - (y - y0) // 16
        xr = 141 + (y - y0) * 4 // 30
        row = ''
        for x in range(x0, x1):
            bot = 205 + ((x // 3) % 2)
            if x < xl or x > xr or y > bot:
                row += '.'
                continue
            if x == xl or x == xr or y == bot:
                row += LINE
                continue
            # the fold this pixel is on, where it meets the hem
            s = ax + (x + 0.5 - ax) * (206 - ay) / (y + 0.5 - ay)
            ch = LINING_FOLDS[int(np.clip(np.floor(s) - x0, 0, len(LINING_FOLDS) - 1))]
            if y < y0 + 8:
                ch = dark[ch]
            if y == bot - 1:
                ch = 'V' if ch in 'uVF' else 'u'
            row += ch
        rows.append(row)
    return (x0, y0), rows


# The columns each piece hangs from on our female at idle frame 0: (top x, top y, bottom x, bottom y),
# fine-pixel edges, left to right. The tops ride the torso; the bottoms hang (HANG) or ride it too.
COLS = {
    'lining': [(117, 176, 117, 207), (127, 176, 127, 207), (137, 176, 137, 207), (148, 176, 148, 207)],
    'far': [(136, 175, 136, 208), (151, 175, 151, 208)],
    'near': [(100, 176, 100, 207), (108, 176, 108, 207), (116, 176, 116, 207)],
    'front': [(122, 173, 122, 201), (132, 173, 132, 201)],
    'waist': [(107, 166, 107, 186), (126, 166, 126, 186), (143, 166, 143, 186)],
}
HANG = {'lining': True, 'far': True, 'near': True, 'front': True, 'waist': False}
# Rows at the top whose edges have no line of hers (they go under the belt).
OPEN_TOP = {'lining': 1, 'far': 1, 'near': 1, 'front': 1, 'waist': 0}
ORDER = ['lining', 'far', 'near', 'front', 'waist']


def pieces():
    return {
        'lining': lining_rows(),
        'far': far_rows(),
        'near': NEAR,
        'front': FRONT,
        'waist': WAIST,
    }


def check(name, origin, rows):
    w = len(rows[0])
    for r in rows:
        if len(r) != w:
            raise SystemExit(f'{name}: rows of different lengths ({len(r)} != {w})')
        for ch in r:
            if ch != '.' and ch not in KEY:
                raise SystemExit(f'{name}: {ch!r} is not one of her colours')
    pal = set(R.PALETTES[WHICH])
    for ch, h in KEY.items():
        if h not in pal:
            raise SystemExit(f'{ch} {h} is not in her palette')
    # every colour used is common in her picture where this piece is
    x0, y0, x1, y1 = REGION[name]
    q = R.quantize(R.native(WHICH)[y0:y1, x0:x1], WHICH)
    fig = R.figure(WHICH)[y0:y1, x0:x1]
    n = collections.Counter(R.PALETTES[WHICH][i] for i in q[fig].ravel())
    for ch in sorted({c for r in rows for c in r if c != '.'}):
        if n[KEY[ch]] < COMMON:
            raise SystemExit(f'{name}: {ch} {KEY[ch]} is not common in her picture there ({n[KEY[ch]]})')
    # the columns cover every pixel of the piece at rest
    cols = COLS[name]
    ox, oy = origin
    for j, r in enumerate(rows):
        for i, ch in enumerate(r):
            if ch == '.':
                continue
            x, y = ox + i + 0.5, oy + j + 0.5
            if not any(a[0] <= x <= b[0] and a[1] <= y <= a[3] for a, b in zip(cols, cols[1:])):
                raise SystemExit(f'{name}: pixel ({ox + i}, {oy + j}) is outside its columns')


def fill_rows(rows):
    """For each pixel of her line on the piece's edge (next to an empty pixel or the piece's border),
    the colour just inside it (the nearest pixel that is not her line), '.' elsewhere: the game puts
    that colour where such a pixel is pulled inside the moved piece."""
    H, W = len(rows), len(rows[0])
    at = lambda x, y: rows[y][x] if 0 <= x < W and 0 <= y < H else '.'
    out = []
    for y in range(H):
        row = ''
        for x in range(W):
            ch = rows[y][x]
            edge = ch == LINE and any(at(x + dx, y + dy) == '.' for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            if not edge:
                row += '.'
                continue
            inner = LINE
            for d in range(1, 4):
                near = [at(x + dx * d, y + dy * d) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, 1), (1, -1), (-1, -1))]
                near = [c for c in near if c not in '.' + LINE]
                if near:
                    inner = near[0]
                    break
            row += inner
        out.append(row)
    return out


def ts_module(ps):
    out = [
        "// Aurelia's skirt and sash after the owner's fourth heroine, at our scale in her colours",
        '// (tools/refs/aurelia-lower-from-ref.py from docs/reference/aurelia-owner-reference.jpg).',
        '// Generated: rerun the script to change it.',
        '',
        '/** A piece of hers on our female at idle frame 0 and the columns it hangs from (src/sprite/items/aureliaLower.ts). */',
        'export interface DawnPiece {',
        "  /** One character per colour of hers ('.' is empty). */",
        '  rows: string[];',
        "  /** For each pixel of her line on the piece's edge, the colour just inside it ('.' elsewhere). */",
        '  fill: string[];',
        '  /** The top-left pixel on our female at idle frame 0 (fine pixels of the 256 x 256 frame). */',
        '  origin: [number, number];',
        '  /** The columns it hangs from at rest, left to right: [top x, top y, bottom x, bottom y] (fine-pixel edges). */',
        '  cols: [number, number, number, number][];',
        '  /** Whether the bottoms of the columns hang (follow the thighs a little) or ride the torso with the tops. */',
        '  hang: boolean;',
        '  /** Rows at the top whose edges have no line of hers (they go under the belt). */',
        '  openTop: number;',
        '  /** Her colour of each character. */',
        '  colors: Record<string, string>;',
        "  /** The colour slot each character's colour belongs to (missing: hers always, as her line and the charm's red). */",
        '  roles: Record<string, string>;',
        '}',
        '',
        '/** Her line. */',
        f"export const DAWN_LINE = '{KEY[LINE]}';",
        '/** The colours the slots recolour from (at these every pixel stays hers). */',
        'export const DAWN_BASE: Record<string, string> = {',
    ]
    out += [f"  {k}: '{KEY[v]}'," for k, v in BASE.items()]
    out += ['};', '']
    docs = {
        'lining': 'The pale grey lining behind and between her legs, in broad folds, with its hem.',
        'far': 'The far side panel beside the far leg: its grey inner face, the white strip with its gold trim, the slanted hem.',
        'near': 'The near side panel flaring back from the hip: the turned grey edge, the white face, the gold trim, the slanted hem with her gold scrolls.',
        'front': 'The front panel under the belt: the gold border, the lattice under the belt, the tree over the point.',
        'waist': 'The gold sash, the belt with its steel buckle, the pouch with its gold stud, the red charm and the draped sash end.',
    }
    for name in ORDER:
        (ox, oy), rows = ps[name]
        used = sorted({c for r in rows for c in r if c != '.'}, key=lambda c: list(KEY).index(c))
        const = 'DAWN_' + name.upper()
        out.append(f'/** {docs[name]} */')
        out.append(f'export const {const}: DawnPiece = {{')
        out.append('  rows: [')
        out += [f"    '{r}'," for r in rows]
        out.append('  ],')
        out.append('  fill: [')
        out += [f"    '{r}'," for r in fill_rows(rows)]
        out.append('  ],')
        out.append(f'  origin: [{ox}, {oy}],')
        out.append('  cols: [' + ', '.join(f'[{a}, {b}, {c}, {d}]' for a, b, c, d in COLS[name]) + '],')
        out.append(f"  hang: {'true' if HANG[name] else 'false'},")
        out.append(f'  openTop: {OPEN_TOP[name]},')
        out.append('  colors: { ' + ', '.join(f"{c}: '{KEY[c]}'" for c in used) + ' },')
        roles = {c: ROLE[name][c] for c in used if c in ROLE[name]}
        out.append('  roles: { ' + ', '.join(f"{c}: '{v}'" for c, v in roles.items()) + ' },')
        out.append('};')
        out.append('')
    return '\n'.join(out).rstrip('\n') + '\n'


def study(ps, path):
    """The pieces on their places at rest, at 8x."""
    box = (96, 160, 152, 212)
    img = np.zeros((256, 256, 4), np.uint8)
    for name in ORDER:
        (ox, oy), rows = ps[name]
        for j, r in enumerate(rows):
            for i, ch in enumerate(r):
                if ch == '.':
                    continue
                h = KEY[ch]
                img[oy + j, ox + i] = (int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16), 255)
    crop = img[box[1]:box[3], box[0]:box[2]].astype(np.float64)
    a = crop[..., 3:4] / 255.0
    comp = (crop[..., :3] * a + np.array([226, 232, 240]) * (1 - a)).astype(np.uint8)
    tmp = path + '.tmp.png'
    Image.fromarray(comp).resize((comp.shape[1] * 8, comp.shape[0] * 8), Image.NEAREST).save(tmp)
    os.replace(tmp, path)


def main(out_ts, study_dir):
    ps = pieces()
    for name in ORDER:
        check(name, *ps[name])
    text = ts_module(ps)
    tmp = out_ts + '.tmp'
    with open(tmp, 'w') as f:
        f.write(text)
    os.replace(tmp, out_ts)
    os.makedirs(study_dir, exist_ok=True)
    study(ps, os.path.join(study_dir, 'aurelia-lower-pieces@8.png'))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
