"""Shared helpers for the owner's paint-overs of our sprites (his pictures in docs/reference/), for the
scripts that lift his frames into the game (lyra-read-from-ref.py, lyra-throw-from-ref.py,
seat-rock-from-ref.py).

His paint-overs are big pictures (2000 px wide) of his pixels, but their pixel grid is not one even
pitch over the whole picture: it drifts slowly (his read picture's cells are 10.4 picture pixels at the
top and 10.1 at the bottom, and each panel starts at its own phase). native() finds his grid where it
is: the edges of his pixels (where the colour steps, his black line most of all) give, for each axis, a
smooth cubic fit of the grid over the panel, then a local correction (the smallest window round each
point whose edges agree), and each of his pixels is the median of its cell's middle. The same picture
always gives the same pixels.

Scripts import this with sys.path.insert(0, os.path.dirname(__file__)) and run with python3 -I from the
repository root.
"""

import os

import numpy as np
from PIL import Image

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# The local windows (picture pixels, sigma) tried from the smallest, and how well the edges in a window
# must agree (0..1) for its correction to be taken.
LOCAL = (6, 10, 16, 28)
AGREE = 0.55
# The cell's middle a pixel of his is read from (fractions of the cell on each axis).
MIDDLE = (0.22, 0.78)


def _box(a, r, axis):
    a = np.moveaxis(a, axis, 0)
    pad = np.concatenate([np.repeat(a[:1], r + 1, 0), a, np.repeat(a[-1:], r, 0)])
    c = np.cumsum(pad, 0)
    out = (c[2 * r + 1:] - c[:-2 * r - 1]) / (2 * r + 1)
    return np.moveaxis(out, 0, axis)


def blur(a, s):
    """Three box blurs: about a Gaussian of sigma s (picture pixels)."""
    r = max(1, int(round(s * 0.87)))
    for _ in range(3):
        a = _box(_box(a, r, 0), r, 1)
    return a


def _terms(x, y, deg):
    return [x ** i * y ** j for i in range(deg + 1) for j in range(deg + 1 - i)]


def _fit_axis(e, X, Y, coord, pitch, deg=3, S=20.0, iters=5):
    """The grid along one axis: u(x, y), whose integer values are his pixel edges. e is the edge strength
    at each picture pixel (the step from the pixel before it along the axis)."""
    z = (e * np.exp(-2j * np.pi * coord / pitch)).sum()
    u = coord / pitch - np.angle(z) / (2 * np.pi)
    xn = (X - X.mean()) / 500.0
    yn = (Y - Y.mean()) / 500.0
    T = np.stack([t.ravel() for t in _terms(xn, yn, deg)], 1)
    coef = np.zeros(T.shape[1])
    sel = np.arange(0, X.size, 7)
    for _ in range(iters):
        um = u + (T @ coef).reshape(u.shape)
        zr = blur(e * np.cos(2 * np.pi * um), S)
        zi = blur(-e * np.sin(2 * np.pi * um), S)
        m = blur(e, S) + 1e-9
        coh = np.hypot(zr, zi) / m
        d = -np.arctan2(zi, zr) / (2 * np.pi)
        w = np.where(coh > 0.45, coh * m, 0).ravel()
        delta = np.linalg.lstsq(T[sel] * w[sel, None], d.ravel()[sel] * w[sel], rcond=None)[0]
        coef -= delta
    um = u + (T @ coef).reshape(u.shape)
    dl = np.zeros(u.shape)
    done = np.zeros(u.shape, bool)
    for s in LOCAL:
        zr = blur(e * np.cos(2 * np.pi * um), s)
        zi = blur(-e * np.sin(2 * np.pi * um), s)
        m = blur(e, s) + 1e-9
        take = ~done & (np.hypot(zr, zi) / m > AGREE)
        dl[take] = (-np.arctan2(zi, zr) / (2 * np.pi))[take]
        done |= take
    return um - dl


