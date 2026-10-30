"""The phoenix from the owner's FIRE SET sheet (its BEAST panel), turned into vfx_beasts fire frames.

    python3 -I tools/refs/phoenix-fire-from-ref.py <fire-set-sheet.jpg> tools/world-sprites/vfx-beasts-ref-fire2.ts [debugDir]

The owner asked for the fire beast to look like the phoenix he painted in the BEAST panel of his fire
set sheet ("hagan la imagen como la referencia"), copied as exactly as possible. His picture is
fly frame 0. Every other frame is cut from his own pixels, the way the wind crane was:

- fly (8 frames): a wing beat. His near wing (the big golden one) and his far wing (the dark one
  behind the head) are lifted off the body along their outlines and swung back and down about their
  shoulders (the far one behind the body), then back up.
  The swing eases in near the root so the wings bend there instead of shearing off. The flame tail
  sways a little and his embers drift up and back.
- dive (5 frames, loop): the whole bird tilted nose down with both wings swept back; the wings and
  tail flutter.
- attack (6 frames, once): it draws back, flares the wings, lunges forward with the talons swung
  forward, then settles back to his picture.

Scale: his character in the same sheet is ~249 px tall and ours is 96 px, so one game pixel is his
art pixel (~2.6 of his image pixels). The box filter is laid on his pixel grid (the phase that gives
the crispest result), the colours are snapped to a palette sampled from his phoenix, and the outline
is cleaned to 1 px in his darkest red; embers keep no outline. The result is a TypeScript data module
(palette + run-length rows) for tools/world-sprites/vfx-beast-phoenix.ts. Deterministic.
"""
import os
import sys
from collections import deque

import numpy as np
from PIL import Image

REF, OUT_TS = sys.argv[1], sys.argv[2]
DEBUG = sys.argv[3] if len(sys.argv) > 3 else None
CHAR_H = 96.0  # our character (kit characterRef), feet to hair, at 1x

ref = np.asarray(Image.open(REF).convert('RGB')).astype(np.float32)

# --- where things are in his sheet (his image pixels) ----------------------------------------------
PANEL = (325, 104, 719, 384)  # the BEAST panel
WORK = (320, 100, 680, 400)  # working area around the bird (room for the swings and the lunge)
BODY_CENTRE = (530.0, 280.0)  # the anchor: the middle of the chest
NEAR_SHOULDER = (532.0, 252.0)
FAR_SHOULDER = (552.0, 232.0)
HIP = (536.0, 296.0)
# The near (golden) wing and the far (dark) wing, traced along his outlines.
NEAR_WING = [(388, 126), (442, 126), (500, 182), (544, 228), (548, 248), (532, 266), (500, 271), (460, 269), (428, 252), (394, 226), (382, 176)]
FAR_WING = [(526, 224), (532, 192), (552, 150), (574, 136), (602, 136), (604, 160), (590, 198), (574, 218), (556, 224)]
LEGS = [(506, 294), (578, 294), (584, 348), (502, 348)]
TAIL = [(330, 280), (505, 280), (510, 300), (500, 380), (330, 380)]

# His character, measured in his WALL and WALL_DEPTH panels (hair to feet): sets the scale.
def char_height(x0, y0, x1, y1):
    c = ref[y0:y1, x0:x1]
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    hair = (b > r + 12) & (b > 55) & (r < 110)
    top = min(y for y in range(c.shape[0]) if hair[y].sum() >= 4)
    bg = np.median(c[-3:].reshape(-1, 3), 0)
    body = (np.abs(c - bg).sum(2) > 70) & ~((r > g + 40) & (r > 120))
    bottom = max(y for y in range(c.shape[0]) if body[y].sum() >= 4)
    return bottom - top + 1


HIS_CHAR_H = (char_height(850, 960, 1000, 1250) + char_height(185, 1650, 320, 1935)) / 2
S = CHAR_H / HIS_CHAR_H
print('his character', HIS_CHAR_H, 'px tall; scale', round(S, 4))


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


