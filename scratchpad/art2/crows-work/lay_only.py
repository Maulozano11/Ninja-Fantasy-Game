"""Turns the owner's genjutsu sheet into the crow swarm for vfx_beasts (sprite 'genjutsu').

    python3 -I tools/refs/crows-from-ref.py <genjutsu-sheet.jpg> <out.ts> [debugDir]

His sheet (docs/reference/genjutsu-set-owner-reference.jpg) is a paint-over of our genjutsu kit. Under
BEAST (CROW, APPROVED, IN GAME) he replaced our single crow with a swarm in two pictures: on the left,
crows with red eyes circling a dark violet vortex with violet feathers flying; on the right, the
flock streaming right as a dense mass with dark smoke and feathers trailing. He asked for his art to
be copied as exactly as possible, so his two pictures ARE frames 0 and 4 of the 6-frame fly loop.

How: his character (beside the blast, the walls) is measured against ours (96 px) for the scale.
Each picture is split into layers in his own pixels: every crow is cut out along a hand-traced
outline (the bright vortex showing between its feathers stays with the vortex, and so does the
black smoke behind the flock), small loose feathers are found as separate pieces, and what is
left (the vortex, the smoke) is a veil un-mixed from his background into colour plus alpha. Each
layer is area-averaged down to the game scale on one grid (the anchor at the centre of the swarm's
mass, shared by both pictures) and snapped to a palette sampled from his pixels at that scale (dark
and light halves sampled apart, plus his brightest beak and feather glints, so his highlights are
not outvoted). Dark edges on open air get a 1 px outline in the colour of his own crow edges. Every
eye is the same round stamp at the traced eye: a crimson ring round a rose core.

The other frames are made from the same pixels, so the crows stay his: each crow is lifted off his
picture at sheet scale with its holes closed, and beats its wings by turning his own raised-wing
pixels about the shoulder (30 and 60 degrees, nearest neighbour, before the shrink), the far wing
behind the body and the near wing in front. They move by whole pixels and are mirrored to turn
round; where one of his flock crows is partly hidden in his flock (a wing and a head), the whole crow
of his left picture flies its place while it is away from the flock. One-pixel hairs and loose crumbs
(under 10 px) of the lifted pieces are left out, so nothing reads as a stray line. His vortex is
unwrapped about its eye into polar space, the holes the crows leave are filled along each ring from
the same radius, and it spins by shifting the angle and closes by scaling the radius, so its stripes
stay crisp. His smoke trails in behind the flock and is left behind; his
feathers drift back. The 'summon' anim (our proposal: he painted only the fly frames) opens his
vortex at the caster and brings the crows out of it and round it, ending on his left picture.

The result is a TypeScript data module (palette + run-length rows) that the generator
(tools/world-sprites/vfx-beast-crows.ts) decodes, so the build needs no image files. Deterministic.
The build fails if a frame has an enclosed transparent gap over 20 px, a speck of 3 px or less, an
opaque pixel on its edge, a mean luma more than 20 % off its neighbour's (a flash), or (fly) an
opaque mass more than 25 % off its neighbour's, a light (alpha x luma) more than 1.5x off it, or a
crow moving more than 25 px from one frame to the next.
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
RESAMPLE = Image.BOX  # a true area average for the 0.77 downscale (each game pixel is the mean of the 1.29 x 1.29 sheet pixels under it)

ref = np.asarray(Image.open(REF).convert('RGB')).astype(np.float32)
BG = np.array([31, 31, 41], np.float32)  # his panel background (measured: flat, +-1)

# His BEAST panel (inside the border lines) and the two pictures in it.
PANEL = (261, 796, 786, 1010)
PICS = {'L': (262, 798, 522, 1009), 'R': (522, 798, 785, 1009)}
LUMW = np.array([0.3, 0.55, 0.15], np.float32)
N4 = ((1, 0), (-1, 0), (0, 1), (0, -1))


# --- helpers -----------------------------------------------------------------------------------------

def components(mask):
    """8-connected components of a mask, as lists of (y, x)."""
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
        out.append(pts)
    return out


def shift_bool(m, dy, dx):
    out = np.zeros_like(m)
    H, W = m.shape[:2]
    ys0, ys1 = max(0, dy), min(H, H + dy)
    xs0, xs1 = max(0, dx), min(W, W + dx)
    out[ys0:ys1, xs0:xs1] = m[ys0 - dy:ys1 - dy, xs0 - dx:xs1 - dx]
    return out


def dilate(m, n=1):
    for _ in range(n):
        g = m.copy()
        for dy, dx in N4:
            g |= shift_bool(m, dy, dx)
        m = g
    return m


def erode(m, n=1):
    return ~dilate(~m, n)


def nb4(m):
    return sum(shift_bool(m, dy, dx).astype(np.int32) for dy, dx in N4)


def hood(m):
    """How many of the 3 x 3 pixels round each pixel (itself included) are in the mask: 3 or less on a
    line one pixel wide, 6 or more on any edge of a solid shape."""
    return sum(shift_bool(m, dy, dx).astype(np.int32) for dy in (-1, 0, 1) for dx in (-1, 0, 1))


def poly_mask(pts, shape, off=(0, 0)):
    img = Image.new('L', (shape[1], shape[0]), 0)
    ImageDraw.Draw(img).polygon([(x - off[0], y - off[1]) for x, y in pts], fill=1, outline=1)
    return np.asarray(img).astype(bool)


def lum(c):
    return c[..., :3].astype(np.float32) @ LUMW


def shrink(arr, cov, anchor, s, out_size, out_anchor):
    """Area-averages coverage `cov` and the colour under it onto the output grid, anchors aligned.
    arr is H x W x C (any channels); returns (coverage, colour) with colour un-premultiplied."""
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
    A = np.asarray(big(cov).resize((ow, oh), RESAMPLE, box=box))
    ch = np.stack([np.asarray(big(arr[..., c] * cov).resize((ow, oh), RESAMPLE, box=box)) for c in range(arr.shape[2])], -1)
    col = np.where(A[..., None] > 1e-4, ch / np.maximum(A[..., None], 1e-4), 0)
    return A, col


def snap_idx(col, pal):
    d = ((col[..., None, :] - pal[None, None]) ** 2).sum(-1)
    return np.argmin(d, -1)


def median_palette(pixels, n):
    img = Image.fromarray(np.clip(pixels, 0, 255).astype(np.uint8).reshape(1, -1, 3), 'RGB')
    q = img.quantize(colors=n, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    pal = np.array(q.getpalette()[:n * 3], np.float32).reshape(-1, 3)
    pal = np.unique(pal, axis=0)
    return pal[np.lexsort((pal[:, 2], pal[:, 1], pal[:, 0]))]


def move(arr, dx, dy):
    return shift_bool(arr, dy, dx)


def fill_holes(m, rgba):
    """A piece with its pinholes and enclosed gaps filled from its own neighbouring pixels (gaps where his
    vortex shows between a crow's feathers, or a crow cut where another hid it): lifted off his picture
    it shows no specks of daylight. Works at any scale, on any number of channels."""
    m = m.copy()
    rgba = rgba.copy()
    if not m.any():
        return m, rgba
    H, W = m.shape
    ys, xs = np.nonzero(m)
    bx0, by0, bx1, by1 = max(xs.min() - 1, 0), max(ys.min() - 1, 0), min(xs.max() + 2, W), min(ys.max() + 2, H)
    sub = ~m[by0:by1, bx0:bx1]
    todo = np.zeros((H, W), bool)
    # The air round the piece is what reaches the edge of its box through 4-neighbours; the rest is a hole.
    reach = flood4(sub)
    todo[by0:by1, bx0:bx1] = sub & ~reach
    # Notches one pixel wide (three of four neighbours in the piece) close too.
    for _ in range(2):
        todo |= ~m & (nb4(m) >= 3)
        while todo.any():
            got = False
            for dy, dx in ((0, -1), (-1, 0), (0, 1), (1, 0)):
                src = shift_bool(m, dy, dx) & todo
                if src.any():
                    rgba[src] = shift_bool(rgba, dy, dx)[src]
                    m |= src
                    todo &= ~src
                    got = True
            if not got:
                break
    return m, rgba


def flood4(open_):
    """The part of `open_` 4-connected to the edge of the array."""
    reach = np.zeros_like(open_)
    reach[0, :] = open_[0, :]
    reach[-1, :] = open_[-1, :]
    reach[:, 0] |= open_[:, 0]
    reach[:, -1] |= open_[:, -1]
    while True:
        g = dilate(reach) & open_
        if (g == reach).all():
            return reach
        reach = g


# --- scale: his character against ours -----------------------------------------------------------------

def char_height(x0, x1, y0, y1):
    """Hair to sandal of his character in a box (the longest run of rows that hold it)."""
    c = ref[y0:y1, x0:x1]
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    on = (np.abs(c - BG).sum(2) > 45) & ~((r - g > 25) & (b - g > 25))
    rows = on.sum(1) >= 2
    best, run, start, span = 0, 0, 0, (0, 0)
    gap = 0
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


CHARS = {'blast': (790, 830, 276, 420), 'wall': (392, 435, 515, 660), 'wall_depth': (172, 215, 868, 1008), 'wall_diag': (950, 1005, 590, 730)}
heights = {k: char_height(*v) for k, v in CHARS.items()}
HIS_CHAR_H = float(np.median([h for h, _ in heights.values()]))
S = CHAR_H / HIS_CHAR_H
print('his character:', heights, '-> median', HIS_CHAR_H, 'scale', round(S, 4))


# --- his crows, traced (sheet pixels) ----------------------------------------------------------------
# Each crow is the polygon around it; where crows overlap the one listed later is in front. The part
# of a crow above its `cut` line (its shoulders) is its raised wings: left of `split` is the 'lo'
# wing, right of it the 'hi' wing; `near` is the wing on our side (drawn over the body when it beats).
# `pivot` is each wing's shoulder joint, the point it turns about when it beats: down and away from
# the body (a wing whose tip is left of its shoulder turns anticlockwise), or as `turn` says (L3's
# upright far wing sweeps back behind it rather than forward over its head). `face` is the way it
# looks (1 right, -1 left).

CROWS = {
    'L': [
        {'name': 'L4', 'cut': [(292, 921), (314, 918), (322, 914), (345, 916), (356, 925), (372, 935), (396, 941)], 'split': 330, 'near': 'hi', 'eye': (329, 928), 'face': -1,
         'pivot': {'lo': (320, 916), 'hi': (344, 919)},
         'poly': [(298, 893), (304, 891), (312, 899), (318, 907), (322, 914), (330, 916), (338, 919), (343, 924), (345, 912), (350, 904), (357, 896), (365, 889), (372, 884), (379, 879), (383, 884), (386, 896), (389, 910), (392, 922), (392, 932), (386, 936), (375, 937), (364, 940), (358, 946), (350, 950), (342, 950), (336, 946), (330, 944), (324, 945), (318, 944), (315, 939), (317, 932), (315, 926), (309, 919), (303, 909), (298, 900)]},
        {'name': 'L1', 'cut': [(268, 862), (293, 860), (298, 855), (322, 855), (329, 860), (346, 864), (380, 862)], 'split': 320, 'near': 'hi', 'eye': (308, 863), 'face': -1,
         'pivot': {'lo': (297, 859), 'hi': (326, 859)},
         'poly': [(276, 838), (282, 840), (288, 846), (296, 851), (302, 855), (310, 855), (318, 857), (322, 860), (326, 856), (332, 848), (338, 840), (343, 833), (348, 826), (356, 820), (364, 814), (370, 809), (374, 811), (375, 820), (375, 832), (372, 842), (366, 850), (358, 857), (350, 861), (345, 868), (343, 878), (340, 888), (335, 896), (326, 900), (316, 897), (309, 892), (304, 884), (299, 878), (295, 873), (294, 867), (296, 863), (290, 861), (284, 857), (279, 851), (275, 844)]},
        {'name': 'L2', 'cut': [(395, 866), (428, 866), (440, 856), (448, 846), (458, 843), (472, 841), (492, 841)], 'split': 449, 'near': 'lo', 'eye': (468, 852), 'face': 1,
         'pivot': {'lo': (446, 845), 'hi': (453, 843)},
         'poly': [(406, 808), (411, 809), (418, 819), (425, 827), (432, 834), (440, 839), (447, 843), (453, 841), (459, 835), (466, 828), (474, 821), (481, 815), (486, 812), (488, 817), (483, 826), (477, 834), (471, 841), (473, 846), (479, 852), (484, 858), (487, 864), (481, 865), (473, 863), (468, 867), (466, 872), (462, 872), (446, 871), (436, 868), (428, 863), (420, 859), (412, 853), (405, 847), (401, 839), (400, 829), (402, 818)]},
        # L3's outline hugs its beak: the dark smoke streak under it is the vortex's, not the crow's. It
        # also hugs the tip of its raised near wing: the dark stripe edge running right from it is the vortex's.
        {'name': 'L3', 'cut': [(365, 932), (400, 936), (420, 918), (430, 914), (440, 913), (458, 913), (475, 913)], 'split': 431, 'near': 'lo', 'eye': (446, 924), 'face': 1,
         'pivot': {'lo': (430, 913), 'hi': (447, 912)}, 'turn': {'hi': -1},
         'poly': [(388, 853), (393, 861), (399, 868), (410, 876), (416, 888), (422, 898), (428, 906), (433, 910), (436, 900), (436, 885), (437, 870), (442, 865), (452, 864), (460, 866), (463, 876), (462, 892), (459, 906), (458, 913), (461, 920), (463, 926), (461, 932), (456, 935), (452, 940), (450, 946), (442, 950), (438, 958), (434, 963), (420, 963), (414, 956), (412, 948), (406, 942), (398, 938), (392, 932), (389, 922), (386, 910), (384, 898), (382, 886), (381, 872), (383, 860)],
         'keep': [(414, 946), (440, 946), (440, 965), (414, 965)]},
    ],
    'R': [
        {'name': 'R1', 'cut': [(596, 885), (640, 887), (650, 881), (660, 877), (686, 878)], 'split': 999, 'near': 'lo', 'eye': (665, 887), 'face': 1,
         'pivot': {'lo': (645, 881)},
         'poly': [(606, 848), (612, 846), (620, 854), (628, 860), (628, 846), (632, 838), (637, 836), (641, 842), (645, 836), (650, 840), (652, 850), (655, 862), (658, 870), (662, 876), (668, 880), (674, 884), (680, 889), (678, 894), (670, 894), (662, 897), (652, 900), (640, 901), (626, 899), (612, 896), (602, 893), (600, 886), (604, 876), (604, 862)]},
        {'name': 'R2', 'cut': [(648, 869), (680, 873), (698, 868), (705, 866), (730, 866)], 'split': 999, 'near': 'lo', 'eye': (712, 874), 'face': 1,
         'pivot': {'lo': (698, 867)},
         'poly': [(656, 832), (664, 832), (672, 838), (682, 846), (690, 852), (696, 860), (700, 866), (706, 866), (714, 866), (720, 870), (724, 876), (727, 881), (720, 882), (712, 882), (704, 884), (694, 882), (684, 876), (672, 868), (662, 860), (655, 850), (653, 840)]},
        {'name': 'R4', 'cut': [(694, 896), (720, 906), (745, 905), (780, 903)], 'split': 999, 'near': 'lo', 'eye': (761, 911), 'face': 1,
         'pivot': {'lo': (745, 904)},
         'poly': [(697, 880), (705, 880), (715, 878), (720, 868), (726, 866), (734, 870), (742, 866), (748, 872), (752, 884), (752, 896), (750, 904), (758, 904), (766, 906), (772, 912), (775, 920), (766, 920), (758, 924), (746, 926), (734, 926), (724, 920), (718, 912), (712, 904), (704, 894), (698, 887)]},
        {'name': 'R3', 'eye': (700, 901), 'face': 1, 'poly': [(655, 898), (668, 895), (680, 893), (690, 892), (700, 893), (708, 896), (713, 900), (717, 905), (710, 908), (700, 910), (688, 911), (675, 912), (662, 912), (652, 908)]},
        {'name': 'R5', 'cut': [(600, 937), (630, 939), (645, 931), (655, 925), (690, 925)], 'split': 999, 'near': 'lo', 'eye': (667, 934), 'face': 1,
         'pivot': {'lo': (650, 927)},
         'poly': [(610, 905), (618, 904), (628, 910), (636, 916), (642, 922), (648, 926), (655, 924), (664, 925), (672, 929), (678, 934), (683, 940), (676, 944), (668, 946), (660, 949), (648, 951), (636, 952), (622, 951), (610, 948), (604, 942), (608, 935), (612, 928), (610, 918)]},
        {'name': 'R6', 'cut': [(660, 951), (700, 946), (718, 937), (730, 935), (760, 935)], 'split': 999, 'near': 'lo', 'eye': (734, 944), 'face': 1,
         'pivot': {'lo': (722, 937)},
         'poly': [(666, 904), (674, 906), (684, 912), (694, 918), (704, 925), (712, 931), (720, 935), (730, 935), (740, 938), (748, 944), (753, 951), (746, 954), (738, 956), (728, 958), (718, 962), (718, 972), (714, 979), (704, 979), (696, 972), (690, 968), (678, 968), (668, 964), (668, 955), (674, 948), (670, 940), (666, 928), (664, 915)]},
    ],
}


# The eye of his vortex and the radius of its outer ring (traced on his sheet).
VORTEX = (383.0, 933.0, 72.0)


# --- his pictures into layers (sheet pixels) -----------------------------------------------------------

def layers(key):
    x0, y0, x1, y1 = PICS[key]
    c = ref[y0:y1, x0:x1].copy()
    H, W = c.shape[:2]
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    diff = np.abs(c - BG).sum(2)
    lu = c.mean(2)
    fg = diff > 15
    for pts in components(fg):
        if len(pts) < 4:
            fg[tuple(np.array(pts).T)] = False
    # The vortex's violet, bright and dark: it shows between the crows' feathers and stays with the
    # vortex. His crows are a greyed violet (their green is never under half their red or blue, even
    # in the highlights); the vortex is a pure purple (its green a third of them or less).
    chroma = c.max(2) - c.min(2)
    vivid = (chroma > 40) & (g < 0.5 * np.maximum(r, b)) & (key == 'L')
    # His black smoke (and the black streaks round the vortex): near-black pixels more than two
    # pixels from any lit crow feather. A crow's own outline and the dark between its feathers are
    # always next to a lit feather, so they stay with the crow.
    smoke = (c.max(2) < 16) & ~dilate(lu > 30, 2)
    crows = []
    taken = np.zeros((H, W), bool)
    yy_, xx_ = np.mgrid[0:H, 0:W]
    for spec in reversed(CROWS[key]):  # front first
        m = poly_mask(spec['poly'], (H, W), (x0, y0)) & fg & ~taken
        keep = poly_mask(spec['keep'], (H, W), (x0, y0)) if 'keep' in spec else np.zeros((H, W), bool)
        # His eye: the light pixels round the point traced as its centre (a red washed to mauve).
        near_eye = np.hypot(xx_ - (spec['eye'][0] - x0), yy_ - (spec['eye'][1] - y0)) <= 2.9
        eye = m & near_eye & (lu > 70) & (r > g + 20)
        keep |= dilate(eye, 2)
        m &= (~vivid & ~smoke) | keep
        # Specks the cut leaves behind (a few pixels cut off from the crow) go back to the veil.
        for pts in components(m):
            if len(pts) < 12:
                m[tuple(np.array(pts).T)] = False
        taken |= m
        crows.append({**spec, 'mask': m, 'eyemask': eye})
    crows.reverse()  # back to front
    rest = fg & ~taken
    feathers = []
    for pts in components(rest):
        ys = np.array([p[0] for p in pts])
        xs = np.array([p[1] for p in pts])
        bright = (lu[ys, xs] > 52).sum()
        # The black wisps whirling round the outside of his vortex (dark strokes clear of its rings) are
        # pieces too, like his feathers: they ride round it whole instead of being smeared along a ring.
        far = key == 'L' and np.hypot(xs.mean() - (VORTEX[0] - x0), ys.mean() - (VORTEX[1] - y0)) > VORTEX[2] * 1.15
        if len(pts) <= 320 and max(np.ptp(ys), np.ptp(xs)) <= 34 and (bright >= 3 or (far and len(pts) >= 10)):
            m = np.zeros((H, W), bool)
            m[ys, xs] = True
            feathers.append({'name': f'{key}f{len(feathers)}', 'mask': m, 'eye': (x0 + xs.mean(), y0 + ys.mean())})
    for f in feathers:
        rest &= ~f['mask']
    # The veil: what is left, un-mixed from his background into colour and alpha. Alpha grows with the
    # distance from his background: a haze within a few levels of it is JPEG noise and is dropped, his
    # soft edges go translucent, and what is clearly painted (the vortex's dark violet, the smoke) is
    # opaque in his own colour, so it reads as he painted it on any ground, not as a grey film. The
    # colour is what, laid over his background at that alpha, gives his pixel.
    dist = np.sqrt(((c - BG) ** 2).sum(2))
    alpha = np.clip((dist - 6) / 14, 0, 1) * rest
    if key == 'L':
        # The body of his vortex is solid: its eye, as dark as his background, is the vortex too.
        free = ~taken
        for f in feathers:
            free &= ~f['mask']
        core = free & (np.hypot(xx_ - (VORTEX[0] - x0), yy_ - (VORTEX[1] - y0)) < VORTEX[2] * 0.6)
        alpha[core] = 1.0
    ink = np.where(alpha[..., None] > 1e-3, BG + (c - BG) / np.maximum(alpha[..., None], 1e-3), 0)
    return {'box': (x0, y0, x1, y1), 'rgb': c, 'fg': fg, 'crows': crows, 'feathers': feathers, 'veil': (np.clip(ink, 0, 255), alpha)}


LAY = {k: layers(k) for k in PICS}
for k, v in LAY.items():
    print(k, 'crows', {cr['name']: int(cr['mask'].sum()) for cr in v['crows']}, 'feathers', len(v['feathers']), 'veil px', int((v['veil'][1] > 0).sum()))


