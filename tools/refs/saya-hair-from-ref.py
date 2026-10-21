"""The owner's hair on his Saya (docs/reference/saya-owner-reference.jpg) as a hairstyle.

His picture is his own pixel art at 10 picture pixels to one of hers, and she is about 2.2 of her
pixels to one of ours (heroine_ref.py), so her hair is not copied 1:1: it is brought down to our scale
with the study's maps (heroine_ref.SEGMENTS['saya']: her head at 0.65 across and 0.62 down about her
eyes, which land on ours; her long hair down the 'hair' column below her chin) and finished by hand at
our scale, in her colours only (KEY: every one is in heroine_ref.PALETTES['saya']), inside her line:
black over the crown, her darkest brown down the sides and round the long hair, as she has it.

Her hair is long, straight and blonde: a round crown lit from the upper left with a band of light
across it, side-swept bangs over the brow in strands parted by brown lines, one strand longer between
the eyes, a gold knot of an ornament on the near side of the crown, a side lock in front of the near
cheek with the ear showing behind it, falling on down in front of the shoulder to the chest, a lock
down the far cheek to the neck, and the rest of it falling behind the near shoulder and down the back
to the waist, blown back a little, with a loose strand curling out at the shoulder. The parts:

  front   over the head (hairFront), on our face anchor (the near eye's lash start): the crown, the
          bangs, the ornament, the near side hair with the ear between it and the side lock, the side
          lock on down over the chest, the far lock. Where her picture shows skin, our head shows.
  back    behind the head (hairBack), on the face anchor: the front's outline filled in (what her face
          hides takes the colour of the nearest strand above it, so her strands run on down, and her
          shade, J, from her eyes down) and her hair behind the far shoulder. It is also the head's
          outline at the top (the game trims our skull to it).
  long    behind the head and the body (hairBack), on the neck, turned with the torso: the hair from
          the near side of the head down the back to the waist. Her picture hides it behind the near
          arm and the scarf; it is continued from what shows (her strands to the left of the arm and
          between the arm and the body).

The hand-finished rows are below (FRONT, BACK_MORE, LONG), in our frame on the female body at idle
frame 0 (where heroine_ref.reduced('saya') lies). The automatic reduction they were drawn from is
written beside them (study/auto@8.png), with her picture's head at the same size (study/hers@8.png).

It writes, in <out>:

  hair.json             rows and palette, pivots, her line's characters and the base colours
  study/front@8.png, study/back@8.png, study/long@8.png   the parts at 8x
  study/auto@8.png      the automatic reduction of her hair at our scale
  study/hers@8.png      her picture's hair (her pixels), scaled to the same height

and, with a third argument, the game's module (src/sprite/items/sayaHairArt.ts). The same picture
always gives the same bytes. Run from the repo root with python3 -I:

  python3 -I tools/refs/saya-hair-from-ref.py <out> [src/sprite/items/sayaHairArt.ts]
"""

import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

import heroine_ref as R  # noqa: E402

WHICH = 'saya'
# Her colours, one character each (all of them in R.PALETTES['saya']).
KEY = {
    # her line: black over the crown and the near side
    'k': '#02010d',
    # her hair, darkest first: her darkest brown is also her line down the sides and round the long hair
    'q': '#704336', 't': '#7d4c37', 'y': '#85543e', 'E': '#9d6e44', 'J': '#b6834e', 'P': '#c69151',
    'S': '#d4a35d', 'X': '#e2b668', 'o': '#e6c486', 'h': '#f6d886', 'H': '#fbe499', 'W': '#feeeb5',
    # her gold ornament: its dark line, its shade and its golds
    'g': '#302525', 'n': '#453631', 'M': '#c48e42', 'T': '#d8a84c', 'Y': '#e8ba58', '1': '#f7c962',
}
LINE = 'k'
# Her darkest brown, her line down the sides and round the long hair: also the line the game lays along
# the hair it cuts away when she is knocked out.
EDGE = 'q'
ORNAMENT = 'gnMTY1'
ORNAMENT_LINE = 'g'
# Her hair's lit face, most of her crown: the hair colour slot's default (her other hair colours move
# the way it does; her black line stays).
BASE = 'h'
# Her ornament's gold: the ornament slot's default (its dark line stays).
ORNAMENT_BASE = 'T'