def dilate(m, n):
    for _ in range(n):
        g = m.copy()
        g[1:] |= m[:-1]
        g[:-1] |= m[1:]
        g[:, 1:] |= m[:, :-1]
        g[:, :-1] |= m[:, 1:]
        m = g
    return m


def poly_mask(pts, shape, origin):
    from PIL import ImageDraw
    img = Image.new('L', (shape[1], shape[0]), 0)
    ImageDraw.Draw(img).polygon([(x - origin[0], y - origin[1]) for x, y in pts], fill=255)
    return np.asarray(img) > 0


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


def snap(col, pal):
    d = ((col[..., None, :] - pal[None, None]) ** 2).sum(-1)
    return pal[np.argmin(d, -1)]


def median_palette(pixels, n):
    img = Image.fromarray(pixels.astype(np.uint8).reshape(1, -1, 3), 'RGB')
    q = img.quantize(colors=n, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    return np.array(q.getpalette()[:n * 3], np.float32).reshape(-1, 3)


# --- his phoenix, split into layers ----------------------------------------------------------------------

wx0, wy0, wx1, wy1 = WORK
crop = ref[wy0:wy1, wx0:wx1].copy()
H, W = crop.shape[:2]
inside = np.zeros((H, W), bool)
inside[PANEL[1] + 3 - wy0:PANEL[3] - 3 - wy0, PANEL[0] + 3 - wx0:PANEL[2] - 3 - wx0] = True
bg = np.median(crop[inside][:4000], 0) if False else np.array([35, 33, 44], np.float32)
r, g, b = crop[..., 0], crop[..., 1], crop[..., 2]
diff = np.abs(crop - bg).sum(2)
bird = (((r - b > 40) & (diff > 50)) | ((r > b + 15) & (r > g + 5) & (diff > 35))) & inside
bird = bird | (~dilate(~dilate(bird, 2), 2) & (diff > 60) & inside)
body = np.zeros((H, W), bool)
ember = np.zeros((H, W), bool)
for pts in components(bird):
    ys = np.array([p[0] for p in pts])
    xs = np.array([p[1] for p in pts])
    (body if len(pts) >= 120 else ember)[ys, xs] = True

near_m = poly_mask(NEAR_WING, (H, W), (wx0, wy0)) & body
far_m = poly_mask(FAR_WING, (H, W), (wx0, wy0)) & body
legs_m = poly_mask(LEGS, (H, W), (wx0, wy0)) & body & ~near_m
tail_m = poly_mask(TAIL, (H, W), (wx0, wy0))
rest_m = body & ~near_m & ~far_m

PAL = median_palette(crop[body], 40)
lum = PAL @ np.array([0.3, 0.55, 0.15], np.float32)
OUTLINE = PAL[np.argmin(lum + (PAL[:, 0] < PAL[:, 2]) * 999)]
print('outline', OUTLINE.astype(int).tolist())

yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)


def local(p):
    return (p[0] - wx0, p[1] - wy0)


def swing(arr, deg, pivot, ease=22.0):
    """arr swung by deg (screen degrees) about pivot; the swing eases in over `ease` px from the pivot."""
    px, py = local(pivot)
    rx, ry = xx - px, yy - py
    t = np.clip(np.hypot(rx, ry) / ease, 0, 1)
    a = np.deg2rad(deg) * t * t * (3 - 2 * t)
    sx = px + rx * np.cos(a) + ry * np.sin(a)
    sy = py - rx * np.sin(a) + ry * np.cos(a)
    return warp(arr, xx - sx, yy - sy)


def turn(arr, deg, pivot, dx=0.0, dy=0.0):
    """arr turned rigidly by deg about pivot, then moved (dx, dy)."""
    px, py = local(pivot)
    rx, ry = xx - px - dx, yy - py - dy
    a = np.deg2rad(deg)
    sx = px + rx * np.cos(a) + ry * np.sin(a)
    sy = py - rx * np.sin(a) + ry * np.cos(a)
    return warp(arr, xx - sx, yy - sy)


