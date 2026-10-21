import sys
sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/approve/_work/10-campamento-noche')
import os
from common import *  # noqa

K = int(sys.argv[1]) if len(sys.argv) > 1 else 2
a = man['anims']['burning']
fps = a['fps']
dur = round(1000 / fps)
BARH = 40 if K == 2 else 30

frames_rgb = []
for f in range(a['frames']):
    sc = up(compose('burning', f), K)
    im = Image.new('RGBA', (sc.width, sc.height + BARH), BG)
    d = ImageDraw.Draw(im)
    d.text((14, BARH // 2), '10 · Campamento de noche — fogata aprobada animada (%d cuadros, %d fps)' % (a['frames'], fps),
           font=font(20 if K == 2 else 15, True), fill=TXT, anchor='lm')
    d.text((im.width - 14, BARH // 2), 'zoom %dx' % K if K > 1 else 'tamaño real', font=font(18 if K == 2 else 14), fill=SUB, anchor='rm')
    im.alpha_composite(sc, (0, BARH))
    frames_rgb.append(im.convert('RGB'))

# One global palette.  The fire's own colours are kept exactly (they are the only thing that moves);
# the static scene + text get the rest, chosen by k-means over the whole first frame.
fire_cols = set()
for f in range(a['frames']):
    fr = np.array(cf_frame('burning', f))
    fire_cols |= set(map(tuple, fr[fr[..., 3] > 0][:, :3].tolist()))
fire_cols = sorted(fire_cols)
all_cols = {}
for im in frames_rgb:
    u, c = np.unique(np.array(im).reshape(-1, 3), axis=0, return_counts=True)
    for col, n in zip(map(tuple, u.tolist()), c):
        all_cols[col] = all_cols.get(col, 0) + int(n)
print('distinct colours in all frames', len(all_cols), 'fire', len(fire_cols))
scene_cols = {}
for im in frames_rgb:
    u, c = np.unique(np.array(im)[BARH:].reshape(-1, 3), axis=0, return_counts=True)
    for col, n in zip(map(tuple, u.tolist()), c):
        scene_cols[col] = scene_cols.get(col, 0) + int(n)
fset = set(fire_cols)
rest = [c for c in scene_cols if c not in fset]
nrest = 256 - len(fire_cols) - 6   # 6 slots for the caption bar (bg, text, grey, line)
X = np.array(rest, float)
w = np.array([scene_cols[c] for c in rest], float) ** 0.3
# farthest-point init (so rare but distinct colours such as the moon and stars keep an entry), then k-means
C = [X[w.argmax()]]
dmin = ((X - C[0]) ** 2).sum(1)
for k in range(1, nrest):
    j = (dmin * w).argmax()
    C.append(X[j]); dmin = np.minimum(dmin, ((X - X[j]) ** 2).sum(1))
C = np.array(C)
for it in range(30):
    lab = ((X[:, None, :] - C[None, :, :]) ** 2).sum(-1).argmin(1)
    for k in range(nrest):
        m = lab == k
        if m.any():
            C[k] = (X[m] * w[m, None]).sum(0) / w[m].sum()
pal_rest = []
for k in range(nrest):
    m = np.nonzero(lab == k)[0]
    if len(m):
        j = m[((X[m] - C[k]) ** 2).sum(1).argmin()]
        pal_rest.append(tuple(int(v) for v in X[j]))
pal_rest += [BG[:3], TXT[:3], SUB[:3], (120, 126, 134), (70, 76, 84), (45, 50, 56)]
pal = list(fire_cols) + pal_rest
pal = pal[:256]
P = np.array(pal, float)
flat = []
for c in pal:
    flat += list(c)
flat += [0] * (768 - len(flat))
palimg = Image.new('P', (1, 1))
palimg.putpalette(flat)

# map every distinct colour to its nearest palette entry (no dithering)
keys = np.array(list(all_cols.keys()), float)
nn = ((keys[:, None, :] - P[None, :, :]) ** 2).sum(-1).argmin(1)
lut = {k: int(i) for k, i in zip(map(tuple, keys.astype(int).tolist()), nn)}
err = np.sqrt(((keys - P[nn]) ** 2).sum(1))
sc_cols = set()
for im in frames_rgb:
    sc_cols |= set(map(tuple, np.unique(np.array(im)[BARH:].reshape(-1, 3), axis=0).tolist()))
sel = np.array([tuple(k) in sc_cols for k in keys.astype(int).tolist()])
print('scene colours', sel.sum(), 'max err in scene', err[sel].max(), 'n>12', (err[sel] > 12).sum())
print('max colour error', err.max(), 'mean', (err * np.array(list(all_cols.values()))).sum() / sum(all_cols.values()))

pframes = []
for im in frames_rgb:
    arr = np.array(im).reshape(-1, 3).astype(np.int64)
    code = arr[:, 0].astype(np.int64) * 65536 + arr[:, 1] * 256 + arr[:, 2]
    uk = np.array([k[0] * 65536 + k[1] * 256 + k[2] for k in lut.keys()])
    uv = np.array(list(lut.values()))
    order = np.argsort(uk)
    pos = np.searchsorted(uk[order], code)
    idx = uv[order][pos].astype(np.uint8).reshape(im.height, im.width)
    p = Image.fromarray(idx, 'P')
    p.putpalette(flat)
    pframes.append(p)

out = OUT + '10-campamento-noche.gif'
tmp = WORK + 'tmp.gif'
pframes[0].save(tmp, save_all=True, append_images=pframes[1:], duration=dur, loop=0, disposal=2, optimize=False)
os.replace(tmp, out)
print(out, os.path.getsize(out) / 1e6, 'MB', pframes[0].size, 'dur', dur)
