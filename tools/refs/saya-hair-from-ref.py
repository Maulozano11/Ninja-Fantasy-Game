"""The owner's hair on his Saya as a hairstyle, copied 1:1 from his picture at our game's scale.

His picture (docs/reference/saya-game-scale-owner-reference.jpg, "tus referencias perfectas") is his
pixel art drawn at our sprite's scale: 1024 picture pixels for 100 of his, so 10.24 picture pixels to
one of his and one of his to one of ours. His pixels are read straight off it (the median of each
cell's inside) and snapped to his colours; nothing is scaled. The bigger picture
(saya-owner-reference.jpg) only helped to read what his small pixels show.

Her hair is long, straight and blonde: a round crown in his black line, side-swept bangs in strands
parted by brown lines with one strand between the eyes, his gold checker ornament on the near side of
the crown, the ear showing between the near side hair and a side lock that falls in front of the near
cheek down over the scarf, a lock down the far cheek to the far shoulder, and the rest falling behind
the near shoulder down the back. The parts, in his cells (x across, y down):

  front   over the head (hairFront), on our face anchor: everything of his hair above his chin (row
          25; from row 22 only from x 39 on, the hair further out already belongs to the long part),
          and below it the two locks in front of the face (x 44 on). His skin and eyes are left
          out, so our face shows there. The far side (from row 15, the run of each row that reaches
          its far end, from x 55 at most) is stamped on our far eye:
          on our standard faces his far eye lies where ours does (9 from the anchor); on a face
          whose far eye is further off (or nearer) the far lock moves out with it (one row more
          each row from row 15, his strands repeated across the gap) and frames our face as it
          frames his instead of covering our far eye.
  back    behind the head (hairBack), on the face anchor: the front's outline filled in from the
          crown to below the chin (behind the forehead each pixel takes the strand above it, below it his
          shade), so no gap shows round the head; it is also the head's top outline (the game trims
          our skull to it).
  long    behind the head and the body (hairBack), on the neck, turned with the torso: the hair from
          the near side of the head down the back. His picture hides it behind the near arm and the
          scarf's end from x 37 on; it is continued from what shows (his shade E with his strand
          lines y every third column, his darkest brown q by the body, ending in tips like his).

It writes, in <out>:

  hair.json                 rows, palette, pivots
  study/his@10.png          his hair as read off the picture (his pixels), 10x
  study/parts@10.png        front, back and long side by side, filled pixels marked

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

SRC = 'docs/reference/saya-game-scale-owner-reference.jpg'
# His grid: 100 x 100 cells over the 1024 x 1024 picture, starting at its corner.
PITCH = 10.24
CELLS = 100

# Every colour of his picture round her head, to snap each cell to (the nearest one). The hair's
# characters are his hair's colours, darkest first; their hex values here are only where the snapping
# starts: each is then set to the mean of his cells snapped to it.
SNAP = {
    '.': '#ffffff', 'k': '#020101',
    'q': '#74462b', 'y': '#7e5034', 'E': '#94603c', 'J': '#ab7840', 'P': '#bf8e4f', 'S': '#cc9e58',
    'X': '#d8ae60', 'o': '#e7c26c', 'G': '#edc653', 'h': '#f5d679', 'H': '#f6e190', 'W': '#f9edb6',
    'z': '#6b3831',
    # not hair: his skin, scarf, top, eyes, chest plate
    's': '#f3bf9d', 'r': '#d58d76', 'R': '#d0856f', 'f': '#f6ccab',
    'a': '#441526', 'b': '#621b2a', 'c': '#72242e', 'd': '#b13134', 'n': '#222339', 'm': '#384060',
    'u': '#1b487a', 'v': '#3877a1', 'w': '#ebe5d7', 'g': '#bfb1a7', 'Z': '#523c48',
}
HAIR = 'qyEJPSXoGhHWz'
LINE = 'k'
# His gold checker ornament on the near side of the crown (x 42-48, rows 12-16): its gold (G there)
# becomes T and its dark squares (q there) t, so they take the ornament's colour, not the hair's.
ORNAMENT_BOX = (42, 12, 49, 17)
ORNAMENT = 'Tt'
# His hair's lit face, most of the crown: the hair colour slot's default (his other hair colours move
# the way it does; his black line stays). His ornament's gold: the ornament slot's default.
BASE = 'h'
ORNAMENT_BASE = 'T'

# His near eye on ours: the cell our face anchor (body.ts faceAnchor ex, ny: the start of the near
# eye's lash row) falls on, x 48 on his lash row 19. Her own eyes (the 'shade' eye shape,
# sayaEyeArt.ts) draw her lash from one cell in (ex + 1), as his starts at x 49, so her lash, whites
# and blues sit under his bangs exactly as he drew them, his strand between the eyes beside her iris
# and not over it. His far iris (fx) is then 9 cells further on, as ours is.
HIS_ANCHOR = (48, 19)
HIS_EYES = 9
# The far side, from this row down: in each row the run of the front's pixels that reaches its far
# end, starting no nearer than FAR_MIN (on the crown, where the row is whole, at FAR_MIN).
FAR_FROM, FAR_MIN = 15, 55

# The front: his hair above the chin, the locks in front of the face below it.
FRONT_BOX = (26, 6, 67, 35)
CHIN = 25
LOCKS_FROM_X = 44
# Below the ear (row 21) the hair left of x 39 already falls behind the shoulder: it is the long
# part's alone, so it turns with the torso and leaves no stub at the head when the body leans.
SIDE_FROM_Y, SIDE_FROM_X = 22, 39
# His eyes' black and his mouth, which lie inside the hair's outline: our face draws its own.
NOT_HAIR = {(49, 19), (50, 19), (51, 19), (52, 19), (57, 19), (49, 20), (51, 27)}
# The back's filled outline: down to row 32, past his chin, between the locks behind the neck and the
# scarf (hidden there at rest; when she walks or runs and the head bobs off the body, his shade shows
# between the far lock and the torso instead of the background); behind the forehead (to FOREHEAD_TO)
# the strand above.
BACK_TO = 32
FOREHEAD_TO = 18
SHADE = 'E'

# The long hair, x 26-46 from row 20: '*' is his pixel there, any other character is a pixel filled
# in his colours where his picture hides the hair (behind the scarf's end and the near arm). Its last
# strand (x 40-45, rows 42-49) is the lock he shows between the near arm and the torso under the
# armpit, gold and tan in his line, joined to the hair above it behind the arm (row 41).
LONG = (26, 20, [
    '.............*****E**',
    '.............*****E**',
    '............*********',
    '...........**********',
    '...........**********',
    '..........***********',
    '........********yEE**',
    '.......*******EEyEE**',
    '......*******yEEyEEqk',
    '.....*******EyEEyEEqk',
    '.....******EEyEEyEEqk',
    '....*******EEyEEyEEqk',
    '....*******EEyEEyEEqk',
    '...********EEyEEyEEqk',
    '...*******yEEyEEyEEqk',
    '..********yEEyEEyEqk.',
    '..*******EyEEyEEyEqk.',
    '..*******EyEEyEEyEqk.',
    '..*******EyEEyEEyEqk.',
    '..*******EyEEyEEyqk..',
    '..**.****EyEEyEEqk...',
    '...*.****kEEqkEEEEk..',
    '......*...kqk.*****..',
    '...........k..*****..',
    '..............******.',
    '.............*******.',
    '.............*******.',
    '.............*******.',
    '..............****...',
    '...............***...',
])

# Our female body at idle frame 0 (heroine_ref.OUR_JOINTS): the face anchor (body.ts faceAnchor:
# floor((head.x - 1.9 k) RES), floor((head.y + k) RES), female head scale k 0.76), the neck cell the
# long hair hangs from and the torso's angle (neck to pelvis) it is drawn at.
HEAD_SCALE = 0.76
RES = 2
ANCHOR = (int(math.floor(R.OUR_JOINTS['head'][0] - 1.9 * HEAD_SCALE * RES)),
          int(math.floor(R.OUR_JOINTS['head'][1] + 1.0 * HEAD_SCALE * RES)))
NECK = tuple(int(math.floor(v)) for v in R.OUR_JOINTS['neck'])
TORSO_ANGLE = math.degrees(math.atan2(R.OUR_JOINTS['pelvis'][1] - R.OUR_JOINTS['neck'][1],
                                      R.OUR_JOINTS['pelvis'][0] - R.OUR_JOINTS['neck'][0]))
# His cell -> our frame at idle (his near eye on ours).
OFF = (ANCHOR[0] - HIS_ANCHOR[0], ANCHOR[1] - HIS_ANCHOR[1])


def hexrgb(h):
    return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)])


def native():
    """His pixels: the median of each cell's inside (6 x 6 picture pixels), (CELLS, CELLS, 3)."""
    a = np.asarray(Image.open(SRC).convert('RGB')).astype(int)
    assert a.shape[:2] == (1024, 1024), a.shape
    out = np.zeros((CELLS, CELLS, 3), int)
    for j in range(CELLS):
        for i in range(CELLS):
            x0 = int(round(i * PITCH + 2.5))
            y0 = int(round(j * PITCH + 2.5))
            out[j, i] = np.median(a[y0:y0 + 6, x0:x0 + 6].reshape(-1, 3), 0)
    return out


