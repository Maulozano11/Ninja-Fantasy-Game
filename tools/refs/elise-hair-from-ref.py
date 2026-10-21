"""The owner's Elise (docs/reference/elise-owner-reference.jpg): her hair as the hair_golden_fall
hairstyle.

His picture is his own pixel art at about 1.8 to 2 of his pixels to one of ours on her head and 2.4
to 2.7 on her body (heroine_ref.py SEGMENTS), so her hair is not copied 1:1: it is brought down to our scale on our
female idle (frame 0) in her own colours only (heroine_ref.PALETTES['elise']: every character below
is one of them; the script checks), fitted to our female head and back. Her hair is long, straight
and blonde, lit from the upper left: a smooth crown, side-swept bangs over the brow in her darker
golds and browns, a long lock in front of the near ear down over the collar, a lock framing the far
cheek, the gold flower ornament above the near temple, and behind her the long fall down to the
waist, sweeping out to the left in a broad mass of strands with a loose strand at its top.

  head     the reduced reference's head (tools/refs/heroine-study.py, heroine_ref.reduced()) is the
           start: her crown, bangs and side locks as reduced there, cleaned by hand where one sample a
           pixel left a speck or a smudge; her ornament redrawn as the flower it is (her outline,
           her golds, her spiral, a highlight on the upper petal) where the reduction left a brown
           blob; her bangs' tips taken down to our lashes, as hers touch her eyes; her near lock
           taken on down over the collar as she has it (the reduced reference stops it at the jaw);
           her far lock behind the far cheek, so our far eye shows in front of it
  fall     the long hair down her back, drawn at our scale after her picture (the reduced
           reference draws it as a plain band): the outer edge sweeping out to the left from the
           back of the head and in again to the tips, her light streaks on the outer strands, her
           darker golds and browns between them and toward the body (in the shade of her arm),
           a loose strand at the top outside the mass, and her tips; behind our near arm and back it
           goes on as she has it between her arm and her back

and splits it like the owner's other hair (valiant-hair-from-ref.py, scarlet-hair-from-ref.py):

  front    over the head (hairFront): the crown, the bangs, the ornament, the hair over the back of
           the skull above the ear, the near lock in front of the ear and down over the collar, and
           the far lock above the far eye. Where her picture shows forehead or ear, our head shows.
  back     behind the head (hairBack): all of the head's hair, with the mass behind the head down to
           the shoulders, the far lock down to the jaw (our face in front of it) and what the face
           hides filled in (the forehead between the bangs with the strand above it, the rest in her
           shadow brown). It is also the head's outline above the eyes: the game trims our skull to it.
  fall     behind the body (hairBack, under the back): it hangs from the back of the head (its pivot,
           FALL_PIVOT, rides the face anchor) and turns with the torso (stampPiece with RotSprite), so
           it trails behind when she leans in and lies along her back when she is down. The loose
           strand at its top is a piece of its own (WISP), left out when she lies down.

It writes, in <out>:

  hair.json          rows, palette (one character per colour of hers), pivots, the line and bases
  study/front@8.png  the front, at 8x
  study/back@8.png   the back, the filled-in pixels marked
  study/fall@8.png   the fall, with the loose strand
  study/ref@8.png    the reduced reference's head and hair there, at 8x

and, with a third argument, the game's module (src/sprite/items/eliseHairArt.ts). The same input
always gives the same bytes. Run from the repo root with python3 -I:

  python3 -I tools/refs/elise-hair-from-ref.py <out> [src/sprite/items/eliseHairArt.ts]
"""

import json
import math
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import heroine_ref as R  # noqa: E402

# Her hair's colours (all of them hers: heroine_ref.PALETTES['elise']), one character each. Her line
# is her darkest (k, K: never recoloured); 'n' and '7' are her dark browns round the fall and the
# ornament, which follow the hair's colour.
KEY = {
    'k': '#080613', 'K': '#1a101a', 'n': '#342325', '7': '#4c2924', 'a': '#573027', 'b': '#683c30', 'c': '#764534',
    'd': '#804936', 'e': '#865339', 'f': '#905f3c', 'g': '#a47043', 'G': '#b27b44', 'h': '#b88652', 'i': '#c48d52', 'j': '#cb9658',
    'J': '#cf9b48', 'l': '#d4a362', 'L': '#ddac5a', 'm': '#dcb06e', 'M': '#e6b75e', 'o': '#ecc476', 'p': '#f4d389',
    'q': '#f8dc92', 'r': '#fce89e', 's': '#feeeb8',
}
# Her gold flower above the near temple: its own characters (the Ornament colour slot recolours them).
ORNAMENT_KEY = {'1': '#342325', '2': '#683c30', '3': '#a47043', '4': '#cf9b48', '5': '#ddac5a', '6': '#e6b75e',
                '8': '#f4d389', '9': '#fce89e'}
