"""Lifts the owner's lightning in the hand out of his two silver-haired paint-overs, for the
activated Chidori (docs/GAMEPLAY_DESIGN.md, "The Chidori becomes an activated state": "copies el
sprite de la mano de rayo para ponersela al efecto de chidori").

His pictures (2000x2000 JPEG, his pixel art scaled up):
  docs/reference/tactico-chaleco-owner-reference.jpg  the tactical vest: lightning crackling round
      the near forearm and fist, a pale ring round the fist and thin bolts out of it;
  docs/reference/tactico-abrigo-owner-reference.jpg   the long coat: a bigger burst of sparks round
      the fist.
They are two different scales of his: in the vest his pixel is about 17.9 x 18.0 picture px, in the
coat exactly 20. Each picture's grid (pitch and phase on each axis) is found here from his black
outline: the pitch and phase whose cell borders fall on the strongest jumps in brightness, over a
window round the near arm (coarse search, then a fine one). Each of his pixels is the median of its
cell's interior (3 px in from the borders, where the JPEG smears).

Out of a box of his cells round the near forearm and fist this keeps only the lightning:
  - the white around him is left out: reached from the box's edge through near-white cells (every
    channel >= 251, grey within 4);
  - his arm is left out: skin (red over blue by 26 or more, red >= green);
  - his white seen through between the arm and the vest, shut in there (from a cell of it, 'through');
  - his clothes and black line are left out: green cloth (green over blue by 13 or more) and anything
    darker than luma 115 (in the coat this also leaves out
    the coat lit teal by the burst: lit cloth, not lightning);
  - what is left is his lightning: whites and pale blues over the arm, his grey ring, his steel-blue
    sparks over the white.
The anchor is his fist: the middle of the skin cells in the arm's lowest 7 rows (where our rig's near
hand is). His pixels stay one game pixel each (his figure is about the height of ours), unturned and
unflipped: his near arm is on the left of his picture, as ours is facing right.

His colours: cells within 6 of a colour already seen share it (the first one seen, in reading order,
vest first), so the JPEG's noise gives no colour that is not one of his pixels.

Writes tools/world-sprites/vfx-chidori-refdata.ts (generated: rerun this to change it) and, with a
third argument, a check sheet (his box, the kept lightning, at 8x) to look at. Same input, same bytes.

  python3 -I tools/refs/chidori-hand-from-ref.py docs/reference/tactico-chaleco-owner-reference.jpg \
      docs/reference/tactico-abrigo-owner-reference.jpg tools/world-sprites/vfx-chidori-refdata.ts [<check.png>]
"""

import json
import os
import sys

import numpy as np
from PIL import Image

ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

# Per picture: the window (picture px) the grid is fitted in, and the box of his cells kept (c0, r0, c1, r1).
PICTURES = [
    # In the vest his white background shows through between the arm and the body, shut in there:
    # 'through' is a cell of it (his cells), from which it is left out too.
    {'name': 'vest', 'fit': (500, 1000, 800, 1500), 'box': (24, 46, 52, 82), 'through': [(49, 58)]},
    {'name': 'coat', 'fit': (400, 1000, 850, 1550), 'box': (16, 44, 50, 80), 'through': []},
]
FIST_ROWS = 7


def fit_axis(g, lo, hi):
    """The pitch and phase whose borders fall on the strongest brightness jumps in g[lo:hi]."""
    def score(p, ph):
        n0 = int(np.ceil((lo - ph) / p))
        n1 = int((hi - ph) / p)
        idx = np.floor(ph + np.arange(n0, n1 + 1) * p).astype(int)
        idx = idx[(idx >= 1) & (idx < len(g))]
        return g[idx - 1].mean()

    best = (-1.0, 0.0, 0.0)
    for p in np.arange(17.0, 21.0, 0.01):
        for ph in np.arange(0, p, 0.5):
            s = score(p, ph)
            if s > best[0] + 1e-9:
                best = (s, p, ph)
    _, p0, _ = best
    best = (-1.0, 0.0, 0.0)
    for p in np.arange(p0 - 0.03, p0 + 0.03, 0.002):
        for ph in np.arange(0, p, 0.1):
            s = score(p, ph)
            if s > best[0] + 1e-9:
                best = (s, p, ph)
    return round(float(best[1]), 3), round(float(best[2]), 1)


