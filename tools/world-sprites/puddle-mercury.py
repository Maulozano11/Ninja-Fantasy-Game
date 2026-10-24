"""The mercury puddle (liquid metal) in the owner's style: his water puddle repaint turned to chrome.

    python3 -I tools/refs/water-puddle-from-ref.py ... <stg>/charco_agua
    python3 -I tools/world-sprites/puddle-mercury.py <stg>/charco_agua <stg>/charco_mercurio

The owner repainted our water puddle sample and asked for the mercury the same way ("hazla en la de
mercurio tambien"). So every mercury frame follows HIS water frame: the same motion and shapes (the
swirl at the feet, the body slumping, the crash and the crown splash, the puddle, the surge, the
rise and the dripping exit), made of metal instead of water:

  * the ninja's pixels stay as they are (charco_agua/own/ marks them);
  * his water becomes one opaque metal body, a little heavier and rounder than his spray (his
    shapes softened by a pixel), and every small loose drop becomes a round bead of the same size
    or a little bigger;
  * it is shaded as chrome from its own silhouette: a height from the distance to its edge (a round
    lip: surface tension), the sky mirrored over a dark horizon band on the flat top, bright where
    the lip turns up, dark where it turns down to the ground, a line of light bounced up along its
    foot, white speculars from the upper left; his own light and dark (foam, crests, the body he
    left showing through) carry over as the metal's light and dark, so the body he painted
    see-through becomes a metal skin;
  * the characters' black line (#07060b), 1 px, round the metal.

It also makes the crack sketch (mercury flowing to a stone wall and slipping through the slit under
it) with the same metal. Our chrome ramp is the builder's proposal; no colour of his is changed
anywhere else. Writes every frame at 1x in the 256 sprite frame, and manifest.json. Deterministic.
"""
import json
import os
import sys
from collections import deque

import numpy as np
from PIL import Image

SRC, OUT = sys.argv[1], sys.argv[2]
N = 256
MAN = json.load(open(os.path.join(SRC, 'manifest.json')))
FEET = MAN['feet']
GX, GY = FEET

RAMP = np.array([[int(h[i:i + 2], 16) for i in (1, 3, 5)] for h in
                 ['#0c0d12', '#1b1d24', '#2e313a', '#474b56', '#656a76', '#8a909c', '#b0b6c0', '#d2d7de', '#eef1f4', '#ffffff']], float)
LINE = np.array([7, 6, 11], float)
LIP = 4.0
LIGHT = np.array([-0.55, -0.7, 0.45]) / np.linalg.norm([-0.55, -0.7, 0.45])


def components(mask):
    """8-connected components: a list of (ys, xs) index arrays."""
    seen = np.zeros_like(mask, bool)
    out = []
    H, W = mask.shape
    for y0, x0 in zip(*np.nonzero(mask)):
        if seen[y0, x0]:
            continue
        q = deque([(y0, x0)])
        seen[y0, x0] = True
        ys, xs = [], []
        while q:
            y, x = q.popleft()
            ys.append(y)
            xs.append(x)
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < H and 0 <= xx < W and mask[yy, xx] and not seen[yy, xx]:
                        seen[yy, xx] = True
                        q.append((yy, xx))
        out.append((np.array(ys), np.array(xs)))
    return out


def soften(mask, r=1):
    """Box blur twice and cut at half: spikes and one-pixel spray go, the mass stays."""
    a = mask.astype(float)
    for _ in range(2):
        p = np.pad(a, r, mode='constant')
        a = sum(p[r + dy:r + dy + mask.shape[0], r:r + mask.shape[1]] for dy in range(-r, r + 1)) / (2 * r + 1)
        p = np.pad(a, r, mode='constant')
        a = sum(p[r:r + mask.shape[0], r + dx:r + dx + mask.shape[1]] for dx in range(-r, r + 1)) / (2 * r + 1)
    return a >= 0.5


def disc(mask, cx, cy, rx, ry):
    yy, xx = np.mgrid[0:N, 0:N]
    mask |= ((xx + 0.5 - cx) / rx) ** 2 + ((yy + 0.5 - cy) / ry) ** 2 <= 1