LINE = 'kK'
# The colour slots' defaults: her blonde on the lit face of most of her hair, and the ornament's gold.
HAIR_BASE = '#f8dc92'
ORNAMENT_BASE = '#ddac5a'

# Our face anchor (body.ts faceAnchor: the near eye's lash start) on our female at idle frame 0:
# floor((head.x - 1.9 k) RES), floor((head.y + k) RES) with the head at heroine_ref.OUR_JOINTS['head']
# and the female head scale k.
HEAD_SCALE = 0.76
ANCHOR = (int(np.floor(R.OUR_JOINTS['head'][0] - 3.8 * HEAD_SCALE)), int(np.floor(R.OUR_JOINTS['head'][1] + 2 * HEAD_SCALE)))
# The cell of the fall that hangs from the head (our frame, idle): the back of the head over the near
# shoulder. And our torso's angle at idle frame 0 (the female rig leans 2 degrees back): the fall
# turns from it as the torso turns.
FALL_PIVOT = (110, 147)
IDLE_LEAN = -2.0
SPINE = math.degrees(math.atan2(-math.cos(math.radians(IDLE_LEAN)), math.sin(math.radians(IDLE_LEAN))))


def rows_from(spec, x0, x1):
    """{row: (first x, text)} in our frame -> (x0, y0, rows): ' ' and '.' are empty."""
    ys = sorted(spec)
    out = []
    for y in range(ys[0], ys[-1] + 1):
        r = ['.'] * (x1 - x0)
        if y in spec:
            sx, t = spec[y]
            for i, ch in enumerate(t):
                if ch not in ' .':
                    assert x0 <= sx + i < x1, (y, sx + i)
                    r[sx + i - x0] = ch
        out.append(''.join(r))
    return x0, ys[0], out


# Her head's hair in our frame (x 104-139, rows 126-156): the reduced reference's, cleaned by hand.
HEAD = rows_from({
    126: (117, 'KKkkkkkkkkkK'),
    127: (115, 'KkqqqppoqqoGmpkK'),
    128: (114, 'krqqpopqqpopqqmpqkk'),
    129: (113, 'krrqqpqqqqqqqqqqopjpk'),
    130: (112, 'kppsrrqqqqqqqoqqqqqppqk'),
    131: (111, 'Kqoqrqqsqqqqqpqqqqqqrgqqk'),
    132: (111, 'kpoqqqqqesrrpqqqqprqrgpppk'),
    133: (111, 'kppp111qrrrresqrorsqs7qrqk'),
    134: (110, 'Kppp18963qqqeqosrpsqqrbbsok'),
    135: (110, 'kppq162361qqeqqpopqdqp jlprk'),
    136: (110, 'kppq1582561flopmeqcdqb  jrsk'),
    137: (110, 'klqqp14531qjmmljlmjdjl  jppk'),
    138: (110, 'klqqlqjiqoqll j  j  jd  djllk'),
    139: (110, 'klqqlmdnqoqdb         j djlbk'),
    140: (110, 'klqppo cqpqd            dlqk'),
    141: (109, 'Kllqpre  qlqd            dlqk'),
    142: (109, 'kllqlre  qqpe            dlqk'),
    143: (109, 'kllqlred qplq            dlqk'),
    144: (108, 'Klllqsqhdcqpmoq          dlqk'),
    145: (108, 'kmplosmcddqqo            dlpk'),
    146: (107, 'klpkrpsdjddmqo           ddlpk'),
    147: (107, 'kkrrpJpdjddlqqb          ddljk'),
    148: (106, 'kkrrppJpjjdhjrqd          dljk'),
    149: (117, 'kqpld           djk'),
    150: (118, 'kqpdk          dk'),
    151: (118, 'kqldk           k'),
    152: (119, 'kpjk'),
    153: (119, 'kpdk'),
    154: (120, 'klk'),
    155: (120, 'kjk'),
    156: (121, 'k'),
}, 104, 140)
# What of the head goes behind it only (x0, y0, x1, y1; exclusive): the mass behind the head below the
# ear, and the far lock below the far eye's lashes (our far cheek in front of it).
BACK_ONLY = [(104, 140, 117, 149), (132, 140, 140, 152)]
# The rows where the back fills in what the face hides, and the last row of the forehead (above it the
# fill takes the strand above it; below, her shadow brown).
FILL_ROWS = (133, 148)
FOREHEAD_TO = 140
SHADOW = 'c'

