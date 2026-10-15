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
left (the vortex, the smoke) is a veil un-mixed from his background into colour plus alpha, so it
stays translucent. Each layer is area-averaged down to the game scale on one grid (the anchor at
the centre of the swarm's mass, shared by both pictures), snapped to a palette sampled from his
pixels, and the crows and feathers get a 1 px outline in his own darkest crow colour (his crows are
truly black-violet). His eyes keep their light and dark exactly; only the red the JPEG's colour
subsampling washed to mauve is put back.

The other frames are made from those game-scale pieces, so the crows keep his pixels: they move by
whole pixels, are mirrored to turn round, and beat their wings by flipping his own wing pixels
about the shoulder line (down-stroke) or folding them half way (whole rows of his wing, no
resampling). The vortex spins and closes as the flock forms (his vortex turned and scaled, with the
holes the crows leave filled from the spiral itself) and opens again as it loops; his smoke thins in
behind the flock and is left behind; his feathers drift back. The 'summon' anim opens his vortex at
the caster and brings the crows out of it and round it, ending on his left picture. The result is a
TypeScript data module (palette + run-length rows) that the generator
(tools/world-sprites/vfx-beast-crows.ts) decodes, so the build needs no image files. Deterministic.
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


# --- helpers -----------------------------------------------------------------------------------------

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
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            g |= shift_bool(m, dy, dx)
        m = g
    return m


def erode(m, n=1):
    return ~dilate(~m, n)


def edge(m):
    """Pixels of m with a 4-neighbour outside m."""
    return m & ~erode(m)


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
    return pal[np.lexsort((pal[:, 2], pal[:, 1], pal[:, 0]))]


def rotate(arr, deg, cx, cy, scale=1.0):
    """arr (H x W x C) turned by deg (screen degrees, clockwise) and scaled about (cx, cy); bilinear."""
    H, W = arr.shape[:2]
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    a = np.deg2rad(deg)
    rx, ry = (xx - cx) / scale, (yy - cy) / scale
    sx = cx + rx * np.cos(a) + ry * np.sin(a)
    sy = cy - rx * np.sin(a) + ry * np.cos(a)
    inside = (sx >= 0) & (sx <= W - 1.001) & (sy >= 0) & (sy <= H - 1.001)
    sx = np.clip(sx, 0, W - 1.001)
    sy = np.clip(sy, 0, H - 1.001)
    x0 = np.floor(sx).astype(int)
    y0 = np.floor(sy).astype(int)
    fx = (sx - x0)[..., None]
    fy = (sy - y0)[..., None]
    out = (arr[y0, x0] * (1 - fx) + arr[y0, x0 + 1] * fx) * (1 - fy) + (arr[y0 + 1, x0] * (1 - fx) + arr[y0 + 1, x0 + 1] * fx) * fy
    return out * inside[..., None]


def move(arr, dx, dy):
    return shift_bool(arr, dy, dx)


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
# wing, right of it the 'hi' wing; `near` is the wing on our side (drawn over the body when it beats
# down). `face` is the way it looks (1 right, -1 left).

CROWS = {
    'L': [
        {'name': 'L4', 'cut': [(292, 921), (314, 918), (322, 914), (345, 916), (356, 925), (372, 935), (396, 941)], 'split': 330, 'near': 'hi', 'eye': (329, 928), 'face': -1, 'poly': [(298, 893), (304, 891), (312, 899), (318, 907), (322, 914), (330, 916), (338, 919), (343, 924), (345, 912), (350, 904), (357, 896), (365, 889), (372, 884), (379, 879), (383, 884), (386, 896), (389, 910), (392, 922), (392, 932), (386, 936), (375, 937), (364, 940), (358, 946), (350, 950), (342, 950), (336, 946), (330, 944), (324, 945), (318, 944), (315, 939), (317, 932), (315, 926), (309, 919), (303, 909), (298, 900)]},
        {'name': 'L1', 'cut': [(268, 862), (293, 860), (298, 855), (322, 855), (329, 860), (346, 864), (380, 862)], 'split': 320, 'near': 'hi', 'eye': (308, 863), 'face': -1, 'poly': [(276, 838), (282, 840), (288, 846), (296, 851), (302, 855), (310, 855), (318, 857), (322, 860), (326, 856), (332, 848), (338, 840), (343, 833), (348, 826), (356, 820), (364, 814), (370, 809), (374, 811), (375, 820), (375, 832), (372, 842), (366, 850), (358, 857), (350, 861), (345, 868), (343, 878), (340, 888), (335, 896), (326, 900), (316, 897), (309, 892), (304, 884), (299, 878), (295, 873), (294, 867), (296, 863), (290, 861), (284, 857), (279, 851), (275, 844)]},
        {'name': 'L2', 'cut': [(395, 866), (428, 866), (440, 856), (448, 846), (458, 843), (472, 841), (492, 841)], 'split': 449, 'near': 'lo', 'eye': (468, 852), 'face': 1, 'poly': [(406, 808), (411, 809), (418, 819), (425, 827), (432, 834), (440, 839), (447, 843), (453, 841), (459, 835), (466, 828), (474, 821), (481, 815), (486, 812), (488, 817), (483, 826), (477, 834), (471, 841), (473, 846), (479, 852), (484, 858), (487, 864), (481, 865), (473, 863), (468, 867), (466, 872), (462, 872), (446, 871), (436, 868), (428, 863), (420, 859), (412, 853), (405, 847), (401, 839), (400, 829), (402, 818)]},
        {'name': 'L3', 'cut': [(365, 932), (400, 936), (420, 918), (430, 914), (440, 913), (458, 913), (475, 913)], 'split': 431, 'near': 'lo', 'eye': (446, 924), 'face': 1, 'poly': [(388, 853), (396, 860), (404, 866), (410, 876), (416, 888), (422, 898), (428, 906), (433, 910), (436, 900), (436, 885), (437, 870), (442, 865), (452, 864), (460, 866), (463, 876), (462, 892), (459, 906), (458, 913), (462, 920), (466, 927), (470, 934), (461, 936), (455, 940), (450, 946), (442, 950), (438, 958), (434, 963), (420, 963), (414, 956), (412, 948), (406, 942), (398, 938), (392, 932), (389, 922), (386, 910), (384, 898), (382, 886), (381, 872), (383, 860)],
         'keep': [(414, 946), (440, 946), (440, 965), (414, 965)]},
    ],
    'R': [
        {'name': 'R1', 'cut': [(596, 885), (640, 887), (650, 881), (660, 877), (686, 878)], 'split': 999, 'near': 'lo', 'eye': (665, 887), 'face': 1, 'poly': [(606, 848), (612, 846), (620, 854), (628, 860), (628, 846), (632, 838), (637, 836), (641, 842), (645, 836), (650, 840), (652, 850), (655, 862), (658, 870), (662, 876), (668, 880), (674, 884), (680, 889), (678, 894), (670, 894), (662, 897), (652, 900), (640, 901), (626, 899), (612, 896), (602, 893), (600, 886), (604, 876), (604, 862)]},
        {'name': 'R2', 'cut': [(648, 869), (680, 873), (698, 868), (705, 866), (730, 866)], 'split': 999, 'near': 'lo', 'eye': (712, 874), 'face': 1, 'poly': [(656, 832), (664, 832), (672, 838), (682, 846), (690, 852), (696, 860), (700, 866), (706, 866), (714, 866), (720, 870), (724, 876), (727, 881), (720, 882), (712, 882), (704, 884), (694, 882), (684, 876), (672, 868), (662, 860), (655, 850), (653, 840)]},
        {'name': 'R4', 'cut': [(694, 896), (720, 906), (745, 905), (780, 903)], 'split': 999, 'near': 'lo', 'eye': (761, 911), 'face': 1, 'poly': [(697, 880), (705, 880), (715, 878), (720, 868), (726, 866), (734, 870), (742, 866), (748, 872), (752, 884), (752, 896), (750, 904), (758, 904), (766, 906), (772, 912), (775, 920), (766, 920), (758, 924), (746, 926), (734, 926), (724, 920), (718, 912), (712, 904), (704, 894), (698, 887)]},
        {'name': 'R3', 'eye': (700, 901), 'face': 1, 'poly': [(655, 898), (668, 895), (680, 893), (690, 892), (700, 893), (708, 896), (713, 900), (717, 905), (710, 908), (700, 910), (688, 911), (675, 912), (662, 912), (652, 908)]},
        {'name': 'R5', 'cut': [(600, 937), (630, 939), (645, 931), (655, 925), (690, 925)], 'split': 999, 'near': 'lo', 'eye': (667, 934), 'face': 1, 'poly': [(610, 905), (618, 904), (628, 910), (636, 916), (642, 922), (648, 926), (655, 924), (664, 925), (672, 929), (678, 934), (683, 940), (676, 944), (668, 946), (660, 949), (648, 951), (636, 952), (622, 951), (610, 948), (604, 942), (608, 935), (612, 928), (610, 918)]},
        {'name': 'R6', 'cut': [(660, 951), (700, 946), (718, 937), (730, 935), (760, 935)], 'split': 999, 'near': 'lo', 'eye': (734, 944), 'face': 1, 'poly': [(666, 904), (674, 906), (684, 912), (694, 918), (704, 925), (712, 931), (720, 935), (730, 935), (740, 938), (748, 944), (753, 951), (746, 954), (738, 956), (728, 958), (718, 962), (718, 972), (714, 979), (704, 979), (696, 972), (690, 968), (678, 968), (668, 964), (668, 955), (674, 948), (670, 940), (666, 928), (664, 915)]},
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
    for spec in reversed(CROWS[key]):  # front first
        m = poly_mask(spec['poly'], (H, W), (x0, y0)) & fg & ~taken
        keep = poly_mask(spec['keep'], (H, W), (x0, y0)) if 'keep' in spec else np.zeros((H, W), bool)
        # His eye: the light pixels round the point traced as its centre (a red washed to mauve).
        yy_, xx_ = np.mgrid[0:H, 0:W]
        near_eye = np.hypot(xx_ - (spec['eye'][0] - x0), yy_ - (spec['eye'][1] - y0)) <= 2.9
        eye = m & near_eye & (lu > 70) & (r > g + 20)
        keep |= dilate(eye, 2)
        m &= (~vivid & ~smoke) | keep
        # Specks the cut leaves behind (a few pixels cut off from the crow) go back to the veil.
        for pts in components(m):
            if len(pts) < 12:
                m[tuple(np.array(pts).T)] = False
        taken |= m
        wing = np.zeros((H, W), bool)
        if 'cut' in spec:
            cx_ = [p[0] - x0 for p in spec['cut']]
            cy_ = [p[1] - y0 for p in spec['cut']]
            line = np.interp(np.arange(W), cx_, cy_)
            wing = m & (np.arange(H)[:, None] < line[None, :])
        crows.append({**spec, 'mask': m, 'eyemask': eye, 'wingmask': wing})
    crows.reverse()  # back to front
    rest = fg & ~taken
    feathers = []
    for pts in components(rest):
        ys = np.array([p[0] for p in pts])
        xs = np.array([p[1] for p in pts])
        bright = (lu[ys, xs] > 52).sum()
        if len(pts) <= 320 and max(np.ptp(ys), np.ptp(xs)) <= 34 and bright >= 3:
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
        yy_, xx_ = np.mgrid[0:H, 0:W]
        core = rest & (np.hypot(xx_ - (VORTEX[0] - x0), yy_ - (VORTEX[1] - y0)) < VORTEX[2] * 0.6)
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


def to_game(key, x, y):
    """A sheet point on the game grid."""
    return OAX + (x - PICS[key][0] - ANCH[key][0]) * S, OAY + (y - PICS[key][1] - ANCH[key][1]) * S


# --- palettes (sampled from his pixels) ------------------------------------------------------------------

solid_px = np.concatenate([L['rgb'][cr['mask'] & ~dilate(cr['eyemask'], 1)] for L in LAY.values() for cr in L['crows']] + [L['rgb'][f['mask']] for L in LAY.values() for f in L['feathers']])
SOLID = median_palette(solid_px, 30)
OUTLINE = SOLID[np.argmin(SOLID.sum(1))]
veil_px = np.concatenate([L['veil'][0][L['veil'][1] > 0.5] for L in LAY.values()])
# The veil's palette in two halves, so the vortex's few bright purples are not outvoted by its dark.
VEIL = np.concatenate([median_palette(veil_px[lum(veil_px) < 40], 8), median_palette(veil_px[lum(veil_px) >= 40], 12)])
ALEVELS = [(0.72, 255), (0.42, 170)]
EDGE_LUM = 52.0  # edge pixels darker than this are his outline
PAL_OPAQUE = np.concatenate([SOLID, VEIL])
DEEP = VEIL[np.argmin(VEIL.sum(1))]  # his deepest violet-black

# His eyes: a light core in a darker ring. The JPEG kept their light (luma) but its colour subsampling
# averaged their red with the black-violet round them into mauve; the red is put back at his luma.
EYE_LIGHT = np.array([[118, 22, 38], [170, 40, 52], [214, 70, 72]], np.float32)  # his luma: ~52, ~81, ~114
print('outline', OUTLINE.astype(int).tolist(), 'darkest', SOLID[np.argsort(SOLID.sum(1))[:4]].astype(int).tolist())


def eye_colour(C):
    """His eye pixel (area-averaged at the game scale) -> his red at the same light."""
    y = lum(C)
    return EYE_LIGHT[np.digitize(y, [62.0, 92.0])]


# --- the veils: his vortex and his smoke, filled where the crows hid them ----------------------------------

def premul(rgb, alpha):
    return np.concatenate([rgb * alpha[..., None], alpha[..., None]], -1)


def unpremul(pm):
    a = pm[..., 3]
    return np.where(a[..., None] > 1e-3, pm[..., :3] / np.maximum(a[..., None], 1e-3), 0), a


VCX, VCY, VRAD = VORTEX[0] - PICS['L'][0], VORTEX[1] - PICS['L'][1], VORTEX[2]


def spread(pm, into, steps):
    """Premultiplied veil spread `steps` pixels into the region `into` (each step: the mean of the
    known 4-neighbours), so a crow lifted off it leaves the veil it covered, not a hole."""
    known = pm[..., 3] > 0.05
    todo = into & ~known
    for _ in range(steps):
        acc = np.zeros_like(pm)
        n = np.zeros(known.shape, np.float32)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            k_ = shift_bool(known, dy, dx)
            acc += shift_bool(pm, dy, dx) * k_[..., None]
            n += k_
        new = todo & (n > 0)
        pm[new] = acc[new] / n[new][:, None]
        known |= new
        todo &= ~new
    return pm


def filled(key):
    """His veil with the holes his crows and feathers leave filled. Inside the vortex each hole pixel
    takes the vortex as it is a turn of the spiral away (the nearest turn that has it); elsewhere the
    veil round a crow is spread a few pixels in under its edge."""
    L = LAY[key]
    rgb, alpha = L['veil']
    pm = premul(rgb, alpha)
    H, W = alpha.shape
    pieces = np.zeros((H, W), bool)
    for it in L['crows'] + L['feathers']:
        pieces |= it['mask']
    if key == 'L':
        yy, xx = np.mgrid[0:H, 0:W]
        hole = (np.hypot(xx - VCX, yy - VCY) < VRAD) & (alpha < 0.05)
        for deg in (30, -30, 60, -60, 95, -95, 130, -130, 170):
            if not hole.any():
                break
            rp = rotate(pm, deg, VCX, VCY)
            take = hole & (rp[..., 3] > 0.25)
            pm[take] = rp[take]
            hole &= ~take
    pm = spread(pm, pieces, 3)
    return unpremul(pm)


VEILS = {'L': LAY['L']['veil'], 'R': LAY['R']['veil'], 'Lfill': filled('L'), 'Rfill': filled('R')}


# --- onto the game grid ------------------------------------------------------------------------------------

def stepped(A):
    out = np.zeros(A.shape, np.uint8)
    for lo, a in ALEVELS:
        out[(A >= lo) & (out == 0)] = a
    return out


def quantize_veil(cov, col):
    """Coverage + colour -> RGBA with stepped alpha and palette colours (opaque from all, translucent from the veil's)."""
    out = np.zeros(cov.shape + (4,), np.uint8)
    a = stepped(cov)
    op = a == 255
    tr = (a > 0) & ~op
    out[op, :3] = PAL_OPAQUE[snap_idx(col, PAL_OPAQUE)][op]
    out[tr, :3] = VEIL[snap_idx(col, VEIL)][tr]
    out[..., 3] = a
    return out


def veil(name, deg=0.0, scale=1.0, glow=1.0, tail=None, dx=0, dy=0):
    """A veil on the game grid: his vortex or smoke turned and scaled about the vortex's eye (the
    vortex closes and opens by its scale, so it keeps his look at every size), its bright violet
    dimmed to translucent by `glow` (never his dark: that would turn into a grey film on the ground),
    cut to its wisps that trail left of `tail` (game px from the anchor), and moved."""
    key = name[0]
    rgb, alpha = VEILS[name]
    if deg or scale != 1.0:
        pm = rotate(premul(rgb, alpha), deg, VCX, VCY, scale)
        rgb, alpha = unpremul(pm)
    A, C = shrink(rgb, alpha.astype(np.float32), ANCH[key], S, SIZE, OANCHOR)
    v = quantize_veil(A, C)
    if glow < 1:
        bright = (v[..., 3] > 0) & (lum(C) > 42)
        new = stepped(A * glow)
        tr = bright & (new > 0) & (new < 255)
        v[tr, :3] = VEIL[snap_idx(C, VEIL)][tr]
        v[bright, 3] = new[bright]
        v[bright & (new == 0)] = 0
    if tail is not None:
        # Only the wisps that trail behind (each kept or dropped whole, so none is cut straight).
        for pts in components(v[..., 3] > 0):
            P = np.array(pts)
            if P[:, 1].mean() >= OAX + tail:
                v[P[:, 0], P[:, 1]] = 0
    return move(v, dx, dy)


def fill_holes(m, rgba):
    """A piece with its pinholes and enclosed gaps filled from its own neighbouring pixels (gaps where his
    vortex shows between a crow's feathers, or a crow cut where another hid it): lifted off his picture
    it shows no specks of daylight."""
    m = m.copy()
    rgba = rgba.copy()
    H, W = m.shape
    ys, xs = np.nonzero(m)
    bx0, by0, bx1, by1 = max(xs.min() - 1, 0), max(ys.min() - 1, 0), min(xs.max() + 2, W), min(ys.max() + 2, H)
    sub = ~m[by0:by1, bx0:bx1]
    todo = np.zeros((H, W), bool)
    for pts in components(sub):
        P = np.array(pts)
        if P[:, 0].min() == 0 or P[:, 1].min() == 0 or P[:, 0].max() == by1 - by0 - 1 or P[:, 1].max() == bx1 - bx0 - 1:
            continue
        todo[P[:, 0] + by0, P[:, 1] + bx0] = True
    # Notches one pixel wide (three of four neighbours in the piece) close too.
    for _ in range(2):
        nb = sum(shift_bool(m, dy, dx).astype(np.int32) for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)))
        todo |= ~m & (nb >= 3)
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


def game_pieces(key):
    """Every crow and feather of a picture on the game grid, cut where his picture has them."""
    L = LAY[key]
    items = [('crow', cr) for cr in L['crows']] + [('feather', f) for f in L['feathers']]
    covs = [shrink(L['rgb'], it['mask'].astype(np.float32), ANCH[key], S, SIZE, OANCHOR) for _, it in items]
    stack = np.stack([A for A, _ in covs])
    solid = stack.sum(0) >= 0.5
    # Pinholes (a clear pixel with three solid neighbours) are filled, lone specks dropped.
    nb = sum(shift_bool(solid, dy, dx).astype(np.int32) for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)))
    solid = (solid & (nb >= 1)) | (~solid & (nb >= 3) & (stack.sum(0) >= 0.2))
    # Later items are in front: ties go to them.
    owner = np.argmax(stack + np.arange(len(covs))[:, None, None] * 1e-3, 0)
    out = []
    xs_all = np.arange(OW)
    for i, (kind, it) in enumerate(items):
        A, C = covs[i]
        m = solid & (owner == i)
        for pts in components(m):
            if len(pts) <= 2:
                m[tuple(np.array(pts).T)] = False
        if not m.any():
            continue
        rgba = np.zeros((OH, OW, 4), np.uint8)
        rgba[m, :3] = SOLID[snap_idx(C, SOLID)][m]
        rgba[m, 3] = 255
        eyes = np.zeros((OH, OW), bool)
        piece = {'name': it['name'], 'kind': kind, 'key': key, 'mask': m, 'rgba': rgba, 'eyes': eyes,
                 'wing': np.zeros((OH, OW), bool), 'side': np.zeros((OH, OW), np.int8)}
        if kind == 'crow':
            # His eye as it looks at this scale: the core and ring from all his pixels there, in his red.
            ring_ = dilate(it['eyemask'], 1).astype(np.float32)
            Ae, _ = shrink(L['rgb'], ring_, ANCH[key], S, SIZE, OANCHOR)
            _, Cf = shrink(L['rgb'], np.ones(ring_.shape, np.float32), ANCH[key], S, SIZE, OANCHOR)
            eyes |= m & (Ae >= 0.3) & (lum(Cf) >= 40)
            rgba[eyes, :3] = eye_colour(Cf)[eyes]
            ex, ey = to_game(key, *it['eye'])
            piece.update(eye=(ex, ey), face=it['face'])
            if 'cut' in it:
                gx = np.array([to_game(key, x, y)[0] for x, y in it['cut']])
                gy = np.array([to_game(key, x, y)[1] for x, y in it['cut']])
                cut = np.interp(xs_all, gx, gy)
                split = to_game(key, it['split'], 0)[0]
                yy, xx = np.mgrid[0:OH, 0:OW]
                head = np.hypot(xx - ex, yy - ey) < 5.5
                wing = m & ~eyes & ~head & (yy <= np.floor(cut)[None, :])
                side = np.where(xx < split, 1, 2).astype(np.int8) * wing
                piece.update(wing=wing, side=side, cut=cut, near=1 if it['near'] == 'lo' else 2)
        else:
            ys, xs = np.nonzero(m)
            piece.update(eye=(float(xs.mean()), float(ys.mean())), face=0)
        # The same piece with its gaps filled, for every frame where it leaves his picture.
        fm, fr = fill_holes(m, rgba)
        piece.update(fmask=fm, frgba=fr, fwing=piece['wing'] & fm, fside=piece['side'] * fm)
        if 'cut' in piece:
            # The wing of the filled piece: everything of it above the shoulder line but the head.
            yy, xx = np.mgrid[0:OH, 0:OW]
            fw = fm & ~eyes & ~(np.hypot(xx - piece['eye'][0], yy - piece['eye'][1]) < 5.5) & (yy <= np.floor(piece['cut'])[None, :])
            sp = to_game(key, it['split'], 0)[0]
            piece.update(fwing=fw, fside=np.where(xx < sp, 1, 2).astype(np.int8) * fw)
        out.append(piece)
    return out


