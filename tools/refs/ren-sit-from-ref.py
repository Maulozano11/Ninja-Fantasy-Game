"""Ren seated on the male body: the owner's repaint (docs/reference/ren-sit-owner-reference.jpg), his four
frames as painted pieces (src/sprite/items/renSitArt.ts, drawn by src/sprite/renSit.ts).

His picture is our sheet "Ren - Sentado con la palma abierta (corregida)" (two rows: Ren on the male and on
the bulky body, sit frames 1-4, 4x) with the lower row painted over: short sleeves, bare muscular arms, the
far hand open. The owner: "copia la version de abajo la de arriba ignorala y va ser para el hombre normal no
para el fornido como indica la imagen". So his lower row is Ren's sit on the male body; the upper row is not
read.

His picture is a soft JPEG of the sheet a little scaled (its cells 4.35-4.40 picture pixels a fine pixel,
each cell a little apart), not a crisp grid. Each lower cell is found on the picture (CELLS), then brought
onto our fine pixels by its scale and offset (FIT: found by fit(), matching the rock he did not repaint
against our rock, src/sprite/seatRockSitArt.ts). Each fine pixel is the median of its cell's middle, and
every colour is snapped to one palette of his colours over the four frames (KMEANS colours, seeded from his
most unlike colours so the eyes and the sword's gold keep theirs).

His figure is what is not his page's grey, off our rock; over the rock it is where the figure he painted
over covered it (ren_sit_painted_over.py) unless he left the rock's colour there. Loose specks of under SPECK
pixels and the page's blend round his edge (PEEL) are left out. Each of his pixels goes to the body part
whose bone is nearest (the bulky rig he painted over), one piece a part, all pinned to the male pelvis in
the sit, where they lie exactly as he painted them on the rock (check()).

The same picture always gives the same bytes. From the repository root:

  python3 -I tools/refs/ren-sit-from-ref.py [src/sprite/items/renSitArt.ts] [studyDir]
  python3 -I tools/refs/ren-sit-from-ref.py --fit     (prints FIT, slow)
"""

import os
import re
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import owner_frames as F  # noqa: E402
import owner_paintover as P  # noqa: E402
import ren_sit_painted_over as O  # noqa: E402

PICTURE = os.path.join(P.REPO, 'docs/reference/ren-sit-owner-reference.jpg')
ROCK = os.path.join(P.REPO, 'src/sprite/seatRockSitArt.ts')
OUT = 'src/sprite/items/renSitArt.ts'

# Our sheet's box (fine pixels of the frame) its cells show, at 4x: (x0, y0, x1, y1).
BOX = (63, 123, 162, 223)
# Each lower cell on his picture: scale (picture pixels a fine pixel, x and y) and offset from the cell's
# corner (picture pixels), as fit() found them.
FIT = {0: (4.4, 4.4, 1.75, -2.5), 1: (4.38, 4.345, 1.75, 1.5), 2: (4.395, 4.35, 2.25, 0.5), 3: (4.365, 4.375, 0.75, -0.75)}
# How far from his page's grey (sum over r, g, b) a pixel of his figure is, and at least how far one on its
# edge is (nearer, it is the page blended into his edge).
FIGURE = 45
PEEL = 120
# A light grey (mean over r, g, b, and spread) on his edge is his page blended in; peeled this many times.
GREY_LUM = 95
GREY_SAT = 25
PEELS = 3
# How near the rock's own colour (sum over r, g, b) a pixel of his over the rock is still his rock.
ROCKISH = 45
# His specks apart from the figure: fewer pixels than this are the picture's noise.
SPECK = 6
# The largest hole of background his figure walls in that is closed (holes.ts PINHOLE), and how many times
# closing a notch in his edge may open the next one (holes.ts ROUNDS).
PINHOLE = 3
ROUNDS = 6
# The colours of his palette.
KMEANS = 80
# His black line: every channel under this.
LINE = 24
# The skin and the eyes his frames are painted in (Ren's preset): the character's follow from them.
SKIN = '#ecac85'
EYE = '#1787df'

ARM_LEG = {
    'upperArmN': ('shoulderN', 'elbowN'), 'forearmN': ('elbowN', 'wristN'), 'handN': ('wristN', 'handN'),
    'upperArmF': ('shoulderF', 'elbowF'), 'forearmF': ('elbowF', 'wristF'), 'handF': ('wristF', 'handF'),
    'thighN': ('hipN', 'kneeN'), 'shinN': ('kneeN', 'ankleN'), 'thighF': ('hipF', 'kneeF'), 'shinF': ('kneeF', 'ankleF'),
    'torso': ('neck', 'pelvis'),
}
# The foot: from the ankle forward along the ground (fine pixels).
FOOT = (6.0, 1.0)
# The head: within this of the head joint and above the neck's foot.
HEAD_R = 14.0
DEPTH = {'head': 'head.face', 'torso': 'torso.top', 'pelvis': 'torso.top'}


