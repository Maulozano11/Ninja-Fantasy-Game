"""Independent check of the r1 review findings on the staged griffin sheet."""
import sys, json, colorsys
import numpy as np
from PIL import Image
ART = sys.argv[1]
stage = ART + '/staging/vfx_beasts_griffin/'
man = json.load(open(stage + 'manifest.json'))['sprites']['chakra']
FW, FH = man['frameW'], man['frameH']; AX, AY = man['anchor']; NF = man['anims']['fly']['frames']
sh = np.array(Image.open(stage + man['file']).convert('RGBA')).astype(float)
F = [sh[:FH, i*FW:(i+1)*FW] for i in range(NF)]
info = json.load(open(ART + '/griffin-ref/griffin-ref.json'))
his = np.array(Image.open(ART + '/griffin-ref/griffin-his-game.png').convert('RGB')).astype(float)
dx, dy = AX - info['anchor'][0], AY - info['anchor'][1]
H = np.zeros((FH, FW, 3)) + np.array(info['bg'])
# paste his onto our grid
for y in range(FH):
    for x in range(FW):
        u, v = x - dx, y - dy
        if 0 <= u < his.shape[1] and 0 <= v < his.shape[0]: H[y, x] = his[v, u]
L = np.array([0.3, 0.55, 0.15])
print('frame', FW, FH, 'anchor', AX, AY, 'frames', NF, 'fps', man['anims']['fly']['fps'], 'row px', FW*NF)
# border
bad = [i for i, f in enumerate(F) if (f[0, :, 3].any() or f[-1, :, 3].any() or f[:, 0, 3].any() or f[:, -1, 3].any())]
print('border: frames with alpha on an edge:', bad)
# light
light = [float((f[..., 3]/255 * (f[..., :3] @ L)/255).mean()) for f in F]
luma = [float(((f[..., :3] @ L)/255)[f[..., 3] > 0].mean()) for f in F]
print('light', [round(v, 3) for v in light]); print('steps', [round(light[(i+1) % NF]/light[i], 3) for i in range(NF)])
print('max step / peak', round(max(abs(light[(i+1) % NF]-light[i]) for i in range(NF))/max(light), 3))
print('mean luma', [round(v, 3) for v in luma])
# 1. flat top runs (top silhouette of opaque px), left/wing half x<95
def top_runs(f, x0=0, x1=95):
    a = f[..., 3] >= 255
    tops = [int(np.argmax(a[:, x])) if a[:, x].any() else -1 for x in range(x0, x1)]
    best, cur = (0, None), 1
    for i in range(1, len(tops)):
        if tops[i] == tops[i-1] and tops[i] >= 0: cur += 1
        else: cur = 1
        if cur > best[0]: best = (cur, (x0+i-cur+1, tops[i]))
    return best
print('1. longest flat top-silhouette run (x<95) per frame:', [top_runs(f) for f in F])
# also flat runs of the outer silhouette in any direction over the whole frame (horizontal/vertical edges)
def edge_runs(f):
    a = f[..., 3] >= 255
    out = 0
    for m in (a, a.T):
        e = m[1:] & ~m[:-1]  # top edges
        e2 = m[:-1] & ~m[1:]
        for E in (e, e2):
            for r in E:
                run = 0
                for v in r:
                    run = run + 1 if v else 0; out = max(out, run)
    return out
print('   longest straight silhouette edge anywhere:', [edge_runs(f) for f in F])
# 2. sky region of the r1 review (x 3-28, y 17-42 in its 128x95 grid, anchor 77,61)
ox, oy = AX - 77, AY - 61
sky = (slice(17+oy, 43+oy), slice(3+ox, 29+ox))
sl = [float((f[sky][..., 3]/255 * (f[sky][..., :3] @ L)/255).sum()) for f in F]
print('2. light in r1 sky box', [round(v, 2) for v in sl], 'steps', [round(sl[(i+1) % NF]/max(sl[i], 1e-6), 2) for i in range(NF)])
soft = [float(((f[..., 3] < 255) * f[..., 3]/255 * (f[..., :3] @ L)/255).sum()) for f in F]
print('   light of semi-transparent px', [round(v, 1) for v in soft], 'steps', [round(soft[(i+1) % NF]/soft[i], 2) for i in range(NF)])
# per-pixel alpha change of semi-transparent px in the sky (max)
mx = [float(np.abs(F[(i+1) % NF][sky][..., 3] - F[i][sky][..., 3]).max()) for i in range(NF)]
print('   sky-box max per-px alpha change', mx)
def label(m):
    lab = np.zeros(m.shape, int); n = 0
    for y0, x0 in zip(*np.nonzero(m)):
        if lab[y0, x0]: continue
        n += 1; st = [(y0, x0)]; lab[y0, x0] = n
        while st:
            y, x = st.pop()
            for yy in range(y-1, y+2):
                for xx in range(x-1, x+2):
                    if 0 <= yy < m.shape[0] and 0 <= xx < m.shape[1] and m[yy, xx] and not lab[yy, xx]:
                        lab[yy, xx] = n; st.append((yy, xx))
    return lab, n
def free(f):
    lab, n = label(f[..., 3] > 0)
    sizes = np.bincount(lab.ravel())[1:]
    big = 1 + int(np.argmax(sizes))
    return (lab > 0) & (lab != big)
fl = []
for f in F:
    m = free(f)[sky]
    fl.append(float((m * f[sky][..., 3]/255 * (f[sky][..., :3] @ L)/255).sum()))
