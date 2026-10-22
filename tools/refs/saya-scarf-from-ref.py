"""The owner's red scarf on his Saya as a cape-slot item, copied 1:1 from his picture at our game's scale.

His picture (docs/reference/saya-game-scale-owner-reference.jpg, "tus referencias perfectas") is his
pixel art drawn at our sprite's scale: 1024 picture pixels for 100 of his, so 10.24 picture pixels to
one of his and one of his to one of ours. His pixels are read straight off it (the median of each
cell's inside) and snapped to his colours; nothing is scaled. His big picture
(saya-owner-reference.jpg) only shows what happens to the scarf's end: it flies back behind her near
shoulder in a wide flag.

His scarf at our scale is wound round the neck under the chin (two lit rolls with a dark crease, the
dark inside under the chin, a shade where it lies on the chest), and its back goes round the near side
of the neck, behind her side lock, and over the top of the near shoulder, where it goes behind her
long hair. The parts:

  wrap   his pixels round the neck and over the near shoulder, x 37-60 and rows 25-34 of his cells,
         with his line. The stretch on top of the near shoulder (to his x 44) is its own piece, drawn
         over the near arm (the arm's shoulder would cover it otherwise). His side lock (x 45-49) hides the stretch between the shoulder and the neck:
         it is continued from his rows on either side (HIDDEN). Pivot on the neck, turned with the
         torso, drawn over the neck and the top of the chest and under the chin (the game clears it
         where the head is) and under the side locks (hairFront).
  tail   the scarf's end, which his game-scale picture hides behind her hair and the near arm: a strip
         hanging from behind the near shoulder down her back, in his colours (lit face, crease, dark
         underside, as his rolls), drawn behind the hair and the body so at rest it stays hidden as in
         his picture. It hangs along its SPINE: the game bends the spine with the wind, so in a run
         or a throw it streams out behind her like the flag in his big picture.

The tail's rows are below (TAIL), in our frame on the female body at idle frame 0. His cell (x, y) of
the wrap lands on our fine pixel (x + OFF[0], y + OFF[1]): his chin line (row 28, x 52-55) on the chin
of her own face (the 'shade' face shape, saya-face-from-ref.py: row 148, x 127-130). The stretch over
the shoulder lands at SHOULDER_OFF instead: on her bare shoulder's cells (saya-upper-from-ref.py lays
her near arm on ours four rows higher than his picture, NEAR_ARM), so its
line sits on her shoulder's line as he drew it; the tail hangs behind that shoulder, moved with it.

It writes, in <out>:

  scarf.json            rows and palette, pivots, the spine, his line's character and the base colour
  study/compare@8.png   his scarf (his cells), ours on our female body, side by side at 8x
  study/his@10.png      his cells round the neck at 10x, the scarf's pixels marked

and, with a second argument, the game's module (src/sprite/items/sayaScarfArt.ts). The same picture
always gives the same bytes. Run from the repo root with python3 -I:

  npx tsx tools/refs/heroine-idle.mts <out>
  python3 -I tools/refs/saya-scarf-from-ref.py <out> [src/sprite/items/sayaScarfArt.ts] [--body=<out>/female-idle.png]
"""

import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image, ImageDraw  # noqa: E402

import heroine_ref as R  # noqa: E402
import saya_rig  # noqa: E402

SRC = 'docs/reference/saya-game-scale-owner-reference.jpg'
# His grid: 100 x 100 cells over the 1024 x 1024 picture, starting at its corner.
PITCH = 10.24
CELLS = 100

# The colours round her neck, to snap each cell to (the nearest one). The scarf's characters are his
# line and his four reds, darkest first; their hex values here are only where the snapping starts:
# each is then set to the mean of his scarf cells snapped to it.
SNAP = {
    '.': '#ffffff', 'k': '#020101',
    'a': '#421528', 'b': '#5c1a29', 'c': '#661b2a', 'd': '#b33134',
    # not scarf: his hair, skin, chest plate and top
    'Y': '#f5d678', 'y': '#d6ab5c', 'h': '#7c4d34', 'j': '#8a5838', 's': '#f3bf9d', 'r': '#d38a73',
    'z': '#6b3834', 'w': '#ebe5d7', 'g': '#bfb1a7', 'n': '#222339', 'm': '#384060',
}
SCARF = 'kabcd'
LINE = 'k'
# His lit red, the top face of both rolls: the colour slot's default (his other reds move the way it
# does; his line stays).
BASE = 'd'