def depth_of(part):
    if part in DEPTH:
        return DEPTH[part]
    near = part.endswith('N')
    if part.startswith(('upperArm', 'forearm', 'hand')):
        return 'nearArm.cloth' if near else 'farArm.cloth'
    return 'nearLeg.cloth' if near else 'farLeg.cloth'


def picture():
    return np.asarray(Image.open(PICTURE).convert('RGB')).astype(float)


def cells(pic):
    """The lower row's four cells on his picture: (left edges, top): runs of columns and rows off his page."""
    page = np.array([243, 242, 237])
    off = np.abs(pic - page).sum(-1) > 18
    def runs(v):
        out, start = [], None
        for i, on in enumerate(v > 0.9):
            if on and start is None:
                start = i
            if not on and start is not None:
                out.append((start, i))
                start = None
        if start is not None:
            out.append((start, len(v)))
        return out
    rows = runs(off[:, 300:700].mean(1))
    top = rows[1][0]
    cols = [a for a, _ in runs(off[top + 34:top + 424].mean(0))]
    if len(cols) != 4 or len(rows) != 2:
        raise ValueError(f'cells not found: {cols} {rows}')
    return cols, top


def rock():
    """Our talking rock (seatRockSitArt.ts) in the sheet's box: (colours, mask)."""
    src = open(ROCK).read()
    at = [int(v) for v in re.search(r'at: \[(\d+), (\d+)\]', src).groups()]
    rows = re.findall(r"^\s+'([^']*)',$", src.split('rows: [')[1].split('],')[0], re.M)
    colors = dict(re.findall(r"'(\w)': '(#[0-9a-f]{6})'", src.split('colors: {')[1].split('}')[0]))
    W, H = BOX[2] - BOX[0], BOX[3] - BOX[1]
    col = np.zeros((H, W, 3))
    m = np.zeros((H, W), bool)
    for j, row in enumerate(rows):
        for i, c in enumerate(row):
            x, y = at[0] + i - BOX[0], at[1] + j - BOX[1]
            if c != '.' and 0 <= x < W and 0 <= y < H:
                col[y, x] = F.rgb(colors[c])
                m[y, x] = True
    return col, m


def sample(pic, f, corner, top, fit=None):
    """His cell f at our fine pixels: the median of each fine pixel's middle."""
    sx, sy, dx, dy = fit or FIT[f]
    ox, oy = corner + dx, top + dy
    W, H = BOX[2] - BOX[0], BOX[3] - BOX[1]
    out = np.zeros((H, W, 3))
    a, b = P.MIDDLE
    for j in range(H):
        for i in range(W):
            x0, x1 = ox + (i + a) * sx, ox + (i + b) * sx
            y0, y1 = oy + (j + a) * sy, oy + (j + b) * sy
            win = pic[int(np.floor(y0)):int(np.ceil(y1)), int(np.floor(x0)):int(np.ceil(x1))].reshape(-1, 3)
            # (a fine pixel past his picture's edge: nothing of his there)
            out[j, i] = np.median(win, 0) if len(win) else np.nan
    return out


def fit():
    """Each cell's scale and offset: the ones under which his rock is likeliest ours (mean difference)."""
    pic = picture()
    corners, top = cells(pic)
    rcol, rm = rock()
    for f in range(4):
        over = np.zeros_like(rm)
        for x, y in O.OVER_ROCK[f]:
            over[y - BOX[1], x - BOX[0]] = True
        bare = rm & ~over
        best = None
        for s in np.arange(4.2, 4.5, 0.01):
            for dx in np.arange(-10, 10.01, 1):
                for dy in np.arange(-10, 10.01, 1):
                    e = np.abs(sample(pic, f, corners[f], top, (s, s, dx, dy))[bare] - rcol[bare]).mean()
                    if best is None or e < best[0]:
                        best = (e, s, s, dx, dy)
        print(f, best)