PIECES = {k: game_pieces(k) for k in PICS}
BY = {p['name']: p for k in PICS for p in PIECES[k]}


# --- the wing beat: his own wing pixels, flipped or folded about the shoulder line --------------------------

FOLD = 0.4  # the half-way wing: his raised wing folded to this share of its height (whole rows of it)
DOWN = 0.7  # the down-stroke: his wing flipped below the shoulder at this share of its height
DOWN_MAX = 24.0  # ... and no longer than this (game px)
_beats = {}


def beat(p, mode):
    """(mask, rgba, eyes) of a crow with its raised wings beaten: 'down' flips every column of a wing
    about the shoulder line (his wing hanging below it, DOWN of its height), 'mid' folds it up to FOLD
    of its height; both take whole rows of his wing, never blending them. The far wing goes behind the body, the near wing over it, and a
    moved wing gets his outline where it now meets the air or the body."""
    m, rgba, wing, side = p['fmask'], p['frgba'], p['fwing'], p['fside']
    if mode == 'up' or p['kind'] != 'crow' or not wing.any():
        return m, rgba, p['eyes'] & m
    k = (p['name'], mode)
    if k in _beats:
        return _beats[k]
    cut = p['cut']
    body = m & ~wing
    om, orgba = body.copy(), rgba * body[..., None]
    for s in sorted({1, 2} - {p['near']}) + [p['near']]:
        part = wing & (side == s)
        if not part.any():
            continue
        wm = np.zeros((OH, OW), bool)
        wr = np.zeros((OH, OW, 4), np.uint8)
        ys, xs = np.nonzero(part)
        k_, sign = (FOLD, -1) if mode == 'mid' else (DOWN, 1)
        if mode == 'down':  # a long wing hangs no lower than DOWN_MAX below the shoulder
            k_ = min(k_, DOWN_MAX / max(1.0, float(max(np.floor(cut[x]) - ys[xs == x].min() for x in np.unique(xs)))))
        for x in np.unique(xs):
            c = int(np.floor(cut[x]))  # the wing's root row
            h = c - ys[xs == x].min()
            for d in range(0, int(np.ceil(h * k_)) + 1):
                src = c - int(round(d / k_))
                y = c + sign * d
                if 0 <= src < OH and 0 <= y < OH and part[src, x]:
                    wm[y, x] = True
                    wr[y, x] = rgba[src, x]
        # Single-pixel gaps the flip leaves in a column close from the pixel above.
        gap = ~wm & shift_bool(wm, 1, 0) & shift_bool(wm, -1, 0)
        wr[gap] = shift_bool(wr, 1, 0)[gap]
        wm |= gap
        near_root = np.abs(np.arange(OH)[:, None] - cut[None, :]) < 2.0
        wr[edge(wm) & ~near_root, :3] = OUTLINE
        put = wm if s == p['near'] else wm & ~om
        om |= put
        orgba[put] = wr[put]
    eyes = p['eyes'] & om & (orgba[..., :3] != OUTLINE).any(-1)
    _beats[k] = (om, orgba, eyes)
    return _beats[k]


