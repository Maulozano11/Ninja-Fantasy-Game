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
    A = np.asarray(big(cov).resize((ow, oh), Image.BOX, box=box))
    ch = np.stack([np.asarray(big(arr[..., c] * cov).resize((ow, oh), Image.BOX, box=box)) for c in range(arr.shape[2])], -1)
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
# Each crow is the polygon around it; where crows overlap the one listed later is in front. `wing`
# is the raised wing that flips for the down-stroke, `shoulder` the point it turns about.

CROWS = {
    'L': [
        {'name': 'L4', 'eye': (329, 928), 'face': -1, 'poly': [(298, 893), (304, 891), (312, 899), (318, 907), (322, 914), (330, 916), (338, 917), (344, 913), (350, 905), (358, 897), (366, 891), (372, 887), (371, 898), (374, 912), (380, 925), (389, 934), (386, 945), (378, 950), (364, 950), (352, 951), (343, 950), (337, 946), (331, 943), (325, 945), (318, 944), (315, 939), (317, 932), (315, 926), (309, 919), (303, 909), (298, 900)]},
        {'name': 'L1', 'eye': (308, 863), 'face': -1, 'poly': [(276, 838), (282, 840), (288, 846), (296, 851), (302, 855), (310, 855), (318, 857), (322, 860), (326, 856), (332, 848), (338, 840), (343, 833), (348, 826), (356, 820), (364, 814), (370, 809), (374, 811), (375, 820), (375, 832), (372, 842), (366, 850), (358, 857), (350, 861), (345, 868), (343, 878), (340, 888), (335, 896), (326, 900), (316, 897), (309, 892), (304, 884), (299, 878), (295, 873), (294, 867), (296, 863), (290, 861), (284, 857), (279, 851), (275, 844)]},
        {'name': 'L2', 'eye': (468, 852), 'face': 1, 'poly': [(406, 808), (411, 809), (418, 819), (425, 827), (432, 834), (440, 839), (447, 843), (453, 841), (459, 835), (466, 828), (474, 821), (481, 815), (486, 812), (488, 817), (483, 826), (477, 834), (471, 841), (473, 846), (479, 852), (484, 858), (487, 864), (481, 865), (473, 863), (468, 867), (466, 872), (462, 872), (446, 871), (436, 868), (428, 863), (420, 859), (412, 853), (405, 847), (401, 839), (400, 829), (402, 818)]},
        {'name': 'L3', 'eye': (446, 924), 'face': 1, 'poly': [(387, 852), (392, 858), (398, 868), (404, 878), (410, 890), (416, 900), (422, 908), (429, 912), (432, 903), (432, 885), (433, 871), (437, 866), (446, 864), (455, 863), (462, 866), (465, 876), (463, 891), (460, 904), (459, 912), (463, 920), (467, 928), (471, 934), (463, 937), (455, 941), (448, 947), (441, 952), (437, 961), (425, 963), (414, 961), (400, 960), (388, 958), (382, 952), (386, 945), (394, 940), (389, 934), (380, 925), (374, 912), (371, 898), (371, 882), (375, 869), (381, 859)],
         'keep': [(414, 946), (440, 946), (440, 965), (414, 965)]},
    ],
    'R': [
        {'name': 'R1', 'eye': (665, 887), 'face': 1, 'poly': [(606, 848), (612, 846), (620, 854), (628, 860), (628, 846), (632, 838), (637, 836), (641, 842), (645, 836), (650, 840), (652, 850), (655, 862), (658, 870), (662, 876), (668, 880), (674, 884), (680, 889), (678, 894), (670, 894), (662, 897), (652, 900), (640, 901), (626, 899), (612, 896), (602, 893), (600, 886), (604, 876), (604, 862)]},
        {'name': 'R2', 'eye': (712, 874), 'face': 1, 'poly': [(656, 832), (664, 832), (672, 838), (682, 846), (690, 852), (696, 860), (700, 866), (706, 866), (714, 866), (720, 870), (724, 876), (727, 881), (720, 882), (712, 882), (704, 884), (694, 882), (684, 876), (672, 868), (662, 860), (655, 850), (653, 840)]},
        {'name': 'R4', 'eye': (761, 911), 'face': 1, 'poly': [(697, 880), (705, 880), (715, 878), (720, 868), (726, 866), (734, 870), (742, 866), (748, 872), (752, 884), (752, 896), (750, 904), (758, 904), (766, 906), (772, 912), (775, 920), (766, 920), (758, 924), (746, 926), (734, 926), (724, 920), (718, 912), (712, 904), (704, 894), (698, 887)]},
        {'name': 'R3', 'eye': (700, 901), 'face': 1, 'poly': [(655, 898), (668, 895), (680, 893), (690, 892), (700, 893), (708, 896), (713, 900), (717, 905), (710, 908), (700, 910), (688, 911), (675, 912), (662, 912), (652, 908)]},
        {'name': 'R5', 'eye': (667, 934), 'face': 1, 'poly': [(610, 905), (618, 904), (628, 910), (636, 916), (642, 922), (648, 926), (655, 924), (664, 925), (672, 929), (678, 934), (683, 940), (676, 944), (668, 946), (660, 949), (648, 951), (636, 952), (622, 951), (610, 948), (604, 942), (608, 935), (612, 928), (610, 918)]},
        {'name': 'R6', 'eye': (734, 944), 'face': 1, 'poly': [(666, 904), (674, 906), (684, 912), (694, 918), (704, 925), (712, 931), (720, 935), (730, 935), (740, 938), (748, 944), (753, 951), (746, 954), (738, 956), (728, 958), (718, 962), (718, 972), (714, 979), (704, 979), (696, 972), (690, 968), (678, 968), (668, 964), (668, 955), (674, 948), (670, 940), (666, 928), (664, 915)]},
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
        crows.append({**spec, 'mask': m, 'eyemask': eye})
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
print('outline', OUTLINE.astype(int).tolist(), 'eyes', EYES.astype(int).tolist())


# --- layers onto the game grid -----------------------------------------------------------------------

def game_solids(key):
    """Every crow and feather of a picture on the game grid: (name, kind, opaque mask, RGBA)."""
    L = LAY[key]
    items = [('crow', cr) for cr in L['crows']] + [('feather', f) for f in L['feathers']]
    covs = []
    for kind, it in items:
        A, C = shrink(L['rgb'], it['mask'].astype(np.float32), ANCH[key], S, SIZE, OANCHOR)
        covs.append((A, C))
    tot = sum(A for A, _ in covs)
    stack = np.stack([A for A, _ in covs])
    # Later items are in front: break ties toward them.
    owner = np.argmax(stack + np.arange(len(covs))[:, None, None] * 1e-3, 0)
    solid = tot >= 0.5
    out = []
    for i, (kind, it) in enumerate(items):
        A, C = covs[i]
        m = solid & (owner == i)
        if m.sum() == 0:
            continue
        # Specks cut off from the piece are dropped.
        for pts in components(m):
            if len(pts) <= 2:
                m[tuple(np.array(pts).T)] = False
        rgba = np.zeros((OH, OW, 4), np.uint8)
        rgba[m, :3] = SOLID[snap_idx(C, SOLID)][m]
        rgba[m, 3] = 255
        if kind == 'crow':
            Ae, Ce = shrink(L['rgb'], it['eyemask'].astype(np.float32), ANCH[key], S, SIZE, OANCHOR)
            em = m & (Ae >= 0.22)
            rgba[em, :3] = EYES[snap_idx(Ce, EYES)][em]
        e = ring(m)
        rgba[e, :3] = OUTLINE
        if kind == 'crow':
            rgba[em & ~e, :3] = EYES[snap_idx(Ce, EYES)][em & ~e]
        out.append({'name': it['name'], 'kind': kind, 'mask': m, 'rgba': rgba, 'spec': it})
    return out


def game_veil(key, rgb=None, alpha=None):
    L = LAY[key]
    if rgb is None:
        rgb, alpha = L['veil']
    A, C = shrink(rgb, alpha.astype(np.float32), ANCH[key], S, SIZE, OANCHOR)
    out = np.zeros((OH, OW, 4), np.uint8)
    idx = snap_idx(C, VEIL)
    for lo, a in ALEVELS:
        m = (A >= lo) & (out[..., 3] == 0)
        out[m, :3] = VEIL[idx][m]
        out[m, 3] = a
    return out


def over(dst, src):
    """src composited over dst (both RGBA uint8); opaque src pixels replace, translucent ones blend."""
    a = src[..., 3:4].astype(np.float32) / 255
    da = dst[..., 3:4].astype(np.float32) / 255
    oa = a + da * (1 - a)
    col = np.where(oa > 0, (src[..., :3] * a + dst[..., :3] * da * (1 - a)) / np.maximum(oa, 1e-6), 0)
    out = np.concatenate([np.round(col), np.round(oa * 255)], -1).astype(np.uint8)
    return out


SOL = {k: game_solids(k) for k in PICS}
VEILG = {k: game_veil(k) for k in PICS}


def key_frame(key):
    f = VEILG[key].copy()
    for it in SOL[key]:
        m = it['mask']
        f[m] = it['rgba'][m]
    return f


frames = {'fly': [key_frame('L'), key_frame('R')]}


# --- debug ---------------------------------------------------------------------------------------------

def save_whole(img, path):
    tmp = path + '.part'
    img.save(tmp, format='PNG')
    os.replace(tmp, path)


if DEBUG:
    os.makedirs(DEBUG, exist_ok=True)
    for anim, fr in frames.items():
        strip = np.zeros((OH, OW * len(fr), 4), np.uint8)
        for i, f in enumerate(fr):
            strip[:, i * OW:(i + 1) * OW] = f
        for name, bgc in (('dark', (31, 31, 41, 255)), ('green', (0x5d, 0x6b, 0x57, 255))):
            bg = Image.new('RGBA', (strip.shape[1], OH), bgc)
            bg.alpha_composite(Image.fromarray(strip, 'RGBA'))
            save_whole(bg.resize((bg.width * 3, bg.height * 3), Image.NEAREST), os.path.join(DEBUG, f'crows-{anim}-{name}.png'))


def his_at_scale(key):
    """His picture area-averaged to the game grid on our anchor (no palette), RGBA over his background."""
    L = LAY[key]
    A, C = shrink(L['rgb'], np.ones(L['rgb'].shape[:2], np.float32), ANCH[key], S, SIZE, OANCHOR)
    out = np.zeros((OH, OW, 4), np.uint8)
    out[..., :3] = np.clip(np.round(C), 0, 255)
    out[..., 3] = np.where(A > 0.99, 255, 0)
    return out


if DEBUG:
    for k in PICS:
        h = his_at_scale(k)
        o = frames['fly'][0 if k == 'L' else 1]
        ys, xs = np.nonzero(LAY and (o[..., 3] > 0))
        bx0, by0, bx1, by1 = xs.min() - 3, ys.min() - 3, xs.max() + 4, ys.max() + 4
        w, hh = bx1 - bx0, by1 - by0
        bg = Image.new('RGBA', (w * 2 + 4, hh), (31, 31, 41, 255))
        bg.alpha_composite(Image.fromarray(h[by0:by1, bx0:bx1], 'RGBA'), (0, 0))
        bg.alpha_composite(Image.fromarray(o[by0:by1, bx0:bx1], 'RGBA'), (w + 4, 0))
        save_whole(bg.resize((bg.width * 4, bg.height * 4), Image.NEAREST), os.path.join(DEBUG, f'cmp-{k}.png'))
