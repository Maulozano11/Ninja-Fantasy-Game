"""Cuts the owner's paint-over of the water sheet into game-scale key frames for vfx_water_v3.

    python3 -I tools/refs/water-from-ref.py docs/reference/water-set-owner-reference.jpg \
        tools/world-sprites/vfx-water-v3-refdata.ts [reviewDir]

The owner wants his reference copied as exactly as possible, so every key frame is HIS pixels:

* Scale. His sheet is a paint-over of our 2x water sheet resampled to about 1x, slightly more in
  height than in width. Our character fits his best at 0.925 across and 0.912 down (template
  match over his four characters; his panels give the same factors against our frame sizes), so
  one of his pixels is 0.925 x 0.912 game pixels. Every sprite is placed by an anchor measured on
  his art (the orb's centre, the pool's centre, the feet his character stands on...).
* Clean-up. His panel background, his characters, the labels and the panel borders are removed;
  the art that spills over a panel border is read against the page colour there. JPEG noise is
  smoothed (a light gaussian) before any decision; nothing is classified from a single noisy pixel.
* Classes, decided at his resolution, then area-averaged (box filter) to game scale:
    body    - the water, foam and spray: opaque, quantized to one palette for the set;
    outline - his dark navy rims: rebuilt as a clean 1 px tinted outline round the body wherever
              his art has a rim there (never black);
    glow    - his soft haze (the aura's halo): kept SEMI-TRANSPARENT, colour-to-alpha un-blended
              from his background, so it composites back to his look on any map.
* Pieces. Each key frame is split into pieces the generator animates on their own: 'drops'
  (loose droplets and spray), 'glow' and the rest ('main'), plus named pieces per sprite.
* The stream tile is one 64 px period of his jet that ends exactly where his crest head begins,
  closed into a loop with a seam cut where the two ends match best; the head is his crest.
The result is indexed run-length data that tools/world-sprites/vfx-water-v3.ts decodes; with a
review directory it also writes his crops at game scale (for the comparison sheets) and previews.
Deterministic.
"""
import base64
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

REF, OUT_TS = sys.argv[1], sys.argv[2]
REVIEW = sys.argv[3] if len(sys.argv) > 3 else None

IM0 = np.asarray(Image.open(REF).convert('RGB')).astype(np.float64)
H0, W0 = IM0.shape[:2]
SX, SY = 0.925, 0.912          # game px per his px, across and down
BG = np.array([32.0, 33.0, 43.0])  # his panel fill
PAGE = np.array([21.0, 21.0, 29.0])  # his page colour (outside the panels)

# His panels: the 1 px border rectangles (outer edge, inclusive), measured on his sheet.
PANELS = {
    'bolt': (8, 41, 83, 112), 'stream': (274, 41, 521, 112), 'breath': (532, 41, 641, 112), 'sphere': (651, 41, 724, 112),
    'slash': (8, 159, 79, 235), 'multi': (124, 159, 199, 230), 'hit': (240, 159, 318, 239), 'blast': (355, 159, 622, 325),
    'wall': (8, 354, 375, 496), 'wall_diag': (386, 354, 689, 647), 'wall_depth': (8, 676, 125, 1011), 'aura': (218, 677, 305, 817),
}

# --- small image tools -----------------------------------------------------------------------

N4 = ((1, 0), (-1, 0), (0, 1), (0, -1))
N8 = N4 + ((1, 1), (1, -1), (-1, 1), (-1, -1))


def lum(c):
    return 0.3 * c[..., 0] + 0.59 * c[..., 1] + 0.11 * c[..., 2]


def gauss(a, s):
    """Separable gaussian blur (edges clamped)."""
    r = max(1, int(round(s * 3)))
    k = np.exp(-0.5 * (np.arange(-r, r + 1) / s) ** 2)
    k /= k.sum()
    out = a.astype(np.float64)
    for ax in (0, 1):
        pad = [(0, 0)] * out.ndim
        pad[ax] = (r, r)
        p = np.pad(out, pad, mode='edge')
        acc = np.zeros_like(out)
        for i, w in enumerate(k):
            sl = [slice(None)] * out.ndim
            sl[ax] = slice(i, i + out.shape[ax])
            acc += w * p[tuple(sl)]
        out = acc
    return out