def tail_sway(arr, phase, amp):
    """The flame tail sways: a travelling wave that grows away from the rump."""
    rx, ry = local((505, 300))
    dist = np.hypot(xx - rx, yy - ry)
    w = tail_m * np.clip(dist / 90, 0, 1)
    return warp(arr, np.zeros_like(xx), (w * amp * np.sin(phase - dist / 26)).astype(np.float32))


def layer(mask):
    m = mask.astype(np.float32)
    return np.concatenate([crop * m[..., None], m[..., None]], -1)  # premultiplied colour + coverage


L_NEAR, L_FAR, L_REST, L_LEGS, L_EMBER = layer(near_m), layer(far_m), layer(rest_m & ~legs_m), layer(legs_m), layer(ember)


def over(top, under):
    a = top[..., 3:4]
    return top + under * (1 - a)


def compose(near=0.0, far=0.0, legs=0.0, tilt=0.0, shift=(0.0, 0.0), sway=(0.0, 0.0), ember_drift=(0.0, 0.0)):
    """One frame on the working canvas: far wing, body, legs, near wing; then the whole bird turned/moved."""
    rest = L_REST if sway[1] == 0 else tail_sway(L_REST, *sway)
    fw = swing(L_FAR, far, FAR_SHOULDER)
    nw = swing(L_NEAR, near, NEAR_SHOULDER)
    lg = turn(L_LEGS, legs, HIP)
    bird = over(nw, over(lg, over(rest, fw)))
    wingonly = nw[..., 3]
    if tilt or shift != (0.0, 0.0):
        bird = turn(bird, tilt, BODY_CENTRE, *shift)
        wingonly = turn(wingonly, tilt, BODY_CENTRE, *shift)
    emb = turn(L_EMBER, 0, BODY_CENTRE, *ember_drift)
    return bird, wingonly, emb


# --- the grid: the phase of his pixel grid that gives the crispest copy of his picture -----------------

def shrink(lay, origin, size):
    """Box-filters a premultiplied layer onto the output grid starting at `origin` (working px)."""
    ow, oh = size
    box = (origin[0], origin[1], origin[0] + ow / S, origin[1] + oh / S)
    chans = [np.asarray(Image.fromarray(np.ascontiguousarray(lay[..., c], dtype=np.float32), 'F').resize((ow, oh), Image.BOX, box=box)) for c in range(4)]
    A = chans[3]
    col = np.clip(np.stack(chans[:3], -1) / np.maximum(A, 1e-4)[..., None], 0, 255)
    return A, col


OW, OH = int(W * S) - 1, int(H * S) - 1
key, _, _ = compose()
best = None
for py in np.arange(0, 1 / S, 0.2):
    for px in np.arange(0, 1 / S, 0.2):
        A, C = shrink(key, (px, py), (OW, OH))
        m = A > 0.5
        crisp = (np.abs(np.diff(C, axis=1)).sum(-1) * (m[:, 1:] & m[:, :-1])).sum() + (np.abs(np.diff(C, axis=0)).sum(-1) * (m[1:] & m[:-1])).sum()
        if best is None or crisp > best[0]:
            best = (crisp, (float(px), float(py)))
ORIGIN = best[1]
cx, cy = local(BODY_CENTRE)
OAX, OAY = int(round((cx - ORIGIN[0]) * S)), int(round((cy - ORIGIN[1]) * S))
print('grid phase', ORIGIN, 'anchor', (OAX, OAY), 'size', (OW, OH))