def lift(path, spec):
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.int32)
    L = a.astype(np.float64).mean(2)
    x0, x1, y0, y1 = spec['fit']
    px, phx = fit_axis(np.abs(np.diff(L[y0:y1], axis=1)).sum(0), x0, x1)
    py, phy = fit_axis(np.abs(np.diff(L[:, x0:x1], axis=0)).sum(1), y0, y1)
    c0, r0, c1, r1 = spec['box']
    H, W = r1 - r0, c1 - c0
    cells = np.zeros((H, W, 3), np.int32)
    for j in range(H):
        for i in range(W):
            xa = int(np.floor(phx + (c0 + i) * px))
            xb = int(np.floor(phx + (c0 + i + 1) * px))
            ya = int(np.floor(phy + (r0 + j) * py))
            yb = int(np.floor(phy + (r0 + j + 1) * py))
            blk = a[ya + 3:yb - 3, xa + 3:xb - 3].reshape(-1, 3)
            cells[j, i] = np.round(np.median(blk, axis=0))
    r, g, b = cells[..., 0], cells[..., 1], cells[..., 2]
    luma = 0.299 * r + 0.587 * g + 0.114 * b
    white = (cells.min(2) >= 251) & (cells.max(2) - cells.min(2) <= 4)
    bg = np.zeros((H, W), bool)
    stack = [(y, x) for y in (0, H - 1) for x in range(W)] + [(y, x) for x in (0, W - 1) for y in range(H)]
    for (tc, tr) in spec['through']:
        if not white[tr - r0, tc - c0]:
            raise SystemExit(f'{spec["name"]}: cell {(tc, tr)} is not his white')
        stack.append((tr - r0, tc - c0))
    while stack:
        y, x = stack.pop()
        if not (0 <= y < H and 0 <= x < W) or bg[y, x] or not white[y, x]:
            continue
        bg[y, x] = True
        stack += [(y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)]
    skin = (r - b >= 26) & (r >= g)
    # Green cloth (the vest's olive) is cloth whatever its brightness: his lightning is never greener than blue.
    cloth = g - b > 12
    keep = ~bg & ~skin & ~cloth & (luma >= 115)
    # His fist: the middle of the skin in the arm's lowest rows.
    ys = np.nonzero(skin.any(1))[0]
    low = ys.max()
    fy, fx = np.nonzero(skin[low - FIST_ROWS + 1:low + 1])
    anchor = (float(fx.mean()), float(fy.mean() + low - FIST_ROWS + 1))
    return {'cells': cells, 'keep': keep, 'grid': [px, phx, py, phy], 'anchor': anchor}


def main():
    vest, coat, out = sys.argv[1], sys.argv[2], sys.argv[3]
    check = sys.argv[4] if len(sys.argv) > 4 else None
    lifted = [lift(p, s) for p, s in zip((vest, coat), PICTURES)]
    pal = []
    frames = []
    for spec, f, src in zip(PICTURES, lifted, (vest, coat)):
        cells, keep = f['cells'], f['keep']
        H, W = keep.shape
        rows = []
        for y in range(H):
            line = ''
            for x in range(W):
                if not keep[y, x]:
                    line += '.'
                    continue
                c = cells[y, x]
                for k, ref in enumerate(pal):
                    if np.abs(ref - c).max() <= 6:
                        break
                else:
                    pal.append(c.copy())
                    k = len(pal) - 1
                line += ALPHABET[k]
            rows.append(line)
        # Trim to the kept pixels; the anchor follows.
        ys = [y for y, l in enumerate(rows) if l.strip('.')]
        xs = [x for x in range(W) if any(l[x] != '.' for l in rows)]
        ty, tx = ys[0], xs[0]
        rows = [l[tx:xs[-1] + 1] for l in rows[ty:ys[-1] + 1]]
        ax, ay = f['anchor']
        frames.append({
            'name': spec['name'],
            'source': os.path.basename(src),
            'grid': f['grid'],
            'box': list(spec['box']),
            'anchor': [round(ax - tx, 2), round(ay - ty, 2)],
            'rows': rows,
        })
    if len(pal) > len(ALPHABET):
        raise SystemExit(f'{len(pal)} colours: more than the alphabet holds')
    data = {'pal': ['#%02x%02x%02x' % tuple(int(v) for v in c) for c in pal], 'frames': frames}
    head = [
        '// Generated by tools/refs/chidori-hand-from-ref.py from the owner\'s two silver-haired paint-overs',
        '// (docs/reference/tactico-chaleco-owner-reference.jpg, tactico-abrigo-owner-reference.jpg): rerun the',
        '// script to change it. His lightning round the near forearm and fist, one frame per picture (rows',
        '// of palette letters, \'.\' clear; one of his pixels each), its anchor his fist; grid: his pixel\'s',
        '// pitch and phase in the picture (x, then y); box: his cells it was cut from.',
        '',
        'export interface ChidoriRefFrame {',
        '  name: string;',
        '  source: string;',
        '  grid: number[];',
        '  box: number[];',
        '  anchor: [number, number];',
        '  rows: string[];',
        '}',
        '',
        'export const CHIDORI_REF: { pal: string[]; frames: ChidoriRefFrame[] } = ',
    ]
    with open(out, 'w') as fh:
        fh.write('\n'.join(head) + json.dumps(data, indent=1) + ';\n')
    if check:
        k = 8
        tiles = []
        for f, fr in zip(lifted, frames):
            cells, keep = f['cells'], f['keep']
            his = cells.astype(np.uint8)
            ours = np.zeros_like(his)
            ours[...] = (30, 52, 40)
            ours[keep] = his[keep]
            tiles += [his, np.full((his.shape[0], 2, 3), 255, np.uint8), ours, np.full((his.shape[0], 6, 3), 255, np.uint8)]
        h = max(t.shape[0] for t in tiles)
        tiles = [np.pad(t, ((0, h - t.shape[0]), (0, 0), (0, 0)), constant_values=255) for t in tiles]
        sheet = np.concatenate(tiles, 1)
        Image.fromarray(np.repeat(np.repeat(sheet, k, 0), k, 1)).save(check)
    print(f'chidori-hand: {len(pal)} colours, frames ' + ', '.join(f"{f['name']} {len(f['rows'][0])}x{len(f['rows'])} grid {f['grid']}" for f in frames))


main()
