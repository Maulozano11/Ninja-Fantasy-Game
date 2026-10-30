"""Turns the owner's chakra sheet's BEAST panel (his new griffin) into game frames for vfx_beasts/chakra.

    python3 -I griffin-from-ref.py REF-chakra-set-owner.jpg <out.ts> [debugDir]

He painted ONE pose over our old chakra fox: a winged griffin of blue chakra (eagle head and wings, lion
body, gold beak, talons and trims), wings raised, with chakra specks, a light streak kicking off the
hind foot and a ribbon of chakra under the talons. That picture IS fly frame 0:

1. Scale: his character beside the walls (two panels) is measured against ours (96 px): S = 96 / his.
2. His panel is cut out: its background, the label and the borders go. The griffin is the big shape
   that differs from the panel; the light streak and the specks are un-mixed from the dark panel into
   colour + alpha (they stay semi-transparent, the way he painted them).
3. Everything is area-averaged (box filter) to the game scale on our anchor (the middle of the torso). The
   silhouette is his (half or more of a game pixel is his griffin), snapped to a palette clustered from
   his own colours, each group apart: his blues, his indigos (his most violet ones with entries of their
   own), his golds, his glyphs' pale green, and his open mouth's dark red throat and pink tongue (the medians
   of his own mouth pixels, usable only inside his beak, so no navy pixel can turn into a brown dot). Its
   edge pixels become a 1 px outline ON his edge (not outside it): his own deep blue rim colour, his own
   indigo rim colour where the griffin just inside is his indigo (under the belly, the far legs), a mid blue
   of his palette where the griffin is bright just inside (his glowing feather tips and head), a dark gold
   round the gold beak, crest and talons. Never black. His crest's spikes, his throat and his pale grey claw
   tips keep their colours (a claw tip gets no rim; the edge beside it is dark gold, never blue).

The other seven frames are derived from that key frame, at the game scale, from his pixels (an 8-frame
beat, 10 fps): his two wings (the near one in front of the body, the far one behind it) are cut along his
back line and swung down and back up about their roots (the near wing at the shoulder, the far one high
behind the neck, at the top of its rounded gold-trimmed base, which stays put), the swing easing in over
the first px from the root so they bend there instead of shearing off. The near wing's timing is a cosine
blended toward an even pace, and its tips lag by about the same amount through each stroke (they flex up on
the way down and down on the way up; the arm near the root does not), so its tip moves at most about 25 px a
frame, down and up alike. The far wing's root follows a little less far (0, -6, -18, -36, -46 degrees and
back); its outer half flexes up (its tip turns only 1-6 degrees in frames 1-2 and 6-7), so its leading edge
always rises to his pointed tip while the tip is raised, and slopes down to it at the bottom of the beat:
never a flat plank. Both look a little shorter at the bottom of the beat, where they come toward us. Swung
pieces are sampled through a Scale2x x3 (8x) copy (RotSprite style), so his feather lines stay crisp and in
his colours. Where the turned near wing's trim was cut, its end is tidied: no knob above the wing's top edge,
no 1 px teeth or notches, his dark grey and brown trim shadow by the background or the tail turned to the
wing's own blue, a dark gold edge only beside his gold. The body rises 1 px every other frame (0, 0, -1, -1,
-2, -2, -1, -1), his tail sways in a wave from the root and its tuft lifts and drops out of the near wing's
way, his ribbon of chakra ripples, his light streak flows. His cyan wisps off the wing tips are carried
(moved, never turned) with the tip they trail from, its lag included, and fade out while it is down; his
other specks stream back as two cross-fading copies, so none blinks; a fading wisp or copy keeps all its px
(at 50 alpha at least), so it stays one soft stroke. Frame 0 stays his picture pixel for pixel (only his
claw tips keep his pale grey instead of a rim).

Checks (the build fails on any): the light of every frame (alpha x luma summed), the mean luma of what it
covers and the light outside the griffin against its neighbours (no flash); no speck changes by more than
half its light in a frame; no see-through tear over the back; no straight wing edge longer than 10 px (or
his own longest); the silhouette changes by at most 25 % a frame; the far wing turns at most 25 degrees a
frame and how much of it shows changes by at most 40 % a frame; the far wing's top edge rises at least 10
degrees to its tip while the tip is raised and falls at least 10 degrees at the bottom, and its tip is at
most 6 px wide; the near wing's tip moves at most 26 px a frame; at least 120 tail px and 75 % of the tuft
show in every frame; no blue rim on or beside a claw tip; no 1 px tooth on the near wing; no pixel on the
frame border.

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
# His far wing's pivot: high behind the neck, at the top of its rounded, gold-trimmed base. The base barely
# turns (it is within the wing's `ease` of the pivot), so it stays his rounded base behind the neck in every
# frame; only the wing beyond it swings.
FAR_ROOT = (206.0, 70.0)
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
# His beak and open mouth: the only place his mouth's dark red and pink may be used.
BEAK = [(224, 78), (242, 78), (242, 96), (224, 96)]
# His talons (both feet): his claw tips there are pale grey, and they keep that colour to the tip (no blue rim).
TALON = [(211, 98), (244, 98), (244, 131), (211, 131)]
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


def snap_idx(col, pal, forbid=None):
    """The nearest palette entry in the weighted opponent space; `forbid` (broadcast to (..., len(pal))) rules
    entries out per pixel."""
    d = (((col @ OPP.T)[..., None, :] - (pal @ OPP.T)[None, None]) ** 2).sum(-1)
    if forbid is not None:
        d = np.where(forbid, np.float32(1e12), d)
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
# His open mouth: its dark red throat opens onto the panel, so the fill above misses it; it is his.
beak_zone = poly_mask(BEAK, (H, W), OFF)
mouth_red = beak_zone & (r - g > 18) & (r > 25) & (np.abs(g - b) < 22)
body_all |= mouth_red & (diff > 15)
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


CREST_G = game_poly(CREST)
ROOT_G = game_poly(ROOT_ZONE)
UPPER_G = game_poly(UPPER)
BEAK_G = game_poly(BEAK)
TALON_G = game_poly(TALON)

A, C = shrink(crop, cov_beast, S, SIZE, OANCHOR, SRC_ANCHOR)
# His silhouette at the game scale: half or more of the pixel is his griffin (his soft rim colour only tints
# the edge pixels, it does not grow the silhouette, so our outline sits on his edge, not outside it).
A_his, _ = shrink(crop, body_all.astype(np.float32), S, SIZE, OANCHOR, SRC_ANCHOR)
op = A_his >= 0.5
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
def hue_deg(a):
    a = np.asarray(a, np.float32)
    mx, mn = a.max(-1), a.min(-1)
    d = np.maximum(mx - mn, 1e-6)
    r_, g_, b_ = a[..., 0], a[..., 1], a[..., 2]
    h = np.where(mx == r_, ((g_ - b_) / d) % 6, np.where(mx == g_, (b_ - r_) / d + 2, (r_ - g_) / d + 4))
    return h * 60.0


is_gold = (gp[:, 0] > gp[:, 2] + 8) & (gp[:, 0] > 70)
# (His deep indigo under the belly, the far legs and the far wing is a small group of its own, so the
# cyans do not swallow it; its most violet pixels (hue past 228) get two entries of their own, so his
# violet underside does not turn to plain navy.)
is_indigo = ~is_gold & (gp[:, 2] > gp[:, 1] + 45) & (gp[:, 1] < 90)
is_violet = is_indigo & (hue_deg(gp) > 228)
# (And his open mouth: a dark red throat and a dusty pink tongue and lower beak. Only inside his beak: its
# colours are taken from his own mouth pixels, not from the game-scale mix of mouth and gold beak.)
in_beak = BEAK_G[op]
is_red = in_beak & (gp[:, 0] - gp[:, 1] > 18) & (gp[:, 0] > 30) & (np.abs(gp[:, 1] - gp[:, 2]) < 25)
is_gold &= ~is_red
# (And the pale yellow-green of his glyphs on the haunch and the wing: greener than his cyans.)
is_glyph = ~is_gold & ~is_red & (gp[:, 1] > gp[:, 2] + 8) & (gp[:, 1] > gp[:, 0] + 18) & ((gp @ LUMA) > 120)
rest = ~is_gold & ~is_indigo & ~is_red & ~is_glyph
# His mouth, from his own pixels: red-brown pixels inside his beak, split by brightness into the throat, the
# shadowed tongue and the lit tongue / lower beak (the median of each).
mouth_px = crop[mouth_red & body_all]
mouth_l = mouth_px @ LUMA
MOUTH = np.array([np.median(mouth_px[(mouth_l >= lo) & (mouth_l < hi)], 0) for lo, hi in ((0, 60), (60, 85), (85, 300))])
groups = [(kmeans_palette(gp[rest], 34), 'blue'), (kmeans_palette(gp[is_indigo & ~is_violet], 6), 'indigo'),
          (kmeans_palette(gp[is_violet], 2), 'indigo'), (kmeans_palette(gp[is_gold], 8), 'gold'),
          (MOUTH, 'mouth'), (kmeans_palette(gp[is_glyph], 3), 'glyph')]
PAL, PAL_GROUP = [], []
for pal_, grp in groups:
    for c_ in np.round(pal_):
        # (No near-black: his blackest pixels are JPEG ringing in the gaps of the talons and the crest; they
        # take the nearest of his real darks, the deep blue rim or the maroon of his throat.)
        if (c_ @ LUMA) < 18 and grp != 'mouth':
            continue
        if any((c_ == q).all() for q in PAL):
            continue
        PAL.append(c_)
        PAL_GROUP.append(grp)
order = np.lexsort(np.array(PAL).T[::-1])
PAL = np.array(PAL, np.float32)[order]
PAL_GROUP = [PAL_GROUP[i] for i in order]
IS_MOUTH = np.array([gr == 'mouth' for gr in PAL_GROUP])
# His outline: the deep blue of his rim (the darkest quarter of the blue pixels on the griffin's edge),
# and a dark gold for the gold parts' edge. Where his edge is bright (the pale feather tips), a mid blue rim
# instead: his glow stays, and the edge still reads on the grass.
rim = body_all & dilate(~body_all, 1)
rim_px = crop[rim & blue]
rim_px = rim_px[(rim_px @ LUMA) <= np.percentile(rim_px @ LUMA, 25)]
OUTLINE = np.round(np.median(rim_px, 0))
gold_px = crop[body_all & (r > b + 30) & (g > 80)]
OUTLINE_GOLD = np.round(np.percentile(gold_px, 8, axis=0) * 0.62)
# (Under the belly and on the far legs his rim is indigo, not deep blue: the darkest quarter of his indigo
# pixels on the griffin's edge. It rims his indigo there, so his violet underside is not edged in navy.)
indigo_src = blue & (b > g + 45) & (g < 90)
rim_ind = crop[rim & indigo_src]
rim_ind = rim_ind[(rim_ind @ LUMA) <= np.percentile(rim_ind @ LUMA, 25)]
OUTLINE_INDIGO = np.round(np.median(rim_ind, 0))
# (The mid blue: the entry of his own palette nearest a saturated mid blue (35, 94, 127): the shade of his
# feathers' darker vanes, halfway between his deep rim and his pale tips.)
OUTLINE_LIGHT = PAL[int(snap_idx(np.array([[[35.0, 94.0, 127.0]]], np.float32), PAL)[0, 0])].copy()
IS_INDIGO = np.array([gr == 'indigo' for gr in PAL_GROUP])
# The dark grey and brown of his trim's shadow (dark and unsaturated). In his picture they lie under the near
# wing's gold trim; when the wing turns, the trim's end can come to lie by the background or the tail, where
# they read as dirt, so there (and only in the beat frames) they take the nearest of his saturated blues.
_sat = PAL.max(1) - PAL.min(1)
IS_DIRTY = ((PAL @ LUMA) < 100) & (_sat < 40) & ~IS_MOUTH
NOT_WING_BLUE = ~np.array([gr == 'blue' for gr in PAL_GROUP]) | (_sat < 40)
print("palette", len(PAL), "outline", OUTLINE.astype(int).tolist(), 'indigo outline', OUTLINE_INDIGO.astype(int).tolist(), 'gold outline', OUTLINE_GOLD.astype(int).tolist(),
      'light rim', OUTLINE_LIGHT.astype(int).tolist(), 'mouth', MOUTH.astype(int).tolist())
# Snapped in groups: the mouth's colours only inside his beak (so none of his navy wing or leg pixels can
# turn into a dark red or brown dot).
idx0 = snap_idx(C, PAL, forbid=IS_MOUTH[None, None, :] & ~BEAK_G[..., None]) + 1  # 0 = clear
idx0 = np.where(op, idx0, 0)
snap_err = np.abs(C[op] - PAL[idx0[op] - 1]).sum(1).mean()
sat_his = (C[op].max(-1) - C[op].min(-1)).mean()
sat_ours = (PAL[idx0[op] - 1].max(-1) - PAL[idx0[op] - 1].min(-1)).mean()
print(f'snap error {snap_err:.1f} (r+g+b); saturation his {sat_his:.1f}, ours {sat_ours:.1f}')

# Streak and specks at the game scale: alpha levels and his glow colours.
# His specks: 6 steps, so a speck fading in or out never changes by more than half its light in a frame.
ALEVELS = [(0.80, 255), (0.62, 215), (0.47, 178), (0.35, 142), (0.25, 112), (0.16, 85)]
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
    if name == 'far':
        # His far wing is cut off where his near wing's gold trim covers it. Its hidden part is continued 4 px
        # under the near wing, so no see-through slit opens along the trim when the near wing goes further
        # down than it. In his picture the near wing covers all of it, so frame 0 is unchanged.
        under = label == PIECES.index('near')
        # (Its px along the cut are the trim's dark shadow in his picture, a broken run of dark and mid px. When
        # the far wing peeks out further above the trim they would show as a dark comb, so in the beat (not in
        # frame 0, which keeps his pixels) the shadow is one even band of its own commonest colour, and the
        # hidden part continued below it is that colour too: a soft shadow under the trim, not a comb.)
        FAR0 = m.copy()
        lum_m = np.where(m > 0, PAL[np.clip(m - 1, 0, len(PAL) - 1)] @ LUMA, 255)
        seam = (m > 0) & dilate(under, 2) & (lum_m < 75)
        SHADOW = int(np.bincount(m[seam]).argmax())
        m = np.where(seam, SHADOW, m)
        for _ in range(4):
            grow = dilate(m > 0, 1) & (m == 0) & under
            m = np.where(grow, SHADOW, m)
    layers[name] = (m, up8(m))

N = 8
T = np.arange(N) / N
# The beat (one slow wing beat per loop). Each wing turns about its own root; the swing eases in over `ease`
# game px from it (so the wing bends there instead of shearing off the body).
# The near wing swings 62 degrees down at the bottom of the beat. Its timing is a cosine (slow at the top and the
# bottom, as a real beat is) blended 60 % toward an even pace, so the mid-stroke frames do not rush: its root
# turns 0, -13, -31, -49, -62 and back. Its tips lag behind (`flex` degrees x NEAR_LAG: they trail up on the
# way down and down on the way up), the same over most of each stroke and not at all at the top and the
# bottom, so the tip never moves more than about 25 px in a frame (on the way down and up alike) and it holds
# a moment at each end of the beat while the arm turns.
# His far wing (behind) follows the near one a little less far (`deg`, its root, per frame: at most 18 degrees
# a frame), so it is always there, peeking above the near wing's gold trim, and never pops in or out. Its outer
# half flexes up (`tipdeg`, the tip's own angle; one way, the same down and up, so 1 = 7, 2 = 6, 3 = 5): in
# frames 1-2 and 6-7 its tip has turned only 1-6 degrees, so its leading edge still rises to a pointed tip, the
# highest and narrowest point, the way he painted it (18-21 degrees of rise; 20 in his picture), never a flat
# plank; in frames 3-5 it is straight again and slopes down to its tip (13-24 degrees).
NEAR_SWING = 62.0
NEAR_BLEND = 0.6
NEAR_LAG = [0.0, 0.5, 0.8, 0.8, 0.0, -0.4, -0.75, -0.8]
FAR_DEG = [0.0, -6.0, -18.0, -36.0, -46.0, -36.0, -18.0, -6.0]
FAR_TIPDEG = [0.0, -1.0, -6.0, -36.0, -46.0, -36.0, -6.0, -1.0]
FAR_TIPW = (16.0, 26.0)  # (the far wing's flex ramps in from 16 px out from its root to all of it at 42 px)
WINGS = {
    'near': {'root': SHOULDER, 'swing': NEAR_SWING, 'flex': 8.0, 'ease': 9.0, 'short': 0.14},
    'far': {'root': FAR_ROOT, 'deg': FAR_DEG, 'tipdeg': FAR_TIPDEG, 'tipw': FAR_TIPW, 'flex': 0.0, 'ease': 14.0, 'short': 0.10},
}
# The body rises with the downstroke, in whole px (up is negative), one px every other frame and each level
# held for two frames: his picture and the next (0-1) lowest, the bottom of the beat (4-5) highest. So the head
# never reverses its step at once (no twitch), and the steps fall on the frames where the silhouette changes
# least otherwise (1-2, 3-4, 5-6, 7-0: the silhouette changes by at most 25 % a frame).
BOB = [0, 0, -1, -1, -2, -2, -1, -1]
# His tail sways in a wave from the root, and its tuft lifts as the near wing comes down over it (frames 1-4)
# and drops as the wing comes back up under it (5-7), so the bright tuft clears the wing in every frame instead
# of blinking out behind it (px at the tuft, up is positive).
TAIL_LIFT = [0, 2, 4, 6, 3, -2, -7, -4]
# The near wing's lag grows from TIPW[0] px out from its root to full at TIPW[0] + TIPW[1]: the feathers flex,
# the arm near the root does not, so its gold trim (and the far wing peeking above it) passes the same places
# on the way down and on the way up.
TIPW = (25.0, 40.0)
tr = to_game(TAIL_ROOT)
wr_x = to_game((WISP_ROOT_X, 0))[0]
for w in WINGS.values():
    w['g'] = to_game(w['root'])
    w['dist'] = np.hypot(XX + 0.5 - w['g'][0], YY + 0.5 - w['g'][1])
    e = np.clip(w['dist'] / w['ease'], 0, 1)
    w['easef'] = e * e * (3 - 2 * e)
    if 'tipdeg' in w:  # (the far wing's flex: eased in, a smoothstep)
        e2 = np.clip((w['dist'] - w['tipw'][0]) / w['tipw'][1], 0, 1)
        w['tipw'] = e2 * e2 * (3 - 2 * e2)
    else:
        w['tipw'] = np.clip((w['dist'] - TIPW[0]) / TIPW[1], 0, 1)


def down(t):
    """How far down the beat is at phase t: 0 at his raised wings (frame 0), 1 at the bottom (frame 4)."""
    return (1 - np.cos(2 * np.pi * t)) / 2


def lag(t):
    """The near wing's tip lag at phase t (a frame's phase), -1..1: + on the way down (the tips trail up)."""
    return NEAR_LAG[int(round(t * N)) % N]


def down_near(t):
    """How far down the near wing's beat is at phase t: the cosine, blended NEAR_BLEND toward an even pace."""
    tri = 1 - abs(1 - 2 * (t % 1.0))
    return (1 - NEAR_BLEND) * down(t) + NEAR_BLEND * tri


