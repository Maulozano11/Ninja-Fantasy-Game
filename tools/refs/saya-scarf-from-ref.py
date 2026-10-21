"""The owner's red scarf on his Saya (docs/reference/saya-owner-reference.jpg) as a cape-slot item.

His picture is his own pixel art at 10 picture pixels to one of hers, and she is about 2 of her pixels
to one of ours (heroine_ref.py), so her scarf is not copied 1:1: it is brought down to our scale (her
pixels two to one: tail_auto() below) and finished by hand at our scale, in her colours only (KEY:
every one is in heroine_ref.PALETTES['saya']), inside her black line.

Her scarf is a long red scarf wound thick round the neck: two lit rolls under the chin with a dark
crease between them and the dark inside showing under the chin, its back going round the near side of
the neck behind her side lock and down behind the near shoulder, where it comes out between her hair
and her arm and is thrown back over her long hair in a wide flag: its lit top face, its dark underside
showing where it twists, and its end hanging down in a point. The parts:

  wrap   round the neck, over the neck and the top of the chest, under the chin (the game clears it
         where the head is) and under her side locks (hairFront): pivot on the neck, turned with the
         torso. Her picture's wrap is 17 of her pixels across and 13 down: ours fits our neck, which is
         as wide for the head as hers but half as long (14 across, 7 down).
  tail   from the near side of the neck down behind the near shoulder and out into the flag: her pixels
         two to one (tail_auto), cleaned by hand. Her picture hides it behind her side lock from the
         neck to the shoulder: that stretch is continued from what shows on either side of the lock.
         It hangs from the neck along its spine (SPINE, in our frame): the game bends the spine with the
         wind (its free part from FREE on) and carries her pixels along it, so at rest it is hers pixel
         for pixel and in a run it streams out behind.

The hand-finished rows are below (WRAP, TAIL), in our frame on the female body at idle frame 0 (where
heroine_ref.reduced('saya') lies). Her picture's scarf, the automatic reduction and ours are written side
by side (study/compare@8.png).

It writes, in <out>:

  scarf.json            rows and palette, pivots, the spine, her line's characters and the base colour
  study/compare@8.png   her picture's scarf (her pixels), its automatic reduction and ours, at 8x
  study/wrap@8.png, study/tail@8.png   the parts at 8x, on our female body

and, with a third argument, the game's module (src/sprite/items/sayaScarfArt.ts). The same picture
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

WHICH = 'saya'
# Her colours, one character each (all of them in R.PALETTES['saya']): her line and her reds, darkest
# first.
KEY = {
    'k': '#02010d',
    'Q': '#4b0f30', 'm': '#641a36', 'q': '#6e1c38', 'B': '#7c1d36', 'f': '#842b3c', 'r': '#ad333f', 'R': '#bb2e3e',
}
LINE = 'k'
# Her lit red, the top face of the flag and of both rolls: the colour slot's default (her other reds
# move the way it does; her line stays).
BASE = 'R'

# Our female body at idle frame 0 (heroine_ref.OUR_JOINTS, fine pixels): the neck cell both parts hang
# from and the torso's angle (neck to pelvis) the wrap is drawn at.
NECK = tuple(int(math.floor(v)) for v in R.OUR_JOINTS['neck'])
TORSO_ANGLE = math.degrees(math.atan2(R.OUR_JOINTS['pelvis'][1] - R.OUR_JOINTS['neck'][1],
                                      R.OUR_JOINTS['pelvis'][0] - R.OUR_JOINTS['neck'][0]))

# Round the neck, x 116-134 from row 146. Her wrap (her x 101-117, rows 41-54) across our neck: the dark
# inside under the chin (Q, f), the upper roll lit from the near side (R, its far end in B), the crease
# (B, Q), the lower roll (R) and its shade (B) over the top of the chest, her line under it (row 155);
# at the near end (x 116-119) the scarf going round the side of the neck, dark with a lit turn, as hers
# shows between her side lock and her jaw (her x 88-96, rows 38-47).
WRAP = (116, 146, [
    '.kk................',
    'kmBkkkkkkkkkkkkk...',
    'kBRRqQQQQQQQQffBkk.',
    'kBBRRRqQQQQBRRBBBk.',
    'kQBBRRRRRRRRRBBQmk.',
    'kQQBBBBBBBBBQmBBBk.',
    '.kQQQBBQQQQBRRBBk..',
    '.kRRRRRRRRRRRBBk...',
    '..kBBRRRRRRRBBk....',
    '...kkkkkkkkkkk.....',
])

# From the near side of the neck to the flag's point, x 90-119 from row 147. The stretch behind her side
# lock (rows 147-153: hidden in her picture) carries on the dark back of the scarf (Q, m, B) from the
# wrap's near end to where it comes out between her hair and her arm (row 154, her row 55); from there
# down, her pixels two to one (tail_auto: her x 37 and row 53 on our x 90 and row 153), cleaned: the
# strip coming down dark (B, q, Q), the flag's lit top face (R) with her line along its top, its dark
# underside (Q) and under-fold (B) where it twists out from behind the arm, the fold (B) between the
# flag and its end, and the end hanging to its point (row 170), its near edge darker (B).
TAIL = (90, 147, [
    '.........................kkk..',
    '........................kQBk..',
    '.......................kQmBk..',
    '......................kQmBk...',
    '.....................kQmBk....',
    '....................kQmBk.....',
    '...................kQmBk......',
    '....................kBBk......',
    '...................kqqQk......',
    '................kkkQQqk.......',
    '.........kkkkkkkRRQQQk........',
    '......kkkRRRRRRRQQQQk.........',
    '....kkRRRRRRRRQQQBQk..........',
    '...kRRBRRRRQQQQBBk............',
    '...kRBRRRQQQBBBBk.............',
    '..kBBRRRkkkBBBkk..............',
    '..kBRRRk...kkk................',
    '..kRRRk.......................',
    '..kRRRk.......................',
    '..kRRk........................',
    '..kRRk........................',
    '...kRk........................',
    '...kRk........................',
    '....kk........................',
])
# The tail's spine in our frame (cell corners: a pixel (x, y) spans x..x+1, y..y+1): from the near side
# of the neck down behind the shoulder, out along the flag and down its end to the point. It hangs free
# (the wind bends it) from point FREE on: where it comes out from behind the arm.
SPINE = [(117.5, 148.0), (115.0, 150.5), (112.5, 153.0), (110.5, 155.5), (108.0, 157.8), (105.0, 158.8),
         (102.0, 159.5), (99.0, 160.0), (96.5, 161.0), (95.0, 162.8), (94.3, 165.0), (94.2, 167.0),
         (94.5, 169.0), (95.0, 170.8)]
FREE = 3


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


def rows_of(a, box):
    x0, y0, x1, y1 = box
    return [''.join(c if c else '.' for c in a[y, x0:x1]) for y in range(y0, y1)]


def bbox(a):
    yy, xx = np.nonzero(a != '')
    return (int(xx.min()), int(yy.min()), int(xx.max()) + 1, int(yy.max()) + 1)


def rgb_of(h):
    return [int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)]


def rgba(a, box, under=None):
    """A part (KEY characters) as RGBA over `under` (an RGBA frame), in the box."""
    x0, y0, x1, y1 = box
    im = np.zeros((y1 - y0, x1 - x0, 4), np.uint8)
    if under is not None:
        im[:] = under[y0:y1, x0:x1]
    for y in range(y0, y1):
        for x in range(x0, x1):
            c = a[y, x]
            if c:
                im[y - y0, x - x0] = [*rgb_of(KEY[c]), 255]
    return im


# Her scarf in her picture (her pixels): round her neck, behind her side lock and the near shoulder,
# and the flag over her long hair (the arm guard's red bands and her hair's line left out).
HER_SCARF = [(86, 37), (97, 37), (101, 40), (118, 40), (118, 55), (100, 55), (95, 50), (88, 50), (84, 56), (84, 66),
             (80, 77), (54, 79), (54, 94), (38, 94), (38, 64), (60, 62), (72, 54), (82, 46)]
# Her scarf's colours (KEY's, and her two other near-blacks along its line).
HER_LINE = ('#050416', '#14101f')


def her_scarf():
    """Her scarf's pixels as KEY characters in her picture's frame ('' elsewhere)."""
    N = R.native(WHICH)
    Q = R.quantize(N, WHICH)
    fig = R.figure(WHICH)
    pal = R.PALETTES[WHICH]
    H, W = Q.shape
    yy, xx = np.mgrid[0:H, 0:W]
    inp = R.inside(HER_SCARF, xx + 0.5, yy + 0.5) & fig
    inv = {v: k for k, v in KEY.items()}
    for h in HER_LINE:
        inv[h] = LINE
    out = np.full((H, W), '', dtype='<U1')
    for y in range(H):
        for x in range(W):
            h = pal[Q[y, x]]
            if inp[y, x] and h in inv:
                out[y, x] = inv[h]
    return out


# Her flag two to one: her x 37 and row 53 land on our x 90 and row 153 (her near shoulder, 89 56, on
# ours, 116.5 154.6).
AUTO_FROM = (37, 53)
AUTO_TO = (90, 153)


def tail_auto():
    """Her flag and the strip above it two to one, in our frame: each of our pixels takes the commonest
    of her reds in the two by two of hers under it (the darker on a tie) where two or more of the four
    are her scarf, and her line all round the outside."""
    her = her_scarf()
    hx, hy = AUTO_FROM
    ox, oy = AUTO_TO
    sil = {}
    order = 'QmqBfrR'
    for j in range(0, 22):
        for i in range(0, 26):
            b = [her[hy + 2 * j + a, hx + 2 * i + c] for a in (0, 1) for c in (0, 1)]
            if sum(1 for v in b if v) < 2:
                continue
            body = [v for v in b if v and v != LINE]
            if body:
                vals, cnt = np.unique(body, return_counts=True)
                sil[(i, j)] = max(zip(cnt, [-order.index(v) for v in vals], vals))[2]
            else:
                sil[(i, j)] = LINE
    out = np.full((R.GRID, R.GRID), '', dtype='<U1')
    for (i, j), v in sil.items():
        edge = any((i + di, j + dj) not in sil for di, dj in ((1, 0), (-1, 0), (0, 1), (0, -1)))
        out[oy + j, ox + i] = LINE if edge else v
    return out


def our_body(path):
    """Our female body at idle frame 0 (tools/refs/heroine-idle.mts writes it), under the study images."""
    return np.asarray(Image.open(path).convert('RGBA')) if path else None


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--body=')]
    body = next((a[7:] for a in sys.argv[1:] if a.startswith('--body=')), None)
    out = args[0]
    os.makedirs(os.path.join(out, 'study'), exist_ok=True)
    pal = set(R.PALETTES[WHICH])
    for ch, hexv in KEY.items():
        assert hexv in pal, f'{ch} {hexv} is not one of her colours'
    wrap = grid(WRAP)
    tail = grid(TAIL)
    nx, ny = NECK
    meta = {'source': R.REFS[WHICH], 'neck': [nx, ny], 'torsoAngle': round(TORSO_ANGLE, 2), 'free': FREE}
    used = set()
    for name, a in (('wrap', wrap), ('tail', tail)):
        box = bbox(a)
        meta[name] = {'origin': list(box[:2]), 'rows': rows_of(a, box)}
        used |= set(a[a != ''].tolist())
    ox, oy = meta['tail']['origin']
    meta['spine'] = [[round(x - ox, 2), round(y - oy, 2)] for x, y in SPINE]
    meta['palette'] = {c: KEY[c] for c in KEY if c in used}
    meta['line'] = LINE
    meta['base'] = KEY[BASE]
    tmp = os.path.join(out, 'scarf.json.tmp')
    with open(tmp, 'w') as f:
        json.dump(meta, f, indent=1)
        f.write('\n')
    os.replace(tmp, os.path.join(out, 'scarf.json'))
    if len(args) > 1:
        write_ts(meta, args[1])
    study(out, wrap, tail, our_body(body))
    print('wrap', int((wrap != '').sum()), 'px; tail', int((tail != '').sum()), 'px;', len(meta['palette']),
          'colours; neck', NECK, 'torso', round(TORSO_ANGLE, 2))


def study(out, wrap, tail, body):
    """Her scarf, its automatic reduction and ours side by side at 8x, with Spanish labels, on our body
    (`body`, when given)."""
    view = (86, 140, 140, 176)
    both = wrap.copy()
    both[tail != ''] = tail[tail != '']
    R.save(rgba(wrap, view, body), os.path.join(out, 'study', 'wrap@8.png'))
    R.save(rgba(tail, view, body), os.path.join(out, 'study', 'tail@8.png'))
    k = 8
    vw, vh = view[2] - view[0], view[3] - view[1]
    # her picture's scarf, her pixels, at the same size as ours (her pixel is half of ours)
    her = R.native(WHICH).astype(np.uint8)
    hb = (34, 32, 34 + 2 * vw, 32 + 2 * vh)
    hers = Image.fromarray(her[hb[1]:hb[3], hb[0]:hb[2]]).resize((vw * k, vh * k), Image.NEAREST)
    auto = rgba(tail_auto(), view, body)
    ours = rgba(both, view, body)
    bg = np.array([236, 236, 242, 255], np.uint8)

    def flat(a):
        a = a.astype(np.float64)
        al = a[..., 3:4] / 255
        return Image.fromarray((a[..., :3] * al + bg[:3] * (1 - al)).astype(np.uint8)).resize((vw * k, vh * k), Image.NEAREST)

    pad, top = 16, 30
    sheet = Image.new('RGB', (3 * vw * k + 4 * pad, vh * k + top + pad), (255, 255, 255))
    d = ImageDraw.Draw(sheet)
    for n, (im, label) in enumerate(((hers, 'Tu dibujo'), (flat(auto), 'Reducido a nuestra escala'), (flat(ours), 'En el juego (a mano)'))):
        x = pad + n * (vw * k + pad)
        sheet.paste(im, (x, top))
        d.text((x, 8), label, fill=(0, 0, 0))
    sheet.save(os.path.join(out, 'study', 'compare@8.png'))


def write_ts(meta, path):
    """The scarf as the game's module (src/sprite/items/sayaScarfArt.ts)."""
    nx, ny = meta['neck']
    out = [
        "// The owner's red scarf on his Saya, brought down to our scale in her colours",
        '// (tools/refs/saya-scarf-from-ref.py from docs/reference/saya-owner-reference.jpg).',
        '// Generated: rerun the script to change it.',
        '',
        "import type { PaintedPiece } from '../painted';",
        "import type { ScarfTail } from './sayaScarf';",
        '',
        '/** One character per colour of hers (both parts share them). */',
        'const SAYA_SCARF_COLORS: Record<string, string> = {',
    ]
    out += [f"  {k}: '{v}'," for k, v in meta['palette'].items()]
    out += ['};', '']
    ox, oy = meta['wrap']['origin']
    out += [
        '/** Round the neck, under the chin: its pivot is the cell on the neck, its angle the torso\'s (neck to pelvis) at idle. */',
        'export const SAYA_SCARF_WRAP: PaintedPiece = {',
        f'  pivot: [{nx - ox}, {ny - oy}],',
        f"  angle: {meta['torsoAngle']:.2f},",
        '  rows: [',
    ]
    out += [f"    '{rw}'," for rw in meta['wrap']['rows']]
    out += ['  ],', '  colors: SAYA_SCARF_COLORS,', '};', '']
    ox, oy = meta['tail']['origin']
    out += [
        '/** From the near side of the neck, behind the near shoulder, out into the flag and its hanging end: its pivot is the cell on the neck; its spine (cell corners) runs from the neck to the point and hangs free from point `free` on. */',
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
        '/** Her black line: kept as she has it when the scarf is recoloured. */',
        f"export const SAYA_SCARF_LINE = '{meta['line']}';",
        '',
        "/** Her lit red, the flag's top face and both rolls: the colour slot's default; her other reds follow it. */",
        f"export const SAYA_SCARF_BASE = '{meta['base']}';",
        '',
    ]
    tmp = path + '.tmp'
    with open(tmp, 'w') as f:
        f.write('\n'.join(out))
    os.replace(tmp, path)


if __name__ == '__main__':
    main()
