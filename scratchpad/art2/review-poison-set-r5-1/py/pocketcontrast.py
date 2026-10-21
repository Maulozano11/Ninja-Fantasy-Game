import sys; sys.path.insert(0, sys.argv[1])
from lib import *
fs=frames('blast','blast')
for i,f in enumerate(fs):
    a=f[...,3].astype(int)
    e=enclosed(a,24); L,n=label(e,4)
    out=[]
    for k in range(1,n+1):
        m=L==k; sz=int(m.sum())
        if sz<8: continue
        # ring 2px
        d=m.copy()
        for _ in range(2):
            p=np.pad(d,1); d=p[1:-1,1:-1]|p[:-2,1:-1]|p[2:,1:-1]|p[1:-1,:-2]|p[1:-1,2:]
        ring=d&~m
        ys,xs=np.nonzero(m)
        comp_in=comp(f,(31,33,46))[m][:,1].mean(); comp_ring=comp(f,(31,33,46))[ring][:,1].mean()
        out.append('%dpx x%d-%d y%d-%d ringA %d, G on panel inside %.0f vs ring %.0f'%(sz,xs.min(),xs.max(),ys.min(),ys.max(),int(np.median(a[ring])),comp_in,comp_ring))
    if out: print('f%d: '%i+' ; '.join(out))