# The fall in our frame (x 94-125, rows 138-179), drawn at our scale after her picture. Its top rows go
# on under the head's hair (hidden at idle) so the joint stays covered when the fall turns.
FALL = rows_from({
    138: (112, 'rsqplpqoljpql'),
    139: (112, 'rsqplpqoljpql'),
    140: (112, 'rsqplpqoljpql'),
    141: (111, 'rsqplpqoljpqll'),
    142: (111, 'rsqplpqoljpqll'),
    143: (111, 'rsqplpqoljpqll'),
    144: (110, 'rsqplpqoljpqllj'),
    145: (110, 'rsqplpqoljpqllj'),
    146: (109, 'rsqplpqoljpqlljd'),
    147: (109, 'rsqplpqoljpqlljd'),
    148: (108, 'rsqplpqoljpqlljdj'),
    149: (105, 'Krsqplpqoljpqlljdjjj'),
    150: (104, 'Krsqplpqoljpqlljdjjji'),
    151: (103, 'Krsqplpqoljpqlljdjjjid'),
    152: (102, 'Krsqplpqoljpqlljdjjjidd'),
    153: (101, 'Krsqplpqoljpqlljdjjjiddi'),
    154: (100, 'Krsqplpqoljpqlljdjjjiddij'),
    155: (100, 'Krsqplpqoljpqlljdjjjiddij'),
    156: (99, 'Krsqplpqoljpqlljdjjjiddijj'),
    157: (99, 'Krsqplpqoljpqlljdjjjiddijj'),
    158: (98, 'Krsqplpqoljpqlljdjjjiddijjj'),
    159: (98, 'Krsqplpqoljpqlljdjjjiddijjj'),
    160: (98, 'Krqqplpqoljpplljdjjjiddijjj'),
    161: (98, 'Krqqplpqoljpplljdjjjiddijjj'),
    162: (98, 'Krqqplpqoljpplljdjjjiddijjj'),
    163: (98, 'Krqqplpqoljpplljdjjjiddijjj'),
    164: (98, 'Krqqplpqoljpplljdjjjiddijjj'),
    165: (98, 'Krqqplpqoljpplljdjjjiddijjj'),
    166: (99, 'Kqqplpqoljpplljdjjjiddijjj'),
    167: (99, 'Kqqplpqoljpplljdjjjiddijjj'),
    168: (99, 'Kqpj7pqoljpplljdjjjiddijjj'),
    169: (100, '7j77pqljjpplljdjjjiddijjj'),
    170: (101, '7 7lpjdjpplljdjjjiddijjj'),
    171: (104, '7lj7jpplljdjjjiddijjj'),
    172: (105, '7j7lpplljdjjjiddijjj'),
    173: (106, '7 7pllljdjjjiddijjj'),
    174: (109, '7lj7jdjjjiddijjj'),
    175: (110, '7i7jdjjjiddijjj'),
    176: (111, '7 7djjj7ddijjj'),
    177: (114, '7jj7 7dij7'),
    178: (115, '77   7i7'),
    179: (121, '7'),
}, 94, 126)

# A loose strand at the top of the fall, outside the mass (its own piece: it rides with the fall, but
# is left out when she lies down, where it would stand up off her back).
WISP = rows_from({
    150: (102, 'lo'),
    151: (100, 'll'),
    152: (99, 'l'),
    153: (98, 'l'),
    154: (97, 'l'),
    155: (97, 'j'),
    156: (96, 'l'),
    157: (96, 'l'),
    158: (96, 'j'),
    159: (96, '7'),
}, 94, 126)


