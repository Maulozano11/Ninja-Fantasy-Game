"""Turns the owner's genjutsu sheet into the crow swarm for vfx_beasts (sprite 'genjutsu').

    python3 -I tools/refs/crows-from-ref.py <genjutsu-sheet.jpg> <out.ts> [debugDir]

His sheet (docs/reference/genjutsu-set-owner-reference.jpg) is a paint-over of our genjutsu kit. Under
BEAST (CROW, APPROVED, IN GAME) he replaced our single crow with a swarm in two pictures: on the left,
crows with red eyes circling a dark violet vortex with violet feathers flying; on the right, the
flock streaming right as a dense mass with dark smoke and feathers trailing. He asked for his art to
be copied as exactly as possible, so his two pictures ARE frames 0 and 4 of the 6-frame fly loop.

How: his character (beside the blast, the walls) is measured against ours (96 px) for the scale.
Each picture is split into layers in his own pixels: every crow is cut out along a hand-traced
outline (bright vortex showing between its feathers stays with the vortex), small loose feathers
are found as separate pieces, and what is left (the vortex, the smoke) is a veil un-mixed from his
background into colour plus alpha, so it stays translucent. Each layer is area-averaged down to the
game scale on one grid (the anchor at the centre of the swarm mass, shared by both pictures),
snapped to a palette sampled from his pixels, and the crows and feathers get a 1 px outline in his
own darkest crow colour (his crows are truly black-violet). The eyes are kept as his red.

The other frames are made from those game-scale pieces, so the crows keep his pixels: they move by
whole pixels, are mirrored, or have a wing (cut along a traced line) flipped about the shoulder for
the down-stroke. The vortex spins (his vortex resampled under a rotation, with the holes the crows
leave filled from the spiral itself) and fades as the flock forms; the smoke fades in; the feathers
drift back. The 'summon' anim opens the vortex and brings the crows in around it, ending on his
left picture. The result is a TypeScript data module (palette + run-length rows) that the generator
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
RESAMPLE = getattr(Image, os.environ.get("CROWS_FILTER", "BILINEAR"))

ref = np.asarray(Image.open(REF).convert('RGB')).astype(np.float32)
H_REF, W_REF = ref.shape[:2]
BG = np.array([31, 31, 41], np.float32)  # his panel background (measured: flat, +-1)

# His BEAST panel (inside the border lines) and the two pictures in it.
PANEL = (261, 796, 786, 1010)
PICS = {'L': (262, 798, 522, 1009), 'R': (522, 798, 785, 1009)}


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


def dilate(m, n=1):
    for _ in range(n):
        g = m.copy()
        g[1:] |= m[:-1]
        g[:-1] |= m[1:]
        g[:, 1:] |= m[:, :-1]
        g[:, :-1] |= m[:, 1:]
        m = g
    return m


def shift_bool(m, dy, dx):
    out = np.zeros_like(m)
    H, W = m.shape
    ys0, ys1 = max(0, dy), min(H, H + dy)
    xs0, xs1 = max(0, dx), min(W, W + dx)
    out[ys0:ys1, xs0:xs1] = m[ys0 - dy:ys1 - dy, xs0 - dx:xs1 - dx]
    return out


def ring(m):
    """Pixels of m with a 4-neighbour outside m."""
    e = np.zeros_like(m)
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        e |= m & ~shift_bool(m, dy, dx)
    return e


def poly_mask(pts, shape, off=(0, 0)):
    img = Image.new('L', (shape[1], shape[0]), 0)
    ImageDraw.Draw(img).polygon([(x - off[0], y - off[1]) for x, y in pts], fill=1, outline=1)
    return np.asarray(img).astype(bool)


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
# of a crow above its `cut` line is its raised wings, which flip about the `shoulder` row for the
# down-stroke; `face` is the way it looks (1 right, -1 left).

CROWS = {
    'L': [
        {'name': 'L4', 'cut': [(292, 921), (314, 918), (322, 914), (345, 916), (356, 925), (372, 935), (396, 941)], 'shoulder': 922, 'eye': (329, 928), 'face': -1, 'poly': [(298, 893), (304, 891), (312, 899), (318, 907), (322, 914), (330, 916), (338, 917), (344, 913), (350, 905), (358, 897), (366, 891), (372, 887), (371, 898), (374, 912), (380, 925), (389, 934), (386, 945), (378, 950), (364, 950), (352, 951), (343, 950), (337, 946), (331, 943), (325, 945), (318, 944), (315, 939), (317, 932), (315, 926), (309, 919), (303, 909), (298, 900)]},
        {'name': 'L1', 'cut': [(268, 862), (293, 860), (298, 855), (322, 855), (329, 860), (346, 864), (380, 862)], 'shoulder': 860, 'eye': (308, 863), 'face': -1, 'poly': [(276, 838), (282, 840), (288, 846), (296, 851), (302, 855), (310, 855), (318, 857), (322, 860), (326, 856), (332, 848), (338, 840), (343, 833), (348, 826), (356, 820), (364, 814), (370, 809), (374, 811), (375, 820), (375, 832), (372, 842), (366, 850), (358, 857), (350, 861), (345, 868), (343, 878), (340, 888), (335, 896), (326, 900), (316, 897), (309, 892), (304, 884), (299, 878), (295, 873), (294, 867), (296, 863), (290, 861), (284, 857), (279, 851), (275, 844)]},
        {'name': 'L2', 'cut': [(395, 866), (428, 866), (440, 856), (448, 846), (458, 843), (472, 841), (492, 841)], 'shoulder': 850, 'eye': (468, 852), 'face': 1, 'poly': [(406, 808), (411, 809), (418, 819), (425, 827), (432, 834), (440, 839), (447, 843), (453, 841), (459, 835), (466, 828), (474, 821), (481, 815), (486, 812), (488, 817), (483, 826), (477, 834), (471, 841), (473, 846), (479, 852), (484, 858), (487, 864), (481, 865), (473, 863), (468, 867), (466, 872), (462, 872), (446, 871), (436, 868), (428, 863), (420, 859), (412, 853), (405, 847), (401, 839), (400, 829), (402, 818)]},
        {'name': 'L3', 'cut': [(365, 932), (400, 936), (420, 918), (430, 914), (440, 913), (458, 913), (475, 913)], 'shoulder': 915, 'eye': (446, 924), 'face': 1, 'poly': [(387, 852), (392, 858), (398, 868), (404, 878), (410, 890), (416, 900), (422, 908), (429, 912), (432, 903), (432, 885), (433, 871), (437, 866), (446, 864), (455, 863), (462, 866), (465, 876), (463, 891), (460, 904), (459, 912), (463, 920), (467, 928), (471, 934), (463, 937), (455, 941), (448, 947), (441, 952), (437, 961), (425, 963), (414, 961), (400, 960), (388, 958), (382, 952), (386, 945), (394, 940), (389, 934), (380, 925), (374, 912), (371, 898), (371, 882), (375, 869), (381, 859)],
         'keep': [(414, 946), (440, 946), (440, 965), (414, 965)]},
    ],
    'R': [
        {'name': 'R1', 'cut': [(596, 885), (640, 887), (650, 881), (660, 877), (686, 878)], 'shoulder': 882, 'eye': (665, 887), 'face': 1, 'poly': [(606, 848), (612, 846), (620, 854), (628, 860), (628, 846), (632, 838), (637, 836), (641, 842), (645, 836), (650, 840), (652, 850), (655, 862), (658, 870), (662, 876), (668, 880), (674, 884), (680, 889), (678, 894), (670, 894), (662, 897), (652, 900), (640, 901), (626, 899), (612, 896), (602, 893), (600, 886), (604, 876), (604, 862)]},
        {'name': 'R2', 'cut': [(648, 869), (680, 873), (698, 868), (705, 866), (730, 866)], 'shoulder': 870, 'eye': (712, 874), 'face': 1, 'poly': [(656, 832), (664, 832), (672, 838), (682, 846), (690, 852), (696, 860), (700, 866), (706, 866), (714, 866), (720, 870), (724, 876), (727, 881), (720, 882), (712, 882), (704, 884), (694, 882), (684, 876), (672, 868), (662, 860), (655, 850), (653, 840)]},
        {'name': 'R4', 'cut': [(694, 896), (720, 906), (745, 905), (780, 903)], 'shoulder': 905, 'eye': (761, 911), 'face': 1, 'poly': [(697, 880), (705, 880), (715, 878), (720, 868), (726, 866), (734, 870), (742, 866), (748, 872), (752, 884), (752, 896), (750, 904), (758, 904), (766, 906), (772, 912), (775, 920), (766, 920), (758, 924), (746, 926), (734, 926), (724, 920), (718, 912), (712, 904), (704, 894), (698, 887)]},
        {'name': 'R3', 'eye': (700, 901), 'face': 1, 'poly': [(655, 898), (668, 895), (680, 893), (690, 892), (700, 893), (708, 896), (713, 900), (717, 905), (710, 908), (700, 910), (688, 911), (675, 912), (662, 912), (652, 908)]},
        {'name': 'R5', 'cut': [(600, 937), (630, 939), (645, 931), (655, 925), (690, 925)], 'shoulder': 930, 'eye': (667, 934), 'face': 1, 'poly': [(610, 905), (618, 904), (628, 910), (636, 916), (642, 922), (648, 926), (655, 924), (664, 925), (672, 929), (678, 934), (683, 940), (676, 944), (668, 946), (660, 949), (648, 951), (636, 952), (622, 951), (610, 948), (604, 942), (608, 935), (612, 928), (610, 918)]},
        {'name': 'R6', 'cut': [(660, 951), (700, 946), (718, 937), (730, 935), (760, 935)], 'shoulder': 938, 'eye': (734, 944), 'face': 1, 'poly': [(666, 904), (674, 906), (684, 912), (694, 918), (704, 925), (712, 931), (720, 935), (730, 935), (740, 938), (748, 944), (753, 951), (746, 954), (738, 956), (728, 958), (718, 962), (718, 972), (714, 979), (704, 979), (696, 972), (690, 968), (678, 968), (668, 964), (668, 955), (674, 948), (670, 940), (666, 928), (664, 915)]},
    ],
}


# --- his pictures into layers (sheet pixels) -----------------------------------------------------------

def layers(key):
    x0, y0, x1, y1 = PICS[key]
    c = ref[y0:y1, x0:x1].copy()
    H, W = c.shape[:2]
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    diff = np.abs(c - BG).sum(2)
    lum = c.mean(2)
    fg = diff > 15
    for pts in components(fg):
        if len(pts) < 4:
            fg[tuple(np.array(pts).T)] = False
    # The vortex's bright violet: it shows between the crows' feathers and stays with the vortex.
    vivid = ((b - g > 62) | ((r + b) / 2 - g > 50)) & (lum > 40)
    crows = []
    taken = np.zeros((H, W), bool)
    for spec in reversed(CROWS[key]):  # front first
        m = poly_mask(spec['poly'], (H, W), (x0, y0)) & fg & ~taken
        keep = poly_mask(spec['keep'], (H, W), (x0, y0)) if 'keep' in spec else np.zeros((H, W), bool)
        m &= ~vivid | keep
        taken |= m
        eye = m & (r > 95) & (r > g + 38) & (r > b + 4)
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
        bright = (lum[ys, xs] > 52).sum()
        if len(pts) <= 320 and max(np.ptp(ys), np.ptp(xs)) <= 34 and bright >= 3:
            m = np.zeros((H, W), bool)
            m[ys, xs] = True
            feathers.append({'name': f'{key}f{len(feathers)}', 'mask': m, 'eye': (x0 + xs.mean(), y0 + ys.mean())})
    for f in feathers:
        rest &= ~f['mask']
    # The veil: what is left, un-mixed from his background into colour and alpha.
    up = np.where(c > BG, (c - BG) / (255 - BG), (BG - c) / BG).max(2)
    alpha = np.clip(up / 0.6, 0, 1) * rest
    ink = np.where(alpha[..., None] > 1e-3, BG + (c - BG) / np.maximum(alpha[..., None], 1e-3), 0)
    return {'box': (x0, y0, x1, y1), 'rgb': c, 'fg': fg, 'crows': crows, 'feathers': feathers, 'veil': (np.clip(ink, 0, 255), alpha)}


LAY = {k: layers(k) for k in PICS}
for k, v in LAY.items():
    print(k, 'crows', [int(cr['mask'].sum()) for cr in v['crows']], 'feathers', len(v['feathers']), 'veil px', int((v['veil'][1] > 0).sum()))


def sheet_xy(key, pt):
    x0, y0 = PICS[key][:2]
    return pt[0] - x0, pt[1] - y0


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
print('anchors (picture px):', {k: (round(a[0] + PICS[k][0], 1), round(a[1] + PICS[k][1], 1)) for k, a in ANCH.items()})


def extent(key):
    L = LAY[key]
    ys, xs = np.nonzero(L['fg'])
    ax, ay = ANCH[key]
    return xs.min() - ax, ys.min() - ay, xs.max() + 1 - ax, ys.max() + 1 - ay


MARGIN = 26  # game px around both pictures for the in-betweens' motion
ex = [extent(k) for k in PICS]
lx = min(e[0] for e in ex) * S
ty = min(e[1] for e in ex) * S
rx = max(e[2] for e in ex) * S
by = max(e[3] for e in ex) * S
OAX = int(np.ceil(-lx)) + MARGIN
OAY = int(np.ceil(-ty)) + MARGIN
OW = OAX + int(np.ceil(rx)) + MARGIN
OH = OAY + int(np.ceil(by)) + MARGIN
SIZE, OANCHOR = (OW, OH), (OAX, OAY)
print('work canvas', SIZE, 'anchor', OANCHOR)


# --- palettes (sampled from his pixels) ------------------------------------------------------------------

solid_px = np.concatenate([L['rgb'][cr['mask'] & ~cr['eyemask']] for L in LAY.values() for cr in L['crows']] + [L['rgb'][f['mask']] for L in LAY.values() for f in L['feathers']])
SOLID = median_palette(solid_px, 30)
OUTLINE = SOLID[np.argmin(SOLID.sum(1))]
eye_px = np.concatenate([L['rgb'][cr['eyemask']] for L in LAY.values() for cr in L['crows']])
EYES = median_palette(eye_px, 3)
veil_px = np.concatenate([L['veil'][0][L['veil'][1] > 0.5] for L in LAY.values()])
VEIL = median_palette(veil_px, 12)
ALEVELS = [(0.78, 255), (0.5, 180), (0.24, 100)]
EDGE_LUM = 52.0  # edge pixels darker than this are his outline
print('outline', OUTLINE.astype(int).tolist(), 'eyes', EYES.astype(int).tolist())


# --- the veils: his vortex and his smoke, filled where the crows hid them ----------------------------------

def premul(rgb, alpha):
    return np.concatenate([rgb * alpha[..., None], alpha[..., None]], -1)


def vortex_centre():
    rgb, alpha = LAY['L']['veil']
    big = max(components(alpha > 0.5), key=len)
    ys = np.array([p[0] for p in big], np.float32)
    xs = np.array([p[1] for p in big], np.float32)
    cx, cy = float(xs.mean()), float(ys.mean())
    rad = float(np.percentile(np.hypot(xs - cx, ys - cy), 96))
    return cx, cy, rad


VCX, VCY, VRAD = vortex_centre()
print('vortex centre (sheet px)', round(VCX + PICS['L'][0], 1), round(VCY + PICS['L'][1], 1), 'radius', round(VRAD, 1))


def filled_vortex():
    """His vortex with the holes the crows and feathers leave filled from the spiral itself: each hole
    pixel takes the vortex as it is a turn of the spiral away (the nearest turn that has it)."""
    L = LAY['L']
    rgb, alpha = L['veil']
    pm = premul(rgb, alpha)
    H, W = alpha.shape
    yy, xx = np.mgrid[0:H, 0:W]
    disc = np.hypot(xx - VCX, yy - VCY) < VRAD
    hole = disc & (L['fg'] & (alpha < 0.05))
    for deg in (30, -30, 60, -60, 95, -95, 130, -130, 170):
        if not hole.any():
            break
        rp = rotate(pm, deg, VCX, VCY)
        take = hole & (rp[..., 3] > 0.25)
        pm[take] = rp[take]
        hole &= ~take
    a = pm[..., 3]
    return np.where(a[..., None] > 1e-3, pm[..., :3] / np.maximum(a[..., None], 1e-3), 0), a


def filled_smoke():
    """His smoke with the holes under the crows filled by spreading the smoke around them inward."""
    L = LAY['R']
    rgb, alpha = L['veil']
    pm = premul(rgb, alpha)
    under = np.zeros(alpha.shape, bool)
    for cr in L['crows']:
        under |= cr['mask']
    under = dilate(under, 1) & ~(alpha > 0.05)
    known = ~under
    for _ in range(40):
        if not under.any():
            break
        acc = np.zeros_like(pm)
        n = np.zeros(alpha.shape, np.float32)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            sh = np.roll(np.roll(pm, dy, 0), dx, 1)
            kn = np.roll(np.roll(known, dy, 0), dx, 1)
            acc += sh * kn[..., None]
            n += kn
        new = under & (n > 0)
        pm[new] = acc[new] / n[new][:, None]
        known |= new
        under &= ~new
    a = pm[..., 3]
    return np.where(a[..., None] > 1e-3, pm[..., :3] / np.maximum(a[..., None], 1e-3), 0), a


VEILS = {'L': LAY['L']['veil'], 'R': LAY['R']['veil'], 'Lfill': filled_vortex(), 'Rfill': filled_smoke()}


# --- onto the game grid ------------------------------------------------------------------------------------

PAL_OPAQUE = np.concatenate([SOLID, VEIL])


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


def veil(name, deg=0.0, scale=1.0, fade=1.0, dx=0, dy=0):
    """A veil on the game grid: his vortex/smoke turned and scaled about the vortex centre, faded, moved."""
    key = name[0]
    rgb, alpha = VEILS[name]
    if deg or scale != 1.0:
        pm = rotate(premul(rgb, alpha), deg, VCX, VCY, scale)
        alpha = pm[..., 3]
        rgb = np.where(alpha[..., None] > 1e-3, pm[..., :3] / np.maximum(alpha[..., None], 1e-3), 0)
    A, C = shrink(rgb, alpha.astype(np.float32), ANCH[key], S, SIZE, OANCHOR)
    v = quantize_veil(A * fade, C)
    return move(v, dx, dy)


def move(arr, dx, dy):
    out = np.zeros_like(arr)
    H, W = arr.shape[:2]
    ys0, ys1 = max(0, dy), min(H, H + dy)
    xs0, xs1 = max(0, dx), min(W, W + dx)
    out[ys0:ys1, xs0:xs1] = arr[ys0 - dy:ys1 - dy, xs0 - dx:xs1 - dx]
    return out


def to_game(key, x, y):
    """A sheet point on the game grid."""
    return OAX + (x - PICS[key][0] - ANCH[key][0]) * S, OAY + (y - PICS[key][1] - ANCH[key][1]) * S


def game_pieces(key):
    """Every crow and feather of a picture on the game grid, cut where his picture has them."""
    L = LAY[key]
    items = [('crow', cr) for cr in L['crows']] + [('feather', f) for f in L['feathers']]
    covs = [shrink(L['rgb'], it['mask'].astype(np.float32), ANCH[key], S, SIZE, OANCHOR) for _, it in items]
    stack = np.stack([A for A, _ in covs])
    solid = stack.sum(0) >= 0.5
    # Later items are in front: ties go to them.
    owner = np.argmax(stack + np.arange(len(covs))[:, None, None] * 1e-3, 0)
    out = []
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
        wing = np.zeros((OH, OW), bool)
        piece = {'name': it['name'], 'kind': kind, 'key': key, 'mask': m, 'rgba': rgba, 'eyes': eyes, 'wing': wing}
        if kind == 'crow':
            Ae, Ce = shrink(L['rgb'], it['eyemask'].astype(np.float32), ANCH[key], S, SIZE, OANCHOR)
            eyes |= m & (Ae >= 0.22)
            rgba[eyes, :3] = EYES[snap_idx(Ce, EYES)][eyes]
            Aw, _ = shrink(L['rgb'], it['wingmask'].astype(np.float32), ANCH[key], S, SIZE, OANCHOR)
            wing |= m & (Aw >= 0.5 * np.maximum(A, 1e-3)) & ~eyes
            ex, ey = to_game(key, *it['eye'])
            piece.update(eye=(ex, ey), face=it['face'], sy2=int(round(2 * to_game(key, 0, it['shoulder'])[1])) if 'shoulder' in it else None)
        else:
            ys, xs = np.nonzero(m)
            piece.update(eye=(float(xs.mean()), float(ys.mean())), face=0, sy2=None)
        out.append(piece)
    return out


PIECES = {k: game_pieces(k) for k in PICS}
BY = {p['name']: p for k in PICS for p in PIECES[k]}


def place(p, dx=0, dy=0, mirror=False, flap=False, shadow=False):
    """A piece moved by whole pixels: mirrored about its eye, its wings flipped about the shoulder,
    or as a dark shadow with only the eyes lit. Returns (mask, rgba, eyes)."""
    m, rgba, eyes = p['mask'], p['rgba'], p['eyes']
    if flap and p['sy2'] is not None and p['wing'].any():
        body = m & ~p['wing']
        src = p['sy2'] - np.arange(OH)
        ok = (src >= 0) & (src < OH)
        fw = np.zeros_like(m)
        fw[ok] = p['wing'][src[ok]]
        frgba = np.zeros_like(rgba)
        frgba[ok] = (rgba * p['wing'][..., None])[src[ok]]
        nr = rgba * body[..., None]
        nr[fw] = frgba[fw]
        m, rgba = body | fw, nr
        eyes = eyes & ~fw
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
    if shadow:
        rgba = rgba.copy()
        rgba[m & ~eyes, :3] = OUTLINE
    return move(m, dx, dy), move(rgba, dx, dy), move(eyes, dx, dy)


def flatten(layers_):
    """Veils composited back to front and snapped back to the palette and the alpha steps."""
    acc = np.zeros((OH, OW, 4), np.float32)
    for v in layers_:
        a = v[..., 3:4].astype(np.float32) / 255
        da = acc[..., 3:4]
        oa = a + da * (1 - a)
        acc[..., :3] = np.where(oa > 0, (v[..., :3] * a + acc[..., :3] * da * (1 - a)) / np.maximum(oa, 1e-6), 0)
        acc[..., 3:4] = oa
    return quantize_veil(acc[..., 3], acc[..., :3])


def compose(veils, placed):
    """A frame: veils, then the pieces back to front; a piece's edge on open air gets his outline."""
    f = flatten(veils) if veils else np.zeros((OH, OW, 4), np.uint8)
    owner = -np.ones((OH, OW), np.int32)
    eyes = np.zeros((OH, OW), bool)
    for i, (m, rgba, ey) in enumerate(placed):
        f[m] = rgba[m]
        owner[m] = i
        eyes = (eyes & ~m) | ey
    # His crows and feathers carry a dark outline: where a piece meets the open air its edge pixels
    # that are dark in his art become the one outline colour (light feather tips touching the edge
    # stay as he painted them).
    open_ = f[..., 3] == 0
    near_open = np.zeros((OH, OW), bool)
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        near_open |= shift_bool(open_, dy, dx)
    lum = f[..., :3].astype(np.float32) @ np.array([0.3, 0.55, 0.15], np.float32)
    edge = (owner >= 0) & near_open & ~eyes & (lum < EDGE_LUM)
    f[edge, :3] = OUTLINE
    return f