def snapped(N):
    keys = list(SNAP)
    P = np.array([hexrgb(SNAP[k]) for k in keys])
    d = np.abs(N[:, :, None, :] - P[None, None]).sum(3)
    ch = np.array(keys)[d.argmin(2)]
    x0, y0, x1, y1 = ORNAMENT_BOX
    box = ch[y0:y1, x0:x1]
    box[box == 'G'] = 'T'
    box[box == 'q'] = 't'
    return ch


def front_mask(ch):
    m = np.zeros(ch.shape, bool)
    x0, y0, x1, y1 = FRONT_BOX
    ok = lambda x, y: (y <= CHIN or x >= LOCKS_FROM_X) and (y < SIDE_FROM_Y or x >= SIDE_FROM_X)  # noqa: E731
    for y in range(y0, y1):
        for x in range(x0, x1):
            if ch[y, x] in HAIR + ORNAMENT and ok(x, y) and (x, y) not in NOT_HAIR:
                m[y, x] = True
    # his black line round it
    line = np.zeros_like(m)
    for y in range(y0, y1):
        for x in range(x0, x1):
            if ch[y, x] == LINE and ok(x, y) and (x, y) not in NOT_HAIR and m[y - 1:y + 2, x - 1:x + 2].any():
                line[y, x] = True
    return m | line