def darkened(rgba, m, eyes, k=0.55):
    """A crow still deep in the vortex: his pixels darkened toward his darkest violets, eyes lit."""
    out = rgba.copy()
    d = m & ~eyes
    out[d, :3] = SOLID[snap_idx(rgba[..., :3].astype(np.float32) * k, SOLID)][d]
    return out


def place(p, dx=0, dy=0, mirror=False, wings='up', dark=0.0, exact=False):
    """A piece moved by whole pixels, its wings beaten, mirrored about its eye (to turn round),
    darkened. exact: his picture's own cut (with the vortex showing through it), for his key frames."""
    if exact:
        m, rgba, eyes = p['mask'], p['rgba'], p['eyes']
    else:
        m, rgba, eyes = beat(p, wings)
    if mirror:
        ex2 = int(round(2 * p['eye'][0]))
        src = ex2 - np.arange(OW)
        ok = (src >= 0) & (src < OW)
        nm = np.zeros_like(m)
        nm[:, ok] = m[:, src[ok]]
        nr = np.zeros_like(rgba)
        nr[:, ok] = rgba[:, src[ok]]
        ne = np.zeros_like(eyes)
        ne[:, ok] = eyes[:, src[ok]]
        m, rgba, eyes = nm, nr, ne
    if dark:
        rgba = darkened(rgba, m, eyes, dark)
    return ('piece', move(m, dx, dy), move(rgba, dx, dy), move(eyes, dx, dy))


