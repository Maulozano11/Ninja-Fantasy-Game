"""Turns the owner's chakra sheet's BEAST panel (his new griffin) into game frames for vfx_beasts/chakra.

    python3 -I griffin-from-ref.py REF-chakra-set-owner.jpg <out.ts> [debugDir]

He painted ONE pose over our old chakra fox: a winged griffin of blue chakra (eagle head and wings, lion
body, gold beak, talons and trims), wings raised, with chakra specks, a light streak kicking off the
hind foot and a ribbon of chakra under the talons. That picture IS fly frame 0:

1. Scale: his character beside the walls (two panels) is measured against ours (96 px): S = 96 / his.
2. His panel is cut out: its background, the label and the borders go. The griffin is the big shape
   that differs from the panel; the light streak and the specks are un-mixed from the dark panel into
   colour + alpha (they stay semi-transparent, the way he painted them).
3. Everything is area-averaged (box filter) to the game scale on our anchor (the middle of the torso),
   snapped to a palette clustered from his own colours (his blues, indigos, golds and the reds of his
   open mouth, each group apart), and its edge cleaned to a 1 px outline in his own deep blue rim colour
   (a dark gold one round the gold beak, crest and talons). Never black.

The other seven frames are derived from that key frame, at the game scale, from his pixels (an 8-frame
beat, 10 fps): his two wings (the near one in front of the body, the far one behind it) are cut along his
back line and swung down and back up about their roots (the near wing at the shoulder, the far one behind
the neck), the swing easing in over the first px from the root so they bend there instead of shearing
off; the tips lag (they flex up on the way down and down on the way up) and the wings look a little
shorter at the bottom of the beat, where they come toward us. Swung pieces are sampled through a
Scale2x x3 (8x) copy (RotSprite style), so his feather lines stay crisp and in his colours. The body
rises up to 2 px with each downstroke, his tail sways in a wave from the root, his ribbon of chakra
ripples, his light streak flows, and his specks drift back and fade in and out in turn. Frame 0 stays
his picture pixel for pixel. No frame flashes: the light of every frame (alpha x luma summed) and the
mean luma of what it covers are checked against its neighbours, and the build fails on a jump.

Writes a TypeScript data module (palette + run-length rows) that tools/world-sprites/vfx-beast-griffin.ts
decodes, so the build needs no image files. Deterministic (no randomness; numpy and PIL only).
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

# --- his sheet: where things are (his pixels) ------------------------------------------------------------

PANEL = (117, 40, 242, 136)  # the BEAST panel's inside (x0, y0, x1, y1), past its border lines
ANCHOR = (191.0, 100.0)  # the middle of his griffin's torso (between the haunch and the chest, back and belly)
# His near wing's shoulder (it swings about it).
SHOULDER = (191.0, 84.0)
FAR_ROOT = (205.0, 80.0)  # where his far wing rises from behind the neck
# His back line (left to right): above it are the wings; below it the body and the tail.
BACK = [(110, 85), (140, 85), (150, 87), (160, 89), (170, 90), (180, 89), (188, 87), (195, 85), (200, 83), (206, 80), (212, 76), (250, 76)]
# The far wing (behind the body): above his near wing's gold trim and left of the head.
FAR = [(157, 30), (205, 30), (213, 59), (212, 66), (207, 74), (204, 80), (201, 83), (198, 76), (194, 70), (190, 66),
       (184, 62), (178, 59), (172, 56), (166, 53), (160, 50), (157, 46)]
HEAD_X = 203  # right of this (above the back line) it is his neck and head, not a wing
# His tail, from the rump to the tuft.
TAIL = [(110, 84), (163, 84), (167, 90), (168, 97), (161, 105), (110, 108)]
TAIL_ROOT = (166.0, 93.0)
# His ribbon of chakra under the talons (its right end is where it leaves the near talons).
WISP = [(182, 116), (200, 119), (211, 123), (221, 124), (232, 125), (232, 138), (182, 138)]
WISP_ROOT_X = 228.0
# His light streak kicking off the hind foot (bottom left), and the foot it starts from.
STREAK = [(110, 103), (140, 103), (166, 120), (176, 128), (178, 138), (110, 138)]
STREAK_DIR = (-0.78, -0.62)  # along it, from the foot up and back
# His crest: three tall spikes (cream, cyan, pale) with dark gaps between them. The near-black JPEG ringing
# round them is not griffin, so the gaps stay open, and the spikes keep his colours to the tip (no outline).
CREST = [(211, 60), (231, 60), (231, 72), (211, 72)]
# Where his two wings rise from the body: the patch above his back line between the near wing's shoulder and
# the far wing's root behind the neck. The body keeps his pixels here as well (an underlay under the near
# wing, over the far one), so a swung wing never uncovers a hole there: the wing roots stay where he painted
# them, the way a real wing's root does.
ROOT_ZONE = [(187, 88), (188, 79), (194, 73), (201, 68), (209, 66), (214, 72), (213, 77), (206, 81), (199, 85), (192, 88)]
# A tear check: no frame may open a see-through gap here (over the back, round the wing roots and the neck)
# that his picture does not have.
UPPER = [(160, 92), (170, 72), (190, 62), (212, 56), (220, 76), (214, 86), (200, 92)]

# Our character against his, measured on his two wall panels (the plain ones): that sets the scale.
CHAR_BOXES = [(285, 408, 338, 522), (128, 805, 190, 925)]


def measure_char(box):
    x0, y0, x1, y1 = box
    c = ref[y0:y1, x0:x1]
    bg = np.median(c[:3].reshape(-1, 3), 0)
    # (45: his hair is a dark navy only a little lighter than the panel.)
    m = np.abs(c - bg).sum(2) > 45
    rows = [y for y in range(m.shape[0]) if m[y].sum() >= 2]
    return int(max(rows) - min(rows) + 1)


HIS_CHAR = [measure_char(b) for b in CHAR_BOXES]
S = CHAR_H / float(np.mean(HIS_CHAR))
print('his character', HIS_CHAR, 'px tall; ours', CHAR_H, '-> scale', round(S, 4))

# --- helpers ---------------------------------------------------------------------------------------------


def components(mask):
    H, W = mask.shape
    lab = -np.ones((H, W), np.int32)
    out = []
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
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
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


def poly_mask(pts, shape, off):
    img = Image.new('L', (shape[1], shape[0]), 0)
    ImageDraw.Draw(img).polygon([(x - off[0], y - off[1]) for x, y in pts], fill=1, outline=1)
    return np.asarray(img).astype(bool)


def below_line(line, shape, off):
    """Pixels under a left-to-right polyline (his coordinates)."""
    H, W = shape
    xs = np.arange(W) + off[0]
    yl = np.interp(xs, [p[0] for p in line], [p[1] for p in line]) - off[1]
    return np.arange(H)[:, None] >= yl[None, :]


def shrink(rgb, cov, s, out_size, out_anchor, anchor):
    """Area-averages coverage `cov` and the colour under it onto the output grid, anchors aligned."""
    H, W = cov.shape
    ow, oh = out_size
    ax, ay = anchor
    oax, oay = out_anchor
    x0 = ax - oax / s
    y0 = ay - oay / s
    pad = int(max(ow, oh) / s) + 4

    def big(a):
        z = np.zeros((H + 2 * pad, W + 2 * pad), np.float32)
        z[pad:pad + H, pad:pad + W] = a
        return Image.fromarray(z, 'F')
    box = (x0 + pad, y0 + pad, x0 + pad + ow / s, y0 + pad + oh / s)
    A = np.asarray(big(cov).resize((ow, oh), Image.BOX, box=box))
    ch = np.stack([np.asarray(big(rgb[..., c] * cov).resize((ow, oh), Image.BOX, box=box)) for c in range(3)], -1)
    col = np.where(A[..., None] > 1e-4, ch / np.maximum(A[..., None], 1e-4), 0)
    return A, col


def median_palette(pixels, n):
    img = Image.fromarray(pixels.astype(np.uint8).reshape(1, -1, 3), 'RGB')
    q = img.quantize(colors=n, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    return np.array(q.getpalette()[:n * 3], np.float32).reshape(-1, 3)


def snap_idx(col, pal):
    d = (((col @ OPP.T)[..., None, :] - (pal @ OPP.T)[None, None]) ** 2).sum(-1)
    return np.argmin(d, -1)


# --- 1. his panel, cut out ------------------------------------------------------------------------------

X0, Y0, X1, Y1 = PANEL
OFF = (X0, Y0)
crop = ref[Y0:Y1, X0:X1].copy()
H, W = crop.shape[:2]
ring = np.concatenate([crop[:3, 20:-20].reshape(-1, 3), crop[-3:, 70:-30].reshape(-1, 3), crop[4:-4, -3:].reshape(-1, 3)])
BG = np.median(ring, 0)
diff = np.abs(crop - BG).sum(2)
r, g, b = crop[..., 0], crop[..., 1], crop[..., 2]
lum = crop @ LUMA
print('panel background', BG.astype(int).tolist())

streak_zone = poly_mask(STREAK, (H, W), OFF)
blue = (b > r + 30)
# The griffin: the big shape that differs from the panel (his light streak is not part of it: it is grey
# and cream, the hind leg standing on it is blue).
solid = (diff > 60) & ~(streak_zone & ~blue)
comps = sorted(components(solid), key=len, reverse=True)
body_all = np.zeros((H, W), bool)
body_all[comps[0][:, 0], comps[0][:, 1]] = True
# His specks: small cream-white or cyan blobs standing on the panel (also the ones touching a wing tip,
# whose surroundings are mostly panel).
cream = (diff > 45) & ((b - r) < 30) & (lum > 70)
specks = np.zeros((H, W), bool)
for p in components(cream & ~streak_zone):
    if len(p) > 40:
        continue
    m = np.zeros((H, W), bool)
    m[p[:, 0], p[:, 1]] = True
    around = dilate(m, 2) & ~m
    if (diff[around] < 60).mean() >= 0.5:
        specks |= dilate(m, 1) & (diff > 25) & ~(body_all & ~dilate(m, 1))
for p in comps[1:]:
    ys, xs = p[:, 0], p[:, 1]
    if streak_zone[ys, xs].mean() > 0.5:
        continue
    m = np.zeros((H, W), bool)
    m[ys, xs] = True
    specks |= dilate(m, 1) & (diff > 25)
body_all &= ~specks
# Holes inside the griffin that differ from the panel (dark seams, the open mouth) are his.
outside = np.zeros((H, W), bool)
q = deque()
for y in range(H):
    for x in (0, W - 1):
        if not body_all[y, x]:
            outside[y, x] = True
            q.append((y, x))
for x in range(W):
    for y in (0, H - 1):
        if not body_all[y, x] and not outside[y, x]:
            outside[y, x] = True
            q.append((y, x))
while q:
    y, x = q.popleft()
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        ny, nx = y + dy, x + dx
        if 0 <= ny < H and 0 <= nx < W and not body_all[ny, nx] and not outside[ny, nx]:
            outside[ny, nx] = True
            q.append((ny, nx))
body_all |= ~outside & ~specks & (diff > 20)
# His crest's gaps: the near-black ringing between the spikes is the JPEG's, not his, so it is not griffin.
crest_zone = poly_mask(CREST, (H, W), OFF)
body_all &= ~(crest_zone & (lum < 45))
# The griffin's soft edge: the 1 px ring of his rim colour just outside (the box filter weighs it in; not
# between the crest's spikes).
edge_soft = dilate(body_all, 1) & ~body_all & (diff > 40) & ~specks & ~streak_zone & ~crest_zone
cov_beast = body_all.astype(np.float32) + 0.5 * edge_soft

# Light streak and specks, un-mixed from the panel: alpha toward one of his glow colours.
GLOWS = np.array([[238, 232, 210], [250, 250, 244], [200, 240, 255], [130, 215, 245], [92, 150, 225]], np.float32)


def unmix(mask):
    d = crop - BG
    best_a = np.zeros((H, W), np.float32)
    best_c = np.zeros((H, W, 3), np.float32)
    best_e = np.full((H, W), 1e9, np.float32)
    for E in GLOWS:
        v = E - BG
        a = np.clip((d * v).sum(2) / (v * v).sum(), 0, 1)
        err = np.abs(d - a[..., None] * v).sum(2)
        better = err < best_e
        best_e = np.where(better, err, best_e)
        best_a = np.where(better, a, best_a)
        best_c = np.where(better[..., None], E, best_c)
    # Where the un-mix does not fit (a saturated colour), keep the pixel's own colour at its own strength.
    a2 = np.clip(diff / 300.0, 0, 1)
    c2 = BG + (crop - BG) / np.maximum(a2[..., None], 1e-3)
    bad = best_e > 60
    # (Pixels darker than the panel round his specks are the JPEG's ringing, not light: they are dropped.)
    alpha = np.where(bad, a2, best_a) * mask * (lum > (BG @ LUMA) + 4)
    col = np.clip(np.where(bad[..., None], c2, best_c), 0, 255)
    return alpha.astype(np.float32), col.astype(np.float32)


streak = streak_zone & ~body_all & ~specks & (diff > 14)
streak_a, streak_c = unmix(streak)
speck_a, speck_c = unmix(specks)

# --- 2. the pieces ---------------------------------------------------------------------------------------

under_back = below_line(BACK, (H, W), OFF)
far = poly_mask(FAR, (H, W), OFF) & ~under_back
xx_s = np.arange(W)[None, :] + X0
near = ~under_back & ~far & (xx_s < HEAD_X)
tail = poly_mask(TAIL, (H, W), OFF) & under_back
wisp = poly_mask(WISP, (H, W), OFF) & ~((r > b + 10) & (crop[..., 1] > 90))  # (not his gold claws)
PIECES = ['body', 'far', 'near', 'tail', 'wisp']
piece_src = {'far': far, 'near': near, 'tail': tail & ~near & ~far, 'wisp': wisp}
piece_src['body'] = ~(piece_src['far'] | piece_src['near'] | piece_src['tail'] | piece_src['wisp'])

# --- 3. game scale ---------------------------------------------------------------------------------------

M = 10
OAX = int(np.ceil((ANCHOR[0] - X0) * S)) + M
OAY = int(np.ceil((ANCHOR[1] - Y0) * S)) + M
OW = OAX + int(np.ceil((X1 - ANCHOR[0]) * S)) + M
OH = OAY + int(np.ceil((Y1 - ANCHOR[1]) * S)) + M + 6
SIZE, OANCHOR = (OW, OH), (OAX, OAY)
SRC_ANCHOR = (ANCHOR[0] - X0, ANCHOR[1] - Y0)


def to_game(pt):
    return (OAX + (pt[0] - ANCHOR[0]) * S, OAY + (pt[1] - ANCHOR[1]) * S)


def game_poly(pts):
    """A polygon given in his sheet's pixels, as a mask on the game grid."""
    return poly_mask([to_game((x + 0.5, y + 0.5)) for x, y in pts], (OH, OW), (0.5, 0.5))


