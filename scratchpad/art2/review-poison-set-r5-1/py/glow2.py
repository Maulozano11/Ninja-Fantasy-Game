import sys; sys.path.insert(0, sys.argv[1])
from lib import *
fs=frames('blast','blast')
LC=np.array([108,233,87])
for i,f in enumerate(fs):
    a=f[...,3].astype(int); r,g,b=[f[...,k].astype(int) for k in range(3)]
    light=(np.abs(f[...,:3].astype(int)-LC).sum(2)==0)
    glow=(a>=16)&(a<100)&(g>r+60)&(g>b+60)&~light
    op=a>=128
    # dilate opaque by 3
    d=op.copy()
    for _ in range(3):
        p=np.pad(d,1); d=p[1:-1,1:-1]|p[:-2,1:-1]|p[2:,1:-1]|p[1:-1,:-2]|p[1:-1,2:]|p[:-2,:-2]|p[2:,2:]|p[:-2,2:]|p[2:,:-2]
    det=glow&~d
    det[:, :60]=False; det[:,145:]=False
    ys,xs=np.nonzero(det)
    print(i,'pillar-area glow px with no solid art within 3px:',len(ys), ('x%d-%d y%d-%d, mean alpha %d'%(xs.min(),xs.max(),ys.min(),ys.max(),a[det].mean())) if len(ys) else '')
