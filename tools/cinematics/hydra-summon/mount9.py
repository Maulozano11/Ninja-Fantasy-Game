"""The colossal hydra's five heads on his backdrop, with the necks built the steady way:

- each head's long neck is ONE steady strip, the same in every animation: straight stretches cut
  from the end of his rest sheet's row (each levelled so it runs flat), alternated so the scales
  don't repeat in a visible pattern, overlapped softly, narrowed to its painted neck's thickness
  and faded into it;
- an animation frame gives only the head and a short piece of neck, scaled so that piece is as
  thick as the steady neck, laid on it and faded into it; when the head lunges, the steady neck
  simply shows more of itself.

Usage: mount8.py <scratch> <out-prefix> <sheet>:<rowh>[:<lunge m,...>] ...  (one GIF per sheet)
"""
import json, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from scipy import ndimage
from scipy.ndimage import map_coordinates

S, OUT = sys.argv[1], sys.argv[2]
SHEETS = sys.argv[3:]
H = f'{S}/hydra'
HL, PXM, PXD, VW, VH = 2.4, 57, 38, 1920, 1080
F = lambda s: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', s)
info = json.load(open(f'{H}/col3/base24.png.json'))
HEADS, STUMPS, BACKY = info['heads'], info['stumps'], info['backy']
P = lambda x, z, up=0.0: (x * PXM, BACKY + z * PXD - up * PXM)
BG = Image.open(f'{H}/col3/bg.png').convert('RGBA').resize((VW, VH), Image.LANCZOS)
# painted necks, read with a ruler 190 px past each ring: (dx, thickness, middle)
JOIN = [(190, 55, 318), (190, 61, 428), (190, 59, 561), (190, 65, 682), (190, 68, 804)]
FADE = 34


