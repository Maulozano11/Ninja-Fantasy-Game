"""Independent check of the round-5 review findings on the staged chakra griffin.

    python3 -I verify.py <art2 dir>

Reads only: staging/vfx_beasts_griffin (PNG + manifest), griffin-ref/griffin-frames.npz (the converter's piece
map, aligned here by matching frame 0 to the staged sheet), griffin-ref/griffin-his-game.png and
griffin-ref/griffin-ref.json (his picture at the game scale, on the converter's crop).
"""
import json, os, sys
import numpy as np
from PIL import Image

A = sys.argv[1]
ST = os.path.join(A, 'staging', 'vfx_beasts_griffin')
man = json.load(open(os.path.join(ST, 'manifest.json')))['sprites']['chakra']
FW, FH = man['frameW'], man['frameH']
fly = man['anims']['fly']
sheet = np.asarray(Image.open(os.path.join(ST, man['file'])).convert('RGBA'))
F = [sheet[fly['row'] * FH:(fly['row'] + 1) * FH, i * FW:(i + 1) * FW] for i in range(fly['frames'])]
N = len(F)
LUMA = np.array([0.3, 0.55, 0.15])
print(f'sheet {sheet.shape[1]}x{sheet.shape[0]}, frame {FW}x{FH}, anchor {man["anchor"]}, fly {N} frames @ {fly["fps"]} fps loop={fly["loop"]}')
print('row width', N * FW, '(< 8192)', N * FW < 8192)

# 1. border
bad = [k for k, f in enumerate(F) if f[0, :, 3].any() or f[-1, :, 3].any() or f[:, 0, 3].any() or f[:, -1, 3].any()]
print('border: frames with a pixel on the edge:', bad or 'none')

# 2. light
L = []
for f in F:
    a = f[..., 3] / 255.0
    L.append(float((a * (f[..., :3] @ LUMA) / 255).mean()))
steps = [L[(k + 1) % N] / L[k] for k in range(N)]
print('light (mean alpha x luma):', ' '.join(f'{v:.3f}' for v in L))
print('steps k->k+1:', ' '.join(f'x{v:.2f}' for v in steps), '| largest step', f'{max(abs(L[(k + 1) % N] - L[k]) for k in range(N)) / max(L):.1%}', 'of the peak')

# 3. align the converter's piece map to the staged frames
npz = np.load(os.path.join(A, 'griffin-ref', 'griffin-frames.npz'))
full, top = npz['frames'], npz['top']
best = None
for oy in range(0, full.shape[1] - FH + 1):
    for ox in range(0, full.shape[2] - FW + 1):
        if np.array_equal(full[0, oy:oy + FH, ox:ox + FW], F[0]):
            best = (ox, oy)
            break
    if best:
        break
assert best, 'piece map does not match the staged frame 0'
ox, oy = best
same = all(np.array_equal(full[k, oy:oy + FH, ox:ox + FW], F[k]) for k in range(N))
print('piece map aligned at', best, '| all 8 staged frames equal the converter frames:', same)
T = [top[k, oy:oy + FH, ox:ox + FW] for k in range(N)]
PI = ['body', 'far', 'near', 'tail', 'wisp']

# 4. far wing: slope of its top edge over the 40 columns nearest its tip; tip width
print('far wing (as it shows): frame, top-edge rise to the tip (deg, + = rises), top-3-rows width, left-3-columns height')
for k in range(N):
    ys, xs = np.nonzero(T[k] == PI.index('far'))
    tops = {}
    for x, y in zip(xs.tolist(), ys.tolist()):
        tops[x] = min(tops.get(x, 999), y)
    cx = np.array(sorted(tops)); cy = np.array([tops[x] for x in cx])
    sel = cx < cx.min() + 40
    rise = np.degrees(np.arctan(np.polyfit(cx[sel], cy[sel], 1)[0]))
    r3 = xs[ys < ys.min() + 3]; c3 = ys[xs < xs.min() + 3]
    print(f'  f{k}: rise {rise:6.1f}  top3 width {r3.max() - r3.min() + 1:3d}  left3 height {c3.max() - c3.min() + 1:3d}  tip at x={xs.min()}')

# 5. tail and tuft
print('tail px showing / tuft shown (its last 14 columns as drawn in f0 ... measured per frame on what shows):')
tv = [int((T[k] == PI.index('tail')).sum()) for k in range(N)]
print('  tail px', tv)

# 6. near wing tip travel (its visible px farthest from the shoulder; shoulder from his sheet via griffin-ref.json)
info = json.load(open(os.path.join(A, 'griffin-ref', 'griffin-ref.json')))
s = info['scale']; ax, ay = man['anchor']
sx = ax + (info['shoulder_src'][0] - info['anchor_src'][0]) * s
sy = ay + (info['shoulder_src'][1] - info['anchor_src'][1]) * s
tips = []
for k in range(N):
    ys, xs = np.nonzero(T[k] == PI.index('near'))
    j = int(np.argmax(np.hypot(xs + 0.5 - sx, ys + 0.5 - sy)))
    tips.append((int(xs[j]), int(ys[j])))