def figure(col, f, rcol, rm):
    """His figure in cell f: off his page, off our rock or over it where the figure he painted over was."""
    H, W = rm.shape
    page = np.median(col[3:20, 3:25].reshape(-1, 3), 0)
    far = np.abs(col - page).sum(-1)
    over = np.zeros_like(rm)
    for x, y in O.OVER_ROCK[f]:
        over[y - BOX[1], x - BOX[0]] = True
    rockish = (np.abs(col - rcol).sum(-1) < ROCKISH) & (col[..., 0] > col[..., 2] + 4)
    m = (far > FIGURE) & (~rm | (over & ~rockish))
    # (the page blended into his edge, peeled off in turn: near his page's grey, or a light grey bluer than
    # red as his page is, which no colour of his figure's edge is)
    lum = col.mean(-1)
    greyish = (lum > GREY_LUM) & (col.max(-1) - col.min(-1) < GREY_SAT) & (col[..., 2] > col[..., 0])
    for _ in range(PEELS):
        edge = m & ~(np.roll(m, 1, 0) & np.roll(m, -1, 0) & np.roll(m, 1, 1) & np.roll(m, -1, 1))
        m &= ~(edge & ((far < PEEL) | greyish))
    # (specks off the figure, and anything on the cell's border)
    lab = label8(m)
    sizes = np.bincount(lab.ravel())
    big = int(np.argmax(sizes[1:])) + 1
    keep = np.zeros_like(m)
    for k in range(1, len(sizes)):
        ys, xs = np.nonzero(lab == k)
        border = ys.min() == 0 or xs.min() == 0 or ys.max() == H - 1 or xs.max() == W - 1
        if k == big or (sizes[k] >= SPECK and not border):
            keep |= lab == k
    return keep


def label8(m):
    H, W = m.shape
    lab = np.zeros((H, W), int)
    n = 0
    for y in range(H):
        for x in range(W):
            if m[y, x] and not lab[y, x]:
                n += 1
                stack = [(y, x)]
                lab[y, x] = n
                while stack:
                    a, b = stack.pop()
                    for da in (-1, 0, 1):
                        for db in (-1, 0, 1):
                            u, v = a + da, b + db
                            if 0 <= u < H and 0 <= v < W and m[u, v] and not lab[u, v]:
                                lab[u, v] = n
                                stack.append((u, v))
    return lab


def palette(cols, masks):
    """KMEANS colours of his over the four frames: seeded from his darkest, then each the most unlike."""
    px = np.concatenate([c[m] for c, m in zip(cols, masks)])
    seeds = [px[np.argmin(px.sum(1))]]
    d = ((px - seeds[0]) ** 2).sum(1)
    for _ in range(KMEANS - 1):
        i = int(np.argmax(d))
        seeds.append(px[i])
        d = np.minimum(d, ((px - px[i]) ** 2).sum(1))
    C = np.array(seeds, float)
    for _ in range(40):
        lab = ((px[:, None, :] - C[None]) ** 2).sum(-1).argmin(1)
        for k in range(KMEANS):
            if (lab == k).any():
                C[k] = px[lab == k].mean(0)
    return np.round(C)


def snap(col, C):
    return C[((col[:, :, None, :] - C[None, None]) ** 2).sum(-1).argmin(-1)]


def seg_dist(p, a, b):
    a, b = np.array(a), np.array(b)
    ab = b - a
    t = np.clip(((p - a) @ ab) / max(ab @ ab, 1e-9), 0, 1)
    return np.linalg.norm(p - (a + np.outer(t, ab)), axis=1)


def parts_of(m, f):
    """Each pixel of his figure to the part whose bone is nearest (the bulky rig he painted over)."""
    J = O.JOINTS[f]
    ys, xs = np.nonzero(m)
    p = np.stack([xs + BOX[0] + 0.5, ys + BOX[1] + 0.5], 1)
    names = list(ARM_LEG) + ['footN', 'footF']
    d = []
    for n in ARM_LEG:
        a, b = ARM_LEG[n]
        d.append(seg_dist(p, J[a], J[b]))
    for s in 'NF':
        ax, ay = J['ankle' + s]
        d.append(seg_dist(p, (ax, ay), (ax + FOOT[0], ay + FOOT[1])))
    part = np.array(names)[np.argmin(np.array(d), 0)]
    hx, hy = J['head']
    head = (np.hypot(p[:, 0] - hx, p[:, 1] - hy) < HEAD_R) & (p[:, 1] < J['neck'][1] + 1)
    part[head] = 'head'
    out = np.full(m.shape, '', object)
    out[ys, xs] = part
    return out


def kind_of(h, part):
    r, g, b = F.rgb(h)
    if max(r, g, b) < LINE:
        return 'line'
    if part == 'head' and b > r + 25:
        return 'eye'
    if r > 110 and r > g > b and r - b > 40:
        return 'skin'
    return 'keep'


def is_line(c):
    """His line, as the game reads a line pixel (holes.ts isLinePixel: HSL lightness at most 0.2)."""
    return (max(c) + min(c)) / 2 <= 0.2 * 255