def game_below(line):
    """Game pixels under a left-to-right polyline given in his sheet's pixels."""
    g = [to_game(p) for p in line]
    yl = np.interp(np.arange(OW) + 0.5, [p[0] for p in g], [p[1] for p in g])
    return (np.arange(OH)[:, None] + 0.5) >= yl[None, :]


CREST_G = game_poly(CREST)
ROOT_G = game_poly(ROOT_ZONE)
UPPER_G = game_poly(UPPER)

A, C = shrink(crop, cov_beast, S, SIZE, OANCHOR, SRC_ANCHOR)
op = A >= 0.5
# Pinholes filled (not his crest's gaps), specks dropped.
nb = sum(np.roll(np.roll(op, oy, 0), ox, 1).astype(int) for oy, ox in ((1, 0), (-1, 0), (0, 1), (0, -1)))
op = (op & (nb >= 1)) | (~op & (nb >= 3) & ~CREST_G)
for p in components(op):
    if len(p) < 4:
        op[p[:, 0], p[:, 1]] = False
label = np.zeros((OH, OW), np.int32)
best = np.full((OH, OW), -1.0, np.float32)
for i, name in enumerate(PIECES):
    Ap, _ = shrink(crop, cov_beast * piece_src[name], S, SIZE, OANCHOR, SRC_ANCHOR)
    better = Ap > best
    label = np.where(better, i, label)
    best = np.where(better, Ap, best)