# --- the animations ----------------------------------------------------------------------------------------

O = np.array([OAX, OAY], np.float32)  # the swarm's centre (the anchor)
VC = np.array(to_game('L', VCX + PICS['L'][0], VCY + PICS['L'][1]), np.float32)  # the vortex's eye
PAIRS = {'L1': 'R1', 'L2': 'R2', 'L3': 'R6', 'L4': 'R5'}  # who becomes who (by place in the swarm)
PARTNER = {**PAIRS, **{v: k for k, v in PAIRS.items()}}
EMERGE = ['R3', 'R4']  # in the flock only: they come out of the vortex and go back into it
PHI = 28.0  # how far the swarm turns (degrees, clockwise) on its way between the two pictures
ORDER = {k: [p['name'] for p in PIECES[k] if p['kind'] == 'crow'] for k in PICS}
FEATHERS = {k: [p['name'] for p in PIECES[k] if p['kind'] == 'feather'] for k in PICS}


def turn(pt, centre, deg, rho=1.0):
    a = np.deg2rad(deg)
    d = (np.asarray(pt, np.float32) - centre) * rho
    return centre + np.array([d[0] * np.cos(a) - d[1] * np.sin(a), d[0] * np.sin(a) + d[1] * np.cos(a)], np.float32)


def swirl(p, q, t):
    """From p to q at t, the whole way bowed round the swarm's centre (the swarm turns as it changes)."""
    base = np.asarray(p, np.float32) + (np.asarray(q, np.float32) - p) * t
    return turn(base, O, PHI * np.sin(np.pi * t))