# His scarf, row by row: the runs of his cells (x from, x to, inclusive) that are the scarf. Outside
# them his black is the chin's, the hair's or the shoulder's line, and is left to the body and hair.
RUNS = {
    25: [(44, 44)],
    26: [(42, 44)],
    27: [(40, 44), (56, 58)],
    28: [(39, 45), (50, 50), (52, 59)],
    29: [(38, 45), (50, 59)],
    30: [(37, 46), (50, 60)],
    31: [(42, 46), (50, 60)],
    32: [(44, 46), (50, 59)],
    33: [(50, 59)],
    34: [(51, 57)],
}
# The scarf under his side lock (x 45-49) and under the chin's skin, continued from his rows on either
# side: the near piece's lit top (d) and its crease (c) run on into the wrap's rolls, the dark inside
# (a) under the chin, and the near piece's lower line (k) closes under the shoulder piece.
HIDDEN = {
    25: {45: 'k'},
    26: {45: 'b', 46: 'k'},
    27: {45: 'd', 46: 'd', 47: 'c', 48: 'k'},
    28: {46: 'd', 47: 'c', 48: 'a', 49: 'a', 51: 'a'},
    29: {46: 'd', 47: 'd', 48: 'c', 49: 'd'},
    30: {47: 'c', 48: 'd', 49: 'd'},
    31: {47: 'c', 48: 'c', 49: 'b'},
    32: {47: 'k', 48: 'd', 49: 'd'},
    33: {48: 'k', 49: 'b'},
}
# His cell -> our fine pixel at idle frame 0: the wrap (on her face's chin) and the shoulder stretch (on
# her body's shoulder).
OFF = (75, 120)
SHOULDER_MOVE = (0, -4)
SHOULDER_OFF = (76 + SHOULDER_MOVE[0], 122 + SHOULDER_MOVE[1])
# The wrap's pixels up to this x of his (the stretch over the near shoulder, nearer than his side lock)
# are the shoulder piece: the game draws it over the near arm, as it lies on top of the shoulder.
SHOULDER_TO = 44

# Our female body at idle frame 0 (tools/refs/saya_rig.py, fine pixels): the neck cell both parts hang
# from and the torso's angle (neck to pelvis) the wrap is drawn at.
J = saya_rig.JOINTS
NECK = tuple(int(math.floor(v)) for v in J['neck'])
TORSO_ANGLE = math.degrees(math.atan2(J['pelvis'][1] - J['neck'][1], J['pelvis'][0] - J['neck'][0]))

# The end, x 108-117 from row 149 (moved by SHOULDER_MOVE with the shoulder), hanging from behind the near shoulder (where his wrap goes behind
# the hair) down her back to a point, in his reds: its lit face (d) with the crease (c) beside it as on
# his rolls, its dark underside (b, a) showing where it turns once halfway down, his line all round.
TAIL = (108, 149, [
    '.....kkkk.',
    '....kcddck',
    '....kcddk.',
    '...kbcddk.',
    '...kbcddk.',
    '..kbcddk..',
    '..kacddk..',
    '..kbcddk..',
    '.kbccddk..',
    '.kaabcdk..',
    '.kabbcdk..',
    '.kbcddk...',
    '.kcddk....',
    'kcddk.....',
    'kcdk......',
    'kcdk......',
    '.kdk......',
    '.kk.......',
])
# The tail's spine in our frame (cell corners: a pixel (x, y) spans x..x+1, y..y+1): from behind the
# near shoulder down the strip to the point. All of it hangs free (the wind bends it) from point FREE
# on.
SPINE = [(115.0, 149.5), (114.0, 153.0), (113.0, 156.5), (112.0, 159.5), (111.0, 162.5), (110.0, 165.0),
         (109.5, 167.0)]
FREE = 1


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
    return np.array(keys)[d.argmin(2)]


def his_scarf(ch):
    """His scarf in his cells ((CELLS, CELLS) characters, '' elsewhere), and where it was filled."""
    out = np.full(ch.shape, '', '<U1')
    filled = np.zeros(ch.shape, bool)
    for y, runs in RUNS.items():
        for x0, x1 in runs:
            for x in range(x0, x1 + 1):
                c = ch[y, x]
                assert c in SCARF, f'not his scarf at {x},{y}: {c}'
                out[y, x] = c
    for y, row in HIDDEN.items():
        for x, c in row.items():
            assert c in SCARF and not out[y, x], (x, y)
            out[y, x] = c
            filled[y, x] = True
    return out, filled


def palette(N, ch, scarf, filled):
    """Each character's colour: the mean of his scarf cells snapped to it (rounded)."""
    pal = {}
    for c in SCARF:
        his = [N[y, x] for (y, x) in zip(*np.nonzero((scarf == c) & ~filled))]
        assert his, f'{c} is used but none of his cells has it'
        pal[c] = '#%02x%02x%02x' % tuple(int(round(v)) for v in np.mean(his, 0))
    return pal