label = np.where(op, label, -1)
# Pinholes the cleaning filled carry no piece of their own: they take the piece most of their neighbours have.
for _ in range(3):
    lonely = op & (best < 0.05)
    if not lonely.any():
        break
    votes = np.zeros((len(PIECES), OH, OW), np.int32)
    for oy, ox in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        nl = np.roll(np.roll(np.where(lonely, -1, label), oy, 0), ox, 1)
        for i in range(len(PIECES)):
            votes[i] += nl == i
    has = votes.max(0) > 0
    fix = lonely & has
    label = np.where(fix, votes.argmax(0), label)
    best = np.where(fix, 1.0, best)

# His palette: the griffin's blues, indigos and golds, clustered from his colours at the game scale (the gold
# and the indigo apart, so his few gold and indigo pixels keep their own colours). Colours are matched in an
# opponent space with the chroma weighted up, so a snapped pixel keeps his hue and saturation (plain RGB
# distance greys his vivid cyans and indigos).
OPP = np.array([[0.30, 0.55, 0.15], [-0.17, -0.33, 0.50], [0.50, -0.42, -0.08]], np.float32) * np.array([[1.0], [1.7], [1.7]], np.float32)


def kmeans_palette(px, n, iters=20):
    """Median cut, then Lloyd steps in the weighted opponent space (deterministic)."""
    pal = median_palette(px, n)
    v = px @ OPP.T
    for _ in range(iters):
        cv = pal @ OPP.T
        lab_ = np.argmin(((v[:, None, :] - cv[None]) ** 2).sum(-1), 1)
        used = np.zeros(len(pal), bool)
        for j in range(len(pal)):
            sel = lab_ == j
            if sel.any():
                pal[j] = px[sel].mean(0)
                used[j] = True
        pal = pal[used]  # (a cluster nothing falls in, e.g. the median cut's padding, is dropped)
    return pal


