"""Turns the owner's phoenix reference sheet into game frames (vfx_beasts/fire).

    python3 -I phoenix-from-ref.py REF-phoenix-owner.jpg <out.ts> [debugDir]

His sheet has eight numbered fly-loop panels (with ticks on the panel edges marking the anchor), a
dive frame and an attack frame. Each panel is cropped, its olive background removed, scaled so the
bird matches his scale row next to our character (frame 0 about 100 px tall), area-averaged down,
snapped to a palette sampled from his own pixels, and cleaned to a 1 px dark-red outline; embers and
smoke keep no outline. Every frame is placed on one canvas with the body-centre anchor in the same
spot. The dive and attack loops are built around his key frames with in-betweens derived from them:
the wings and tail flutter by a smooth warp, the embers drift, and the attack's fireball grows out of
the beak and flies off. The result is written as a TypeScript data module (palette + run-length rows)
that the generator (tools/world-sprites/vfx-beasts.ts) decodes, so the build needs no image files.
Deterministic: no randomness anywhere.
"""
import os
import sys
from collections import deque

import numpy as np
from PIL import Image

REF, OUT_TS = sys.argv[1], sys.argv[2]
DEBUG = sys.argv[3] if len(sys.argv) > 3 else None

ref = np.asarray(Image.open(REF).convert('RGB')).astype(np.float32)
COLS = [(11, 256), (263, 509), (516, 761), (768, 1013)]
ROWS = {'top': (25, 178), 'r1': (210, 348), 'r2': (355, 493)}
TARGET_H = 100.0  # frame 0, wing tips to tail, at 1x (our character is 96 px tall)


def panel(row, col):
    y0, y1 = ROWS[row]
    x0, x1 = COLS[col]
    return ref[y0:y1, x0:x1].copy(), (x0, y0)


def masks(crop, row):
    r, g, b = crop[..., 0], crop[..., 1], crop[..., 2]
    ring = np.concatenate([crop[3:6, 20:-20].reshape(-1, 3), crop[-6:-3, 40:-20].reshape(-1, 3)])
    bg = np.median(ring, 0)
    diff = np.abs(crop - bg).sum(2)
    warm = (r - b > 45) & (diff > 45)
    darkred = (r > g + 18) & (r > b + 18) & (diff > 40)
    bird = warm | darkred
    lum = crop.sum(2)
    sat = crop.max(2) - crop.min(2)
    smoke = ~bird & (sat < 30) & (lum < bg.sum() - 26)
    # The JPEG halo around his dark outline is not smoke: keep smoke clear of the bird.
    near = bird.copy()
    for _ in range(3):
        grow = near.copy()
        grow[1:] |= near[:-1]
        grow[:-1] |= near[1:]
        grow[:, 1:] |= near[:, :-1]
        grow[:, :-1] |= near[:, 1:]
        near = grow
    smoke &= ~near
    # Labels: the frame number in the bottom-left corner, the titles on the top row, the tick marks.
    for m in (bird, smoke):
        m[-22:, :24] = False
        m[:4, :] = False
        m[:, :4] = False
        m[-4:, :] = False
        m[:, -4:] = False
        if row == 'top':
            m[:16, :170] = False
    return bird, smoke, bg


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


def layers(crop, row, fireball=False):
    """Splits a panel into body (outlined), ember and smoke coverage, plus the fireball if asked."""
    bird, smoke, bg = masks(crop, row)
    H, W = bird.shape
    body = np.zeros((H, W), np.float32)
    ember = np.zeros((H, W), np.float32)
    ball = np.zeros((H, W), np.float32)
    comps = sorted(components(bird), key=len, reverse=True)
    for i, pts in enumerate(comps):
        ys = np.array([p[0] for p in pts])
        xs = np.array([p[1] for p in pts])
        if fireball and i > 0 and len(pts) > 300 and xs.mean() > W * 0.7:
            ball[ys, xs] = 1
        elif len(pts) >= 30:
            body[ys, xs] = 1
        else:
            ember[ys, xs] = 1
    return body, ember, smoke.astype(np.float32), ball