# Our female body at idle frame 0 (heroine_ref.OUR_JOINTS, fine pixels): the face anchor (body.ts
# faceAnchor: floor((head.x - 1.9 k) RES), floor((head.y + k) RES), female head scale k 0.76), the neck
# cell the long hair hangs from and the torso's angle (neck to pelvis) the long hair is drawn at.
HEAD_SCALE = 0.76
RES = 2
ANCHOR = (int(math.floor(R.OUR_JOINTS['head'][0] - 1.9 * HEAD_SCALE * RES)),
          int(math.floor(R.OUR_JOINTS['head'][1] + 1.0 * HEAD_SCALE * RES)))
NECK = tuple(int(math.floor(v)) for v in R.OUR_JOINTS['neck'])
TORSO_ANGLE = math.degrees(math.atan2(R.OUR_JOINTS['pelvis'][1] - R.OUR_JOINTS['neck'][1],
                                      R.OUR_JOINTS['pelvis'][0] - R.OUR_JOINTS['neck'][0]))

# Over the head, x 104-139 from row 126. Her line over the crown (k), her highlights in a band across
# it (W, H), the gold knot at x 114-120 rows 134-138 in its dark line (g), the bangs parted by brown
# lines (y) with their tips over the brow (row 138) and the long strand between the eyes (x 128, row
# 139), the ear (x 117, rows 140-142) between the near side hair and the side lock (x 118-122, edged in
# y/t on the face side), which falls on over the chest to row 157, and the far lock (x 132-138), light
# against the face and outside our far eye, then down the jaw.
FRONT = (104, 126, [
    '................kkkkkkkk............',
    '.............kkkhhhSSyPhkkk.........',
    '...........kkHHhhhhhhhhPPhhkk.......',
    '..........kSWHhhhhhhhhhhhSSShk......',
    '.........kJhWWhhhhhhhhhhhhhSShk.....',
    '........kXhhhhWhhhhhhhhhhhhhXhhq....',
    '........kXhhhhhhhWhhShhhhhhWHhhhq...',
    '........khShhShhWWWHShhhhWhWHShHq...',
    '.......khShgghhhhhhyhWyhWhyWhyhHHq..',
    '.......kShg1YgTghhhyhhyhhyhhyqShHq..',
    '.......kShgYTMYTgShyhSyhhyShyyShSq..',
    '.......kShhgMgMMgSyhSyhhySJySSPhSq..',
    '.......kShhSgSgghJySJ..SS.J.JSPSPq..',
    '.......kShhShSEhhhy.....E......ShPq.',
    '.......kShhSS.EhSy.............ShPq.',
    '.......kShhhS.EhSy..............hPq.',
    '......kSShShJ.EhSy.............ShPq.',
    '......kSShSHytyhhXy...........JSt...',
    '.....kPSShSoyyyhhXt...........JSt...',
    '.....kShSSHyPyyhhSt...........JSt...',
    '....qSShSSHtJtyhhSt...........JSt...',
    '....qShShhhtJtyhhXt..........JSt....',
    '...qSShSWHXtJqyyHSt..........JSt....',
    '...qShhSWWyJqtytHSt..........JSt....',
    '..qSyhSWhPyJqttqhWt..........JPSt...',
    '................tHSt................',
    '................tWSt................',
    '................qHSt................',
    '................qhSq................',
    '................qSSq................',
    '.................qSq................',
    '..................q.................',
])

# Behind the head, besides the front's outline filled in: her hair behind the far shoulder, to row 157.
BACK_MORE = (132, 151, [
    'yPhSq',
    '.PhSq',
    '.JSPq',
    '.JSq.',
    '.tPq.',
    '..Jq.',
    '..q..',
])
# The front's outline is filled from the crown down to this row (her chin).
BACK_TO = 150
# Behind the forehead each hidden pixel takes the colour of the nearest strand above it; from her eyes
# (this row) down, her hair behind the face is in shade.
FOREHEAD_TO = 138
SHADE = 'J'

