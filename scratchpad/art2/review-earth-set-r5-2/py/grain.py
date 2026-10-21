import sys; sys.path.insert(0,'.')
from load import *
from grid import compf
def med3(x):
    H,W=x.shape; p=np.pad(x,1,mode='edge')
    st=np.stack([p[dy:dy+H,dx:dx+W] for dy in range(3) for dx in range(3)],0)
    return np.median(st,0)
name,anim=sys.argv[1],sys.argv[2]
fr=frames(name,anim)
prev=None
for i,f in enumerate(fr):
    c=compf(f.astype(float),'dark').astype(float)
    lum=c.mean(2)
    med=med3(lum)
    a=f[:,:,3]
    m=(a>0)
    d=np.abs(lum-med)
    iso=(d>12)&m
    print(i,'px',int(m.sum()),'mean|lum-med3|',round(float(d[m].mean()),2),'outliers>12',int(iso.sum()), 'alpha levels', len(np.unique(a[m])))
