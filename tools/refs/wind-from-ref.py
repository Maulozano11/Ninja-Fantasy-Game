"""Cuts the owner's paint-over of the wind sheet (REF-wind-set-owner.jpg) into game-scale key frames
for the wind set, v3 (tools/world-sprites/vfx-wind-v3.ts).

    python3 -I tools/refs/wind-from-ref.py <REF-wind-set-owner.jpg> tools/world-sprites/vfx-wind-v3-refdata.ts [previewDir]

The owner asked for his reference to be copied as exactly as possible, so every key frame is HIS
pixels:
  * Scale. His sheet is our 2x review sheet (vfx-wind.png) redrawn at 0.544 of its size, so each of
    his panels is our sprite frame at S = 1.0875 of his pixels per game pixel (bolt 74x70 for our
    68x64, aura 87x141 for 80x128...), and his character is our 96 px character at the same factor
    (104-105 px). The inside top-left of each of his panels is our frame's (0, 0), so his art maps
    onto our anchors directly. Everything is area-averaged (box filter) down to game scale.
  * Clean-up. His panel fill (#20202a), the sheet background, the panel border lines, his
    character and labels are removed. The JPEG is smoothed (gaussian 0.6 px) before any decision.
  * Opacity. Each of his pixels is split into what he painted and the background under it:
      solid   - his strokes, leaves and dust, with their shading and the dark teal / green / brown
                outline round them: opaque;
      veil    - soft see-through wind (the breath cone, faint wisps, glows) lighter than his fill:
                colour-to-alpha (the least alpha that composites back to his pixel over his fill);
      dark    - dark teal fill between strokes away from any stroke: a dark veil at fixed alpha.
    Composited over his panel fill, every sprite gives back his picture.
  * Palette. One palette for the set, median-cut from his own pixels: opaque colours, plus veil
    colours at a few alpha steps. Silhouette edges that are dark become a 1 px outline tinted by
    what it surrounds (deep teal round wind, deep green round leaves, dark brown round dust).
  * Pieces. Each sprite's key frame is split into the parts the generator animates (the swirl, the
    rings, the funnel, the trail...), and loose leaves are cut out one by one so they can drift.
The result is written as indexed run-length data that the generator decodes, so the build needs no
image files. Deterministic.
"""
import base64, json, math, os, sys
import numpy as np
from PIL import Image, ImageDraw

REF, OUT = sys.argv[1], sys.argv[2]
PREVIEW = sys.argv[3] if len(sys.argv) > 3 else None
IM = np.asarray(Image.open(REF).convert('RGB')).astype(np.float64)
S = 1.0875                                  # his pixels per game pixel
FILL = np.array([32.0, 32.0, 42.0])         # his panel fill
SHEET = np.array([21.0, 21.0, 29.0])        # his sheet background
BORDER = np.array([40.0, 40.0, 50.0])       # his panel border line

# --- small image tools ------------------------------------------------------------------------------

def gauss(a, s):
    """Separable gaussian blur of an HxW or HxWxC float array (edges clamped)."""
    r = max(1, int(round(s * 3)))
    k = np.exp(-0.5 * (np.arange(-r, r + 1) / s) ** 2); k /= k.sum()
    out = a.astype(np.float64)
    for ax in (0, 1):
        pad = [(0, 0)] * out.ndim; pad[ax] = (r, r)
        p = np.pad(out, pad, mode='edge')
        acc = np.zeros_like(out)
        for i, w in enumerate(k):
            sl = [slice(None)] * out.ndim; sl[ax] = slice(i, i + out.shape[ax])
            acc += w * p[tuple(sl)]
        out = acc
    return out

def lum(c):
    return 0.3 * c[..., 0] + 0.59 * c[..., 1] + 0.11 * c[..., 2]

def hue(c):
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    mx = np.maximum(np.maximum(r, g), b); mn = np.minimum(np.minimum(r, g), b)
    d = mx - mn + 1e-9
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    return h, (mx - mn) / np.maximum(mx, 1e-9)

N4 = ((1, 0), (-1, 0), (0, 1), (0, -1))
N8 = N4 + ((1, 1), (1, -1), (-1, 1), (-1, -1))

def shift(m, dy, dx):
    out = np.zeros_like(m); H, W = m.shape[:2]
    ys = slice(max(0, dy), H + min(0, dy)); yd = slice(max(0, -dy), H + min(0, -dy))
    xs = slice(max(0, dx), W + min(0, dx)); xd = slice(max(0, -dx), W + min(0, -dx))
    out[ys, xs] = m[yd, xd]
    return out

def dilate(m, n=1, nb=N4):
    for _ in range(n):
        o = m.copy()
        for dy, dx in nb: o |= shift(m, dy, dx)
        m = o
    return m