trav = [float(np.hypot(tips[(k + 1) % N][0] - tips[k][0], tips[(k + 1) % N][1] - tips[k][1])) for k in range(N)]
print('near wing tip (visible):', tips)
print('  travel k->k+1 px:', [round(v, 1) for v in trav], '| max', round(max(trav), 1))

# 7. head bob: track the head (the crest and beak box) by matching against frame 0
hx0, hy0 = FW - 34, 8
head0 = F[0][hy0:hy0 + 30, hx0:hx0 + 28, 3] > 0
shift = []
for k in range(N):
    best_ = None
    for dy in range(-4, 5):
        m = F[k][hy0 + dy:hy0 + dy + 30, hx0:hx0 + 28, 3] > 0
        sc = (m == head0).mean()
        if best_ is None or sc > best_[0]:
            best_ = (sc, dy)
    shift.append(best_[1])
print('head shift per frame (px, - = up):', shift)
rev = [k for k in range(N) if (shift[k] - shift[k - 1]) * (shift[(k + 1) % N] - shift[k]) < 0]
print('  frames where the head reverses its step at once (twitch):', rev or 'none')

# 8. claws: his pale claw tips at the reviewer's points (old grid +3 in x for the new anchor), ours vs his
his = np.asarray(Image.open(os.path.join(A, 'griffin-ref', 'griffin-his-game.png')).convert('RGB'))
dxo = man['anchor'][0] - info['anchor'][0] + 0  # (his picture is on the converter grid; staged is 1 px in)
hx_off = info['anchor'][0] - man['anchor'][0]; hy_off = info['anchor'][1] - man['anchor'][1]
rims = {(13, 42, 77): 'deep blue', (26, 87, 114): 'mid blue', (18, 37, 88): 'indigo', (70, 58, 39): 'dark gold'}
print('claw tips (reviewer points, shifted +3 px to the new anchor):')
for (x, y) in [(124, 71), (124, 72), (120, 74), (121, 74), (112, 79), (111, 78)]:
    X, Y = x + (man['anchor'][0] - 76), y + (man['anchor'][1] - 59)
    o = tuple(int(v) for v in F[0][Y, X, :3]); h = tuple(int(v) for v in his[Y + hy_off, X + hx_off])
    print(f'  ({X},{Y}) ours {o} {rims.get(o, "")} | his {h}')
blue_claw = 0
for k in range(N):
    f = F[k]
    rgb = f[..., :3].astype(int)
    pale = (f[..., 3] == 255) & ((rgb.max(-1) - rgb.min(-1)) < 45) & ((rgb @ LUMA) > 85)
    # the talon box on the staged grid (his talons)
    box = np.zeros(pale.shape, bool); box[58:92, 100:FW] = True
    blue = np.zeros(pale.shape, bool)
    for c in [(13, 42, 77), (26, 87, 114), (18, 37, 88)]:
        blue |= (rgb == c).all(-1) & (f[..., 3] == 255)
    pale &= box
    nb = np.zeros_like(pale)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            nb |= np.roll(np.roll(pale, dy, 0), dx, 1)
    # (pale claw px whose only griffin neighbours outside are background: tips)
    tip = pale & (sum(np.roll(np.roll(f[..., 3] == 0, dy, 0), dx, 1).astype(int) for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1))) >= 1)
    tnb = np.zeros_like(tip)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            tnb |= np.roll(np.roll(tip, dy, 0), dx, 1)
    blue_claw += int((blue & tnb & box).sum())
print('  blue rim px touching a pale claw tip, all frames:', blue_claw)

# 9. wisps / specks: alpha levels in the sky (semi-transparent px), per frame
print('semi-transparent alpha levels per frame:', [sorted(set(np.unique(f[..., 3]).tolist()) - {0, 255}) for f in F][:3], '...')

# 10. trim end: dirty colours by the background / the tail, and 1 px teeth, in the beat frames
dirty_cols = [(56, 64, 66), (89, 76, 55)]
for k in range(1, N):
    f = F[k]; rgb = f[..., :3].astype(int); op = f[..., 3] == 255
    clear = ~op
    near_bg = np.zeros_like(op)
    for dy in range(-2, 3):
        for dx in range(-2, 3):
            near_bg |= np.roll(np.roll(clear | (T[k] == PI.index('tail')), dy, 0), dx, 1)
    dirty = np.zeros_like(op)
    for c in dirty_cols:
        dirty |= (rgb == c).all(-1) & op
    dn = int((dirty & near_bg & (T[k] == PI.index('near'))).sum())
    nclear = sum(np.roll(np.roll(clear, dy, 0), dx, 1).astype(int) for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)))
    teeth = int((op & (nclear >= 3) & (T[k] == PI.index('near'))).sum())
    print(f'  f{k}: near-wing #384042/#594c37 px within 2 px of background/tail: {dn}; 1 px teeth on the near wing: {teeth}')
