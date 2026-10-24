"""The owner's fire hit (vfx_fire/hit), lifted from his repaint.

He painted it over our sheet of the practice rogue being hit by fire (2026-10-24,
docs/reference/fire-hit-owner-reference.jpg): our 4x sheet of 12 labelled cells ("Golpe de fuego 1..12",
each 128x176 game px at 4x), scaled down to 2000 px wide (2000/3072, so one game pixel is about 2.6 of
his picture pixels) and 5.5 px cut off its top. His frames: a small burst, an explosion growing into big
licking flames, flames wrapping and rising up the body, a thick brown smoke cloud, the smoke thinning
with embers.

How his effect is told from the rogue under it (the rogue is tools/refs/data/fire-hit-base.png, written
by tools/refs/fire-hit-base.ts, the cells he painted over without the old hit):
- each game pixel of his is read at its block's centre (the mean of a 3x3 of picture points 0.6 apart,
  which keeps the JPEG's ringing and the block edges out);
- the background a pixel could be: our rogue or the checkerboard there (or a pixel off), our sheet scaled
  down as he scaled it (the soft edges of the rogue's lines), and his own rogue where he left it (his
  rogue is our rogue retouched: what most of the frames with the same pose agree on, where it is close to
  ours);
- his effect: a colour of his palette (his colours: the means of his effect's colours where nothing is
  under it, JPEG noise averaged out), or a smoke colour of his see-through over what is under it (a
  quarter, a half or three quarters);
- a pixel is his effect when the effect explains it clearly better than the background does; what the
  effect surrounds is the effect (thin smoke over the ninja); a few tiny dark specks on the ninja's own
  lines, where his retouched rogue differs from ours, are dropped (embers are kept).
The effect is checked by putting it back over our rogue: the result is his picture within his JPEG's noise.

The frame is the box round his effect in all 12 frames (2 px spare); the anchor is where our old hit's
anchor was on the rogue (60 px over his feet, the usual single-target impact), so his burst sits on the
target where he painted it. 12 frames at 12 fps, as before.

    python3 -I tools/refs/fire-hit-from-ref.py [--check DIR]

Writes tools/world-sprites/vfx-fire-hit-refdata.ts (generated: rerun this to change it), which
tools/world-sprites/vfx-a-fire-v3.ts turns into the hit. --check DIR writes his picture beside ours put
back over the rogue, and the effect alone, at 4x. Deterministic: the same inputs give the same bytes.
"""

import json, os, sys
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
REF = os.path.join(ROOT, 'docs/reference/fire-hit-owner-reference.jpg')
BASE = os.path.join(ROOT, 'tools/refs/data/fire-hit-base.png')
OUT = os.path.join(ROOT, 'tools/world-sprites/vfx-fire-hit-refdata.ts')
CHECK = sys.argv[sys.argv.index('--check') + 1] if '--check' in sys.argv else None