print('   free bits (not touching the griffin) light in r1 sky box', [round(v, 2) for v in fl])
fa = [float((free(f) * f[..., 3]/255 * (f[..., :3] @ L)/255).sum()) for f in F]
print('   free bits light whole frame', [round(v, 1) for v in fa], 'steps', [round(fa[(i+1) % NF]/fa[i], 2) for i in range(NF)])
# 3. mouth-ish dark red/brown px outside the beak
def hsv(c):
    return colorsys.rgb_to_hsv(*(np.array(c)/255))
bx0, bx1 = int((224-191)*info['scale']+AX)-1, min(FW-1, int((242-191)*info['scale']+AX)+2)
by0, by1 = int((78-100)*info['scale']+AY)-3, int((96-100)*info['scale']+AY)+2
cols = {}
for i, f in enumerate(F):
    ys, xs = np.nonzero(f[..., 3] > 0)
    for y, x in zip(ys, xs):
        c = tuple(int(v) for v in f[y, x, :3])
        h, s, v = hsv(c)
        reddish = (h < 0.07 or h > 0.93) and s > 0.2 and v < 0.6
        brownblack = (sum(c) < 60) and c[0] >= c[2]
        if (reddish or brownblack) and not (bx0 <= x <= bx1 and by0 <= y <= by1):
            cols.setdefault(c, []).append((i, x, y))
print('3. dark red/brown/black px outside the beak box', (bx0, by0, bx1, by1), ':', {k: len(v) for k, v in cols.items()}, list(cols.items())[:2])
allc = set()
for f in F:
    for c in f[f[..., 3] > 0][:, :4]: allc.add(tuple(int(v) for v in c))
dark = sorted([c for c in allc if c[3] == 255 and c[0]*.3+c[1]*.55+c[2]*.15 < 25])
print('   palette entries with luma < 25:', dark, ' total RGBA colours', len(allc))
# 4. mouth colours: ours inside the beak vs his
def reds(img, alpha=None):
    out = []
    for y in range(by0, by1+1):
        for x in range(bx0, bx1+1):
            c = img[y, x, :3]
            if alpha is not None and alpha[y, x] < 255: continue
            h, s, v = hsv(c)
            if (h < 0.06 or h > 0.9) and s > 0.12 and v < 0.65: out.append(c)
    return np.array(out)
ro, rh = reds(F[0], F[0][..., 3]), reds(H)
print('4. mouth px ours', len(ro), 'mean', ro.mean(0).round() if len(ro) else None, 'unique', sorted(set(tuple(int(v) for v in c) for c in ro)))
print('   mouth px his ', len(rh), 'mean', rh.mean(0).round(), 'dark half', rh[rh @ L < 60].mean(0).round() if (rh @ L < 60).any() else None, 'light half', rh[rh @ L >= 60].mean(0).round())
# 5. silhouette vs his
hm = np.abs(H - np.array(info['bg'])).sum(-1) > 40
om = F[0][..., 3] >= 128
print('5. f0: ours outside his', int((om & ~hm).sum()), ' his outside ours', int((hm & ~om).sum()), ' IoU', round((om & hm).sum()/(om | hm).sum(), 3))
oo = F[0][..., 3] == 255
print('   opaque-only ours outside his', int((oo & ~hm).sum()))
both = om & hm
print('   mean RGB on shared px ours', F[0][..., :3][both].mean(0).round(1), 'his', H[both].mean(0).round(1))
# 6. streak alpha levels (lower-left: x<55, y>60)
reg = F[0][60:, :55]
al = sorted(set(int(a) for a in reg[..., 3].ravel() if 0 < a < 255))
print('6. streak region alpha levels (semi-transparent):', al)
# 7. underside hue: his indigo px (hue 215-265, v<0.5, s>0.4) in the lower body
def hue(c): return colorsys.rgb_to_hsv(*(c/255))[0]*360
idx = [(y, x) for y in range(AY, FH) for x in range(FW) if F[0][y, x, 3] == 255 and 215 <= hue(H[y, x]) <= 265 and colorsys.rgb_to_hsv(*(H[y, x]/255))[2] < 0.5 and colorsys.rgb_to_hsv(*(H[y, x]/255))[1] > 0.4]
hp = np.array([H[y, x] for y, x in idx]); op = np.array([F[0][y, x, :3] for y, x in idx])
print('7. underside px', len(idx), 'his mean', hp.mean(0).round(), 'hue', round(np.mean([hue(c) for c in hp]), 1), ' ours mean', op.mean(0).round(), 'hue', round(np.mean([hue(c) for c in op]), 1))
# 7b. breakdown of the underside: outline px vs inner px
O = np.array(info['outline'])
isO = np.array([np.all(F[0][y, x, :3] == O) for y, x in idx])
print('   underside: outline px', int(isO.sum()), 'inner px', int((~isO).sum()))
print('   inner only: his', hp[~isO].mean(0).round(), round(np.mean([hue(c) for c in hp[~isO]]), 1), ' ours', op[~isO].mean(0).round(), round(np.mean([hue(c) for c in op[~isO]]), 1))
print('   outline only: his', hp[isO].mean(0).round(), round(np.mean([hue(c) for c in hp[isO]]), 1))
from collections import Counter
print('   our colours there', Counter(tuple(int(v) for v in c) for c in op).most_common(12))