def dist(mask):
    """Chamfer distance to the nearest outside pixel (edge pixels are 1)."""
    INF = 1e6
    d = np.where(mask, INF, 0.0)
    D = np.sqrt(2)
    H, W = mask.shape
    for y in range(H):
        for x in range(W):
            if d[y, x]:
                v = d[y, x]
                if x > 0: v = min(v, d[y, x - 1] + 1)
                else: v = min(v, 1)
                if y > 0:
                    v = min(v, d[y - 1, x] + 1, (d[y - 1, x - 1] if x > 0 else 0) + D, (d[y - 1, x + 1] if x < W - 1 else 0) + D)
                else:
                    v = min(v, 1)
                d[y, x] = v
    for y in range(H - 1, -1, -1):
        for x in range(W - 1, -1, -1):
            if d[y, x]:
                v = d[y, x]
                v = min(v, (d[y, x + 1] if x < W - 1 else 0) + 1)
                if y < H - 1:
                    v = min(v, d[y + 1, x] + 1, (d[y + 1, x + 1] if x < W - 1 else 0) + D, (d[y + 1, x - 1] if x > 0 else 0) + D)
                else:
                    v = min(v, 1)
                d[y, x] = v
    return d


def chrome(mask, detail=None, env=0.0):
    """RGBA of the metal over `mask`; `detail` (0..1 per pixel) is his light and dark, carried over."""
    out = np.zeros((N, N, 4), np.uint8)
    if not mask.any():
        return out
    d = dist(mask)
    v = np.minimum(d, LIP) / LIP
    h = LIP * np.sqrt(1 - (1 - v) ** 2)
    hp = np.pad(h, 1)
    hx = (hp[1:-1, 2:] - hp[1:-1, :-2]) / 2
    hy = (hp[2:, 1:-1] - hp[:-2, 1:-1]) / 2
    k = np.sqrt(hx ** 2 + hy ** 2 + 1)
    nx, ny, nz = -hx / k, -hy / k, 1 / k
    rows = np.arange(N)[:, None].repeat(N, 1)
    top = np.where(mask, rows, N).min(0)
    bot = np.where(mask, rows, -1).max(0)
    rel = (rows - top[None]) / np.maximum(1, bot - top)[None] + env
    if detail is not None:
        rel = rel + (detail - 0.5) * 0.18  # the horizon band bends with his shapes
    flat = np.select([rel < 0.16, rel < 0.3, rel < 0.37, rel < 0.6, rel < 0.8], [0.92, 0.76, 0.12, 0.56, 0.4], 0.26)
    t = np.clip(np.sqrt(nx ** 2 + ny ** 2) * 1.7, 0, 1)
    slope = np.where(ny < 0, 0.95, 0.08) - nx * 0.25
    val = flat * (1 - t) + slope * t
    if detail is not None:
        # His light and dark, ranked within the frame and cut into the hard bands of a mirror: his
        # deepest water the darkest reflections, his foam the white.
        m = mask & np.isfinite(detail)
        rank = np.zeros_like(detail)
        order = np.argsort(detail[m], kind='stable')
        r = np.empty(len(order))
        r[order] = (np.arange(len(order)) + 0.5) / max(1, len(order))
        rank[m] = r
        bands = np.select([rank < 0.3, rank < 0.5, rank < 0.72, rank < 0.9], [0.06, 0.34, 0.58, 0.8], 0.98)
        val = 0.3 * val + 0.7 * bands
    rz, rx, ry = 2 * nz * nz - 1, 2 * nz * nx, 2 * nz * ny
    spec = np.maximum(0, rx * LIGHT[0] + ry * LIGHT[1] + rz * LIGHT[2]) ** 18
    val = np.where(spec > 0.45, 1.0, val)
    below = np.zeros_like(mask)
    below[:-2] = ~mask[2:]
    val = np.where((d > 1.5) & (d <= 2.5) & below & (ny > 0), 0.62, val)
    idx = np.clip(np.round(np.clip(val, 0, 1) * (len(RAMP) - 1)), 0, len(RAMP) - 1).astype(int)
    col = RAMP[idx]
    col = np.where((d < 1.5)[..., None], LINE, col)
    out[..., :3] = col.astype(np.uint8)
    out[..., 3] = mask * 255
    return out