def components(m, nb=N8):
    H, W = m.shape
    lab = np.zeros((H, W), np.int32); n = 0
    for y in range(H):
        for x in range(W):
            if m[y, x] and not lab[y, x]:
                n += 1; st = [(y, x)]; lab[y, x] = n
                while st:
                    a, b = st.pop()
                    for dy, dx in nb:
                        u, v = a + dy, b + dx
                        if 0 <= u < H and 0 <= v < W and m[u, v] and not lab[u, v]:
                            lab[u, v] = n; st.append((u, v))
    return lab, n

def poly_mask(h, w, x0, y0, polys, scale=1.0):
    m = Image.new('L', (w, h), 0); d = ImageDraw.Draw(m)
    for p in polys:
        d.polygon([((x - x0) * scale, (y - y0) * scale) for x, y in p], fill=255)
    return np.asarray(m) > 0

def rect(x0, y0, x1, y1):
    return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]

def ellipse(cx, cy, rx, ry, n=48, a0=0.0, a1=2 * math.pi):
    return [(cx + rx * math.cos(a0 + (a1 - a0) * i / n), cy + ry * math.sin(a0 + (a1 - a0) * i / n)) for i in range(n + 1)]

GB = gauss(IM, 0.6)

# --- the sprites ------------------------------------------------------------------------------------
# panel: his panel's inside (x0, y0, x1, y1), x1/y1 exclusive = our frame's (0, 0) at S.
# src: the part of his sheet read for the sprite (his art may run past his panel).
# drop: polygons (his px) removed (his character, other panels' art).
# ts: how much brighter than his fill a pixel must be to count as a solid stroke (L units).
# veil: polygons where lighter pixels below `veil_ts` stay see-through (the breath cone...).
# pieces: name -> polygons (his px); the first match wins, the rest is 'main'.
# anchor: (x, y) in HIS pixels; the sprite's anchor in the game frame is mapped from it.
P = {
    'bolt': (10, 43, 84, 113), 'stream': (280, 43, 520, 113), 'breath': (534, 43, 638, 113),
    'sphere': (651, 43, 727, 113), 'slash': (10, 185, 80, 259), 'multi': (128, 185, 201, 255),
    'hit': (245, 185, 323, 270), 'blast': (362, 185, 618, 339), 'wall': (11, 371, 402, 502),
    'wall_diag': (415, 371, 737, 652), 'wall_depth': (11, 683, 141, 1012), 'aura': (223, 683, 310, 824),
}

def grow(r, l, t=None, rr=None, b=None):
    t = l if t is None else t; rr = l if rr is None else rr; b = t if b is None else b
    return (r[0] - l, r[1] - t, r[2] + rr, r[3] + b)

SPRITES = {
    'bolt': dict(panel=P['bolt'], src=grow(P['bolt'], 1), anchor=(46.5, 79.0), ts=24,
                 pieces={'swirl': [ellipse(46.5, 79.0, 30.5, 30.5)]}),
    'stream': dict(panel=P['stream'], src=grow(P['stream'], 1), anchor=None, ts=24),
    'breath': dict(panel=P['breath'], src=grow(P['breath'], 1), anchor=None, ts=110),
    'sphere': dict(panel=P['sphere'], src=grow(P['sphere'], 1), anchor=None, ts=24),
    'slash': dict(panel=P['slash'], src=grow(P['slash'], 1), anchor=None, ts=24),
    'multi': dict(panel=P['multi'], src=grow(P['multi'], 1), anchor=None, ts=24),
    'hit': dict(panel=P['hit'], src=grow(P['hit'], 1), anchor=None, ts=24),
    'blast': dict(panel=P['blast'], src=grow(P['blast'], 1), anchor=(457.5, 302.5), ts=24,
                  drop=[[(540, 186), (618, 186), (618, 339), (540, 339)]]),
    'wall': dict(panel=P['wall'], src=grow(P['wall'], 1), anchor=None, ts=24,
                 drop=[rect(332, 372, 402, 502)]),
    'wall_diag': dict(panel=P['wall_diag'], src=grow(P['wall_diag'], 1), anchor=None, ts=24,
                      drop=[rect(652, 450, 737, 600)]),
    'wall_depth': dict(panel=P['wall_depth'], src=grow(P['wall_depth'], 1), anchor=None, ts=24,
                       drop=[rect(78, 790, 141, 915)]),
    'aura': dict(panel=P['aura'], src=(214, 683, 320, 826), anchor=None, ts=24),
}

def prep(cfg):
    px0, py0, px1, py1 = cfg['panel']
    sx0, sy0, sx1, sy1 = cfg['src']
    c = GB[sy0:sy1, sx0:sx1].copy()
    raw = IM[sy0:sy1, sx0:sx1]
    H, W = c.shape[:2]
    yy, xx = np.mgrid[sy0:sy1, sx0:sx1]
    inside = (xx >= px0) & (xx < px1) & (yy >= py0) & (yy < py1)
    B = np.where(inside[..., None], FILL, SHEET)
    # The border line (and its JPEG halo) where no art covers it.
    on_border = (((xx >= px0 - 2) & (xx <= px0)) | ((xx >= px1 - 1) & (xx <= px1 + 1))) & (yy >= py0 - 2) & (yy <= py1 + 1)
    on_border |= (((yy >= py0 - 2) & (yy <= py0)) | ((yy >= py1 - 1) & (yy <= py1 + 1))) & (xx >= px0 - 2) & (xx <= px1 + 1)
    plain = (np.abs(raw - BORDER).sum(-1) < 24) | (np.abs(raw - FILL).sum(-1) < 16) | (np.abs(raw - SHEET).sum(-1) < 16)
    gone = on_border & plain
    gone |= poly_mask(H, W, sx0, sy0, cfg.get('drop', []))
    c[gone] = B[gone]
    return c, B, gone