gp = C[op]
is_gold = (gp[:, 0] > gp[:, 2] + 8) & (gp[:, 0] > 70)
# (His deep indigo under the belly, the far legs and the far wing is a small group of its own, so the
# cyans do not swallow it.)
is_indigo = ~is_gold & (gp[:, 2] > gp[:, 1] + 45) & (gp[:, 1] < 90)
# (And his open mouth: a dark red throat and a dusty pink tongue and lower beak, a few pixels of their own.)
is_red = (gp[:, 0] - gp[:, 1] > 18) & (gp[:, 0] > 30) & (np.abs(gp[:, 1] - gp[:, 2]) < 25)
is_gold &= ~is_red
# (And the pale yellow-green of his glyphs on the haunch and the wing: greener than his cyans.)
is_glyph = ~is_gold & ~is_red & (gp[:, 1] > gp[:, 2] + 8) & (gp[:, 1] > gp[:, 0] + 18) & ((gp @ LUMA) > 120)
rest = ~is_gold & ~is_indigo & ~is_red & ~is_glyph
PAL = np.concatenate([kmeans_palette(gp[rest], 34), kmeans_palette(gp[is_indigo], 8), kmeans_palette(gp[is_gold], 8),
                      kmeans_palette(gp[is_red], 4), kmeans_palette(gp[is_glyph], 3)])
PAL = np.unique(np.round(PAL), axis=0)
# (No near-black: his blackest pixels are JPEG ringing in the gaps of the talons and the crest; they take
# the nearest of his real darks, the deep blue rim or the maroon of his throat.)
PAL = PAL[(PAL @ LUMA) >= 18]
# His outline: the deep blue of his rim (the darkest quarter of the blue pixels on the griffin's edge),
# and a dark gold for the gold parts' edge.
rim = body_all & dilate(~body_all, 1)
rim_px = crop[rim & blue]
rim_px = rim_px[(rim_px @ LUMA) <= np.percentile(rim_px @ LUMA, 25)]
OUTLINE = np.round(np.median(rim_px, 0))
gold_px = crop[body_all & (r > b + 30) & (g > 80)]
OUTLINE_GOLD = np.round(np.percentile(gold_px, 8, axis=0) * 0.62)
print("palette", len(PAL), "outline", OUTLINE.astype(int).tolist(), 'gold outline', OUTLINE_GOLD.astype(int).tolist())
idx0 = snap_idx(C, PAL) + 1  # 0 = clear
idx0 = np.where(op, idx0, 0)
snap_err = np.abs(C[op] - PAL[idx0[op] - 1]).sum(1).mean()
sat_his = (C[op].max(-1) - C[op].min(-1)).mean()
sat_ours = (PAL[idx0[op] - 1].max(-1) - PAL[idx0[op] - 1].min(-1)).mean()
print(f'snap error {snap_err:.1f} (r+g+b); saturation his {sat_his:.1f}, ours {sat_ours:.1f}')

# Streak and specks at the game scale: alpha levels and his glow colours.
ALEVELS = [(0.68, 255), (0.40, 170), (0.16, 95)]  # his specks
# His streak is one soft cone of light: 7 alpha steps, down to his faint outer glow.
ALEVELS_STREAK = [(0.78, 255), (0.60, 215), (0.45, 178), (0.33, 142), (0.23, 108), (0.145, 78), (0.08, 50)]


def soft_layer(alpha, col):
    Aa, _ = shrink(crop, alpha, S, SIZE, OANCHOR, SRC_ANCHOR)
    _, Cc = shrink(col, np.maximum(alpha, 1e-6), S, SIZE, OANCHOR, SRC_ANCHOR)
    return Aa, Cc


SA, SC = soft_layer(streak_a, streak_c)
PA, PC = soft_layer(speck_a, speck_c)


def fill_along(a, c, d, n=2):
    """Closes gaps of a pixel or so along direction d (his streak's rays): a pixel between two lit ones on a
    line along d takes the weaker of their light (a little less), and their colour."""
    for _ in range(n):
        f = np.zeros_like(a)
        fc = np.zeros_like(c)
        for step in (1.0, 1.5):
            ax_, ay_ = d[0] * step, d[1] * step
            p = bilinear(a, XXs + 0.5 + ax_, YYs + 0.5 + ay_)
            m = bilinear(a, XXs + 0.5 - ax_, YYs + 0.5 - ay_)
            v = np.minimum(p, m) * 0.85
            better = v > f
            f = np.where(better, v, f)
            fc = np.where(better[..., None], (bilinear(c, XXs + 0.5 + ax_, YYs + 0.5 + ay_) + bilinear(c, XXs + 0.5 - ax_, YYs + 0.5 - ay_)) / 2, fc)
        grow = f > a
        a = np.where(grow, f, a)
        c = np.where(grow[..., None], fc, c)
    return a, c


def bilinear(a, sx, sy):
    h, w = a.shape[:2]
    x = np.clip(sx - 0.5, 0, w - 1.001)
    y = np.clip(sy - 0.5, 0, h - 1.001)
    x0 = np.floor(x).astype(int)
    y0 = np.floor(y).astype(int)
    fx, fy = x - x0, y - y0
    if a.ndim == 3:
        fx, fy = fx[..., None], fy[..., None]
    top = a[y0, x0] * (1 - fx) + a[y0, x0 + 1] * fx
    bot = a[y0 + 1, x0] * (1 - fx) + a[y0 + 1, x0 + 1] * fx
    return top * (1 - fy) + bot * fy


YYs, XXs = np.mgrid[0:OH, 0:OW].astype(np.float32)
# His streak stays one continuous cone: the breaks along its rays (the box filter's and the JPEG's) are closed.
SA, SC = fill_along(SA, SC, STREAK_DIR)
# (Each has its own few colours: his streak runs from slate blue to cream, his specks are cream and cyan.)
SPAL_STREAK = np.unique(np.round(kmeans_palette(SC[SA > 0.08], 6)), axis=0)
SPAL_SPECK = np.unique(np.round(kmeans_palette(PC[PA > 0.16], 4)), axis=0)
print("streak colours", SPAL_STREAK.astype(int).tolist(), "speck colours", SPAL_SPECK.astype(int).tolist())

# --- 4. the key frame and the moves ----------------------------------------------------------------------

YY, XX = np.mgrid[0:OH, 0:OW].astype(np.float32)