def beat(t):
    """The near wing's swing at its root at phase t (screen degrees; negative swings it down and back)."""
    return -WINGS['near']['swing'] * down_near(t)


def wing_field(name, t, flex=True):
    """Inverse map for a wing at phase t: its turn about its root, eased in from the root, tips lagging
    (without the lag when `flex` is off: the wing's main swing alone)."""
    w = WINGS[name]
    if 'deg' in w:  # (a table, one angle per frame; the outer half's own angle in 'tipdeg')
        fi = int(round(t * N)) % N
        theta = w['deg'][fi]
        dn = abs(theta) / max(abs(v) for v in w['deg'])
        ang = theta + (w['tipdeg'][fi] - theta) * w['tipw']
    else:
        dn = float(down_near(t))
        theta = -w['swing'] * dn
        ang = theta + (w['flex'] * w['tipw'] * lag(t) if flex else 0.0)
    a = np.deg2rad(w['easef'] * ang)
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
    # (and its tuft lifts or drops out of the near wing's way, more toward the tuft)
    dy = dy - TAIL_LIFT[int(round(t * N)) % N] * np.clip(d / 45.0, 0, 1) ** 1.2
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


# His specks. The cyan wisps trailing off his wing tips (and the few specks touching a wing's tip feathers)
# belong to that wing: each rides with the point of the wing it trails from (its tips' lag included), so none
# is left behind in the sky while the wing is down. They are only moved, never turned: a wisp stays his horizontal trail, leaving
# the tip toward the back, and never becomes a slanted needle. The near wing's wisps fade out as its tips
# drop below the back (frames 2-3) and back in as they rise (6-7), so they never stand in the light streak
# or by the legs, and they are never drawn over the streak. The far wing's specks fade with how much of the
# far wing shows. The other specks are free sparkles that stream back (left, the way the
# griffin leaves them): each is two copies half a loop apart, each copy drifting DRIFT px over its life while
# it fades in and out again (a tent, a quarter of its light per frame), so the two together always hold the
# same light (no blinking, no flash) and the stream never jumps. At frame 0 (and at frame 4) each speck is
# exactly where he painted it, at full strength, and its other copy is at zero. A fading wisp or copy keeps all
# its px (its 1 px gaps along the row closed), the faintest at WISP_FLOOR alpha, so it fades as one soft
# stroke instead of breaking into dots.
speck_lab = np.zeros((OH, OW), np.int32) - 1
sp_mask = PA > ALEVELS[-1][0]
for i, p in enumerate(components(sp_mask)):
    speck_lab[p[:, 0], p[:, 1]] = i
