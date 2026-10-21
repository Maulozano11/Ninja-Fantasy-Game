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
layer is area-averaged (a true box filter) down to the game scale on one grid (the anchor at the
centre of the swarm's mass, shared by both pictures) and snapped to a palette sampled from his pixels
at that scale in brightness bands, up to his brightest beak, rim and vortex glints, and in tiers of
chroma inside each band, so his blue-violet (indigo) sheen keeps colours of its own instead of being
averaged into the grey-violets; brightness weighs a little more than hue in the snap. So his highlights
and his sheen keep their count and level. Dark edges on open air get a 1 px outline in the colour of his
own crow edges. Every eye is the same round stamp at the traced eye, in his hue and no brighter than his:
a dark crimson ring round a dim mauve core.

The other frames are made from the same pixels, so the crows stay his: each crow is lifted off his
picture at sheet scale with its holes closed, and beats its wings with his own raised-wing pixels:
the near wing turns about the shoulder (30 and 60 degrees, nearest neighbour, before the shrink) in
front of the body, the far wing sinks behind the body (half way at 'mid', hidden at 'down'). They move
by whole pixels and are mirrored to turn round (as soon as they fly the other way); where one of his flock crows is partly hidden in his flock (a wing and a head), the whole crow
of his left picture flies its place while it is away from the flock. One-pixel hairs and loose crumbs
of the lifted pieces are left out, and so are loose black scratches of wisp, so nothing reads as a
stray line, and so is a feather tucked behind a crow's head. His vortex is unwrapped about its eye
into polar space (nearest neighbour, so its pixels come back unblurred); the parts his crows hid are
filled with his own vortex turned rigidly about its eye (so his spiral arms run on through them), and it
spins by shifting the angle and closes by scaling the radius. His faint glow streak outside the vortex
is left out (it would read as an opaque bar on any ground but his). His smoke trails in behind the flock and is left behind; his feathers drift
back. Soft pixels are kept only on the swarm's outer edge: inside it everything is solid, so the
ground never shows through his art. The 'summon' anim (our proposal: he painted only the fly frames)
opens his vortex at the caster and brings the crows out of it head first, ending on his left picture.

The result is a TypeScript data module (palette + run-length rows) that the generator
(tools/world-sprites/vfx-beast-crows.ts) decodes, so the build needs no image files. Deterministic.
The build fails if a frame has an enclosed transparent gap over 20 px, a speck of 3 px or less, an
opaque pixel on its edge, a translucent pixel more than 2 px inside the swarm, a loose bit of crow, a
mean luma more than 20 % off its neighbour's (a flash), a crow coming into or out of sight without
going behind the vortex, or (fly) an opaque mass more than 25 % off its neighbour's, a light (alpha x
luma) more than 1.5x off it, a crow moving more than 25 px from one frame to the next (R1's swoop back
to L1's place: 32), a vortex whose lit violet share is more than 30 % off his picture's (fly 1, 2, 5),
key frames whose pixels above luma 90 and 100, or of chroma above 30 and 40, are more than 20 % off his
picture's at game scale, or an eye brighter than his brightest.
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


SNAP_Y = np.array([0.299, 0.587, 0.114], np.float32)
SNAP_W = 2.0  # the weight of the squared brightness difference, on top of the RGB distance


def snap_idx(col, pal):
    """The nearest palette colour, a difference in brightness weighing a little more than a difference in
    hue, so his highlights and his darks keep their brightness when they snap, and his blue-violet sheen
    keeps its hue."""
    d = ((col[..., None, :] - pal[None, None]) ** 2).sum(-1) + SNAP_W * ((col @ SNAP_Y)[..., None] - (pal @ SNAP_Y)[None, None]) ** 2
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
# `pivot` is each wing's shoulder joint: the near wing turns about it when it beats, down and away from
# the body (a wing whose tip is left of its shoulder turns anticlockwise); the far wing sinks toward it,
# behind the body, so it never swings up into a blade or forward past the beak. `face` is the way it
# looks (1 right, -1 left).

CROWS = {
    'L': [
        # L4's outline stops at the lower edge of its raised near wing: the dark round eye of the vortex under that
        # wing (and the violet ring round it) is the vortex's, so it stays with the vortex instead of flying off as
        # a flat dark block under the crow.
        {'name': 'L4', 'cut': [(292, 921), (314, 918), (322, 914), (345, 916), (356, 925), (372, 935), (396, 941)], 'split': 330, 'near': 'hi', 'eye': (329, 928), 'face': -1,
         'pivot': {'lo': (320, 916), 'hi': (344, 919)},
         'poly': [(298, 893), (304, 891), (312, 899), (318, 907), (322, 914), (330, 916), (338, 919), (343, 924), (345, 912), (350, 904), (357, 896), (365, 889), (372, 884), (379, 879), (383, 884), (386, 896), (388, 906), (384, 911), (374, 913), (366, 917), (363, 924), (365, 932), (364, 940), (358, 946), (350, 950), (342, 950), (336, 946), (330, 944), (324, 945), (318, 944), (315, 939), (317, 932), (315, 926), (309, 919), (303, 909), (298, 900)]},
        {'name': 'L1', 'cut': [(268, 862), (293, 860), (298, 855), (322, 855), (329, 860), (346, 864), (380, 862)], 'split': 320, 'near': 'hi', 'eye': (308, 863), 'face': -1,
         'pivot': {'lo': (297, 859), 'hi': (326, 859)},
         'poly': [(276, 838), (282, 840), (288, 846), (296, 851), (302, 855), (310, 855), (318, 857), (322, 860), (326, 856), (332, 848), (338, 840), (343, 833), (348, 826), (356, 820), (364, 814), (370, 809), (374, 811), (375, 820), (375, 832), (372, 842), (366, 850), (358, 857), (350, 861), (345, 868), (343, 878), (340, 888), (335, 896), (326, 900), (316, 897), (309, 892), (304, 884), (299, 878), (295, 873), (294, 867), (296, 863), (290, 861), (284, 857), (279, 851), (275, 844)]},
        # L2 sits on L3's raised wing: its belly under the head is cut along that wing in his picture, so the
        # lifted crow leaves that cut edge (a drip under the throat) behind (`trim`).
        {'name': 'L2', 'cut': [(395, 866), (428, 866), (440, 856), (448, 846), (458, 843), (472, 841), (492, 841)], 'split': 449, 'near': 'lo', 'eye': (468, 852), 'face': 1,
         'pivot': {'lo': (446, 845), 'hi': (453, 843)}, 'trim': [(452, 864), (474, 864), (474, 878), (452, 878)],
         'poly': [(406, 808), (411, 809), (418, 819), (425, 827), (432, 834), (440, 839), (447, 843), (453, 841), (459, 835), (466, 828), (474, 821), (481, 815), (486, 812), (488, 817), (483, 826), (477, 834), (471, 841), (473, 846), (479, 852), (484, 858), (487, 864), (481, 865), (473, 863), (468, 867), (466, 872), (462, 872), (446, 871), (436, 868), (428, 863), (420, 859), (412, 853), (405, 847), (401, 839), (400, 829), (402, 818)]},
        # L3's outline hugs its beak: the dark smoke streak under it is the vortex's, not the crow's. It
        # also hugs the tip of its raised near wing: the dark stripe edge running right from it is the vortex's.
        {'name': 'L3', 'cut': [(365, 932), (400, 936), (420, 918), (430, 914), (440, 913), (458, 913), (475, 913)], 'split': 431, 'near': 'lo', 'eye': (446, 924), 'face': 1,
         'pivot': {'lo': (430, 913), 'hi': (447, 912)},
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


def tiers(px, spec):
    """Luma bands sampled separately in tiers of chroma (max - min channel): {(lo, hi): (edges, counts)}. His
    blue-violet sheen, where blue stands well clear of green, keeps entries of its own in every band instead
    of being averaged into the many grey-violets around it."""
    ch = px.max(1) - px.min(1)
    lu = lum(px)
    return np.unique(np.concatenate([bands(px[(ch >= lo) & (ch < hi)], lu[(ch >= lo) & (ch < hi)], e, n) for (lo, hi), (e, n) in spec.items()]), axis=0)


# Crows and feathers: his black-violets, his lit feathers, and his brightest (pale beaks, lilac sheen), with
# his blue-violet (indigo) sheen sampled on its own: chroma 30-40 and 40 up, in every band.
SOLID = tiers(plain, {(0, 25): ([0, 60, 85, 98, 112, 999], [12, 6, 4, 3, 3]),
                      (25, 32): ([0, 45, 60, 75, 95, 999], [3, 2, 2, 2, 1]),
                      (32, 40): ([0, 30, 45, 60, 70, 85, 999], [2, 2, 2, 2, 2, 1]),
                      (40, 999): ([0, 40, 55, 70, 85, 999], [2, 2, 2, 2, 2])})
veil_cols = []
for k in PICS:
    rgb_, a_ = LAY[k]['veil']
    A_, C_ = shrink_pic(k, rgb_, a_)
    veil_cols.append(C_[A_ >= 0.5])
veil_cols = np.concatenate(veil_cols + [crow_cols[mag]])
# The veil: his vortex's dark, its violet, its magenta stripes and their brightest light.
VEIL = tiers(veil_cols, {(0, 25): ([0, 20, 40, 999], [3, 2, 1]),
                         (25, 35): ([0, 20, 40, 70, 999], [1, 1, 1, 1]),
                         (35, 45): ([0, 20, 30, 45, 70, 999], [1, 1, 1, 1, 1]),
                         (45, 999): ([0, 30, 45, 70, 92, 104, 999], [2, 2, 5, 7, 3, 4])})
GLOW = VEIL[lum(VEIL) >= 40]
GLOW_D = float(np.sqrt(((GLOW[lum(GLOW) >= 70].mean(0) - BG) ** 2).sum()))  # how far his vortex's lit violet stands from his background
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

# His eyes: a dark crimson ring round a dim mauve core (his hue and level: his brightest eye pixels are
# about (146, 99, 117) to (156, 109, 143), luma 115-127, round a crimson-violet glow), the same round stamp
# on every crow, centred on the traced eye. Plain eyes, as he painted them.
EYE_RING, EYE_MID, EYE_CORE = (np.array(c, np.float32) for c in ((85, 25, 55), (120, 55, 88), (150, 95, 125)))
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


# --- the wing beat: his own raised wings, the near one turned about the shoulder, the far one sunk ---------

WING_DEG = {'up': 0, 'mid': 30, 'down': 60}  # the near wing's turn about its shoulder
FAR_SINK = 0.45  # at 'mid' the far wing sinks this much of its length toward its shoulder, behind the body
FRAG = 10  # game px: in the in-betweens, loose crumbs smaller than this (a crow's or a wisp's) are left out
FRAG_V = 25  # game px: a loose scratch of black wisp (or of the spun vortex) smaller than this is left out of the frames we make


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
    raised wings found above the shoulder line (minus the head) with their shoulder joints. `gap` is where
    his vortex's purple showed between its feathers: closed, but see-through wherever the crow flies over
    something (the vortex, another crow), as he painted it."""
    L = LAY[key]
    x0, y0 = PICS[key][:2]
    m, rgb = fill_holes(cr['mask'], L['rgb'])
    if 'trim' in cr:  # a cut edge that would hang loose off the lifted crow
        m &= ~poly_mask(cr['trim'], m.shape, (x0, y0))
    c = L['rgb']
    vivid = (c.max(2) - c.min(2) > 40) & (c[..., 1] < 0.5 * np.maximum(c[..., 0], c[..., 2])) & (key == 'L')
    H, W = m.shape
    yy, xx = np.mgrid[0:H, 0:W]
    out = {'mask': pad(m), 'rgb': pad(rgb), 'gap': pad(m & ~cr['mask'] & vivid), 'wings': []}
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
                                 'tip': (xs[tip] + PADS, ys[tip] + PADS), 'above': pad(yy < line[None, :]),
                                 'sign': 1 if xs[tip] > px - x0 else -1, 'near': side == cr['near']})
    return out


SHEET = {cr['name']: sheet_crow(k, cr) for k in PICS for cr in LAY[k]['crows']}
_poses = {}


def pose(name, mode):
    """(mask, rgba, eyes, see) of his crow `name` at its place in his picture, wings 'up' (as he painted
    them), 'mid' or 'down', shrunk to the game scale, snapped, gaps closed, eye stamped. The near wing turns
    down about its shoulder by 30 or 60 degrees, in front of the body. The far wing goes down behind the body:
    at 'mid' it sinks toward its shoulder along its own length (FAR_SINK of it), and only what is still above
    the shoulder line shows (his tip, over the back); at 'down' it is hidden behind the body. So it never
    swings up into a blade over the head or out past the beak. `see`: the gaps between its feathers where his
    vortex showed through (see-through over anything)."""
    k = (name, mode)
    if k in _poses:
        return _poses[k]
    sc = SHEET[name]
    key = BY[name]['key']
    if mode == 'up' or not sc['wings']:
        cov, col, gap = sc['mask'], sc['rgb'], sc['gap']
    else:
        allw = np.zeros_like(sc['mask'])
        for w in sc['wings']:
            allw |= w['mask']
        cov = np.zeros_like(sc['mask'])
        gap = np.zeros_like(sc['mask'])
        col = np.zeros_like(sc['rgb'])
        for it in [w for w in sc['wings'] if not w['near']] + ['body'] + [w for w in sc['wings'] if w['near']]:
            if it == 'body':
                pm, pc, pg = sc['mask'] & ~allw, sc['rgb'], sc['gap']
            elif not it['near']:
                if mode == 'down':
                    continue
                dx = -int(round(FAR_SINK * (it['tip'][0] - it['pivot'][0])))
                dy = -int(round(FAR_SINK * (it['tip'][1] - it['pivot'][1])))
                pm = shift_bool(it['mask'], dy, dx) & it['above']
                pc = shift_bool(sc['rgb'], dy, dx)
                pg = shift_bool(it['mask'] & sc['gap'], dy, dx) & it['above']
            else:
                pm, pc = turn_nn(it['mask'], sc['rgb'], it['sign'] * WING_DEG[mode], *it['pivot'])
                pg = turn_nn(it['mask'] & sc['gap'], sc['rgb'], it['sign'] * WING_DEG[mode], *it['pivot'])[0]
            cov[pm] = True
            col[pm] = pc[pm]
            gap[pm] = pg[pm]
    A, C = shrink_pic(key, col, cov, padded=True)
    Ag = shrink_pic(key, col, gap, padded=True)[0]
    m = A >= 0.5
    nb = nb4(m)
    m = (m & (nb >= 1)) | (~m & (nb >= 3) & (A >= 0.2))
    for pts in components(m):
        if len(pts) <= 3:
            m[tuple(np.array(pts).T)] = False
    # Lifted off his picture, a crow is one piece: a hair one pixel wide (a wisp of the vortex his cut
    # caught at a wing tip, a turned tip's jag) or a crumb left floating beside it (under FRAG px) would
    # read as a stray line once the crow flies over open ground. In his pictures they sit on the vortex.
    for _ in range(2):
        m &= hood(m) > 3
    for pts in components(m):
        if len(pts) < FRAG:
            m[tuple(np.array(pts).T)] = False
    rgba = np.zeros((OH, OW, 4), np.uint8)
    rgba[m, :3] = snap_crow(C)[m]
    rgba[m, 3] = 255
    m, rgba = fill_holes(m, rgba)
    m, rgba, eyes = stamp_eye(m, rgba, *EYES_AT[name])
    _poses[k] = (m, rgba, eyes, m & ~eyes & (Ag >= 0.5))
    return _poses[k]


# --- the veils: his vortex (in polar space) and his smoke -----------------------------------------------------

def premul(rgb, alpha):
    return np.concatenate([rgb * alpha[..., None], alpha[..., None]], -1)


def unpremul(pm):
    a = pm[..., 3]
    return np.where(a[..., None] > 1e-3, pm[..., :3] / np.maximum(a[..., None], 1e-3), 0), a


VCX, VCY, VRAD = VORTEX[0] - PICS['L'][0], VORTEX[1] - PICS['L'][1], VORTEX[2]
DR, RMAX, NT = 0.5, 104.0, 1440  # polar grid: radius step (sheet px), outer radius, angle bins


TURNS = [d for d in range(-180, 180, 2) if abs(d) >= 24]  # the turns (degrees) of his vortex tried for a hidden part


def turned_src(dx, dy, deg):
    """Where a point (dx, dy from the vortex's eye, sheet px) comes from when the vortex is turned by deg."""
    a = np.deg2rad(deg)
    return np.round(VCX + dx * np.cos(a) + dy * np.sin(a)).astype(int), np.round(VCY - dx * np.sin(a) + dy * np.cos(a)).astype(int)


def filled_vortex():
    """His vortex (sheet pixels, premultiplied) with the parts his crows and feathers hid filled by his own
    vortex turned rigidly about its eye: a spiral turned is still the same spiral, so his arms run on through
    the filled part instead of stacking up as rings. For each hidden part the turn is the one whose pixels best
    match his own all round its edge (so his stripes meet at the seam), among the turns that cover most of it
    with pixels he painted; what that turn leaves (its source hidden too) takes the next best turn, and so on.
    Only what no turn reaches (round the dark eye he hid almost entirely) takes the ring's own median."""
    L = LAY['L']
    rgb, alpha = L['veil']
    pm = premul(rgb, alpha).astype(np.float32)
    H, W = alpha.shape
    # What his crows hid, with the gaps between their feathers (where his vortex shows in pieces shaped like
    # the crow) and a 2 px fringe round them (their dark halo): once the crows fly off, none of it may stay
    # behind in the vortex as the ghost of a crow.
    hidden = np.zeros((H, W), bool)
    for it in L['crows'] + L['feathers']:
        hidden |= it['mask']
    for cr in L['crows']:
        hidden |= poly_mask(cr['poly'], (H, W), PICS['L'][:2])
    hidden = dilate(hidden, 2)
    yy, xx = np.mgrid[0:H, 0:W]
    dxa, dya = (xx - VCX).astype(np.float32), (yy - VCY).astype(np.float32)
    rad = np.hypot(dxa, dya)
    zone = hidden & (rad < RMAX)
    out = pm.copy()
    good = ~zone  # pixels whose colour is known (his, or filled already)
    for pts in sorted(components(zone), key=lambda P: (-len(P), P[0])):
        P = np.array(pts)
        hole = np.zeros((H, W), bool)
        hole[P[:, 0], P[:, 1]] = True
        rim = dilate(hole, 4) & ~hole & ~hidden
        ry, rx = np.nonzero(rim)
        for _ in range(6):
            hy, hx = np.nonzero(hole & ~good)
            if not len(hy):
                break
            best = None
            for d in TURNS:
                sx, sy = turned_src(dxa[hy, hx], dya[hy, hx], d)
                ok = (sx >= 0) & (sx < W) & (sy >= 0) & (sy < H)
                ok[ok] = good[sy[ok], sx[ok]]
                cover = float(ok.mean())
                if cover < 0.25:
                    continue
                tx, ty = turned_src(dxa[ry, rx], dya[ry, rx], d)
                tok = (tx >= 0) & (tx < W) & (ty >= 0) & (ty < H)
                tok[tok] = good[ty[tok], tx[tok]]
                if tok.sum() < 8:
                    continue
                err = float(np.abs(out[ry[tok], rx[tok]] - out[ty[tok], tx[tok]]).mean())
                score = err + 40.0 * (1.0 - cover)
                if best is None or score < best[0]:
                    best = (score, d)
            if best is None:
                break
            sx, sy = turned_src(dxa[hy, hx], dya[hy, hx], best[1])
            ok = (sx >= 0) & (sx < W) & (sy >= 0) & (sy < H)
            ok[ok] = good[sy[ok], sx[ok]]
            out[hy[ok], hx[ok]] = out[sy[ok], sx[ok]]
            good[hy[ok], hx[ok]] = True
    left = zone & ~good
    if left.any():
        ri = np.round(rad).astype(int)
        for r_ in np.unique(ri[left]):
            ring = (ri == r_) & ~zone
            near = r_
            while not ring.any() and near > 0:  # a ring he hid all of takes the nearest ring inside it he painted
                near -= 1
                ring = (ri == near) & ~zone
            out[left & (ri == r_)] = np.median(out[ring], 0) if ring.any() else 0
    return out


def polar_vortex():
    """His filled vortex unwrapped about its eye: rows are radii, columns angles (clockwise from +x). Nearest
    neighbour (the polar grid is finer than his pixels: 0.5 px by at most 0.45 px), so wrapped back unturned
    it gives his pixels back, and turned it moves them without blurring his stripes."""
    F = filled_vortex()
    H, W = F.shape[:2]
    rr = np.arange(0, RMAX, DR, dtype=np.float32)
    th = np.arange(NT, dtype=np.float32) * (2 * np.pi / NT)
    xi = np.round(VCX + rr[:, None] * np.cos(th)[None, :]).astype(int)
    yi = np.round(VCY + rr[:, None] * np.sin(th)[None, :]).astype(int)
    inside = (yi >= 0) & (yi < H) & (xi >= 0) & (xi < W)
    return np.where(inside[..., None], F[np.clip(yi, 0, H - 1), np.clip(xi, 0, W - 1)], 0).astype(np.float32)


POLAR = polar_vortex()


def vortex_sheet(deg, scale):
    """His vortex (sheet pixels, padded, premultiplied) spun by deg (clockwise) and scaled by its radius."""
    H, W = LAY['L']['rgb'].shape[0] + 2 * PADS, LAY['L']['rgb'].shape[1] + 2 * PADS
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    dx, dy = xx - (VCX + PADS), yy - (VCY + PADS)
    r = np.hypot(dx, dy) / scale
    t = (np.arctan2(dy, dx) - np.deg2rad(deg)) % (2 * np.pi) / (2 * np.pi) * NT
    ri = np.clip(np.round(r / DR).astype(int), 0, POLAR.shape[0] - 1)
    v = POLAR[ri, np.round(t).astype(int) % NT].copy()  # nearest: his pixels moved, never blended
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
    v = dim(faint_strips(quantize_veil(A, C, VEIL), scale), A, C, glow)
    if deg or scale != 1:  # spun or scaled: a scratch of its outer wisps turned out loose over open ground goes
        for pts in components(v[..., 3] > 0):
            if len(pts) < FRAG_V:
                P = np.array(pts)
                v[P[:, 0], P[:, 1]] = 0
    return ('veil', v, 'vortex')


def faint_strips(v, scale=1.0):
    """His vortex without the loose strips of faint glow outside its outer ring (4 px wide or less, on open
    air), barely above his background, as his faint violet streak right of L3 is: un-mixed as a glow of the
    vortex's own lit violet they are under half strength, so they are left out rather than laid as an opaque
    violet bar he did not paint, which is what they would read as on any ground but his panel."""
    a = v[..., 3]
    c = v[..., :3].astype(np.float32)
    glow_a = np.sqrt(((c - BG) ** 2).sum(-1)) / GLOW_D
    faint = (a == 255) & (lum(c) > lum(BG)) & (glow_a < 0.5)
    lit = (a > 0) & (lum(c) > lum(BG)) & (glow_a >= 0.5)
    yy, xx = np.mgrid[0:OH, 0:OW]
    out = v.copy()
    gone = np.zeros(a.shape, bool)
    for pts in components(faint):
        P = np.array(pts)
        m = np.zeros(a.shape, bool)
        m[P[:, 0], P[:, 1]] = True
        outside = np.hypot(xx[m] + 0.5 - VC[0], yy[m] + 0.5 - VC[1]).mean() > VRAD * S * scale
        if outside and not erode(m, 2).any() and (dilate(m) & (a == 0)).any():
            gone |= m & (hood(lit) == 0)  # the soft fringe hugging a lit stripe or feather stays
    out[gone] = 0
    for _ in range(3):  # and a hair one pixel wide left along the strip goes with it
        on = out[..., 3] > 0
        out[on & (hood(on) <= 3) & dilate(gone, 2)] = 0
    return out


def his_veil(key):
    rgb, alpha = LAY[key]['veil']
    A, C = shrink_pic(key, rgb, alpha)
    v = quantize_veil(A, C, VEIL if key == 'L' else None)
    return faint_strips(v) if key == 'L' else v


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
        m, rgba, eyes, see = pose(p['name'], wings)
    else:
        m, rgba, eyes = p['fmask'], p['frgba'], p['eyes']
        see = np.zeros_like(m)
    if mirror:
        ex2 = int(round(2 * p['eye'][0] - 1))  # pixel i (centre i + 0.5) -> 2 * eye - i - 1
        src = ex2 - np.arange(OW)
        ok = (src >= 0) & (src < OW)
        flip = []
        for a in (m, rgba, eyes, see):
            b = np.zeros_like(a)
            b[:, ok] = a[:, src[ok]]
            flip.append(b)
        m, rgba, eyes, see = flip
    if dark:
        rgba = darkened(rgba, m, eyes, min(dark, 0.5))
    return ('piece', move(m, dx, dy), move(rgba, dx, dy), move(eyes, dx, dy), move(see, dx, dy), p['name'])


META = {}  # id(frame) -> where its pixels came from (the vortex, the crows), for the checks


def compose(items, his=None):
    """A frame, back to front: veils are laid over what is below them (and snapped back to the palette
    and the alpha steps), pieces are pasted. Then the clean-up: gaps shut in by the swarm are closed,
    specks of 3 px or less go, soft pixels inside the swarm go solid, and a piece's dark edge on open air
    gets his outline. Items: ('veil', rgba[, 'vortex']) or ('piece', mask, rgba, eyes, see, name)."""
    if his is None:
        # A feather or wisp partly tucked behind a crow that flies over it is left out of the frames we make
        # when it would show only a sliver (a hair along a wing) or sits at the crow's head (a hook round a
        # beak, a horn behind a skull).
        keep = []
        for idx, it in enumerate(items):
            if it[0] == 'piece' and BY[it[5]]['kind'] == 'feather':
                over = np.zeros((OH, OW), bool)
                heads = np.zeros((OH, OW), bool)
                for jt in items[idx + 1:]:
                    if jt[0] == 'piece' and BY[jt[5]]['kind'] == 'crow':
                        over |= jt[1]
                        heads |= jt[3]
                vis = it[1] & ~over
                if vis.sum() < it[1].sum() and (vis.sum() < FRAG or erode(vis).sum() < 0.25 * vis.sum() or (it[1] & dilate(heads, 9)).any()):
                    continue
            keep.append(it)
        items = keep
    acc = np.zeros((OH, OW, 4), np.float32)
    eyes = np.zeros((OH, OW), bool)
    pasted = np.zeros((OH, OW), bool)
    layers_ = np.zeros((OH, OW), np.int32)  # how many veils lie on a pixel (one: its own colour stands)
    single = np.zeros((OH, OW, 4), np.uint8)
    src = -np.ones((OH, OW), np.int32)  # the item that laid each pixel last
    for idx, it in enumerate(items):
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
            pasted &= ~on
            eyes &= ~on
            src[on] = idx
        else:
            m, rgba, ey, see = it[1:5]
            if see is not None:  # the gaps between its feathers show what is behind it, if anything is
                m = m & ~(see & (acc[..., 3] >= 128))
            acc[m] = rgba[m]
            pasted |= m
            eyes = (eyes & ~m) | ey
            src[m] = idx
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
    # Specks of 3 px or less (a crumb of a moved veil or a cut) go. In the frames we make, so does a black
    # scratch of wisp under FRAG_V px left loose over open ground (his lit feathers stay).
    for pts in components(f[..., 3] > 0):
        P = np.array(pts)
        if len(pts) <= 3 or (his is None and len(pts) < FRAG_V and lum(f[P[:, 0], P[:, 1]]).mean() < 30):
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
                    src_ = shift_bool(m, dy, dx) & shut
                    if src_.any():
                        f[src_] = shift_bool(f, dy, dx)[src_]
                        f[src_, 3] = 255
                        m |= src_
                        shut &= ~src_
                        pasted |= src_ & shift_bool(pasted, dy, dx)
                        src[src_] = shift_bool(src + 1, dy, dx)[src_] - 1
    # Only now, with the shut gaps closed, is the open air known: the clear pixels that reach the frame's
    # edge. A soft pixel more than two pixels from it is inside his solid art (between his crows, in his
    # smoke, at the vortex's eye) and would show the ground through the swarm as grain, so it is laid solid
    # in the colour it shows on his background (in his pictures: his own pixel there).
    inner = (f[..., 3] > 0) & (f[..., 3] < 255) & ~dilate(flood4(f[..., 3] == 0), 2)
    if inner.any():
        a8 = f[..., 3:4].astype(np.float32) / 255
        vis = f[..., :3].astype(np.float32) * a8 + BG * (1 - a8) if his is None else his
        f[inner, :3] = PAL_OPAQUE[snap_idx(vis, PAL_OPAQUE)][inner]
        f[inner, 3] = 255
    open_ = f[..., 3] == 0
    dark_edge = pasted & dilate(open_, 1) & ~open_ & ~eyes & (lum(f) < EDGE_LUM)
    f[dark_edge, :3] = OUTLINE
    # What each pixel came from, for the checks: the vortex's visible part, the crows' pixels, and how much
    # of each crow the vortex hides (it comes up out of the vortex or sinks into it behind its swirl).
    final = f[..., 3] > 0
    vort_ids = [i for i, it in enumerate(items) if it[0] == 'veil' and len(it) > 2 and it[2] == 'vortex']
    crow_ids = {i: it[5] for i, it in enumerate(items) if it[0] == 'piece' and BY[it[5]]['kind'] == 'crow'}
    crows = {}
    for i, n in crow_ids.items():
        m = items[i][1]
        tot = max(1, int(m.sum()))
        later = [v for v in vort_ids if v > i]
        crows[n] = {'px': tot, 'behind_vortex': float((m & np.isin(src, later) & final).sum()) / tot,
                    'visible': float((m & (src == i) & final).sum()) / tot}
    META[id(f)] = {'vortex': final & np.isin(src, vort_ids), 'crowpx': final & np.isin(src, list(crow_ids)), 'crows': crows}
    return f


O = np.array([OAX, OAY], np.float32)  # the swarm's centre (the anchor)
VC = np.array(to_game('L', VCX + PICS['L'][0], VCY + PICS['L'][1]), np.float32)  # the vortex's eye
PAIRS = {'L1': 'R1', 'L2': 'R2', 'L3': 'R6', 'L4': 'R5'}  # out: who becomes who (by place in the swarm)
EMERGE = {'R3': 0.5, 'R4': 0.72}  # in the flock only: they come up out of the vortex on the way out (how far out in frame 2)
# Back (frame 5): the flock crows nearest each of his left picture's places head for them, R1 turning round
# to swoop back to L1's (63 px off, so its two strokes are the loop's longest, 31 px); R3 and R6 sink toward
# the vortex's eye (by these game px), tucked behind its front swirl, and are gone into it by frame 0.
BACK = {'R1': 'L1', 'R2': 'L2', 'R4': 'L3', 'R5': 'L4'}
SINK = {'R3': 10, 'R6': 6}
SWOOP = {(4, 'R1->L1'): 32.0, (5, 'L1'): 32.0}  # the travel limit for that one swoop's two strokes (every other crow: 25 px a frame)
# Three of his flock crows are partly hidden behind the others in his right picture (R2 is a wing and a
# head, R5 a body cut by R6's wing, R4 smaller than the L3 it heads for). Wherever such a crow is away
# from its place in his flock (frame 3 on the way in, frame 5 on the way out) its partner from his left
# picture flies in its place, a whole crow of his, so no cut edge shows over open ground.
WHOLE = {'R2': 'L2', 'R5': 'L4'}  # frame 3: the left picture's crow until the flock closes up
WHOLE_BACK = {'R1': 'L1', 'R2': 'L2', 'R4': 'L3', 'R5': 'L4'}  # frame 5: the crow whose place it heads for
PHI = 8.0  # how far the swarm turns (degrees, clockwise) on its way out
T_OUT = (0.25, 0.5, 0.75)  # how far frames 1-3 are on the way from his left picture to his right one
V5 = 0.88  # the vortex's size as it reopens in frame 5
V1 = 0.95  # and as it starts to close in frame 1
SMOKE5 = 0  # game px from the anchor: in frame 5 his smoke left of this is left behind
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
    names = [n for n in FEATHERS[key] if BY[n]['fmask'].sum() >= FRAG]  # his crumbs stay in his pictures only
    names = names if only is None else [n for i, n in enumerate(names) if i % only[0] == only[1]]
    return [at(n, turn(eye(n), c, deg, rho) + np.array([dx, dy], np.float32)) for n in names]


def key_frame(key):
    """His picture: his veil, his feathers and crows as he cut them (the vortex showing between the
    feathers); a gap in a crow with nothing of his behind it takes the crow's own neighbouring pixel."""
    v = his_veil(key)
    under = v[..., 3] > 0
    items = [('veil', v, 'vortex') if key == 'L' else ('veil', v)]
    for n in FEATHERS[key] + ORDER[key]:
        p = BY[n]
        add = p['fmask'] & ~p['mask'] & ~under
        items.append(('piece', p['mask'] | add, np.where(add[..., None], p['frgba'], p['rgba']), p['eyes'], None, n))
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
    # 1: the crows ride out round the vortex, a quarter of the way (the two looking back have turned round,
    # so no crow flies backwards); it spins and starts to close.
    f1 = compose([vortex(15, V1)] + feathers('L', 16, -4, 1) +
                 [at(n, swirl(eye(n), eye(PAIRS[n]), T_OUT[0]), mirror=BY[n]['face'] < 0, wings=wings(n, 1)) for n in ORDER['L']])
    POS[1] = dict(TRACE)
    TRACE.clear()
    # 2: half way: they break out to the right, the first two of the
    # flock come up out of the vortex behind its swirl, the vortex closes, the feathers stream back.
    f2 = compose([at(n, swirl(VC, eye(n), EMERGE[n]), wings=wings(n, 2), dark=0.3) for n in EMERGE] +
                 [vortex(30, 0.85)] +
                 feathers('L', 30, -10, 2, only=(2, 0)) + feathers('R', 0, 10, -2, only=(2, 1)) +
                 [at(n, swirl(eye(n), eye(PAIRS[n]), T_OUT[1]), mirror=BY[n]['face'] < 0, wings=wings(n, 2)) for n in ORDER['L']])
    POS[2] = dict(TRACE)
    TRACE.clear()
    # 3: his flock nearly closed up, the vortex a small whirl behind it, his smoke trailing in.
    partner = {v: k for k, v in PAIRS.items()}

    def r3(n):
        start = eye(partner[n]) if n in partner else VC
        pos = swirl(start, eye(n), T_OUT[2])
        if n in WHOLE:  # his left picture's whole crow, already turned to face right, flies this place
            w = WHOLE[n]
            return at(w, pos, mirror=BY[w]['face'] < 0, wings=wings(w, 3))
        return at(n, pos, wings=wings(n, 3))
    f3 = compose([vortex(45, 0.72, glow=0.85), smoke(0.7, dx=4)] + feathers('R', 0, 5, -1) + [r3(n) for n in ORDER['R']])
    POS[3] = dict(TRACE)
    TRACE.clear()

    # 5: the flock curls back round the vortex as it opens again (at V5 size; whole in frame 0, so it
    # reopens over the two steps): four crows head for his left picture's places (R1 swoops back to
    # L1's), R3 and R6 sink toward its eye behind its front swirl, a little dark; the smoke's tail is left behind.
    def back(n):
        dest = eye(BACK[n])
        pos = eye(n) + (dest - eye(n)) * 0.5
        w = WHOLE_BACK.get(n, n)  # the left picture's whole crow, half way back to its place
        return at(w, pos, wings=wings(w, 5), mirror=(BY[BACK[n]]['face'] < 0) != (BY[w]['face'] < 0))

    def sink(n):
        u = (VC - eye(n)) / np.linalg.norm(VC - eye(n))
        return at(n, eye(n) + u * SINK[n], wings=wings(n, 5), dark=0.3)
    f5 = compose([smoke(tail=SMOKE5, dx=-8, dy=1)] + [sink(n) for n in SINK] + [vortex(-30, V5)] +
                 feathers('R', 0, -9, 1) + feathers('L', -16, 4, -1) + [back(n) for n in BACK])
    POS[5] = dict(TRACE)
    TRACE.clear()
    return [f0, f1, f2, f3, f4, f5]


VRIM = VRAD * S  # game px: the radius of his vortex's outer ring at full size
SUMMON_V = (0.6, 0.7, 0.82, 0.92, 1.0)  # the vortex's size in summon 0-4 (5 is his picture)
SUMMON_DEG = (-150, -115, -85, -55, -25)  # and its spin


def summon():
    """Our proposal (he painted only the fly frames): at the caster his vortex opens, spinning, and the
    crows come up out of it head first (a little dark at first, their eyes lit), each on its own side of it,
    the right-facing ones out of its right half and the left-facing ones out of its left, their bodies still
    behind its swirl; they rise round it into his left picture. It ends on his left picture (= fly 0)."""
    def out_of(n, i, r_out, deg, wings, dark=0.0):
        """Crow n with its eye `r_out` game px past the vortex's rim in summon frame i, turned `deg` round
        the eye of the vortex short of its own angle there."""
        e = eye(n) - VC
        d = turn(VC + e / np.linalg.norm(e), VC, deg) - VC
        return at(n, VC + d * (VRIM * SUMMON_V[i] + r_out), wings=wings, dark=dark)

    def toward(n, rho, deg, wings, dark=0.0):
        return at(n, turn(eye(n), VC, deg, rho), wings=wings, dark=dark)

    def vtx(i):
        return vortex(SUMMON_DEG[i], SUMMON_V[i])
    s0 = compose([vtx(0)] + feathers('L', -125, 0, 0, 0.5, only=(3, 0)))
    # 1: the first two put their heads out of its right half (beaks and red eyes first), wings down.
    s1 = compose([out_of('L3', 1, 4, -14, 'down', 0.3), out_of('L2', 1, 4, -10, 'down', 0.3), vtx(1)] +
                 feathers('L', -95, 0, 0, 0.62, only=(2, 0)))
    # 2: they come out further, wings mid; the two facing left put their heads out of its left half.
    s2 = compose([out_of('L4', 2, 4, -12, 'down', 0.3), out_of('L1', 2, 4, -10, 'down', 0.3), vtx(2)] +
                 feathers('L', -70, 0, 0, 0.8) +
                 [toward('L3', 0.94, -8, 'mid', 0.15), toward('L2', 0.72, -8, 'mid', 0.15)])
    s3 = compose([vtx(3)] + feathers('L', -45, 0, 0, 0.9) +
                 [toward(n, r, -5, w, 0.1) for n, r, w in (('L4', 0.98, 'mid'), ('L1', 0.8, 'mid'), ('L2', 0.86, 'up'), ('L3', 0.98, 'up'))])
    s4 = compose([vtx(4)] + feathers('L', -20, 0, 0, 0.96) + [toward(n, 0.96, -2, 'up') for n in ORDER['L']])
    return [s0, s1, s2, s3, s4, key_frame('L')]


frames = {'fly': fly(), 'summon': summon()}


# --- checks (the build fails on any of them) ------------------------------------------------------------------

def frame_stats(f):
    a = f[..., 3] > 0
    open_ = ~a
    air = flood4(open_)
    shut = int((open_ & ~air).sum())
    specks = sum(1 for pts in components(a) if len(pts) <= 3)
    # Soft pixels more than 2 px from the open air round the swarm: the ground would show through his art.
    soft = int(((f[..., 3] > 0) & (f[..., 3] < 255) & ~dilate(air, 2)).sum())
    return {'opaque': int(a.sum()), 'enclosed': shut, 'specks': specks, 'soft_inside': soft}


POS[0] = {n: eye(n) for n in ORDER['L']}
POS[4] = {n: eye(n) for n in ORDER['R']}
# How far each crow moves from frame to frame (game px): the same crow, or the crow it becomes (out: his
# left picture's crow -> its flock partner at frame 3, or at frame 4 for the two whose partners are hidden
# in his flock; back: a flock crow -> the left picture's crow that flies its place from frame 5). Crows
# that come up out of the vortex or sink into it appear or vanish behind it and are not counted.
BECOMES = {(2, 3): {k: v for k, v in PAIRS.items() if v not in WHOLE}, (3, 4): {v: k for k, v in WHOLE.items()}, (4, 5): WHOLE_BACK}
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
    print(anim, 'opaque', [s['opaque'] for s in st], 'enclosed', [s['enclosed'] for s in st], 'specks', [s['specks'] for s in st],
          'soft inside', [s['soft_inside'] for s in st])
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
        if STATS[anim][i]['soft_inside']:
            FAILS.append(f'{anim} {i}: {STATS[anim][i]["soft_inside"]} translucent px more than 2 px inside the swarm')
mass = [s['opaque'] for s in STATS['fly']]
for i in range(len(mass)):
    j = (i + 1) % len(mass)
    ratio = mass[j] / mass[i]
    if not 0.8 <= ratio <= 1.25:
        FAILS.append(f'fly {i} -> {j}: opaque mass {mass[i]} -> {mass[j]} ({ratio:.2f}x, allowed 0.80-1.25)')
for i, step in enumerate(TRAVEL):
    for n, d in step.items():
        if d > SWOOP.get((i, n), 25):
            FAILS.append(f'fly {i} -> {(i + 1) % 6}: {n} moves {d} px (allowed {SWOOP.get((i, n), 25)})')


# No flash: the light of a frame (alpha x luma summed over it) and the mean luma of what it covers change
# smoothly from frame to frame. The fly loop's light may change by at most 1.5x a step, the wrap included
# (the vortex closes over four frames and opens again over two, so ~1.35x a step coming back is the least
# it can be); in both anims a frame's mean luma stays within 20 % of its neighbour's, so no frame is a
# brighter flash of the same swarm.
def light(f):
    a = f[..., 3].astype(np.float32) / 255
    return float((a * lum(f)).sum()), float((a * lum(f)).sum() / max(1, (f[..., 3] > 0).sum()))


LIGHT = {anim: [light(f) for f in fr] for anim, fr in frames.items()}
for anim, ls in LIGHT.items():
    print(anim, 'light (k)', [round(t / 1000, 1) for t, _ in ls], 'mean luma', [round(m, 1) for _, m in ls])
    n = len(ls)
    for i in range(n if anim == 'fly' else n - 1):
        j = (i + 1) % n
        r_tot, r_mean = ls[j][0] / ls[i][0], ls[j][1] / ls[i][1]
        if anim == 'fly' and not 1 / 1.5 <= r_tot <= 1.5:
            FAILS.append(f'{anim} {i} -> {j}: light {r_tot:.2f}x (allowed 0.67-1.50)')
        if not 1 / 1.2 <= r_mean <= 1.2:
            FAILS.append(f'{anim} {i} -> {j}: mean luma {r_mean:.2f}x (allowed 0.83-1.20)')
# The vortex never flashes: its lit violet (and its brightest violet) covers about the same share of what
# shows of it in fly 1, 2 and 5 as in his picture (fly 0), within 30 %.
def violet(f, m):
    c = f[..., :3].astype(np.int32)
    bg = c[..., 2] - c[..., 1]
    return int((m & (bg > 45)).sum()), int((m & (bg > 70)).sum())


VIOLET = []
for i, f in enumerate(frames['fly']):
    vm = META[id(f)]['vortex']
    vv, bv = violet(f, vm)
    VIOLET.append({'area': int(vm.sum()), 'violet': vv, 'bright': bv})
print('fly vortex (shown px, violet, bright violet):', [(v['area'], v['violet'], v['bright']) for v in VIOLET])
for i in (1, 2, 5):
    for k in ('violet', 'bright'):
        d0 = VIOLET[0][k] / max(1, VIOLET[0]['area'])
        di = VIOLET[i][k] / max(1, VIOLET[i]['area'])
        if not 0.7 <= di / max(d0, 1e-6) <= 1.3:
            FAILS.append(f'fly {i}: vortex {k} share {di:.3f} against {d0:.3f} in his picture (allowed +-30 %)')

# No crow pops: a crow may come into sight or go out of it only from behind something, the vortex above
# all. A crow counts as seen in a frame when 5 % of it or more shows. When it comes into sight or goes out
# of it between two frames, one of the two must draw it at least 40 % hidden (behind the vortex's swirl or
# the crows in front of it) with at least 10 % of it behind the vortex itself.
SEEN = 0.05
for anim, fr in frames.items():
    n = len(fr)
    for i in range(n if anim == 'fly' else n - 1):
        j = (i + 1) % n
        ci, cj = META[id(fr[i])]['crows'], META[id(fr[j])]['crows']
        ren = BECOMES.get((i, j), {}) if anim == 'fly' else {}
        back_ = {v: k for k, v in ren.items()}
        pairs = {(c, ren.get(c, c)) for c in ci} | {(back_.get(c, c), c) for c in cj}
        for a_, b_ in sorted(pairs):
            va = ci[a_]['visible'] if a_ in ci else 0.0
            vb = cj[b_]['visible'] if b_ in cj else 0.0
            if (va >= SEEN) == (vb >= SEEN):
                continue
            tucked = [d[c] for d, c in ((ci, a_), (cj, b_)) if c in d and 1 - d[c]['visible'] >= 0.4 and d[c]['behind_vortex'] >= 0.1]
            what = 'goes out of sight' if va >= SEEN else 'comes into sight'
            print(f'{anim} {i} -> {j}: {a_ if va >= SEEN else b_} {what} (shows {va:.0%} -> {vb:.0%}), behind the vortex: '
                  f'{ci[a_]["behind_vortex"] if a_ in ci else 0:.0%} -> {cj[b_]["behind_vortex"] if b_ in cj else 0:.0%}')
            if not tucked:
                FAILS.append(f'{anim} {i} -> {j}: {a_}/{b_} {what} without going behind the vortex (shows {va:.0%} -> {vb:.0%})')

# No loose bit of a crow: in the frames we made, every piece of the swarm that is mostly crow is a whole
# crow (over 150 px), never a cut wing, a talon or a drip floating on its own.
for anim, fr in frames.items():
    for i, f in enumerate(fr):
        if (anim, i) in (('fly', 0), ('fly', 4), ('summon', len(fr) - 1)):
            continue  # his pictures
        cp = META[id(f)]['crowpx']
        for pts in components(f[..., 3] > 0):
            P = np.array(pts)
            if len(pts) < 150 and cp[P[:, 0], P[:, 1]].mean() >= 0.5:
                FAILS.append(f'{anim} {i}: a loose bit of crow ({len(pts)} px) at {P[:, 1].mean() - OAX + 116:.0f},{P[:, 0].mean() - OAY + 91:.0f}')

# His highlights, kept: on fly 0 and fly 4 the pixels brighter than luma 90 and 100 (Rec. 601, eyes left
# out) number within 20 % of his own picture area-averaged to the game scale on the same anchor.
LUMA601 = np.array([0.299, 0.587, 0.114], np.float32)
EYEZONE = np.zeros((OH, OW), bool)
for nm in EYES_AT:
    yy, xx = np.mgrid[0:OH, 0:OW]
    EYEZONE |= np.hypot(xx + 0.5 - EYES_AT[nm][0], yy + 0.5 - EYES_AT[nm][1]) < 3.6
HIGHLIGHTS, CHROMA = {}, {}
for key, i in (('L', 0), ('R', 4)):
    L_ = LAY[key]
    _, his_box = shrink_pic(key, L_['rgb'], np.ones(L_['rgb'].shape[:2], np.float32))
    x0, y0, x1, y1 = PICS[key]
    gx0, gy0 = to_game(key, x0 + 1.5, y0 + 1.5)
    gx1, gy1 = to_game(key, x1 - 1.5, y1 - 1.5)
    yy, xx = np.mgrid[0:OH, 0:OW] + 0.5
    inside = (xx > gx0) & (xx < gx1) & (yy > gy0) & (yy < gy1) & ~EYEZONE
    f = frames['fly'][i]
    hl_h = his_box @ LUMA601
    hl_o = f[..., :3].astype(np.float32) @ LUMA601
    on = (f[..., 3] > 0) & ~EYEZONE
    HIGHLIGHTS[key] = {t: (int((inside & (hl_h > t)).sum()), int((on & (hl_o > t)).sum())) for t in (90, 100, 110)}
    HIGHLIGHTS[key]['max'] = (round(float(hl_h[inside].max()), 1), round(float(hl_o[on].max()), 1))
    print(f'highlights {key} (his, ours):', HIGHLIGHTS[key])
    for t in (90, 100):
        h_, o_ = HIGHLIGHTS[key][t]
        if not 0.8 <= o_ / max(h_, 1) <= 1.2:
            FAILS.append(f'fly {i}: {o_} px above luma {t} against his {h_} (allowed +-20 %)')
    # His blue-violet sheen and his vortex's violet, kept: the pixels whose chroma (max - min channel) is
    # above 30 and above 40, ours laid on his background, number within 20 % of his.
    a8 = f[..., 3:4].astype(np.float32) / 255
    shown = f[..., :3].astype(np.float32) * a8 + BG * (1 - a8)
    ch_h = his_box.max(-1) - his_box.min(-1)
    ch_o = shown.max(-1) - shown.min(-1)
    CHROMA[key] = {t: (int((inside & (ch_h > t)).sum()), int((inside & (ch_o > t)).sum())) for t in (30, 40)}
    print(f'chroma {key} (his, ours):', CHROMA[key])
    for t in (30, 40):
        h_, o_ = CHROMA[key][t]
        if not 0.8 <= o_ / max(h_, 1) <= 1.2:
            FAILS.append(f'fly {i}: {o_} px of chroma above {t} against his {h_} (allowed +-20 %)')
    # His eyes are a dim crimson-mauve glow: no eye pixel of ours is brighter than his brightest.
    eye_h = float((his_box @ LUMA601)[EYEZONE & (yy > gy0) & (yy < gy1) & (xx > gx0) & (xx < gx1)].max())
    eye_o = float((f[..., :3].astype(np.float32) @ LUMA601)[EYEZONE & (f[..., 3] > 0)].max())
    print(f'eyes {key}: brightest his {eye_h:.1f}, ours {eye_o:.1f}')
    if eye_o > eye_h + 2:
        FAILS.append(f'fly {i}: an eye pixel of luma {eye_o:.1f}, brighter than his {eye_h:.1f}')

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
    "his crows as cut-out pieces (whole pixels, mirrored; for the beat his near wing turns about the",
    "shoulder and his far wing sinks behind the body), spin and close his vortex in polar space (the parts",
    "his crows hid filled by his own vortex turned about its eye), trail his smoke, drift his feathers.",
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
            'stats': STATS, 'travel': TRAVEL, 'light': LIGHT, 'outline': OUTLINE.tolist()}
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
    vs = [his_veil('L'), vortex()[1], vortex(15, V1)[1], vortex(30, 0.85)[1], vortex(45, 0.72, 0.85)[1], vortex(-30, V5)[1],
          SMOKE, smoke(0.7, dx=4)[1], smoke(tail=SMOKE5, dx=-8, dy=1)[1]]
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
                m, rgba = place(BY[n], wings=mode)[1:3]
            cx, cy = int(BY[n]['eye'][0]), int(BY[n]['eye'][1])
            big = np.zeros((OH + 2 * T, OW + 2 * T, 4), np.uint8)
            big[T:T + OH, T:T + OW] = rgba
            row.append(big[cy + T - 50:cy + T + 40, cx + T - 62:cx + T + 52] if BY[n]['face'] < 0 else big[cy + T - 50:cy + T + 40, cx + T - 96:cx + T + 18])
        rows.append(np.concatenate(row, 1))
    allp = np.concatenate(rows, 0)
    bg = Image.new('RGBA', (allp.shape[1], allp.shape[0]), (0x5d, 0x6b, 0x57, 255))
    bg.alpha_composite(Image.fromarray(allp, 'RGBA'))
    save_whole(bg.resize((bg.width * 3, bg.height * 3), Image.NEAREST), os.path.join(DEBUG, 'crows-pieces.png'))