def shift(m, dy, dx, wrap=False):
    """out[y, x] = m[y - dy, x - dx]; clear at the edges (or wrapped across x)."""
    if wrap:
        m = np.roll(m, dx, 1)
        dx = 0
    H, W = m.shape[:2]
    out = np.zeros_like(m)
    out[max(0, dy):H + min(0, dy), max(0, dx):W + min(0, dx)] = m[max(0, -dy):H + min(0, -dy), max(0, -dx):W + min(0, -dx)]
    return out


def dilate(m, n=1, wrap=False, nb=N4):
    for _ in range(n):
        o = m.copy()
        for dy, dx in nb:
            o |= shift(m, dy, dx, wrap)
        m = o
    return m


def components(m, nb=N8, wrap=False):
    H, W = m.shape
    lab = np.zeros((H, W), np.int32)
    n = 0
    for y in range(H):
        for x in range(W):
            if m[y, x] and not lab[y, x]:
                n += 1
                st = [(y, x)]
                lab[y, x] = n
                while st:
                    a, b = st.pop()
                    for dy, dx in nb:
                        u, v = a + dy, b + dx
                        if wrap:
                            v %= W
                        if 0 <= u < H and 0 <= v < W and m[u, v] and not lab[u, v]:
                            lab[u, v] = n
                            st.append((u, v))
    return lab, n


def poly_mask(h, w, x0, y0, polys, sx=1.0, sy=1.0):
    """Polygons in his coordinates rasterized on a grid whose (0, 0) is his (x0, y0), with
    sx, sy grid pixels per his pixel."""
    m = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(m)
    for p in polys:
        d.polygon([((x - x0) * sx, (y - y0) * sy) for x, y in p], fill=255)
    return np.asarray(m) > 0


def rect(x0, y0, x1, y1):
    return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]


def ellipse(cx, cy, rx, ry, n=40):
    return [(cx + rx * np.cos(a), cy + ry * np.sin(a)) for a in np.linspace(0, 2 * np.pi, n, endpoint=False)]


def c2a(c, bg=BG):
    """Colour-to-alpha against the background: the least alpha with c = a*F + (1-a)*bg."""
    d = c - bg
    up = np.maximum(d, 0) / (255 - bg)
    down = np.maximum(-d, 0) / bg
    a = np.clip(np.maximum(up, down).max(-1), 0, 1)
    F = bg + d / np.maximum(a, 1e-6)[..., None]
    return a, np.clip(F, 0, 255)


# --- his sheet, flattened onto one background ------------------------------------------------
# Inside his panels the art lies on BG, outside on PAGE, and the panel borders cut through it
# where it spills over. Everything is turned into "difference from the background it lies on"
# and put back on BG, the border lines filled from their neighbours, so art that spills over a
# border reads as one piece.

def flatten():
    H, W = H0, W0
    bgmap = np.zeros((H, W, 3)) + PAGE
    border = np.zeros((H, W), bool)
    for x0, y0, x1, y1 in PANELS.values():
        bgmap[y0 + 1:y1, x0 + 1:x1] = BG
        border[y0, x0:x1 + 1] = border[y1, x0:x1 + 1] = True
        border[y0:y1 + 1, x0] = border[y0:y1 + 1, x1] = True
    d = IM0 - bgmap
    # The border lines: their value is the mean of the pixels on both sides across the line.
    dd = d.copy()
    for x0, y0, x1, y1 in PANELS.values():
        for y in (y0, y1):
            dd[y, x0:x1 + 1] = (d[y - 1, x0:x1 + 1] + d[y + 1, x0:x1 + 1]) / 2
        for x in (x0, x1):
            dd[y0:y1 + 1, x] = (d[y0:y1 + 1, x - 1] + d[y0:y1 + 1, x + 1]) / 2
    # Faint differences on the page or the border (JPEG ringing round the lines) are noise.
    weak = (np.abs(dd).sum(-1) < 30) & (border | (bgmap[..., 0] == PAGE[0]))
    dd[weak] = 0
    return np.clip(BG + dd, 0, 255)