# --- frames ------------------------------------------------------------------------------------------------

def compose(items, his=None):
    """A frame, back to front: veils are laid over what is below them (and snapped back to the palette
    and the alpha steps), pieces are pasted. A piece's dark edge on open air gets his outline."""
    acc = np.zeros((OH, OW, 4), np.float32)
    owner = np.zeros((OH, OW), bool)
    eyes = np.zeros((OH, OW), bool)
    pasted = np.zeros((OH, OW), bool)
    for it in items:
        if it[0] == 'veil':
            v = it[1].astype(np.float32)
            a = v[..., 3:4] / 255
            da = acc[..., 3:4] / 255
            oa = a + da * (1 - a)
            acc[..., :3] = np.where(oa > 0, (v[..., :3] * a + acc[..., :3] * da * (1 - a)) / np.maximum(oa, 1e-6), 0)
            acc[..., 3:4] = oa * 255
            pasted &= ~(v[..., 3] > 0)
        else:
            _, m, rgba, ey = it
            acc[m] = rgba[m]
            owner |= m
            pasted |= m
            eyes = (eyes & ~m) | ey
    a = acc[..., 3] / 255
    col = acc[..., :3].copy()
    # Gaps shut in by the swarm (his background showing between crows that overlap) are filled: with his
    # own pixel there in his pictures, with his deepest violet in the frames between, so the ground
    # never shows through the middle of the flock.
    for pts in components(a <= 0.05):
        P = np.array(pts)
        if len(pts) > 60 or P[:, 0].min() == 0 or P[:, 1].min() == 0 or P[:, 0].max() == OH - 1 or P[:, 1].max() == OW - 1:
            continue
        col[P[:, 0], P[:, 1]] = his[P[:, 0], P[:, 1]] if his is not None else DEEP
        a[P[:, 0], P[:, 1]] = 1.0
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
    open_ = f[..., 3] == 0
    near_open = dilate(open_, 1) & ~open_
    dark_edge = pasted & near_open & ~eyes & (lum(f) < EDGE_LUM)
    f[dark_edge, :3] = OUTLINE
    # Lone specks a moved veil leaves (a pixel with no neighbour) go.
    a = f[..., 3] > 0
    nb = sum(shift_bool(a, dy, dx).astype(np.int32) for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)))
    f[a & (nb == 0) & ~pasted] = 0
    return f


