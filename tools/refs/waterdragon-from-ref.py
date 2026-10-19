"""The water dragon from the owner's WATER SET sheet (its BEAST panel), as vfx_beasts water frames.

    python3 -I tools/refs/waterdragon-from-ref.py <water-set-sheet.jpg> tools/world-sprites/vfx-beasts-ref-water2.ts [debugDir]

The owner's BEAST (WATER DRAGON) panel shows his four-legged water drake with fins in two poses: a
striding pose (left) and a leaping, stretched pose (right). His rule is to copy his examples as
exactly as possible, so his pixels are the key frames: the left picture is fly frame 0 and the right
one is frame 5, at the 2/3 point of the 8-frame loop. The other frames are cut from his pixels, as a
running-in-the-air cycle:

- legs: the region under the body around each shoulder and hip is swung about that joint (front
  legs reaching forward on the way into the leap, sweeping back after it; hind legs the other way),
  easing in near the joint so the legs bend instead of shearing off the body;
- tail and dorsal fins: a travelling wave sways the tail and the fins lean with the stride;
- spray: his droplets drift back.
Frames 1-2 and 7 are cut from the striding picture, 3-4 and 6 from the leaping one.

Scale: his character in the same sheet is ~102 px tall and ours is 96 px. The box filter is laid on
his pixel grid at the crispest phase, colours are snapped to a palette sampled from his dragon, and
the outline is cleaned to 1 px in his darkest navy; droplets keep no outline. The result is a
TypeScript data module (palette + run-length rows) for tools/world-sprites/vfx-beast-waterdragon.ts.
Deterministic.
"""
import os
import sys
from collections import deque

import numpy as np
from PIL import Image, ImageDraw

REF, OUT_TS = sys.argv[1], sys.argv[2]
DEBUG = sys.argv[3] if len(sys.argv) > 3 else None
CHAR_H = 96.0  # our character (kit characterRef), feet to hair, at 1x

ref = np.asarray(Image.open(REF).convert('RGB')).astype(np.float32)

PANEL = (332, 712, 690, 822)  # the BEAST panel (inside its frame)
SPLIT = 503  # between his two pictures
BG = np.array([30, 30, 40], np.float32)
# Per picture (his image pixels): the anchor (middle of the torso), the shoulder and hip pivots with
# the belly line under them, the tail base and the dorsal fins' box.
KEYS = {
    'stride': {
        'anchor': (419.0, 772.0), 'shoulder': (438.0, 776.0), 'hip': (402.0, 774.0),
        'front': (420, 484, 777), 'hind': (372, 419, 775),  # x range and the belly line
        'jaw': [(462, 779), (476, 786), (500, 786), (500, 760), (462, 760)],  # kept out of the front legs
        'tail': 392, 'fins': (398, 448, 752),
    },
    'leap': {
        'anchor': (601.0, 769.0), 'shoulder': (616.0, 766.0), 'hip': (588.0, 770.0),
        'front': (603, 662, 768), 'hind': (545, 602, 772),
        'tail': 566, 'fins': (586, 632, 746),
    },
}
WAX, WAY, CW, CH = 120, 70, 240, 130  # working canvas (his pixels) around each picture's anchor


# His character, measured in his WALL and WALL_DIAG panels (hair to feet): sets the scale.
def char_height(x0, y0, x1, y1):
    c = ref[y0:y1, x0:x1]
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    hair = (b > r + 12) & (b > 55) & (r < 110) & (g < 120)
    top = min(y for y in range(c.shape[0]) if hair[y].sum() >= 3)
    bg = np.median(c[-3:].reshape(-1, 3), 0)
    body = (np.abs(c - bg).sum(2) > 70) & ~((b > r + 40) & (g > r + 20) & (b > 120))
    bottom = max(y for y in range(c.shape[0]) if body[y].sum() >= 3)
    return bottom - top + 1