def scale2x(m):
    """One Scale2x (EPX) step on an index map."""
    P = np.pad(m, 1, mode='edge')
    B, D, E, F, Hh = P[:-2, 1:-1], P[1:-1, :-2], P[1:-1, 1:-1], P[1:-1, 2:], P[2:, 1:-1]
    e0 = np.where((D == B) & (B != F) & (D != Hh), D, E)
    e1 = np.where((B == F) & (B != D) & (F != Hh), F, E)
    e2 = np.where((D == Hh) & (D != B) & (Hh != F), D, E)
    e3 = np.where((Hh == F) & (D != Hh) & (B != F), F, E)
    out = np.empty((m.shape[0] * 2, m.shape[1] * 2), m.dtype)
    out[0::2, 0::2] = e0
    out[0::2, 1::2] = e1
    out[1::2, 0::2] = e2
    out[1::2, 1::2] = e3
    return out


def up8(m):
    return scale2x(scale2x(scale2x(m)))


def sample(m, m8, sx, sy):
    """Index map m sampled at (sx, sy) (game px, centres at +0.5): nearest through its 8x Scale2x copy;
    where the move is under half a pixel, the pixel itself (so still parts never shimmer)."""
    h, w = m.shape
    still = (np.abs(sx - (XX + 0.5)) < 0.5) & (np.abs(sy - (YY + 0.5)) < 0.5)
    ix = np.floor(sx * 8).astype(int)
    iy = np.floor(sy * 8).astype(int)
    ok = (ix >= 0) & (iy >= 0) & (ix < w * 8) & (iy < h * 8)
    v = np.where(ok, m8[np.clip(iy, 0, h * 8 - 1), np.clip(ix, 0, w * 8 - 1)], 0)
    nx = np.clip(np.floor(sx).astype(int), 0, w - 1)
    ny = np.clip(np.floor(sy).astype(int), 0, h - 1)
    return np.where(still, m[ny, nx], v)


layers = {}
for i, name in enumerate(PIECES):
    m = np.where(label == i, idx0, 0)
    if name == 'body':
        # The underlay: his own pixels at the wing roots (whatever piece they are) stay on the body too, under
        # the near wing and over the far one. In his picture the wings cover them, so frame 0 is unchanged;
        # in the beat they keep the roots in place instead of opening a see-through slit behind the neck.
        m = np.where(ROOT_G & (idx0 > 0) & (label >= 0), idx0, m)
    layers[name] = (m, up8(m))

N = 8
T = np.arange(N) / N
# The beat (one slow wing beat per loop). Each wing turns about its own root; the swing eases in over `ease`
# game px from it (so the wing bends there instead of shearing off the body), and the tips lag a little
# behind (`flex`: up on the way down, down on the way up), most at mid-stroke and not at all near the top,
# so frames 7, 0 and 1 stay close to his raised wings. Down the beat follows a cosine, so no step between
# neighbouring frames is much bigger than the others. His far wing (behind) swings a little further and
# shortens more, so it sinks behind the body at the bottom of the beat instead of lying flat over the back.
WINGS = {
    'near': {'root': SHOULDER, 'swing': 45.0, 'flex': 7.0, 'ease': 9.0, 'short': 0.10},
    'far': {'root': FAR_ROOT, 'swing': 56.0, 'flex': 7.0, 'ease': 8.0, 'short': 0.30},
}
if os.environ.get('GRIFFIN_WINGS'):  # TEMP-DRAFT
    _v = [float(v) for v in os.environ['GRIFFIN_WINGS'].split(',')]  # TEMP-DRAFT
    WINGS['near'].update(swing=_v[0], flex=_v[1], short=_v[2]); WINGS['far'].update(swing=_v[3], flex=_v[4], short=_v[5])  # TEMP-DRAFT
BOB = 2.0      # game px the body rises at the bottom of the beat
tr = to_game(TAIL_ROOT)
wr_x = to_game((WISP_ROOT_X, 0))[0]
for w in WINGS.values():
    w['g'] = to_game(w['root'])
    w['dist'] = np.hypot(XX + 0.5 - w['g'][0], YY + 0.5 - w['g'][1])
    e = np.clip(w['dist'] / w['ease'], 0, 1)
    w['easef'] = e * e * (3 - 2 * e)
    w['tipw'] = np.clip((w['dist'] - w['ease']) / 50.0, 0, 1)


DOWN_MIX = 0.0  # 0: a cosine beat; 1: an even (triangle) beat


def down(t):
    """How far down the beat is at phase t: 0 at his raised wings (frame 0), 1 at the bottom (frame 4)."""
    tri = 1 - np.abs(1 - 2 * (np.asarray(t) % 1.0))
    return (1 - DOWN_MIX) * (1 - np.cos(2 * np.pi * t)) / 2 + DOWN_MIX * tri


if os.environ.get('GRIFFIN_MIX'):  # TEMP-DRAFT
    DOWN_MIX, BOB = [float(v) for v in os.environ['GRIFFIN_MIX'].split(',')]  # TEMP-DRAFT


def lag(t):
    """The tips' lag at phase t, -1..1: + on the way down (the tips trail up), - on the way up; ~0 near the top."""
    return np.sin(2 * np.pi * t) * down(t) / 0.6495


def beat(t):
    """The near wing's swing at its root at phase t (screen degrees; negative swings it down and back)."""
    return -WINGS['near']['swing'] * down(t)


def wing_field(name, t):
    """Inverse map for a wing at phase t: its turn about its root, eased in from the root, tips lagging."""
    w = WINGS[name]
    dn = down(t)
    theta = -w['swing'] * dn
    a = np.deg2rad(w['easef'] * (theta + w['flex'] * w['tipw'] * lag(t)))
    px, py = w['g']
    rx, ry = XX + 0.5 - px, YY + 0.5 - py
    # Swung down toward us, the wing looks shorter: it is drawn up to `short` shorter along its length at
    # the bottom of the beat (not at its root). Rotation about the root keeps the distance to it, so the
    # inverse is the opposite turn and the opposite stretch.
    k = 1.0 + w['short'] * dn * w['easef']
    rx, ry = rx * k, ry * k
    sx = px + rx * np.cos(a) + ry * np.sin(a)
    sy = py - rx * np.sin(a) + ry * np.cos(a)
    return sx, sy


def tail_field(t):
    d = np.clip(tr[0] - (XX + 0.5), 0, None)
    w = np.clip(d / 40.0, 0, 1) ** 1.4
    ph = d / 9.0
    dy = 2.2 * w * (np.sin(2 * np.pi * t - ph) - np.sin(-ph))
    return XX + 0.5, YY + 0.5 - dy


