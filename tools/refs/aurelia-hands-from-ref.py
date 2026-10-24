"""Aurelia's small hands, from the owner's picture of her at our game's scale
(docs/reference/aurelia-escala-juego-owner-reference.jpg), as painted pieces: the female bodies' 'small'
hands (appearance `hands: 'small'`, src/sprite/hands.ts).

His Aurelia's hands are smaller than his bare woman's (docs/reference/female-base-owner-reference.jpg, the
female bodies' hands): on her our near hand hung about three rows lower than his and covered the top of
her skirt. The owner, 2026-10-22: "las manos mas pequeñas ponlas como opcion en el juego para personajes
femeninos". So her two hands as he drew them are the small hands, his pixels one for one:

  NEAR  her open near hand, hanging below her cuff (his cells from the skin under the cuff down to the
        fingertips, his line round them and between the fingers), pivot on our near wrist
  FIST  her far fist (his cells round the staff's grip: his skin and his line round it, the shaft left
        out), pivot on our far wrist; it is the small fist on either arm

Each is laid where he drew it with the rest of her (tools/refs/aurelia_rig.py AT, his pixel (x, y) at our
(x + 73, y + 120)), its pivot the cell over our wrist and its angle our forearm's at idle, so on her at
rest every pixel of it is his. His skin follows the body's skin (body.ts skinTone, from his lit skin
HAND_SKIN: in his own skin, his colours); his line stays his. Each of his pixels is the median of its
cell; cells within NEAR of each other are one colour of his (their mean). Run from the repository root:

  python3 -I tools/refs/aurelia-hands-from-ref.py [src/sprite/aureliaHandsArt.ts] [--preview <dir>]

The same picture always gives the same bytes.
"""

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

from aurelia_rig import AT, JOINTS as J  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PICTURE = os.path.join(ROOT, 'docs', 'reference', 'aurelia-escala-juego-owner-reference.jpg')
# One of his pixels in picture pixels; his grid starts at the picture's corner.
PITCH = 19.32
# Cells whose colours are closer than this (RGB distance) are one colour of his.
NEAR = 10
DX, DY = AT['bodice']

# Each hand: the box his cells lie in (x0, y0, x1, y1, inclusive; the near one from the row of his cuff's
# lower line, which closes the skin of the wrist he shows under it), a seed cell of his skin, and our
# joints it hangs from.
HANDS = {
    'NEAR': {'box': (30, 51, 38, 59), 'seed': (34, 54), 'wrist': 'wristN', 'elbow': 'elbowN'},
    'FIST': {'box': (63, 51, 69, 57), 'seed': (65, 53), 'wrist': 'wristF', 'elbow': 'elbowF'},
}


def native():
    """His pixels: the median of each grid cell (away from its edges), (H, W, 3) ints."""
    a = np.asarray(Image.open(PICTURE).convert('RGB')).astype(int)
    n = int(round(a.shape[0] / PITCH))
    out = np.zeros((n, n, 3), int)
    for y in range(n):
        for x in range(n):
            y0, y1 = int(y * PITCH + 4), int((y + 1) * PITCH - 4)
            x0, x1 = int(x * PITCH + 4), int((x + 1) * PITCH - 4)
            out[y, x] = np.median(a[y0:y1, x0:x1].reshape(-1, 3), axis=0)
    return out


def is_line(c):
    return max(c) < 48


def is_skin(c):
    r, g, b = (int(v) for v in c)
    return r > 180 and 90 < b < 190 and r - g > 30


def hand_cells(N, box, seed):
    """His skin reached from the seed inside the box (4-connected), and his line next to it (8-connected)."""
    x0, y0, x1, y1 = box
    assert is_skin(N[seed[1], seed[0]]), seed
    skin = {seed}
    stack = [seed]
    while stack:
        x, y = stack.pop()
        for q in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if x0 <= q[0] <= x1 and y0 <= q[1] <= y1 and q not in skin and is_skin(N[q[1], q[0]]):
                skin.add(q)
                stack.append(q)
    line = set()
    for x, y in skin:
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                q = (x + dx, y + dy)
                if q not in skin and x0 <= q[0] <= x1 and y0 <= q[1] <= y1 and is_line(N[q[1], q[0]]):
                    line.add(q)
    return skin, line


def groups(cols):
    """His colours: each colour joined to the first group within NEAR of it (lightest first), each group its mean."""
    out = []
    for c in sorted(cols, key=lambda c: (-sum(c), c)):
        for g in out:
            if max(abs(a - b) for a, b in zip(g[0], c)) <= NEAR:
                g.append(c)
                break
        else:
            out.append([c])
    return [tuple(int(round(v)) for v in np.mean(g, axis=0)) for g in out], out


def hexof(c):
    return '#%02x%02x%02x' % tuple(c)