def build(ch):
    """The parts as (CELLS, CELLS) arrays of characters ('' empty), in his cells, and the back's
    and the long hair's filled pixels."""
    front = np.where(front_mask(ch), ch, '')
    back = front.copy()
    filled = np.zeros(ch.shape, bool)
    y_top = FRONT_BOX[1]
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
    x0, y0, rows = LONG
    assert len({len(r) for r in rows}) == 1, 'ragged rows'
    long_ = np.full(ch.shape, '', '<U1')
    lfill = np.zeros(ch.shape, bool)
    for j, row in enumerate(rows):
        for i, c in enumerate(row):
            x, y = x0 + i, y0 + j
            if c == '*':
                assert ch[y, x] in HAIR + LINE, f'not his hair at {x},{y}: {ch[y, x]}'
                long_[y, x] = ch[y, x]
            elif c != '.':
                assert c in HAIR + LINE, c
                long_[y, x] = c
                lfill[y, x] = True
    return front, back, long_, filled, lfill


def palette(N, parts):
    """Each character's colour: the mean of his cells snapped to it in the parts (rounded)."""
    used = {}
    for a in parts:
        for (y, x) in zip(*np.nonzero(a != '')):
            used.setdefault(a[y, x], set()).add((y, x))
    pal = {}
    for c in sorted(used, key=lambda c: hexrgb(SNAP['G' if c == 'T' else 'q' if c == 't' else c]).sum()):
        cells = sorted(used[c])
        # only his own cells set a colour (filled pixels reuse his colours)
        his = [N[y, x] for (y, x) in cells if CH[y, x] == c]
        assert his, f'{c} is used but none of his cells has it'
        m = np.mean(his, 0)
        pal[c] = '#%02x%02x%02x' % tuple(int(round(v)) for v in m)
    return pal