# Down the back, x 96-121 from row 138: from the near side of the head (under the front and back parts,
# so no gap opens when the head moves on the neck) behind the near shoulder, flowing down to the left;
# the loose strand curling out at the shoulder (x 98-103, rows 152-158); her lit strands to the left of
# the arm (P, S parted by t), the outer one apart from the rest (x 99-102, ending at row 168) as hers
# are; behind the arm and the body her hair in shade (J, E parted by y) to the tips at the waist (row
# 179).
LONG = (96, 138, [
    '................qShhShSEhh',
    '................qShhShSEhh',
    '................qShhSSJEhS',
    '................qShhhSJEhS',
    '...............qSShShJEyhS',
    '...............qSShSHyEyhS',
    '..............qPSShSoyEyhh',
    '..............qShSSHyPyyhh',
    '.............qSShSSHtJtyhh',
    '.............qShShhhtJtyhh',
    '............qSShSWHXtJqyyh',
    '...........qShhSWWyJqtyhSt',
    '..........qSyhSWhPyJqtEtJt',
    '........qXSPhhSHHyhSEtJEtt',
    '......tXXtqhhShhHhSyhJEtEt',
    '....qhSq.qhhSSWhhShyhJEtEt',
    '...qhq..qXhShhhWhShyhJEtEt',
    '..qht...qohPhhhWhShyhJEtEt',
    '..qX..qXhShhXhhShhyhJEtEtt',
    '..qS.qXWShhSyhhShhyhJEyEtt',
    '..qSqXhSPhhtShhPShyhJEyEtt',
    '...qShSPhhtShSPShyPJJEyEtt',
    '...qPShtPhPyJPJEyJJEyEEtyt',
    '...qPSStPSPyJPJEyJJEyEEtyt',
    '...qPSStPSPyJPJEyJJEyEEtyt',
    '...qPSq.qSPyJPJEyJJEyEEtyt',
    '...qPSq.qPPyJPJEyJEEyEEtyt',
    '...qPPq.qSPyJPJEyJEEyEEtyt',
    '....qPq.qSPyJPJEyJEEyEEtyt',
    '....qJq.qPPyJPJEyJEEyEEtyt',
    '.....q..qPPyJPJEyJEEyEEtyt',
    '........qPJyJPJEyJEEyEEtyt',
    '........qJJyJPJEyJEEyEEtyt',
    '........qJqyJPJEyJEEyEEtyt',
    '.........q.qJPJEyJEEyEEtyt',
    '...........qJPJEyJEEyEEtyq',
    '............qPJqyJEEyEEtq.',
    '............qJq.qJEEyEEtq.',
    '.............q..qJEyqEEq..',
    '................qJEq.qEq..',
    '................qJq..qq...',
    '.................q........',
])


def grid(part):
    """A part's rows in our frame: (GRID, GRID) array of KEY characters ('' empty)."""
    x0, y0, rows = part
    assert len({len(r) for r in rows}) == 1, 'ragged rows'
    out = np.full((R.GRID, R.GRID), '', dtype='<U1')
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch != '.':
                assert ch in KEY, f'not one of her colours: {ch!r}'
                out[y0 + j, x0 + i] = ch
    return out


def build():
    """The three parts in our frame, and the mask of the back's filled-in pixels."""
    pal = set(R.PALETTES[WHICH])
    for ch, hexv in KEY.items():
        assert hexv in pal, f'{ch} {hexv} is not one of her colours'
    front = grid(FRONT)
    long_ = grid(LONG)
    back = front.copy()
    # the far shoulder's hair
    more = grid(BACK_MORE)
    back[more != ''] = more[more != '']
    # the front's outline filled in, crown to chin: between its first and last pixel in each row
    filled = np.zeros(back.shape, bool)
    y_top = FRONT[1]
    for y in range(y_top, BACK_TO + 1):
        cols = np.nonzero(front[y] != '')[0]
        if not len(cols):
            continue
        for x in range(cols[0], cols[-1] + 1):
            if back[y, x]:
                continue
            filled[y, x] = True
            src = SHADE
            if y <= FOREHEAD_TO:
                for q in range(y - 1, y_top - 1, -1):
                    c = back[q, x]
                    if c and c != LINE and c not in ORNAMENT:
                        src = c
                        break
            back[y, x] = src
    return front, back, long_, filled


def rows_of(a, box):
    x0, y0, x1, y1 = box
    return [''.join(c if c else '.' for c in a[y, x0:x1]) for y in range(y0, y1)]


def bbox(a):
    yy, xx = np.nonzero(a != '')
    return (int(xx.min()), int(yy.min()), int(xx.max()) + 1, int(yy.max()) + 1)


def rgba(a, box, mark=None):
    x0, y0, x1, y1 = box
    im = np.zeros((y1 - y0, x1 - x0, 4), np.uint8)
    for y in range(y0, y1):
        for x in range(x0, x1):
            c = a[y, x]
            if c:
                h = KEY[c]
                im[y - y0, x - x0] = [int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16), 255]
                if mark is not None and mark[y, x] and (x + y) % 2:
                    im[y - y0, x - x0] = [0, 200, 255, 255]
    return im