N_SPECKS = int(speck_lab.max()) + 1


def dist_to(mask, pts):
    ys_, xs_ = np.nonzero(mask)
    if not len(ys_):
        return 1e9
    return float(np.sqrt(((np.stack([ys_, xs_], 1)[None, :, :] - pts[:, None, :]) ** 2).sum(-1)).min())


SPECK_OWNER = []
shoulder_gy = to_game(SHOULDER)[1]
for i in range(N_SPECKS):
    pts = np.argwhere(speck_lab == i)
    cyan = float((PC[pts[:, 0], pts[:, 1], 2] - PC[pts[:, 0], pts[:, 1], 0]).mean()) > 30
    high = float(pts[:, 0].mean()) < shoulder_gy - 8  # (above the wings' roots: the wing-tip sky)
    behind = float(pts[:, 1].mean()) < WINGS['far']['g'][0]  # (behind the neck: not the specks round the head)
    d = {n: dist_to(layers[n][0] > 0, pts) for n in ('near', 'far')}
    owner = 'free'
    for n, o in (('near', 'far'), ('far', 'near')):
        if behind and d[n] <= d[o] and ((cyan and d[n] <= 15) or (high and d[n] <= 4)):
            owner = n
    SPECK_OWNER.append(owner)
DRIFT = 9.0  # game px a free speck drifts back over the life of one copy (one loop)
# Each wing-owned speck's anchor: its pixel nearest its wing (where the wisp leaves the tip). It is carried to
# wherever the wing's turn takes that point, and the whole speck moves with it, unturned.
SPECK_ANCHOR = []
for i in range(N_SPECKS):
    if SPECK_OWNER[i] == 'free':
        SPECK_ANCHOR.append(None)
        continue
    pts = np.argwhere(speck_lab == i)
    wy, wx = np.nonzero(layers[SPECK_OWNER[i]][0] > 0)
    d2 = ((pts[:, None, 0] - wy[None]) ** 2 + (pts[:, None, 1] - wx[None]) ** 2).min(1)
    SPECK_ANCHOR.append(tuple(int(v) for v in pts[int(np.argmin(d2))]))
