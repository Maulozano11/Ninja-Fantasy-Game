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
round. His vortex is unwrapped about its eye into polar space, the holes the crows leave are filled
along each ring from the same radius, and it spins by shifting the angle and closes by scaling the
radius, so its stripes stay crisp. His smoke trails in behind the flock and is left behind; his
feathers drift back. The 'summon' anim (our proposal: he painted only the fly frames) opens his
vortex at the caster and brings the crows out of it and round it, ending on his left picture.

The result is a TypeScript data module (palette + run-length rows) that the generator
(tools/world-sprites/vfx-beast-crows.ts) decodes, so the build needs no image files. Deterministic.
The build fails if a frame has an enclosed transparent gap over 20 px, a speck of 3 px or less, an
opaque pixel on its edge, or (fly) an opaque mass more than 25 % off its neighbour's or a crow moving
more than 25 px from one frame to the next.
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
RESAMPLE = Image.BILINEAR  # with box= this is an area filter for the 0.77 downscale

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
        # L3's outline hugs its beak: the dark smoke streak under it is the vortex's, not the crow's.
        {'name': 'L3', 'cut': [(365, 932), (400, 936), (420, 918), (430, 914), (440, 913), (458, 913), (475, 913)], 'split': 431, 'near': 'lo', 'eye': (446, 924), 'face': 1,
         'pivot': {'lo': (430, 913), 'hi': (447, 912)}, 'turn': {'hi': -1},
         'poly': [(388, 853), (396, 860), (404, 866), (410, 876), (416, 888), (422, 898), (428, 906), (433, 910), (436, 900), (436, 885), (437, 870), (442, 865), (452, 864), (460, 866), (463, 876), (462, 892), (459, 906), (458, 913), (461, 920), (463, 926), (461, 932), (456, 935), (452, 940), (450, 946), (442, 950), (438, 958), (434, 963), (420, 963), (414, 956), (412, 948), (406, 942), (398, 938), (392, 932), (389, 922), (386, 910), (384, 898), (382, 886), (381, 872), (383, 860)],
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


# --- anchors: the centre of each swarm's mass, shared on one grid ------------------------------------------

def mass_centre(key):
    L = LAY[key]
    w = L['veil'][1].copy()
    for cr in L['crows']:
        w += cr['mask']
    for f in L['feathers']:
        w += f['mask']
    ys, xs = np.mgrid[0:w.shape[0], 0:w.shape[1]]
    return float((xs * w).sum() / w.sum()), float((ys * w).sum() / w.sum())


ANCH = {k: mass_centre(k) for k in PICS}
print('anchors (sheet px):', {k: (round(a[0] + PICS[k][0], 1), round(a[1] + PICS[k][1], 1)) for k, a in ANCH.items()})


def extent(key):
    L = LAY[key]
    ys, xs = np.nonzero(L['fg'])
    ax, ay = ANCH[key]
    return xs.min() - ax, ys.min() - ay, xs.max() + 1 - ax, ys.max() + 1 - ay


MARGIN = 30  # game px around both pictures for the in-betweens' motion
ex = [extent(k) for k in PICS]
OAX = int(np.ceil(-min(e[0] for e in ex) * S)) + MARGIN
OAY = int(np.ceil(-min(e[1] for e in ex) * S)) + MARGIN
OW = OAX + int(np.ceil(max(e[2] for e in ex) * S)) + MARGIN
OH = OAY + int(np.ceil(max(e[3] for e in ex) * S)) + MARGIN
SIZE, OANCHOR = (OW, OH), (OAX, OAY)
print('work canvas', SIZE, 'anchor', OANCHOR)

PADS = 48  # sheet px of padding round a picture: room for a beating wing or the turned vortex


def pad(a):
    out = np.zeros((a.shape[0] + 2 * PADS, a.shape[1] + 2 * PADS) + a.shape[2:], a.dtype)
    out[PADS:-PADS, PADS:-PADS] = a
    return out


def to_game(key, x, y):
    """A sheet point on the game grid."""
    return OAX + (x - PICS[key][0] - ANCH[key][0]) * S, OAY + (y - PICS[key][1] - ANCH[key][1]) * S


def shrink_pic(key, arr, cov, padded=False):
    """A layer of his picture `key` (sheet pixels, padded or not) on the game grid."""
    p = PADS if padded else 0
    return shrink(arr, cov.astype(np.float32), (ANCH[key][0] + p, ANCH[key][1] + p), S, SIZE, OANCHOR)


# --- his pictures at the game scale (colours not yet snapped) ---------------------------------------------

def raw_pieces(key):
    """Every crow and feather of a picture area-averaged onto the game grid, cut where his picture has
    them (overlaps go to the one in front)."""
    L = LAY[key]
    items = [('crow', cr) for cr in L['crows']] + [('feather', f) for f in L['feathers']]
    covs = [shrink_pic(key, L['rgb'], it['mask']) for _, it in items]
    stack = np.stack([A for A, _ in covs])
    solid = stack.sum(0) >= 0.5
    # Pinholes (a clear pixel with three solid neighbours) are filled, lone specks dropped.
    nb = nb4(solid)
    solid = (solid & (nb >= 1)) | (~solid & (nb >= 3) & (stack.sum(0) >= 0.2))
    owner = np.argmax(stack + np.arange(len(covs))[:, None, None] * 1e-3, 0)  # later items are in front
    out = []
    for i, (kind, it) in enumerate(items):
        A, C = covs[i]
        m = solid & (owner == i)
        for pts in components(m):
            if len(pts) <= 3:
                m[tuple(np.array(pts).T)] = False
        if not m.any():
            continue
        out.append({'name': it['name'], 'kind': kind, 'key': key, 'spec': it, 'mask': m, 'C': C})
    return out


RAW = {k: raw_pieces(k) for k in PICS}
EYES_AT = {it['name']: np.array(to_game(k, *it['spec']['eye']), np.float32) for k in PICS for it in RAW[k] if it['kind'] == 'crow'}


# --- palettes (sampled from his pixels at the game scale) -------------------------------------------------

def is_magenta(c):
    """His vortex's pure purple (green well under red and blue): where it lights a crow (L3's talons) it
    takes the vortex's glow colours, not the crows' greyed violets."""
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    return (g < 0.6 * np.minimum(r, b)) & (np.maximum(r, b) - g > 40)


def eye_zone(name):
    yy, xx = np.mgrid[0:OH, 0:OW]
    ex_, ey_ = EYES_AT[name]
    return np.hypot(xx + 0.5 - ex_, yy + 0.5 - ey_) < 3.2


crow_cols = []
for k in PICS:
    for it in RAW[k]:
        m = it['mask'] & (~eye_zone(it['name']) if it['kind'] == 'crow' else True)
        crow_cols.append(it['C'][m])
crow_cols = np.concatenate(crow_cols)
mag = is_magenta(crow_cols)
plain = crow_cols[~mag]
pl = lum(plain)


def bands(px, lu, edges, ns):
    """A palette sampled in luma bands, so his few light colours (beaks, glints, the vortex's magenta
    stripes) get entries of their own instead of being averaged into the many dark ones."""
    return np.unique(np.concatenate([median_palette(px[(lu >= lo) & (lu < hi)], n) for (lo, hi), n in zip(zip(edges[:-1], edges[1:]), ns)]), axis=0)


# Crows and feathers: his black-violets, his lit feathers, and his brightest (pale beaks, lilac sheen).
SOLID = bands(plain, pl, [0, 60, 85, 104, 999], [16, 9, 5, 3])
veil_cols = []
for k in PICS:
    rgb_, a_ = LAY[k]['veil']
    A_, C_ = shrink_pic(k, rgb_, a_)
    veil_cols.append(C_[A_ >= 0.5])
veil_cols = np.concatenate(veil_cols + [crow_cols[mag]])
# The veil: his vortex's dark, its violet, its magenta stripes and their brightest light.
VEIL = bands(veil_cols, lum(veil_cols), [0, 40, 70, 95, 999], [8, 8, 8, 4])
GLOW = VEIL[lum(VEIL) >= 40]
ALEVELS = [(0.72, 255), (0.42, 170)]
EDGE_LUM = 52.0  # edge pixels darker than this are his outline
PAL_OPAQUE = np.concatenate([SOLID, VEIL])
DEEP = VEIL[np.argmin(VEIL.sum(1))]  # his deepest violet-black

# The outline: the median of his own dark crow edges (crow pixels next to his background, darker than
# luma 25: his black-violet contour, not the JPEG's grey ringing round it).
edge_px = []
for k in PICS:
    L = LAY[k]
    for cr in L['crows']:
        e = cr['mask'] & dilate(~L['fg'], 1)
        px = L['rgb'][e]
        edge_px.append(px[lum(px) < 25])
edge_px = np.concatenate(edge_px)
OUTLINE = np.round(np.median(edge_px, 0)).astype(np.float32)

# His eyes: a crimson ring round a rose core, the same round stamp on every crow, centred on the traced
# eye. Plain eyes, as he painted them.
EYE_RING, EYE_MID, EYE_CORE = (np.array(c, np.float32) for c in ((95, 12, 45), (165, 35, 75), (225, 90, 130)))
EYE_STAMP = ['.rr.', 'rccr', 'rmmr', '.rr.']
print('solid', len(SOLID), 'veil', len(VEIL), 'outline', OUTLINE.astype(int).tolist(), 'brightest solid', SOLID[np.argmax(lum(SOLID))].astype(int).tolist(),
      'brightest glow', GLOW[np.argmax(lum(GLOW))].astype(int).tolist())


def snap_crow(C):
    """Area-averaged crow colours -> his palette: magenta light to the glow colours, the rest to the crows'."""
    out = SOLID[snap_idx(C, SOLID)]
    mg = is_magenta(C)
    out[mg] = GLOW[snap_idx(C, GLOW)][mg]
    return out


def stamp_eye(m, rgba, ex_, ey_):
    """His eye stamped at (ex_, ey_) (game px): returns the piece and the eye mask."""
    m, rgba = m.copy(), rgba.copy()
    eyes = np.zeros(m.shape, bool)
    x0, y0 = int(round(ex_ - 2)), int(round(ey_ - 2))
    for j, row in enumerate(EYE_STAMP):
        for i, ch in enumerate(row):
            if ch == '.':
                continue
            y, x = y0 + j, x0 + i
            rgba[y, x, :3] = {'r': EYE_RING, 'c': EYE_CORE, 'm': EYE_MID}[ch]
            rgba[y, x, 3] = 255
            m[y, x] = True
            eyes[y, x] = True
    return m, rgba, eyes


# --- his pictures' pieces (key frames) ------------------------------------------------------------------------

def key_pieces(key):
    out = []
    for it in RAW[key]:
        m = it['mask']
        rgba = np.zeros((OH, OW, 4), np.uint8)
        rgba[m, :3] = snap_crow(it['C'])[m]
        rgba[m, 3] = 255
        eyes = np.zeros((OH, OW), bool)
        piece = {'name': it['name'], 'kind': it['kind'], 'key': key}
        if it['kind'] == 'crow':
            m, rgba, eyes = stamp_eye(m, rgba, *EYES_AT[it['name']])
            piece.update(eye=tuple(EYES_AT[it['name']]), face=it['spec']['face'])
        else:
            ys, xs = np.nonzero(m)
            piece.update(eye=(float(xs.mean()), float(ys.mean())), face=0)
        fm, fr = fill_holes(m, rgba)
        piece.update(mask=m, rgba=rgba, eyes=eyes, fmask=fm, frgba=fr)
        out.append(piece)
    return out


PIECES = {k: key_pieces(k) for k in PICS}
BY = {p['name']: p for k in PICS for p in PIECES[k]}
ORDER = {k: [p['name'] for p in PIECES[k] if p['kind'] == 'crow'] for k in PICS}
FEATHERS = {k: [p['name'] for p in PIECES[k] if p['kind'] == 'feather'] for k in PICS}


# --- the wing beat: his own raised wings turned about the shoulder at sheet scale --------------------------

WING_DEG = {'up': 0, 'mid': 30, 'down': 60}


def turn_nn(mask, rgb, deg, px, py):
    """A part turned by deg (screen degrees, clockwise) about (px, py), nearest neighbour: his pixels moved,
    never blended."""
    H, W = mask.shape
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    a = np.deg2rad(deg)
    dx, dy = xx - px, yy - py
    sx = np.round(px + dx * np.cos(a) + dy * np.sin(a)).astype(int)
    sy = np.round(py - dx * np.sin(a) + dy * np.cos(a)).astype(int)
    ok = (sx >= 0) & (sx < W) & (sy >= 0) & (sy < H)
    m = np.zeros_like(mask)
    m[ok] = mask[sy[ok], sx[ok]]
    c = np.zeros_like(rgb)
    c[m] = rgb[sy[m], sx[m]]
    return m, c


def sheet_crow(key, cr):
    """His crow lifted off his picture (sheet pixels, padded): its holes closed from its own pixels, its
    raised wings found above the shoulder line (minus the head) with their shoulder joints."""
    L = LAY[key]
    x0, y0 = PICS[key][:2]
    m, rgb = fill_holes(cr['mask'], L['rgb'])
    H, W = m.shape
    yy, xx = np.mgrid[0:H, 0:W]
    out = {'mask': pad(m), 'rgb': pad(rgb), 'wings': []}
    if 'cut' in cr:
        line = np.interp(np.arange(W), [p[0] - x0 for p in cr['cut']], [p[1] - y0 for p in cr['cut']])
        head = np.hypot(xx - (cr['eye'][0] - x0), yy - (cr['eye'][1] - y0)) < 7.5
        wing = m & ~head & (yy < line[None, :])
        for side, (px, py) in cr['pivot'].items():
            part = wing & ((xx < cr['split'] - x0) if side == 'lo' else (xx >= cr['split'] - x0))
            if part.sum() < 20:
                continue
            ys, xs = np.nonzero(part)
            tip = np.argmax(np.hypot(xs - (px - x0), ys - (py - y0)))
            out['wings'].append({'side': side, 'mask': pad(part), 'pivot': (px - x0 + PADS, py - y0 + PADS),
                                 'sign': cr.get('turn', {}).get(side, 1 if xs[tip] > px - x0 else -1), 'near': side == cr['near']})
    return out


SHEET = {cr['name']: sheet_crow(k, cr) for k in PICS for cr in LAY[k]['crows']}
_poses = {}


def pose(name, mode):
    """(mask, rgba, eyes) of his crow `name` at its place in his picture, wings 'up' (as he painted
    them), 'mid' or 'down' (each wing turned down about its shoulder by 30 or 60 degrees: the far wing
    behind the body, the near wing in front), shrunk to the game scale, snapped, gaps closed, eye stamped."""
    k = (name, mode)
    if k in _poses:
        return _poses[k]
    sc = SHEET[name]
    key = BY[name]['key']
    if mode == 'up' or not sc['wings']:
        cov, col = sc['mask'], sc['rgb']
    else:
        allw = np.zeros_like(sc['mask'])
        for w in sc['wings']:
            allw |= w['mask']
        cov = np.zeros_like(sc['mask'])
        col = np.zeros_like(sc['rgb'])
        for it in [w for w in sc['wings'] if not w['near']] + ['body'] + [w for w in sc['wings'] if w['near']]:
            if it == 'body':
                pm, pc = sc['mask'] & ~allw, sc['rgb']
            else:
                pm, pc = turn_nn(it['mask'], sc['rgb'], it['sign'] * WING_DEG[mode], *it['pivot'])
            cov[pm] = True
            col[pm] = pc[pm]
    A, C = shrink_pic(key, col, cov, padded=True)
    m = A >= 0.5
    nb = nb4(m)
    m = (m & (nb >= 1)) | (~m & (nb >= 3) & (A >= 0.2))
    for pts in components(m):
        if len(pts) <= 3:
            m[tuple(np.array(pts).T)] = False
    rgba = np.zeros((OH, OW, 4), np.uint8)
    rgba[m, :3] = snap_crow(C)[m]
    rgba[m, 3] = 255
    m, rgba = fill_holes(m, rgba)
    m, rgba, eyes = stamp_eye(m, rgba, *EYES_AT[name])
    _poses[k] = (m, rgba, eyes)
    return _poses[k]


# --- the veils: his vortex (in polar space) and his smoke -----------------------------------------------------

def premul(rgb, alpha):
    return np.concatenate([rgb * alpha[..., None], alpha[..., None]], -1)


def unpremul(pm):
    a = pm[..., 3]
    return np.where(a[..., None] > 1e-3, pm[..., :3] / np.maximum(a[..., None], 1e-3), 0), a


VCX, VCY, VRAD = VORTEX[0] - PICS['L'][0], VORTEX[1] - PICS['L'][1], VORTEX[2]
DR, RMAX, NT, FADE = 0.5, 104.0, 1440, 60  # polar grid: radius step (sheet px), outer radius, angle bins; fill fade (bins)


def polar_vortex():
    """His vortex unwrapped about its eye: rows are radii, columns angles (clockwise from +x). Where his
    crows and feathers hid it, each ring is filled along the angle from the same ring: from his pixels
    either side of the hole, fading into that ring's average in the middle of a long hole."""
    L = LAY['L']
    rgb, alpha = L['veil']
    pm = premul(rgb, alpha)
    H, W = alpha.shape
    hidden = np.zeros((H, W), bool)
    for it in L['crows'] + L['feathers']:
        hidden |= it['mask']
    known = (~hidden).astype(np.float32)
    rr = np.arange(0, RMAX, DR, dtype=np.float32)
    th = np.arange(NT, dtype=np.float32) * (2 * np.pi / NT)
    X = VCX + rr[:, None] * np.cos(th)[None, :]
    Y = VCY + rr[:, None] * np.sin(th)[None, :]
    x0 = np.floor(X).astype(int)
    y0 = np.floor(Y).astype(int)
    fx, fy = X - x0, Y - y0
    acc = np.zeros(X.shape + (4,), np.float32)
    wsum = np.zeros(X.shape, np.float32)
    for oy, ox, w in ((0, 0, (1 - fx) * (1 - fy)), (0, 1, fx * (1 - fy)), (1, 0, (1 - fx) * fy), (1, 1, fx * fy)):
        yi, xi = y0 + oy, x0 + ox
        inside = (yi >= 0) & (yi < H) & (xi >= 0) & (xi < W)
        yc, xc = np.clip(yi, 0, H - 1), np.clip(xi, 0, W - 1)
        k_ = np.where(inside, known[yc, xc], 1.0) * w  # outside his picture: known, and empty
        acc += np.where(inside[..., None], pm[yc, xc], 0) * k_[..., None]
        wsum += k_
    ok = wsum > 0.3
    P = np.where(ok[..., None], acc / np.maximum(wsum[..., None], 1e-6), 0)
    idx = np.arange(NT)
    ring = np.zeros(4, np.float32)
    for i in range(len(rr)):
        good = np.nonzero(ok[i])[0]
        if len(good) >= NT // 20:
            ring = np.median(P[i, good], 0)  # the ring as he painted it, on average
        if len(good) == 0:
            P[i] = ring
            continue
        if len(good) == NT:
            continue
        # Along the ring from the known angles either side: a short gap is bridged straight across, a
        # long one blends from each side into the ring's own average over FADE bins, so a crow-sized hole
        # leaves no long smear and no hard edge where the visible arc ends.
        bad = idx[~ok[i]]
        gx = np.concatenate([good - NT, good, good + NT])
        pos = np.searchsorted(gx, bad)
        left, right = gx[pos - 1], gx[pos]
        dl, dr = bad - left, right - bad
        t = (dl / (dl + dr))[:, None]
        lin = P[i, left % NT] * (1 - t) + P[i, right % NT] * t
        b_ = np.clip(np.minimum(dl, dr) / FADE, 0, 1)[:, None]
        P[i, bad] = lin * (1 - b_) + ring[None, :] * b_
    return P


POLAR = polar_vortex()


def vortex_sheet(deg, scale):
    """His vortex (sheet pixels, padded, premultiplied) spun by deg (clockwise) and scaled by its radius."""
    H, W = LAY['L']['rgb'].shape[0] + 2 * PADS, LAY['L']['rgb'].shape[1] + 2 * PADS
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    dx, dy = xx - (VCX + PADS), yy - (VCY + PADS)
    r = np.hypot(dx, dy) / scale
    t = (np.arctan2(dy, dx) - np.deg2rad(deg)) % (2 * np.pi) / (2 * np.pi) * NT
    ri = np.clip(np.round(r / DR).astype(int), 0, POLAR.shape[0] - 1)
    t0 = np.floor(t).astype(int) % NT
    ft = (t - np.floor(t))[..., None]
    v = POLAR[ri, t0] * (1 - ft) + POLAR[ri, (t0 + 1) % NT] * ft
    v[r >= RMAX - DR] = 0
    return v


def stepped(A):
    out = np.zeros(A.shape, np.uint8)
    for lo, a in ALEVELS:
        out[(A >= lo) & (out == 0)] = a
    return out


def quantize_veil(cov, col, opaque=None):
    """Coverage + colour -> RGBA with stepped alpha; opaque pixels from `opaque` (the vortex: the veil's own
    violets only, never the crows' greyed ones; the smoke between the flock's crows: either), translucent
    ones from the veil's."""
    pal = PAL_OPAQUE if opaque is None else opaque
    out = np.zeros(cov.shape + (4,), np.uint8)
    a = stepped(cov)
    op = a == 255
    tr = (a > 0) & ~op
    out[op, :3] = pal[snap_idx(col, pal)][op]
    out[tr, :3] = VEIL[snap_idx(col, VEIL)][tr]
    out[..., 3] = a
    return out


def dim(v, A, C, glow):
    """Its bright violet dimmed to translucent by `glow` (never his dark: that would turn into a grey
    film on the ground)."""
    if glow >= 1:
        return v
    bright = (v[..., 3] > 0) & (lum(C) > 42)
    new = stepped(A * glow)
    tr = bright & (new > 0) & (new < 255)
    v[tr, :3] = VEIL[snap_idx(C, VEIL)][tr]
    v[bright, 3] = new[bright]
    v[bright & (new == 0)] = 0
    return v


def vortex(deg=0.0, scale=1.0, glow=1.0):
    """His vortex on the game grid, spun and scaled about its eye in polar space."""
    rgb, a = unpremul(vortex_sheet(deg, scale))
    A, C = shrink_pic('L', rgb, a, padded=True)
    return ('veil', dim(quantize_veil(A, C, VEIL), A, C, glow))


def his_veil(key):
    rgb, alpha = LAY[key]['veil']
    A, C = shrink_pic(key, rgb, alpha)
    return quantize_veil(A, C, VEIL if key == 'L' else None)


SMOKE = his_veil('R')
SMOKE_PARTS = sorted(components(SMOKE[..., 3] > 0), key=lambda P: (-len(P), P[0]))


def smoke(share=1.0, tail=None, dx=0, dy=0):
    """His smoke behind the flock: `share` of it (its big wisps first, each kept or dropped whole, so none
    is cut straight and no crumbs float), or only the wisps trailing left of `tail` (game px from the anchor)."""
    v = np.zeros_like(SMOKE)
    total = sum(len(P) for P in SMOKE_PARTS)
    got = 0
    for P in SMOKE_PARTS:
        A_ = np.array(P)
        if tail is not None and A_[:, 1].mean() >= OAX + tail:
            continue
        if got >= share * total:
            break
        v[A_[:, 0], A_[:, 1]] = SMOKE[A_[:, 0], A_[:, 1]]
        got += len(P)
    return ('veil', move(v, dx, dy))


# --- frames ------------------------------------------------------------------------------------------------

def darkened(rgba, m, eyes, k):
    """A crow still deep in the vortex: his pixels darkened toward his darkest violets, eyes lit."""
    out = rgba.copy()
    d = m & ~eyes
    out[d, :3] = SOLID[snap_idx(rgba[..., :3].astype(np.float32) * (1 - k), SOLID)][d]
    return out


def place(p, dx=0, dy=0, mirror=False, wings='up', dark=0.0):
    """A piece moved by whole pixels, its wings beaten, mirrored about its eye (to turn round), darkened."""
    if p['kind'] == 'crow':
        m, rgba, eyes = pose(p['name'], wings)
    else:
        m, rgba, eyes = p['fmask'], p['frgba'], p['eyes']
    if mirror:
        ex2 = int(round(2 * p['eye'][0] - 1))  # pixel i (centre i + 0.5) -> 2 * eye - i - 1
        src = ex2 - np.arange(OW)
        ok = (src >= 0) & (src < OW)
        nm, nr, ne = np.zeros_like(m), np.zeros_like(rgba), np.zeros_like(eyes)
        nm[:, ok] = m[:, src[ok]]
        nr[:, ok] = rgba[:, src[ok]]
        ne[:, ok] = eyes[:, src[ok]]
        m, rgba, eyes = nm, nr, ne
    if dark:
        rgba = darkened(rgba, m, eyes, min(dark, 0.5))
    return ('piece', move(m, dx, dy), move(rgba, dx, dy), move(eyes, dx, dy))


def compose(items, his=None):
    """A frame, back to front: veils are laid over what is below them (and snapped back to the palette
    and the alpha steps), pieces are pasted. Then the clean-up: gaps shut in by the swarm are closed,
    specks of 3 px or less go, and a piece's dark edge on open air gets his outline."""
    acc = np.zeros((OH, OW, 4), np.float32)
    eyes = np.zeros((OH, OW), bool)
    pasted = np.zeros((OH, OW), bool)
    layers_ = np.zeros((OH, OW), np.int32)  # how many veils lie on a pixel (one: its own colour stands)
    single = np.zeros((OH, OW, 4), np.uint8)
    for it in items:
        if it[0] == 'veil':
            on = it[1][..., 3] > 0
            layers_ += on & ~pasted
            single[on] = it[1][on]
            v = it[1].astype(np.float32)
            a = v[..., 3:4] / 255
            da = acc[..., 3:4] / 255
            oa = a + da * (1 - a)
            acc[..., :3] = np.where(oa > 0, (v[..., :3] * a + acc[..., :3] * da * (1 - a)) / np.maximum(oa, 1e-6), 0)
            acc[..., 3:4] = oa * 255
            pasted &= ~(v[..., 3] > 0)
            eyes &= ~(v[..., 3] > 0)
        else:
            _, m, rgba, ey = it
            acc[m] = rgba[m]
            pasted |= m
            eyes = (eyes & ~m) | ey
    a = acc[..., 3] / 255
    col = acc[..., :3].copy()
    # Translucency belongs to the veil's soft outer edge. A soft pixel shut in between his crows and his
    # vortex (more than two pixels from open air) would show the ground through the swarm as a grey
    # speck, so it is laid solid in its own colour.
    a = np.where((a > 0.05) & ~dilate(a <= 0.05, 2), 1.0, a)
    f = np.zeros((OH, OW, 4), np.uint8)
    f[pasted] = acc[pasted].astype(np.uint8)
    mixed = ~pasted & (a > 0.05)
    if mixed.any():
        q = quantize_veil(a, col)
        f[mixed] = q[mixed]
        one = mixed & (layers_ == 1)
        f[one, :3] = single[one, :3]
        f[one, 3] = np.where(a[one] >= 0.999, 255, single[one, 3])
    # Specks of 3 px or less (a crumb of a moved veil or a cut) go.
    for pts in components(f[..., 3] > 0):
        if len(pts) <= 3:
            P = np.array(pts)
            f[P[:, 0], P[:, 1]] = 0
            pasted[P[:, 0], P[:, 1]] = False
    # Gaps shut in by the swarm (his background showing between crows that overlap, or crows moved apart)
    # are closed: in his pictures with his own pixel there, between them from the pixels round the gap,
    # so the ground never shows through the middle of the flock.
    open_ = f[..., 3] == 0
    shut = open_ & ~flood4(open_)
    if shut.any():
        if his is not None:
            f[shut, :3] = PAL_OPAQUE[snap_idx(his, PAL_OPAQUE)][shut]
            f[shut, 3] = 255
        else:
            m = ~open_
            while shut.any():
                for dy, dx in ((0, -1), (-1, 0), (0, 1), (1, 0)):
                    src = shift_bool(m, dy, dx) & shut
                    if src.any():
                        f[src] = shift_bool(f, dy, dx)[src]
                        f[src, 3] = 255
                        m |= src
                        shut &= ~src
                        pasted |= src & shift_bool(pasted, dy, dx)
    open_ = f[..., 3] == 0
    dark_edge = pasted & dilate(open_, 1) & ~open_ & ~eyes & (lum(f) < EDGE_LUM)
    f[dark_edge, :3] = OUTLINE
    return f


O = np.array([OAX, OAY], np.float32)  # the swarm's centre (the anchor)
VC = np.array(to_game('L', VCX + PICS['L'][0], VCY + PICS['L'][1]), np.float32)  # the vortex's eye
PAIRS = {'L1': 'R1', 'L2': 'R2', 'L3': 'R6', 'L4': 'R5'}  # out: who becomes who (by place in the swarm)
EMERGE = ['R3', 'R4']  # in the flock only: they come up out of the vortex on the way out
BACK = {'R2': 'L2', 'R4': 'L3', 'R5': 'L4'}  # back: the flock crows nearest each of his left picture's places
SINK = ['R1', 'R3', 'R6']  # ... and the rest sink back into the vortex as it opens (behind it)
RISE = 'L1'  # ... while L1, whose place is far from every flock crow, comes up out of its outer swirl
PHI = 8.0  # how far the swarm turns (degrees, clockwise) on its way out
T_OUT = (0.25, 0.5, 0.75)  # how far frames 1-3 are on the way from his left picture to his right one
# Wing beats through the loop (f0..f5), two flights so the swarm never beats as one; his pictures are 'up'.
BEATS = {'A': ['up', 'mid', 'down', 'mid', 'up', 'down'], 'B': ['up', 'down', 'mid', 'up', 'up', 'mid']}
GROUP = {'L1': 'A', 'R1': 'A', 'L3': 'A', 'R6': 'A', 'R4': 'A', 'L2': 'B', 'R2': 'B', 'L4': 'B', 'R5': 'B', 'R3': 'B'}


def turn(pt, centre, deg, rho=1.0):
    a = np.deg2rad(deg)
    d = (np.asarray(pt, np.float32) - centre) * rho
    return centre + np.array([d[0] * np.cos(a) - d[1] * np.sin(a), d[0] * np.sin(a) + d[1] * np.cos(a)], np.float32)


def swirl(p, q, t, phi=PHI):
    """From p to q at t, bowed round the swarm's centre (the swarm turns as it changes)."""
    base = np.asarray(p, np.float32) + (np.asarray(q, np.float32) - p) * t
    return turn(base, O, phi * np.sin(np.pi * t))


def eye(name):
    return np.asarray(BY[name]['eye'], np.float32)


TRACE = []  # (name, eye position) of every crow placed in the frame being built, for the travel report


def at(name, pos, **kw):
    p = BY[name]
    d = np.round(np.asarray(pos) - eye(name)).astype(int)
    if p['kind'] == 'crow':
        TRACE.append((name, eye(name) + d))
    return place(p, int(d[0]), int(d[1]), **kw)


def feathers(key, deg=0.0, dx=0, dy=0, rho=1.0, centre=None, only=None):
    """His loose feathers of a picture, carried round the vortex by deg and drifted by (dx, dy)."""
    c = VC if centre is None else centre
    names = FEATHERS[key] if only is None else [n for i, n in enumerate(FEATHERS[key]) if i % only[0] == only[1]]
    return [at(n, turn(eye(n), c, deg, rho) + np.array([dx, dy], np.float32)) for n in names]


def key_frame(key):
    """His picture: his veil, his feathers and crows as he cut them (the vortex showing between the
    feathers); a gap in a crow with nothing of his behind it takes the crow's own neighbouring pixel."""
    v = his_veil(key)
    under = v[..., 3] > 0
    items = [('veil', v)]
    for n in FEATHERS[key] + ORDER[key]:
        p = BY[n]
        add = p['fmask'] & ~p['mask'] & ~under
        items.append(('piece', p['mask'] | add, np.where(add[..., None], p['frgba'], p['rgba']), p['eyes']))
    L = LAY[key]
    _, his = shrink_pic(key, L['rgb'], np.ones(L['rgb'].shape[:2], np.float32))
    return compose(items, his)


def wings(n, i):
    return BEATS[GROUP[n]][i]


POS = {}  # fly frame -> {crow: eye position}


def fly():
    """The loop: his left picture (0), the swarm breaking out of the vortex round a spiral (1-3), his
    right picture (4), the flock curling back round the vortex as it opens again (5)."""
    f0 = key_frame('L')
    f4 = key_frame('R')
    TRACE.clear()
    # 1: the crows ride out round the vortex, a quarter of the way; it spins and starts to close.
    f1 = compose([vortex(20)] + feathers('L', 16, -4, 1) +
                 [at(n, swirl(eye(n), eye(PAIRS[n]), T_OUT[0]), wings=wings(n, 1)) for n in ORDER['L']])
    POS[1] = dict(TRACE)
    TRACE.clear()
    # 2: half way: they break out to the right (the two looking back turn round), the first two of the
    # flock come up out of the vortex behind its swirl, the vortex closes, the feathers stream back.
    f2 = compose([at(n, swirl(VC, eye(n), 0.5), wings=wings(n, 2), dark=0.5) for n in EMERGE] +
                 [vortex(40, 0.85, glow=0.9)] +
                 feathers('L', 30, -10, 2, only=(2, 0)) + feathers('R', 0, 10, -2, only=(2, 1)) +
                 [at(n, swirl(eye(n), eye(PAIRS[n]), T_OUT[1]), mirror=BY[n]['face'] < 0, wings=wings(n, 2)) for n in ORDER['L']])
    POS[2] = dict(TRACE)
    TRACE.clear()
    # 3: his flock nearly closed up, the vortex a small whirl behind it, his smoke trailing in.
    partner = {v: k for k, v in PAIRS.items()}

    def r3(n):
        start = eye(partner[n]) if n in partner else VC
        return at(n, swirl(start, eye(n), T_OUT[2]), wings=wings(n, 3))
    f3 = compose([vortex(60, 0.65, glow=0.75), smoke(0.7, dx=4)] + feathers('R', 0, 5, -1) + [r3(n) for n in ORDER['R']])
    POS[3] = dict(TRACE)
    TRACE.clear()

    # 5: the flock curls back round the vortex as it opens again: three crows head for his left
    # picture's places, three sink back into the vortex behind its swirl, L1 comes up out of its outer
    # swirl; the tail of the smoke is left behind.
    def back(n):
        dest = eye(BACK[n])
        return at(n, eye(n) + (dest - eye(n)) * 0.5, wings=wings(n, 5), mirror=BY[BACK[n]]['face'] < 0)
    sink = [at(n, eye(n) + (VC - eye(n)) * (0.4 if n == 'R6' else 0.5), wings=wings(n, 5), dark=0.5) for n in SINK]
    u = (VC - eye(RISE)) / np.linalg.norm(VC - eye(RISE))
    rise = at(RISE, eye(RISE) + u * 18, wings=wings(RISE, 5), dark=0.4)
    f5 = compose([smoke(tail=-34, dx=-8, dy=1)] + sink + [rise] + [vortex(-20, 1.0)] +
                 feathers('R', 0, -9, 1) + feathers('L', -16, 4, -1) + [back(n) for n in BACK])
    POS[5] = dict(TRACE)
    TRACE.clear()
    return [f0, f1, f2, f3, f4, f5]


def summon():
    """Our proposal (he painted only the fly frames): at the caster his vortex opens, spinning, and the
    crows come up out of it (dark at first, their eyes lit) and spiral out round it into his left picture.
    Their wings beat mid and up, all up by the last frame before his picture."""
    def ring_(names, rho, deg, i, dark=0.0):
        return [at(n, turn(eye(n), VC, deg, rho), wings=['mid', 'up'][(j + i) % 2], dark=dark) for j, n in enumerate(names)]
    s0 = compose([vortex(-150, 0.3, glow=0.75)] + feathers('L', -120, 0, 0, 0.3, only=(3, 0)))
    s1 = compose(ring_(['L2', 'L3'], 0.5, -100, 0, dark=0.5) + [vortex(-115, 0.5, glow=0.9)] +
                 feathers('L', -95, 0, 0, 0.5, only=(2, 0)))
    s2 = compose([vortex(-85, 0.7)] + feathers('L', -70, 0, 0, 0.7) + ring_(['L4', 'L1'], 0.66, -72, 0, dark=0.45) +
                 ring_(['L2', 'L3'], 0.72, -66, 1, dark=0.3))
    s3 = compose([vortex(-55, 0.88)] + feathers('L', -45, 0, 0, 0.84) + ring_(ORDER['L'], 0.86, -42, 0, dark=0.15))
    s4 = compose([vortex(-25)] + feathers('L', -20, 0, 0, 0.94) + [at(n, turn(eye(n), VC, -20, 0.94), wings='up') for n in ORDER['L']])
    return [s0, s1, s2, s3, s4, key_frame('L')]


frames = {'fly': fly(), 'summon': summon()}


# --- checks (the build fails on any of them) ------------------------------------------------------------------

def frame_stats(f):
    a = f[..., 3] > 0
    open_ = ~a
    shut = int((open_ & ~flood4(open_)).sum())
    specks = sum(1 for pts in components(a) if len(pts) <= 3)
    return {'opaque': int(a.sum()), 'enclosed': shut, 'specks': specks}


POS[0] = {n: eye(n) for n in ORDER['L']}
POS[4] = {n: eye(n) for n in ORDER['R']}
# How far each crow moves from frame to frame (game px): the same crow, or the crow it becomes (out: his
# left picture's crow -> its flock partner at frame 3; back: a flock crow -> his left picture's crow
# whose place it heads for at frame 0). Crows that come up out of the vortex or sink into it appear or
# vanish behind it and are not counted.
BECOMES = {(2, 3): PAIRS, (5, 0): BACK}
TRAVEL = []
for i in range(6):
    j = (i + 1) % 6
    ren = BECOMES.get((i, j), {})
    step = {}
    for n, src in POS[i].items():
        m_ = ren.get(n, n)
        if m_ in POS[j]:
            step[n if m_ == n else f'{n}->{m_}'] = round(float(np.linalg.norm(POS[j][m_] - src)), 1)
    TRAVEL.append(step)
    print(f'fly {i} -> {j} crow travel (px):', step)
STATS = {anim: [frame_stats(f) for f in fr] for anim, fr in frames.items()}
for anim, st in STATS.items():
    print(anim, 'opaque', [s['opaque'] for s in st], 'enclosed', [s['enclosed'] for s in st], 'specks', [s['specks'] for s in st])
FAILS = []
for anim, fr in frames.items():
    for i, f in enumerate(fr):
        a = f[..., 3] > 0
        if a[0].any() or a[-1].any() or a[:, 0].any() or a[:, -1].any():
            FAILS.append(f'{anim} {i} touches the work canvas edge')
        if STATS[anim][i]['enclosed'] > 20:
            FAILS.append(f'{anim} {i}: {STATS[anim][i]["enclosed"]} enclosed transparent px')
        if STATS[anim][i]['specks']:
            FAILS.append(f'{anim} {i}: {STATS[anim][i]["specks"]} specks of 3 px or less')
mass = [s['opaque'] for s in STATS['fly']]
for i in range(len(mass)):
    j = (i + 1) % len(mass)
    ratio = mass[j] / mass[i]
    if not 0.8 <= ratio <= 1.25:
        FAILS.append(f'fly {i} -> {j}: opaque mass {mass[i]} -> {mass[j]} ({ratio:.2f}x, allowed 0.80-1.25)')
for i, step in enumerate(TRAVEL):
    for n, d in step.items():
        if d > 25:
            FAILS.append(f'fly {i} -> {(i + 1) % 6}: {n} moves {d} px (allowed 25)')
for msg in FAILS:
    print('CHECK FAILED:', msg)
if FAILS and os.environ.get('CROWS_DEV') != '1':  # CROWS_DEV=1: keep going (debug images), never for the real build
    sys.exit(1)

# Crop every frame to their union, one clear pixel all round.
union = np.zeros((OH, OW), bool)
for fr in frames.values():
    for f in fr:
        union |= f[..., 3] > 0
ys, xs = np.nonzero(union)
CX0, CY0, CX1, CY1 = int(xs.min()) - 1, int(ys.min()) - 1, int(xs.max()) + 2, int(ys.max()) + 2  # inside the work canvas: no frame touches its edge
frames = {k: [f[CY0:CY1, CX0:CX1] for f in fr] for k, fr in frames.items()}
FSIZE = (CX1 - CX0, CY1 - CY0)
FANCHOR = (OAX - CX0, OAY - CY0)
print('frame', FSIZE, 'anchor', FANCHOR)


# --- the data module --------------------------------------------------------------------------------------

# Symbols for the palette: ASCII first, then Latin-1 letters (one UTF-16 unit each, never a digit).
ALPH = ('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+,-./:;<=>?@[]^_{|}~'
        'ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ')


def write_module(frames, size, anchor, note):
    colors = {}

    def cid(px):
        key = '#%02x%02x%02x%02x' % tuple(int(v) for v in px)
        if key not in colors:
            colors[key] = len(colors) + 1
        return colors[key]
    OW_, OH_ = size
    enc = {}
    for anim, fr in frames.items():
        enc[anim] = []
        for img in fr:
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
            enc[anim].append(rows)
    assert len(colors) < len(ALPH), len(colors)
    pal = ['#00000000'] + list(colors.keys())
    ts = ["// Generated by tools/refs/crows-from-ref.py from the owner's genjutsu sheet. Do not edit by hand.", '//']
    ts += ['// ' + line for line in note]
    ts += ['//', f'// Each frame is {OW_}x{OH_} with the anchor at ({anchor[0]}, {anchor[1]}). Rows are run-length encoded: a symbol',
           '// (an index into PALETTE through ALPHABET, 0 = clear) followed by its repeat count when above one.', '']
    ts.append(f'export const SIZE: [number, number] = [{OW_}, {OH_}];')
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
    print('colors', len(colors), 'bytes', os.path.getsize(OUT_TS))


note = [
    "The crow swarm (vfx_beasts/genjutsu), copied from his genjutsu sheet's BEAST panel, where he painted",
    "a swarm over our single crow: his left picture (crows circling a vortex) is fly frame 0 and the last",
    "summon frame, his right picture (the flock streaming right) is fly frame 4. The other frames move",
    "his crows as cut-out pieces (whole pixels, mirrored; his wing pixels turned about the shoulder for",
    "the beat), spin and close his vortex in polar space, trail his smoke in and out, drift his feathers.",
    f"Scale: his character is {HIS_CHAR_H:.0f} px tall in that sheet, ours {CHAR_H:.0f}.",
]
write_module(frames, FSIZE, FANCHOR, note)


# --- debug and review material ------------------------------------------------------------------------------

def save_whole(img, path):
    tmp = path + '.part'
    img.save(tmp, format='PNG')
    os.replace(tmp, path)


def his_at_scale(key):
    """His picture area-averaged to the game grid on our anchor (no palette), on his background."""
    L = LAY[key]
    A, C = shrink_pic(key, L['rgb'], np.ones(L['rgb'].shape[:2], np.float32))
    out = np.zeros((OH, OW, 4), np.uint8)
    out[..., :3] = np.clip(np.round(C), 0, 255)
    out[..., 3] = np.where(A > 0.99, 255, 0)
    return out[CY0:CY1, CX0:CX1]


if DEBUG:
    os.makedirs(DEBUG, exist_ok=True)
    for k in PICS:
        save_whole(Image.fromarray(his_at_scale(k), 'RGBA'), os.path.join(DEBUG, f'crows-his-{k}.png'))
    info = {'ref': os.path.basename(REF), 'scale': S, 'hisCharacter': heights, 'pictures': PICS, 'panel': PANEL,
            'anchors': {k: [ANCH[k][0] + PICS[k][0], ANCH[k][1] + PICS[k][1]] for k in PICS},
            'frame': FSIZE, 'anchor': FANCHOR, 'vortex': [VCX + PICS['L'][0], VCY + PICS['L'][1], VRAD],
            'stats': STATS, 'travel': TRAVEL, 'outline': OUTLINE.tolist()}
    tmp = os.path.join(DEBUG, 'crows-ref.json.part')
    with open(tmp, 'w') as fh:
        json.dump(info, fh, indent=1, default=lambda o: o.tolist() if hasattr(o, 'tolist') else str(o))
    os.replace(tmp, os.path.join(DEBUG, 'crows-ref.json'))
    W, H = FSIZE
    for anim, fr in frames.items():
        for name, bgc in (('dark', (31, 31, 41, 255)), ('green', (0x5d, 0x6b, 0x57, 255))):
            sheet = Image.new('RGBA', ((W + 2) * len(fr), H), (0, 0, 0, 255))
            for i, f in enumerate(fr):
                tile = Image.new('RGBA', (W, H), bgc)
                tile.alpha_composite(Image.fromarray(f, 'RGBA'))
                sheet.paste(tile, (i * (W + 2), 0))
            save_whole(sheet.resize((sheet.width * 2, sheet.height * 2), Image.NEAREST), os.path.join(DEBUG, f'crows-{anim}-{name}.png'))
            for i, f in enumerate(fr):
                tile = Image.new('RGBA', (W, H), bgc)
                tile.alpha_composite(Image.fromarray(f, 'RGBA'))
                save_whole(tile.resize((W * 4, H * 4), Image.NEAREST), os.path.join(DEBUG, f'f-{anim}{i}-{name}.png'))
    for k, i in (('L', 0), ('R', 4)):
        h = his_at_scale(k)
        o = frames['fly'][i]
        bg = Image.new('RGBA', (W * 2 + 4, H), (31, 31, 41, 255))
        bg.alpha_composite(Image.fromarray(h, 'RGBA'), (0, 0))
        bg.alpha_composite(Image.fromarray(o, 'RGBA'), (W + 4, 0))
        save_whole(bg.resize((bg.width * 4, bg.height * 4), Image.NEAREST), os.path.join(DEBUG, f'cmp-{k}.png'))
    vs = [his_veil('L'), vortex()[1], vortex(20, 0.92)[1], vortex(40, 0.8, 0.9)[1], vortex(60, 0.6, 0.75)[1], vortex(-20, 0.8, 0.9)[1],
          SMOKE, smoke(0.7, dx=4)[1], smoke(tail=-44, dx=-8, dy=1)[1]]
    strip = np.concatenate([v[CY0:CY1, CX0:CX1] for v in vs], 1)
    bg = Image.new('RGBA', (strip.shape[1], strip.shape[0]), (0x5d, 0x6b, 0x57, 255))
    bg.alpha_composite(Image.fromarray(strip, 'RGBA'))
    save_whole(bg.resize((bg.width * 2, bg.height * 2), Image.NEAREST), os.path.join(DEBUG, 'crows-veils.png'))
    # Every crow on its own: his cut in his picture, then lifted off at the three wing beats.
    names = ORDER['L'] + ORDER['R']
    T = 76
    rows = []
    for mode in ('exact', 'up', 'mid', 'down'):
        row = []
        for n in names:
            if mode == 'exact':
                rgba = BY[n]['rgba']
            else:
                _, m, rgba, _ = place(BY[n], wings=mode)
            cx, cy = int(BY[n]['eye'][0]), int(BY[n]['eye'][1])
            big = np.zeros((OH + 2 * T, OW + 2 * T, 4), np.uint8)
            big[T:T + OH, T:T + OW] = rgba
            row.append(big[cy + T - 50:cy + T + 40, cx + T - 62:cx + T + 52] if BY[n]['face'] < 0 else big[cy + T - 50:cy + T + 40, cx + T - 96:cx + T + 18])
        rows.append(np.concatenate(row, 1))
    allp = np.concatenate(rows, 0)
    bg = Image.new('RGBA', (allp.shape[1], allp.shape[0]), (0x5d, 0x6b, 0x57, 255))
    bg.alpha_composite(Image.fromarray(allp, 'RGBA'))
    save_whole(bg.resize((bg.width * 3, bg.height * 3), Image.NEAREST), os.path.join(DEBUG, 'crows-pieces.png'))