HIS_CHAR_H = (char_height(318, 380, 380, 495) + char_height(620, 455, 690, 570)) / 2
S = CHAR_H / HIS_CHAR_H
print('his character', HIS_CHAR_H, 'px tall; scale', round(S, 4))


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


def dilate(m, n):
    for _ in range(n):
        g = m.copy()
        g[1:] |= m[:-1]
        g[:-1] |= m[1:]
        g[:, 1:] |= m[:, :-1]
        g[:, :-1] |= m[:, 1:]
        m = g
    return m


def warp(arr, dx, dy):
    """Samples arr at (x - dx, y - dy), bilinear (arr is H x W or H x W x C)."""
    H, W = arr.shape[:2]
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    sx = np.clip(xx - dx, 0, W - 1.001)
    sy = np.clip(yy - dy, 0, H - 1.001)
    x0 = np.floor(sx).astype(int)
    y0 = np.floor(sy).astype(int)
    fx = (sx - x0).astype(np.float32)
    fy = (sy - y0).astype(np.float32)
    if arr.ndim == 3:
        fx = fx[..., None]
        fy = fy[..., None]
    a = arr[y0, x0] * (1 - fx) + arr[y0, x0 + 1] * fx
    b = arr[y0 + 1, x0] * (1 - fx) + arr[y0 + 1, x0 + 1] * fx
    return (a * (1 - fy) + b * fy).astype(np.float32)


def snap(col, pal):
    d = ((col[..., None, :] - pal[None, None]) ** 2).sum(-1)
    return pal[np.argmin(d, -1)]