# The near wing's wisps fade out while its tips are down (at most 0.4 of their light a frame: 102 of 255).
WISP_FADE = [1.0, 0.7, 0.3, 0.0, 0.0, 0.0, 0.3, 0.7]
WISP_FLOOR = 50  # (the faintest alpha a fading wisp's px keep: his streak's faintest level)


def carried(field, yx):
    """Where a wing's turn (its inverse map `field`) takes the pixel yx: the destination pixel whose source
    is nearest it (whole px, so a carried speck keeps his pixels)."""
    sx, sy = field
    d2 = (sx - (yx[1] + 0.5)) ** 2 + (sy - (yx[0] + 0.5)) ** 2
    j = int(np.argmin(d2))
    return j // OW - yx[0], j % OW - yx[1]


def specks_at(k, t, bob, fields, far_frac, avoid):
    """The specks at phase t: (alpha, colour) of all of them, and each one's own quantized alpha (for the
    fade check). A wing's specks are carried (moved, not turned) with their anchor through that wing's turn
    and the body's bob, faded (the near wing's while its tips are down, the far wing's with how much of it
    shows), and kept off `avoid` (his light streak)."""
    a_out = np.zeros((OH, OW), np.float32)
    c_out = np.zeros((OH, OW, 3), np.float32)
    floor = np.zeros((OH, OW), bool)
    per = []
    for i in range(N_SPECKS):
        m = speck_lab == i
        a0 = np.where(m, PA, 0).astype(np.float32)
        c0 = np.where(m[..., None], PC, 0).astype(np.float32)
        own = SPECK_OWNER[i]
        if own == 'free':
            for half in (0.0, 0.5):
                u = (t + 0.5 + half) % 1.0
                dxi = int(np.round(-DRIFT * (u - 0.5)))
                w_ = 1.0 - abs(2.0 * u - 1.0)
                a_full = shift_cols(a0, dxi)
                a = a_full * w_
                c = shift_cols(c0, dxi)
                # (A fading copy keeps all its px too, at the faintest level at least: no dotted dashes.)
                if 0 < w_ < 1:
                    floor |= footprint(a_full) & (quant_alpha(a, ALEVELS) == 0)
                per.append(int(quant_alpha(a, ALEVELS).max()))
                take = a > a_out
                a_out = np.where(take, a, a_out)
                c_out = np.where(take[..., None], c, c_out)
            continue
        else:
            dy, dx = carried(fields[own], SPECK_ANCHOR[i]) if k else (0, 0)
            fade = WISP_FADE[k] if own == 'near' else min(1.0, far_frac)
            a_full = shift_rows(shift_cols(a0, dx), dy + bob)
            a = a_full * fade
            a = np.where(avoid, 0, a) if k else a
            c = shift_rows(shift_cols(c0, dx), dy + bob)
            # (A fading wisp keeps all its px: every px is scaled, and the ones that would drop out stay at the
            # faintest level, so it fades as one soft stroke instead of breaking into dots.)
            if 0 < fade < 1:
                floor |= footprint(a_full) & (quant_alpha(a, ALEVELS) == 0) & ~(avoid if k else False)
        per.append(int(quant_alpha(a, ALEVELS).max()))
        take = a > a_out
        a_out = np.where(take, a, a_out)
        c_out = np.where(take[..., None], c, c_out)
    return a_out, c_out, per, floor


def footprint(a):
    """A speck's px (the ones shown at full strength), its 1 px gaps along the row closed: the stroke a fading
    copy keeps whole."""
    m = a > ALEVELS[-1][0]
    return m | (np.roll(m, 1, 1) & np.roll(m, -1, 1))