O = np.array([OAX, OAY], np.float32)  # the swarm's centre (the anchor)
VC = np.array(to_game('L', VCX + PICS['L'][0], VCY + PICS['L'][1]), np.float32)  # the vortex's eye
PAIRS = {'L1': 'R1', 'L2': 'R2', 'L3': 'R6', 'L4': 'R5'}  # who becomes who (by place in the swarm)
PARTNER = {**PAIRS, **{v: k for k, v in PAIRS.items()}}
EMERGE = ['R3', 'R4']  # in the flock only: they come out of the vortex and go back into it
PHI = 14.0  # how far the swarm turns (degrees, clockwise) on its way between the two pictures
T_OUT = (0.22, 0.5, 0.8)  # how far frames 1-3 are on the way from his left picture to his right one
ORDER = {k: [p['name'] for p in PIECES[k] if p['kind'] == 'crow'] for k in PICS}
FEATHERS = {k: [p['name'] for p in PIECES[k] if p['kind'] == 'feather'] for k in PICS}
# Wing beats through the loop (f0..f5), two flights so the swarm never beats as one; his pictures are 'up'.
BEATS = {'A': ['up', 'down', 'mid', 'down', 'up', 'mid'], 'B': ['up', 'mid', 'down', 'mid', 'up', 'down']}
GROUP = {'L1': 'A', 'R1': 'A', 'L3': 'A', 'R6': 'A', 'R4': 'A', 'L2': 'B', 'R2': 'B', 'L4': 'B', 'R5': 'B', 'R3': 'B'}


