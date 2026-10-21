import sys, json, subprocess, io
import numpy as np
from PIL import Image
WT, R = sys.argv[1], sys.argv[2]
ST = R + '/stage/ref'

def oklab(a):
    v = a[..., :3] / 255.0
    lin = np.where(v <= 0.04045, v / 12.92, ((v + 0.055) / 1.055) ** 2.4)
    Rr, G, B = lin[..., 0], lin[..., 1], lin[..., 2]
    l = np.cbrt(0.4122214708*Rr+0.5363325363*G+0.0514459929*B)
    m = np.cbrt(0.2119034982*Rr+0.6806995451*G+0.1073969566*B)
    s = np.cbrt(0.0883024619*Rr+0.2817188376*G+0.6299787005*B)
    return np.stack([0.2104542553*l+0.793617785*m-0.0040720468*s, 1.9779984951*l-2.428592205*m+0.4505937099*s, 0.0259040371*l+0.7827717662*m-0.808675766*s], -1)

def area(a, n):
    h, w = a.shape[:2]
    out = np.zeros((n, n, 3))
    sx, sy = w / n, h / n
    for y in range(n):
        y0, y1 = y*sy, (y+1)*sy
        for x in range(n):
            x0, x1 = x*sx, (x+1)*sx
            acc = np.zeros(3); wt = 0
            for yy in range(int(np.floor(y0)), int(np.ceil(y1))):
                cy = min(y1, yy+1) - max(y0, yy)
                for xx in range(int(np.floor(x0)), int(np.ceil(x1))):
                    c = (min(x1, xx+1) - max(x0, xx)) * cy
                    acc += a[min(h-1,yy), min(w-1,xx), :3] * c; wt += c
            out[y, x] = acc / wt
    return out

def load(p):
    return np.asarray(Image.open(p).convert('RGB')).astype(float)

def gitimg(rev, path):
    b = subprocess.run(['git', '-C', WT, 'show', f'{rev}:{path}'], capture_output=True).stdout
    return np.asarray(Image.open(io.BytesIO(b)).convert('RGB')).astype(float)

def blocks(a, b, k):
    A, B = oklab(a), oklab(b)
    n = a.shape[0] // k
    A = A[:n*k, :n*k].reshape(n, k, n, k, 3).mean((1, 3)); B = B[:n*k, :n*k].reshape(n, k, n, k, 3).mean((1, 3))
    d = np.linalg.norm(A - B, axis=-1) * 100
    l = (A[..., 0] - B[..., 0]) * 100
    return d, l

def comps(q):
    # q: HxW int labels of colour; 8-connected components
    h, w = q.shape
    lab = -np.ones((h, w), int); sizes = []
    for y in range(h):
        for x in range(w):
            if lab[y, x] >= 0: continue
            st = [(y, x)]; lab[y, x] = len(sizes); n = 0
            while st:
                cy, cx = st.pop(); n += 1
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        yy, xx = cy+dy, cx+dx
                        if 0 <= yy < h and 0 <= xx < w and lab[yy, xx] < 0 and q[yy, xx] == q[cy, cx]:
                            lab[yy, xx] = len(sizes); st.append((yy, xx))
            sizes.append(n)
    return lab, sizes

def colidx(a):
    k = (a[..., 0].astype(int) << 16) | (a[..., 1].astype(int) << 8) | a[..., 2].astype(int)
    return k

def small_and_bright(a):
    q = colidx(a); L = oklab(a)[..., 0]
    lab, sizes = comps(q)
    h, w = q.shape
    small = sum(1 for s in sizes if s <= 2)
    bright = 0
    for cid, s in enumerate(sizes):
        if s > 2: continue
        ys, xs = np.nonzero(lab == cid)
        ring = []
        for y, x in zip(ys, xs):
            for dy in (-1,0,1):
                for dx in (-1,0,1):
                    yy, xx = y+dy, x+dx
                    if (dy or dx) and 0 <= yy < h and 0 <= xx < w and lab[yy, xx] != cid: ring.append(L[yy, xx])
        if ring and L[ys[0], xs[0]] - np.mean(ring) >= 0.1: bright += 1
    return small, bright