def quant_alpha(a, levels=ALEVELS):
    out = np.zeros(a.shape, np.uint8)
    for th, v in reversed(levels):
        out[a > th] = v
    return out


def shift_cols(a, n):
    """a moved n px right (left when n < 0), clear where it comes from outside (no wrap-around)."""
    if n == 0:
        return a
    out = np.zeros_like(a)
    if n > 0:
        out[:, n:] = a[:, :-n]
    else:
        out[:, :n] = a[:, -n:]
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


def enclosed(m):
    """Clear pixels a mask closes in (not 4-connected to the frame's border through clear pixels)."""
    img = Image.fromarray(np.where(m, 1, 0).astype(np.uint8), 'L').copy()  # (a copy: fromarray's image is read-only)
    ImageDraw.floodfill(img, (0, 0), 2)
    return np.asarray(img) == 0


FAR_VIS0 = []  # (the far wing's visible px in his picture, frame 0)
GAPS0 = []  # (the see-through gaps of his picture, frame 0)


def frame(k):
    t = T[k]
    bob = BOB[k]
    ids = np.zeros((OH, OW), np.int64)
    if k == 0:
        fields = {n: (XX + 0.5, YY + 0.5) for n in PIECES}
        carry = fields
        theta = 0.0
    else:
        theta = beat(t)
        fields = {'body': (XX + 0.5, YY + 0.5), 'far': wing_field('far', t), 'near': wing_field('near', t),
                  'tail': tail_field(t), 'wisp': wisp_field(t)}
        # (His wing-tip specks are carried by the wing's whole turn, the tips' lag included, so each one always
        # leaves the tip it trails from; they are kept off his light streak.)
        carry = {'near': fields['near'], 'far': fields['far']}
    got = {}
    for n in PIECES:
        m, m8 = layers[n]
        if k == 0 and n == 'far':
            m = FAR0  # (his far wing as he painted it, the trim's shadow included)
        sx, sy = fields[n]
        got[n] = shift_rows(sample(m, m8, sx, sy), bob)  # (the whole griffin moves bob px)
    # Back to front: the far wing, the tail, the body, the ribbon, the near wing.
    top = np.full((OH, OW), -1, np.int64)
    for n in ('far', 'tail', 'body', 'wisp', 'near'):
        ids = np.where(got[n] > 0, got[n], ids)
        top = np.where(got[n] > 0, PIECES.index(n), top)
    got['_top'] = top
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
    # Where the lowered near wing comes to lie on the tail it can close in a 1-2 px slit of background along
    # its lower edge, over the back. That reads as a crack, not as one of his gaps, so it is filled (the wing
    # lies on the tail there) and gets the deep blue of the edges on both sides of it.
    slit = np.zeros_like(opq)
    if k == 0:
        GAPS0.append(enclosed(opq))
    else:
        new_gap = enclosed(opq) & ~shift_rows(GAPS0[0], bob) & shift_rows(UPPER_G, bob)
        for p in components(new_gap):
            if len(p) <= 40 and np.bincount(p[:, 1]).max() <= 2:
                slit[p[:, 0], p[:, 1]] = True
        opq |= slit
        ids = np.where(slit, int(np.argmax(np.where(IS_MOUTH, -1e9, -((PAL - OUTLINE) ** 2).sum(1)))) + 1, ids)
    ids = np.where(opq, ids, 0)
    if k:
        def clean_dirty(ids, opq, top):
            """(The near wing's trim end: his dark grey and brown shadow px within 2 px of the background or the
            tail become the nearest of his saturated blues, the wing's own shadow, not a dirt crumb.)"""
            near_px = opq & (top == PIECES.index('near'))
            bare = ~opq | (top == PIECES.index('tail'))
            bare = count_nb(count_nb(bare, N8 + ((0, 0),)) > 0, N8 + ((0, 0),)) > 0  # (within 2 px, square)
            dirty = near_px & IS_DIRTY[np.clip(ids - 1, 0, len(PAL) - 1)] & bare
            if dirty.any():
                alt = snap_idx(PAL[np.clip(ids - 1, 0, len(PAL) - 1)], PAL, forbid=NOT_WING_BLUE[None, None, :]) + 1
                ids = np.where(dirty, alt, ids)
            return ids, int(dirty.sum())
        ids, n_dirty = clean_dirty(ids, opq, top)
        near_px = opq & (top == PIECES.index('near'))
        # (And the trim's cut end must not stand up as a knob above the wing's top edge: trim-coloured px of the
        # near wing above the running median (7 columns) of its top edge are taken off; what lies under them
        # (the far wing, the tail, the body, or the background) shows instead.)
        nmask = got['near'] > 0
        cols_ = np.where(nmask.any(0), np.argmax(nmask, 0), OH)
        pad_ = np.pad(cols_, 3, mode='edge')
        med = np.median(np.stack([pad_[i:i + OW] for i in range(7)]), 0)
        warm = (IS_DIRTY | (PAL[:, 0] > PAL[:, 2] + 8) | (_sat < 40))[np.clip(ids - 1, 0, len(PAL) - 1)]
        knob = near_px & warm & (YY < med[None, :] - 0.5) & (np.abs(cols_ - med)[None, :] >= 1)
        knob &= dilate(~opq, 1)
        for _ in range(2):
            more = near_px & warm & ~knob & (YY < med[None, :] - 0.5) & dilate(knob, 1) & dilate(~opq | knob, 1)
            if not more.any():
                break
            knob |= more
        if knob.any():
            under_ids = np.zeros_like(ids)
            under_top = np.full((OH, OW), -1, np.int64)
            for n in ('far', 'tail', 'body', 'wisp'):
                under_ids = np.where(got[n] > 0, got[n], under_ids)
                under_top = np.where(got[n] > 0, PIECES.index(n), under_top)
            ids = np.where(knob, under_ids, ids)
            top = np.where(knob, under_top, top)
            got['_top'] = top
            opq &= ~(knob & (under_ids == 0))
            got['near'] = np.where(knob, 0, got['near'])
        got['_knob'] = int(knob.sum())
        # (once more where taking a knob off bared the trim's shadow)
        ids, n_dirty2 = clean_dirty(ids, opq, top)
        got['_dirty'] = n_dirty + n_dirty2
    colr = PAL[np.clip(ids - 1, 0, len(PAL) - 1)]
    gold = opq & (colr[..., 0] > colr[..., 2] + 8) & (colr[..., 0] > 80)
    # His edge: a 1 px outline on the silhouette, deep blue (dark gold on and next to his gold).
    edge = edge_of(opq)
    # A swung near wing keeps its own edge where it now lies over the body, the tail or the far wing (not at
    # its root; frame 0 has none): one unbroken 1 px line in his mid blue, his feathers' darker vane colour,
    # so it reads as the wing's edge and not as a dark crack across the haunch.
    nw = got['near'] > 0
    nedge = edge_of(nw) & opq & ~edge & (WINGS['near']['dist'] > WINGS['near']['ease'] + 3) if k else np.zeros_like(nw)
    # How much of the far wing shows (its specks fade with it).
    far_vis = int((opq & (top == PIECES.index('far'))).sum())
    if k == 0:
        FAR_VIS0.append(far_vis)
    far_frac = far_vis / FAR_VIS0[0]
    out = np.zeros((OH, OW, 4), np.uint8)
    # Soft layers first (under the griffin): his streak (it moves with the body) and his specks.
    ssx, ssy = streak_field(t) if k else (XX + 0.5, YY + 0.5)
    sa = shift_rows(bilinear(SA, ssx, ssy), bob)
    sc = shift_rows(bilinear(SC, ssx, ssy), bob)
    q_streak = quant_alpha(sa, ALEVELS_STREAK)
    pa, pc, per, floor = specks_at(k, t, bob, carry, far_frac, dilate(q_streak > 0, 1))
    q_speck = quant_alpha(pa, ALEVELS)
    q_speck = np.where(floor & (q_speck == 0), WISP_FLOOR, q_speck).astype(np.uint8)
    for qa, c, spal in ((q_streak, sc, SPAL_STREAK), (q_speck, pc, SPAL_SPECK)):
        put = qa > out[..., 3]
        out[put, :3] = spal[snap_idx(c, spal)][put].astype(np.uint8)
        out[put, 3] = qa[put]
    out[opq, :3] = colr[opq].astype(np.uint8)
    out[opq, 3] = 255
    ring = edge | nedge
    got['_nedge'] = nedge
    gring = ring & (gold | (count_nb(gold, N8) >= 2))
    # His claw tips: pale grey px of his talons next to their gold. They keep his colour to the tip (no rim),
    # and the edge px beside them get the dark gold rim, never a blue one.
    talon = shift_rows(TALON_G, bob)
    # (His pale grey px in the talons, grown from the ones next to his gold toes along the claw: the whole hook.)
    sat_ = colr.max(-1) - colr.min(-1)
    pale = opq & talon & (sat_ < 45) & ((colr @ LUMA) > 85)
    claw = pale & dilate(gold & (sat_ >= 45), 2)
    for _ in range(12):
        grown = pale & (count_nb(claw, N8) > 0)
        if not (grown & ~claw).any():
            break
        claw |= grown
    gring |= ring & talon & ~claw & (count_nb(claw, N8) > 0)
    got['_claw'] = claw
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
    # (A dark gold px left standing on its own above the trim's end is a tooth, not an edge: dropped.)
    for _ in range(2):
        beyond &= count_nb(opq | beyond, N4) >= 2
    # His open mouth keeps its dark red to the edge (his throat is the dark there, not a rim).
    mouth = IS_MOUTH[np.clip(ids - 1, 0, len(PAL) - 1)] & opq
    line = ring & ~crest & ~foot & ~trim & ~mouth & ~claw
    # Where his own colour on the edge is bright (the pale feather tips), the rim is his mid blue, so his
    # glow is kept; elsewhere his deep blue (dark gold on and next to his gold).
    # (Bright: the edge pixel itself, or the griffin just inside it: the mean of its neighbours off the edge.)
    core = opq & ~edge
    lum_ = np.where(core, colr @ LUMA, 0)
    inner = sum(np.roll(np.roll(lum_, oy, 0), ox, 1) for oy, ox in N8) / np.maximum(count_nb(core, N8), 1)
    bright = ((colr @ LUMA) > 150) | ((inner > 150) & (count_nb(core, N8) > 0))
    # (Where the griffin just inside the edge is his indigo, under the belly and on the far legs, the rim is
    # his indigo rim colour: the edge pixel's own colour, or most of its neighbours off the edge, indigo.)
    ind_ = IS_INDIGO[np.clip(ids - 1, 0, len(PAL) - 1)] & opq
    n_core = count_nb(core, N8)
    indig = ind_ | ((count_nb(ind_ & core, N8) * 2 >= n_core) & (n_core > 0))
    out[line & ~gring & ~bright, :3] = OUTLINE.astype(np.uint8)
    out[line & ~gring & ~bright & indig, :3] = OUTLINE_INDIGO.astype(np.uint8)
    out[line & ~gring & bright, :3] = OUTLINE_LIGHT.astype(np.uint8)
    out[line & ~gring & nedge & ~edge, :3] = OUTLINE_LIGHT.astype(np.uint8)
    out[line & gring, :3] = OUTLINE_GOLD.astype(np.uint8)
    out[beyond, :3] = OUTLINE_GOLD.astype(np.uint8)
    out[beyond, 3] = 255
    out[slit, :3] = OUTLINE.astype(np.uint8)
    solid = opq | beyond
    if k:
        # (Along the near wing's gold trim where it lies on the silhouette, and at its cut end: no 1 px teeth
        # standing up and no 1 px notches. A tooth goes, a notch is filled with the trim's dark gold edge.)
        zone = dilate(nw & gold & dilate(~solid, 2), 2)
        for _ in range(2):
            tooth = zone & solid & (count_nb(~solid, N4) >= 3)
            notch = zone & ~solid & (count_nb(solid, N4) >= 3)
            if not (tooth.any() or notch.any()):
                break
            out[tooth] = 0
            solid &= ~tooth
            out[notch, :3] = OUTLINE_GOLD.astype(np.uint8)
            out[notch, 3] = 255
            solid |= notch
        # (And the trim's own px left on the edge by that keep a dark gold edge, not cream on the background.)
        bare = zone & solid & gold & nw & (count_nb(~solid, N4) >= 2)
        out[bare, :3] = OUTLINE_GOLD.astype(np.uint8)
        # (Where the trim's end meets the tail, the near wing's edge there is its mid blue edge over the tail,
        # not a dark gold wedge: dark gold only right beside his gold.)
        tail_px = solid & (top == PIECES.index('tail'))
        wedge = (line & gring & nw & (count_nb(tail_px, N4) > 0) & (count_nb(gold & ~ring, N4) == 0))
        out[wedge, :3] = OUTLINE_LIGHT.astype(np.uint8)
    got['_far_vis'] = far_vis
    got['_slit'] = int(slit.sum())
    return out, theta, bob, solid, per, got