FLAT = flatten()
SMOOTH = gauss(FLAT, 0.5)


# --- the sprites ------------------------------------------------------------------------------
# anchor: the anchor in HIS coordinates (projectile core / ground centre / feet / breath origin);
#         'at' puts it in the game frame (otherwise the frame is cropped to the art + MARGIN).
# area:   polygons (his coordinates) where his art for this sprite is; the rest is ignored.
# drop:   polygons removed before anything else (his characters, labels, stray bits).
# halo:   polygons where his soft haze is glow even when it is strong (the aura's halo).
# pieces: [(name, polygons)]: named pieces split off the main body (first match wins).
# drops:  the largest loose bit (px at game scale) still counted as a droplet.

SPRITES = {
    'bolt': dict(anchor=(62, 78), area=[rect(9, 42, 83, 112)], drops=24),
    'breath': dict(anchor=(536, 77), area=[rect(533, 42, 641, 112)], drops=24, breath=True),
    'sphere': dict(anchor=(689.5, 77.5), area=[rect(652, 42, 724, 112)], drops=24),
    'slash': dict(anchor=(46, 198.5), area=[rect(9, 160, 79, 235)], drops=12),
    'multi': dict(anchor=(164.5, 195), area=[rect(125, 160, 199, 230)], drops=6),
    'hit': dict(anchor=(281, 200), area=[rect(241, 160, 318, 239)], drops=30),
    'blast': dict(anchor=(456, 293), area=[rect(356, 160, 560, 325)], drops=30,
                  drop=[[(540, 190), (622, 190), (622, 325), (540, 325)]]),
    'wall': dict(anchor=(161, 486.8), area=[rect(9, 355, 312, 496)], drops=30,
                 drop=[[(305, 380), (375, 380), (375, 496), (305, 496)]]),
    'wall_diag': dict(anchor=(505.9, 564.6), area=[rect(387, 355, 640, 647)], drops=30,
                      drop=[rect(628, 450, 689, 647)]),
    'wall_depth': dict(anchor=(34, 906.2), area=[rect(9, 677, 80, 1011)], drops=30,
                       drop=[rect(68, 800, 125, 920)]),
    'aura': dict(anchor=(262.3, 800.5), area=[rect(205, 678, 320, 817)], drops=30, aura=True,
                 halo=[rect(200, 670, 330, 830)]),
}
MARGIN = 4


def his_box(cfg, W, H, ax, ay):
    """His rectangle (float) covered by a W x H game frame with the anchor at (ax, ay)."""
    hx, hy = cfg['anchor']
    return (hx - ax / SX, hy - ay / SY, hx + (W - ax) / SX, hy + (H - ay) / SY)


def resample(arr, box, W, H):
    """Box-filters an HxW(xC) float array of his sheet onto a W x H game grid covering `box`."""
    if arr.ndim == 2:
        return np.asarray(Image.fromarray(arr.astype(np.float32), 'F').resize((W, H), Image.BOX, box=box), np.float64)
    return np.stack([resample(arr[..., k], box, W, H) for k in range(arr.shape[2])], -1)