def turn(pt, centre, deg, rho=1.0):
    a = np.deg2rad(deg)
    d = (np.asarray(pt, np.float32) - centre) * rho
    return centre + np.array([d[0] * np.cos(a) - d[1] * np.sin(a), d[0] * np.sin(a) + d[1] * np.cos(a)], np.float32)


def swirl(p, q, t, phi=PHI):
    """From p to q at t, the whole way bowed round the swarm's centre (the swarm turns as it changes;
    out one way, back the other, so every crow flies a loop)."""
    base = np.asarray(p, np.float32) + (np.asarray(q, np.float32) - p) * t
    return turn(base, O, phi * np.sin(np.pi * t))


def eye(name):
    return np.asarray(BY[name]['eye'], np.float32)


def at(name, pos, **kw):
    p = BY[name]
    d = np.round(np.asarray(pos) - eye(name)).astype(int)
    return place(p, int(d[0]), int(d[1]), **kw)


def feathers(key, deg=0.0, dx=0, dy=0, rho=1.0, centre=None, only=None):
    """His loose feathers of a picture, carried round the vortex by deg and drifted by (dx, dy)."""
    c = VC if centre is None else centre
    names = FEATHERS[key] if only is None else [n for i, n in enumerate(FEATHERS[key]) if i % only[0] == only[1]]
    return [at(n, turn(eye(n), c, deg, rho) + np.array([dx, dy], np.float32)) for n in names]


