"""The owner's grey rock from his Roman sit picture (docs/reference/roman-sit-owner-reference.jpg: the rock his
legionary sits on in the four frames "Cuadro 1" to "Cuadro 4") as a seat prop of its own:
src/sprite/seatBoulderArt.ts (src/sprite/seats.ts).

His pixels are 2000/240 picture pixels each (a 240-wide grid, its first cell at PHASE), but his figure is drawn
at 80% of ours (his head against our male's head at sit frame 0): one of his pixels is 1.25 fine pixels. The
owner chose to build the sit at our scale ("romano sentado a"), so the rock, a prop, is scaled by 1.25 too
(nearest neighbour: some of his rows and columns are doubled) to fit our seated figure.

His four frames have the same rock. Every cell of it that one of his frames shows is his (the last frame
first: no sword leans on it there). What his figure hides (the drape and the strips over its top, the legs
before its right end) is continued from his own pixels: a hidden cell takes his pixel of the rock's front face
HIDDEN_DROPS rows below it (the first that is his), or else his nearest rock pixel, up to the rock's outline (ROCK: his top left corner
carried flat across under the hips, rounding down to his right end); the new edges get his black line.

It lands in the sprite's frame where his frame 1 lands on our male (place: his cell (x, y) of a frame, from the
frame's start, at fine pixel (x * 1.25 + 79, y * 1.25 + 106)): his head on our head, and 6 px up from there,
so his soles stand on our ground line, as the sit pose has it (rig.ts SIT). The same picture always gives the
same bytes. From the repository root:

  python3 -I tools/refs/roman-sit-rock-from-ref.py [src/sprite/seatBoulderArt.ts] [study.png]
"""

import colorsys
import os
import sys

import numpy as np
from PIL import Image

REF = 'docs/reference/roman-sit-owner-reference.jpg'
OUT = 'src/sprite/seatBoulderArt.ts'
PITCH = 2000 / 240
PHASE = (8.3, 4.15)
# Where each of his frames starts (his cells): 60 apart, the last drawn 2 cells further left (its rock too).
STARTS = [0, 60, 120, 178]
# His cell (x, y) of a frame -> our fine pixel: x * SCALE + DX, y * SCALE + DY.
SCALE = 1.25
DX, DY = 79, 106
# The rock's outline (his cells, from a frame's start): his top left corner, carried flat across under the
# hips, rounding down to his right end, his bottom.
ROCK = [(3, 68), (6, 65), (9, 64), (30, 64), (32, 66), (34, 70), (34, 89), (2, 89)]
# Where his rock shows in his frames (his cells): its left stone beside the drape, and below the drape's hem
# its front stones up to his near sandal. Above the hem, right of the left stone, is his figure.
SEEN = [(2, 63), (14, 63), (14, 79), (33, 79), (33, 89), (2, 89)]
HIDDEN_DROPS = (16, 8)
LINE = (0, 4, 20)


def native():
    """His picture as his cells (the median of each, 2 picture pixels in from its edges)."""
    a = np.asarray(Image.open(REF).convert('RGB')).astype(float)
    H, W, _ = a.shape
    nx, ny = int((W - PHASE[0]) // PITCH), int((H - PHASE[1]) // PITCH)
    out = np.zeros((ny, nx, 3), int)
    for j in range(ny):
        for i in range(nx):
            x0, y0 = PHASE[0] + i * PITCH, PHASE[1] + j * PITCH
            c = a[int(round(y0 + 2)):int(round(y0 + PITCH - 2)), int(round(x0 + 2)):int(round(x0 + PITCH - 2))].reshape(-1, 3)
            out[j, i] = np.round(np.median(c, axis=0))
    return out


def inside(poly, H, W):
    """Cells whose centres lie inside the polygon (his cell corners)."""
    m = np.zeros((H, W), bool)
    n = len(poly)
    for y in range(H):
        for x in range(W):
            px, py, c = x + 0.5, y + 0.5, False
            for k in range(n):
                (x1, y1), (x2, y2) = poly[k], poly[(k + 1) % n]
                if (y1 > py) != (y2 > py) and px < x1 + (py - y1) * (x2 - x1) / (y2 - y1):
                    c = not c
            m[y, x] = c
    return m


def kind(c, bg):
    """'.' his background, '#' his line, 'r' his rock (greys and grey browns), 'x' his figure."""
    if np.abs(c - bg).max() <= 18:
        return '.'
    if max(c) < 70:
        return '#'
    _, lum, sat = colorsys.rgb_to_hls(*(c / 255))
    return 'r' if sat < 0.32 and lum > 0.2 else 'x'


def lift():
    nat = native()
    bg = np.median(nat.reshape(-1, 3), axis=0)
    H = nat.shape[0]
    W = 60
    region = inside(ROCK, H, W)
    seen = inside(SEEN, H, W) & region
    col = np.zeros((H, W, 3), int)
    his = np.zeros((H, W), bool)
    for start in reversed(STARTS):
        c = nat[:, start:start + W]
        K = np.array([[kind(c[y, x], bg) for x in range(W)] for y in range(H)])
        rock = (K == 'r') & seen
        # his line belongs to the rock where only rock (or his background) is beside it
        fig = K == 'x'
        near_fig = fig.copy()
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                near_fig |= np.roll(np.roll(fig, dy, 0), dx, 1)
        line = (K == '#') & seen & ~near_fig
        take = (rock | line) & ~his
        col[take] = c[take]
        his |= take
    # the cells his figure hides: his front face HIDDEN_DROPS rows below, else his nearest rock pixel
    out = col.copy()
    mask = region.copy()
    rock_his = his & (np.abs(col - np.array(LINE)).max(axis=2) > 40)
    ys, xs = np.nonzero(rock_his)
    for y in range(H):
        for x in range(W):
            if not region[y, x] or his[y, x]:
                continue
            drop = next((d for d in HIDDEN_DROPS if y + d < H and rock_his[y + d, x]), None)
            if drop is not None:
                out[y, x] = col[y + drop, x]
                continue
            k = int(np.argmin(np.abs(ys - y) + np.abs(xs - x)))
            out[y, x] = col[ys[k], xs[k]]
    # his black line along the new edges
    edge = np.zeros_like(mask)
    for y in range(H):
        for x in range(W):
            if mask[y, x] and not his[y, x]:
                nb = [(y + dy, x + dx) for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1))]
                if any(not (0 <= q < H and 0 <= p < W) or not mask[q, p] for q, p in nb):
                    edge[y, x] = True
    out[edge] = LINE
    return out, mask, his