def classify(c, B, cfg):
    d = c - B
    L, LB = lum(c), lum(B)
    dsum = np.abs(d).sum(-1)
    painted = dsum > 15
    core = (L - LB >= cfg.get('ts', 24)) & painted
    near = dilate(core, 2)
    darkish = (L < LB + 14) & (dsum >= 16)
    solid = core | (dilate(core, 1) & painted) | (darkish & near)
    lighter = painted & ~solid & (d.max(-1) > 0)
    a_light = np.clip((np.maximum(d, 0) / (255 - B)).max(-1), 0, 1)
    dark_veil = darkish & ~solid
    alpha = np.where(solid, 1.0, np.where(dark_veil, 0.72, np.where(lighter, a_light, 0.0)))
    F = np.clip(np.where(alpha[..., None] > 0, B + d / np.maximum(alpha, 1e-6)[..., None], 0), 0, 255)
    return alpha, F, solid

def to_game(cfg, alpha, F, solid):
    """Box-resamples onto the game grid: game (gx, gy) covers his [p0 + g * S, p0 + (g + 1) * S)."""
    px0, py0 = cfg['panel'][:2]
    sx0, sy0, sx1, sy1 = cfg['src']
    gl = math.floor((sx0 - px0) / S); gt = math.floor((sy0 - py0) / S)
    gr = math.ceil((sx1 - px0) / S); gb = math.ceil((sy1 - py0) / S)
    W, H = gr - gl, gb - gt
    ox, oy = px0 + gl * S - sx0, py0 + gt * S - sy0
    pad = 8
    def rs(a):
        z = np.pad(a.astype(np.float32), pad)
        return np.asarray(Image.fromarray(z, 'F').resize((W, H), Image.BOX, box=(ox + pad, oy + pad, ox + pad + W * S, oy + pad + H * S))).astype(np.float64)
    sm = solid.astype(np.float64)
    Cs = rs(sm)
    Ps = np.stack([rs(F[..., k] * sm) for k in range(3)], -1)
    tr = alpha * (1 - sm)
    At = rs(tr)
    Pt = np.stack([rs(F[..., k] * tr) for k in range(3)], -1)
    out = np.zeros((H, W, 4))
    op = Cs >= 0.5
    out[op, :3] = Ps[op] / Cs[op, None]; out[op, 3] = 1
    tA = Cs + At
    t = ~op & (tA > 0.07)
    out[t, :3] = np.clip((Ps[t] + Pt[t]) / tA[t, None], 0, 255)
    out[t, 3] = np.minimum(tA[t], 0.9)
    return out, (gl, gt)

def his_to_game(cfg, x, y, org):
    px0, py0 = cfg['panel'][:2]
    return (x - px0) / S - org[0], (y - py0) / S - org[1]

# --- pass 1: every sprite at game scale, unquantized -------------------------------------------------
stage = {}
for name, cfg in SPRITES.items():
    c, B, gone = prep(cfg)
    alpha, F, solid = classify(c, B, cfg)
    img, org = to_game(cfg, alpha, F, solid)
    # His picture at game scale, for the comparison sheets.
    sx0, sy0, sx1, sy1 = cfg['src']
    raw = IM[sy0:sy1, sx0:sx1]
    rawc, _ = to_game(cfg, np.ones(raw.shape[:2]), raw, np.ones(raw.shape[:2], bool))
    stage[name] = dict(img=img, org=org, raw=rawc[..., :3])
    print(name, img.shape[1], 'x', img.shape[0], 'origin', org)

def save_preview(name, img, raw, k=3):
    H, W = img.shape[:2]
    tiles = [raw]
    for b in ((32, 32, 42), (92, 124, 66), (158, 146, 120)):
        a = img[..., 3:]
        tiles.append(img[..., :3] * a + np.array(b, np.float64) * (1 - a))
    row = np.concatenate([np.pad(t, ((0, 0), (0, 3), (0, 0)), constant_values=0) for t in tiles], 1)
    Image.fromarray(np.clip(row, 0, 255).astype(np.uint8)).resize((row.shape[1] * k, H * k), Image.NEAREST).save(os.path.join(PREVIEW, f'{name}.png'))

if PREVIEW:
    os.makedirs(PREVIEW, exist_ok=True)
    for name, st in stage.items():
        save_preview(name, st['img'], st['raw'], 3 if st['img'].shape[1] < 200 else 2)