def grid(piece):
    x0, y0, rows = piece
    a = np.full((256, 256), '.', dtype='<U1')
    for j, r in enumerate(rows):
        for i, ch in enumerate(r):
            a[y0 + j, x0 + i] = ch
    return a


def build():
    """(front, back, filled, fall, wisp) as (256, 256) character grids ('.' empty) in our frame."""
    head = grid(HEAD)
    on = head != '.'
    back_only = np.zeros(head.shape, bool)
    for x0, y0, x1, y1 in BACK_ONLY:
        back_only[y0:y1, x0:x1] = True
    front = np.where(back_only, '.', head)
    # the back: the head's hair, and what the face hides from the hair's first column to its last in
    # each row: on the forehead the strand above it (her line left out), lower down her shadow brown
    back = head.copy()
    filled = np.zeros(head.shape, bool)
    for y in range(FILL_ROWS[0], FILL_ROWS[1] + 1):
        cols = np.nonzero(on[y])[0]
        for x in range(cols[0], cols[-1] + 1):
            if on[y, x]:
                continue
            src = SHADOW
            if y <= FOREHEAD_TO:
                src = next((back[q, x] for q in range(y - 1, 0, -1) if back[q, x] not in '.kK'), SHADOW)
                if src in ORNAMENT_KEY:
                    src = SHADOW
            back[y, x] = src
            filled[y, x] = True
    return front, back, filled, grid(FALL), grid(WISP)


def colours():
    pal = {**KEY, **ORNAMENT_KEY}
    hers = set(R.PALETTES['elise'])
    for ch, h in pal.items():
        assert h in hers, f'{ch} {h} is not one of her colours'
    return pal


def rows_of(a):
    ys, xs = np.nonzero(a != '.')
    x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1
    return (x0, y0), [''.join(a[y, x0:x1]) for y in range(y0, y1)]


def main():
    out = sys.argv[1]
    os.makedirs(os.path.join(out, 'study'), exist_ok=True)
    pal = colours()
    front, back, filled, fall, wisp = build()
    for a in (front, back, fall, wisp):
        assert set(a.ravel().tolist()) <= set(pal) | {'.'}, set(a.ravel().tolist()) - set(pal)
    meta = {'source': R.REFS['elise'], 'anchor': list(ANCHOR), 'line': LINE, 'base': HAIR_BASE,
            'ornament': ''.join(ORNAMENT_KEY), 'ornamentBase': ORNAMENT_BASE}
    used = set()
    for name, a in (('front', front), ('back', back), ('fall', fall), ('wisp', wisp)):
        (ox, oy), rows = rows_of(a)
        used |= set(''.join(rows)) - {'.'}
        piv = (ANCHOR[0] - ox, ANCHOR[1] - oy) if name in ('front', 'back') else (FALL_PIVOT[0] - ox, FALL_PIVOT[1] - oy)
        meta[name] = {'origin': [ox, oy], 'pivot': list(piv), 'rows': rows}
    meta['fall']['at'] = [FALL_PIVOT[0] - ANCHOR[0], FALL_PIVOT[1] - ANCHOR[1]]
    meta['fall']['angle'] = round(SPINE, 2)
    meta['palette'] = {ch: h for ch, h in pal.items() if ch in used}
    assert HAIR_BASE in meta['palette'].values() and ORNAMENT_BASE in meta['palette'].values()
    tmp = os.path.join(out, 'hair.json.tmp')
    with open(tmp, 'w') as f:
        json.dump(meta, f, indent=1)
        f.write('\n')
    os.replace(tmp, os.path.join(out, 'hair.json'))
    if len(sys.argv) > 2:
        write_ts(meta, sys.argv[2])

    def rgba(a, box, mark=None):
        x0, y0, x1, y1 = box
        im = np.zeros((y1 - y0, x1 - x0, 4), np.uint8)
        for y in range(y0, y1):
            for x in range(x0, x1):
                ch = a[y, x]
                if ch != '.':
                    h = pal[ch]
                    im[y - y0, x - x0] = [int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16), 255]
                    if mark is not None and mark[y, x] and (x + y) % 2:
                        im[y - y0, x - x0] = [0, 200, 255, 255]
        return im

    box = (92, 122, 142, 180)
    R.save(rgba(front, box), os.path.join(out, 'study', 'front@8.png'))
    R.save(rgba(back, box, filled), os.path.join(out, 'study', 'back@8.png'))
    R.save(rgba(np.where(wisp != '.', wisp, fall), box), os.path.join(out, 'study', 'fall@8.png'))
    ref = R.reduced('elise')
    parts = R.reduced_parts('elise')
    m = parts['head'] | parts['hair']
    x0, y0, x1, y1 = box
    crop = np.where(m[y0:y1, x0:x1, None], ref[y0:y1, x0:x1], 0)
    R.save(crop, os.path.join(out, 'study', 'ref@8.png'))
    print('front', int((front != '.').sum()), 'back', int((back != '.').sum()), 'fall', int((fall != '.').sum()),
          'px;', len(meta['palette']), 'colours; anchor', ANCHOR, 'fall at', meta['fall']['at'], 'angle', meta['fall']['angle'])