def warp(arr, dx, dy):
    """Samples arr at (x - dx, y - dy), bilinear (arr is H x W or H x W x C)."""
    H, W = arr.shape[:2]
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    sx = np.clip(xx - dx, 0, W - 1.001)
    sy = np.clip(yy - dy, 0, H - 1.001)
    x0 = np.floor(sx).astype(int)
    y0 = np.floor(sy).astype(int)
    fx = sx - x0
    fy = sy - y0
    if arr.ndim == 3:
        fx = fx[..., None]
        fy = fy[..., None]
    a = arr[y0, x0] * (1 - fx) + arr[y0, x0 + 1] * fx
    b = arr[y0 + 1, x0] * (1 - fx) + arr[y0 + 1, x0 + 1] * fx
    return a * (1 - fy) + b * fy


def shrink(crop, cov, anchor, s, out_size, out_anchor):
    """Area-averages coverage `cov` and the colour under it into the output grid (anchor aligned)."""
    H, W = cov.shape
    ow, oh = out_size
    ax, ay = anchor
    oax, oay = out_anchor
    x0 = ax - oax / s
    y0 = ay - oay / s
    box = (x0, y0, x0 + ow / s, y0 + oh / s)
    pad = int(max(ow, oh) / s) + 4
    def big(a):
        z = np.zeros((H + 2 * pad, W + 2 * pad), np.float32)
        z[pad:pad + H, pad:pad + W] = a
        return Image.fromarray(z, 'F')
    pb = tuple(v + pad for v in box)
    A = np.asarray(big(cov).resize((ow, oh), Image.BOX, box=pb))
    rgb = []
    for c in range(3):
        rgb.append(np.asarray(big(crop[..., c] * cov).resize((ow, oh), Image.BOX, box=pb)))
    rgb = np.stack(rgb, -1)
    col = np.where(A[..., None] > 1e-4, rgb / np.maximum(A[..., None], 1e-4), 0)
    return A, col


def best_shift(a, b, R=30):
    """Translation (dx, dy) that best lays mask b onto mask a."""
    best, arg = -1, (0, 0)
    H, W = a.shape
    for dy in range(-R, R + 1):
        for dx in range(-R, R + 1):
            ys0, ys1 = max(0, dy), min(H, H + dy)
            xs0, xs1 = max(0, dx), min(W, W + dx)
            ov = (a[ys0:ys1, xs0:xs1] * b[ys0 - dy:ys1 - dy, xs0 - dx:xs1 - dx]).sum()
            if ov > best:
                best, arg = ov, (dx, dy)
    return arg


# --- anchors: the ticks on the loop panels; the top row is aligned through its copy of frame 0 ------

def tick_x(row, col):
    y0, _ = ROWS[row]
    x0, x1 = COLS[col]
    top = ref[y0:y0 + 4, x0:x1].sum(2).max(0)
    return float(np.argmax(top))


LOOP = [('r1', c) for c in range(4)] + [('r2', c) for c in range(4)]
ANCHORS = {}
for row, col in LOOP:
    ANCHORS[(row, col)] = (tick_x(row, col), 79.0 if row == 'r1' else 80.0)

top0, _ = panel('top', 0)
loop0, _ = panel('r1', 0)
mt = masks(top0, 'top')[0].astype(np.float32)
ml = masks(loop0, 'r1')[0].astype(np.float32)
h = min(mt.shape[0], ml.shape[0])
w = min(mt.shape[1], ml.shape[1])
sdx, sdy = best_shift(mt[:h, :w], ml[:h, :w])
TOP_ANCHOR = (ANCHORS[('r1', 0)][0] + sdx, ANCHORS[('r1', 0)][1] + sdy)
print('top-row shift', (sdx, sdy), 'anchor', TOP_ANCHOR)

