"""His engraved plates brought down to our scale so that they still read (the owner, 2026-10-29, on the legate's
cuirass: "muy mal", the eagle and the gold filigree had become a blur of browns; his rule for his big pictures,
"Reducir y limpiar yo": shrink evenly, then clean with his palette only, no blended colours, every piece whole,
his black line kept).

A piece of his is read in three layers, and each fine pixel of ours is one of them, in one of his colours:
  line     his black line, 1 px: where bronze_ref.reduce puts it (round the piece and along his lines through it);
  marks    his engraving, trim and seams: the cells that stand out from the plate round them (MARK_DELTA
           lighter or darker than the local middle of the piece, or of a kind the plate is never made of:
           his gold on the legate's grey steel). A fine pixel is a mark where his marks cover MARK_MIN of it,
           or where the middle of a mark cell in a run (MARK_RUN cells or longer) lands on it, so a 1-cell line
           of his is a 1 px line of ours, unbroken (never a dotted one). Its colour is his: the commonest of
           the mark cells under it (of the plate's foreign kind first: his gold, not the brown it shades into);
  plate    everything else: the plate's own material in his shades (the piece's ramp of that material), the
           shade nearest the lightness of his plate under the pixel smoothed with its neighbours, so the plate
           reads as smooth metal in his tones and not as his brush's grain.
Then it is made whole: a lone mark pixel that touches no other mark (a speck) goes back to the plate; a mark
pixel inside a plate region takes the plate where his marks barely cover it. His spirals, rings, squares and
lion faces (MOTIFS as bronze_ref has them: his cells, his radius) are laid over this as bronze_ref.clean lays
them: the cleanest reading of each at its size, in his own colours of that motif.

Scripts import this with sys.path.insert(0, os.path.dirname(__file__)) and run with python3 -I from the
repository root.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import bronze_ref as R  # noqa: E402

MARK_DELTA = 28
MARK_R = 2
MARK_RUN = 3
MARK_MIN = 0.34
MARK_LAND = 0.14
SPECK_SHARE = 0.6
FILL_SHARE = 0.2
RAMP_MIN = 3
MARK_TONES = 3


class Plate:
    """How one piece is read: `plate` the kinds (bronze_ref.kind) its surface is made of; `foreign` the kinds
    that are always marks on it; `by_light` whether a cell that stands out by lightness alone is a mark too
    (off where his plate's own highlights would be taken for marks); `darks` whether his dark cells are marks
    (off where his engraving's shadows would clot: they shade the plate instead); `motifs` [(what, centre,
    radius)] in his cells; `smooth` how many times a pixel's own plate lightness counts against each
    neighbour's."""

    def __init__(self, plate, foreign=(), by_light=True, darks=True, motifs=(), smooth=2, delta=MARK_DELTA):
        self.plate = tuple(plate)
        self.foreign = tuple(foreign)
        self.by_light = by_light
        self.darks = darks
        self.motifs = list(motifs)
        self.smooth = smooth
        self.delta = delta


def lum(c):
    return 0.299 * int(c[0]) + 0.587 * int(c[1]) + 0.114 * int(c[2])


def commonest(cells, a, weights=None):
    tally = {}
    for k, q in enumerate(cells):
        t = tuple(int(v) for v in a[q])
        tally[t] = tally.get(t, 0) + (1 if weights is None else weights[k])
    return max(sorted(tally), key=lambda t: tally[t]) if tally else None


LINE = -2
# His line through a piece (the seams between a pauldron's plates, the edge of a plate): his line cells that
# are not inside a solid block of his line LINE_MASS cells square (the shade he fills under a chest plate is
# a mass, not a line, and goes with the plate's darkest shade).
LINE_MASS = 3
# A fine pixel is his line through the piece where such cells cover LINE_MIN of it (his seams are drawn one
# or two cells thick: at our scale one pixel, never a block: of four in a square the least covered goes).
LINE_MIN = 0.5


def thin_lines(lines):
    """The cells of `lines` outside every solid LINE_MASS x LINE_MASS block of them."""
    H, W = lines.shape
    r = LINE_MASS // 2
    mass = np.zeros((H, W), bool)
    for y in range(r, H - r):
        for x in range(r, W - r):
            if lines[y - r:y + r + 1, x - r:x + r + 1].all():
                mass[y - r:y + r + 1, x - r:x + r + 1] = True
    return lines & ~mass