def onpal(a, pal):
    A = oklab(a).reshape(-1, 3); P = oklab(pal.astype(float))
    d = ((A[:, None, 0]-P[None, :, 0])*1.4)**2 + (A[:, None, 1]-P[None, :, 1])**2 + (A[:, None, 2]-P[None, :, 2])**2
    return pal[d.argmin(1)].reshape(a.shape).astype(float)

def ssim(a, b):
    A, B = oklab(a)[..., 0], oklab(b)[..., 0]
    r = int(np.ceil(1.5*2.5)); kk = np.exp(-np.arange(-r, r+1)**2/(2*1.5**2)); kk /= kk.sum()
    def f(v):
        p = np.pad(v, r, mode='edge')
        t = sum(kk[i]*p[:, i:i+v.shape[1]] for i in range(2*r+1))[r:-r]
        return sum(kk[i]*t[i:i+v.shape[0]] for i in range(2*r+1)) if False else sum(kk[i]*np.pad(t,((r,r),(0,0)),mode='edge')[i:i+v.shape[0]] for i in range(2*r+1))
    ma, mb = f(A), f(B)
    va = f(A*A)-ma*ma; vb = f(B*B)-mb*mb; cv = f(A*B)-ma*mb
    C1, C2 = 0.01**2, 0.03**2
    return float((((2*ma*mb+C1)*(2*cv+C2))/((ma*ma+mb*mb+C1)*(va+vb+C2))).mean())

res = {}
ids = ['lightning_hound_raidon', 'crescent_moon_dance', 'temple_of_nirvana']
crops = json.load(open(ST + '/crops.json'))
for jid in ids:
    W = load(f'{ST}/{jid}.png')
    win = load(f'{ST}/{jid}@window.png')
    sheet = load(f'{ST}/{jid}@sheet.png')
    o88 = load(f'{WT}/src/assets/ui_icons/{jid}@2x.png'); o44 = load(f'{WT}/src/assets/ui_icons/{jid}.png')
    r = {'size44': o44.shape[:2], 'size88': o88.shape[:2]}
    # colours only his
    his = set(map(tuple, win.reshape(-1, 3).astype(int)))
    hisSq = set(map(tuple, W.reshape(-1, 3).astype(int)))
    for nm, o in (('44', o44), ('88', o88)):
        cs = set(map(tuple, o.reshape(-1, 3).astype(int)))
        r['notHisWindow' + nm] = ['#%02x%02x%02x' % c for c in cs - his]
        r['notHisSquare' + nm] = ['#%02x%02x%02x' % c for c in cs - hisSq]
        r['ncol' + nm] = len(cs)
    pal = np.array(sorted(set(map(tuple, o88.reshape(-1, 3).astype(int))) | set(map(tuple, o44.reshape(-1, 3).astype(int)))))
    for N, o in ((88, o88), (44, o44)):
        k = N // 11
        for refname, ref in (('native', area(W, N)), ('sheet', area(sheet, N))):
            d, l = blocks(o, ref, k)
            plain = onpal(ref, pal)
            dp, lp = blocks(plain, ref, k)
            r[f'{N}_{refname}'] = dict(blockDiff=round(d.mean(), 2), plainBlockDiff=round(dp.mean(), 2), light=round(l.mean(), 2), plainLight=round(lp.mean(), 2),
                                      lightBelowRow2=round(l[2:].mean(), 2), blocksGe2=int((l >= 2).sum()), maxL=round(l.max(), 2), minL=round(l.min(), 2),
                                      blocksGe2Plain=int((lp >= 2).sum()))
            if refname == 'native':
                s, b = small_and_bright(o); sp, bp = small_and_bright(plain)
                r[f'{N}_spots'] = dict(small=s, bright=b, plainSmall=sp, plainBright=bp)
                hp88 = area(sheet, 88)
                oo = o if N == 88 else np.repeat(np.repeat(o, 2, 0), 2, 1)
                r[f'{N}_ssim'] = round(ssim(oo, hp88), 3)
                if N == 88:
                    r['88_lightblocks'] = np.round(l, 1).tolist()
    res[jid] = r
json.dump(res, open(R + '/measure.json', 'w'), indent=1)
for jid, r in res.items():
    print(jid)
    for k, v in r.items():
        if k != '88_lightblocks': print('  ', k, v)
