import sys; sys.path.insert(0, sys.path[0])
from fr import frames
import numpy as np
nm, anim = sys.argv[1], sys.argv[2]
for g in sys.argv[3:]:
    fs,_=frames(nm,anim,g)
    out=[]
    for f in fs:
        a=f[...,3].astype(int)
        c=a[1:-1,1:-1]; nb=[a[:-2,1:-1],a[2:,1:-1],a[1:-1,:-2],a[1:-1,2:]]
        m=np.minimum.reduce(nb)
        dip=(m>0)&(c<m)
        out.append(int(dip.sum()))
    print(g.split('/')[0], 'single-px alpha dips per frame:', out)