def wisp_field(t):
    d = np.clip(wr_x - (XX + 0.5), 0, None)
    w = np.clip(d / 22.0, 0, 1)
    ph = d / 7.0
    dy = 1.6 * w * (np.sin(2 * np.pi * t - ph) - np.sin(-ph))
    return XX + 0.5, YY + 0.5 - dy


def streak_field(t):
    # His light flows along the streak (a travelling ripple along it), more at its far end.
    ux, uy = STREAK_DIR
    fx, fy = to_game((STREAK[3][0] - 6, STREAK[3][1] + 2))
    s = (XX + 0.5 - fx) * ux + (YY + 0.5 - fy) * uy
    w = np.clip(s / 30.0, 0, 1)
    ph = s / 6.0
    u = 1.4 * w * (np.sin(2 * np.pi * t - ph) - np.sin(-ph))
    return XX + 0.5 - u * ux, YY + 0.5 - u * uy


# His specks: each drifts back (left, the way the griffin leaves them) and fades out, then comes back in
# where it started a loop earlier; at frame 0 every speck is where he painted it, at full strength.
speck_lab = np.zeros((OH, OW), np.int32) - 1
sp_mask = PA > 0.16
for i, p in enumerate(components(sp_mask)):
    speck_lab[p[:, 0], p[:, 1]] = i
N_SPECKS = int(speck_lab.max()) + 1
GOLDEN = 0.6180339887
PHASE = np.array([0.32 + 0.36 * ((i * GOLDEN) % 1.0) for i in range(N_SPECKS)])
DRIFT = 9.0  # game px a speck drifts back over its life (one loop)


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def specks_at(t):
    a_out = np.zeros((OH, OW), np.float32)
    c_out = np.zeros((OH, OW, 3), np.float32)
    for i in range(N_SPECKS):
        m = speck_lab == i
        u = (t + PHASE[i]) % 1.0
        fade = smooth(0.0, 0.2, u) * smooth(1.0, 0.8, u)
        dx = -DRIFT * (u - PHASE[i])
        dxi = int(np.round(dx))
        a = np.where(m, PA, 0) * fade
        a = np.roll(a, dxi, 1)
        c = np.roll(np.where(m[..., None], PC, 0), dxi, 1)
        take = a > a_out
        a_out = np.where(take, a, a_out)
        c_out = np.where(take[..., None], c, c_out)
    return a_out, c_out


def quant_alpha(a, levels=ALEVELS):
    out = np.zeros(a.shape, np.uint8)
    for th, v in reversed(levels):
        out[a > th] = v
    return out


def shift_rows(a, n):
    """a moved n px down (up when n < 0), clear where it comes from outside."""
    if n == 0:
        return a
    out = np.zeros_like(a)
    if n > 0:
        out[n:] = a[:-n]
    else:
        out[:n] = a[-n:]
    return out


N4 = ((1, 0), (-1, 0), (0, 1), (0, -1))
N8 = N4 + ((1, 1), (1, -1), (-1, 1), (-1, -1))


def count_nb(m, offs=N4):
    return sum(np.roll(np.roll(m, oy, 0), ox, 1).astype(int) for oy, ox in offs)


def edge_of(m):
    """The 1 px inner edge of a mask (4-neighbourhood)."""
    e = np.zeros_like(m)
    for oy, ox in N4:
        e |= m & ~np.roll(np.roll(m, oy, 0), ox, 1)
    return e


def frame(k):
    t = T[k]
    bob = -int(np.ceil(BOB * round(float(down(t)), 6) - 0.5))  # (rounded half down, the same both ways of the beat)
    ids = np.zeros((OH, OW), np.int64)
    if k == 0:
        fields = {n: (XX + 0.5, YY + 0.5) for n in PIECES}
        theta = 0.0
    else:
        theta = beat(t)
        fields = {'body': (XX + 0.5, YY + 0.5), 'far': wing_field('far', t), 'near': wing_field('near', t),
                  'tail': tail_field(t), 'wisp': wisp_field(t)}
    got = {}
    for n in PIECES:
        m, m8 = layers[n]
        sx, sy = fields[n]
        got[n] = shift_rows(sample(m, m8, sx, sy), bob)  # (the whole griffin moves bob px)
    # Back to front: the far wing, the tail, the body, the ribbon, the near wing.
    for n in ('far', 'tail', 'body', 'wisp', 'near'):
        ids = np.where(got[n] > 0, got[n], ids)
    opq = ids > 0
    body = got['body'] > 0
    if k:
        # Slivers a swung piece leaves (a pixel or three cut off at the edge of a feather) are dropped, and so
        # are the 1-2 px spikes a turn leaves sticking out of the silhouette (each would show for one frame).
        for p in components(opq):
            if len(p) < 6 and not body[p[:, 0], p[:, 1]].any():
                opq[p[:, 0], p[:, 1]] = False
        for _ in range(3):
            drop = opq & (count_nb(opq) <= 1) & ~body
            if not drop.any():
                break
            opq &= ~drop
    ids = np.where(opq, ids, 0)
    colr = PAL[np.clip(ids - 1, 0, len(PAL) - 1)]
    gold = opq & (colr[..., 0] > colr[..., 2] + 8) & (colr[..., 0] > 80)
    # His edge: a 1 px outline on the silhouette, deep blue (dark gold on and next to his gold).
    edge = edge_of(opq)
    # A swung near wing keeps its own edge where it now lies over the body (not at its root, and not where
    # it lay in his picture, so frame 0 has none).
    nw = got['near'] > 0
    nedge = edge_of(nw) & opq & ~edge & (WINGS['near']['dist'] > WINGS['near']['ease'] + 3) & ~(layers['near'][0] > 0) if k else np.zeros_like(nw)
    out = np.zeros((OH, OW, 4), np.uint8)
    # Soft layers first (under the griffin): his streak (it moves with the body) and his specks.
    ssx, ssy = streak_field(t) if k else (XX + 0.5, YY + 0.5)
    sa = shift_rows(bilinear(SA, ssx, ssy), bob)
    sc = shift_rows(bilinear(SC, ssx, ssy), bob)
    pa, pc = specks_at(t)
    q_streak = quant_alpha(sa, ALEVELS_STREAK)
    for qa, c, spal in ((q_streak, sc, SPAL_STREAK), (quant_alpha(pa, ALEVELS), pc, SPAL_SPECK)):
        put = qa > out[..., 3]
        out[put, :3] = spal[snap_idx(c, spal)][put].astype(np.uint8)
        out[put, 3] = qa[put]
    out[opq, :3] = colr[opq].astype(np.uint8)
    out[opq, 3] = 255
    ring = edge | nedge
    gring = ring & (gold | (count_nb(gold, N8) >= 2))
    # His crest's spikes keep his colours to the tip (they are light on any ground), and where the hind foot
    # stands in his light streak its edge melts into the light, as he painted it (no dark ring there).
    crest = shift_rows(CREST_G, bob) & ((colr @ LUMA) > 90)
    lit = (q_streak >= 108) & ~opq
    foot = body & (count_nb(lit, N8) > 0) & ~(count_nb(~opq & ~lit, N4) > 0)
    # A swung near wing's gold trim that comes to lie on the silhouette keeps its cream gold, with the dark
    # gold edge just outside it (so it reads as his band, not as a brown dotted line).
    trim = (edge & gold & nw) if k else np.zeros_like(nw)
    beyond = np.zeros_like(trim)
    for oy, ox in N4:
        beyond |= np.roll(np.roll(trim, oy, 0), ox, 1)
    beyond &= ~opq
    line = ring & ~crest & ~foot & ~trim
    out[line & ~gring, :3] = OUTLINE.astype(np.uint8)
    out[line & gring, :3] = OUTLINE_GOLD.astype(np.uint8)
    out[beyond, :3] = OUTLINE_GOLD.astype(np.uint8)
    out[beyond, 3] = 255
    return out, theta, bob, opq | beyond


