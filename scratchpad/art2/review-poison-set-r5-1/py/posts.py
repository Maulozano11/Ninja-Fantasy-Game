import sys; sys.path.insert(0, sys.argv[1])
from lib import *
for name,cols in [('wall',[(5,40),(255,290)]),('wall_diag',[(5,60),(190,240)])]:
    fs=frames(name,'rise')
    for (x0,x1) in cols:
        tops=[]
        for f in fs:
            r,g,b,a=[f[...,k].astype(int) for k in range(4)]
            grey=(a>=200)&(np.abs(r-g)<25)&(np.abs(g-b)<25)
            ys=np.nonzero(grey[:,x0:x1].sum(1)>=4)[0]
            tops.append(int(ys.min()) if len(ys) else None)
        steps=[(tops[i]-tops[i+1]) if tops[i] is not None and tops[i+1] is not None else None for i in range(len(tops)-1)]
        print(name,'post x%d-%d top row per frame'%(x0,x1),tops,'rise per step',steps)