def write_ts(meta, path):
    """The hair as the game's module (src/sprite/items/eliseHairArt.ts)."""
    key = lambda k: k if re.match(r'^[A-Za-z_$][A-Za-z0-9_$]*$', k) else "'" + k + "'"
    out = [
        "// The owner's Elise: her hair brought down to our scale in her colours",
        '// (tools/refs/elise-hair-from-ref.py from docs/reference/elise-owner-reference.jpg).',
        '// Generated: rerun the script to change it.',
        '',
        "import type { PaintedPiece } from '../painted';",
        "import type { PaintedPart } from './capeArt';",
        '',
        '/** One character per colour of hers (the three parts share them). */',
        'const ELISE_HAIR_COLORS: Record<string, string> = {',
    ]
    out += [f"  {key(k)}: '{v}'," for k, v in meta['palette'].items()]
    out += ['};', '']
    for part, name, doc in (
        ('front', 'ELISE_HAIR_FRONT', "Over the head: her crown, bangs, ornament and side locks. Its pivot is the cell on our face anchor (the near eye's lash start)."),
        ('back', 'ELISE_HAIR_BACK', 'Behind the head: all of its hair, the mass behind it down to the shoulders and the far lock down to the jaw, with what the face hides filled in; also the head\'s outline above the eyes.'),
    ):
        px, py = meta[part]['pivot']
        out += [f'/** {doc} */', f'export const {name}: PaintedPart = {{', f'  pivot: [{px}, {py}],', '  rows: [']
        out += [f"    '{rw}'," for rw in meta[part]['rows']]
        out += ['  ],', '  colors: ELISE_HAIR_COLORS,', '};', '']
    f = meta['fall']
    for part, name, doc in (
        ('fall', 'ELISE_HAIR_FALL', 'The long fall down her back, behind the body: it hangs from the back of the head and turns with the torso (`angle` is our torso\'s at idle).'),
        ('wisp', 'ELISE_HAIR_WISP', 'The loose strand at the top of the fall, outside the mass: it rides with the fall (the same pivot).'),
    ):
        px, py = meta[part]['pivot']
        out += [f'/** {doc} */', f'export const {name}: PaintedPiece = {{', f'  pivot: [{px}, {py}],', f"  angle: {f['angle']:.2f},", '  rows: [']
        out += [f"    '{rw}'," for rw in meta[part]['rows']]
        out += ['  ],', '  colors: ELISE_HAIR_COLORS,', '};', '']
    out += [
        "/** Where the fall's pivot sits from the face anchor (fine pixels). */",
        f"export const ELISE_HAIR_FALL_AT: [number, number] = [{f['at'][0]}, {f['at'][1]}];",
        '',
        '/** Her darkest line: kept as she has it when the hair is recoloured. */',
        f"export const ELISE_HAIR_LINE = '{meta['line']}';",
        '',
        "/** Her blonde on the lit face of most of her hair: the Hair slot's default; her other golds and browns follow it. */",
        f"export const ELISE_HAIR_BASE = '{meta['base']}';",
        '',
        "/** The gold flower's characters: the Ornament slot recolours them. */",
        f"export const ELISE_ORNAMENT = '{meta['ornament']}';",
        '',
        "/** The flower's gold: the Ornament slot's default. */",
        f"export const ELISE_ORNAMENT_BASE = '{meta['ornamentBase']}';",
        '',
    ]
    tmp = path + '.tmp'
    with open(tmp, 'w') as fh:
        fh.write('\n'.join(out))
    os.replace(tmp, path)


if __name__ == '__main__':
    main()
