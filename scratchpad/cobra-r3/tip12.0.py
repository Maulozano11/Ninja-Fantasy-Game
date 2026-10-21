"""Turns the owner's poison sheet into the venom cobra for vfx_beasts (sprite 'poison').

    python3 -I tools/refs/cobra-from-ref.py <poison-sheet.jpg> <out.ts> [debugDir]

His sheet (docs/reference/poison-set-owner-reference.jpg) is a paint-over of our poison kit. Under
BEAST (COBRA, APPROVED, IN GAME) he did not keep our cobra: he repainted it as a rearing hooded
cobra, scaled green-and-yellow coils on the ground, the hood and head raised, the jaws open on two
fangs, a glowing eye, venom dripping, wreathed in purple venom mist, in two pictures (LEFT and
RIGHT). He asked for his art to be copied as exactly as possible, so his two pictures ARE frames 0
and 5 of the 8-frame fly loop.

How: his character (beside the blast and the walls) is measured against ours (96 px) for the scale;
it comes out at 1.00 within what a JPEG edge allows, so his pixels are taken one to one (the area
filter is then the identity and nothing is blurred). Each picture is split into his own pixels:
  - the head piece: the head, the jaws, the hood and the top of the neck, above a cut across the
    neck, with the venom drops and spray off his jaws;
  - the coils: everything below the cut, with a hand-placed spine (tail tip to the cut) centred
    between his edges, so every coil pixel has a place along the body and across it;
  - the mist: his purple, un-mixed from his panel into colour and alpha, cut into its blobs. Where he
    laid his mist over the coil (the big two-lobed puff at the neck base, a few bubbles) his own pixels
    are kept there, his purple over his scales, exactly where he painted it; the coil goes on under it
    with his own scales from one scale period along the body, for the in-betweens.
The body pixels are snapped to colours sampled from his pixels: the coils and the head's greens to the
body's, the head's warm accents (the rosy-amber eye, the crimson jaws, the ochre hood spot and their
warm near-blacks) only to accent colours of their own hue, so none turns green or grey and no red
speck appears that he did not paint. The body gets a 1 px outline in the deep green of his own edges.
The two pictures share one anchor: the centre of the body's mass.

In-betweens (1-4 from his LEFT to his RIGHT picture, a fifth of the way each; 6-7 back, a third each):
the coils slither. Both spines are laid on one parameter by his landmarks (the tail's low point, the top
of the hump, the coil on the ground under the neck), so each point of the body moves evenly from its
place in one picture to its place in the other (his hump to his hump). The tail end, from its low point
to the tip, bends instead: its turning and its length go from one picture's to the other's, and its tip
is led on the straight line between his two tips (evenly, a few px a frame), the bend solved back from
it, so his curled tip opens into his other picture's long point without standing up as a stalk. His
coil pixels are carried along the moving spine (each keeps its place along the body and across it as a
fraction of his half-width, nearest pixel). They come from his starting picture, except from the tail
end up, which takes the other picture's pixels, as far up the body as gives the frame its even share
of the change in light. The head piece is his starting picture's, moved whole by whole pixels: it draws
back, strikes forward and settles, and the neck bends to follow it; on the frame before it changes over
to his other picture's, the drops (and the little bubble at the neck) already change. His mist blobs
drift back and shrink into smaller copies of themselves one after another while the other picture's
grow in; the blobs he laid over the coil go with the coil under them. How far they have faded is set so
the frame's light goes evenly between his two pictures: no frame flashes, and the build fails if a
frame's light (alpha x luma) or opaque mass is more than 12 % off its neighbour's.

Checks (the build writes nothing if one fails): no pixel on the canvas edge; no enclosed gap, no body
speck, no see-through pixel walled in; on his two pictures the head keeps his amount of red and of
ochre (within 15 %), his eye stays rosy-amber and his mist at the neck base is all there; the tail never
rises higher or reaches further out than his two tails, and its tip moves at most 13 px a frame.

The result is a TypeScript data module (palette + run-length rows) that the generator
(tools/world-sprites/vfx-beast-cobra.ts) decodes, so the build needs no image files. Deterministic.
"""
import json
import os
import sys
from collections import deque

import numpy as np
from PIL import Image, ImageDraw

REF, OUT_TS = sys.argv[1:3]
DEBUG = sys.argv[3] if len(sys.argv) > 3 else None
CHAR_H = 96.0  # our character (kit characterRef), hair to feet, at 1x
ref = np.asarray(Image.open(REF).convert('RGB')).astype(np.float32)
LUMA = np.array([0.3, 0.55, 0.15], np.float32)

# --- his panel ---------------------------------------------------------------------------------------------
PANEL = (206, 686, 552, 799)  # the border lines of BEAST (COBRA, APPROVED, IN GAME)
SPLIT = 377  # between his two pictures
PICS = {'L': (PANEL[0] + 2, PANEL[1] + 2, SPLIT, PANEL[3] - 1), 'R': (SPLIT, PANEL[1] + 2, PANEL[2] - 1, PANEL[3] - 1)}
_pn = ref[PANEL[1] + 3:PANEL[3] - 2, PANEL[0] + 3:PANEL[2] - 2]
BG = np.median(np.concatenate([_pn[:5].reshape(-1, 3), _pn[-5:].reshape(-1, 3)]), 0)

# --- his pieces (sheet pixels) -----------------------------------------------------------------------------
# The head piece: the body above this outline (its bottom edge is the cut across the neck).
HEAD = {
    'L': [(301, 688), (377, 688), (377, 764), (348, 764), (348, 753), (318, 753), (309, 746), (302, 734)],
    'R': [(477, 688), (551, 688), (551, 780), (521, 780), (521, 756), (490, 756), (482, 749), (477, 735)],
}
# The spine of the coils, roughly (it is centred between his edges below): from the tail tip to the cut.
SPINE = {
    'L': [(236, 734), (233, 740), (228, 745), (222, 749), (217, 753), (216, 758), (220, 763), (228, 765), (236, 765),
          (243, 763), (249, 759), (255, 754), (261, 748), (267, 743), (273, 739), (279, 738), (285, 740), (289, 745),
          (289, 752), (287, 759), (287, 766), (290, 772), (296, 777), (304, 780), (313, 781), (322, 779), (329, 775),
          (333, 769), (335, 762), (335, 755), (335, 747)],
    'R': [(382, 756), (385, 751), (389, 747), (395, 745), (402, 745), (408, 748), (412, 753), (415, 759), (418, 765), (422, 771),
          (428, 774), (434, 773), (438, 768), (440, 761), (440, 753), (441, 745), (444, 738), (449, 733), (456, 731),
          (462, 734), (466, 739), (469, 746), (472, 753), (475, 760), (478, 767), (483, 773), (490, 776), (497, 775),
          (502, 771), (505, 765), (506, 758), (506, 750)],
}
# The cut across the neck (x from, x to, y), the head piece's bottom edge.
CUT = {'L': (318, 348, 753), 'R': (490, 521, 756)}
OVERLAP = 6  # sheet px of neck the coils keep above the cut (under the head piece), so no seam opens


# --- helpers -----------------------------------------------------------------------------------------------

def components(mask, conn8=True):
    H, W = mask.shape
    lab = -np.ones((H, W), np.int32)
    out = []
    nbrs = [(dy, dx) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if (dy or dx) and (conn8 or not (dy and dx))]
    ys, xs = np.nonzero(mask)
    for y, x in zip(ys.tolist(), xs.tolist()):
        if lab[y, x] >= 0:
            continue
        q = deque([(y, x)])
        lab[y, x] = len(out)
        pts = []
        while q:
            cy, cx = q.popleft()
            pts.append((cy, cx))
            for dy, dx in nbrs:
                ny, nx = cy + dy, cx + dx
                if 0 <= ny < H and 0 <= nx < W and mask[ny, nx] and lab[ny, nx] < 0:
                    lab[ny, nx] = len(out)
                    q.append((ny, nx))
        out.append(np.array(pts))
    return out


def dilate(m, n=1):
    for _ in range(n):
        g = m.copy()
        g[1:] |= m[:-1]
        g[:-1] |= m[1:]
        g[:, 1:] |= m[:, :-1]
        g[:, :-1] |= m[:, 1:]
        m = g
    return m


def erode(m, n=1):
    return ~dilate(~m, n)


def nb4(m):
    n = np.zeros(m.shape, np.int32)
    n[1:] += m[:-1]
    n[:-1] += m[1:]
    n[:, 1:] += m[:, :-1]
    n[:, :-1] += m[:, 1:]
    return n


def edge4(m):
    """The pixels of m with a 4-neighbour outside it."""
    inner = m.copy()
    inner[1:] &= m[:-1]
    inner[:-1] &= m[1:]
    inner[:, 1:] &= m[:, :-1]
    inner[:, :-1] &= m[:, 1:]
    inner[0, :] = inner[-1, :] = False
    inner[:, 0] = inner[:, -1] = False
    return m & ~inner


def hsv(a):
    """Hue (degrees), saturation and value of RGB colours (0-255)."""
    a = np.asarray(a, np.float32) / 255.0
    mx, mn = a.max(-1), a.min(-1)
    d = mx - mn
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    dd = np.where(d == 0, 1.0, d)
    h = np.where(mx == r, ((g - b) / dd) % 6.0, np.where(mx == g, (b - r) / dd + 2.0, (r - g) / dd + 4.0)) * 60.0
    s = np.where(mx == 0, 0.0, d / np.where(mx == 0, 1.0, mx))
    return h, s, mx


def poly_mask(pts, shape, off=(0, 0)):
    img = Image.new('L', (shape[1], shape[0]), 0)
    ImageDraw.Draw(img).polygon([(x - off[0], y - off[1]) for x, y in pts], fill=1, outline=1)
    return np.asarray(img).astype(bool)