def native(path, box, pitch):
    """His pixels in the picture's box (x0, y0, x1, y1): an (rows, cols, 3) int array, the median of each
    cell's middle; a cell with nothing read (where the grid folds) takes the cell before it in its row.
    `pitch` is his cell in picture pixels, or (across, down) where the picture was stretched more one way
    than the other (his Trunks read picture: 17.34 across, 16.52 down)."""
    pitch_x, pitch_y = pitch if isinstance(pitch, tuple) else (pitch, pitch)
    img = np.asarray(Image.open(path).convert('RGB')).astype(np.float64)
    X0, Y0, X1, Y1 = box
    a = img[Y0:Y1, X0:X1]
    H, W, _ = a.shape
    ex = np.zeros((H, W))
    ey = np.zeros((H, W))
    ex[:, 1:] = np.abs(np.diff(a, axis=1)).sum(2)
    ey[1:, :] = np.abs(np.diff(a, axis=0)).sum(2)
    Y, X = np.mgrid[Y0:Y1, X0:X1].astype(np.float64)
    u = _fit_axis(ex, X, Y, X, pitch_x)
    v = _fit_axis(ey, X, Y, Y, pitch_y)
    iu = np.floor(u).astype(int)
    iv = np.floor(v).astype(int)
    lo, hi = MIDDLE
    ok = (u - iu > lo) & (u - iu < hi) & (v - iv > lo) & (v - iv < hi)
    iu0, iv0 = iu.min(), iv.min()
    nx, ny = iu.max() - iu0 + 1, iv.max() - iv0 + 1
    key = ((iv - iv0) * nx + (iu - iu0))[ok]
    pix = a[ok]
    order = np.argsort(key, kind='stable')
    key = key[order]
    pix = pix[order]
    out = np.zeros((ny * nx, 3))
    got = np.zeros(ny * nx, bool)
    starts = np.flatnonzero(np.r_[True, key[1:] != key[:-1]])
    ends = np.r_[starts[1:], len(key)]
    for s, e in zip(starts, ends):
        out[key[s]] = np.median(pix[s:e], 0)
        got[key[s]] = True
    out = np.clip(np.round(out), 0, 255).astype(int).reshape(ny, nx, 3)
    got = got.reshape(ny, nx)
    for j in range(ny):
        for i in range(1, nx):
            if not got[j, i] and got[j, i - 1]:
                out[j, i] = out[j, i - 1]
                got[j, i] = True
    return out


def merge(a, mask, tol):
    """His colours: inside `mask`, colours within `tol` (per channel) of one he used more are that one
    (the picture is a JPEG, so a flat colour of his comes back a few steps either way). Returns a copy."""
    cols, counts = np.unique(a[mask].reshape(-1, 3), axis=0, return_counts=True)
    order = sorted(range(len(cols)), key=lambda k: (-counts[k], tuple(cols[k])))
    reps = []
    to = {}
    for k in order:
        c = cols[k]
        for r in reps:
            if np.abs(c - r).max() <= tol:
                to[tuple(c)] = tuple(r)
                break
        else:
            reps.append(c)
            to[tuple(c)] = tuple(c)
    out = a.copy()
    ys, xs = np.nonzero(mask)
    for y, x in zip(ys, xs):
        out[y, x] = to[tuple(a[y, x])]
    return out


def inside(poly, H, W):
    """Cells (row, col) whose centre is inside the polygon (corner coordinates (x, y), even-odd rule)."""
    ys, xs = np.mgrid[0:H, 0:W]
    px = xs + 0.5
    py = ys + 0.5
    m = np.zeros((H, W), bool)
    n = len(poly)
    for k in range(n):
        x1, y1 = poly[k]
        x2, y2 = poly[(k + 1) % n]
        if y1 == y2:
            continue
        c = ((y1 > py) != (y2 > py)) & (px < (x2 - x1) * (py - y1) / (y2 - y1) + x1)
        m ^= c
    return m


def hexs(c):
    return '#%02x%02x%02x' % tuple(int(v) for v in c)


def near8(m):
    """Cells next to (8-way) a cell of m."""
    out = np.zeros_like(m)
    H, W = m.shape
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if dx or dy:
                out[max(0, dy):H + min(0, dy), max(0, dx):W + min(0, dx)] |= m[max(0, -dy):H - max(0, dy), max(0, -dx):W - max(0, dx)]
    return out