def lum(rgb):
    return (0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]) / 255


def metal_frame(water, own):
    """One of his water frames, in metal."""
    a = water[..., 3]
    liquid = (a >= 128) & ~own
    body = np.zeros((N, N), bool)
    beads = []
    for ys, xs in components(liquid):
        if len(ys) <= 10:
            r = max(2.8, np.sqrt(len(ys) / np.pi) + 0.9)
            beads.append((xs.mean() + 0.5, ys.mean() + 0.5, r))
        else:
            body[ys, xs] = True
    body = soften(body) & ~own
    # His light and dark: his foam and crests bright, his deep water dark.
    l = lum(water[..., :3].astype(float))
    detail = np.clip((l - 0.25) / 0.65, 0, 1)
    out = chrome(body, detail)
    bm = np.zeros((N, N), bool)
    for cx, cy, r in beads:
        disc(bm, cx, cy, r, r * 0.9)
    bm &= ~body & ~own
    bo = chrome(bm)
    out = np.where(bo[..., 3:] > 0, bo, out)
    keep = own & (a > 0)
    out[keep] = water[keep]
    return out


# --- the crack: a stone wall end on, with a slit under it --------------------------------------

WALL = dict(x0=144, x1=168, top=148, cap=46, bottom=212, gap0=213, gap1=219)
STONE = np.array([[0x4a, 0x47, 0x52], [0x5e, 0x5a, 0x66], [0x73, 0x6f, 0x7b], [0x8a, 0x86, 0x92], [0xa2, 0x9e, 0xaa]], np.uint8)
MORTAR = np.array([0x2a, 0x28, 0x30], np.uint8)
SLIT = np.array([0x14, 0x11, 0x18], np.uint8)


def hsh(x, y, seed):
    h = (x * 374761393 + y * 668265263 + seed * 2147483647) & 0xFFFFFFFF
    h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
    h ^= h >> 16
    return h / 4294967296


def wall(img):
    w = WALL
    for y in range(w['top'] - w['cap'], w['bottom'] + 1):
        for x in range(w['x0'], w['x1'] + 1):
            edge = x in (w['x0'], w['x1']) or y in (w['top'] - w['cap'], w['bottom'])
            if edge:
                img[y, x] = (*LINE.astype(np.uint8), 255)
                continue
            if y == w['top']:
                img[y, x] = (*STONE[1], 255)
                continue
            if y < w['top']:
                k = (w['top'] - y) / w['cap']
                course = int(np.sqrt(k) * 7)
                joint = int(np.sqrt((w['top'] - y - 1) / w['cap']) * 7) != course
                c = STONE[2] if joint else STONE[4 if x == w['x0'] + 1 or hsh(course, 0, 3) > 0.5 else 3]
                img[y, x] = (*c, 255)
                continue
            row = (y - w['top'] - 1) // 9
            off = 6 if row % 2 else 0
            bx = (x - w['x0'] + off) // 12
            ly, lx = (y - w['top'] - 1) % 9, (x - w['x0'] + off) % 12
            if ly == 8 or lx == 11:
                img[y, x] = (*MORTAR, 255)
                continue
            tone = 1 + int(hsh(bx, row, 7) * 2.99)
            c = STONE[tone]
            if ly == 0 or lx == 0:
                c = STONE[min(4, tone + 1)]
            elif ly == 7 or lx == 10:
                c = STONE[max(0, tone - 1)]
            img[y, x] = (*c, 255)
    img[w['gap1'] + 1, w['x0']:w['x1'] + 1] = (*LINE.astype(np.uint8), 255)


def balls_mask(balls):
    """Soft union of ellipses (a neck where two meet), as the sample's metaballs."""
    yy, xx = np.mgrid[0:N, 0:N]
    f = np.zeros((N, N))
    for cx, cy, rx, ry in balls:
        e = ((xx + 0.5 - GX - cx) / rx) ** 2 + ((yy + 0.5 - GY - 1 - cy) / ry) ** 2
        f += (1 / np.maximum(0.01, e)) ** 3
    return f ** (1 / 3) >= 1