def at(name, pos, **kw):
    p = BY[name]
    d = np.round(np.asarray(pos) - np.asarray(p['eye'])).astype(int)
    return place(p, int(d[0]), int(d[1]), **kw)


def eye(name):
    return np.asarray(BY[name]['eye'], np.float32)


def feathers(key, deg=0.0, dx=0, dy=0, rho=1.0, centre=None):
    """His loose feathers of a picture, carried round the vortex by deg and drifted by (dx, dy)."""
    c = VC if centre is None else centre
    return [at(n, turn(eye(n), c, deg, rho) + np.array([dx, dy], np.float32)) for n in FEATHERS[key]]


def key_frame(key):
    return compose([veil(key)], [place(BY[n]) for n in FEATHERS[key]] + [place(BY[n]) for n in ORDER[key]])


def fly():
    f0 = key_frame('L')
    f4 = key_frame('R')
    # 1: the crows ride round the vortex on the down-stroke; it spins and starts to thin.
    f1 = compose([veil('Lfill', deg=24, fade=0.75)],
                 feathers('L', 16, -5, 1) + [at(n, swirl(eye(n), eye(PAIRS[n]), 0.25), flap=True) for n in ORDER['L']])
    # 2: they break out to the right (the two looking back turn round); the smoke gathers.
    f2 = compose([veil('Lfill', deg=48, fade=0.45), veil('Rfill', fade=0.3, dx=8)],
                 feathers('L', 30, -11, 2) + feathers('R', 0, 12, -2) +
                 [at(n, swirl(eye(n), eye(PAIRS[n]), 0.5), mirror=BY[n]['face'] < 0) for n in ORDER['L']])
    # 3: his flock nearly closed up, two more crows out of the vortex, wings down.
    def r3(n):
        start = eye(PARTNER[n]) if n in PARTNER else VC
        return at(n, swirl(start, eye(n), 0.75), flap=True)
    f3 = compose([veil('Lfill', deg=72, fade=0.18), veil('Rfill', fade=0.7, dx=4)],
                 feathers('R', 0, 6, -1) + [r3(n) for n in ORDER['R']])
    # 5: the flock curls back into the returning vortex (the two at the back turn to it).
    def r5(n):
        if n in PARTNER:
            return at(n, swirl(eye(n), eye(PARTNER[n]), 0.5), flap=True, mirror=BY[PARTNER[n]]['face'] < 0)
        return at(n, swirl(eye(n), VC, 0.5), flap=True, shadow=True)
    f5 = compose([veil('Lfill', deg=-24, fade=0.5), veil('Rfill', fade=0.45, dx=-6)],
                 feathers('R', 0, -6, 1) + feathers('L', -16, 5, -1) + [r5(n) for n in ORDER['R']])
    return [f0, f1, f2, f3, f4, f5]


