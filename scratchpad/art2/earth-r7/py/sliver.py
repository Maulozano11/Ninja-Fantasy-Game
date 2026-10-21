import sys; sys.path.insert(0, sys.path[0])
from fr import frames
from lab import label
import numpy as np
nm, anim = sys.argv[1], sys.argv[2]
x0,x1,y0,y1 = [int(v) for v in sys.argv[3].split(',')]
for g in sys.argv[4:]:
    fs,_=frames(nm,anim,g)
    out=[]
    for f in fs:
        c=f[y0:y1,x0:x1]
        L=0.3*c[...,0]+0.59*c[...,1]+0.11*c[...,2]
        dark=(L<75)&(c[...,3]==255)
        lab,s=label(dark)
        small=sum(1 for v in s if v<=4)
        out.append(f'{int(dark.sum())}/{small}')
    print(g, 'dark px / small dark comps (<=4px):', ' '.join(out))