def own_lines(own, fg, line):
    """Each owner's mask with his line round it: an owner's pixels (own == owner, not line) and every line
    pixel touching them (a line between two owners goes with both, so each is closed in it). A figure
    pixel no zone took, and a line touching no owner, go with the nearest owner (8-way, nearest first;
    ties to the first owner by name)."""
    own = own.copy()
    names = sorted(set(own[fg & ~line]) - {''})
    if not names:
        return own, {}
    left = fg & ~line & (own == '')
    while left.any():
        grew = False
        for o in names:
            add = left & near8((own == o) & ~line)
            if add.any():
                own[add] = o
                left &= ~add
                grew = True
        if not grew:
            break
    masks = {o: ((own == o) & ~line) | (line & near8((own == o) & ~line)) for o in names}
    # (a pixel of his his line cuts off from every owner, and a speck of his on its own, go with the
    # nearest owner too, so every pixel of his figure is drawn)
    left = fg & ~np.logical_or.reduce(list(masks.values()))
    while left.any():
        grew = False
        for o in names:
            add = left & near8(masks[o])
            if add.any():
                masks[o] |= add
                grew = True
        left &= ~np.logical_or.reduce(list(masks.values()))
        if not grew:
            break
    # a speck of his just off the figure (SPECK pixels at most): the owner of the nearest pixel of it; one
    # further out is the picture's noise on his page (the panel's label above it), not his figure
    for y, x in zip(*np.nonzero(left)):
        best = None
        for o in names:
            ys, xs = np.nonzero(masks[o])
            d = int(np.min(np.maximum(np.abs(ys - y), np.abs(xs - x))))
            if best is None or d < best[0]:
                best = (d, o)
        if best[0] <= SPECK:
            masks[best[1]][y, x] = True
    return own, masks


# How far off the figure (pixels) a speck of his may be and still be his figure's.
SPECK = 3


# Characters for his colours in a piece's rows ('.' is empty; no quote or backslash).
CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$%&()*+,-/:;<=>?@[]^_{|}~'


def pack(mask, col):
    """A piece's cells as rows of characters from its first row's and column's corner: (rows, (x0, y0),
    {char: hex}), the colours in order of their hex."""
    ys, xs = np.nonzero(mask)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    hs = sorted({hexs(col[y, x]) for y, x in zip(ys, xs)})
    if len(hs) > len(CHARS):
        raise ValueError(f'{len(hs)} colours in one piece')
    ch = {h: CHARS[i] for i, h in enumerate(hs)}
    rows = []
    for y in range(y0, y1 + 1):
        rows.append(''.join(ch[hexs(col[y, x])] if mask[y, x] else '.' for x in range(x0, x1 + 1)).rstrip('.'))
    return rows, (int(x0), int(y0)), {c: h for h, c in ch.items()}


def drop_costs(col, line, mask, axis):
    """What leaving out each row (axis 0) or column (axis 1) of his would lose inside `mask`: how unlike
    its nearer neighbour it is (his line against anything else, or the figure against his page, counts
    most)."""
    if axis == 1:
        col, line, mask = col.transpose(1, 0, 2), line.T, mask.T
    n = mask.shape[0]

    def unlike(i, j):
        if j < 0 or j >= n:
            return 1e9
        both = mask[i] | mask[j]
        d = np.abs(col[i] - col[j]).max(axis=1)
        k = np.where(line[i] != line[j], 6.0, np.where(d > 24, 1.0, 0.0))
        k = np.where(mask[i] != mask[j], 6.0, k)
        return float((k * both).sum())

    return np.array([min(unlike(i, i - 1), unlike(i, i + 1)) for i in range(n)])


def keep(count, n, scale, cost):
    """Which of his n rows (or columns) the `count` rows at our scale show, `scale` of his to one of ours:
    each within one of where the scale puts it, one after another or one left out between, those left out
    costing least (cost[i]: what leaving out his row i loses). Every row kept is one of his, whole."""
    ideal = [(k + 0.5) * scale - 0.5 for k in range(count)]
    near = [range(int(np.floor(t)) - 1, int(np.floor(t)) + 3) for t in ideal]
    best = [{c: (abs(c - ideal[0]) * 1e-3, None) for c in near[0] if 0 <= c < n}]
    for k in range(1, count):
        row = {}
        for c in near[k]:
            if not 0 <= c < n:
                continue
            got = None
            for prev, skip in ((c - 1, False), (c - 2, True)):
                if prev not in best[-1]:
                    continue
                v = best[-1][prev][0] + (cost[prev + 1] if skip else 0.0) + abs(c - ideal[k]) * 1e-3
                if got is None or v < got[0]:
                    got = (v, prev)
            if got is not None:
                row[c] = got
        best.append(row)
    c = min(best[-1], key=lambda q: (best[-1][q][0], q))
    out = [c]
    for k in range(count - 1, 0, -1):
        c = best[k][c][1]
        out.append(c)
    return out[::-1]


def save(arr, path, k=8):
    a = np.clip(arr, 0, 255).astype(np.uint8)
    Image.fromarray(a).resize((a.shape[1] * k, a.shape[0] * k), Image.NEAREST).save(path)
