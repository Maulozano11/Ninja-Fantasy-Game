import sys; sys.path.insert(0, sys.path[0])
from fr import frames
from lab import label
import numpy as np
nm, anim, frs = sys.argv[1], sys.argv[2], [int(v) for v in sys.argv[3].split(',')]
for g in sys.argv[4:]:
    fs,_=frames(nm,anim,g)
    for i in frs:
        f=fs[i]
        L=0.3*f[...,0]+0.59*f[...,1]+0.11*f[...,2]
        solid=(f[...,3]==255)&(L>40)
        lab,s=label(solid)
        out=[]
        for k,n in enumerate(s):
            if n<6: continue
            ys,xs=np.nonzero(lab==k)
            w=xs.max()-xs.min()+1; h=ys.max()-ys.min()+1
            out.append(f'{n}px {w}x{h}@{xs.min()},{ys.min()}')
        print(g.split('/')[0], 'frame', i, 'solid comps:', ', '.join(out))