def far_cols(front):
    """Each row's first far-side column, from FAR_FROM down to the front's last row."""
    rows = np.nonzero((front != '').any(1))[0]
    cols = []
    for y in range(FAR_FROM, int(rows.max()) + 1):
        xs = np.nonzero(front[y] != '')[0]
        x = int(xs.max())
        while x - 1 >= FAR_MIN and front[y, x - 1] != '':
            x -= 1
        cols.append(x)
    return cols


def bbox(a):
    yy, xx = np.nonzero(a != '')
    return (int(xx.min()), int(yy.min()), int(xx.max()) + 1, int(yy.max()) + 1)


def rows_of(a, box):
    x0, y0, x1, y1 = box
    return [''.join(c if c else '.' for c in a[y, x0:x1]) for y in range(y0, y1)]


def picture(a, pal, box, k, mark=None):
    x0, y0, x1, y1 = box
    im = np.full((y1 - y0, x1 - x0, 3), 255, np.uint8)
    for y in range(y0, y1):
        for x in range(x0, x1):
            c = a[y, x]
            if c:
                im[y - y0, x - x0] = hexrgb(pal[c])
                if mark is not None and mark[y, x] and (x + y) % 2:
                    im[y - y0, x - x0] = (0, 200, 255)
    return Image.fromarray(im).resize(((x1 - x0) * k, (y1 - y0) * k), Image.NEAREST)


CH = None


def main():
    global CH
    out = sys.argv[1]
    os.makedirs(os.path.join(out, 'study'), exist_ok=True)
    N = native()
    CH = snapped(N)
    front, back, long_, filled, lfill = build(CH)
    pal = palette(N, (front, back, long_))
    assert BASE in pal and ORNAMENT_BASE in pal
    nx, ny = NECK[0] - OFF[0], NECK[1] - OFF[1]
    meta = {'source': SRC, 'pitch': PITCH, 'anchor': list(HIS_ANCHOR), 'neck': [nx, ny],
            'torsoAngle': round(TORSO_ANGLE, 2), 'hisEyes': HIS_EYES, 'farFrom': FAR_FROM, 'farCols': far_cols(front)}
    for name, a in (('front', front), ('back', back), ('long', long_)):
        box = bbox(a)
        meta[name] = {'origin': list(box[:2]), 'rows': rows_of(a, box)}
    meta['palette'] = pal
    meta['line'] = LINE
    meta['ornament'] = ''.join(c for c in ORNAMENT if c in pal)
    meta['base'] = pal[BASE]
    meta['ornamentBase'] = pal[ORNAMENT_BASE]
    tmp = os.path.join(out, 'hair.json.tmp')
    with open(tmp, 'w') as f:
        json.dump(meta, f, indent=1)
        f.write('\n')
    os.replace(tmp, os.path.join(out, 'hair.json'))
    if len(sys.argv) > 2:
        write_ts(meta, sys.argv[2])

    view = (24, 4, 68, 46)
    x0, y0, x1, y1 = view
    his = Image.fromarray(N[y0:y1, x0:x1].astype(np.uint8)).resize(((x1 - x0) * 10, (y1 - y0) * 10), Image.NEAREST)
    his.save(os.path.join(out, 'study', 'his@10.png'))
    ims = [picture(front, pal, view, 10), picture(back, pal, view, 10, filled), picture(long_, pal, view, 10, lfill)]
    sheet = Image.new('RGB', (sum(i.size[0] for i in ims) + 20, ims[0].size[1]), (200, 200, 210))
    x = 0
    for i in ims:
        sheet.paste(i, (x, 0))
        x += i.size[0] + 10
    sheet.save(os.path.join(out, 'study', 'parts@10.png'))
    print('front', int((front != '').sum()), 'px; back', int((back != '').sum()), 'px (', int(filled.sum()),
          'filled); long', int((long_ != '').sum()), 'px (', int(lfill.sum()), 'filled);', len(pal),
          'colours; offset', OFF, 'neck', (nx, ny), 'torso', round(TORSO_ANGLE, 2))