def marks_of(a, mine, K, cfg, lines=None):
    """Which of his cells are marks: +1 light, -1 dark, LINE his black line through the piece (`lines`: the
    piece's line cells, those in thin runs), 0 the plate."""
    H, W = mine.shape
    Lg = R.luma(a.astype(float))
    sign = np.zeros((H, W), int)
    if lines is not None:
        sign[thin_lines(lines)] = LINE
    ys, xs = np.nonzero(mine)
    for y, x in zip(ys, xs):
        y0, y1, x0, x1 = max(0, y - MARK_R), min(H, y + MARK_R + 1), max(0, x - MARK_R), min(W, x + MARK_R + 1)
        win = Lg[y0:y1, x0:x1][mine[y0:y1, x0:x1]]
        mid = float(np.median(win))
        if K[y, x] in cfg.foreign:
            sign[y, x] = 1 if Lg[y, x] >= mid else -1
        elif not cfg.by_light:
            continue
        elif Lg[y, x] > mid + cfg.delta:
            sign[y, x] = 1
        elif cfg.darks and Lg[y, x] < mid - cfg.delta:
            sign[y, x] = -1
    return sign


def runs_of(sign):
    """How long the run (8-neighbours, one sign) each mark cell lies in is."""
    H, W = sign.shape
    size = np.zeros((H, W), int)
    seen = np.zeros((H, W), bool)
    for y, x in zip(*np.nonzero(sign)):
        if seen[y, x]:
            continue
        group, stack = [], [(y, x)]
        seen[y, x] = True
        while stack:
            q, p = stack.pop()
            group.append((q, p))
            for dq in (-1, 0, 1):
                for dp in (-1, 0, 1):
                    yy, xx = q + dq, p + dp
                    if 0 <= yy < H and 0 <= xx < W and not seen[yy, xx] and sign[yy, xx] == sign[y, x]:
                        seen[yy, xx] = True
                        stack.append((yy, xx))
        for q in group:
            size[q] = len(group)
    return size


def ramp_of(a, cells, K, kinds_):
    """His shades of the plate's material among these cells, darkest first (those he used RAMP_MIN times or
    more; failing any of the material, every shade there)."""
    tally = {}
    for q in cells:
        if K[q] in kinds_:
            t = tuple(int(v) for v in a[q])
            tally[t] = tally.get(t, 0) + 1
    keep = [c for c, n in tally.items() if n >= RAMP_MIN]
    if not keep:
        keep = list(tally) or [tuple(int(v) for v in a[q]) for q in cells]
    return sorted(set(keep), key=lambda c: (lum(c), c))


def tones_of(a, cells, n):
    """His marks' colours in n tones: the commonest colour of each n-th of the cells by lightness, darkest first."""
    ls = sorted(cells, key=lambda q: (lum(a[q]), q))
    out = []
    for t in range(n):
        part = ls[int(len(ls) * t / n):int(len(ls) * (t + 1) / n)]
        c = commonest(part, a)
        if c is not None and c not in out:
            out.append(c)
    return out or [commonest(cells, a)]


def nearest(ramp, l):
    return min(ramp, key=lambda c: (abs(lum(c) - l), c))