def grid_of(part):
    """Hand rows in our frame: (GRID, GRID) characters ('' empty)."""
    x0, y0, rows = part
    assert len({len(r) for r in rows}) == 1, 'ragged rows'
    out = np.full((R.GRID, R.GRID), '', dtype='<U1')
    for j, row in enumerate(rows):
        for i, c in enumerate(row):
            if c != '.':
                assert c in SCARF, f'not one of his colours: {c!r}'
                out[y0 + j, x0 + i] = c
    return out


def to_ours(scarf, off=OFF):
    out = np.full((R.GRID, R.GRID), '', dtype='<U1')
    for (y, x) in zip(*np.nonzero(scarf != '')):
        out[y + off[1], x + off[0]] = scarf[y, x]
    return out


def rows_of(a, box):
    x0, y0, x1, y1 = box
    return [''.join(c if c else '.' for c in a[y, x0:x1]) for y in range(y0, y1)]


def bbox(a):
    yy, xx = np.nonzero(a != '')
    return (int(xx.min()), int(yy.min()), int(xx.max()) + 1, int(yy.max()) + 1)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--body=')]
    body = next((a[7:] for a in sys.argv[1:] if a.startswith('--body=')), None)
    out = args[0]
    os.makedirs(os.path.join(out, 'study'), exist_ok=True)
    N = native()
    ch = snapped(N)
    scarf, filled = his_scarf(ch)
    pal = palette(N, ch, scarf, filled)
    wrap = to_ours(scarf)
    shoulder = to_ours(scarf, SHOULDER_OFF)
    shoulder[:, SHOULDER_TO + SHOULDER_OFF[0] + 1:] = ''
    wrap[:, :SHOULDER_TO + OFF[0] + 1] = ''
    tail = grid_of((TAIL[0] + SHOULDER_MOVE[0], TAIL[1] + SHOULDER_MOVE[1], TAIL[2]))
    nx, ny = NECK
    meta = {'source': SRC, 'neck': [nx, ny], 'torsoAngle': round(TORSO_ANGLE, 2), 'free': FREE}
    used = set()
    for name, a in (('wrap', wrap), ('shoulder', shoulder), ('tail', tail)):
        box = bbox(a)
        meta[name] = {'origin': list(box[:2]), 'rows': rows_of(a, box)}
        used |= set(a[a != ''].tolist())
    ox, oy = meta['tail']['origin']
    meta['spine'] = [[round(x + SHOULDER_MOVE[0] - ox, 2), round(y + SHOULDER_MOVE[1] - oy, 2)] for x, y in SPINE]
    meta['palette'] = {c: pal[c] for c in SCARF if c in used}
    meta['line'] = LINE
    meta['base'] = pal[BASE]
    tmp = os.path.join(out, 'scarf.json.tmp')
    with open(tmp, 'w') as f:
        json.dump(meta, f, indent=1)
        f.write('\n')
    os.replace(tmp, os.path.join(out, 'scarf.json'))
    if len(args) > 1:
        write_ts(meta, args[1])
    study(out, N, scarf, filled, np.where(shoulder != '', shoulder, wrap), pal, np.asarray(Image.open(body).convert('RGBA')) if body else None)
    print('wrap', int((wrap != '').sum()), 'px (', int(filled.sum()), 'filled); tail', int((tail != '').sum()), 'px;',
          meta['palette'], 'neck', NECK, 'torso', round(TORSO_ANGLE, 2))


def study(out, N, scarf, filled, wrap, pal, body):
    """His cells round the neck with the scarf marked; his scarf beside ours on our body, at 8x."""
    hb = (30, 20, 66, 40)
    k = 10
    im = Image.fromarray(N[hb[1]:hb[3], hb[0]:hb[2]].astype(np.uint8)).resize(((hb[2] - hb[0]) * k, (hb[3] - hb[1]) * k), Image.NEAREST)
    d = ImageDraw.Draw(im)
    for (y, x) in zip(*np.nonzero(scarf != '')):
        if hb[0] <= x < hb[2] and hb[1] <= y < hb[3]:
            X, Y = (x - hb[0]) * k, (y - hb[1]) * k
            d.rectangle([X, Y, X + k - 1, Y + k - 1], outline=(0, 255, 255) if filled[y, x] else (0, 200, 0))
    im.save(os.path.join(out, 'study', 'his@10.png'))
    # side by side: his cells (scarf only, on white), his whole picture there, ours on our body
    view = (100, 140, 145, 175)
    k = 8
    vw, vh = view[2] - view[0], view[3] - view[1]
    bg = np.array([236, 236, 242], np.float64)
    hv = (view[0] - OFF[0], view[1] - OFF[1], view[2] - OFF[0], view[3] - OFF[1])
    his_all = N[hv[1]:hv[3], hv[0]:hv[2]].astype(np.uint8)
    his_only = np.full((vh, vw, 3), 255, np.uint8)
    ours = np.zeros((vh, vw, 4), np.float64)
    if body is not None:
        ours[:] = body[view[1]:view[3], view[0]:view[2]]
    for y in range(vh):
        for x in range(vw):
            c = scarf[y + hv[1], x + hv[0]]
            if c and not filled[y + hv[1], x + hv[0]]:
                his_only[y, x] = N[y + hv[1], x + hv[0]]
            w = wrap[y + view[1], x + view[0]]
            if w:
                ours[y, x] = [*hexrgb(pal[w]), 255]
    al = ours[..., 3:4] / 255
    ours = (ours[..., :3] * al + bg * (1 - al)).astype(np.uint8)
    pad, top = 16, 30
    sheet = Image.new('RGB', (3 * vw * k + 4 * pad, vh * k + top + pad), (255, 255, 255))
    dr = ImageDraw.Draw(sheet)
    for n, (a, label) in enumerate(((his_all, 'Tu dibujo'), (his_only, 'Tu bufanda (tus pixeles)'), (ours, 'En el juego'))):
        x = pad + n * (vw * k + pad)
        sheet.paste(Image.fromarray(a).resize((vw * k, vh * k), Image.NEAREST), (x, top))
        dr.text((x, 8), label, fill=(0, 0, 0))
    sheet.save(os.path.join(out, 'study', 'compare@8.png'))