frames, thetas, bobs, solids = [], [], [], []
for k in range(N):
    f, th, bb, so = frame(k)
    frames.append(f)
    thetas.append(th)
    bobs.append(bb)
    solids.append(so)

# --- 5. checks -------------------------------------------------------------------------------------------


def light(f):
    """The light of a frame: alpha x luma summed over it, and the mean luma of what it covers."""
    a = f[..., 3].astype(np.float32) / 255
    l = (f[..., :3].astype(np.float32) @ LUMA) / 255
    return float((a * l).sum()), float((a * l).sum() / max(a.sum(), 1e-6)), int((a > 0).sum())


# No flash: the light of a frame may change by at most 18 % from its neighbour's (the wrap included; the
# wing covering the body is the only thing that changes it, and smoothly), and its mean luma by at most 6 %.
LIGHT = [light(f) for f in frames]


def enclosed(m):
    """Clear pixels a mask closes in (not 4-connected to the frame's border through clear pixels)."""
    img = Image.fromarray(np.where(m, 1, 0).astype(np.uint8), 'L').copy()  # (a copy: fromarray's image is read-only)
    ImageDraw.floodfill(img, (0, 0), 2)
    return np.asarray(img) == 0


# No tears: no frame may open a see-through gap over the back, round the wing roots and the neck (UPPER) that
# his picture does not have there. (The gaps between the talons, and between the tail, a lowered wing and the
# hind leg, are outside this zone: those are the griffin's own shapes.)
HOLES0 = enclosed(solids[0])
HOLES = []
for k in range(N):
    new_h = enclosed(solids[k]) & ~shift_rows(HOLES0, bobs[k]) & shift_rows(UPPER_G, bobs[k])
    HOLES.append(int(new_h.sum()))
# The silhouette (opaque px) changes smoothly: the part of it that differs between neighbouring frames, out of
# the two together.
SIL = []
for k in range(N):
    a_, b_ = frames[k][..., 3] == 255, frames[(k + 1) % N][..., 3] == 255
    SIL.append(float((a_ ^ b_).sum() / max((a_ | b_).sum(), 1)))
print('frame  wing deg  bob   light  mean luma  covered px  new holes  silhouette step to next')
for k in range(N):
    print(f'{k:5d}  {thetas[k]:8.1f}  {bobs[k]:3d}  {LIGHT[k][0]:6.1f}  {LIGHT[k][1]:9.3f}  {LIGHT[k][2]:10d}  {HOLES[k]:9d}  {SIL[k]:.3f}')
FAILS = []
for k in range(N):
    j = (k + 1) % N
    ratio = LIGHT[j][0] / max(LIGHT[k][0], 1e-6)
    mr = LIGHT[j][1] / max(LIGHT[k][1], 1e-6)
    if not 0.82 <= ratio <= 1.22:
        FAILS.append(f'light {k}->{j}: {ratio:.2f}x')
    if not 0.94 <= mr <= 1.06:
        FAILS.append(f'mean luma {k}->{j}: {mr:.2f}x')
    if HOLES[k]:
        FAILS.append(f'frame {k}: {HOLES[k]} px of see-through gap over the back / wing roots')
    if SIL[k] > 0.22:
        FAILS.append(f'silhouette {k}->{j}: {SIL[k]:.0%} changes')
if DEBUG:  # TEMP-DRAFT
    np.savez_compressed(os.path.join(DEBUG, 'draft.npz'), frames=np.stack(frames), solids=np.stack(solids), holes0=HOLES0, upper=UPPER_G, bobs=np.array(bobs), root=ROOT_G, crest=CREST_G)  # TEMP-DRAFT
if FAILS and not os.environ.get('GRIFFIN_DRAFT'):  # TEMP-DRAFT
    raise SystemExit('frame checks failed: ' + '; '.join(FAILS))
print('FAILS', FAILS)  # TEMP-DRAFT

# Crop every frame to their union + 2 px.
union = np.zeros((OH, OW), bool)
for f in frames:
    union |= f[..., 3] > 0
ys, xs = np.nonzero(union)
cx0, cy0, cx1, cy1 = int(xs.min()) - 2, int(ys.min()) - 2, int(xs.max()) + 3, int(ys.max()) + 3
assert cx0 >= 0 and cy0 >= 0 and cx1 <= OW and cy1 <= OH, (cx0, cy0, cx1, cy1, OW, OH)
frames = [f[cy0:cy1, cx0:cx1] for f in frames]
FW, FH = cx1 - cx0, cy1 - cy0
FANCHOR = (OAX - cx0, OAY - cy0)
for k, f in enumerate(frames):
    a = f[..., 3]
    if a[0].any() or a[-1].any() or a[:, 0].any() or a[:, -1].any():
        raise SystemExit(f'frame {k}: a pixel on the frame border')