frames, thetas, bobs, solids, speck_alpha, pieces_at = [], [], [], [], [], []
TOPS = []
NEDGES = []
for k in range(N):
    f, th, bb, so, per, got_ = frame(k)
    frames.append(f)
    thetas.append(th)
    bobs.append(bb)
    solids.append(so)
    speck_alpha.append(per)
    pieces_at.append(got_)
    TOPS.append(np.where(f[..., 3] == 255, got_['_top'], -1))
    NEDGES.append(got_['_nedge'])
# How much of the far wing shows in each frame (opaque px where it is the piece on top).
FARVIS = [int((t_ == PIECES.index('far')).sum()) for t_ in TOPS]

# --- 5. checks -------------------------------------------------------------------------------------------


def light(f, outside=None):
    """The light of a frame: alpha x luma summed over it (or over `outside` only), the mean luma of what it
    covers, and how many px it covers."""
    a = f[..., 3].astype(np.float32) / 255
    if outside is not None:
        a = a * outside
    l = (f[..., :3].astype(np.float32) @ LUMA) / 255
    return float((a * l).sum()), float((a * l).sum() / max(a.sum(), 1e-6)), int((a > 0).sum())


# No flash: the light of a frame may change by at most 18 % from its neighbour's (the wrap included; the
# wing covering the body is the only thing that changes it, and smoothly), and its mean luma by at most 6 %.
LIGHT = [light(f) for f in frames]
# The light outside the griffin (his streak and his specks, on the panel) changes smoothly too: at most 30 %
# from a frame to the next. And no speck changes by more than half its light in a frame.
SOFT = [light(f, ~solids[k])[0] for k, f in enumerate(frames)]