def median_palette(pixels, n):
    img = Image.fromarray(pixels.astype(np.uint8).reshape(1, -1, 3), 'RGB')
    q = img.quantize(colors=n, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    return np.array(q.getpalette()[:n * 3], np.float32).reshape(-1, 3)


yy, xx = np.mgrid[0:CH, 0:CW].astype(np.float32)


class Key:
    """One of his pictures on the working canvas (its anchor at WAX, WAY), split into layers."""

    def __init__(self, name):
        k = KEYS[name]
        self.k = k
        ax, ay = k['anchor']
        self.ox, self.oy = int(np.floor(ax - WAX)), int(np.floor(ay - WAY))
        crop = ref[self.oy:self.oy + CH, self.ox:self.ox + CW].copy()
        gx, gy = xx + self.ox, yy + self.oy
        inside = (gx >= PANEL[0] + 2) & (gx < PANEL[2] - 2) & (gy >= PANEL[1] + 2) & (gy < PANEL[3] - 2)
        inside &= (gx < SPLIT) if name == 'stride' else (gx >= SPLIT)
        r, g, b = crop[..., 0], crop[..., 1], crop[..., 2]
        diff = np.abs(crop - BG).sum(2)
        drake = (((b > r + 30) & (diff > 55)) | ((b > r + 8) & (diff > 30) & (crop.sum(2) < 200))) & inside
        drake |= ~dilate(~dilate(drake, 2), 2) & (diff > 60) & inside
        body = np.zeros(drake.shape, bool)
        spray = np.zeros(drake.shape, bool)
        for pts in components(drake):
            ys = np.array([p[0] for p in pts])
            xs = np.array([p[1] for p in pts])
            (body if len(pts) >= 150 else spray)[ys, xs] = True
        self.crop, self.body, self.spray = crop, body, spray
        # Each droplet on its own, so the spray can thin out or build up a few drops at a time.
        self.drops = [np.array(pts) for pts in components(spray)]
        L = lambda p: (p[0] - self.ox, p[1] - self.oy)
        self.shoulder, self.hip = L(k['shoulder']), L(k['hip'])
        f0, f1, fb = k['front']
        h0, h1, hb = k['hind']
        self.front = body & (gx >= f0) & (gx < f1) & (gy > fb)
        if 'jaw' in k:
            jaw = Image.new('L', (CW, CH), 0)
            ImageDraw.Draw(jaw).polygon([(x - self.ox, y - self.oy) for x, y in k['jaw']], fill=255)
            self.front &= ~(np.asarray(jaw) > 0)
        self.hind = body & (gx >= h0) & (gx < h1) & (gy > hb)
        self.tailx = k['tail'] - self.ox
        fx0, fx1, fy1 = k['fins']
        self.fins = body & (gx >= fx0) & (gx < fx1) & (gy < fy1)
        self.rest = body & ~self.front & ~self.hind
        self.anchor_frac = (ax - self.ox, ay - self.oy)

    def layer(self, mask):
        m = mask.astype(np.float32)
        return np.concatenate([self.crop * m[..., None], m[..., None]], -1)


def swing(arr, deg, pivot, ease=12.0):
    """arr swung by deg (screen degrees, positive = clockwise) about pivot, easing in near it."""
    px, py = pivot
    rx, ry = xx - px, yy - py
    t = np.clip(np.hypot(rx, ry) / ease, 0, 1)
    a = (np.deg2rad(deg) * t * t * (3 - 2 * t)).astype(np.float32)
    sx = px + rx * np.cos(a) + ry * np.sin(a)
    sy = py - rx * np.sin(a) + ry * np.cos(a)
    return warp(arr, xx - sx, yy - sy)


def over(top, under):
    return top + under * (1 - top[..., 3:4])


def some_drops(key, frac, salt):
    """The droplets of a picture, a deterministic `frac` of them (chosen by a hash of their index)."""
    m = np.zeros((CH, CW), bool)
    for i, pts in enumerate(key.drops):
        if ((i * 2654435761 + salt * 97) % 1000) / 1000.0 < frac:
            m[pts[:, 0], pts[:, 1]] = True
    return np.concatenate([key.crop * m[..., None], m[..., None].astype(np.float32)], -1)


def frame_layers(key, front=0.0, hind=0.0, tail=(0.0, 0.0), fins=0.0, drift=0.0, own=1.0, other=None, other_frac=0.0, salt=0):
    """His picture with the legs swung, the tail and fins swayed and the spray drifted; `own` keeps a share
    of its droplets and `other_frac` borrows droplets from the other picture, so the spray builds up toward
    the leap and thins out after it instead of popping."""
    rest = key.layer(key.rest)
    if tail[1]:
        ph, amp = tail
        dist = np.clip(key.tailx - xx, 0, None)
        w = np.clip(dist / 40, 0, 1)
        rest = warp(rest, np.zeros_like(xx), (w * amp * np.sin(ph - dist / 18)).astype(np.float32))
    if fins:
        # The dorsal fins lean back with the stride: a shear that grows toward their tips.
        fx0, fx1, fy1 = key.k['fins']
        top = np.clip((fy1 - key.oy - yy) / 20, 0, 1) * ((xx + key.ox >= fx0 - 4) & (xx + key.ox < fx1 + 4))
        rest = warp(rest, (fins * top).astype(np.float32), np.zeros_like(xx))
    legs_f = swing(key.layer(key.front), front, key.shoulder)
    legs_h = swing(key.layer(key.hind), hind, key.hip)
    body = over(legs_f, over(legs_h, rest))  # near legs are drawn over the body in his picture too
    spray = some_drops(key, own, salt) if own < 1 else key.layer(key.spray)
    if other is not None and other_frac > 0:
        spray = over(some_drops(other, other_frac, salt + 1), spray)
    spray = warp(spray, np.full(xx.shape, drift, np.float32), np.zeros_like(xx))
    return body, spray


keys = {n: Key(n) for n in KEYS}
samples = np.concatenate([keys[n].crop[keys[n].body] for n in keys])
PAL = median_palette(samples, 40)
lum = PAL @ np.array([0.3, 0.55, 0.15], np.float32)
OUTLINE = PAL[np.argmin(lum)]
SPAL = median_palette(np.concatenate([keys[n].crop[keys[n].spray] for n in keys]), 8)
print('outline', OUTLINE.astype(int).tolist())

OW, OH = int(CW * S) - 1, int(CH * S) - 1


def shrink(lay, origin):
    box = (origin[0], origin[1], origin[0] + OW / S, origin[1] + OH / S)
    ch = [np.asarray(Image.fromarray(np.ascontiguousarray(lay[..., c], dtype=np.float32), 'F').resize((OW, OH), Image.BOX, box=box)) for c in range(4)]
    A = ch[3]
    return A, np.clip(np.stack(ch[:3], -1) / np.maximum(A, 1e-4)[..., None], 0, 255)


def crisp_phase(key):
    """The phase of his pixel grid that gives the crispest copy of a picture (anchor kept fractional)."""
    lay = key.layer(key.body)
    best = None
    for py in np.arange(0, 1 / S, 0.25):
        for px in np.arange(0, 1 / S, 0.25):
            A, C = shrink(lay, (px, py))
            m = A > 0.5
            v = (np.abs(np.diff(C, axis=1)).sum(-1) * (m[:, 1:] & m[:, :-1])).sum() + (np.abs(np.diff(C, axis=0)).sum(-1) * (m[1:] & m[:-1])).sum()
            if best is None or v > best[0]:
                best = (v, (float(px), float(py)))
    return best[1]


# Each picture keeps its own grid phase; both put their anchor on the same output pixel.
PHASE = {n: crisp_phase(keys[n]) for n in keys}
OAX = int(round((WAX - PHASE['stride'][0]) * S))
OAY = int(round((WAY - PHASE['stride'][1]) * S))


def origin_for(key, n):
    """Working-canvas origin of the output grid for a picture so its anchor lands on (OAX, OAY)."""
    ax, ay = key.anchor_frac
    px, py = PHASE[n]
    # Snap the anchor onto that picture's crisp grid, then place the grid so the anchor hits OAX, OAY.
    gx = px + round((ax - px) * S) / S
    gy = py + round((ay - py) * S) / S
    return gx - OAX / S, gy - OAY / S


print('phases', PHASE, 'anchor', (OAX, OAY), 'size', (OW, OH))


def render(n, body, spray):
    key = keys[n]
    o = origin_for(key, n)
    A, C = shrink(body, o)
    As, Cs = shrink(spray, o)
    out = np.zeros((OH, OW, 4), np.uint8)
    sp = As > 0.3
    out[sp, :3] = snap(Cs, SPAL)[sp]
    out[sp, 3] = 255
    op = A >= 0.5
    for pts in components(op):
        if len(pts) < 12:
            op[tuple(np.array(pts).T)] = False
    nb = np.zeros(op.shape, np.int32)
    for oy, ox in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        nb += np.roll(np.roll(op, oy, 0), ox, 1)
    op = (op & (nb >= 1)) | (~op & (nb >= 3))
    edge = np.zeros_like(op)
    for oy, ox in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        edge |= op & ~np.roll(np.roll(op, oy, 0), ox, 1)
    out[op, :3] = snap(C, PAL)[op]
    out[op, 3] = 255
    out[edge, :3] = OUTLINE
    out[edge, 3] = 255
    return out


# The loop: 0 = his striding picture, 5 = his leaping picture. Positive swings are clockwise on screen:
# a front leg swung negative reaches forward, a hind leg swung positive pushes back.
# The spray builds up toward the leap and thins out after it: own = share of the picture's own droplets,
# borrow = share of the other picture's droplets laid in.
PLAN = [  # source, front, hind, tail amplitude, fin lean, spray drift, own, borrow
    ('stride', 0, 0, 0.0, 0.0, 0, 1.0, 0.0),
    ('stride', -12, 10, 3.0, -1.0, -5, 1.0, 0.3),
    ('stride', -24, 20, 3.5, -2.0, -10, 0.9, 0.6),
    ('leap', 22, -18, 3.5, 1.5, 12, 0.75, 0.0),
    ('leap', 11, -9, 3.0, 0.8, 6, 0.9, 0.0),
    ('leap', 0, 0, 0.0, 0.0, 0, 1.0, 0.0),
    ('leap', 18, -16, 3.0, 1.5, -6, 0.7, 0.0),
    ('stride', -10, 8, 3.0, -0.8, 6, 1.0, 0.35),
]
frames = {'fly': []}
for i, (n, fr, hd, ta, fi, dr, own, borrow) in enumerate(PLAN):
    ph = 2 * np.pi * i / len(PLAN)
    other = keys['leap' if n == 'stride' else 'stride']
    body, spray = frame_layers(keys[n], front=fr, hind=hd, tail=(ph, ta), fins=fi, drift=dr, own=own, other=other, other_frac=borrow, salt=i)
    frames['fly'].append(render(n, body, spray))

# --- write the data module -----------------------------------------------------------------------------

ALPH = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+,-./:;<=>?@[]^_{|}'
colors = {}


def cid(px):
    key = '#%02x%02x%02x%02x' % tuple(int(v) for v in px)
    if key not in colors:
        colors[key] = len(colors) + 1
    return colors[key]


enc = {}
for anim, fr in frames.items():
    enc[anim] = []
    for img in fr:
        rows = []
        for y in range(OH):
            ids = [0 if img[y, x][3] == 0 else cid(img[y, x]) for x in range(OW)]
            toks = []
            x = 0
            while x < OW:
                n = 1
                while x + n < OW and ids[x + n] == ids[x]:
                    n += 1
                toks.append(ALPH[ids[x]] + (str(n) if n > 1 else ''))
                x += n
            rows.append(''.join(toks))
        enc[anim].append(rows)
assert len(colors) < len(ALPH), len(colors)
pal = ['#00000000'] + list(colors.keys())
ts = [
    "// Generated by tools/refs/waterdragon-from-ref.py from the owner's WATER SET sheet (BEAST panel).",
    '// Do not edit by hand.',
    '//',
    '// His water drake: his striding picture is fly frame 0 and his leaping picture is frame 5; the other',
    '// frames swing his legs about the shoulders and hips, sway the tail and fins and drift the spray.',
    f'// Scale: his character is {HIS_CHAR_H:.0f} px tall in that sheet, ours {CHAR_H:.0f}.',
    '//',
    f'// Each frame is {OW}x{OH} with the anchor at ({OAX}, {OAY}). Rows are run-length encoded: a symbol',
    '// (an index into PALETTE through ALPHABET, 0 = clear) followed by its repeat count when above one.',
    '',
    f'export const SIZE: [number, number] = [{OW}, {OH}];',
    f'export const ANCHOR: [number, number] = [{OAX}, {OAY}];',
    f"export const ALPHABET = '{ALPH}';",
    'export const PALETTE: string[] = [',
]
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

if DEBUG:
    import json
    info = {'ref': os.path.basename(REF), 'scale': S, 'panel': list(PANEL), 'split': SPLIT,
            'keys': {n: {'anchor': list(KEYS[n]['anchor']), 'frame': 0 if n == 'stride' else 5} for n in KEYS}}
    with open(os.path.join(DEBUG, 'beasts-ref-water2.json'), 'w') as fh:
        json.dump(info, fh, indent=1)
    strip = np.zeros((OH, OW * len(frames['fly']), 4), np.uint8)
    for i, f in enumerate(frames['fly']):
        strip[:, i * OW:(i + 1) * OW] = f
    canvas = Image.new('RGBA', (strip.shape[1], OH), (0x5d, 0x6b, 0x57, 255))
    canvas.alpha_composite(Image.fromarray(strip, 'RGBA'))
    canvas.resize((canvas.width * 3, canvas.height * 3), Image.NEAREST).save(os.path.join(DEBUG, 'wd-fly.png'))