def scaled(out, mask):
    """His cells at 1.25 (nearest neighbour), cropped to the rock: rows, colours and where it lands."""
    H, W = mask.shape
    h2, w2 = int(H * SCALE), int(W * SCALE)
    ys = (np.arange(h2) / SCALE).astype(int)
    xs = (np.arange(w2) / SCALE).astype(int)
    m2 = mask[ys][:, xs]
    c2 = out[ys][:, xs]
    yy, xx = np.nonzero(m2)
    y0, y1, x0, x1 = yy.min(), yy.max() + 1, xx.min(), xx.max() + 1
    return m2[y0:y1, x0:x1], c2[y0:y1, x0:x1], (int(DX + x0), int(DY + y0))


# the long alphabet his JPEG pictures need (roman_ref.CHARS)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from roman_ref import CHARS  # noqa: E402


def module(m, c, at):
    # his colours, those within 3 of one met before in the rows sharing it (the picture's noise)
    seen = []
    rows = []
    for y in range(m.shape[0]):
        row = ''
        for x in range(m.shape[1]):
            if not m[y, x]:
                row += '.'
                continue
            for i, ref in enumerate(seen):
                if np.abs(ref - c[y, x]).max() <= 3:
                    break
            else:
                seen.append(c[y, x].copy())
                i = len(seen) - 1
            row += CHARS[i]
        rows.append(row)
    key = {'#%02x%02x%02x' % tuple(int(v) for v in ref): CHARS[i] for i, ref in enumerate(seen)}
    out = [
        "// The owner's grey rock from his Roman sit, as a seat prop of its own (tools/refs/roman-sit-rock-from-ref.py from",
        '// docs/reference/roman-sit-owner-reference.jpg, scaled by 1.25 to our figure). Generated: rerun the script to change it.',
        '',
        '/** His rock in the sprite\'s frame: its first cell at fine pixel `at`, seated characters on it. */',
        'export const SEAT_BOULDER = {',
        f'  at: [{at[0]}, {at[1]}] as [number, number],',
        '  rows: [',
    ]
    out += [f"    '{r}'," for r in rows]
    out += ['  ],', '  colors: { ' + ', '.join(f"'{k}': '{h}'" for h, k in key.items()) + ' } as Record<string, string>,', '};', '']
    out += ['/** The fine pixel row of its first row (his top line under the hips). */', f'export const SEAT_BOULDER_ROW = {at[1]};', '']
    return '\n'.join(out)


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else OUT
    study = sys.argv[2] if len(sys.argv) > 2 else None
    out, mask, his = lift()
    m, c, at = scaled(out, mask)
    text = module(m, c, at)
    tmp = path + '.tmp'
    with open(tmp, 'w') as f:
        f.write(text)
    os.replace(tmp, path)
    print('rock', m.shape[1], 'x', m.shape[0], 'px at', at, 'his cells', int(his.sum()), 'of', int(mask.sum()))
    if study:
        img = np.zeros(mask.shape + (4,), np.uint8)
        img[mask, :3] = out[mask]
        img[mask, 3] = 255
        # beside it, his cells only (the continued ones left out)
        mine = img.copy()
        mine[mask & ~his] = 0
        both = np.concatenate([img, np.zeros((mask.shape[0], 2, 4), np.uint8), mine], axis=1)
        ys, xs = np.nonzero(both[..., 3])
        both = both[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        Image.fromarray(both).resize((both.shape[1] * 10, both.shape[0] * 10), Image.NEAREST).save(study)


if __name__ == '__main__':
    main()