def key_frame(key):
    """His picture: his veil, his feathers and crows as he cut them (the vortex showing between the
    feathers); a gap in a crow with nothing of his behind it takes the crow's own neighbouring pixel."""
    v = veil(key)
    under = v[..., 3] > 0
    items = [('veil', v)]
    for n in FEATHERS[key] + ORDER[key]:
        p = BY[n]
        add = p['fmask'] & ~p['mask'] & ~under
        items.append(('piece', p['mask'] | add, np.where(add[..., None], p['frgba'], p['rgba']), p['eyes']))
    L = LAY[key]
    _, his = shrink(L['rgb'], np.ones(L['rgb'].shape[:2], np.float32), ANCH[key], S, SIZE, OANCHOR)
    return compose(items, his)


def wings(n, i):
    return BEATS[GROUP[n]][i]


def fly():
    """The loop: his left picture (0), the swarm breaking out of the vortex round a spiral (1-3), his
    right picture (4), the flock curling back toward the vortex as it opens again (5)."""
    f0 = key_frame('L')
    f4 = key_frame('R')
    # 1: the crows ride out round the vortex, a fifth of the way; it spins and starts to close.
    f1 = compose([('veil', veil('Lfill', deg=20, scale=0.9))] +
                 feathers('L', 18, -4, 1) +
                 [at(n, swirl(eye(n), eye(PAIRS[n]), T_OUT[0]), wings=wings(n, 1)) for n in ORDER['L']])
    # 2: half way: they break out to the right (the two looking back turn round), the vortex closes and
    # dims, the first two of the flock rise out of it, the feathers stream back.
    f2 = compose([('veil', veil('Lfill', deg=40, scale=0.62, glow=0.75))] +
                 [at(n, swirl(VC, eye(n), 0.5), wings=wings(n, 2), dark=0.6) for n in EMERGE] +
                 feathers('L', 34, -12, 2, only=(2, 0)) + feathers('R', 0, 10, -2, only=(2, 1)) +
                 [at(n, swirl(eye(n), eye(PAIRS[n]), T_OUT[1]), mirror=BY[n]['face'] < 0, wings=wings(n, 2)) for n in ORDER['L']])

    # 3: his flock nearly closed up, the vortex a small dim whirl behind it, his smoke trailing in.
    def r3(n):
        start = eye(PARTNER[n]) if n in PARTNER else VC
        return at(n, swirl(start, eye(n), T_OUT[2]), wings=wings(n, 3))
    f3 = compose([('veil', veil('Lfill', deg=60, scale=0.32, glow=0.5)), ('veil', veil('R', dx=4))] +
                 feathers('R', 0, 5, -1) + [r3(n) for n in ORDER['R']])

    # 5: the flock curls back toward the vortex opening again (the two at the back turn to it, the
    # two that came out of it sink back in behind it); the tail of the smoke is left behind.
    def r5(n):
        if n in PARTNER:
            return at(n, swirl(eye(n), eye(PARTNER[n]), 0.5, -PHI), wings=wings(n, 5), mirror=BY[PARTNER[n]]['face'] < 0)
        return at(n, swirl(eye(n), VC, 0.5, -PHI), wings=wings(n, 5), dark=0.6)
    back = [r5(n) for n in EMERGE]
    front = [r5(n) for n in ORDER['R'] if n not in EMERGE]
    f5 = compose([('veil', veil('R', tail=-44, dx=-8, dy=1))] + back +
                 [('veil', veil('Lfill', deg=-20, scale=0.5, glow=0.8))] +
                 feathers('R', 0, -9, 1, only=(2, 0)) + feathers('L', -18, 4, -1, only=(2, 1)) + front)
    return [f0, f1, f2, f3, f4, f5]


