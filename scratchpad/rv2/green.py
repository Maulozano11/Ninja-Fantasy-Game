import sys
from PIL import Image; import numpy as np
exec(open('cmp.py').read().split('stats={}')[0])
name=sys.argv[1]
anim,fi,(hx,hy),s=CFG[name]; m=M[name]; W,H=m['frameW'],m['frameH']; ax,ay=m['anchor']
if len(sys.argv)>2: fi=int(sys.argv[2])
h=np.asarray(his(name,W,H,ax,ay,hx,hy,s),float); o=np.asarray(on(frame(name,anim,fi),BG),float)
def g(a):
    return (a[...,1]>a[...,0]+3)&(a[...,1]>a[...,2]+15)
for nm,a in (('his',h),('ours',o)):
    mk=g(a); c=a[mk]
    print(nm,'green px',mk.sum(),'mean',c.mean(0).round(0) if len(c) else None,'std',c.std(0).round(0) if len(c) else None,
          'max G',c[:,1].max() if len(c) else None, 'unique',len(np.unique(c.astype(int),axis=0)) if len(c) else 0)
    ys,xs=np.nonzero(mk)
    if len(ys): print('   bbox',xs.min(),ys.min(),xs.max(),ys.max())