def auto(box):
    """Her hair brought down to our box automatically (the start of the hand-finished rows): over her
    chin the head's map, below it the long hair's; in each of our pixels her commonest kind of pixel
    under it (her hair or ornament, her line, her skin, her clothes) and, for her hair, the middle one
    of its colours by lightness. Her hair, ornament and line only (RGBA)."""
    N = R.native(WHICH)
    fig = R.figure(WHICH)
    Q = R.quantize(N, WHICH)
    pal = R.PALETTES[WHICH]
    P = R.rgb(WHICH)
    lum = R.luma(P)
    hair = {pal.index(KEY[c]) for c in KEY if c not in ORNAMENT and c != LINE}
    orn = {pal.index(KEY[c]) for c in ORNAMENT}
    line = {pal.index(h) for h in ('#02010d', '#050416', '#14101f')}
    x0, y0, x1, y1 = box
    chin = 150
    S = 6
    offs = (np.arange(S) + 0.5) / S
    out = np.zeros((y1 - y0, x1 - x0, 4), np.uint8)
    for y in range(y0, y1):
        seg = R.SEGMENTS[WHICH]['head' if y < chin else 'hair']
        for x in range(x0, x1):
            q = np.array([[x + ox, y + oy] for oy in offs for ox in offs])
            p = R.backward(seg, q)
            px, py = np.floor(p[:, 0]).astype(int), np.floor(p[:, 1]).astype(int)
            ok = (px >= 0) & (px < N.shape[1]) & (py >= 0) & (py < N.shape[0])
            cs = np.full(len(q), -1)
            cs[ok] = np.where(fig[py[ok], px[ok]], Q[py[ok], px[ok]], -1)
            if (cs < 0).sum() * 2 > len(cs):
                continue
            cs = cs[cs >= 0]
            kinds = {'hair': [c for c in cs if c in hair], 'orn': [c for c in cs if c in orn],
                     'line': [c for c in cs if c in line]}
            n_other = len(cs) - sum(len(v) for v in kinds.values())
            kind, vals = max(kinds.items(), key=lambda kv: len(kv[1]))
            # not her hair: her clothes, or the line round them with no hair under it
            if len(vals) < n_other or not (kinds['hair'] or kinds['orn']):
                continue
            if kind == 'line' and len(vals) < 0.4 * len(cs) and (kinds['hair'] or kinds['orn']):
                kind = 'hair' if len(kinds['hair']) >= len(kinds['orn']) else 'orn'
                vals = kinds[kind]
            v = sorted(vals, key=lambda c: lum[c])[len(vals) // 2]
            out[y - y0, x - x0] = [*P[v], 255]
    return out


def hers(box):
    """Her picture's hair region (her pixels on white), the part of her the box covers by the head's
    map (her head) and the long hair's."""
    N = R.native(WHICH).astype(np.uint8)
    seg_h, seg_l = R.SEGMENTS[WHICH]['head'], R.SEGMENTS[WHICH]['hair']
    x0, y0, x1, y1 = box
    a = R.backward(seg_h, np.array([[x0, y0]]))[0]
    b = R.backward(seg_l, np.array([[x1, y1]]))[0]
    c = R.backward(seg_l, np.array([[x0, y1]]))[0]
    hx0 = int(max(0, min(a[0], c[0])))
    hy0 = int(max(0, a[1]))
    hx1 = int(min(N.shape[1], b[0]))
    hy1 = int(min(N.shape[0], b[1]))
    return N[hy0:hy1, hx0:hx1]


def main():
    out = sys.argv[1]
    os.makedirs(os.path.join(out, 'study'), exist_ok=True)
    front, back, long_, filled = build()
    meta = {'source': R.REFS[WHICH], 'anchor': list(ANCHOR), 'neck': list(NECK), 'torsoAngle': round(TORSO_ANGLE, 2)}
    used = set()
    for name, a in (('front', front), ('back', back), ('long', long_)):
        box = bbox(a)
        meta[name] = {'origin': list(box[:2]), 'rows': rows_of(a, box)}
        used |= set(a[a != ''].tolist())
    meta['palette'] = {c: KEY[c] for c in KEY if c in used}
    meta['line'] = LINE
    meta['edge'] = EDGE
    meta['ornament'] = ORNAMENT
    meta['ornamentLine'] = ORNAMENT_LINE
    meta['base'] = KEY[BASE]
    meta['ornamentBase'] = KEY[ORNAMENT_BASE]
    tmp = os.path.join(out, 'hair.json.tmp')
    with open(tmp, 'w') as f:
        json.dump(meta, f, indent=1)
        f.write('\n')
    os.replace(tmp, os.path.join(out, 'hair.json'))
    if len(sys.argv) > 2:
        write_ts(meta, sys.argv[2])

    view = (94, 124, 142, 184)
    R.save(rgba(front, view), os.path.join(out, 'study', 'front@8.png'))
    R.save(rgba(back, view, filled), os.path.join(out, 'study', 'back@8.png'))
    R.save(rgba(long_, view), os.path.join(out, 'study', 'long@8.png'))
    R.save(auto(view), os.path.join(out, 'study', 'auto@8.png'))
    h = hers(view)
    k = 8 * (view[3] - view[1]) / h.shape[0]
    img = Image.fromarray(h).resize((round(h.shape[1] * k), round(h.shape[0] * k)), Image.NEAREST)
    img.save(os.path.join(out, 'study', 'hers@8.png'))
    print('front', int((front != '').sum()), 'px; back', int((back != '').sum()), 'px (', int(filled.sum()),
          'filled); long', int((long_ != '').sum()), 'px;', len(meta['palette']), 'colours; anchor', ANCHOR,
          'neck', NECK, 'torso', round(TORSO_ANGLE, 2))


def write_ts(meta, path):
    """The hair as the game's module (src/sprite/items/sayaHairArt.ts)."""
    ax, ay = meta['anchor']
    nx, ny = meta['neck']
    out = [
        "// The owner's hair on his Saya, brought down to our scale in her colours",
        '// (tools/refs/saya-hair-from-ref.py from docs/reference/saya-owner-reference.jpg).',
        '// Generated: rerun the script to change it.',
        '',
        "import type { PaintedPiece } from '../painted';",
        "import type { PaintedPart } from './capeArt';",
        '',
        '/** One character per colour of hers (all three parts share them). */',
        'const SAYA_HAIR_COLORS: Record<string, string> = {',
    ]
    out += [f"  {k if k.isalpha() else repr(k)}: '{v}'," for k, v in meta['palette'].items()]
    out += ['};', '']
    for part, name, doc in (
        ('front', 'SAYA_HAIR_FRONT', 'Over the head: the crown, the bangs, the ornament, the near side hair round the ear, the side lock down over the chest and the far lock. Its pivot is the cell on our face anchor (the near eye\'s lash start).'),
        ('back', 'SAYA_HAIR_BACK', 'Behind the head: the front\'s outline filled in (her strands run on behind the forehead, her shade below the eyes) and her hair behind the far shoulder; also the head\'s outline at the top. Pivot on the face anchor.'),
    ):
        ox, oy = meta[part]['origin']
        out += [f'/** {doc} */', f'export const {name}: PaintedPart = {{', f'  pivot: [{ax - ox}, {ay - oy}],', '  rows: [']
        out += [f"    '{rw}'," for rw in meta[part]['rows']]
        out += ['  ],', '  colors: SAYA_HAIR_COLORS,', '};', '']
    ox, oy = meta['long']['origin']
    out += [
        '/** Down the back from the near side of the head to the waist, behind the body: its pivot is the cell on the neck, its angle the torso\'s (neck to pelvis) at idle. */',
        'export const SAYA_HAIR_LONG: PaintedPiece = {',
        f'  pivot: [{nx - ox}, {ny - oy}],',
        f"  angle: {meta['torsoAngle']:.2f},",
        '  rows: [',
    ]
    out += [f"    '{rw}'," for rw in meta['long']['rows']]
    out += ['  ],', '  colors: SAYA_HAIR_COLORS,', '};', '']
    out += [
        '/** Her black line: kept as she has it when the hair is recoloured. */',
        f"export const SAYA_HAIR_LINE = '{meta['line']}';",
        '',
        '/** Her darkest brown, her line down the sides and round the long hair: the line along hair cut away when she lies down. */',
        f"export const SAYA_HAIR_EDGE = '{meta['edge']}';",
        '',
        "/** Her gold ornament's characters: they take the ornament's colour, not the hair's (its dark line stays). */",
        f"export const SAYA_HAIR_ORNAMENT = '{meta['ornament']}';",
        f"export const SAYA_HAIR_ORNAMENT_LINE = '{meta['ornamentLine']}';",
        '',
        "/** Her hair's lit face, most of the crown: the hair slot's default; her other hair colours follow it. */",
        f"export const SAYA_HAIR_BASE = '{meta['base']}';",
        '',
        "/** Her ornament's gold: the ornament slot's default. */",
        f"export const SAYA_HAIR_ORNAMENT_BASE = '{meta['ornamentBase']}';",
        '',
    ]
    tmp = path + '.tmp'
    with open(tmp, 'w') as f:
        f.write('\n'.join(out))
    os.replace(tmp, path)


if __name__ == '__main__':
    main()