# No tears: no frame may open a see-through gap over the back, round the wing roots and the neck (UPPER) that
# his picture does not have there. (The gaps between the talons, and between the tail, a lowered wing and the
# hind leg, are outside this zone: those are the griffin's own shapes.)
HOLES0 = enclosed(solids[0])
HOLES = []
for k in range(N):
    new_h = enclosed(solids[k]) & ~shift_rows(HOLES0, bobs[k]) & shift_rows(UPPER_G, bobs[k])
    HOLES.append(int(new_h.sum()))
# The silhouette (opaque px) changes smoothly: the part of it that differs between neighbouring frames, out of
# the two together (a 62-degree beat in 8 frames, with the body's 1 px bob, moves about 20-24 % of it at
# mid-stroke: at most 25 % from a frame to the next).
SIL = []
for k in range(N):
    a_, b_ = frames[k][..., 3] == 255, frames[(k + 1) % N][..., 3] == 255
    SIL.append(float((a_ ^ b_).sum() / max((a_ | b_).sum(), 1)))


def longest_wing_run(k):
    """The longest straight horizontal or vertical run of the silhouette's edge (px whose neighbour above,
    below, left or right is clear) on a wing (what shows there is a wing piece). A swung wing must not turn
    into a flat-topped slab or a ruler-straight cut."""
    so = solids[k]
    g_ = pieces_at[k]
    wing = ((g_['near'] > 0) | (g_['far'] > 0)) & ~(g_['body'] > 0) | (g_['near'] > 0)
    best_ = 0
    for oy, ox, horiz in ((-1, 0, True), (1, 0, True), (0, -1, False), (0, 1, False)):
        e = so & ~np.roll(np.roll(so, -oy, 0), -ox, 1) & wing
        lines = e if horiz else e.T
        for row in lines:
            run = 0
            for v in row:
                run = run + 1 if v else 0
                best_ = max(best_, run)
    return best_


RUNS = [longest_wing_run(k) for k in range(N)]
RUN_MAX = max(10, RUNS[0])


def far_shape(k):
    """The far wing as it shows (opaque px where it is the piece on top): the slope of its top edge (a straight
    line fit over the 40 columns nearest its tip, the leftmost; degrees, + when it rises toward the tip) and
    how wide its tip is: across its top 3 rows when the tip is raised (the tip is the highest point there), across
    its 3 leftmost columns when it slopes down to the tip."""
    ys_, xs_ = np.nonzero(TOPS[k] == PIECES.index('far'))
    tops = {}
    for x_, y_ in zip(xs_.tolist(), ys_.tolist()):
        tops[x_] = min(tops.get(x_, 1 << 30), y_)
    cx_ = np.array(sorted(tops))
    cy_ = np.array([tops[x_] for x_ in cx_])
    sel = cx_ < cx_.min() + 40
    rise_ = float(np.degrees(np.arctan(np.polyfit(cx_[sel], cy_[sel], 1)[0])))
    if FAR_TIPDEG[k] > -20:
        r3 = xs_[ys_ < ys_.min() + 3]
        width = int(r3.max() - r3.min() + 1)
    else:
        c3 = ys_[xs_ < xs_.min() + 3]
        width = int(c3.max() - c3.min() + 1)
    return rise_, width


FAR_RISE, FAR_TIPW_PX = zip(*[far_shape(k) for k in range(N)])
FAR_RISE0 = FAR_RISE[0]


def near_tip(k):
    """The near wing's tip: its px farthest from the shoulder."""
    ys_, xs_ = np.nonzero(pieces_at[k]['near'] > 0)
    gx, gy = WINGS['near']['g']
    j = int(np.argmax(np.hypot(xs_ + 0.5 - gx, ys_ + 0.5 - gy)))
    return int(xs_[j]), int(ys_[j])


TIPS = [near_tip(k) for k in range(N)]
TIP_TRAVEL = [float(np.hypot(TIPS[(k + 1) % N][0] - TIPS[k][0], TIPS[(k + 1) % N][1] - TIPS[k][1])) for k in range(N)]
# His tail as it shows in each frame (px where it is on top), and its tuft (its last 14 columns): how much of
# the tuft shows, out of the tuft in that frame.
TAIL_VIS, TUFT_VIS = [], []
for k in range(N):
    full_ = pieces_at[k]['tail'] > 0
    vis_ = TOPS[k] == PIECES.index('tail')
    x0_ = int(np.nonzero(full_.any(0))[0].min())
    TAIL_VIS.append(int(vis_.sum()))
    TUFT_VIS.append(float(vis_[:, :x0_ + 14].sum() / max(full_[:, :x0_ + 14].sum(), 1)))
# His claw tips: no blue rim on them or next to them (in his talons).
BLUE_RIMS = np.array([OUTLINE, OUTLINE_LIGHT, OUTLINE_INDIGO], np.float32)
CLAW_BLUE = []
for k in range(N):
    claw_ = pieces_at[k]['_claw']
    rgb_ = frames[k][..., :3].astype(np.float32)
    blue_ = (np.abs(rgb_[..., None, :] - BLUE_RIMS[None, None]).sum(-1) == 0).any(-1) & (frames[k][..., 3] == 255)
    CLAW_BLUE.append(int((blue_ & (claw_ | (count_nb(claw_, N8) > 0))).sum()))
# No 1 px tooth on the near wing's silhouette (its trim's cut end included).
TEETH = [int((solids[k] & (count_nb(~solids[k], N4) >= 3) & (TOPS[k] == PIECES.index('near'))).sum()) for k in range(N)]
print('frame  far rise  far tip w  near tip  tip travel  tail px  tuft shown  claw blue rim  near teeth')
for k in range(N):
    print(f'{k:5d}  {FAR_RISE[k]:8.1f}  {FAR_TIPW_PX[k]:9d}  {str(TIPS[k]):>8s}  {TIP_TRAVEL[k]:10.1f}  {TAIL_VIS[k]:7d}  {TUFT_VIS[k]:10.0%}  {CLAW_BLUE[k]:13d}  {TEETH[k]:10d}')