def sharp(a, cells_mask, name, m, col, isl, M, cfg):
    """The piece's colours again, read in layers (module docstring): `a` his cells (the piece continued under
    what hides it), `cells_mask` which of them are the piece, `m`/`col`/`isl` the piece at our scale from
    bronze_ref.reduce_piece (its shape and his line are kept; every other pixel is recoloured in place)."""
    H, W = cells_mask.shape
    K = R.kinds(a)
    mine = cells_mask & (K != 'line')
    sign = marks_of(a, mine, K, cfg, cells_mask & (K == 'line'))
    size = runs_of(sign)
    plate_cells = list(zip(*np.nonzero(mine & (sign == 0))))
    ramp = ramp_of(a, plate_cells, K, cfg.plate)
    tones = {s: tones_of(a, list(zip(*np.nonzero(sign == s))), MARK_TONES) for s in (1, -1) if (sign == s).any()}
    tones[LINE] = [tuple(int(v) for v in R.his_line(a))]
    solid = mine
    mine = cells_mask
    SIGNS = (1, -1, LINE)
    # the middle of each mark cell in a run lands on a fine pixel
    landed = {}
    for y, x in zip(*np.nonzero(sign)):
        if size[y, x] < MARK_RUN:
            continue
        fx, fy = M.fine((x + 0.5, y + 0.5))
        q = (int(np.floor(fy)), int(np.floor(fx)))
        landed[q] = landed.get(q, 0) | (1 if sign[y, x] > 0 else 2 if sign[y, x] == -1 else 4)
    kind_px = {}
    plate_l = {}
    cover = {}
    mark_l = {}
    for j, i in zip(*np.nonzero(m & ~isl)):
        cells = [(y, x, w) for y, x, w in R.footprint(M, i, j) if 0 <= y < H and 0 <= x < W and mine[y, x]]
        if not cells:
            # (a pixel outside his cells, closed by our line: the plate, in the shade of its neighbours)
            kind_px[(j, i)] = 0
            cover[(j, i)] = {s_: 0.0 for s_ in SIGNS}
            continue
        tot = sum(w for _, _, w in cells)
        cv = {s_: sum(w for y, x, w in cells if sign[y, x] == s_) / tot for s_ in SIGNS}
        cover[(j, i)] = cv
        got = landed.get((j, i), 0)
        bit = {1: 1, -1: 2, LINE: 4}
        hit = [s_ for s_ in (1, -1) if cv[s_] >= MARK_MIN or (got & bit[s_] and cv[s_] >= MARK_LAND)]
        if cv[LINE] >= LINE_MIN:
            hit.append(LINE)
        # (his line through the piece before his marks, his marks before his dark ones)
        s = max(hit, key=lambda s_: (s_ == LINE, cv[s_], s_)) if hit else 0
        kind_px[(j, i)] = s
        for s_ in (1, -1):
            mk = [(y, x, w) for y, x, w in cells if sign[y, x] == s_]
            if mk:
                mark_l[(j, i, s_)] = sum(lum(a[y, x]) * w for y, x, w in mk) / sum(w for _, _, w in mk)
        pl = [(y, x, w) for y, x, w in cells if sign[y, x] == 0] or [(y, x, w) for y, x, w in cells if sign[y, x] != LINE] or cells
        plate_l[(j, i)] = sum(lum(a[y, x]) * w for y, x, w in pl) / sum(w for _, _, w in pl)
    # his line never four in a square: the least covered of them is the plate
    for (j, i), s in sorted(kind_px.items()):
        if s != LINE:
            continue
        block = [(j, i), (j, i + 1), (j + 1, i), (j + 1, i + 1)]
        if all(kind_px.get(q, 0) == LINE for q in block):
            kind_px[min(block, key=lambda q: (cover[q][LINE], q))] = 0
    # made whole: a lone mark (fewer than two marks of its sign among its 8 neighbours) that his marks barely
    # cover goes back to the plate; a plate pixel with three of its four neighbours one mark, and some of that
    # mark under it, joins it (a hole in his eagle's wing, not the eye of a spiral: that has none under it)
    nb8 = lambda j, i: [(j + dj, i + di) for dj in (-1, 0, 1) for di in (-1, 0, 1) if dj or di]
    nb4 = lambda j, i: [(j + 1, i), (j - 1, i), (j, i + 1), (j, i - 1)]
    for _ in range(2):
        out = dict(kind_px)
        for (j, i), s in kind_px.items():
            if s:
                if cover[(j, i)][s] < SPECK_SHARE and sum(1 for q in nb8(j, i) if kind_px.get(q, 0) == s) < 2:
                    out[(j, i)] = 0
            else:
                for s_ in SIGNS:
                    if sum(1 for q in nb4(j, i) if kind_px.get(q, 0) == s_) >= 3 and cover[(j, i)][s_] >= FILL_SHARE:
                        out[(j, i)] = s_
        kind_px = out
    for (j, i), s in kind_px.items():
        if s:
            l = mark_l.get((j, i, s))
            col[j, i] = nearest(tones[s], l) if l is not None else tones[s][len(tones[s]) // 2]
            if s == LINE:
                isl[j, i] = True
    # the plate: his material's shade nearest the plate's lightness smoothed with the neighbours' (across the
    # marks too: the plate runs on under his engraving)
    for (j, i), s in kind_px.items():
        if s:
            continue
        tot, wsum = 0.0, 0
        if (j, i) in plate_l:
            tot, wsum = cfg.smooth * plate_l[(j, i)], cfg.smooth
        for q in nb8(j, i):
            if q in plate_l:
                tot += plate_l[q]
                wsum += 1
        col[j, i] = nearest(ramp, tot / wsum) if wsum else ramp[len(ramp) // 2]
    motifs(a, solid, K, m, col, isl, M, cfg, sign)
    LAST.clear()
    LAST.update({'kind': kind_px, 'cover': cover, 'landed': landed})
    return col


# What the last sharp() read each fine pixel as (study scripts).
LAST = {}


def motifs(a, mine, K, m, col, isl, M, cfg, sign):
    """His spirals, rings, squares and lion faces at our scale (bronze_ref.clean's readings), each in his own
    colours of that motif: its line the commonest of his marks in the disk, its plate the plate's shade there."""
    H, W = mine.shape
    Lg = R.luma(a.astype(float))
    for what, (cx, cy), rad in cfg.motifs:
        disk = [(y, x) for y in range(int(cy - rad), int(cy + rad) + 1) for x in range(int(cx - rad), int(cx + rad) + 1)
                if 0 <= y < H and 0 <= x < W and mine[y, x] and (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= rad * rad]
        if not disk:
            continue
        fx, fy = M.fine((cx, cy))
        rf = rad / M.k
        ls = sorted(disk, key=lambda q: (Lg[q], q))
        if what == 'lion':
            # (his lion's face in the plate's own shades: his near-black outline of it would make a black blot at
            # our size; its rim his darkest shade of the plate there)
            lp = [q for q in ls if K[q] in cfg.plate] or ls
            tones = [commonest(lp[int(len(lp) * t / R.LION_TONES):int(len(lp) * (t + 1) / R.LION_TONES)], a) for t in range(R.LION_TONES)]
            tones = [t for t in tones if t is not None]
            rim = tones[0]
            for j in range(int(fy - rf) - 1, int(fy + rf) + 2):
                for i in range(int(fx - rf) - 1, int(fx + rf) + 2):
                    d = np.hypot(i + 0.5 - fx, j + 0.5 - fy)
                    if d > rf or not m[j, i] or isl[j, i]:
                        continue
                    if d > rf - 1:
                        col[j, i] = rim
                        continue
                    cells = [(y, x, w) for y, x, w in R.footprint(M, i, j) if 0 <= y < H and 0 <= x < W and mine[y, x]]
                    if not cells:
                        continue
                    mean = sum(float(Lg[y, x]) * w for y, x, w in cells) / sum(w for _, _, w in cells)
                    col[j, i] = nearest(tones, mean)
            continue
        # his motif's line and the plate it lies on: the commonest of his lightest third and of his darkest
        # third of the disk's cells, the line the one he drew more thinly (bronze_ref.clean); on a plate with a
        # foreign kind (the legate's gold on steel) the line is his gold there, the plate its own shade
        fo = [q for q in disk if K[q] in cfg.foreign]
        if fo:
            fo.sort(key=lambda q: (Lg[q], q))
            line_c = commonest(fo[-(max(1, len(fo) // 2)):], a)
            plate = [q for q in disk if sign[q] == 0 and K[q] in cfg.plate] or [q for q in disk if K[q] in cfg.plate] or disk
            plate_c = nearest(ramp_of(a, plate, K, cfg.plate), float(np.mean([Lg[q] for q in plate])))
        else:
            dark = commonest(ls[:len(ls) // 3], a)
            lite = commonest(ls[-(len(ls) // 3):], a)
            on_dark = sum(1 for q in disk if Lg[q] > Lg[ls[len(ls) // 2]]) < len(disk) / 2
            line_c, plate_c = (lite, dark) if on_dark else (dark, lite)
        n = max(3, min(5, int(round(2 * rf))))
        x0, y0 = int(round(fx - n / 2)), int(round(fy - n / 2))
        if what == 'spiral':
            rows = R.SPIRALS[n]
        elif what == 'square':
            rows = ['L' * n] + ['L' + '.' * (n - 2) + 'L'] * (n - 2) + ['L' * n]
        else:
            rows = ['.' + 'L' * (n - 2) + '.'] + ['L' + '.' * (n - 2) + 'L'] * (n - 2) + ['.' + 'L' * (n - 2) + '.']
        for j, row in enumerate(rows):
            for i, ch in enumerate(row):
                q = (y0 + j, x0 + i)
                if not m[q] or isl[q]:
                    continue
                col[q] = line_c if ch == 'L' else plate_c


def piece(a, lab, name, M, cfg):
    """A piece of his at our scale read in layers: continued under what hides it as bronze_ref.piece continues
    it (continue_under, more_of, mirrored_up), its shape and his line from bronze_ref.reduce_piece, its colours
    from sharp(): (mask, colours, line)."""
    H, W = lab.shape
    more = R.more_of(name, H, W)
    more = None if more is None else more & (lab != '')
    if more is not None and R.MORE_MODE.get(name) == 'up':
        got, up = R.mirrored_up(a, lab, name, more)
        mask, colours = R.continue_under(a, lab, name, more=more & ~got)
        colours[got] = up[got]
        mask = mask | got
    else:
        mask, colours = R.continue_under(a, lab, name, more=more)
    m, col, isl = R.reduce_piece(a, lab, name, mask, colours, M)
    aa = np.full(a.shape, 255, np.int32)
    aa[mask] = colours[mask]
    sharp(aa, mask, name, m, col, isl, M, cfg)
    return m, col, isl
