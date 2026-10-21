import sys, os, glob
import numpy as np
RAMP = np.array([[12,21,114],[20,36,156],[32,54,186],[46,74,208],[70,102,228],[108,140,245],[158,190,254],[212,238,254],[240,254,255]], float)
d = sys.argv[1]
ADD = float(sys.argv[2]) if len(sys.argv) > 2 else 0.0
GRASS = np.array([72,134,71], float)
rows = []
for f in sorted(glob.glob(f'{d}/p*.raw')):
    n = os.path.basename(f)[1:-4]
    if '_idle_' not in n and '_run_2' not in n: continue
    p = np.frombuffer(open(f,'rb').read(), np.uint8).reshape(256,256,4).astype(float)
    s = np.frombuffer(open(f'{d}/s{n}.raw','rb').read(), np.uint8).reshape(256,256,4)
    fig = s[...,3] > 0
    c = p[...,:3]; a = p[...,3:4]/255
    blk = c*a + c*a*ADD
    px = np.clip(blk[fig],0,255)
    dd = ((px[:,None,:]-RAMP[None])**2).sum(-1); st = dd.argmin(1)
    h = np.bincount(st, minlength=9)/len(st)*100
    l6 = (np.abs(p[fig][:, :3] - RAMP[6]).sum(1) < 1).mean()*100
    gr = GRASS*(1-a) + c*a + c*a*ADD
    gp = np.clip(gr[fig],0,255)
    blue = (gp[:,2] > gp[:,1] + 10).mean()*100
    rows.append((n, h[5:].sum(), h[3:5].sum(), h[:3].sum(), l6, *px.mean(0), a[fig].mean()*255, blue))
    print(f'{n:10s} pale {h[5:].sum():5.1f} main {h[3:5].sum():5.1f} dark {h[:3].sum():5.1f} step6col {l6:5.1f} mean {px.mean(0).round(0)} alpha {a[fig].mean()*255:5.1f} blueOverGrass {blue:5.1f}  hist {h.round(0)}')
r = np.array([x[1:] for x in rows])
print('AVG pale %.1f main %.1f dark %.1f step6 %.1f mean (%.0f,%.0f,%.0f) alpha %.0f blueOverGrass %.1f' % tuple(r.mean(0)))
