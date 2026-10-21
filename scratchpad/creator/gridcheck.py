import numpy as np, sys
from PIL import Image
a = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(float)
L = a.mean(2)
def spec(g, lo=1.8, hi=12):
    g = g - g.mean(); n = 1 << 15
    f = np.abs(np.fft.rfft(g, n=n)); fr = np.fft.rfftfreq(n)
    m = (fr > 1/hi) & (fr < 1/lo)
    return 1/fr[np.argmax(np.where(m, f, 0))]
def phase(g, p):
    best=None
    for t in range(int(p*40)):
        ph=t/40; idx=np.floor(ph+np.arange(1,int(len(g)/p))*p).astype(int)-1; idx=idx[(idx>=0)&(idx<len(g))]
        e=g[idx].mean()
        if best is None or e>best[0]: best=(e,ph)
    return best
# per-region pitch/phase in x (scene area y 40..900) and y (x 0..1050)
for (x0,x1) in [(0,500),(500,1050),(1100,1500),(1500,2000),(0,2000)]:
    gx = np.abs(np.diff(L[40:900, x0:x1], axis=1)).mean(0)
    p = spec(gx); e,ph = phase(gx, 4.3699)
    print('x', x0, x1, 'pitch %.4f' % p, 'phase@4.3699 (abs) %.3f' % ((x0+ph) % 4.3699), 'ratio %.2f' % (e/gx.mean()))
for (y0,y1) in [(30,350),(350,700),(700,1040),(30,1040)]:
    gy = np.abs(np.diff(L[y0:y1, 0:1050], axis=0)).mean(1)
    p = spec(gy); e,ph = phase(gy, 4.4197)
    print('y', y0, y1, 'pitch %.4f' % p, 'phase@4.4197 (abs) %.3f' % ((y0+ph) % 4.4197), 'ratio %.2f' % (e/gy.mean()))