def keyed(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    return ~(((r - g) > 60) & ((b - g) > 60))


def rows_of(path, rowh):
    a = np.array(Image.open(path).convert('RGB')).astype(int)
    fg = keyed(a)
    lab, n = ndimage.label(ndimage.binary_opening(fg, iterations=2))
    objs = ndimage.find_objects(lab)
    sz = ndimage.sum(fg, lab, range(1, n + 1))
    rows = {}
    for k, (sy, sx) in sorted([(k, o) for k, o in enumerate(objs) if sz[k] > 3000], key=lambda t: (t[1][0].start // rowh, t[1][1].start)):
        m = ndimage.binary_dilation(lab[sy, sx] == k + 1, iterations=2) & fg[sy, sx]
        rows.setdefault(sy.start // rowh, []).append(Image.fromarray(np.dstack([a[sy, sx], m * 255]).astype(np.uint8), 'RGBA'))
    return [rows[k] for k in sorted(rows)]


def band(al, x0, x1):
    """Top and bottom row of the neck's solid body between columns x0..x1 of an alpha array."""
    rows = np.nonzero(al[:, x0:x1].mean(1) > 0.97)[0]
    return rows.min(), rows.max()


def level(im):
    """Shear a stretch of neck so its body runs flat (same middle at both ends)."""
    al = np.array(im)[..., 3] > 128
    w = im.width
    t0, b0 = band(al, 0, 12)
    t1, b1 = band(al, w - 12, w)
    c0, c1 = (t0 + b0) / 2, (t1 + b1) / 2
    arr = np.array(im).astype(float)
    yy, xx = np.mgrid[0:arr.shape[0], 0:w].astype(float)
    shift = c0 + (c1 - c0) * xx / max(1, w - 1) - c0
    out = np.stack([map_coordinates(arr[..., ch], [yy + shift, xx], order=1, mode='constant') for ch in range(4)], -1)
    return Image.fromarray(out.clip(0, 255).astype(np.uint8), 'RGBA'), c0, (t0 + b0 + t1 + b1) / 4 * 0 + ((b0 - t0) + (b1 - t1)) / 2


# --- the body breathes: his painted body (and the painted necks' roots) swells and settles, a smooth
# warp inside its outline that grows with the height over its base; the part left of the joins
# (under the game necks) and the floor stay still
BM = np.load(f'{H}/col3/body_mask.npy').astype(float)
Wt = ndimage.gaussian_filter(BM, 14)
Wt *= np.clip((np.arange(VW) - 1380) / 220.0, 0, 1)[None, :]
BASEY, BREATH_A, SWAY_A = 1010.0, 9.0, 4.0
_BGA = np.array(BG).astype(float)
_YY, _XX = np.mgrid[0:VH, 0:VW].astype(float)


def breathe(t):
    s = np.sin(2 * np.pi * t)
    up = BREATH_A * s * Wt * np.clip((BASEY - _YY) / BASEY, 0, 1)
    side = SWAY_A * np.sin(2 * np.pi * t + 1.2) * Wt * np.clip((BASEY - _YY) / BASEY, 0, 1) ** 2
    out = np.stack([map_coordinates(_BGA[..., ch], [_YY + up, _XX + side], order=1, mode='nearest') for ch in range(4)], -1)
    return Image.fromarray(out.clip(0, 255).astype(np.uint8), 'RGBA')


# --- the steady necks: from his rest sheet, one row per head -----------------------------------------
REST = rows_of(f'{H}/col5/grid.png', 130)
REST_HEADLEN = 108
KR = HL * PXM / REST_HEADLEN
TILES = []  # per head: list of (levelled tile at game scale, its middle, its thickness)
for row in REST:
    ts = []
    for fr in row:
        w = fr.width - 8
        piece = fr.crop((w - 150, 0, w, fr.height))
        lv, mid, th = level(piece)
        g = lv.resize((int(lv.width * KR), int(lv.height * KR)), Image.LANCZOS)
        ts.append((g, mid * KR, th * KR))
    TILES.append(ts)
OV = 36


def ramp(im, left=0, right=0):
    a = np.array(im).astype(float)
    x = np.arange(a.shape[1])
    if left:
        a[..., 3] *= np.clip(x / left, 0, 1)[None, :]
    if right:
        a[..., 3] *= np.clip((a.shape[1] - 1 - x) / right, 0, 1)[None, :]
    return Image.fromarray(a.astype(np.uint8), 'RGBA')


WAVE_A, WAVE_L = 6.0, 520.0


def neck_wave(xs, L, t):
    """How far down each column of a neck sits: a slow wave running from the body to the head,
    nothing at the join (it must meet the painted neck), full near the head."""
    env = np.clip((L - xs) / (0.65 * L), 0, 1) ** 1.3
    return WAVE_A * np.sin(2 * np.pi * (t - xs / WAVE_L)) * env


def steady_neck(i, x_from, x_to, height=220, tw=0.0):
    """Head i's steady neck from screen x_from to x_to (the join), middle at row height/2."""
    ts = TILES[i]
    th0 = ts[0][2]
    L = int(x_to - x_from)
    can = Image.new('RGBA', (L + 400, height))
    x, k = 0, 0
    while x < L + 200:
        t, mid, th = ts[k % len(ts)]
        can.alpha_composite(ramp(t, left=OV if x else 0), (x, int(height / 2 - mid)))
        x += t.width - OV
        k += 1
    can = can.crop((0, 0, L, height))
    arr = np.array(can).astype(float)
    # narrow toward the painted neck over the last 60 % of the run
    target = JOIN[i][1]
    xs = np.arange(L)
    start = L * 0.4
    sc = 1.0 + (target / th0 - 1.0) * np.clip((xs - start) / max(1, L - start - FADE), 0, 1)
    yy, xx = np.mgrid[0:height, 0:L].astype(float)
    c = height / 2
    wave = neck_wave(xs, L, tw)
    arr = np.stack([map_coordinates(arr[..., ch], [c + (yy - wave[None, :] - c) / sc[None, :], xx], order=1, mode='constant') for ch in range(4)], -1)
    # toward his darker scales near the join, then fade into the painted neck
    rp = np.clip((xs - (L - 160)) / 160, 0, 1)
    arr[..., :3] *= (1 - rp[None, :, None] * (1 - np.array([0.86, 0.90, 0.97])[None, None, :]))
    arr[..., 3] *= np.clip((L - xs) / FADE, 0, 1)[None, :]
    return Image.fromarray(arr.clip(0, 255).astype(np.uint8), 'RGBA'), th0


def head_part(fr, neck_th, rest_w):
    """The frame's head and a short piece of neck, scaled so that piece is neck_th thick, its right
    end faded; returns the image, the neck middle's row and where the piece ends (x)."""
    w = fr.width - 8
    al = np.array(fr)[..., 3] > 128
    t, b = band(al, w - 40, w - 4)
    k = neck_th / (b - t)
    # keep the head and about 1.4 head lengths of neck (the rest is the steady neck's); measured
    # on the row's rest frame and counted from the cut, since a frame may reach further left
    drop = int(rest_w * 0.30)
    keep = int(w - max(0, drop))
    t2, b2 = band(al, keep - 30, keep - 4)
    piece = fr.crop((0, 0, keep, fr.height)).resize((int(keep * k), int(fr.height * k)), Image.LANCZOS)
    piece = ramp(piece, right=30)
    return piece, (t2 + b2) / 2 * k, piece.width, (w - keep) * k


def scene(rows, phase, lunge, t=0.0):
    img = breathe(t)
    return _scene(img, rows, phase, lunge, t)


def _scene(img, rows, phase, lunge, t):
    for i in sorted(range(5), key=lambda i: HEADS[i][1]):
        x, z, up = HEADS[i]
        sx, sy = STUMPS[i]
        dx, th, mid = JOIN[i]
        fr = rows[i][phase % len(rows[i])]
        gx, gy = P(x, z)
        sh = Image.new('RGBA', (VW, VH))
        ImageDraw.Draw(sh).ellipse([gx - 80, gy - 11, gx + 80, gy + 11], fill=(0, 0, 0, 110))
        img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(6)))
        nx = P(x - HL / 2 - (lunge[i] if isinstance(lunge, (list, tuple)) else lunge), z, up)[0]
        th0 = TILES[i][0][2]
        rest_w = rows[i][0].width - 8
        hp, hmid, hw, rest_tail = head_part(fr, th0, rest_w)
        # every frame is anchored by its neck's cut (his frames keep the cut fixed): the piece's
        # right end sits where the rest frame's piece ends, whatever the frame's width
        _, _, rw, rt = head_part(rows[i][0], th0, rest_w)
        nx = nx + rw - hw
        x_from = min(nx + hw - 50, sx + dx - 120)
        ti = t + i * 0.21
        neck, _ = steady_neck(i, x_from, sx + dx + FADE / 2, tw=ti)
        L = int(sx + dx + FADE / 2 - x_from)
        dy0 = float(neck_wave(np.array([20.0]), L, ti)[0])
        img.alpha_composite(neck, (int(x_from), int(mid - neck.height / 2)))
        img.alpha_composite(hp, (int(nx), int(round(mid - hmid + dy0))))
    return img


for spec in SHEETS:
    parts = spec.split(':')
    path, rowh = parts[0], int(parts[1])
    lunges = [float(v) for v in parts[2].split(',')] if len(parts) > 2 else [0]
    rows = rows_of(path, rowh)
    n = len(rows[0])
    N = 2 * n
    name = path.rsplit('/', 1)[-1].split('.')[0]
    frames = []
    for p in range(N):
        frames.append(scene(rows, p % n, lunges[p % n % len(lunges)], p / N).convert('RGB'))
    frames[0].save(f'{OUT}_{name}.png')
    small = [f.resize((960, 540), Image.LANCZOS) for f in frames]
    small[0].save(f'{OUT}_{name}.gif', save_all=True, append_images=small[1:], duration=170, loop=0)
    print('ok', name, n)