def write_ts(meta, path):
    """The hair as the game's module (src/sprite/items/sayaHairArt.ts)."""
    ax, ay = meta['anchor']
    nx, ny = meta['neck']
    out = [
        "// The owner's hair on his Saya, copied 1:1 from his picture at our game's scale",
        '// (tools/refs/saya-hair-from-ref.py from docs/reference/saya-game-scale-owner-reference.jpg).',
        '// Generated: rerun the script to change it.',
        '',
        "import type { PaintedPiece } from '../painted';",
        "import type { PaintedPart } from './capeArt';",
        '',
        '/** A part on the face: its far side rides the far eye, from row `farFrom` down, from column `farCols[row - farFrom]` on. */',
        'export interface SayaFacePart extends PaintedPart {',
        '  farFrom: number;',
        '  farCols: number[];',
        '}',
        '',
        '/** One character per colour of his (all three parts share them). */',
        'const SAYA_HAIR_COLORS: Record<string, string> = {',
    ]
    out += [f"  {k}: '{v}'," for k, v in meta['palette'].items()]
    out += ['};', '']
    for part, name, doc in (
        ('front', 'SAYA_HAIR_FRONT', 'Over the head: his hair above the chin (crown, bangs, ornament, the near side hair round the ear) and the two locks in front of the face below it. Its pivot is the cell on our face anchor (the near eye\'s start).'),
        ('back', 'SAYA_HAIR_BACK', 'Behind the head: the front\'s outline filled in to below the chin, behind the neck (his strands run on behind the forehead, his shade below), also the head\'s outline at the top. Pivot on the face anchor.'),
    ):
        ox, oy = meta[part]['origin']
        n = len(meta[part]['rows'])
        cols = [c - ox for c in meta['farCols']][:n - (meta['farFrom'] - oy)]
        out += [f'/** {doc} */', f'export const {name}: SayaFacePart = {{', f'  pivot: [{ax - ox}, {ay - oy}],',
                f"  farFrom: {meta['farFrom'] - oy},", f"  farCols: [{', '.join(map(str, cols))}],", '  rows: [']
        out += [f"    '{rw}'," for rw in meta[part]['rows']]
        out += ['  ],', '  colors: SAYA_HAIR_COLORS,', '};', '']
    ox, oy = meta['long']['origin']
    out += [
        '/** Down the back from the near side of the head, behind the body: its pivot is the cell on the neck, its angle the torso\'s (neck to pelvis) at idle. */',
        'export const SAYA_HAIR_LONG: PaintedPiece = {',
        f'  pivot: [{nx - ox}, {ny - oy}],',
        f"  angle: {meta['torsoAngle']:.2f},",
        '  rows: [',
    ]
    out += [f"    '{rw}'," for rw in meta['long']['rows']]
    out += ['  ],', '  colors: SAYA_HAIR_COLORS,', '};', '']
    out += [
        "/** Where the long hair's pivot (the neck) lies from the face anchor at idle, in cells: the game hangs it from the head there. */",
        f'export const SAYA_HAIR_NECK: [number, number] = [{nx - ax}, {ny - ay}];',
        '',
        "/** His far eye's distance from his near one (fx - ex in our face anchor's terms). */",
        f"export const SAYA_HAIR_EYES = {meta['hisEyes']};",
        '',
        '/** His black line: kept as he has it when the hair is recoloured, and laid along hair cut away when she lies down. */',
        f"export const SAYA_HAIR_LINE = '{meta['line']}';",
        '',
        "/** His gold ornament's characters: they take the ornament's colour, not the hair's. */",
        f"export const SAYA_HAIR_ORNAMENT = '{meta['ornament']}';",
        '',
        "/** His hair's lit face, most of the crown: the hair slot's default; his other hair colours follow it. */",
        f"export const SAYA_HAIR_BASE = '{meta['base']}';",
        '',
        "/** His ornament's gold: the ornament slot's default. */",
        f"export const SAYA_HAIR_ORNAMENT_BASE = '{meta['ornamentBase']}';",
        '',
    ]
    tmp = path + '.tmp'
    with open(tmp, 'w') as f:
        f.write('\n'.join(out))
    os.replace(tmp, path)


if __name__ == '__main__':
    main()