N, W, H = 12, 128, 176
FEET = (64, 158)
LIFT = 60                    # our old hit's anchor: 60 px over the target's feet (playback.ts, a single target)
# His picture: our sheet (cells of 512x704 at 4x, 6 a row, the first at (0, 94), the next row 738 lower)
# scaled by 2000/3072 and 5.5 px of its top cut (fitted on the rogue's legs, where he painted nothing).
S = 2000 / 3072
DX, DY = -0.5, -6.0
CELL = lambda i: ((i % 6) * 512, 94 + (i // 6) * 738)
SHEET_BG = (24, 26, 32)
LIGHT, DARK = np.array([86, 90, 100.]), np.array([70, 74, 84.])

his = np.asarray(Image.open(REF).convert('RGB')).astype(float)
strip = np.asarray(Image.open(BASE).convert('RGB')).astype(float)
bases = [strip[:, i * W:(i + 1) * W] for i in range(N)]
gy, gx = np.mgrid[0:H, 0:W]
LIGHT_SQ = ((gx // 8 + gy // 8) % 2) == 1
CHECKER = np.where(LIGHT_SQ[..., None], LIGHT, DARK)
INNER = (gx > 2) & (gx < W - 3) & (gy > 2) & (gy < H - 3)
ROGUE = [np.abs(b - CHECKER).max(2) > 0 for b in bases]


def bilinear(img, x, y):
    h, w = img.shape[:2]
    x0 = np.clip(np.floor(x).astype(int), 0, w - 2); y0 = np.clip(np.floor(y).astype(int), 0, h - 2)
    fx = (x - x0)[..., None]; fy = (y - y0)[..., None]
    return img[y0, x0] * (1 - fx) * (1 - fy) + img[y0, x0 + 1] * fx * (1 - fy) + img[y0 + 1, x0] * (1 - fx) * fy + img[y0 + 1, x0 + 1] * fx * fy


def read(img, i, dy):
    """Each game pixel of cell i at its block's centre: the mean of 3x3 points 0.6 picture px apart."""
    cx, cy = CELL(i)
    X = (cx + 4 * gx + 2) * S + DX
    Y = (cy + 4 * gy + 2) * S + dy
    return sum(bilinear(img, X + ox, Y + oy) for ox in (-0.6, 0, 0.6) for oy in (-0.6, 0, 0.6)) / 9


def shifted(a, r):
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            yield np.roll(np.roll(a, dy, 0), dx, 1)


def dilate(m, r):
    out = m.copy()
    for s in shifted(m, r): out |= s
    return out


def components(m):
    lab = np.zeros(m.shape, int); n = 0
    for y, x in zip(*np.nonzero(m)):
        if lab[y, x]: continue
        n += 1; todo = [(y, x)]; lab[y, x] = n
        while todo:
            cy, cx = todo.pop()
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    yy, xx = cy + dy, cx + dx
                    if 0 <= yy < H and 0 <= xx < W and m[yy, xx] and not lab[yy, xx]:
                        lab[yy, xx] = n; todo.append((yy, xx))
    return lab, n


# --- his picture, and our sheet scaled down as he scaled it ------------------------------------------
HIS = [read(his, i, DY) for i in range(N)]
sheet = np.zeros((1536, 3072, 3), np.uint8); sheet[:] = SHEET_BG
for i in range(N):
    cx, cy = CELL(i)
    sheet[cy:cy + 704, cx:cx + 512] = np.kron(bases[i], np.ones((4, 4, 1))).astype(np.uint8)
small = np.asarray(Image.fromarray(sheet).resize((2000, 1000), Image.BILINEAR)).astype(float)
OURS_SMALL = [read(small, i, -0.5) for i in range(N)]


def his_rogues():
    """His rogue where his effect leaves it, for every frame: at each pixel, the median of the frames
    whose rogue is the same there, where most of them agree and it is close to ours (his retouch moves
    a line a pixel or two, it does not repaint)."""
    B = np.stack(bases); Hs = np.stack(HIS)
    med = np.zeros((N, H, W, 3)); ok = np.zeros((N, H, W), bool)
    for y in range(H):
        for x in range(W):
            todo = list(range(N))
            while todo:
                js = [j for j in todo if np.abs(B[j, y, x] - B[todo[0], y, x]).max() < 1]
                todo = [j for j in todo if j not in js]
                v = Hs[js, y, x]
                m = np.median(v, 0)
                agree = (np.abs(v - m).max(1) < 16).sum() >= max(2, len(js) // 2 + 1)
                med[js, y, x] = m
                ok[js, y, x] = agree
    for i in range(N):
        near = np.full((H, W), 1e9)
        for s in shifted(OURS_SMALL[i], 2): near = np.minimum(near, np.linalg.norm(med[i] - s, axis=2))
        ok[i] &= near < 40
    return med, ok

HIS_ROGUE, HIS_ROGUE_OK = his_rogues()


# --- his palette: his effect's colours where nothing is under it --------------------------------------
def kmeans(X, K, iters=30):
    cent = [X.mean(0)]
    for _ in range(K - 1):
        d = np.min([((X - c) ** 2).sum(1) for c in cent], axis=0)
        cent.append(X[int(np.argmax(d))])
    cent = np.array(cent)
    for _ in range(iters):
        lab = np.argmin(((X[:, None, :] - cent[None]) ** 2).sum(2), 1)
        for k in range(K):
            if (lab == k).any(): cent[k] = X[lab == k].mean(0)
    return cent

samples = []
for i in range(N):
    away = ~dilate(ROGUE[i], 4) & INNER
    cand = (np.abs(HIS[i] - CHECKER).max(2) > 30) & away
    inside = cand.copy()
    for s in shifted(cand, 1): inside &= s
    samples.append(HIS[i][inside])
PAL = np.round(kmeans(np.concatenate(samples), 40)).clip(0, 255)
SAT = (PAL.max(1) - PAL.min(1)) / np.maximum(PAL.max(1), 1)
SMOKE = (SAT < 0.45) & (PAL.max(1) < 200)       # his browns and greys: these can be see-through
EMBER = (PAL.max(1) > 170) & ((PAL.max(1) - PAL.min(1)) > 90)
ALPHAS = (0.25, 0.5, 0.75)
SEE_THROUGH_COST = 6     # a see-through fit has to beat a solid one by this much
NEAR_MARGIN, AWAY_MARGIN = 6, 4
FAR = 30                 # no colour of his within this: not his effect


def lift(i):
    Hs, E = HIS[i], bases[i]
    near = dilate(ROGUE[i], 6)
    bg = np.linalg.norm(Hs - CHECKER, axis=2)
    for s in shifted(E, 2): bg = np.minimum(bg, np.linalg.norm(Hs - s, axis=2))
    for s in shifted(OURS_SMALL[i], 1): bg = np.minimum(bg, np.linalg.norm(Hs - s, axis=2))
    rh, ok = HIS_ROGUE[i], HIS_ROGUE_OK[i]
    for s, so in zip(shifted(rh, 1), shifted(ok, 1)): bg = np.where(so, np.minimum(bg, np.linalg.norm(Hs - s, axis=2)), bg)
    d = np.sqrt(((Hs[..., None, :] - PAL[None, None]) ** 2).sum(-1))
    k, a, e = d.argmin(-1), np.ones((H, W)), d.min(-1)
    for al in ALPHAS:
        pred = al * PAL[None, None] + (1 - al) * E[..., None, :]
        dd = np.sqrt(((Hs[..., None, :] - pred) ** 2).sum(-1)) + SEE_THROUGH_COST
        dd[..., ~SMOKE] = 1e9
        kk, ee = dd.argmin(-1), dd.min(-1)
        up = ee < e
        k, a, e = np.where(up, kk, k), np.where(up, al, a), np.where(up, ee, e)
    eff = (e + np.where(near, NEAR_MARGIN, AWAY_MARGIN) < bg) & (e < FAR) & INNER
    # What the effect surrounds is the effect: thin smoke over the ninja.
    for _ in range(3):
        nb = sum(np.roll(np.roll(eff, dy, 0), dx, 1) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if dy or dx)
        eff |= (nb >= 6) & INNER
    lab, n = components(~eff)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])))
    for c in range(1, n + 1):
        if c not in edge and (lab == c).sum() <= 40: eff |= lab == c
    # Tiny dark specks on the ninja's own lines (his retouched rogue against ours), not embers.
    lab, n = components(eff)
    for c in range(1, n + 1):
        m = lab == c
        if m.sum() <= 3 and near[m].all() and not EMBER[k[m]].any(): eff &= ~m
    rgba = np.zeros((H, W, 4))
    rgba[eff, :3] = PAL[k[eff]]
    rgba[eff, 3] = np.round(255 * a[eff])
    return rgba


frames = [lift(i) for i in range(N)]

# --- check: our effect over our rogue against his picture ----------------------------------------------
def over(rgba, under):
    al = rgba[..., 3:4] / 255
    return rgba[..., :3] * al + under * (1 - al)

print('frame  effect px  see-through  mean |his - ours over the rogue|  (his picture against our sheet where he painted nothing: about 3.7)')
for i, f in enumerate(frames):
    err = np.abs(over(f, bases[i]) - HIS[i])[INNER].mean()
    print(f'{i + 1:5d}  {int((f[..., 3] > 0).sum()):9d}  {int(((f[..., 3] > 0) & (f[..., 3] < 255)).sum()):11d}  {err:6.2f}')

# --- the frame round his effect, the anchor on the rogue ----------------------------------------------
anyfx = np.any([f[..., 3] > 0 for f in frames], axis=0)
ys, xs = np.nonzero(anyfx)
x0, y0 = int(xs.min()) - 2, int(ys.min()) - 2
x1, y1 = int(xs.max()) + 3, int(ys.max()) + 3
fw, fh = x1 - x0, y1 - y0
ax, ay = FEET[0] - x0, FEET[1] - LIFT - y0

colours = sorted({tuple(int(v) for v in f[y, x]) for f in frames for y, x in zip(*np.nonzero(f[..., 3] > 0))}, key=lambda c: (c[3], 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2], c))
CHARS = ''.join(c for c in map(chr, range(33, 127)) if c not in '."\\`$\'')
assert len(colours) <= len(CHARS), len(colours)
index = {c: CHARS[j] for j, c in enumerate(colours)}
rows = [[''.join(index[tuple(int(v) for v in f[y, x])] if f[y, x, 3] > 0 else '.' for x in range(x0, x1)) for y in range(y0, y1)] for f in frames]