def median_palette(pixels, n):
    pixels = np.asarray(pixels, np.float32).reshape(-1, 3)
    n = max(1, min(n, len(pixels)))
    img = Image.fromarray(np.clip(pixels, 0, 255).astype(np.uint8).reshape(1, -1, 3), 'RGB')
    q = img.quantize(colors=n, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    pal = np.array(q.getpalette()[:n * 3], np.float32).reshape(-1, 3)
    pal = np.unique(pal, axis=0)
    return pal[np.lexsort((pal[:, 2], pal[:, 1], pal[:, 0]))]


def kmeans(pixels, init, iters=10):
    """Lloyd's refinement of a palette on its pixels (deterministic: starts from the median cut)."""
    X = np.asarray(pixels, np.float32).reshape(-1, 3)
    Cn = np.asarray(init, np.float32).copy()
    Xy = ycc(X)
    for _ in range(iters):
        lab = np.argmin(((Xy[:, None, :] - ycc(Cn)[None]) ** 2).sum(2), 1)
        for j in range(len(Cn)):
            sel = X[lab == j]
            if len(sel):
                Cn[j] = sel.mean(0)
    return np.unique(np.round(Cn), axis=0)


CHROMA = 1.7  # chroma counts this much more than luma when a pixel picks its palette colour (keeps his saturation)
_YCC = np.array([[0.299, 0.587, 0.114], [-0.169 * CHROMA, -0.331 * CHROMA, 0.5 * CHROMA], [0.5 * CHROMA, -0.419 * CHROMA, -0.081 * CHROMA]], np.float32)


def ycc(a):
    return np.asarray(a, np.float32) @ _YCC.T


def snap(col, pal, chroma=CHROMA):
    """The nearest palette colour, chroma counting `chroma` times luma."""
    pal = np.asarray(pal, np.float32)
    m = _YCC if chroma == CHROMA else _YCC * np.array([[1.0], [chroma / CHROMA], [chroma / CHROMA]], np.float32)
    d = ((np.asarray(col, np.float32)[..., None, :] @ m.T - (pal @ m.T)[(None,) * (np.asarray(col).ndim - 1)]) ** 2).sum(-1)
    return pal[np.argmin(d, -1)]


WARM_CHROMA = 2.5  # on his head's warm accents chroma counts more still: his reds stay red, his eye stays rosy


def smoothstep(x):
    x = np.clip(x, 0.0, 1.0)
    return x * x * (3 - 2 * x)


def fill_from_neighbours(m, rgb, todo):
    """Fills the `todo` pixels (outside m) from their 4-neighbours in m, ring by ring."""
    m = m.copy()
    rgb = rgb.copy()
    todo = todo & ~m
    while todo.any():
        got = np.zeros_like(m)
        acc = np.zeros(rgb.shape, np.float32)
        cnt = np.zeros(m.shape, np.float32)
        for dy, dx in ((0, -1), (-1, 0), (0, 1), (1, 0)):
            sm = np.roll(np.roll(m, dy, 0), dx, 1)
            sc = np.roll(np.roll(rgb, dy, 0), dx, 1)
            hit = sm & todo
            acc[hit] += sc[hit]
            cnt[hit] += 1
            got |= hit
        if not got.any():
            break
        rgb[got] = acc[got] / cnt[got][:, None]
        m |= got
        todo &= ~got
    return m, rgb


# --- scale: his character against ours ---------------------------------------------------------------------

def char_height(x0, x1, y0, y1):
    """Hair to sandal of his character in a box (the longest run of rows that hold it)."""
    c = ref[y0:y1, x0:x1]
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    # (against the box's own background: the blast panel's is lit green)
    bg = np.median(np.concatenate([c[:3].reshape(-1, 3), c[:, :3].reshape(-1, 3), c[:, -3:].reshape(-1, 3)]), 0)
    on = (np.abs(c - bg).sum(2) > 45) & ~((r - g > 20) & (b - g > 20)) & ~((g > r + 12) & (g > b + 5))
    rows = on.sum(1) >= 2
    best, run, start, span, gap = 0, 0, 0, (0, 0), 0
    for y, v in enumerate(rows.tolist() + [False] * 4):
        if v:
            if run == 0:
                start = y
            run = y - start + 1
            gap = 0
            if run > best:
                best, span = run, (start + y0, y + y0)
        else:
            gap += 1
            if gap > 2:
                run = 0
    return best, span


CHARS = {'blast': (528, 598, 192, 302), 'wall': (296, 352, 398, 512), 'wall_diag': (698, 758, 472, 588), 'wall_depth': (124, 188, 798, 908)}
HEIGHTS = {k: char_height(*v) for k, v in CHARS.items()}
HIS_CHAR_H = float(np.median([h for h, _ in HEIGHTS.values()]))
S_MEASURED = CHAR_H / HIS_CHAR_H
# A JPEG edge moves a threshold by a pixel at each end: within 3 % his scale is ours, and his pixels are
# then taken one to one (no resampling blur at all).
S = 1.0 if abs(S_MEASURED - 1.0) <= 0.03 else S_MEASURED
print('his character:', {k: h for k, (h, _) in HEIGHTS.items()}, '-> median', HIS_CHAR_H, 'measured scale', round(S_MEASURED, 4), '-> scale', S)
if S != 1.0:
    # Everything below works on his pixels one to one (whole-pixel moves keep them his); a sheet at another
    # scale needs an area-filter shrink of each frame's layers before the palette snap and the outline.
    raise SystemExit(f'his sheet is at {S_MEASURED:.3f} of the game scale: this converter takes his pixels 1:1')
print('panel background', BG.astype(int).tolist())


# --- the spine ---------------------------------------------------------------------------------------------

def resample(P, step=1.0):
    P = np.asarray(P, np.float64)
    seg = np.hypot(*np.diff(P, axis=0).T)
    cum = np.concatenate([[0.0], np.cumsum(seg)])
    n = max(2, int(round(cum[-1] / step)) + 1)
    t = np.linspace(0.0, cum[-1], n)
    return np.stack([np.interp(t, cum, P[:, 0]), np.interp(t, cum, P[:, 1])], 1)


def normals(P):
    T = np.gradient(P, axis=0)
    T /= np.maximum(np.hypot(T[:, 0], T[:, 1]), 1e-9)[:, None]
    return np.stack([-T[:, 1], T[:, 0]], 1)


def smooth_line(P, k):
    """Moving average over k points (ends kept)."""
    if k < 2:
        return P
    Q = P.copy()
    pad = np.concatenate([np.repeat(P[:1], k, 0), P, np.repeat(P[-1:], k, 0)])
    ker = np.ones(2 * k + 1) / (2 * k + 1)
    for c in range(2):
        Q[:, c] = np.convolve(pad[:, c], ker, mode='same')[k:-k]
    Q[0], Q[-1] = P[0], P[-1]
    return Q


def edge_dists(mask, blocked, P, N, maxd=20.0, step=0.25):
    """For each spine point: how far (px) along +N and -N his body goes, or nan where it does not end
    inside maxd or ends against mist (the edge is hidden there)."""
    H, W = mask.shape
    ts = np.arange(0.0, maxd, step)
    out = []
    for sgn in (1.0, -1.0):
        q = P[:, None, :] + sgn * ts[None, :, None] * N[:, None, :]
        ix = np.clip(np.round(q[..., 0]).astype(int), 0, W - 1)
        iy = np.clip(np.round(q[..., 1]).astype(int), 0, H - 1)
        inside = mask[iy, ix]
        off = ~inside
        first = np.where(off.any(1), off.argmax(1), -1)
        d = np.where(first >= 0, ts[np.maximum(first, 0)], np.nan)
        # Edge hidden by mist: the first pixel past his edge is purple.
        hid = blocked[iy[np.arange(len(P)), np.maximum(first, 0)], ix[np.arange(len(P)), np.maximum(first, 0)]]
        d = np.where((first >= 0) & ~hid, d, np.nan)
        out.append(d)
    return out[0], out[1]


def fill_nan(a):
    a = a.copy()
    ok = ~np.isnan(a)
    if not ok.any():
        return np.full_like(a, 6.0)
    idx = np.arange(len(a))
    a[~ok] = np.interp(idx[~ok], idx[ok], a[ok])
    return a


def med_filter(a, k):
    pad = np.concatenate([np.repeat(a[:1], k), a, np.repeat(a[-1:], k)])
    return np.array([np.nanmedian(pad[i:i + 2 * k + 1]) if not np.all(np.isnan(pad[i:i + 2 * k + 1])) else np.nan for i in range(len(a))])


def centre_spine(rough, mask, blocked):
    """His rough spine centred between his edges: each point moves half the difference of its two edge
    distances along the normal, then the line is smoothed and resampled; repeated."""
    P = resample(rough, 1.0)
    for _ in range(12):
        N = normals(P)
        dr, dl = edge_dists(mask, blocked, P, N)
        shift = np.where(np.isnan(dr) | np.isnan(dl), 0.0, np.clip((dr - dl) / 2.0, -1.5, 1.5))
        shift = smooth_line(np.stack([shift, shift], 1), 2)[:, 0]
        shift[0] = shift[-1] = 0.0  # the ends stay where they were placed (the tail tip, the cut)
        P = P + shift[:, None] * N
        P = resample(smooth_line(P, 2), 1.0)
    N = normals(P)
    dr, dl = edge_dists(mask, blocked, P, N)
    wr = fill_nan(med_filter(dr, 3))
    wl = fill_nan(med_filter(dl, 3))
    return P, wl, wr


def project(P, Q, chunk=3000):
    """Each point of Q on the polyline P (its first and last segments extended): returns the arc length
    s along P (negative before the first point, past the length after the last), the signed distance v
    (+ toward the normals' side) and the distance to the line."""
    P = np.asarray(P, np.float64)
    Q = np.asarray(Q, np.float64)
    A, B = P[:-1], P[1:]
    D = B - A
    L = np.maximum(np.hypot(D[:, 0], D[:, 1]), 1e-9)
    cum = np.concatenate([[0.0], np.cumsum(L)])
    Nseg = np.stack([-D[:, 1], D[:, 0]], 1) / L[:, None]
    tmin = np.zeros(len(D))
    tmax = np.ones(len(D))
    tmin[0] = -np.inf
    tmax[-1] = np.inf
    s_out = np.empty(len(Q))
    v_out = np.empty(len(Q))
    d_out = np.empty(len(Q))
    for i0 in range(0, len(Q), chunk):
        q = Q[i0:i0 + chunk]
        t = ((q[:, None, :] - A[None]) * D[None]).sum(2) / (L * L)[None]
        t = np.clip(t, tmin[None], tmax[None])
        C = A[None] + t[..., None] * D[None]
        d2 = ((q[:, None, :] - C) ** 2).sum(2)
        j = np.argmin(d2, 1)
        r = np.arange(len(q))
        s_out[i0:i0 + chunk] = cum[j] + t[r, j] * L[j]
        v_out[i0:i0 + chunk] = ((q - C[r, j]) * Nseg[j]).sum(1)
        d_out[i0:i0 + chunk] = np.sqrt(d2[r, j])
    return s_out, v_out, d_out


# --- his two pictures, split into their pieces -------------------------------------------------------------

def key(k):
    x0, y0, x1, y1 = PICS[k]
    crop = ref[y0:y1, x0:x1].copy()
    H, W = crop.shape[:2]
    r, g, b = crop[..., 0], crop[..., 1], crop[..., 2]
    diff = np.abs(crop - BG).sum(2)
    inside = np.zeros((H, W), bool)
    inside[1:-1, 1:-1] = True
    purple = (r - g > 10) & (b - g > 10) & (diff > 20) & inside
    cand = (((diff > 40) & ~purple) | (crop.sum(2) < BG.sum() - 22)) & inside
    comps = sorted(components(cand), key=len, reverse=True)
    body = np.zeros((H, W), bool)
    body[comps[0][:, 0], comps[0][:, 1]] = True
    head_poly = poly_mask(HEAD[k], (H, W), (x0, y0))
    near = dilate(body, 3)
    drips = np.zeros((H, W), bool)
    for p in comps[1:]:
        if len(p) < 3:
            continue
        inhead = head_poly[p[:, 0], p[:, 1]].mean() > 0.5
        if inhead:
            drips[p[:, 0], p[:, 1]] = True  # venom drops and spray off his jaws
        elif len(p) >= 25 and near[p[:, 0], p[:, 1]].any():
            body[p[:, 0], p[:, 1]] = True  # (his tail tip, cut off by a lighter scale row)
    # A pale lilac speck among the drops is one of his venom bubbles (a light core in a mauve rim, no
    # outline): it is mist, not a drop of the body's colour.
    for p in components(drips):
        px = crop[p[:, 0], p[:, 1]]
        if ((px[:, 0] > px[:, 1]) & (px[:, 2] > px[:, 1] + 5)).mean() > 0.5:
            drips[p[:, 0], p[:, 1]] = False
            purple[p[:, 0], p[:, 1]] = True
    drips |= (nb4(drips) >= 3) & ~purple & inside  # (a pinhole in a drop's dark rim is the drop's)
    # Close the body: one-pixel notches and the pinholes of his scale texture belong to it.
    body = body | (erode(dilate(body, 1), 1) & inside & ~purple)
    occluded = np.zeros((H, W), bool)
    for p in components(~body, conn8=False):
        if p[:, 0].min() == 0 or p[:, 1].min() == 0 or p[:, 0].max() == H - 1 or p[:, 1].max() == W - 1:
            continue
        if len(p) < 80:
            if purple[p[:, 0], p[:, 1]].mean() > 0.5 and not head_poly[p[:, 0], p[:, 1]].any():
                occluded[p[:, 0], p[:, 1]] = True  # a mist bubble in front of the body
            else:
                body[p[:, 0], p[:, 1]] = True
    cx0, cx1, cyy = CUT[k]
    # Below the cut and right of the neck, the head piece holds only his drops and bubbles (the little
    # green-ringed bubble touches the neck): they go with the drops.
    gy_, gx_ = np.mgrid[0:H, 0:W]
    loose = body & head_poly & (gy_ + y0 >= cyy) & (gx_ + x0 >= cx1)
    body &= ~loose
    drips |= loose
    upper = body & head_poly
    band = poly_mask([(cx0, cyy - OVERLAP), (cx1, cyy - OVERLAP), (cx1, cyy), (cx0, cyy)], (H, W), (x0, y0))
    lower = body & (~head_poly | band)
    rough = np.array(SPINE[k], np.float64) - np.array([x0, y0], np.float64)
    blocked = dilate(purple, 1) & ~body
    P, wl, wr = centre_spine(rough, body, blocked)
    print('key', k, 'drops and bubbles parted from the neck:', int(loose.sum()), 'px')
    return dict(crop=crop, off=(x0, y0), body=body, upper=upper, lower=lower, drips=drips & ~body, purple=purple,
                occluded=occluded, diff=diff, head_poly=head_poly, spine=P, wl=wl, wr=wr)


KEYS = {k: key(k) for k in PICS}
for k, d in KEYS.items():
    print('key', k, 'body px', int(d['body'].sum()), 'head piece px', int(d['upper'].sum()), 'drip px', int(d['drips'].sum()),
          'mist px', int(d['purple'].sum()), 'mist over the body px', int(d['occluded'].sum()))

if DEBUG:
    for k, d in KEYS.items():
        c = d['crop']
        vis = (c * 0.3).astype(np.uint8)
        vis[d['body']] = c[d['body']].astype(np.uint8)
        vis[d['upper']] = (c[d['upper']] * 0.6 + np.array([90, 0, 0])).clip(0, 255).astype(np.uint8)
        vis[d['drips']] = (0, 255, 255)
        vis[d['purple'] & ~d['body']] = (150, 0, 150)
        vis[d['occluded']] = (255, 0, 255)
        Image.fromarray(vis).resize((vis.shape[1] * 5, vis.shape[0] * 5), Image.NEAREST).save(os.path.join(DEBUG, f'cobra-seg-{k}.png'))
        # The spine and its widths, and every coil pixel coloured by its place along (hue) and across (light) the body.
        H, W = d['body'].shape
        ys, xs = np.nonzero(d['lower'])
        s_, v_, _ = project(d['spine'], np.stack([xs, ys], 1).astype(np.float64))
        L = len(d['spine']) - 1
        img = Image.new('RGB', (W * 6, H * 6), (0, 0, 0))
        px = img.load()
        import colorsys
        for x, y, ss, vv in zip(xs, ys, s_, v_):
            h = (ss / L) % 1.0
            rgb = colorsys.hsv_to_rgb(h * 0.85, 0.9, float(np.clip(0.55 + vv / 18, 0.15, 1)))
            for a in range(6):
                for bb in range(6):
                    px[x * 6 + a, y * 6 + bb] = tuple(int(c * 255) for c in rgb)
        dr = ImageDraw.Draw(img)
        P = d['spine']
        N = normals(P)
        dr.line([(p[0] * 6 + 3, p[1] * 6 + 3) for p in P], fill=(255, 255, 255), width=2)
        for i in range(0, len(P), 4):
            a = P[i] - N[i] * d['wl'][i]
            bq = P[i] + N[i] * d['wr'][i]
            dr.line([(a[0] * 6 + 3, a[1] * 6 + 3), (bq[0] * 6 + 3, bq[1] * 6 + 3)], fill=(255, 255, 255), width=1)
        img.save(os.path.join(DEBUG, f'cobra-spine-{k}.png'))
        print('spine', k, 'length', len(P) - 1, 'px; half-widths', np.round(np.percentile((d['wl'] + d['wr']) / 2, [5, 50, 95]), 1).tolist())


# --- both pictures on one canvas, on one anchor (the centre of the body's mass) ----------------------------

M = 241  # points along each spine (the same fraction of the body in both pictures)
PAD = 22  # canvas px round both pictures: room for the strike and the drifting mist


def uniform(P, n):
    seg = np.hypot(*np.diff(P, axis=0).T)
    cum = np.concatenate([[0.0], np.cumsum(seg)])
    t = np.linspace(0.0, cum[-1], n)
    return np.stack([np.interp(t, cum, P[:, 0]), np.interp(t, cum, P[:, 1])], 1)


cents = {}
for k, d in KEYS.items():
    ys, xs = np.nonzero(d['body'])
    cents[k] = (int(round(xs.mean())), int(round(ys.mean())))
# Canvas: every picture placed so its centre of mass lands on (AX, AY).
lefts = [cents[k][0] for k in KEYS]
tops = [cents[k][1] for k in KEYS]
AX = max(lefts) + PAD
AY = max(tops) + PAD
CW = max(AX - cents[k][0] + KEYS[k]['body'].shape[1] for k in KEYS) + PAD
CH = max(AY - cents[k][1] + KEYS[k]['body'].shape[0] for k in KEYS) + PAD
print('anchor (centre of the body mass) in his sheet:', {k: (cents[k][0] + KEYS[k]['off'][0], cents[k][1] + KEYS[k]['off'][1]) for k in KEYS},
      'canvas', (CW, CH), 'anchor', (AX, AY))


def place(a, k, fill=0):
    """A crop-sized array of key k on the canvas."""
    ox, oy = AX - cents[k][0], AY - cents[k][1]
    out = np.full((CH, CW) + a.shape[2:], fill, a.dtype)
    out[oy:oy + a.shape[0], ox:ox + a.shape[1]] = a
    return out


GY, GX = np.mgrid[0:CH, 0:CW]
C = {}
for k, d in KEYS.items():
    ox, oy = AX - cents[k][0], AY - cents[k][1]
    c = dict(col=place(d['crop'], k, 0.0), lower=place(d['lower'], k, False), upper=place(d['upper'], k, False),
             drips=place(d['drips'], k, False), body=place(d['body'], k, False), purple=place(d['purple'], k, False),
             diff=place(d['diff'], k, 0.0))
    # Outside his picture the canvas is his panel.
    outside = place(np.ones(d['body'].shape, bool), k, False)
    c['col'][~outside] = BG
    P = uniform(d['spine'] + np.array([ox, oy], np.float64), M)
    c['P'] = P
    c['N'] = normals(P)
    idx = np.linspace(0, len(d['wl']) - 1, M)
    c['wl'] = np.interp(idx, np.arange(len(d['wl'])), d['wl'])
    c['wr'] = np.interp(idx, np.arange(len(d['wr'])), d['wr'])
    c['seg'] = float(np.hypot(*np.diff(P, axis=0).T).mean())
    C[k] = c


def to_index(s, P):
    """Arc length along P to a fractional point index (extended past both ends)."""
    seg = np.hypot(*np.diff(P, axis=0).T)
    cum = np.concatenate([[0.0], np.cumsum(seg)])
    u = np.interp(s, cum, np.arange(len(P), dtype=np.float64))
    u = np.where(s < 0, s / seg[0], u)
    u = np.where(s > cum[-1], len(P) - 1 + (s - cum[-1]) / seg[-1], u)
    return u


def interp_profile(a, u):
    return np.interp(np.clip(u, 0, len(a) - 1), np.arange(len(a)), a)


def along(c, u):
    """Spine point and normal of picture c at fractional indices u (straight on past the ends)."""
    P, N = c['P'], c['N']
    n = len(P)
    uc = np.clip(u, 0, n - 1)
    i = np.clip(np.floor(uc).astype(int), 0, n - 2)
    f = (uc - i)[:, None]
    pt = P[i] * (1 - f) + P[i + 1] * f
    nm = N[i] * (1 - f) + N[i + 1] * f
    nm /= np.maximum(np.hypot(nm[:, 0], nm[:, 1]), 1e-9)[:, None]
    # Past the ends: along the end tangents.
    T0 = (P[1] - P[0]) / np.hypot(*(P[1] - P[0]))
    T1 = (P[-1] - P[-2]) / np.hypot(*(P[-1] - P[-2]))
    pt = np.where((u < 0)[:, None], P[0] + T0 * (u * c['seg'])[:, None], pt)
    pt = np.where((u > n - 1)[:, None], P[-1] + T1 * ((u - (n - 1)) * c['seg'])[:, None], pt)
    return pt, nm


# Every coil pixel's own place on its spine (to refuse a sample that would come off another stretch of body).
for k, c in C.items():
    ys, xs = np.nonzero(c['lower'])
    s_, v_, _ = project(c['P'], np.stack([xs, ys], 1).astype(np.float64))
    u = np.full((CH, CW), np.nan)
    u[ys, xs] = to_index(s_, c['P'])
    c['u'] = u

# --- his coils under his mist: the body goes on under a mist blob that hides its edge ----------------------
TEX_PERIOD = 6.0  # px along the body: the hidden coil repeats his scales from one or more periods away


def period_copy(c, xs, ys, clean):
    """Colours for coil pixels (xs, ys) taken from his clean coil pixels one or more scale periods along the
    body at the same place across it."""
    s_, v_, _ = project(c['P'], np.stack([xs, ys], 1).astype(np.float64))
    hu = to_index(s_, c['P'])
    got = np.zeros(len(xs), bool)
    colr = np.zeros((len(xs), 3), np.float32)
    for m in range(1, 6):
        for sgn in (1, -1):
            uu = hu + sgn * m * TEX_PERIOD / c['seg']
            pt, nm = along(c, uu)
            q = pt + nm * v_[:, None]
            ix = np.clip(np.round(q[:, 0]).astype(int), 0, CW - 1)
            iy = np.clip(np.round(q[:, 1]).astype(int), 0, CH - 1)
            ok = ~got & clean[iy, ix] & (np.abs(c['u'][iy, ix] - uu) * c['seg'] < 4)
            colr[ok] = c['col'][iy[ok], ix[ok]]
            got |= ok
    return colr, got


for k, c in C.items():
    near = dilate(c['purple'], 1) & ~c['body']
    ys, xs = np.nonzero(near)
    s_, v_, _ = project(c['P'], np.stack([xs, ys], 1).astype(np.float64))
    u = to_index(s_, c['P'])
    w = np.where(v_ > 0, interp_profile(c['wr'], u), interp_profile(c['wl'], u))
    hid = (np.abs(v_) <= w - 0.5) & (u >= 0) & (u <= M - 1)
    hidden = np.zeros((CH, CW), bool)
    hidden[ys[hid], xs[hid]] = True
    # Only what joins the visible body (a stray pixel of tube out in open air is not his body), and no thin
    # slivers along an edge that shows his outline (there the mist is behind the body, not over it).
    keep = np.zeros((CH, CW), bool)
    for p in components(hidden):
        if dilate(c['lower'], 1)[p[:, 0], p[:, 1]].any():
            keep[p[:, 0], p[:, 1]] = True
    hidden &= keep
    hidden &= dilate(erode(hidden, 1), 1)
    # His coil pixels the mist bleeds into in his JPEG (bluish-pink, not his greens): rebuilt too.
    r_, g_, b_ = c['col'][..., 0], c['col'][..., 1], c['col'][..., 2]
    # (and the greyed ones, where his purple and his yellow-greens mixed into a pale grey or a mauve)
    lum_ = c['col'] @ LUMA
    tinted = c['lower'] & dilate(c['purple'], 2) & (((b_ > g_ - 12) & (lum_ > 40)) | ((g_ - b_ < 0.23 * g_) & (lum_ > 60)) | ((r_ > g_ + 8) & (lum_ > 40)))
    clean = c['lower'] & ~dilate(c['purple'], 2)
    ys, xs = np.nonzero(hidden | tinted)
    colr, got = period_copy(c, xs, ys, clean)
    c['hidden'] = np.zeros((CH, CW), bool)
    c['hidden'][ys[got], xs[got]] = True
    c['hidden_col'] = np.zeros((CH, CW, 3), np.float32)
    c['hidden_col'][ys[got], xs[got]] = colr[got]
    c['hidden'] &= ~c['lower'] | tinted
    c['retint'] = c['hidden'] & c['lower']
    c['hidden'] &= ~c['lower']
    print('key', k, 'coil px hidden under his mist (rebuilt)', int(c['hidden'].sum()), '; tinted by it (recoloured)', int(c['retint'].sum()))

if DEBUG:
    for k, c in C.items():
        vis = (c['col'] * 0.35).astype(np.uint8)
        vis[c['body']] = c['col'][c['body']].astype(np.uint8)
        vis[c['purple'] & ~c['body']] = (110, 0, 110)
        vis[c['hidden']] = (255, 0, 255)
        Image.fromarray(vis).resize((CW * 5, CH * 5), Image.NEAREST).save(os.path.join(DEBUG, f'cobra-hidden-{k}.png'))


# --- his mist, un-mixed into colour and alpha --------------------------------------------------------------
for k, c in C.items():
    c['coil_src'] = c['lower'] | c['hidden']
    c['coil_col'] = np.where((c['hidden'] | c['retint'])[..., None], c['hidden_col'], c['col'])
MIST_FULL = 190.0  # his colour distance from the panel at which his mist is solid
ALEVELS = [(0.8, 255), (0.55, 190), (0.32, 130), (0.14, 75), (0.07, 36)]  # the mist's alpha levels (the last: his faint rims)
solid_mist = np.concatenate([c['col'][c['purple'] & ~c['body'] & (c['diff'] > MIST_FULL)] for c in C.values()])
MISTPAL = kmeans(solid_mist, median_palette(solid_mist, 4))
MIST_CORE = np.median(solid_mist, 0)
print('mist palette', MISTPAL.astype(int).tolist())
for k, c in C.items():
    region = (c['purple'] | (dilate(c['purple'], 1) & (c['diff'] > 14))) & ~c['body'] & ~dilate(c['drips'], 1)
    region &= ~(c['upper'] | dilate(c['upper'], 1) & ~c['purple'])
    # His mist in front of the body: wherever his purple lies over the coil (the coil it hides, and the coil
    # pixels his mist's soft rim tints), exactly where he painted it. (A grey mix of his purple and his
    # yellow-green is no mist colour: those coil pixels keep his rebuilt scales.)
    r_, g_, b_ = c['col'][..., 0], c['col'][..., 1], c['col'][..., 2]
    purplish = (r_ > g_ + 4) & (b_ > g_ + 4)
    over = ((region & c['hidden']) | c['retint']) & purplish
    region = region | over
    # Over his panel: alpha from how far his pixel is from the panel, colour pulled back out of it.
    best_a = np.clip(c['diff'] / MIST_FULL, 0, 1)
    best_c = BG[None, None] + (c['col'] - BG[None, None]) / np.maximum(best_a, 0.05)[..., None]
    # Over the body it hides: along the line from the body's colour to his mist's.
    d = c['col'] - c['hidden_col']
    v = MIST_CORE[None, None] - c['hidden_col']
    ao = np.clip((d * v).sum(2) / np.maximum((v * v).sum(2), 1.0), 0, 1)
    co = c['hidden_col'] + d / np.maximum(ao, 0.05)[..., None]
    best_a = np.where(over, np.maximum(ao, ALEVELS[-1][0] + 0.01), best_a)  # (his purple there is his mist)
    best_c = np.clip(np.where(over[..., None], co, best_c), 0, 255)
    alpha = np.where(region, best_a, 0.0).astype(np.float32)
    c['mist_a'] = alpha
    c['mist_c'] = best_c
    c['mist_front'] = over
    c['front_rgb'] = np.where(over[..., None], c['col'], 0.0)  # his own pixel there (mist over coil, as he mixed it)
    # His blobs (each drifts on its own; one over the body is carried with the coil under it). Each fades by
    # shrinking about its centre.
    blobs, centres, fronts = [], [], []
    for p in components(alpha > 0.04):
        if len(p) < 3:
            continue
        m = np.zeros((CH, CW), bool)
        m[p[:, 0], p[:, 1]] = True
        blobs.append(m)
        wgt = alpha[p[:, 0], p[:, 1]]
        centres.append((float((p[:, 0] * wgt).sum() / wgt.sum()), float((p[:, 1] * wgt).sum() / wgt.sum())))
        fronts.append(bool((m & over).sum() >= 4))  # (any blob he laid over the coil is in front of it)
    c['blobs'], c['blob_centre'], c['blob_front'] = blobs, centres, fronts
    print('key', k, 'mist blobs', len(blobs), '(in front of the coil:', sum(fronts), ') mist alpha sum', round(float(alpha.sum()), 1))

# --- palettes: from his pixels -----------------------------------------------------------------------------
def warm_mask(col):
    """His warm accents on the head: the rosy-amber eye, the crimson jaws, the ochre hood spot and their warm
    dark browns (hue 330-50 deg and saturated, or a warm near-black)."""
    col = np.asarray(col, np.float32)
    h, s, _ = hsv(col)
    r, g, b = col[..., 0], col[..., 1], col[..., 2]
    return (((h >= 330) | (h < 50))
            & (((s > 0.3) | ((s > 0.17) & (r - g > 20))) | ((r > g) & (g >= b) & (r - b > 15) & (col @ LUMA < 60))))


for c in C.values():
    c['head_warm'] = (c['upper'] | c['drips']) & warm_mask(c['col'])
main_px = np.concatenate([np.concatenate([c['col'][c['body'] & ~c['retint'] & ~c['head_warm']], c['hidden_col'][c['retint'] | c['hidden']],
                                          c['col'][c['drips'] & ~c['head_warm']]]) for c in C.values()])
lum_px = main_px @ LUMA
hi = lum_px >= np.percentile(lum_px, 99.6)  # his fang and drip highlights
dark = lum_px < 70


def refined(px, n):
    return kmeans(px, median_palette(px, n))


MAIN = np.unique(np.concatenate([refined(main_px[~hi & ~dark], 34), refined(main_px[dark], 9), refined(main_px[hi], 3)]), axis=0)
# The head's accents get their own colours, so a warm pixel can never land on a green or a grey: the rosy
# eye and crimson jaws (hue 330-22), the ochre hood spot (22-50), each light and mid, and his warm near-blacks.
warm_px = np.concatenate([c['col'][c['head_warm']] for c in C.values()])
wh, ws, _ = hsv(warm_px)
wl = warm_px @ LUMA
ROSY_HUE = 32.0  # his rosy-amber eye and crimson jaws lie under this hue; his ochre hood spot above it (to 50)
rosy_px = (wh >= 330) | (wh < ROSY_HUE)
mid = (wl >= 30) & (wl < 75)
ACCENT_GROUPS = {  # (his pixels, colours): light / mid (crimson and dull) / dark, per hue
    'rosy': [(rosy_px & (wl >= 100), 3), (rosy_px & (wl >= 75) & (wl < 100), 2), (rosy_px & mid & (ws >= 0.55), 3),
             (rosy_px & mid & (ws < 0.55), 3)],
    'ochre': [(~rosy_px & (wl >= 100), 2), (~rosy_px & (wl >= 50) & (wl < 100), 3), (~rosy_px & (wl >= 30) & (wl < 50), 2)],
    'dark': [(rosy_px & (wl < 30) & (ws >= 0.6), 2), (rosy_px & (wl < 30) & (ws < 0.6), 1), (~rosy_px & (wl < 30), 2)],
}
ACC = {g: np.unique(np.concatenate([refined(warm_px[m], n) for m, n in parts if m.sum() >= n]), axis=0) for g, parts in ACCENT_GROUPS.items()}
ACCENT = np.unique(np.concatenate(list(ACC.values())), axis=0)
PAL = np.unique(np.concatenate([MAIN, ACCENT]), axis=0)
print('head accents', {g: v.astype(int).tolist() for g, v in ACC.items()})


def snap_head(col, warm):
    """Head pixels: warm ones only onto his accent colours of their own hue (or his warm near-blacks), the
    others only onto the body's colours (so no red speck he never painted)."""
    col = np.asarray(col, np.float32)
    out = snap(col, MAIN)
    if warm.any():
        h, _, _ = hsv(col)
        rosy = (h >= 330) | (h < ROSY_HUE)
        lum = col @ LUMA
        for sel, pal in (((warm & rosy & (lum >= 30)), np.concatenate([ACC['rosy'], ACC['dark']])),
                         ((warm & ~rosy & (lum >= 30)), np.concatenate([ACC['ochre'], ACC['dark']])),
                         ((warm & (lum < 30)), ACCENT)):
            if sel.any():
                out[sel] = snap(col[sel], pal, WARM_CHROMA)
    return out


def snap_purple(col):
    """Mist over the body: purple pixels onto the mist-over-body colours, the rest onto the body's."""
    col = np.asarray(col, np.float32)
    r, g, b = col[..., 0], col[..., 1], col[..., 2]
    pur = (r > g + 4) & (b > g + 4)
    out = snap(col, MAIN)
    if pur.any():
        out[pur] = snap(col[pur], OVERPAL)
    return out


# His outline: the dark pixels on his silhouette's rim (a deep green, not black).
ring = np.concatenate([c['col'][edge4(c['body']) & ~dilate(c['purple'], 1)] for c in C.values()])
ring = ring[ring @ LUMA < 40]
OUTLINE = np.round(np.median(ring, 0))
if OUTLINE @ LUMA < 12 or OUTLINE[1] < OUTLINE[0] + 4:
    OUTLINE = np.array([14.0, 34.0, 22.0])  # (never pure black: his deep green)
over_px = np.concatenate([c['col'][c['mist_front']] for c in C.values()] + [np.zeros((0, 3), np.float32)])
OVERPAL = refined(over_px, 5) if len(over_px) >= 5 else MISTPAL
print('palette', len(PAL), 'colours; outline', OUTLINE.astype(int).tolist(), '; mist over the body', OVERPAL.astype(int).tolist())


def alevel(a):
    out = np.zeros(a.shape, np.uint8)
    for th, v in reversed(ALEVELS):
        out = np.where(a >= th, v, out)
    return out.astype(np.uint8)


# --- frames ------------------------------------------------------------------------------------------------

def shift_arr(a, dx, dy, fill=0):
    out = np.full_like(a, fill)
    H, W = a.shape[:2]
    xs0, xs1 = max(0, -dx), min(W, W - dx)
    ys0, ys1 = max(0, -dy), min(H, H - dy)
    out[ys0 + dy:ys1 + dy, xs0 + dx:xs1 + dx] = a[ys0:ys1, xs0:xs1]
    return out


def features(P):
    """His spine's landmarks, as fractions of the body from the tail tip: the low point of the tail, the top
    of the hump, the low point of the coil under the neck (found in order along the body)."""
    y = P[:, 1]
    n = len(P)
    neck = int(np.argmax(y[int(n * 0.6):int(n * 0.95)])) + int(n * 0.6)
    hump = int(np.argmin(y[int(n * 0.3):neck - 10])) + int(n * 0.3)
    tail = int(np.argmax(y[int(n * 0.1):hump - 10])) + int(n * 0.1)
    return [0.0, tail / (n - 1), hump / (n - 1), neck / (n - 1), 1.0]


FEAT = {k: features(c['P']) for k, c in C.items()}
SIG = np.mean([FEAT[k] for k in C], 0)  # the common landmarks
print('landmarks along the body (tail low, hump top, coil under the neck):', {k: [round(v, 3) for v in f[1:4]] for k, f in FEAT.items()})
SIGMA = np.linspace(0.0, 1.0, M)
for k, c in C.items():
    # Picture k's spine on the common parameter: the same landmark at the same index in both pictures.
    c['s_of_sigma'] = np.interp(SIGMA, SIG, FEAT[k])
    c['Pm'], c['Nm'] = along(c, c['s_of_sigma'] * (M - 1))
    c['wlm'] = interp_profile(c['wl'], c['s_of_sigma'] * (M - 1))
    c['wrm'] = interp_profile(c['wr'], c['s_of_sigma'] * (M - 1))
    c['segm'] = float(np.hypot(*np.diff(c['Pm'], axis=0).T).mean())


def seg_geom(P):
    """The direction (unwrapped angle) and length of each segment of a polyline."""
    d = np.diff(P, axis=0)
    return np.unwrap(np.arctan2(d[:, 1], d[:, 0])), np.hypot(d[:, 0], d[:, 1])


TAIL_J = int(round(SIG[1] * (M - 1)))  # the tail's low point on the common parameter


TIP_LEN = 12.0  # px (along the body) of his tail tip carried as one rigid piece of his pixels


def wrap(a):
    return (a + np.pi) % (2 * np.pi) - np.pi


def heading(P, j):
    """The body's heading at point j toward the tail tip (radians), from the two segments on the body side."""
    d = P[j] - P[j + 2]
    return float(np.arctan2(d[1], d[0]))


def tip_piece(k):
    """His tail tip in picture k: the coil pixels within TIP_LEN px of the tip along the body, his own
    pixels, with the joint (where the piece meets the body), the body's heading there and the chord from the
    joint to the tip."""
    c = C[k]
    P = c['Pm']
    cum = np.concatenate([[0.0], np.cumsum(np.hypot(*np.diff(P, axis=0).T))])
    j = int(np.searchsorted(cum, TIP_LEN))
    ys, xs = np.nonzero(c['coil_src'])
    s_, _, _ = project(P, np.stack([xs, ys], 1).astype(np.float64))
    sel = to_index(s_, P) < j
    m = np.zeros((CH, CW), bool)
    m[ys[sel], xs[sel]] = True
    comps = sorted(components(m), key=len, reverse=True)  # (the tip only, no stray pixel of another coil)
    m[:] = False
    m[comps[0][:, 0], comps[0][:, 1]] = True
    phi = heading(P, j)
    ch = P[0] - P[j]
    theta = float(np.arctan2(ch[1], ch[0]))
    return dict(j=j, mask=m, col=c['coil_col'], joint=P[j].copy(), phi=phi, theta=theta, bend=float(wrap(theta - phi)),
                pts=P[:j + 1].copy(), chord=float(np.hypot(*ch)))


PIECE = {k: tip_piece(k) for k in C}
# His tail tip turns from his LEFT picture's angle to his RIGHT one's the way over the top (his LEFT tip curls up,
# his RIGHT one lies down to the left: the tip rises, leans over to the left and lies down), evenly frame by frame,
# and back the same way.
SWEEP = float(wrap(PIECE['R']['theta'] - PIECE['L']['theta']))
if SWEEP > 0:
    SWEEP -= 2 * np.pi
print('tail tip piece:', {k: dict(j=v['j'], px=int(v['mask'].sum()), chord_deg=round(np.degrees(v['theta']), 1),
                                    heading_deg=round(np.degrees(v['phi']), 1), bend_deg=round(np.degrees(v['bend']), 1)) for k, v in PIECE.items()},
      'sweep', round(np.degrees(SWEEP), 1))


TIP_DIP = 4.0  # px the joint sinks at mid-sweep, so the tip never rises while it turns over the top


def tip_plan(a, w):
    """For a frame w of the way from picture a to the other: which of his tips is carried (the nearer
    picture's), the tip's angle (even steps of the sweep), the body's heading at the joint that carries it at
    that angle, and where the joint is (on the line between his two joints, sunk a little at mid-sweep)."""
    s = w if a == 'L' else 1.0 - w
    src = 'L' if s < 0.5 else 'R'
    theta = PIECE['L']['theta'] + SWEEP * s
    joint = PIECE['L']['joint'] * (1 - s) + PIECE['R']['joint'] * s + np.array([0.0, TIP_DIP * np.sin(np.pi * s)])
    return src, theta, theta - PIECE[src]['bend'], joint


def curl_tail(P, a, b, w):
    """The tail end (from the joint of his tip piece to the tail's low point) bent rather than slid: its
    turning along the body and the length of each step go from picture a's to b's, hanging from the blended
    body at its low point, plus the smallest smooth extra turn (none at the low point, a cubic in the place
    along the tail end) that puts the joint where tip_plan says with the heading that carries his tip at its
    angle. His tip itself is a rigid piece of his pixels (render_coils): here the spine past the joint is
    that piece's spine, turned with it."""
    J = TAIL_J
    tha, la = seg_geom(C[a]['Pm'])
    thb, lb = seg_geom(C[b]['Pm'])
    thp, _ = seg_geom(P)
    th = thp[J] + (tha[:J] - tha[J]) * (1 - w) + (thb[:J] - thb[J]) * w
    ln = la[:J] * (1 - w) + lb[:J] * w
    src, theta, phi, jt = tip_plan(a, w)
    pc = PIECE[src]
    j = pc['j']
    x = np.clip((J - np.arange(J)) / float(J - j), 0.0, 1.0)
    basis = np.stack([x, x ** 2, x ** 3, x ** 4], 0)
    Q = P.copy()

    def build(c3):
        Q[:J + 1] = P[:J + 1]
        th_ = th + c3 @ basis
        for i in range(J - 1, -1, -1):
            Q[i] = Q[i + 1] - ln[i] * np.array([np.cos(th_[i]), np.sin(th_[i])])
        return Q

    def resid(c3):
        build(c3)
        return np.array([Q[j][0] - jt[0], Q[j][1] - jt[1], wrap(heading(Q, j) - phi) * 10.0])

    # (Newton steps on the three amounts, numeric derivatives, halved until the miss shrinks; deterministic)
    c3 = np.zeros(len(basis))
    r = resid(c3)
    for _ in range(40):
        if np.abs(r).max() < 1e-3:
            break
        Jm = np.stack([(resid(c3 + e) - r) / 1e-5 for e in np.eye(len(basis)) * 1e-5], 1)
        step = np.linalg.lstsq(Jm, -r, rcond=None)[0]
        step *= min(1.0, 0.6 / max(1e-9, float(np.abs(step).max())))
        for _ in range(12):
            r2 = resid(c3 + step)
            if np.hypot(*r2[:2]) + abs(r2[2]) < np.hypot(*r[:2]) + abs(r[2]):
                break
            step *= 0.5
        c3, r = c3 + step, r2
    r = resid(c3)
    if np.abs(r[:2]).max() > 0.5 or abs(r[2]) > 0.5:
        raise SystemExit(f'the tail end cannot carry the tip joint (frame {a} w={w:.2f}: residual {r.round(2).tolist()})')
    Q = build(c3).copy()
    # Past the joint: his tip piece's own spine, turned about the joint.
    rot = heading(Q, j) - pc['phi']
    R = np.array([[np.cos(rot), -np.sin(rot)], [np.sin(rot), np.cos(rot)]])
    Q[:j + 1] = Q[j] + (pc['pts'] - pc['joint']) @ R.T
    return Q


def target_spine(a, b, t, src, top):
    """The spine between his picture a (t=0) and b (t=1): every point of the body moves from its place in
    a to its place in b (his hump to his hump, his coils to his coils), evenly frame by frame; the tail end
    bends (curl_tail); then the neck bends so its top meets the head piece at `top`, square to the cut."""
    ca, cb, cs = C[a], C[b], C[src]
    w = float(np.clip(t, 0.0, 1.0))
    P = ca['Pm'] * (1 - w) + cb['Pm'] * w
    P = curl_tail(P, a, b, w)
    sn = SIG[3]
    ramp = smoothstep((SIGMA - sn) / (1 - sn))
    P = P + (np.asarray(top, np.float64) - P[-1])[None] * ramp[:, None]
    # The last px under the cut: the source picture's own neck, moved with the head piece.
    length = np.concatenate([[0.0], np.cumsum(np.hypot(*np.diff(P, axis=0).T))])
    keep = smoothstep((length - (length[-1] - NECK_KEEP)) / NECK_KEEP)
    own = cs['Pm'] + (np.asarray(top, np.float64) - cs['Pm'][-1])[None]
    return P * (1 - keep)[:, None] + own * keep[:, None]


def width_at(k, u, v_):
    """His half-width of picture k at u (common parameter) on the side of v_."""
    c = C[k]
    return np.where(v_ > 0, interp_profile(c['wrm'], u), interp_profile(c['wlm'], u))


def sample_coils(k, u, v_):
    """Where picture k's coils have the place (u on the common parameter, v across): colour, and whether his
    body is there (and from the same stretch of it)."""
    c = C[k]
    pt, nm = along(dict(P=c['Pm'], N=c['Nm'], seg=c['segm']), u)
    q = pt + nm * v_[:, None]
    ix = np.round(q[:, 0]).astype(int)
    iy = np.round(q[:, 1]).astype(int)
    inb = (ix >= 0) & (ix < CW) & (iy >= 0) & (iy < CH)
    ix, iy = np.clip(ix, 0, CW - 1), np.clip(iy, 0, CH - 1)
    ok = inb & c['coil_src'][iy, ix]
    # The sample must come from the same stretch of his body (not from a coil lying next to it).
    want = np.interp(np.clip(u, 0, M - 1), np.arange(M), c['s_of_sigma']) * (M - 1)
    want = np.where(u < 0, u * c['segm'] / c['seg'], np.where(u > M - 1, M - 1 + (u - M + 1) * c['segm'] / c['seg'], want))
    us = np.where(np.isnan(c['u'][iy, ix]), want, c['u'][iy, ix])
    ok &= np.abs(us - want) * c['seg'] < 5
    return c['coil_col'][iy, ix], ok


def render_coils(a, b, t, head, Pt, light_target=None):
    """His coils carried onto the spine Pt (on the common parameter): every pixel keeps its place along the
    body and its place across it as a fraction of his half-width there (nearest pixel, so they stay his, and
    his dark rim stays on the rim even where the body is wider or narrower than in his picture). The pixels
    come from his picture a or b by stretch: the tail end changes over to b first and the change runs up
    the body, as far as gives this frame its even share of the change in light between his two pictures
    (`light_target`, the body's mean alpha x luma: his RIGHT is the brighter, and his bright hump would
    otherwise change over in one frame); the neck always matches the head piece's picture. Also returns
    which pixels are the tail end and how far up the body the change has run (a fraction of the body)."""
    x0 = int(max(0, np.floor(Pt[:, 0].min()) - 16))
    x1 = int(min(CW, np.ceil(Pt[:, 0].max()) + 17))
    y0 = int(max(0, np.floor(Pt[:, 1].min()) - 16))
    y1 = int(min(CH, np.ceil(Pt[:, 1].max()) + 17))
    yy, xx = np.mgrid[y0:y1, x0:x1]
    Q = np.stack([xx.ravel(), yy.ravel()], 1).astype(np.float64)
    s_, v_, dist = project(Pt, Q)
    u = to_index(s_, Pt)  # index on the common parameter
    wa, wb = width_at(a, u, v_), width_at(b, u, v_)
    w = wa + (wb - wa) * t
    # The tail ends in a point (his tail tips curl away from the line, so the line alone would end it blunt).
    w = w * np.clip((u * C[a]['segm'] + 1.5) / TIP_TAPER, 0.2, 1.0) ** 0.7
    w = np.maximum(w, 0.5)
    ca, oka = sample_coils(a, u, v_ * wa / w)
    cb, okb = sample_coils(b, u, v_ * wb / w)
    inside = np.abs(v_) <= w + 1.0
    sig = u / (M - 1)
    tsrc = tip_plan(a, t)[0]
    ok = inside & (oka | okb) & (u >= PIECE[tsrc]['j'])  # (past the joint: his tip piece, below)

    def pick(q):
        use_b = np.where(sig >= SIG[3], head == b, sig < q)
        return np.where((use_b & (okb | ~oka)) | (~use_b & ~oka & okb), True, False)

    q = SIG[3] * t
    if light_target is not None:
        # (the frame's body light, estimated from his raw pixels, for each place the change could have run to)
        lum_a, lum_b = ca @ LUMA / 255.0, cb @ LUMA / 255.0
        qs = np.linspace(0.0, SIG[3], 49)
        est = [float(np.where(pick(qq), lum_b, lum_a)[ok].sum()) / (CH * CW) for qq in qs]
        q = float(qs[int(np.argmin([abs(e + light_target[1] - light_target[0]) for e in est]))])

    pick_b = pick(q)
    colr = np.where(pick_b[:, None], cb, ca)
    mask = np.zeros((CH, CW), bool)
    col = np.zeros((CH, CW, 3), np.float32)
    tail = np.zeros((CH, CW), bool)
    mask[yy.ravel()[ok], xx.ravel()[ok]] = True
    col[yy.ravel()[ok], xx.ravel()[ok]] = colr[ok]
    tail[yy.ravel()[ok & (u < TAIL_J)], xx.ravel()[ok & (u < TAIL_J)]] = True
    # His tail tip: his own pixels, turned whole about the joint.
    pm, pcol = place_tip(tsrc, Pt)
    mask |= pm
    col[pm] = pcol[pm]
    tail |= pm
    # Pinholes where two samples landed on one pixel: filled from their neighbours.
    holes = np.zeros((CH, CW), bool)
    for p in components(~mask, conn8=False):
        if len(p) <= 6 and p[:, 0].min() > 0 and p[:, 1].min() > 0 and p[:, 0].max() < CH - 1 and p[:, 1].max() < CW - 1:
            holes[p[:, 0], p[:, 1]] = True
    mask, col = fill_from_neighbours(mask, col, holes)
    # Notches up to two px wide that the carrying opens in an edge: closed (his edges are smooth there).
    closed = erode(dilate(mask, 1), 1) & ~mask
    mask, col = fill_from_neighbours(mask, col, closed)
    return mask, col, tail, q


TIP_SS = 4  # subsamples per px (each way) when his tip piece is turned


def place_tip(k, Pt):
    """His tip piece of picture k turned about its joint to the heading of the spine Pt there and moved onto
    it. Each frame pixel is sampled TIP_SS x TIP_SS times back into his picture (nearest pixel): it is part of
    the tip where at least half the samples land on his tip, in the colour of his pixel most of them land on
    (a turned copy of his pixels, not a blur, and no pixel lost or doubled along his thin tip)."""
    pc = PIECE[k]
    j = pc['j']
    rot = heading(Pt, j) - pc['phi']
    cr, sr = np.cos(-rot), np.sin(-rot)
    r = int(np.ceil(TIP_LEN + 6))
    jx, jy = Pt[j]
    x0, x1 = max(0, int(jx) - r), min(CW, int(jx) + r + 1)
    y0, y1 = max(0, int(jy) - r), min(CH, int(jy) + r + 1)
    yy, xx = np.mgrid[y0:y1, x0:x1]
    off = (np.arange(TIP_SS) + 0.5) / TIP_SS - 0.5
    oy, ox = np.meshgrid(off, off, indexing='ij')
    qx = xx[..., None] + ox.ravel()[None, None] - jx
    qy = yy[..., None] + oy.ravel()[None, None] - jy
    sx = np.round(pc['joint'][0] + cr * qx - sr * qy).astype(int)
    sy = np.round(pc['joint'][1] + sr * qx + cr * qy).astype(int)
    inb = (sx >= 0) & (sx < CW) & (sy >= 0) & (sy < CH)
    sx, sy = np.clip(sx, 0, CW - 1), np.clip(sy, 0, CH - 1)
    hit = inb & pc['mask'][sy, sx]
    on = hit.mean(-1) >= 0.5
    mask = np.zeros((CH, CW), bool)
    col = np.zeros((CH, CW, 3), np.float32)
    lin = np.where(hit, sy * CW + sx, -1)
    for (py, px_) in zip(*np.nonzero(on)):
        v = lin[py, px_]
        v = v[v >= 0]
        vals, cnt = np.unique(v, return_counts=True)
        best = int(vals[np.argmax(cnt)])
        mask[py + y0, px_ + x0] = True
        col[py + y0, px_ + x0] = pc['col'][best // CW, best % CW]
    return mask, col


def tidy(body, col):
    """A clean silhouette: one-pixel notches filled from their neighbours, one-pixel spurs and loose
    crumbs dropped (a carried pixel that lands alone would read as a stray speck)."""
    body = body.copy()
    for _ in range(3):
        notch = ~body & (nb4(body) >= 3)
        body, col = fill_from_neighbours(body, col, notch)
        body &= ~(body & (nb4(body) <= 1))
    for p in components(body):
        if len(p) < 12:
            body[p[:, 0], p[:, 1]] = False
    return body, col


def tail_pixels(k):
    """The tail end of his picture k (coil pixels before the tail's low point)."""
    c = C[k]
    ys, xs = np.nonzero(c['coil_src'])
    s_, _, _ = project(c['Pm'], np.stack([xs, ys], 1).astype(np.float64))
    sel = to_index(s_, c['Pm']) < TAIL_J
    m = np.zeros((CH, CW), bool)
    m[ys[sel], xs[sel]] = True
    return m


TAIL_BOX = {}
for k in C:
    ys, xs = np.nonzero(tail_pixels(k))
    TAIL_BOX[k] = (int(xs.min()), int(ys.min()))
TAIL_TOP = min(v[1] for v in TAIL_BOX.values())  # his highest and furthest-out tail pixels
TAIL_LEFT = min(v[0] for v in TAIL_BOX.values())

# Each blob his mist lays over the coil is carried with the coil under it: its place along and across the body.
for k, c in C.items():
    c['blob_on_coil'] = []
    for m, fr in zip(c['blobs'], c['blob_front']):
        if not fr:
            c['blob_on_coil'].append(None)
            continue
        ys, xs = np.nonzero(m & c['mist_front'])
        cen = np.array([[xs.mean(), ys.mean()]])
        s_, v_, _ = project(c['Pm'], cen)
        c['blob_on_coil'].append((cen[0], float(to_index(s_, c['Pm'])[0]), float(v_[0])))


def mist_layers(items, Pt=None, gain=1.0):
    """His blobs, each moved whole by whole pixels and faded. A fading blob shrinks into a smaller copy of
    itself, his core keeping his purple at his own alpha and his soft rim staying its rim (a whole blob
    thinned at once would turn into a grey film over the grass; one eaten from its edge would leave a thin
    streak of a big cloud). A blob over the coil goes with the coil under it."""
    mist_a = np.zeros((CH, CW), np.float32)
    mist_c = np.zeros((CH, CW, 3), np.float32)
    mist_f = np.zeros((CH, CW), bool)
    mist_rgb = np.zeros((CH, CW, 3), np.float32)
    mist_bf = np.zeros((CH, CW), bool)  # (pixels of a blob that lies in front of the coil)
    if Pt is not None:
        Nt = normals(Pt)
        segt = float(np.hypot(*np.diff(Pt, axis=0).T).mean())
    for k, j, fade, (mx, my) in items:
        ck = C[k]
        m = ck['blobs'][j]
        f = min(1.0, fade * gain)
        if f <= 0.02:
            continue
        oc = ck['blob_on_coil'][j]
        if oc is not None and Pt is not None:
            cen, u0, v0 = oc
            pt, nm = along(dict(P=Pt, N=Nt, seg=segt), np.array([u0]))
            mx, my = (pt[0] + nm[0] * v0) - cen
        mdx, mdy = int(round(mx)), int(round(my))
        a0, c0, f0, r0 = np.where(m, ck['mist_a'], 0.0), ck['mist_c'], m & ck['mist_front'], ck['front_rgb']
        if f < 1.0:
            # His blob shrunk to a smaller copy of itself about its centre (nearest pixel: his pixels, his
            # soft rim and his core), its area going with the fade.
            sc = float(np.sqrt(f))
            cy, cx = ck['blob_centre'][j]
            ys, xs = np.nonzero(m)
            y0_, y1_ = int(np.floor(cy + (ys.min() - cy) * sc)) - 1, int(np.ceil(cy + (ys.max() - cy) * sc)) + 2
            x0_, x1_ = int(np.floor(cx + (xs.min() - cx) * sc)) - 1, int(np.ceil(cx + (xs.max() - cx) * sc)) + 2
            gy, gx = np.mgrid[y0_:y1_, x0_:x1_]
            sy = np.clip(np.round(cy + (gy - cy) / sc).astype(int), 0, CH - 1)
            sx = np.clip(np.round(cx + (gx - cx) / sc).astype(int), 0, CW - 1)
            inb = m[sy, sx]
            a1 = np.zeros((CH, CW), np.float32)
            c1 = np.zeros((CH, CW, 3), np.float32)
            f1 = np.zeros((CH, CW), bool)
            r1 = np.zeros((CH, CW, 3), np.float32)
            a1[gy[inb], gx[inb]] = ck['mist_a'][sy[inb], sx[inb]]
            c1[gy[inb], gx[inb]] = ck['mist_c'][sy[inb], sx[inb]]
            f1[gy[inb], gx[inb]] = ck['mist_front'][sy[inb], sx[inb]]
            r1[gy[inb], gx[inb]] = ck['front_rgb'][sy[inb], sx[inb]]
            a0, c0, f0, r0 = a1, c1, f1, r1
        am = shift_arr(a0, mdx, mdy, 0.0)
        cm = shift_arr(c0, mdx, mdy, 0.0)
        fm = shift_arr(f0, mdx, mdy, False)
        rm = shift_arr(r0, mdx, mdy, 0.0)
        take = am > mist_a
        mist_a = np.where(take, am, mist_a)
        mist_c = np.where(take[..., None], cm, mist_c)
        mist_f = np.where(take, fm, mist_f)
        mist_rgb = np.where(take[..., None], rm, mist_rgb)
        mist_bf = np.where(take, (am > 0) & (oc is not None), mist_bf)
    return mist_a, mist_c, mist_f, mist_rgb, mist_bf


def head_offset(k, base, strike):
    return (int(round(base[0] + strike[0] - C[k]['P'][-1][0])), int(round(base[1] + strike[1] - C[k]['P'][-1][1])))


def frame(spec):
    a, b, t, src = spec['a'], spec['b'], spec['t'], spec['src']
    c = C[src]
    base = C[a]['P'][-1] + (C[b]['P'][-1] - C[a]['P'][-1]) * t
    strike = spec.get('strike', (0, 0))
    hdx, hdy = head_offset(src, base, strike)
    Pt = None
    tail = np.zeros((CH, CW), bool)
    if t in (0.0, 1.0) and hdx == 0 and hdy == 0:
        coils, ccol = c['coil_src'], c['coil_col']
    else:
        Pt = target_spine(a, b, t, src, c['P'][-1] + np.array([hdx, hdy]))
        lt = None
        if 'body_target' in spec:
            # (the head piece's own light, so that the coils make up the rest of the target)
            hl = float((shift_arr(c['upper'] & ~c['lower'], hdx, hdy, False) * (shift_arr(c['col'], hdx, hdy, 0.0) @ LUMA / 255.0)).sum()) / (CH * CW)
            lt = (spec['body_target'] + spec.get('body_trim', 0.0), hl)
        coils, ccol, tail, spec['switch'] = render_coils(a, b, t, src, Pt, lt)
    spec['Pt'] = Pt
    up = shift_arr(c['upper'], hdx, hdy, False)
    ucol = shift_arr(c['col'], hdx, hdy, 0.0)
    uwarm = shift_arr(c['head_warm'], hdx, hdy, False)
    # The venom drops: the head piece's own, or (on the frame before the head piece changes over to his other
    # picture's) his other picture's, so the drops and the head do not change in the same frame.
    dk = spec.get('drips', src)
    ddx, ddy = head_offset(dk, base, strike)
    dr = shift_arr(C[dk]['drips'], ddx, ddy, False)
    dcol = shift_arr(C[dk]['col'], ddx, ddy, 0.0)
    dwarm = shift_arr(C[dk]['head_warm'], ddx, ddy, False)
    body = coils | up
    col = np.where(up[..., None], ucol, ccol)
    body, col = tidy(body, col)
    if Pt is None:
        # His own picture: the tidy closes no notch that is his mist in front of the body's edge.
        body &= ~((c['mist_a'] >= ALEVELS[2][0]) & ~c['coil_src'] & ~up)
    spec['tail'] = tail & body
    out = np.zeros((CH, CW, 4), np.float32)
    out[body, :3] = snap_head(col[body], (uwarm & up)[body])
    ring = edge4(body)
    out[ring, :3] = OUTLINE
    out[body, 3] = 255
    spec['body_light'] = float((out[..., 3] / 255.0 * (out[..., :3] @ LUMA / 255.0)).mean())
    spec['body_light_raw'] = float((body * (col @ LUMA / 255.0)).mean())
    dd = dr & ~body
    # The mist: his blobs, each moved whole (whole pixels) and faded; behind the body unless his blob lay over it.
    occupied = body | dd

    base = (out[..., 3] / 255.0) * (out[..., :3] @ LUMA / 255.0)
    base[dd] = (snap_head(dcol[dd], dwarm[dd]) @ LUMA / 255.0) if dd.any() else 0.0

    def seen(g):
        """The mist at gain g, and the light of the whole frame with it (the mist beside the body, and his
        mist over the coil in place of the scales under it)."""
        ma, mc, mf, mr, bf = mist_layers(spec['mist'], Pt, g)
        lv = alevel(ma)
        free = (lv > 0) & ~occupied
        tot = float(base.sum())
        if free.any():
            tot += float((lv[free] / 255.0 * (snap(mc[free], MISTPAL) @ LUMA / 255.0)).sum())
        front, over_rgb = front_colours(lv, mc, mf, mr, bf)
        if front.any():
            tot += float((over_rgb @ LUMA / 255.0).sum() - base[front].sum())
        return ma, mc, mf, mr, bf, tot / (CH * CW)

    def front_colours(lv, mc, mf, mr, bf):
        """His mist over the coil: his own pixels where he painted it over the coil, and the rest of a blob
        that lies in front of the coil laid over the scales at its alpha (so the coil's rim does not cut
        through the blob)."""
        front = (lv > 0) & body & (mf | bf)
        rgb = np.where(mf[..., None], mr, snap(mc, MISTPAL) * (lv / 255.0)[..., None] + out[..., :3] * (1 - lv / 255.0)[..., None])
        return front, snap_purple(rgb[front])

    g = 1.0
    mist_a, mist_c, mist_f, mist_rgb, mist_bf, ml = seen(g)
    if 'light_target' in spec:
        # Half-faded blobs read dimmer than his whole ones: how far the blobs have faded is scaled (a bisection
        # on the gain) so the frame's light goes evenly from his one picture's to his other's.
        lo, hi = np.log(0.25), np.log(4.0)
        best = (abs(ml - spec['light_target']), g, (mist_a, mist_c, mist_f, mist_rgb, mist_bf, ml))
        for _ in range(12):
            mid_ = (lo + hi) / 2
            g = float(np.exp(mid_))
            res = seen(g)
            if abs(res[5] - spec['light_target']) < best[0]:
                best = (abs(res[5] - spec['light_target']), g, res)
            if res[5] < spec['light_target']:
                lo = mid_
            else:
                hi = mid_
        g = best[1]
        mist_a, mist_c, mist_f, mist_rgb, mist_bf, ml = best[2]
    spec['mist_gain'], spec['light'] = g, ml
    lev = alevel(mist_a)
    # A drop a mist blob drifts over goes behind it (the whole drop, so no green ring floats in the purple).
    for p in components(dd):
        if (lev[p[:, 0], p[:, 1]] >= 130).mean() >= 0.5:
            dd[p[:, 0], p[:, 1]] = False
    out[dd, :3] = snap_head(dcol[dd], dwarm[dd])
    out[dd, 3] = 255
    free = (lev > 0) & (out[..., 3] == 0)
    out[free, :3] = snap(mist_c[free], MISTPAL)
    out[free, 3] = lev[free]
    # His mist over the coil: his own pixels there (his purple over his scales), where he painted them.
    front, over_rgb = front_colours(lev, mist_c, mist_f, mist_rgb, mist_bf)
    if front.any():
        out[front, :3] = over_rgb
    # A body speck of 3 px or less left inside the mist or at its edge (a coil pixel showing through his
    # purple) takes the mist colour round it.
    opaque = out[..., 3] == 255
    misty = (out[..., 3] > 0) & ~opaque
    for pc in np.concatenate([OVERPAL, MISTPAL]).astype(int):
        misty |= opaque & (out[..., :3].astype(int) == pc).all(2)
    for p in components(opaque & ~misty):
        if len(p) > 3:
            continue
        pm = np.zeros((CH, CW), bool)
        pm[p[:, 0], p[:, 1]] = True
        rim = dilate(pm, 1) & ~pm
        rim |= np.roll(np.roll(pm, 1, 0), 1, 1) | np.roll(np.roll(pm, 1, 0), -1, 1) | np.roll(np.roll(pm, -1, 0), 1, 1) | np.roll(np.roll(pm, -1, 0), -1, 1)
        rim &= ~pm & (out[..., 3] > 0)
        if rim.any() and misty[rim].mean() >= 0.5:
            src_px = out[rim & misty & opaque, :3]
            if len(src_px) == 0:
                src_px = snap(out[rim & misty, :3], OVERPAL)
            vals, cnt = np.unique(src_px.astype(int), axis=0, return_counts=True)
            out[pm, :3] = vals[np.argmax(cnt)]
            out[pm, 3] = 255
    # A see-through pinhole inside his mist (where his JPEG thinned it under the faintest level) takes the
    # faintest level of the mist round it: no dead hole in a puff or a bubble.
    misty = (out[..., 3] > 0) & (out[..., 3] < 255)
    for pc in np.concatenate([OVERPAL, MISTPAL]).astype(int):
        misty |= (out[..., 3] == 255) & (out[..., :3].astype(int) == pc).all(2)
    for p in components(out[..., 3] == 0, conn8=False):
        if len(p) > 4 or p[:, 0].min() == 0 or p[:, 1].min() == 0 or p[:, 0].max() == CH - 1 or p[:, 1].max() == CW - 1:
            continue
        pm = np.zeros((CH, CW), bool)
        pm[p[:, 0], p[:, 1]] = True
        rim = dilate(pm, 1) & ~pm
        if misty[rim].mean() >= 0.5:
            mc = out[rim & misty, :3]
            mc = mc[np.argsort(mc @ LUMA, kind='stable')][len(mc) // 2]
            out[pm, :3] = snap(mc[None], MISTPAL)[0]
            out[pm, 3] = ALEVELS[-1][1]
    return out.astype(np.uint8)


NECK_KEEP = 10.0  # px of neck under the cut that move with the head piece
TIP_TAPER = 9.0  # px over which the tail narrows to its point in the in-betweens
DRIFT, RISE = 9.0, 3.0  # px a mist blob drifts back (and up) while it fades


STAGGER = 0.5  # the blobs fade one after another over this much of the move, not all at once


def mist(a, b, t):
    """Blobs of a drift back and fade out (the hindmost first), blobs of b drift in from in front and fade in
    (the foremost first): each blob fades over half the move, so few are half-faded at once. (A blob over
    the coil goes with the coil instead: see mist_layers.)"""
    out = []
    for k, sgn in ((a, -1), (b, 1)):
        blobs = C[k]['blobs']
        xs = [float(np.nonzero(m)[1].mean()) for m in blobs]
        order = np.argsort(xs if sgn < 0 else [-x for x in xs], kind='stable')
        rank = np.empty(len(blobs))
        rank[order] = np.arange(len(blobs)) / max(1, len(blobs) - 1)
        for j in range(len(blobs)):
            w = smoothstep((t - STAGGER * rank[j]) / (1 - STAGGER))
            fade = 1.0 - w if sgn < 0 else w
            move = (-DRIFT * t, -RISE * t) if sgn < 0 else (DRIFT * (1 - t), RISE * (1 - t))
            out.append((k, j, fade, move))
    return out


# His LEFT is frame 0 and his RIGHT frame 5 (as on our kit). The body moves evenly: a fifth of the way per
# frame out (1-4) and a third per frame back (6-7). The head piece of an in-between is his picture the move
# starts from (his two heads are nearly one drawing); its drops change over one frame before it does.
FRAMES = [
    dict(a='L', b='R', t=0.0, src='L', strike=(0, 0)),
    dict(a='L', b='R', t=0.2, src='L', strike=(-2, -1)),
    dict(a='L', b='R', t=0.4, src='L', strike=(2, 0)),
    dict(a='L', b='R', t=0.6, src='L', strike=(6, 2)),
    dict(a='L', b='R', t=0.8, src='L', strike=(3, 1), drips='R'),
    dict(a='R', b='L', t=0.0, src='R', strike=(0, 0)),
    dict(a='R', b='L', t=1 / 3, src='R', strike=(-1, -1)),
    dict(a='R', b='L', t=2 / 3, src='R', strike=(-1, 0), drips='L'),
]
for f in FRAMES:
    f['mist'] = mist(f['a'], f['b'], f['t']) if f['t'] > 0 else [(f['a'], j, 1.0, (0.0, 0.0)) for j in range(len(C[f['a']]['blobs']))]
fly = [None] * len(FRAMES)
for i, f in enumerate(FRAMES):
    if f['t'] == 0:
        fly[i] = frame(f)
KEY_LIGHT = {f['a']: f['light'] for f in FRAMES if f['t'] == 0}  # (the whole frame's light)
KEY_BODY_LIGHT = {f['a']: f['body_light_raw'] for f in FRAMES if f['t'] == 0}
for i, f in enumerate(FRAMES):
    if f['t'] > 0:
        # Each in-between gets its even share of the change in light between his two pictures: the body's (by how
        # far up the body his other picture's pixels have come) and the mist's (by how far the blobs have faded).
        f['light_target'] = KEY_LIGHT[f['a']] * (1 - f['t']) + KEY_LIGHT[f['b']] * f['t']
        f['body_target'] = KEY_BODY_LIGHT[f['a']] * (1 - f['t']) + KEY_BODY_LIGHT[f['b']] * f['t']
        fly[i] = frame(f)
        # (the estimate reads his raw pixels before the rim and the tidy: one more pass, trimmed by what it missed)
        f['body_trim'] = f['body_target'] - f['body_light_raw']
        fly[i] = frame(f)
print('mist gain per frame', [round(f['mist_gain'], 3) for f in FRAMES])
print('body changed over to the other picture up to (fraction of the body)', [round(f.get('switch', 0.0), 3) for f in FRAMES])


def light(f):
    """Mean alpha x luma over the frame (0-1): what the eye reads as the frame's brightness."""
    return float(((f[..., 3] / 255.0) * (f[..., :3].astype(np.float32) @ LUMA / 255.0)).mean())


def mass(f):
    return float((f[..., 3] == 255).sum())


LIGHT = [light(f) for f in fly]
MASS = [mass(f) for f in fly]
print('fly light (mean alpha x luma, x1000):', [round(v * 1000, 2) for v in LIGHT])
print('fly opaque px:', [int(v) for v in MASS])
for i in range(len(fly)):
    j = (i + 1) % len(fly)
    rl = max(LIGHT[i], LIGHT[j]) / min(LIGHT[i], LIGHT[j])
    rm = max(MASS[i], MASS[j]) / min(MASS[i], MASS[j])
    if rl > 1.12 or rm > 1.12:
        raise SystemExit(f'frames {i} -> {j}: light x{rl:.3f}, opaque mass x{rm:.3f}: a flash (limit x1.12)')

if DEBUG:
    strip = Image.new('RGBA', (len(fly) * (CW + 2), CH * 2 + 2), (93, 107, 87, 255))
    for i, f in enumerate(fly):
        strip.alpha_composite(Image.fromarray(f, 'RGBA'), (i * (CW + 2), 0))
        dark = Image.new('RGBA', (CW, CH), (31, 33, 46, 255))
        dark.alpha_composite(Image.fromarray(f, 'RGBA'))
        strip.paste(dark, (i * (CW + 2), CH + 2))
    strip.resize((strip.width * 2, strip.height * 2), Image.NEAREST).save(os.path.join(DEBUG, 'cobra-fly-strip.png'))
    np.save(os.path.join(DEBUG, 'cobra-fly.npy'), np.stack(fly))

if DEBUG:
    k_ = 4
    img = Image.new('RGB', (CW * k_ * 4 + 30, CH * k_ * 2 + 10), (20, 20, 26))
    dr = ImageDraw.Draw(img)
    for i, f in enumerate(FRAMES):
        ox_, oy_ = (i % 4) * (CW * k_ + 10), (i // 4) * (CH * k_ + 10)
        Pt = f['Pt'] if f['Pt'] is not None else C[f['a']]['Pm']
        for kk, colr in (('L', (90, 90, 160)), ('R', (160, 90, 90))):
            dr.line([(ox_ + p[0] * k_, oy_ + p[1] * k_) for p in C[kk]['P']], fill=colr, width=1)
        dr.line([(ox_ + p[0] * k_, oy_ + p[1] * k_) for p in Pt], fill=(255, 255, 255), width=2)
        for j in range(0, M, 20):
            dr.ellipse([ox_ + Pt[j][0] * k_ - 3, oy_ + Pt[j][1] * k_ - 3, ox_ + Pt[j][0] * k_ + 3, oy_ + Pt[j][1] * k_ + 3], fill=(255, 220, 0))
        dr.text((ox_ + 4, oy_ + 4), str(i), fill=(255, 255, 255))
    img.save(os.path.join(DEBUG, 'cobra-spines-frames.png'))


# --- checks and output -------------------------------------------------------------------------------------
FAILS = []


def fail(msg):
    """A failed check: reported now, and the build stops before anything is written."""
    print('CHECK FAILED:', msg)
    FAILS.append(msg)


KEYF = {0: 'L', 5: 'R'}


def ramp(x, a, b):
    return np.clip((x - a) / (b - a), 0.0, 1.0)


def accent_counts(rgb, m):
    """How much of his red (crimson jaws, rosy eye) and his ochre (hood spot) the pixels m carry: each pixel
    counts by how clearly it is one (saturation from 0.3 to 0.5, hue within 6 deg of the bounds, luma), so a
    pixel on a threshold does not flip the count."""
    h, s_, _ = hsv(rgb)
    lum = rgb @ LUMA
    hr = np.where(h >= 180, h - 360, h)
    sat = ramp(s_, 0.3, 0.5)
    red = sat * ramp(hr, -36, -24) * ramp(-hr, -ROSY_HUE - 6, -ROSY_HUE + 6) * ramp(lum, 10, 20)
    ochre = sat * ramp(h, ROSY_HUE - 6, ROSY_HUE + 6) * ramp(-h, -56, -44) * ramp(lum, 20, 30)
    return round(float(red[m].sum()), 1), round(float(ochre[m].sum()), 1)


EYE, HEAD_ACCENTS, NECK_MIST = {}, {}, {}
for fi, k in KEYF.items():
    c = C[k]
    head = c['upper'] | c['drips']
    ours = fly[fi][..., :3].astype(np.float32)
    shown = head & (fly[fi][..., 3] == 255) & ~edge4(c['body'] | c['drips'])  # (his rim is our outline)
    his_n = accent_counts(c['col'], shown)
    our_n = accent_counts(ours, shown)
    print(f'frame {fi}: head red / ochre amount, his {his_n}, ours {our_n}')
    HEAD_ACCENTS[str(fi)] = {'his': list(his_n), 'ours': list(our_n)}
    for hn, on, nm in zip(his_n, our_n, ('red', 'ochre')):
        if hn and abs(on - hn) > 0.15 * hn:
            fail(f'frame {fi}: the head carries {on} of {nm} against his {hn} (more than 15 % off)')
    # His eye: the light rosy spot highest on the head; its 3x3 core must stay rosy-amber (hue under 30 deg).
    h, s_, _ = hsv(c['col'])
    cand = head & ((h >= 330) | (h < 30)) & (s_ > 0.15) & (c['col'] @ LUMA > 100)
    eye = min(components(cand), key=lambda p: (p[:, 0].mean(), -len(p)))
    ey, ex = int(round(eye[:, 0].mean())), int(round(eye[:, 1].mean()))
    core = ours[ey - 1:ey + 2, ex - 1:ex + 2]
    EYE[fi] = {'at_canvas': [ex, ey], 'core': core.reshape(-1, 3).astype(int).tolist()}
    hh, ss, _ = hsv(core)
    warm_core = ((hh < 30) | (hh >= 330)) & (ss > 0.1)
    print(f'frame {fi}: eye at {(ex, ey)}, 3x3 core', core.reshape(-1, 3).astype(int).tolist())
    if warm_core.sum() < 7:
        fail(f'frame {fi}: his eye lost its rosy amber ({int(warm_core.sum())} of 9 core px warm)')
    # His mist at the neck base, over the coil and beside it (not his body's own dark rim, which is our outline):
    # our purple there must match his.
    his_p = ((c['purple'] & ~c['body']) | c['mist_front']) & (c['col'][..., 0] > c['col'][..., 1] + 10) & (c['col'][..., 2] > c['col'][..., 1] + 10)
    our_p = (fly[fi][..., 3] > 0) & (ours[..., 0] > ours[..., 1] + 10) & (ours[..., 2] > ours[..., 1] + 10)
    nb = np.zeros((CH, CW), bool)
    ys_, xs_ = np.nonzero(c['body'])
    nb[int(ys_.max()) - 32:int(ys_.max()) + 2, AX - 5:int(xs_.max()) + 6] = True  # (the coil under the neck)
    lost = int((his_p & ~our_p & nb).sum())
    print(f'frame {fi}: neck-base purple px, his {int((his_p & nb).sum())}, lost {lost}')
    NECK_MIST[str(fi)] = {'his': int((his_p & nb).sum()), 'lost': lost}
    if lost >= 10:
        fail(f'frame {fi}: {lost} px of his neck-base mist lost')

# The tail: never higher or further out than his two tails (2 px slack), and its tip moves a few px a frame.
TIPS = []
for i, f in enumerate(FRAMES):
    tm = tail_pixels(f['a']) if f['Pt'] is None else f['tail']
    ys, xs = np.nonzero(tm)
    if ys.min() < TAIL_TOP - 2 or xs.min() < TAIL_LEFT - 2:
        fail(f'frame {i}: the tail reaches ({xs.min()}, {ys.min()}), past his tails ({TAIL_LEFT}, {TAIL_TOP})')
    TIPS.append(C[f['a']]['Pm'][0] if f['Pt'] is None else f['Pt'][0])
TIP_STEP = [float(np.hypot(*(TIPS[(i + 1) % len(TIPS)] - TIPS[i]))) for i in range(len(TIPS))]
print('tail tip per frame', [tuple(np.round(p - [AX, AY], 1).tolist()) for p in TIPS], 'steps px', [round(v, 1) for v in TIP_STEP])
if max(TIP_STEP) > 13:
    fail(f'the tail tip jumps {max(TIP_STEP):.1f} px in one frame')
ALPH = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+,-./:;<=>?@[]^_{|}~`"' + ''.join(chr(c) for c in range(0xC0, 0x100) if c not in (0xD7, 0xF7))
for i, f in enumerate(fly):
    op = f[..., 3] > 0
    if op[0].any() or op[-1].any() or op[:, 0].any() or op[:, -1].any():
        fail(f'frame {i}: a pixel on the canvas edge (PAD is too small)')
    # No enclosed see-through gap in the body, no stray specks.
    solid = f[..., 3] == 255
    for p in components(~solid, conn8=False):
        edge = p[:, 0].min() == 0 or p[:, 1].min() == 0 or p[:, 0].max() == CH - 1 or p[:, 1].max() == CW - 1
        if not edge and len(p) > 20 and not (f[p[:, 0], p[:, 1], 3] > 0).any():
            fail(f'frame {i}: an enclosed gap of {len(p)} px in the body')
    is_mist = np.zeros(solid.shape, bool)
    for mc in np.concatenate([MISTPAL, OVERPAL]).astype(int):
        is_mist |= (f[..., :3].astype(int) == mc).all(2)
    for p in components(solid & ~is_mist):  # (his mist is soft: a solid pixel in a blob is no speck)
        if len(p) <= 3:
            y_, x_ = p[0]
            fail(f'frame {i}: a speck of {len(p)} px at {(x_, y_)}, colour {f[y_, x_].tolist()}, '
                             f'around alpha {f[max(0, y_ - 1):y_ + 2, max(0, x_ - 1):x_ + 2, 3].tolist()}')
    # No dead hole: no see-through pixel with all eight neighbours drawn (a bubble or a drop with a hole in it).
    shown = f[..., 3] > 0
    n8 = sum(np.roll(np.roll(shown, dy, 0), dx, 1).astype(np.int32) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if dy or dx)
    for y_, x_ in zip(*np.nonzero(~shown & (n8 == 8))):
        fail(f'frame {i}: a see-through pixel walled in at canvas {(int(x_), int(y_))}')

ys, xs = np.nonzero(np.stack([f[..., 3] for f in fly]).max(0))
BOX = (int(xs.min()) - 1, int(ys.min()) - 1, int(xs.max()) + 2, int(ys.max()) + 2)  # the union of every frame + 1 px
OW, OH = BOX[2] - BOX[0], BOX[3] - BOX[1]
OAX, OAY = AX - BOX[0], AY - BOX[1]
frames_out = [f[BOX[1]:BOX[3], BOX[0]:BOX[2]] for f in fly]
print('frame', (OW, OH), 'anchor (centre of the body mass)', (OAX, OAY))


def write_module(frames, size, anchor, note):
    colors = {}

    def cid(px):
        key = '#%02x%02x%02x%02x' % tuple(int(v) for v in px)
        if key not in colors:
            colors[key] = len(colors) + 1
        return colors[key]
    OW_, OH_ = size
    used = {tuple(int(v) for v in px) for img in frames for px in img.reshape(-1, 4) if px[3] > 0}
    if len(used) >= len(ALPH):
        raise SystemExit(f'{len(used)} colours: more than the alphabet holds ({len(ALPH) - 1})')
    rows_all = []
    for img in frames:
        rows = []
        for y in range(OH_):
            ids = [0 if img[y, x][3] == 0 else cid(img[y, x]) for x in range(OW_)]
            toks = []
            x = 0
            while x < OW_:
                n = 1
                while x + n < OW_ and ids[x + n] == ids[x]:
                    n += 1
                toks.append(ALPH[ids[x]] + (str(n) if n > 1 else ''))
                x += n
            rows.append(''.join(toks))
        rows_all.append(rows)
    if len(colors) >= len(ALPH):
        raise SystemExit(f'{len(colors)} colours: more than the alphabet holds ({len(ALPH) - 1})')
    pal = ['#00000000'] + list(colors.keys())
    ts = ["// Generated by tools/refs/cobra-from-ref.py from the owner's poison sheet. Do not edit by hand.", '//']
    ts += ['// ' + line for line in note]
    ts += ['//', f'// Each frame is {OW_}x{OH_} with the anchor at ({anchor[0]}, {anchor[1]}). Rows are run-length encoded: a symbol',
           '// (an index into PALETTE through ALPHABET, 0 = clear) followed by its repeat count when above one.', '']
    ts.append(f'export const SIZE: [number, number] = [{OW_}, {OH_}];')
    ts.append(f'export const ANCHOR: [number, number] = [{anchor[0]}, {anchor[1]}];')
    ts.append(f'export const FPS = {FPS};')
    ts.append(f"export const ALPHABET = '{ALPH}';")
    ts.append('export const PALETTE: string[] = [')
    for i in range(0, len(pal), 8):
        ts.append('  ' + ', '.join(f"'{c}'" for c in pal[i:i + 8]) + ',')
    ts.append('];')
    ts.append('export const FRAMES: Record<string, string[][]> = {')
    ts.append('  fly: [')
    for rows in rows_all:
        ts.append('    [')
        for row in rows:
            ts.append(f"      '{row}',")
        ts.append('    ],')
    ts.append('  ],')
    ts.append('};')
    ts.append('')
    tmp = OUT_TS + '.part'
    with open(tmp, 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(ts))
    os.replace(tmp, OUT_TS)
    print('colours', len(colors), 'bytes', os.path.getsize(OUT_TS))


FPS = 10
if FAILS:
    raise SystemExit(f'{len(FAILS)} check(s) failed: ' + '; '.join(FAILS))
write_module(frames_out, (OW, OH), (OAX, OAY), [
    "The venom cobra (vfx_beasts/poison), copied from his poison sheet's BEAST (COBRA, APPROVED, IN GAME) panel:",
    "his LEFT picture is fly frame 0 and his RIGHT picture frame 5, his pixels one to one (his character is",
    f"{HIS_CHAR_H:g} px tall in that sheet against our {CHAR_H:g}: the scale is 1), his mist over the coil where he",
    "painted it and his head's warm accents (eye, jaws, hood spot) on colours of their own hue. Frames 1-4 and",
    "6-7 carry his coils along a spine that moves evenly from one of his shapes to the other (the tail bends",
    "its tip along the line between his two tips), move his head piece whole (draw back, strike, settle) and",
    "shrink his mist blobs out and in, so the light goes evenly between his two pictures. Facing right; the",
    "anchor is the centre of the body's mass.",
])
if DEBUG:
    info = {
        'ref': os.path.basename(REF), 'scale': S, 'scale_measured': S_MEASURED, 'his_character': {k: h for k, (h, _) in HEIGHTS.items()},
        'panel': list(PANEL),
        # Where each frame's anchor lies in his sheet (for laying his pictures beside ours).
        'keys': {'0': {'pic': 'L', 'anchor_in_sheet': [cents['L'][0] + KEYS['L']['off'][0], cents['L'][1] + KEYS['L']['off'][1]]},
                 '5': {'pic': 'R', 'anchor_in_sheet': [cents['R'][0] + KEYS['R']['off'][0], cents['R'][1] + KEYS['R']['off'][1]]}},
        'size': [OW, OH], 'anchor': [OAX, OAY], 'fps': FPS,
        'light': [round(v * 1000, 2) for v in LIGHT], 'opaque': [int(v) for v in MASS],
        'frames': [{k: (v if not isinstance(v, (np.floating, float)) else round(float(v), 3)) for k, v in f.items() if k in ('a', 'b', 't', 'src', 'strike', 'drips', 'mist_gain', 'switch')} for f in FRAMES],
        'tail_tip_steps': [round(v, 1) for v in TIP_STEP],
        'head_accents': HEAD_ACCENTS, 'eye': {str(k): v for k, v in EYE.items()}, 'neck_mist': NECK_MIST,
    }
    tmp = os.path.join(DEBUG, 'cobra-ref.json.part')
    with open(tmp, 'w', encoding='utf-8') as fh:
        json.dump(info, fh, indent=1)
    os.replace(tmp, os.path.join(DEBUG, 'cobra-ref.json'))
