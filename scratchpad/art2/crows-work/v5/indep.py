# Independent checks on the staged crow swarm (reviewer-style metrics).
import sys, numpy as np
from PIL import Image
S2 = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/'
man = __import__('json').load(open(S2 + 'staging/vfx_beasts_crows/manifest.json'))['sprites']['genjutsu']
W, H = man['frameW'], man['frameH']; AX, AY = man['anchor']
sh = np.array(Image.open(S2 + 'staging/vfx_beasts_crows/genjutsu.png').convert('RGBA'))
fr = {a: [sh[v['row']*H:(v['row']+1)*H, i*W:(i+1)*W] for i in range(v['frames'])] for a, v in man['anims'].items()}
ref = Image.open(S2 + 'REF-genjutsu-set-owner.jpg').convert('RGB')
s = 96 / 124.0
ANC = {'L': (384.7, 905.5), 'R': (665.2, 902.6)}
PIC = {'L': (262, 798, 522, 1009), 'R': (522, 798, 785, 1009)}

class _ndi:
    @staticmethod
    def label(m, structure=None):
        from collections import deque
        h, w = m.shape
        lab = np.zeros((h, w), int); n = 0
        nbr = [(-1,0),(1,0),(0,-1),(0,1)] if structure is None else [(dy,dx) for dy in (-1,0,1) for dx in (-1,0,1) if dy or dx]
        for y in range(h):
            for x in range(w):
                if m[y, x] and not lab[y, x]:
                    n += 1; lab[y, x] = n; q = deque([(y, x)])
                    while q:
                        cy, cx = q.popleft()
                        for dy, dx in nbr:
                            yy, xx = cy+dy, cx+dx
                            if 0 <= yy < h and 0 <= xx < w and m[yy, xx] and not lab[yy, xx]:
                                lab[yy, xx] = n; q.append((yy, xx))
        return lab, n
    @staticmethod
    def sum(ones, lab, idx):
        c = np.bincount(lab.ravel()); return [c[i] for i in idx]
    @staticmethod
    def binary_dilation(m, iterations=1):
        m = m.copy()
        for _ in range(iterations):
            o = m.copy(); o[1:] |= m[:-1]; o[:-1] |= m[1:]; o[:, 1:] |= m[:, :-1]; o[:, :-1] |= m[:, 1:]; m = o
        return m
    @staticmethod
    def distance_transform_edt(notair):
        # chebyshev-ish via 8-dilation steps up to 4: returns 0 on air, k = steps
        air = ~notair; d = np.full(air.shape, 99); d[air] = 0; cur = air.copy()
        for k in range(1, 6):
            o = cur.copy(); o[1:] |= cur[:-1]; o[:-1] |= cur[1:]; o[:, 1:] |= cur[:, :-1]; o[:, :-1] |= cur[:, 1:]
            d[o & ~cur] = k; cur = o
        return d
ndi = _ndi
L601 = np.array([0.299, 0.587, 0.114])
def his_box(k, crop_pic=True):
    ax, ay = ANC[k]
    box = (ax - AX / s, ay - AY / s, ax + (W - AX) / s, ay + (H - AY) / s)
    src = ref
    if crop_pic:
        a = np.array(ref).copy(); x0, y0, x1, y1 = PIC[k]
        m = np.zeros(a.shape[:2], bool); m[y0:y1, x0:x1] = True
        a[~m] = (31, 31, 41); src = Image.fromarray(a)
    return np.array(src.resize((W, H), Image.BOX, box=box)).astype(float)
# 1. soft-inside
for a, L in fr.items():
    out = []
    for f in L:
        al = f[..., 3]
        empty = al == 0
        lab, n = ndi.label(empty)
        edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
        air = np.isin(lab, list(edge))
        d = ndi.distance_transform_edt(~air)
        soft = (al > 0) & (al < 255)
        out.append(int((soft & (d > 2)).sum()))
        # border
    bord = [int((f[0, :, 3] > 0).sum() + (f[-1, :, 3] > 0).sum() + (f[:, 0, 3] > 0).sum() + (f[:, -1, 3] > 0).sum()) for f in L]
    holes = []
    for f in L:
        empty = f[..., 3] == 0
        lab, n = ndi.label(empty)
        edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
        holes.append(int((empty & ~np.isin(lab, list(edge))).sum()))
    print(a, 'soft-inside(>2px)', out, 'border px', bord, 'enclosed holes', holes)
# 2. highlights vs plain box of his JPEG
def eyeish(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    return (r > g + 30) & (r > b - 5)
for k, i in (('L', 0), ('R', 4)):
    for crop in (True, False):
        hb = his_box(k, crop)
        f = fr['fly'][i].astype(float)
        lh = hb @ L601; lo = f[..., :3] @ L601
        eh = ndi.binary_dilation(eyeish(hb), iterations=2); eo = ndi.binary_dilation(eyeish(f[..., :3]) & (f[..., 3] > 0), iterations=2)
        on = f[..., 3] > 0
        res = {t: (int(((lh > t) & ~eh).sum()), int(((lo > t) & on & ~eo).sum())) for t in (90, 100, 110)}
        res['max'] = (round(lh[~eh].max(), 1), round(lo[on & ~eo].max(), 1))
        print('highlights', k, 'crop-to-pic' if crop else 'whole sheet', '(his, ours)', res)
# 3. vortex violet per frame
def vio(f):
    r, g, b, a = [f[..., j].astype(int) for j in range(4)]
    on = a > 0
    return int((on & (b - g > 45)).sum()), int((on & (b - g > 70)).sum())
print('fly violet (b-g>45, b-g>70):', [vio(f) for f in fr['fly']])
print('summon violet:', [vio(f) for f in fr['summon']])
# 4. opaque px, mean luma, light
for a, L in fr.items():
    op = [int((f[..., 3] > 0).sum()) for f in L]
    light = [round(float(((f[..., :3] @ L601) * f[..., 3] / 255).sum()) / 1000, 1) for f in L]
    print(a, 'opaque', op, 'light k', light, 'steps', [round(op[(j + 1) % len(op)] / op[j], 2) for j in range(len(op))])
    # silhouette xor/union between consecutive frames
    xu = []
    for j in range(len(L) - (0 if a == 'fly' else 1)):
        A = L[j][..., 3] > 0; B = L[(j + 1) % len(L)][..., 3] > 0
        xu.append(round((A ^ B).sum() / (A | B).sum(), 2))
    print(a, 'xor/union', xu)
# 5. detached components (opaque, 8-conn)
for a, L in fr.items():
    res = []
    for f in L:
        lab, n = ndi.label(f[..., 3] > 0, structure=np.ones((3, 3)))
        sz = ndi.sum(np.ones_like(lab), lab, range(1, n + 1))
        res.append(sorted(int(x) for x in sz if x < 40))
    print(a, 'small loose comps (<40px):', res)
# 6. eye colours: most saturated reds
f = fr['fly'][0].astype(int)
r, g, b = f[..., 0], f[..., 1], f[..., 2]
m = (r - g > 40) & (f[..., 3] > 0)
print('eye-ish px fly0', int(m.sum()), 'colours', sorted(set(map(tuple, f[m][:, :3].tolist())))[:12])