def summon():
    """At the caster: his vortex opens, spinning, and the crows come up out of it (dark at first, their
    eyes lit) and spiral out round it into his left picture."""
    def ring_(names, rho, deg, i, dark=0.0):
        return [at(n, turn(eye(n), VC, deg, rho), wings=['down', 'mid'][(j + i) % 2], dark=dark) for j, n in enumerate(names)]
    s0 = compose([('veil', veil('Lfill', deg=-150, scale=0.25, glow=0.6))] + feathers('L', -120, 0, 0, 0.3, only=(3, 0)))
    s1 = compose([('veil', veil('Lfill', deg=-115, scale=0.48, glow=0.8))] +
                 feathers('L', -95, 0, 0, 0.5, only=(2, 0)) + ring_(['L2', 'L3'], 0.42, -95, 1, dark=0.45))
    s2 = compose([('veil', veil('Lfill', deg=-85, scale=0.7))] +
                 feathers('L', -70, 0, 0, 0.66) + ring_(['L4', 'L1'], 0.55, -75, 0, dark=0.5) + ring_(['L2', 'L3'], 0.62, -70, 0, dark=0.8))
    s3 = compose([('veil', veil('Lfill', deg=-55, scale=0.88))] + feathers('L', -45, 0, 0, 0.82) + ring_(ORDER['L'], 0.8, -45, 1))
    s4 = compose([('veil', veil('Lfill', deg=-25))] + feathers('L', -20, 0, 0, 0.94) + ring_(ORDER['L'], 0.94, -20, 0))
    return [s0, s1, s2, s3, s4, key_frame('L')]


frames = {'fly': fly(), 'summon': summon()}
for anim, fr in frames.items():
    for i, f in enumerate(fr):
        a = f[..., 3] > 0
        assert not (a[0].any() or a[-1].any() or a[:, 0].any() or a[:, -1].any()), f'{anim} {i} touches the work canvas edge'

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

ALPH = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+,-./:;<=>?@[]^_{|}~'


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
    with open(tmp, 'w') as fh:
        fh.write('\n'.join(ts))
    os.replace(tmp, OUT_TS)
    print('colors', len(colors), 'bytes', os.path.getsize(OUT_TS))


note = [
    "The crow swarm (vfx_beasts/genjutsu), copied from his genjutsu sheet's BEAST panel, where he painted",
    "a swarm over our single crow: his left picture (crows circling a vortex) is fly frame 0 and the last",
    "summon frame, his right picture (the flock streaming right) is fly frame 4. The other frames move",
    "his crows as cut-out pieces (whole pixels, mirrored, his wing pixels flipped or folded for the beat),",
    "spin and close his vortex, thin his smoke in and out and drift his feathers back.",
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
    A, C = shrink(L['rgb'], np.ones(L['rgb'].shape[:2], np.float32), ANCH[key], S, SIZE, OANCHOR)
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
            'frame': FSIZE, 'anchor': FANCHOR, 'vortex': [VCX + PICS['L'][0], VCY + PICS['L'][1], VRAD]}
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
    vs = [veil('L'), veil('Lfill'), veil('Lfill', deg=20, scale=0.9), veil('Lfill', deg=40, scale=0.62, glow=0.7), veil('Lfill', deg=60, scale=0.32, glow=0.5), veil('R'), veil('Rfill'), veil('Rfill', tail=-30)]
    strip = np.concatenate([v[CY0:CY1, CX0:CX1] for v in vs], 1)
    bg = Image.new('RGBA', (strip.shape[1], strip.shape[0]), (0x5d, 0x6b, 0x57, 255))
    bg.alpha_composite(Image.fromarray(strip, 'RGBA'))
    save_whole(bg.resize((bg.width * 2, bg.height * 2), Image.NEAREST), os.path.join(DEBUG, 'crows-veils.png'))
    # Every crow piece on its own (his cut, then filled at the three beats), to check the cuts.
    names = ORDER['L'] + ORDER['R']
    T = 76
    rows = []
    for mode in ('exact', 'up', 'mid', 'down'):
        row = []
        for n in names:
            _, m, rgba, _ = place(BY[n], wings=mode if mode != 'exact' else 'up', exact=mode == 'exact')
            cx, cy = int(BY[n]['eye'][0]), int(BY[n]['eye'][1])
            big = np.zeros((OH + 2 * T, OW + 2 * T, 4), np.uint8)
            big[T:T + OH, T:T + OW] = rgba
            row.append(big[cy + T - 50:cy + T + 40, cx + T - 62:cx + T + 52] if BY[n]['face'] < 0 else big[cy + T - 50:cy + T + 40, cx + T - 96:cx + T + 18])
        rows.append(np.concatenate(row, 1))
    allp = np.concatenate(rows, 0)
    bg = Image.new('RGBA', (allp.shape[1], allp.shape[0]), (0x5d, 0x6b, 0x57, 255))
    bg.alpha_composite(Image.fromarray(allp, 'RGBA'))
    save_whole(bg.resize((bg.width * 3, bg.height * 3), Image.NEAREST), os.path.join(DEBUG, 'crows-pieces.png'))