print('frame  near deg  far deg  bob   light  mean luma  covered px  soft light  far wing px  new holes  silhouette step  wing edge run  speck alpha max')
for k in range(N):
    print(f'{k:5d}  {thetas[k]:8.1f}  {FAR_DEG[k]:7.1f}  {bobs[k]:3d}  {LIGHT[k][0]:6.1f}  {LIGHT[k][1]:9.3f}  {LIGHT[k][2]:10d}  {SOFT[k]:10.1f}  '
          f'{FARVIS[k]:11d}  {HOLES[k]:9d}  {SIL[k]:15.3f}  {RUNS[k]:13d}  {max(speck_alpha[k])}')
FAILS = []
for k in range(N):
    j = (k + 1) % N
    ratio = LIGHT[j][0] / max(LIGHT[k][0], 1e-6)
    mr = LIGHT[j][1] / max(LIGHT[k][1], 1e-6)
    sr = SOFT[j] / max(SOFT[k], 1e-6)
    if not 0.82 <= ratio <= 1.22:
        FAILS.append(f'light {k}->{j}: {ratio:.2f}x')
    if not 0.94 <= mr <= 1.06:
        FAILS.append(f'mean luma {k}->{j}: {mr:.2f}x')
    if not 1 / 1.3 <= sr <= 1.3:
        FAILS.append(f'light outside the griffin {k}->{j}: {sr:.2f}x')
    for i in range(len(speck_alpha[k])):
        if abs(speck_alpha[j][i] - speck_alpha[k][i]) > 128:
            FAILS.append(f'speck copy {i} {k}->{j}: alpha {speck_alpha[k][i]} -> {speck_alpha[j][i]}')
    if HOLES[k]:
        FAILS.append(f'frame {k}: {HOLES[k]} px of see-through gap over the back / wing roots')
    if SIL[k] > 0.25:
        FAILS.append(f'silhouette {k}->{j}: {SIL[k]:.0%} changes')
    # The far wing beats, it never pops: at most 25 degrees a frame, and how much of it shows changes by at
    # most 40 % (of the larger) from a frame to the next, so it never vanishes behind the near wing at once.
    if abs(FAR_DEG[j] - FAR_DEG[k]) > 25:
        FAILS.append(f'far wing {k}->{j}: turns {abs(FAR_DEG[j] - FAR_DEG[k]):.0f} degrees in a frame')
    if abs(FARVIS[j] - FARVIS[k]) > 0.4 * max(FARVIS[j], FARVIS[k]):
        FAILS.append(f'far wing {k}->{j}: {FARVIS[k]} -> {FARVIS[j]} px showing')
    if RUNS[k] > RUN_MAX:
        FAILS.append(f'frame {k}: a straight wing edge {RUNS[k]} px long (his picture: {RUNS[0]})')
    # The far wing never lies flat like a plank: its top edge rises at least 10 degrees to a pointed tip while
    # the tip is raised (frames 0-2, 6-7) and falls at least 10 degrees to it at the bottom of the beat (3-5),
    # and its tip is at most 6 px wide (his: 6).
    if FAR_TIPDEG[k] > -20 and FAR_RISE[k] < 10:
        FAILS.append(f'frame {k}: the far wing top edge rises only {FAR_RISE[k]:.1f} degrees to its tip')
    if FAR_TIPDEG[k] <= -20 and FAR_RISE[k] > -10:
        FAILS.append(f'frame {k}: the far wing top edge falls only {-FAR_RISE[k]:.1f} degrees to its tip')
    if FAR_TIPW_PX[k] > max(6, FAR_TIPW_PX[0]):
        FAILS.append(f'frame {k}: the far wing tip is {FAR_TIPW_PX[k]} px wide')
    # The near wing's tip moves at most about 25 px a frame (no rushed stroke).
    if TIP_TRAVEL[k] > 26:
        FAILS.append(f'near wing tip {k}->{j}: moves {TIP_TRAVEL[k]:.1f} px')
    # His tail's bright tuft never blinks out behind the near wing, and the tail never all but vanishes.
    if TUFT_VIS[k] < 0.75 or TAIL_VIS[k] < 120:
        FAILS.append(f'frame {k}: tail {TAIL_VIS[k]} px showing, tuft {TUFT_VIS[k]:.0%}')
    if CLAW_BLUE[k]:
        FAILS.append(f'frame {k}: {CLAW_BLUE[k]} px of blue rim on or next to his claw tips')
    if TEETH[k]:
        FAILS.append(f'frame {k}: {TEETH[k]} px of 1 px teeth on the near wing')
if DEBUG:
    os.makedirs(DEBUG, exist_ok=True)
    path = os.path.join(DEBUG, 'griffin-frames.npz')
    with open(path + '.part', 'wb') as fh:
        np.savez_compressed(fh, frames=np.stack(frames), solids=np.stack(solids), bobs=np.array(bobs), top=np.stack(TOPS), nedge=np.stack(NEDGES))
    os.replace(path + '.part', path)
if FAILS:
    raise SystemExit('frame checks failed: ' + '; '.join(FAILS))

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
    "picture (wings raised) is fly frame 0; 1-7 swing his two wings down and back up about their roots",
    "(eased at the root; the near wing's tips lag, the far wing follows it a little less far, its tip",
    "flexing up so it keeps his pointed tip), bob the body, sway his tail (its tuft out of the wing's way),",
    "ripple his ribbon of chakra, flow his light streak, carry his wing-tip wisps (unturned, fading while",
    "the tips are down) and stream his other specks back as cross-fading copies. Scale: his character is",
    f"{np.mean(HIS_CHAR):.1f} px tall in that sheet, ours {CHAR_H:.0f}.",
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
            'soft_light': [round(v, 1) for v in SOFT], 'silhouette_step': [round(v, 3) for v in SIL], 'wing_edge_run': RUNS,
            'far_deg': list(FAR_DEG), 'far_tip_deg': list(FAR_TIPDEG), 'far_visible': FARVIS, 'wisp_fade': WISP_FADE,
            'far_rise': [round(v, 1) for v in FAR_RISE], 'far_tip_width': list(FAR_TIPW_PX), 'near_lag': NEAR_LAG,
            'near_tip_travel': [round(v, 1) for v in TIP_TRAVEL], 'tail_visible': TAIL_VIS, 'tuft_shown': [round(v, 3) for v in TUFT_VIS],
            'tail_lift': TAIL_LIFT, 'claw_blue_rim': CLAW_BLUE, 'near_teeth': TEETH,
            'speck_owner': SPECK_OWNER, 'outline': OUTLINE.astype(int).tolist(), 'outline_indigo': OUTLINE_INDIGO.astype(int).tolist(), 'outline_gold': OUTLINE_GOLD.astype(int).tolist(),
            'outline_light': OUTLINE_LIGHT.astype(int).tolist(), 'mouth': MOUTH.astype(int).tolist(), 'bg': BG.astype(int).tolist()}
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