def crack_frames():
    """Left to right, in the motion of his water: it flows as a low leaning wave, its front thins
    into the slit, runs through as a ribbon and surges up on the far side in a crown of beads that
    falls back into one heavy puddle."""
    steps = [
        ([(-58, -3, 13, 11), (-44, 0, 13, 8), (-72, 1, 11, 6), (-85, 2, 6, 3.5)], [(-97, 3, 2.6), (-60, -20, 2)]),
        ([(-16, -3, 12, 11), (-2, 0.5, 13, 7), (-30, 1, 12, 7), (-45, 2, 6, 3.5)], [(-58, 3, 2.6), (-8, -19, 2.2)]),
        ([(-12, -1, 13, 9), (6, 1, 12, 6), (26, 0, 14, 4.5), (46, -1, 7, 5)], [(-34, 3, 2.4)]),
        ([(-2, 1, 10, 6), (26, 0, 16, 4.5), (56, -6, 9, 13), (50, 1, 13, 7)], [(-16, 3, 2.6), (66, -26, 2.4), (44, -22, 2)]),
        ([(28, 0, 12, 3.5), (66, -3, 16, 10.5), (54, 1, 11, 6.5)], [(84, -14, 2.8), (72, -24, 2.4), (52, -20, 2.2), (90, 2, 2.4)]),
        ([(80, -2, 16, 11), (66, 1.5, 11, 7.5), (94, 1.5, 10, 7)], [(52, 4, 2.4), (106, 3, 2.6), (60, -6, 2)]),
    ]
    w = WALL
    hidden = np.zeros((N, N), bool)
    hidden[:, w['x0']:w['x1'] + 1] = True
    hidden[w['gap0']:w['gap1'] + 1, w['x0']:w['x1'] + 1] = False
    frames = []
    for i, (balls, beads) in enumerate(steps):
        img = np.zeros((N, N, 4), np.uint8)
        img[w['gap0']:w['gap1'] + 1, w['x0']:w['x1'] + 1] = (*SLIT, 255)
        m = balls_mask(balls) & ~hidden
        liq = chrome(m, env=0.03 * np.sin(i / 6 * 2 * np.pi))
        bm = np.zeros((N, N), bool)
        for cx, cy, r in beads:
            disc(bm, GX + cx, GY + 1 + cy, r, r * 0.9)
        bm &= ~m & ~hidden
        bo = chrome(bm)
        for layer in (liq, bo):
            img = np.where(layer[..., 3:] > 0, layer, img)
        wall(img)
        frames.append(img)
    return frames


def main():
    os.makedirs(OUT, exist_ok=True)
    seqs = []
    for s in MAN['sequences']:
        mid = s['id'].replace('agua', 'mercurio')
        files = []
        for f in s['files']:
            water = np.asarray(Image.open(os.path.join(SRC, f)).convert('RGBA'))
            own = np.asarray(Image.open(os.path.join(SRC, 'own', f))) > 0
            name = f.replace('agua', 'mercurio')
            Image.fromarray(metal_frame(water, own), 'RGBA').save(os.path.join(OUT, name))
            files.append(name)
        seqs.append({**s, 'id': mid, 'label': s['label'].replace('Agua', 'Mercurio'), 'files': files})
    files = []
    for i, fr in enumerate(crack_frames()):
        name = f'mercurio-moverse-rendija-{i + 1}.png'
        Image.fromarray(fr, 'RGBA').save(os.path.join(OUT, name))
        files.append(name)
    seqs.append({'id': 'mercurio-moverse-rendija', 'label': 'Mercurio - moverse / rendija', 'files': files, 'fps': 7, 'loop': False, 'wide': True})
    with open(os.path.join(OUT, 'manifest.json'), 'w') as fh:
        json.dump({**MAN, 'source': 'charco_agua (his water repaint)', 'sequences': seqs}, fh, indent=1)
        fh.write('\n')
    print(f'{sum(len(s["files"]) for s in seqs)} frames -> {OUT}')


main()