def close_gaps(col, raw, m):
    """The gaps the game closes in every frame of ours (holes.ts), closed here in his: background walled in
    by his figure (up to PINHOLE pixels) and a notch in his edge with his figure on three sides, one of them
    not his line. Each takes his own pixel there where it is his figure's (not his page's grey), else the
    colour most of its neighbours have."""
    H, W = m.shape
    page = np.median(raw[3:20, 3:25].reshape(-1, 3), 0)
    def fill(y, x):
        if np.abs(raw[y, x] - page).sum() > FIGURE / 2 and not np.isnan(raw[y, x]).any():
            return col_of(raw[y, x])
        nb = [tuple(col[v, u]) for v, u in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)) if 0 <= v < H and 0 <= u < W and m[v, u]]
        return max(sorted(set(nb)), key=nb.count)
    C = np.unique(col[m].reshape(-1, 3), axis=0)
    col_of = lambda c: C[((C - c) ** 2).sum(1).argmin()]
    lab = label8(~m)  # (8-way: a hole is walled in only if no diagonal opens it)
    for k in range(1, lab.max() + 1):
        ys, xs = np.nonzero(lab == k)
        if len(ys) <= PINHOLE and ys.min() > 0 and xs.min() > 0 and ys.max() < H - 1 and xs.max() < W - 1:
            for y, x in zip(ys, xs):
                col[y, x] = fill(y, x)
                m[y, x] = True
    for _ in range(ROUNDS):
        nicks = []
        for y in range(1, H - 1):
            for x in range(1, W - 1):
                if m[y, x]:
                    continue
                sides = [(v, u) for v, u in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)) if m[v, u]]
                if len(sides) >= 3 and not all(is_line(col[v, u]) for v, u in sides):
                    nicks.append((y, x))
        if not nicks:
            break
        for y, x in nicks:
            col[y, x] = fill(y, x)
            m[y, x] = True
    return col, m


def frames():
    pic = picture()
    corners, top = cells(pic)
    rcol, rm = rock()
    raws = [sample(pic, f, corners[f], top) for f in range(4)]
    masks = [figure(raws[f], f, rcol, rm) for f in range(4)]
    C = palette(raws, masks)
    out = [close_gaps(snap(raws[f], C), raws[f], masks[f]) for f in range(4)]
    return [c for c, _ in out], [m for _, m in out]


def pieces(col, m, f):
    own = parts_of(m, f)
    ax, ay = F.anchor(O.MALE_PELVIS[f])
    out = []
    for part in sorted(set(own[m])):
        pm = m & (own == part)
        rows, (x0, y0), pal = P.pack(pm, col)
        fx, fy = x0 + BOX[0], y0 + BOX[1]
        out.append({
            'owner': 'top', 'depth': depth_of(part), 'part': part, 'joint': 'pelvis', 'at': (ax, ay),
            'pivot': (ax - fx, ay - fy), 'rows': rows, 'colors': pal,
            'kinds': {c: kind_of(h, part) for c, h in pal.items()},
        })
    want = {(int(x) + BOX[0], int(y) + BOX[1]): P.hexs(col[y, x]) for y, x in zip(*np.nonzero(m))}
    F.check(out, want)
    return out


DOC = """// Ren seated on the male body: the owner's repaint, his four frames one for one, cut by body part and pinned to
// the pelvis (tools/refs/ren-sit-from-ref.py from docs/reference/ren-sit-owner-reference.jpg).
// Generated: rerun the script to change it.
"""


def module(all_pieces):
    out = [DOC, "import type { OwnerPiece } from '../ownerFrames';", '']
    out.append("/** The skin and the eyes his frames are painted in (Ren's preset): the character's follow from them. */")
    out.append(f"export const REN_SIT_SKIN = '{SKIN}';")
    out.append(f"export const REN_SIT_EYE = '{EYE}';")
    out.append('')
    out.append('/** His Ren seated, sit frames 0-3 (on the talking rock, the seat seats.ts draws). */')
    out.append('export const REN_SIT: OwnerPiece[][] = [')
    for ps in all_pieces:
        out.append('  [')
        out.append(',\n'.join(F.ts_piece(p, '    ') for p in ps) + ',')
        out.append('  ],')
    out.append('];')
    return '\n'.join(out) + '\n'


def main():
    if '--fit' in sys.argv:
        fit()
        return
    out_ts = sys.argv[1] if len(sys.argv) > 1 else OUT
    study = sys.argv[2] if len(sys.argv) > 2 else None
    cols, masks = frames()
    all_pieces = [pieces(cols[f], masks[f], f) for f in range(4)]
    with open(out_ts, 'w') as fh:
        fh.write(module(all_pieces))
    if study:
        os.makedirs(study, exist_ok=True)
        for f in range(4):
            a = np.zeros(cols[f].shape[:2] + (4,))
            a[masks[f], :3] = cols[f][masks[f]]
            a[masks[f], 3] = 255
            P.save(a, os.path.join(study, f'ren-sit-{f}@8.png'))


if __name__ == '__main__':
    main()