def classify_his(cfg):
    """Class maps at his resolution over the whole sheet, limited to the sprite's area."""
    c = SMOOTH
    keep = poly_mask(H0, W0, 0, 0, cfg['area'])
    if cfg.get('drop'):
        keep &= ~poly_mask(H0, W0, 0, 0, cfg['drop'])
    L = lum(c)
    dist = np.sqrt(((c - BG) ** 2).sum(-1))
    body = keep & ((L >= 95) | ((dist >= 26) & (L >= 34)))
    outline = keep & ~body & (dist >= 20) & (L < 34)
    a, F = c2a(c)
    glow = keep & ~body & ~outline & (a >= 0.035) & (L > lum(BG))
    if cfg.get('halo'):
        # Inside the halo, mid-dark blue that is not shut in by his outline is haze, not water.
        halo = keep & poly_mask(H0, W0, 0, 0, cfg['halo'])
        wall = (L >= 100) | outline
        y0, y1 = np.nonzero(halo.any(1))[0][[0, -1]]
        x0, x1 = np.nonzero(halo.any(0))[0][[0, -1]]
        sub = ~dilate(wall[y0:y1 + 1, x0:x1 + 1]) & halo[y0:y1 + 1, x0:x1 + 1]
        lab, n = components(sub, nb=N4)
        edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
        outside = np.isin(lab, list(edge))
        out_full = np.zeros_like(halo)
        out_full[y0:y1 + 1, x0:x1 + 1] = dilate(outside) & ~wall[y0:y1 + 1, x0:x1 + 1]
        hz = out_full & body & (L < 100)
        body &= ~hz
        glow |= hz
    return dict(body=body, outline=outline, glow=glow, a=np.where(glow, a, 0), F=F, c=c)


def to_game(cfg, cls, W, H, ax, ay):
    box = his_box(cfg, W, H, ax, ay)
    B = resample(cls['body'].astype(np.float64), box, W, H)
    O = resample(cls['outline'].astype(np.float64), box, W, H)
    CB = resample(cls['c'] * cls['body'][..., None], box, W, H)
    col = CB / np.maximum(B, 1e-6)[..., None]
    A = resample(cls['a'], box, W, H)
    FA = resample(cls['F'] * cls['a'][..., None], box, W, H)
    gcol = FA / np.maximum(A, 1e-6)[..., None]
    return dict(B=B, O=O, col=col, A=A, gcol=gcol, box=box)


def bounds_game(cfg, cls):
    """The art's extent at game scale, relative to the anchor (in game px)."""
    m = cls['body'] | cls['outline'] | (cls['a'] > 0.06)
    ys, xs = np.nonzero(m)
    hx, hy = cfg['anchor']
    return ((xs.min() - hx) * SX, (ys.min() - hy) * SY, (xs.max() + 1 - hx) * SX, (ys.max() + 1 - hy) * SY)


# --- decisions at game scale ------------------------------------------------------------------

def decide(g, wrap=False):
    """Solid body, outline ring and glow at game scale."""
    B, O, A = g['B'], g['O'], g['A']
    solid = B >= 0.5
    # Pinholes: a clear pixel shut in by body on 3 sides is body.
    nb = sum(shift(solid, dy, dx, wrap).astype(int) for dy, dx in N4)
    solid |= (~solid) & (nb >= 3) & (B >= 0.2)
    # The outline: a 1 px ring round the body where his art has a dark rim (or the body's own
    # edge is soft and mostly rim).
    ring = dilate(solid, wrap=wrap) & ~solid
    rim = ring & ((O + B) >= 0.22)
    # A body pixel that is mostly his rim and lies on the silhouette is the outline itself.
    edge = solid & ~(shift(solid, 1, 0, wrap) & shift(solid, -1, 0, wrap) & shift(solid, 0, 1, wrap) & shift(solid, 0, -1, wrap))
    glow = (~solid) & (~rim) & (A >= 0.05)
    return solid, rim, edge, glow


# --- palette ------------------------------------------------------------------------------------

