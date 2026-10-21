import sys; sys.path.insert(0, sys.argv[1])
from lib import *
# see-through dips: pixel alpha at least D below the median alpha of its 5x5 ring, where the ring median >= 100
name=sys.argv[2]; anim=None if sys.argv[3]=='-' else sys.argv[3]; D=int(sys.argv[4]) if len(sys.argv)>4 else 60
fr=frames(name,anim)
def ringmed(a,r=2):
    H,W=a.shape; P=np.pad(a,r,mode='edge'); vals=[]
    for dy in range(-r,r+1):
        for dx in range(-r,r+1):
            if max(abs(dx),abs(dy))==r: vals.append(P[r+dy:r+dy+H, r+dx:r+dx+W])
    return np.median(np.stack(vals),0), np.min(np.stack(vals),0)
for i,f in enumerate(fr):
    a=f[...,3].astype(float)
    med,mn=ringmed(a)
    m=(med>=100)&(a<=med-D)
    m2=(mn>=100)&(a<=mn-D)   # below every ring pixel: fully enclosed dip
    ys,xs=np.nonzero(m2)
    print(f'{name} {i}: dips(median) {m.sum():4d}  enclosed dips(min ring) {m2.sum():3d}', list(zip(xs.tolist(),ys.tolist()))[:12])