hexes = ['#%02x%02x%02x%02x' % c for c in colours]
with open(OUT, 'w') as fo:
    fo.write('// Generated by tools/refs/fire-hit-from-ref.py from the owner\'s fire hit (docs/reference/fire-hit-owner-reference.jpg,\n')
    fo.write('// his repaint of our 12-frame sheet of the practice rogue hit by fire): rerun the script to change it.\n')
    fo.write('// His 12 frames in his pixels, rows of palette letters (\'.\' clear), his colours as #rrggbbaa (his smoke\n')
    fo.write('// see-through where he painted it so); the anchor sits where our old hit\'s did on the target.\n\n')
    fo.write('export interface FireHitRef {\n  w: number;\n  h: number;\n  anchor: [number, number];\n  fps: number;\n  pal: Record<string, string>;\n  frames: string[][];\n}\n\n')
    fo.write('export const FIRE_HIT_REF: FireHitRef = ')
    fo.write(json.dumps({'w': fw, 'h': fh, 'anchor': [ax, ay], 'fps': 12, 'pal': {index[c]: h for c, h in zip(colours, hexes)}, 'frames': rows}, indent=1))
    fo.write(';\n')
print(f'frame {fw}x{fh}, anchor ({ax}, {ay}), {len(colours)} colours ({int(SMOKE.sum())} of his {len(PAL)} are smoke) -> {os.path.relpath(OUT, ROOT)}')

if CHECK:
    os.makedirs(CHECK, exist_ok=True)
    green = np.zeros((H, W, 3)); green[:] = (40, 120, 60)
    cols = [np.concatenate([HIS[i], over(f, bases[i]), over(f, green)], 0) for i, f in enumerate(frames)]
    img = np.concatenate(cols, 1).clip(0, 255).astype(np.uint8)
    Image.fromarray(img).resize((img.shape[1] * 4, img.shape[0] * 4), Image.NEAREST).save(os.path.join(CHECK, 'fire-hit-check-4x.png'))