def median_cut(cols, n):
    cols = np.asarray(np.clip(np.round(cols), 0, 255), np.uint8).reshape(1, -1, 3)
    q = Image.fromarray(cols, 'RGB').quantize(colors=n, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    pal = np.array(q.getpalette()[:n * 3], np.float64).reshape(-1, 3)
    used = np.unique(np.asarray(q).ravel())
    return pal[used]


def nearest(cols, pal):
    d = ((cols[..., None, :] - pal) ** 2).sum(-1)
    return d.argmin(-1)


def rle(flat):
    out = bytearray()
    i = 0
    while i < len(flat):
        v = int(flat[i])
        n = 1
        while i + n < len(flat) and flat[i + n] == v and n < 255:
            n += 1
        out += bytes((n, v))
        i += n
    return base64.b64encode(bytes(out)).decode('ascii')


# --- build ----------------------------------------------------------------------------------------

def frame_for(name, cfg, cls):
    x0, y0, x1, y1 = bounds_game(cfg, cls)
    if cfg.get('breath'):
        # The origin (his cone's tip) sits on the anchor's row, 48 px left of the anchor.
        ox = int(np.ceil(-x0)) + MARGIN
        ay = int(np.ceil(-y0)) + MARGIN
        W = ox + int(np.ceil(x1)) + MARGIN
        H = ay + int(np.ceil(y1)) + MARGIN
        return W, H, ox, ay
    ax = int(np.ceil(-x0)) + MARGIN
    ay = int(np.ceil(-y0)) + MARGIN
    W = ax + int(np.ceil(x1)) + MARGIN
    H = ay + int(np.ceil(y1)) + MARGIN
    return W, H, ax, ay


built = {}
for name, cfg in SPRITES.items():
    cls = classify_his(cfg)
    W, H, ax, ay = frame_for(name, cfg, cls)
    g = to_game(cfg, cls, W, H, ax, ay)
    solid, rim, edge, glow = decide(g)
    built[name] = dict(cfg=cfg, cls=cls, g=g, W=W, H=H, ax=ax, ay=ay, solid=solid, rim=rim, edge=edge, glow=glow)
    print('%-11s %3dx%-3d anchor %3d,%-3d' % (name, W, H, ax, ay))

# One palette for the set: his body colours (median cut), his rim colour, his haze colours.
body_cols = np.concatenate([b['g']['col'][b['solid']] for b in built.values()])
BODY = median_cut(body_cols, 22)
BODY = BODY[np.argsort(lum(BODY))]
rim_cols = np.concatenate([b['g']['col'][b['rim'] & (b['g']['B'] > 0.3)] for b in built.values()] + [SMOOTH[built['wall']['cls']['outline']]])
OUTLINE = np.median(SMOOTH[np.concatenate([b['cls']['outline'][None] for b in built.values()]).any(0)], 0)
print('his rim median', OUTLINE.round())
glow_cols = np.concatenate([b['g']['gcol'][b['glow']] for b in built.values()])
GLOW = median_cut(glow_cols, 4)
ALPHAS = [40, 70, 105, 145, 190]

PAL = []  # (r, g, b, a, kind)
for c in BODY:
    PAL.append((*[int(round(v)) for v in c], 255, 'body'))
I_OUT = len(PAL)
PAL.append((*[int(round(v)) for v in OUTLINE], 255, 'outline'))
I_GLOW = len(PAL)
for c in GLOW:
    for a in ALPHAS:
        PAL.append((*[int(round(v)) for v in c], a, 'glow'))
PALC = np.array([p[:4] for p in PAL], np.float64)


def quantize(b):
    g = b['g']
    H, W = b['H'], b['W']
    idx = np.zeros((H, W), np.int32)
    s = b['solid']
    idx[s] = nearest(g['col'][s], BODY) + 1
    # Speck clean-up: a body pixel unlike all four neighbours, and close to them in brightness,
    # is JPEG noise and takes their commonest value (real highlights stand out and stay).
    for y in range(1, H - 1):
        for x in range(1, W - 1):
            v = idx[y, x]
            if not v:
                continue
            nb = [idx[y, x + 1], idx[y, x - 1], idx[y + 1, x], idx[y - 1, x]]
            if v in nb or not all(nb):
                continue
            m = max(set(nb), key=nb.count)
            if abs(lum(PALC[v - 1][:3]) - lum(PALC[m - 1][:3])) < 34:
                idx[y, x] = m
    idx[b['rim']] = I_OUT + 1
    gl = b['glow']
    if gl.any():
        gi = nearest(g['gcol'][gl], GLOW)
        ai = np.abs(g['A'][gl][:, None] * 255 - np.array(ALPHAS)[None]).argmin(1)
        idx[gl] = I_GLOW + gi * len(ALPHAS) + ai + 1
    return idx


result = {}
for name, b in built.items():
    idx = quantize(b)
    b['idx'] = idx
    H, W = idx.shape
    kinds = np.array(['clear'] + [p[4] for p in PAL])[idx]
    owner = np.full((H, W), 'main', dtype=object)
    owner[kinds == 'glow'] = 'glow'
    # Loose droplets and spray: small separate bits (with their rim).
    lab, n = components((kinds == 'body') | (kinds == 'outline'))
    sizes = np.bincount(lab.ravel(), minlength=n + 1)
    big = sizes[1:].max() if n else 0
    drops = (lab > 0) & (sizes[lab] <= b['cfg']['drops']) & (sizes[lab] < big)
    owner[drops] = 'drops'
    pieces = {}
    for pname in ['main', 'drops', 'glow']:
        m = (owner == pname) & (idx > 0)
        if not m.any():
            continue
        sub = np.where(m, idx, 0)
        ys, xs = np.nonzero(sub)
        bx0, by0, bx1, by1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
        pieces[pname] = {'x': int(bx0), 'y': int(by0), 'w': int(bx1 - bx0), 'h': int(by1 - by0), 'rle': rle(sub[by0:by1, bx0:bx1].ravel())}
    result[name] = {'w': W, 'h': H, 'anchor': [b['ax'], b['ay']], 'pieces': pieces}

pal_json = [{'rgba': '#%02x%02x%02x%02x' % p[:4], 'kind': p[4]} for p in PAL]
ts = ["// GENERATED by tools/refs/water-from-ref.py from the owner's paint-over of the water sheet",
      "// (docs/reference/water-set-owner-reference.jpg): do not edit by hand. One palette for the set;",
      "// each sprite's key frame is split into pieces of base64 run-length data, as (run, palette",
      "// index + 1) byte pairs (0 = clear), each placed at (x, y) in the sprite's frame.", '',
      "export type WaterKind = 'body' | 'outline' | 'glow';",
      'export interface WaterPal { rgba: string; kind: WaterKind }',
      'export interface WaterPiece { x: number; y: number; w: number; h: number; rle: string }',
      'export interface WaterRef { w: number; h: number; anchor: [number, number]; pieces: Record<string, WaterPiece> }',
      'export const WV3_PAL: WaterPal[] = ' + json.dumps(pal_json) + ';',
      'export const WV3_REF: Record<string, WaterRef> = ' + json.dumps(result, indent=1) + ';', '']
tmp = OUT_TS + '.part'
with open(tmp, 'w') as fh:
    fh.write('\n'.join(ts))
os.replace(tmp, OUT_TS)
print('palette', len(PAL))
for i, p in enumerate(PAL):
    if p[4] != 'glow' or p[3] == ALPHAS[-1]:
        print('  %2d #%02x%02x%02x a%3d %s' % (i, *p))

if REVIEW:
    os.makedirs(REVIEW, exist_ok=True)
    for name, b in built.items():
        idx = b['idx']
        H, W = idx.shape
        rgba = np.zeros((H, W, 4))
        on = idx > 0
        rgba[on] = PALC[idx[on] - 1]

        def comp(bg):
            A = rgba[..., 3:] / 255
            return (rgba[..., :3] * A + np.array(bg) * (1 - A)).astype(np.uint8)
        his = resample(IM0, b['g']['box'], W, H).clip(0, 255).astype(np.uint8)
        Image.fromarray(his).save(os.path.join(REVIEW, 'his-' + name + '.png'))
        k = 4 if max(W, H) < 120 else 3 if max(W, H) < 200 else 2
        imgs = [his, comp(BG), comp([84, 110, 70])]
        S = Image.new('RGB', (W * k * 3 + 20, H * k), (0, 0, 0))
        for i, x in enumerate(imgs):
            S.paste(Image.fromarray(x).resize((W * k, H * k), Image.NEAREST), (i * (W * k + 10), 0))
        S.save(os.path.join(REVIEW, 'x-' + name + '.png'))