body0 = layers(loop0, 'r1')[0]
ys = np.nonzero(body0.any(1))[0]
S = TARGET_H / (ys.max() - ys.min() + 1)
print('scale', S)

# The output canvas: big enough for every frame, the anchor at a fixed spot.
OW, OH = 200, 132
OAX, OAY = 108, 70


# --- palette sampled from his pixels ---------------------------------------------------------------

samples = []
for row, col in LOOP + [('top', 2), ('top', 3)]:
    crop, _ = panel(row, col)
    bird = masks(crop, row)[0]
    samples.append(crop[bird])
samples = np.concatenate(samples).astype(np.uint8)
pimg = Image.fromarray(samples.reshape(1, -1, 3), 'RGB').quantize(colors=30, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
PAL = np.array(pimg.getpalette()[:30 * 3], np.float32).reshape(-1, 3)
lumv = PAL @ np.array([0.3, 0.55, 0.15], np.float32)
# The outline: his darkest red.
OUTLINE = PAL[np.argmin(lumv + (PAL[:, 0] < PAL[:, 2]) * 999)]
smk = []
for row, col in [('r2', 2), ('r2', 3)]:
    crop, _ = panel(row, col)
    smk.append(crop[masks(crop, row)[1]])
smk = np.concatenate(smk).astype(np.uint8)
SPAL = np.array(Image.fromarray(smk.reshape(1, -1, 3), 'RGB').quantize(colors=3, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).getpalette()[:9], np.float32).reshape(-1, 3)
print('outline', OUTLINE, 'smoke', SPAL.astype(int).tolist())


def snap(col, pal):
    d = ((col[..., None, :] - pal[None, None]) ** 2).sum(-1)
    return pal[np.argmin(d, -1)]


def frame(row, col, anchor, dx=None, dy=None, ember_shift=(0.0, 0.0), ball_at=None):
    """One output frame (RGBA uint8, OH x OW) from a panel, optionally warped, embers shifted, fireball placed."""
    crop, _ = panel(row, col)
    body, ember, smoke, ball = layers(crop, row, fireball=ball_at is not None)
    if dx is not None:
        crop_w = warp(crop, dx, dy)
        body = warp(body, dx, dy)
        smoke = warp(smoke, dx, dy)
    else:
        crop_w = crop
    if ember_shift != (0.0, 0.0):
        ember_img = warp(np.concatenate([crop, ember[..., None]], -1), np.full(ember.shape, ember_shift[0], np.float32), np.full(ember.shape, ember_shift[1], np.float32))
        ember_col, ember = ember_img[..., :3], ember_img[..., 3]
    else:
        ember_col = crop
    A, C = shrink(crop_w, body, anchor, S, (OW, OH), (OAX, OAY))
    Ae, Ce = shrink(ember_col, ember, anchor, S, (OW, OH), (OAX, OAY))
    As, Cs = shrink(crop_w, smoke, anchor, S, (OW, OH), (OAX, OAY))
    out = np.zeros((OH, OW, 4), np.uint8)
    # Smoke first (under everything), semi-transparent.
    sm = As > 0.3
    out[sm, :3] = snap(Cs, SPAL)[sm]
    out[sm, 3] = np.where(As[sm] > 0.75, 190, np.where(As[sm] > 0.5, 150, 110)).astype(np.uint8)
    # Embers: his colours, no outline.
    em = Ae > 0.22
    out[em, :3] = snap(Ce, PAL)[em]
    out[em, 3] = 255
    # Body: opaque where at least half covered, snapped to his palette.
    op = A >= 0.5
    # Pinholes filled, specks dropped.
    nb = np.zeros_like(A)
    for oy, ox in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        nb += np.roll(np.roll(op, oy, 0), ox, 1)
    op = (op & (nb >= 1)) | (~op & (nb >= 3) & (A > 0.25))
    col_s = snap(C, PAL)
    out[op, :3] = col_s[op]
    out[op, 3] = 255
    # The fireball (attack): pasted from his key, scaled and moved, no outline.
    if ball_at is not None and ball_at[2] > 0:
        bx, by, bs = ball_at
        ys_, xs_ = np.nonzero(ball)
        cx, cy = xs_.mean(), ys_.mean()
        # Shrink the ball about its own centre by bs and move its centre by (bx, by) ref px.
        Hh, Ww = ball.shape
        yy, xx = np.mgrid[0:Hh, 0:Ww].astype(np.float32)
        srcx = cx + (xx - (cx + bx)) / bs
        srcy = cy + (yy - (cy + by)) / bs
        ddx = xx - srcx
        ddy = yy - srcy
        bc = warp(crop, ddx, ddy)
        bm = warp(ball, ddx, ddy)
        Ab, Cb = shrink(bc, bm, anchor, S, (OW, OH), (OAX, OAY))
        bmk = Ab > 0.35
        out[bmk, :3] = snap(Cb, PAL)[bmk]
        out[bmk, 3] = 255
    # A clean 1 px outline around the body (not the embers, smoke or fireball).
    edge = np.zeros_like(op)
    for oy, ox in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        edge |= op & ~np.roll(np.roll(op, oy, 0), ox, 1)
    out[edge, :3] = OUTLINE
    out[edge, 3] = 255
    return out


def flutter(row, col, anchor, k, n, amp_tail, amp_wing, tail_side=-1):
    """A smooth warp: the tail (behind the anchor) and the wings (above it) sway; the body stays."""
    crop, _ = panel(row, col)
    H, W = crop.shape[:2]
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    ax, ay = anchor
    ph = 2 * np.pi * k / n
    rx, ry = xx - ax, yy - ay
    dist = np.hypot(rx, ry)
    w = np.clip((dist - 14) / 50, 0, 1) ** 1.5
    tail = np.clip(tail_side * rx / 40, 0, 1) * np.clip(1 - (-ry) / 60, 0, 1)
    wing = np.clip(-ry / 50, 0, 1)
    dy = w * (tail * amp_tail * np.sin(ph - dist / 16) + wing * amp_wing * np.sin(ph + 0.6))
    dx = w * (wing * amp_wing * 0.5 * np.cos(ph + 0.6))
    return dx.astype(np.float32), dy.astype(np.float32)


frames = {'fly': [], 'dive': [], 'attack': []}
for row, col in LOOP:
    frames['fly'].append(frame(row, col, ANCHORS[(row, col)]))
# Dive: his DIVE FRAME 0 as the key of a five-frame loop; wings and tail flutter, embers drift.
for k in range(5):
    dx, dy = flutter('top', 2, TOP_ANCHOR, k, 5, 2.4, 1.6)
    e = (-(k % 5) * 2.2, -(k % 5) * 1.4)
    frames['dive'].append(frame('top', 2, TOP_ANCHOR, dx, dy, ember_shift=e))
# Attack (once): wings beat up into his ATTACK FRAME 3 while the fireball grows out of the beak and flies.
crop3, _ = panel('top', 3)
ball3 = layers(crop3, 'top', fireball=True)[3]
bys, bxs = np.nonzero(ball3)
BALL_W = bxs.max() - bxs.min()
BEAK = -46.0  # the beak sits this far left of his fireball's centre (ref px)
attack_plan = [  # (wing phase, fireball dx from his key position, scale)
    (0.0, None, 0),
    (0.25, BEAK + 4, 0.32),
    (0.5, BEAK + 22, 0.62),
    (0.75, 0.0, 1.0),
    (1.0, 18.0, 0.88),
    (1.25, None, 0),
]
for k, (ph, bx, bs) in enumerate(attack_plan):
    dx, dy = flutter('top', 3, TOP_ANCHOR, ph * 4, 4, 1.2, 1.8)
    frames['attack'].append(frame('top', 3, TOP_ANCHOR, dx, dy, ember_shift=(-k * 1.5, -k * 1.0), ball_at=(bx if bx is not None else 0, 0, bs)))

# --- write the data module: one palette of RGBA colours, run-length rows ---------------------------------

colors = {}
def cid(px):
    key = '#%02x%02x%02x%02x' % tuple(int(v) for v in px)
    if key not in colors:
        colors[key] = len(colors) + 1
    return colors[key]

ALPH = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+,-./:;<=>?@[]^_{|}'
enc = {}
for anim, fr in frames.items():
    enc[anim] = []
    for img in fr:
        rows = []
        for y in range(OH):
            toks = []
            x = 0
            while x < OW:
                px = img[y, x]
                i = 0 if px[3] == 0 else cid(px)
                n = 1
                while x + n < OW and ((img[y, x + n][3] == 0 and i == 0) or (i != 0 and img[y, x + n][3] != 0 and cid(img[y, x + n]) == i)):
                    n += 1
                toks.append(ALPH[i] + (str(n) if n > 1 else ''))
                x += n
            rows.append(''.join(toks))
        enc[anim].append('/'.join(rows) if False else '\n'.join(rows))
assert len(colors) < len(ALPH), len(colors)
pal_list = ['#00000000'] + list(colors.keys())

ts = []
ts.append('// Generated by art2/phoenix-from-ref.py from the owner\'s phoenix reference sheet. Do not edit by hand.')
ts.append('//')
ts.append('// The frames of vfx_beasts/fire, copied from his sheet: each panel cropped, the background removed,')
ts.append('// scaled to his scale row next to our character, area-averaged, snapped to a palette sampled from his')
ts.append('// pixels and cleaned to a 1 px dark-red outline; dive and attack add in-betweens around his key frames.')
ts.append('// Each frame is ' + f'{OW}x{OH}' + ' with the body-centre anchor at ' + f'({OAX}, {OAY})' + '; rows are run-length')
ts.append('// encoded: a symbol (an index into PHOENIX_PALETTE through PHOENIX_ALPHABET, 0 = clear) and a repeat count.')
ts.append('')
ts.append(f'export const PHOENIX_SIZE: [number, number] = [{OW}, {OH}];')
ts.append(f'export const PHOENIX_ANCHOR: [number, number] = [{OAX}, {OAY}];')
ts.append(f"export const PHOENIX_ALPHABET = '{ALPH}';")
ts.append('export const PHOENIX_PALETTE: string[] = [')
for i in range(0, len(pal_list), 8):
    ts.append('  ' + ', '.join(f"'{c}'" for c in pal_list[i:i + 8]) + ',')
ts.append('];')
ts.append('export const PHOENIX_FRAMES: Record<string, string[]> = {')
for anim, fr in enc.items():
    ts.append(f'  {anim}: [')
    for f in fr:
        ts.append('    `' + f + '`,')
    ts.append('  ],')
ts.append('};')
ts.append('')
tmp = OUT_TS + '.part'
with open(tmp, 'w') as fh:
    fh.write('\n'.join(ts))
os.replace(tmp, OUT_TS)
print('colors', len(colors), 'bytes', os.path.getsize(OUT_TS))

if DEBUG:
    for anim, fr in frames.items():
        strip = np.zeros((OH, OW * len(fr), 4), np.uint8)
        for i, f in enumerate(fr):
            strip[:, i * OW:(i + 1) * OW] = f
        bg = Image.new('RGBA', (strip.shape[1], OH), (0x5d, 0x6b, 0x57, 255))
        bg.alpha_composite(Image.fromarray(strip, 'RGBA'))
        bg = bg.resize((bg.width * 3, bg.height * 3), Image.NEAREST)
        bg.save(os.path.join(DEBUG, f'phx-{anim}.png'))