def summon():
    """The vortex opens at the caster and the crows come out of it and circle in, ending on his picture."""
    def ring_(names, rho, deg, **kw):
        return [at(n, turn(eye(n), VC, deg, rho), **kw) for n in names]
    s0 = compose([veil('Lfill', deg=-150, scale=0.3, fade=0.6)], [])
    s1 = compose([veil('Lfill', deg=-110, scale=0.55, fade=0.85)], ring_(['L2', 'L3'], 0.35, -80, shadow=True))
    s2 = compose([veil('Lfill', deg=-75, scale=0.75)],
                 feathers('L', -60, 0, 0, 0.5) + ring_(['L4', 'L1'], 0.45, -65, shadow=True) + ring_(['L2', 'L3'], 0.6, -55, flap=True))
    s3 = compose([veil('Lfill', deg=-45, scale=0.9)], feathers('L', -30, 0, 0, 0.75) + ring_(ORDER['L'], 0.8, -35))
    s4 = compose([veil('Lfill', deg=-20)], feathers('L', -12, 0, 0, 0.92) + ring_(ORDER['L'], 0.95, -15, flap=True))
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
CX0, CY0, CX1, CY1 = xs.min() - 1, ys.min() - 1, xs.max() + 2, ys.max() + 2
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
    "his crows as cut-out pieces (whole pixels, mirrored, wings flipped for the down-stroke), spin and",
    f"fade his vortex and fade in his smoke. Scale: his character is {HIS_CHAR_H:.0f} px tall in that sheet, ours {CHAR_H:.0f}.",
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
    for k, i in (('L', 0), ('R', 4)):
        h = his_at_scale(k)
        o = frames['fly'][i]
        bg = Image.new('RGBA', (W * 2 + 4, H), (31, 31, 41, 255))
        bg.alpha_composite(Image.fromarray(h, 'RGBA'), (0, 0))
        bg.alpha_composite(Image.fromarray(o, 'RGBA'), (W + 4, 0))
        save_whole(bg.resize((bg.width * 4, bg.height * 4), Image.NEAREST), os.path.join(DEBUG, f'cmp-{k}.png'))