def main():
    args = sys.argv[1:]
    preview = None
    if '--preview' in args:
        i = args.index('--preview')
        preview = args[i + 1]
        del args[i:i + 2]
    path = args[0] if args else 'src/sprite/aureliaHandsArt.ts'
    N = native()
    cells = {}
    for name, h in HANDS.items():
        skin, line = hand_cells(N, h['box'], h['seed'])
        cells[name] = (skin, line)
    # his skin colours across both hands, lightest first: 'a', 'b', ... ; his line 'k' (the mean of his line cells)
    skin_cols = sorted({tuple(int(v) for v in N[y, x]) for s, _ in cells.values() for x, y in s})
    means, members = groups(skin_cols)
    letter_of = {}
    for k, g in enumerate(members):
        for c in g:
            letter_of[c] = 'abcdefghij'[k]
    line_cols = [N[y, x] for _, l in cells.values() for x, y in l]
    line_hex = hexof(tuple(int(round(v)) for v in np.mean(line_cols, axis=0)))
    colors = {'abcdefghij'[k]: hexof(c) for k, c in enumerate(means)}
    colors['k'] = line_hex
    lit = hexof(means[0])
    out = [
        "// Aurelia's small hands (the female bodies' hands: 'small'), the owner's pixels from his picture of her",
        '// at our scale (docs/reference/aurelia-escala-juego-owner-reference.jpg), by',
        '// tools/refs/aurelia-hands-from-ref.py. Generated: rerun the script to change it.',
        '',
        "import type { PaintedPiece } from './painted';",
        '',
        '/** His lit skin on her hands: a body\'s skin recolours them from it (at it they stay his). */',
        f"export const DAWN_HAND_SKIN = '{lit}';",
        '/** His line (never recoloured). */',
        f"export const DAWN_HAND_LINE = '{line_hex}';",
        '',
    ]
    docs = {
        'NEAR': 'Her open near hand below her cuff (pivot: the near wrist; angle: the near forearm at idle).',
        'FIST': 'Her far fist as he drew it round the staff, the shaft left out (pivot: the far wrist; angle: the far forearm at idle): the small fist on either arm.',
    }
    preview_px = {}
    for name, h in HANDS.items():
        skin, line = cells[name]
        px = {}
        for x, y in skin:
            px[(x, y)] = letter_of[tuple(int(v) for v in N[y, x])]
        for x, y in line:
            px[(x, y)] = 'k'
        xs = [x for x, _ in px]
        ys = [y for _, y in px]
        x0, y0 = min(xs), min(ys)
        W, H = max(xs) - x0 + 1, max(ys) - y0 + 1
        rows = [['.'] * W for _ in range(H)]
        for (x, y), ch in px.items():
            rows[y - y0][x - x0] = ch
        wx, wy = J[h['wrist']]
        ex, ey = J[h['elbow']]
        # the pivot: the cell over our wrist, in his cells
        px0 = math.floor(wx) - DX - x0
        py0 = math.floor(wy) - DY - y0
        ang = math.degrees(math.atan2(wy - ey, wx - ex))
        used = sorted({c for r in rows for c in r if c != '.'})
        out.append(f'/** {docs[name]} */')
        out.append(f'export const DAWN_HAND_{name}: PaintedPiece = {{')
        out.append(f'  pivot: [{px0}, {py0}],')
        out.append(f'  angle: {ang:.2f},')
        out.append('  rows: [')
        out += [f"    '{''.join(r)}'," for r in rows]
        out.append('  ],')
        out.append('  colors: { ' + ', '.join(f"{c}: '{colors[c]}'" for c in used) + ' },')
        out.append('};')
        out.append('')
        preview_px[name] = (px, x0, y0, W, H)
    text = '\n'.join(out).rstrip('\n') + '\n'
    tmp = path + '.tmp'
    with open(tmp, 'w') as f:
        f.write(text)
    os.replace(tmp, path)
    if preview:
        os.makedirs(preview, exist_ok=True)
        for name, (px, x0, y0, W, H) in preview_px.items():
            k = 16
            his = np.full((H, W, 3), 255, np.uint8)
            ours = np.full((H, W, 3), 255, np.uint8)
            for (x, y), ch in px.items():
                his[y - y0, x - x0] = N[y, x]
                c = colors[ch]
                ours[y - y0, x - x0] = [int(c[i:i + 2], 16) for i in (1, 3, 5)]
            img = np.concatenate([his, np.full((H, 1, 3), 40, np.uint8), ours], 1)
            Image.fromarray(img).resize((img.shape[1] * k, H * k), Image.NEAREST).save(os.path.join(preview, f'hand-{name.lower()}@16.png'))
    print(', '.join(f'{n} {len(cells[n][0])} skin {len(cells[n][1])} line' for n in HANDS), 'skin', lit, 'colours', len(means))


if __name__ == '__main__':
    main()
