import sys; sys.path.insert(0, sys.path[0])
from fr import frames
import numpy as np
for g in sys.argv[1:]:
    fs,_=frames('aura_back','idle',g)
    for nm,(x0,x1) in (('left',(9,38)),('right',(71,104))):
        ys=[]
        f0=fs[0][:, x0:x1].astype(int)
        m0=(f0[...,3]==255)
        for f in fs:
            c=f[:, x0:x1].astype(int)
            best=None
            for dy in range(-5,6):
                sh=np.roll(c,-dy,0)  # sh[y]=c[y+dy]
                mm=m0&(sh[...,3]==255)
                d=int((np.abs(sh-f0).sum(-1)[m0]==0).sum())
                if best is None or d>best[0]: best=(d,dy)
            ys.append(best[1])
        steps=[ys[(i+1)%len(ys)]-ys[i] for i in range(len(ys))]
        print(g.split('/')[0], nm, 'offset per frame', ys, 'steps', steps)
