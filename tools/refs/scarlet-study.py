"""The owner's Scarlet brought down to our scale: the reduced reference every Scarlet part copies.

His picture (docs/reference/scarlet-owner-reference.jpg, tools/refs/scarlet_ref.py) is his own pixel
art at about 1.79 of his pixels to one of ours, in proportions that are not ours. This script cuts his
figure into parts (LAYERS: polygons in his pixels), leaves his cape out (the owner did not want it),
lays each part on our male rig at idle frame 0 as scarlet_ref.SEGMENTS says, and brings it down to
our pixels: each of our pixels takes the colour of his that covers most of it (4 x 4 samples), his
gold, his eye colours and his reds counted more (WEIGHT) so his one-pixel trims and highlights live
through the reduction. Every pixel is one of his colours (scarlet_ref.PALETTE). Then his black line
is laid round the figure and the PATCHES (by hand, in our pixels) mend what the reduction broke.

The sword is turned a quarter turn counterclockwise before it is reduced: his blade points down-left
from his near fist, ours point down-right across the legs at rest, and the quarter turn lays his at
our flame longsword's angle. It is drawn under our near fist.

It writes, in <out>:

  reduced@1.png   the reduced reference in our 256 x 256 frame's box (REDUCED_BOX) at 1x
  reduced@8.png   the same at 8x
  overlay@8.png   on our male idle (dimmed) with our joints marked
  compare@4.png   his figure (without the cape) beside the reduced one at the same height
  native@4.png    his pixels at 4x
  palette.png     his colours, those the reduced reference uses marked

and, with --write, tools/refs/data/scarlet-reduced.npy (PALETTE indices over REDUCED_BOX, 255 where
he is not) that scarlet_ref.reduced() reads. <idle> is our male at idle frame 0 with no items (a
256 x 256 PNG, tools/refs/scarlet-idle.mts writes it). The same picture always gives the same bytes.
Run from the repository root with python3 -I:

  npx tsx tools/refs/scarlet-idle.mts <out>
  python3 -I tools/refs/scarlet-study.py <out> <out>/male-idle.png [--write]
  python3 -I tools/refs/scarlet-study.py --palette
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image, ImageDraw  # noqa: E402

import scarlet_ref as R  # noqa: E402

# The reduced reference's box in our frame (x0, y0, x1, y1): the figure and the sword fit in it.
REDUCED_BOX = (88, 116, 168, 224)

# His parts, in his pixels (x, y of pixel corners; a pixel is in when its centre is). A pixel goes to
# the first part that has it: the sword, then the head, the arms, the legs below the coat's hem, and
# the rest of him is the torso. Pixels inside CAPE (left of his near sleeve and coat) are dropped.
CAPE = [(0, 60), (44, 78), (47.4, 80.5), (46.9, 100), (46.4, 110), (50, 111), (50, 123.5), (46, 127), (46, 156), (0, 170)]
HEAD = [(54, 16), (102, 16), (102, 50), (97, 53), (93, 55), (89, 56), (86, 57.5), (84, 58.5), (78, 58.5), (75, 56),
        (72, 55), (68, 54.5), (64, 55.5), (60, 57.5), (56, 56), (54, 52)]
# the coat's near shoulder (outside the lapel's gold edge), the sleeve, the cuff and the glove
ARM_N = [(62.5, 56.5), (59, 59), (54, 65), (50, 72), (47.5, 80), (47, 100), (46.5, 110), (50, 111), (50, 123.5),
         (57, 124), (60, 119), (61.5, 108), (62, 96), (62, 86), (64, 78), (66.5, 73.5), (66, 66)]
HAND_N = [(50, 110.5), (58.5, 110.5), (58.5, 124), (50, 124)]
# the coat's far shoulder (outside its far front edge), the sleeve, the cuff and the glove
ARM_F = [(91.5, 56.5), (94.5, 58), (98, 64), (101, 72), (103, 80), (105, 90), (107, 97), (109.5, 108), (109, 117),
         (108, 124), (101.5, 124.5), (101, 114), (99.5, 104), (98.5, 92), (97.5, 80), (96.5, 70), (93.5, 61)]
# the coat and all on it: his figure right of the cape and above the boots
TORSO = [(46, 50), (110, 50), (110, 160), (46, 160)]
# the trousers below the coat's hem and the boots
LEG_N = [(59, 148), (76, 146), (77, 194), (50, 194), (52, 157), (58, 155)]
LEG_F = [(81, 146), (97, 146), (98, 154), (107, 174), (107, 194), (81, 194)]
# the sword: thick lines (from, to, half width) along the grip and pommel, the cross-guard and the
# blade; in them only his sword's own colours count (his black line, his steel greys, his reds), not
# the cape's dark greys and purples behind it, and not his glove (HAND_N)
SWORD = [((63.5, 101.5), (48, 121.5), 2.2), ((37.5, 112.5), (58.5, 133.5), 2.3), ((48, 123), (8.5, 180.5), 4.6)]

# How much each of his colours counts when a pixel of ours covers several: his gold trim, his amber
# eyes and his reds more, so his thin lines and highlights are not lost.
GOLD = ['#947650', '#a8865d', '#846542', '#70583c', '#5e4a33', '#be8867']
EYES = ['#c88038', '#9c5e1a']
REDS = ['#84141f', '#a11a24', '#a9292f', '#c72b32', '#d83c44', '#e85056', '#f47278', '#ffa7a7', '#7c1e2c', '#5d0e1a']
WEIGHT = {**{h: 3.0 for h in EYES}, **{h: 1.5 for h in REDS}, '#040405': 1.25}
COVER = 0.45  # a pixel of ours is his when this much of it is
# The parts whose gold is laid on forward, pixel by pixel (splat), over the reduced part: his trims
# are lines one pixel wide that a pixel of ours would mostly miss.
SPLAT = {'torso', 'armN', 'armF', 'legN', 'legF'}
# Samples per side for each of our pixels (4 x 4 by default); the sword takes the one colour of his
# under each pixel's middle, so its black line, steel edge and red core stay apart.
SAMPLES = {'sword': 1}

# His black line round the figure; his hair's own dark red where the hair is the edge.
LINE = '#040405'
HAIR_LINE = '#26060d'

# Mends by hand, in our frame: (x0, y0, rows); '.' keeps the pixel, '_' clears it, any other
# character is that colour of his (scarlet_ref.CHARS).
PATCHES = []


def inside(poly, xs, ys):
    """Even-odd test of points against a polygon."""
    poly = np.asarray(poly, float)
    res = np.zeros(np.broadcast(xs, ys).shape, bool)
    j = len(poly) - 1
    for i in range(len(poly)):
        xi, yi = poly[i]
        xj, yj = poly[j]
        cond = ((yi > ys) != (yj > ys)) & (xs < (xj - xi) * (ys - yi) / (yj - yi + 1e-12) + xi)
        res ^= cond
        j = i
    return res


def capsule(a, b, hw, xs, ys):
    a = np.asarray(a, float)
    b = np.asarray(b, float)
    d = b - a
    t = np.clip(((xs - a[0]) * d[0] + (ys - a[1]) * d[1]) / (d @ d), 0, 1)
    return np.hypot(xs - a[0] - t * d[0], ys - a[1] - t * d[1]) <= hw


def layers(N, Q, fig):
    """His pixels split into parts: a dict of (H, W) bool masks."""
    H, W = Q.shape
    yy, xx = np.mgrid[0:H, 0:W]
    cx, cy = xx + 0.5, yy + 0.5
    P = R.rgb()
    L = R.luma(N)
    red = (N[..., 0] - N[..., 1] > 35)
    skin = np.isin(Q, [R.PALETTE.index(h) for h in ('#f8d4b8', '#f2c8aa', '#eabb9d', '#e2af8c', '#ca9c75', '#be8867', '#b27758', '#9e654b')])
    taken = ~fig | inside(CAPE, cx, cy)
    out = {}
    sw = np.zeros((H, W), bool)
    for a, b, hw in SWORD:
        sw |= capsule(a, b, hw, cx, cy)
    sw &= ~inside(HAND_N, cx, cy) & ~skin & ((L < 16) | (L > 50) | red)
    sw &= fig
    out['sword'] = sw
    taken = taken & ~sw
    taken |= sw
    for name, poly in (('head', HEAD), ('armN', ARM_N), ('armF', ARM_F), ('legN', LEG_N), ('legF', LEG_F)):
        m = inside(poly, cx, cy) & ~taken
        out[name] = m
        taken |= m
    out['torso'] = ~taken & inside(TORSO, cx, cy)
    del P
    return out


def _chain(seg, q):
    """Backward map along a chain of runs: our points (N, 2) -> his points (N, 2). Each of our points
    goes by the run nearest to it."""
    hj = [np.asarray(p, float) for p in seg['his']]
    oj = [np.asarray(p, float) for p in seg['our']]
    w = seg['width']
    best_d = np.full(len(q), np.inf)
    his = np.zeros_like(q)
    for k in range(len(hj) - 1):
        a, b = oj[k], oj[k + 1]
        ha, hb = hj[k], hj[k + 1]
        d = b - a
        t = ((q - a) @ d) / (d @ d)
        n = np.array([-d[1], d[0]]) / np.hypot(*d)
        hd = hb - ha
        hn = np.array([-hd[1], hd[0]]) / np.hypot(*hd)
        off = (q - a) @ n
        lo = -np.inf if k == 0 else 0.0
        hi = np.inf if k == len(hj) - 2 else 1.0
        tc = np.clip(t, max(lo, -1e9), min(hi, 1e9))
        dist = np.hypot(*(q - (a + np.clip(tc, 0, 1)[:, None] * d)).T)
        p = ha + t[:, None] * hd + (off / w)[:, None] * hn
        better = dist < best_d - 1e-9
        his[better] = p[better]
        best_d = np.where(better, dist, best_d)
    # past the last point: the end piece about it, unturned
    e = seg.get('end')
    if e:
        a, b = oj[-2], oj[-1]
        d = b - a
        past = ((q - b) @ d) / (d @ d) > 0
        his[past] = np.asarray(e['his'], float) + (q[past] - np.asarray(e['our'], float)) / e['s']
    return his


def backward(seg, q):
    """Our points (N, 2) -> his points (N, 2) for a segment of scarlet_ref.SEGMENTS."""
    if seg['kind'] == 'sim':
        return np.asarray(seg['his'], float) + (q - np.asarray(seg['our'], float)) / seg['s']
    if seg['kind'] == 'torso':
        hx0, ox0 = seg['x0']
        hk = np.array([k[0] for k in seg['knots']], float)
        ok = np.array([k[1] for k in seg['knots']], float)
        x = hx0 + (q[:, 0] - ox0) / seg['sx']
        y = np.interp(q[:, 1], ok, hk)
        lo, hi = q[:, 1] < ok[0], q[:, 1] > ok[-1]
        y[lo] = hk[0] + (q[lo, 1] - ok[0]) * (hk[1] - hk[0]) / (ok[1] - ok[0])
        y[hi] = hk[-1] + (q[hi, 1] - ok[-1]) * (hk[-1] - hk[-2]) / (ok[-1] - ok[-2])
        return np.stack([x, y], 1)
    return _chain(seg, q)


def forward(seg, p):
    """His points (N, 2) -> our points (N, 2) for a segment (the inverse of backward)."""
    if seg['kind'] == 'sim':
        return np.asarray(seg['our'], float) + (p - np.asarray(seg['his'], float)) * seg['s']
    if seg['kind'] == 'torso':
        hx0, ox0 = seg['x0']
        hk = np.array([k[0] for k in seg['knots']], float)
        ok = np.array([k[1] for k in seg['knots']], float)
        x = ox0 + (p[:, 0] - hx0) * seg['sx']
        y = np.interp(p[:, 1], hk, ok)
        lo, hi = p[:, 1] < hk[0], p[:, 1] > hk[-1]
        y[lo] = ok[0] + (p[lo, 1] - hk[0]) * (ok[1] - ok[0]) / (hk[1] - hk[0])
        y[hi] = ok[-1] + (p[hi, 1] - hk[-1]) * (ok[-1] - ok[-2]) / (hk[-1] - hk[-2])
        return np.stack([x, y], 1)
    hj = [np.asarray(v, float) for v in seg['his']]
    oj = [np.asarray(v, float) for v in seg['our']]
    w = seg['width']
    best_d = np.full(len(p), np.inf)
    our = np.zeros_like(p)
    for k in range(len(hj) - 1):
        a, b = hj[k], hj[k + 1]
        oa, ob = oj[k], oj[k + 1]
        d = b - a
        t = ((p - a) @ d) / (d @ d)
        n = np.array([-d[1], d[0]]) / np.hypot(*d)
        od = ob - oa
        on = np.array([-od[1], od[0]]) / np.hypot(*od)
        off = (p - a) @ n
        dist = np.hypot(*(p - (a + np.clip(t, 0, 1)[:, None] * d)).T)
        q = oa + t[:, None] * od + (off * w)[:, None] * on
        better = dist < best_d - 1e-9
        our[better] = q[better]
        best_d = np.where(better, dist, best_d)
    e = seg.get('end')
    if e:
        a, b = hj[-2], hj[-1]
        d = b - a
        past = ((p - b) @ d) / (d @ d) > 0
        our[past] = np.asarray(e['our'], float) + (p[past] - np.asarray(e['his'], float)) * e['s']
    return our


def splat(seg, Q, mask, keep, box):
    """His pixels of the colours `keep` laid forward onto our box, each on the pixel of ours its
    middle lands in: his thin lines stay unbroken (one of ours is 1.8 of his). (h, w) indices, -1
    elsewhere; where several of his land on one of ours the commonest wins."""
    x0, y0, x1, y1 = box
    ys, xs = np.nonzero(mask & np.isin(Q, list(keep)))
    out = np.full((y1 - y0, x1 - x0), -1)
    if not len(xs):
        return out
    q = forward(seg, np.stack([xs + 0.5, ys + 0.5], 1).astype(float))
    u = np.floor(q[:, 0]).astype(int) - x0
    v = np.floor(q[:, 1]).astype(int) - y0
    votes = {}
    for i, j, c in zip(u, v, Q[ys, xs]):
        if 0 <= i < x1 - x0 and 0 <= j < y1 - y0:
            votes.setdefault((j, i), []).append(int(c))
    for (j, i), cs in votes.items():
        out[j, i] = max(set(cs), key=lambda c: (cs.count(c), -c))
    return out


def reduce_layer(seg, Q, mask, weight, box, ss=4):
    """One part of him brought down onto our box: (h, w) PALETTE indices, -1 where he is not."""
    x0, y0, x1, y1 = box
    h, w = y1 - y0, x1 - x0
    H, W = Q.shape
    offs = (np.arange(ss) + 0.5) / ss
    oy, ox = np.meshgrid(offs, offs, indexing='ij')
    yy, xx = np.mgrid[y0:y1, x0:x1]
    q = np.stack([(xx[..., None, None] + ox).ravel(), (yy[..., None, None] + oy).ravel()], 1)
    p = backward(seg, q)
    px = np.floor(p[:, 0]).astype(int)
    py = np.floor(p[:, 1]).astype(int)
    ok = (px >= 0) & (px < W) & (py >= 0) & (py < H)
    hit = np.zeros(len(q), bool)
    hit[ok] = mask[py[ok], px[ok]]
    idx = np.full(len(q), -1)
    idx[hit] = Q[py[hit], px[hit]]
    idx = idx.reshape(h, w, ss * ss)
    cover = (idx >= 0).mean(-1)
    out = np.full((h, w), -1)
    nP = len(R.PALETTE)
    for j in range(h):
        for i in range(w):
            if cover[j, i] < COVER:
                continue
            v = idx[j, i][idx[j, i] >= 0]
            score = np.bincount(v, minlength=nP) * weight
            out[j, i] = int(score.argmax())
    return out


def turn(Q, mask, k):
    """His pixels turned k quarter turns counterclockwise, exactly (scarlet_ref.turned for points)."""
    return np.rot90(Q, k), np.rot90(mask, k)


def outline(idx, part, box):
    """His black line round the figure: every pixel on its edge that is not already as dark."""
    P = R.rgb()
    L = R.luma(P)
    line, hair = R.PALETTE.index(LINE), R.PALETTE.index(HAIR_LINE)
    hairish = {R.PALETTE.index(c) for c in ('#26060d', '#3a0f1e', '#4e172a', '#601f35', '#70273e', '#87324c', '#9a3e58', '#ac5068')}
    op = idx >= 0
    edge = op & ~(np.pad(op, 1)[:-2, 1:-1] & np.pad(op, 1)[2:, 1:-1] & np.pad(op, 1)[1:-1, :-2] & np.pad(op, 1)[1:-1, 2:])
    out = idx.copy()
    for j, i in zip(*np.nonzero(edge)):
        v = idx[j, i]
        if L[v] <= 22:
            continue
        out[j, i] = hair if (part[j, i] == 'head' and v in hairish) else line
    return out


def patch(idx, box):
    x0, y0 = box[:2]
    for px, py, rows in PATCHES:
        for dy, row in enumerate(rows):
            for dx, ch in enumerate(row):
                if ch == '.':
                    continue
                idx[py + dy - y0, px + dx - x0] = -1 if ch == '_' else R.CHARS.index(ch)
    return idx


def build():
    N = R.native()
    bg = R.background(N)
    fig = ~bg
    Q = R.quantize(N)
    Q[bg] = -1
    M = layers(N, Q, fig)
    weight = np.ones(len(R.PALETTE))
    for hexc, wv in WEIGHT.items():
        weight[R.PALETTE.index(hexc)] = wv
    box = REDUCED_BOX
    h, w = box[3] - box[1], box[2] - box[0]
    idx = np.full((h, w), -1)
    part = np.full((h, w), '', dtype='<U6')
    order = ['armF', 'legF', 'legN', 'torso', 'sword', 'armN', 'head']
    gold = {R.PALETTE.index(h) for h in GOLD}
    for name in order:
        seg = R.SEGMENTS[name]
        q, m = Q, M[name]
        if seg.get('quarter_turns'):
            q, m = turn(Q, m, seg['quarter_turns'])
        q = np.where(q < 0, 0, q)
        r = reduce_layer(seg, q, m, weight, box, ss=SAMPLES.get(name, 4))
        if name in SPLAT:
            s = splat(seg, q, m, gold, box)
            on = (s >= 0) & (r >= 0)
            r[on] = s[on]
        put = r >= 0
        idx[put] = r[put]
        part[put] = name
    idx = outline(idx, part, box)
    idx = patch(idx, box)
    return N, bg, Q, M, idx, part


def to_rgba(idx):
    P = R.rgb()
    out = np.zeros(idx.shape + (4,), np.uint8)
    m = idx >= 0
    out[m, :3] = P[idx[m]]
    out[m, 3] = 255
    return out


def big(a, k, bgc=(236, 236, 240)):
    a = a.astype(np.uint8)
    if a.shape[2] == 4:
        base = np.zeros(a.shape[:2] + (3,), np.uint8)
        base[:] = bgc
        al = a[..., 3:4] / 255.0
        a = (a[..., :3] * al + base * (1 - al)).astype(np.uint8)
    im = Image.fromarray(a)
    return im.resize((im.width * k, im.height * k), Image.NEAREST)


def write_outputs(out, idle_path, N, bg, Q, M, idx):
    box = REDUCED_BOX
    rgba = to_rgba(idx)
    Image.fromarray(rgba, 'RGBA').save(os.path.join(out, 'reduced@1.png'))
    big(rgba, 8).save(os.path.join(out, 'reduced@8.png'))
    R.save(N, os.path.join(out, 'native@4.png'), 4)
    # palette: every colour of his, the ones the reduced reference uses underlined
    used = set(np.unique(idx[idx >= 0]).tolist())
    k = 24
    pal = Image.new('RGB', (len(R.PALETTE) * k, k + 6), (255, 255, 255))
    d = ImageDraw.Draw(pal)
    for i, hexc in enumerate(R.PALETTE):
        d.rectangle((i * k, 0, i * k + k - 2, k - 1), fill=hexc)
        if i in used:
            d.rectangle((i * k, k + 1, i * k + k - 2, k + 4), fill=(0, 0, 0))
    pal.save(os.path.join(out, 'palette.png'))
    # overlay on our male idle, joints marked
    k = 8
    idle = np.asarray(Image.open(idle_path).convert('RGBA')).astype(np.float64)
    x0, y0, x1, y1 = box
    base = np.full((y1 - y0, x1 - x0, 3), 236.0)
    sub = idle[y0:y1, x0:x1]
    al = sub[..., 3:4] / 255
    base = base * (1 - al) + (sub[..., :3] * 0.55 + 236 * 0.45) * al
    ra = rgba[..., 3:4] / 255 * 0.72
    comp = base * (1 - ra) + rgba[..., :3] * ra
    im = Image.fromarray(comp.astype(np.uint8)).resize(((x1 - x0) * k, (y1 - y0) * k), Image.NEAREST)
    d = ImageDraw.Draw(im)
    for name, (jx, jy) in R.OUR_JOINTS.items():
        X, Y = (jx - x0) * k, (jy - y0) * k
        col = (0, 140, 255) if name.endswith('N') else (230, 40, 200) if name.endswith('F') else (0, 190, 0)
        d.ellipse((X - 5, Y - 5, X + 5, Y + 5), outline=col, width=2)
    im.save(os.path.join(out, 'overlay@8.png'))
    # his figure without the cape beside ours at the same height
    keep = np.zeros(Q.shape, bool)
    for m in M.values():
        keep |= m
    his = np.zeros(N.shape[:2] + (4,), np.uint8)
    his[keep, :3] = N[keep]
    his[keep, 3] = 255
    yy, xx = np.nonzero(keep)
    his = his[yy.min():yy.max() + 1, xx.min():xx.max() + 1]
    oy, ox = np.nonzero(idx >= 0)
    ours = rgba[oy.min():oy.max() + 1, ox.min():ox.max() + 1]
    kk = 4
    hh = ours.shape[0] * kk
    a = big(his, 1)
    a = a.resize((round(a.width * hh / a.height), hh), Image.NEAREST)
    b = big(ours, kk)
    c = Image.new('RGB', (a.width + b.width + 16, hh), (255, 255, 255))
    c.paste(a, (0, 0))
    c.paste(b, (a.width + 16, 0))
    c.save(os.path.join(out, 'compare@4.png'))
    # his parts, each in its own tint over his pixels (the cape and the white left grey)
    tint = {'sword': (255, 60, 60), 'head': (255, 200, 0), 'armN': (0, 140, 255), 'armF': (230, 40, 200),
            'legN': (0, 200, 120), 'legF': (120, 220, 0), 'torso': (255, 255, 255)}
    show = (N * 0.25 + 150).astype(np.uint8)
    for name, m in M.items():
        show[m] = (N[m] * 0.55 + np.array(tint[name]) * 0.45).astype(np.uint8)
    R.save(show, os.path.join(out, 'parts@4.png'), 4)


def write_npy(idx):
    os.makedirs(os.path.dirname(R.REDUCED), exist_ok=True)
    a = np.where(idx >= 0, idx, 255).astype(np.uint8)
    with open(R.REDUCED, 'wb') as f:
        np.save(f, a, allow_pickle=False)


def palette():
    """His colours, rebuilt: his figure's pixels clustered (redmean distance 14, most common first,
    then medians), plus the purples of his lining clustered apart (distance 7, 8 pixels or more)."""
    N = R.native()
    L = R.luma(N)

    def cluster(px, tol):
        keys, inv, cnt = np.unique((px // 6).astype(int), axis=0, return_inverse=True, return_counts=True)
        inv = inv.ravel()
        cs = []
        for o in np.argsort(-cnt, kind='stable'):
            c = px[inv == o].mean(0)
            if all(R.colour_distance(c, q) > tol for q in cs):
                cs.append(c)
        cs = np.array(cs)
        for _ in range(10):
            lab = np.stack([R.colour_distance(px, c) for c in cs], 1).argmin(1)
            cs = np.array([np.median(px[lab == i], 0) for i in range(len(cs)) if (lab == i).any()])
        lab = np.stack([R.colour_distance(px, c) for c in cs], 1).argmin(1)
        return np.round(cs).astype(int), np.bincount(lab, minlength=len(cs))

    main, _ = cluster(N[L < 236].reshape(-1, 3).astype(float), 14)
    pur = ((N[..., 0] + N[..., 2]) / 2 - N[..., 1] >= 5) & (L < 60) & (np.abs(N[..., 0] - N[..., 2]) < 14)
    purples, pc = cluster(N[pur].reshape(-1, 3).astype(float), 7)
    extra = [c for c, k in zip(purples, pc) if k >= 8 and all(R.colour_distance(c, m) > 4 for m in main)]
    cs = np.array(list(main) + extra)
    cs = cs[np.argsort(R.luma(cs), kind='stable')]
    return ['#%02x%02x%02x' % tuple(int(v) for v in c) for c in cs]


def main():
    if sys.argv[1:] == ['--palette']:
        for h in palette():
            print(h)
        return
    out, idle = sys.argv[1], sys.argv[2]
    N, bg, Q, M, idx, part = build()
    write_outputs(out, idle, N, bg, Q, M, idx)
    if '--write' in sys.argv[3:]:
        write_npy(idx)


if __name__ == '__main__':
    main()