def render(bird, wingonly, emb):
    A, C = shrink(bird, ORIGIN, (OW, OH))
    Aw, _ = shrink(np.concatenate([np.zeros(wingonly.shape + (3,), np.float32), wingonly[..., None]], -1), ORIGIN, (OW, OH))
    Ae, Ce = shrink(emb, ORIGIN, (OW, OH))
    out = np.zeros((OH, OW, 4), np.uint8)
    em = Ae > 0.25
    out[em, :3] = snap(Ce, PAL)[em]
    out[em, 3] = 255
    op = A >= 0.5
    for pts in components(op):
        if len(pts) < 10:
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
    # Where the near wing lies over the body, its own edge stays drawn (away from its root).
    wm = (Aw >= 0.5) & op
    wedge = np.zeros_like(wm)
    for oy, ox in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        wedge |= wm & ~np.roll(np.roll(wm, oy, 0), ox, 1)
    gy, gx = np.mgrid[0:OH, 0:OW]
    sx, sy = local(NEAR_SHOULDER)
    wedge &= np.hypot(gx - (sx - ORIGIN[0]) * S, gy - (sy - ORIGIN[1]) * S) > 8
    out[edge | wedge, :3] = OUTLINE
    out[edge, 3] = 255
    return out


# --- the animations ---------------------------------------------------------------------------------------

frames = {'fly': [], 'dive': [], 'attack': []}
# fly: 0 is his picture; both wings swing back and down (the near wing to -66 deg, the far one behind the
# body to -88 deg) by frame 4, then come back up. Steps ease in and out so no frame jumps.
beat = [0.0, 0.16, 0.5, 0.84, 1.0, 0.8, 0.45, 0.14]
for i, k in enumerate(beat):
    ph = 2 * np.pi * i / len(beat)
    frames['fly'].append(render(*compose(near=-66 * k, far=-88 * k, sway=(ph, 3.0 if i else 0.0), ember_drift=(-4.0 * i, -2.5 * i))))
# dive: nose down, both wings swept back, fluttering; the tail sways.
for i in range(5):
    ph = 2 * np.pi * i / 5
    frames['dive'].append(render(*compose(near=-58 + 6 * np.sin(ph), far=-82 + 6 * np.sin(ph + 0.8), tilt=30, sway=(ph, 4.0), ember_drift=(-5.0 * i, -3.0 * i))))
# attack (once): draw back, flare, lunge with the talons forward, settle back to his picture.
plan = [  # near, far, legs, tilt, dx
    (0, 0, 0, 0, 0),
    (-6, 6, -8, -4, -4),
    (-14, 12, -30, 4, 6),
    (-16, 14, -46, 8, 12),
    (-8, 7, -26, 4, 6),
    (-2, 2, -6, 1, 1),
]
for i, (n, f, lg, tl, dx) in enumerate(plan):
    frames['attack'].append(render(*compose(near=n, far=f, legs=lg, tilt=tl, shift=(dx, 0.0), ember_drift=(-3.0 * i, -2.0 * i))))

# --- write the data module ---------------------------------------------------------------------------------

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
    "// Generated by tools/refs/phoenix-fire-from-ref.py from the owner's FIRE SET sheet (BEAST panel).",
    '// Do not edit by hand.',
    '//',
    "// The phoenix as he painted it in his fire set: his picture is fly frame 0; the wing beat, the dive",
    '// and the attack are cut from his own pixels (wings swung about the shoulders, talons swung about',
    f'// the hip, the bird tilted and moved). Scale: his character is {HIS_CHAR_H:.0f} px tall in that sheet, ours {CHAR_H:.0f}.',
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
    info = {'ref': os.path.basename(REF), 'scale': S, 'panel': list(PANEL), 'anchor': [wx0 + ORIGIN[0] + OAX / S, wy0 + ORIGIN[1] + OAY / S]}
    with open(os.path.join(DEBUG, 'beasts-ref-fire2.json'), 'w') as fh:
        json.dump(info, fh, indent=1)
    for anim, fr in frames.items():
        strip = np.zeros((OH, OW * len(fr), 4), np.uint8)
        for i, f in enumerate(fr):
            strip[:, i * OW:(i + 1) * OW] = f
        canvas = Image.new('RGBA', (strip.shape[1], OH), (0x5d, 0x6b, 0x57, 255))
        canvas.alpha_composite(Image.fromarray(strip, 'RGBA'))
        canvas.resize((canvas.width * 3, canvas.height * 3), Image.NEAREST).save(os.path.join(DEBUG, f'phx2-{anim}.png'))
