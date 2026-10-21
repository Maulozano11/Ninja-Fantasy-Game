import sys
from PIL import Image; import numpy as np
exec(open('cmp.py').read().split('stats={}')[0])
for name in sys.argv[1:]:
    anim,fi,(hx,hy),s=CFG[name]; m=M[name]; W,H=m['frameW'],m['frameH']; ax,ay=m['anchor']
    h=np.asarray(his(name,W,H,ax,ay,hx,hy,s),float); o=np.asarray(on(frame(name,anim,fi),BG),float)
    def g(a): return (a[...,1]>a[...,0]+3)&(a[...,1]>a[...,2]+15)
    # union mask so same pixels compared
    mk=g(h)|g(o)
    for nm,a in (('his',h),('ours',o)):
        c=a[mk]; sat=(c.max(1)-c.min(1))/np.maximum(c.max(1),1)
        print(name,nm,'G p50/p90/p99',np.percentile(c[:,1],[50,90,99]).round(0),'sat mean %.2f'%sat.mean(),'mean',c.mean(0).round(0))