def write_ts(meta, path):
    """The scarf as the game's module (src/sprite/items/sayaScarfArt.ts)."""
    nx, ny = meta['neck']
    out = [
        "// The owner's red scarf on his Saya, copied 1:1 from his picture at our game's scale",
        '// (tools/refs/saya-scarf-from-ref.py from docs/reference/saya-game-scale-owner-reference.jpg).',
        '// Generated: rerun the script to change it.',
        '',
        "import type { PaintedPiece } from '../painted';",
        "import type { ScarfTail } from './sayaScarf';",
        '',
        '/** One character per colour of his (both parts share them). */',
        'const SAYA_SCARF_COLORS: Record<string, string> = {',
    ]
    out += [f"  {k}: '{v}'," for k, v in meta['palette'].items()]
    out += ['};', '']
    ox, oy = meta['wrap']['origin']
    out += [
        "/** Round the neck under the chin and over the near shoulder: its pivot is the cell on the neck, its angle the torso's (neck to pelvis) at idle. */",
        'export const SAYA_SCARF_WRAP: PaintedPiece = {',
        f'  pivot: [{nx - ox}, {ny - oy}],',
        f"  angle: {meta['torsoAngle']:.2f},",
        '  rows: [',
    ]
    out += [f"    '{rw}'," for rw in meta['wrap']['rows']]
    out += ['  ],', '  colors: SAYA_SCARF_COLORS,', '};', '']
    ox, oy = meta['shoulder']['origin']
    out += [
        "/** The wrap's stretch over the top of the near shoulder (drawn over the near arm): the same pivot cell and angle as the wrap. */",
        'export const SAYA_SCARF_SHOULDER: PaintedPiece = {',
        f'  pivot: [{nx - ox}, {ny - oy}],',
        f"  angle: {meta['torsoAngle']:.2f},",
        '  rows: [',
    ]
    out += [f"    '{rw}'," for rw in meta['shoulder']['rows']]
    out += ['  ],', '  colors: SAYA_SCARF_COLORS,', '};', '']
    ox, oy = meta['tail']['origin']
    out += [
        '/** The end hanging from behind the near shoulder down her back: its pivot is the cell on the neck; its spine (cell corners) runs from the shoulder to the point and hangs free from point `free` on. */',
        'export const SAYA_SCARF_TAIL: ScarfTail = {',
        f'  pivot: [{nx - ox}, {ny - oy}],',
        f"  angle: {meta['torsoAngle']:.2f},",
        '  spine: [' + ', '.join(f'[{x:g}, {y:g}]' for x, y in meta['spine']) + '],',
        f"  free: {meta['free']},",
        '  rows: [',
    ]
    out += [f"    '{rw}'," for rw in meta['tail']['rows']]
    out += ['  ],', '  colors: SAYA_SCARF_COLORS,', '};', '']
    out += [
        '/** His black line: kept as he has it when the scarf is recoloured. */',
        f"export const SAYA_SCARF_LINE = '{meta['line']}';",
        '',
        "/** His lit red, the top face of both rolls: the colour slot's default; his other reds follow it. */",
        f"export const SAYA_SCARF_BASE = '{meta['base']}';",
        '',
    ]
    tmp = path + '.tmp'
    with open(tmp, 'w') as f:
        f.write('\n'.join(out))
    os.replace(tmp, path)


if __name__ == '__main__':
    main()