# --- 6. the data module ----------------------------------------------------------------------------------

# The symbols (index 0 = clear). Past the ASCII ones come the Latin-1 letters, so his streak's soft glow
# can keep its 7 alpha steps (the module is written as UTF-8; each symbol is one UTF-16 unit, so the
# decoder's /(\D)(\d*)/ reads it as before).
ALPH = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+,-./:;<=>?@[]^_{|}~`"' + ''.join(
    chr(c) for c in range(0xC0, 0x100) if c not in (0xD7, 0xF7))


def write_module(anims, size, anchor, note):
    colors = {}

    def cid(px):
        key = '#%02x%02x%02x%02x' % tuple(int(v) for v in px)
        if key not in colors:
            colors[key] = len(colors) + 1
        return colors[key]
    OWm, OHm = size
    enc = {}
    for anim, fr in anims.items():
        enc[anim] = []
        for img in fr:
            rows = []
            for y in range(OHm):
                ids = [0 if img[y, x][3] == 0 else cid(img[y, x]) for x in range(OWm)]
                toks = []
                x = 0
                while x < OWm:
                    n = 1
                    while x + n < OWm and ids[x + n] == ids[x]:
                        n += 1
                    toks.append(ALPH[ids[x]] + (str(n) if n > 1 else ''))
                    x += n
                rows.append(''.join(toks))
            enc[anim].append(rows)
    if len(colors) >= len(ALPH):
        raise SystemExit(f'{len(colors)} colours: more than the alphabet holds')
    pal = ['#00000000'] + list(colors.keys())
    ts = ["// Generated by tools/refs/griffin-from-ref.py from the owner's chakra sheet. Do not edit by hand.", '//']
    ts += ['// ' + line for line in note]
    ts += ['//', f'// Each frame is {OWm}x{OHm} with the anchor at ({anchor[0]}, {anchor[1]}). Rows are run-length encoded: a symbol',
           '// (an index into PALETTE through ALPHABET, 0 = clear) followed by its repeat count when above one.', '']
    ts.append(f'export const SIZE: [number, number] = [{OWm}, {OHm}];')
    ts.append(f'export const ANCHOR: [number, number] = [{anchor[0]}, {anchor[1]}];')
    ts.append(f"export const ALPHABET = '{ALPH}';")
    ts.append('export const PALETTE: string[] = [')
    for i in range(0, len(pal), 8):
        ts.append('  ' + ', '.join(f"'{c}'" for c in pal[i:i + 8]) + ',')
    ts.append('];')
    ts.append('export const FRAMES: Record<string, string[][]> = {')
    for anim, fr in enc.items():
        ts.append(f'  {anim}: [')
        for f in fr:
            ts.append('    [')
            for row in f:
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


note = [
    "The chakra griffin (vfx_beasts/chakra), copied from the BEAST panel of his chakra sheet: his one",
    "picture (wings raised) is fly frame 0; 1-7 swing his two wings down and back up about the shoulder",
    "(eased at the root, the tips lagging), bob the body, sway his tail, ripple his ribbon of chakra,",
    "flow his light streak and drift his specks. Scale: his character is " + f"{np.mean(HIS_CHAR):.1f} px tall in that sheet, ours {CHAR_H:.0f}.",
]
write_module({'fly': frames}, (FW, FH), FANCHOR, note)

# --- 7. review material ----------------------------------------------------------------------------------

if DEBUG:
    os.makedirs(DEBUG, exist_ok=True)

    def save(img, name):
        path = os.path.join(DEBUG, name)
        img.save(path + '.part', format='PNG')
        os.replace(path + '.part', path)
    k = 6
    vis = (crop * 0.45).astype(np.uint8)
    cols = {'body': (60, 120, 255), 'far': (255, 60, 200), 'near': (60, 255, 120), 'tail': (255, 200, 40), 'wisp': (40, 255, 255)}
    for n, m in piece_src.items():
        mm = m & body_all
        vis[mm] = (crop[mm] * 0.5 + np.array(cols[n]) * 0.5).astype(np.uint8)
    vis[specks] = (255, 255, 255)
    vis[streak] = (255, 120, 40)
    save(Image.fromarray(vis).resize((W * k, H * k), Image.NEAREST), 'griffin-seg.png')
    # His picture box-filtered to the game scale (on his panel colour), cropped like ours.
    ones = np.ones((H, W), np.float32)
    Ah, his = shrink(crop, ones, S, SIZE, OANCHOR, SRC_ANCHOR)
    his = his * Ah[..., None] + BG * (1 - Ah[..., None])  # (outside his panel: his panel colour)
    his = np.clip(np.round(his), 0, 255).astype(np.uint8)[cy0:cy1, cx0:cx1]
    save(Image.fromarray(his), 'griffin-his-game.png')
    info = {'scale': S, 'his_char': HIS_CHAR, 'panel': list(PANEL), 'anchor_src': list(ANCHOR), 'shoulder_src': list(SHOULDER), 'far_root_src': list(FAR_ROOT),
            'size': [FW, FH], 'anchor': list(FANCHOR), 'light': [round(l[0], 1) for l in LIGHT], 'mean_luma': [round(l[1], 4) for l in LIGHT],
            'covered': [l[2] for l in LIGHT], 'wing_deg': [round(t, 1) for t in thetas], 'bob': [int(v) for v in bobs],
            'outline': OUTLINE.astype(int).tolist(), 'outline_gold': OUTLINE_GOLD.astype(int).tolist(), 'bg': BG.astype(int).tolist()}
    path = os.path.join(DEBUG, 'griffin-ref.json')
    with open(path + '.part', 'w') as fh:
        json.dump(info, fh, indent=1)
    os.replace(path + '.part', path)
    strip = np.zeros((FH, FW * N + 2 * (N - 1), 4), np.uint8)
    for i, f in enumerate(frames):
        strip[:, i * (FW + 2):i * (FW + 2) + FW] = f
    bgimg = Image.new('RGBA', (strip.shape[1], FH), (0x5d, 0x6b, 0x57, 255))
    bgimg.alpha_composite(Image.fromarray(strip, 'RGBA'))
    save(bgimg.resize((bgimg.width * 3, bgimg.height * 3), Image.NEAREST), 'griffin-fly.png')
print('frame', FW, 'x', FH, 'anchor', FANCHOR)
