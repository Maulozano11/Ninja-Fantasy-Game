import sys; sys.path.insert(0, sys.argv[1])
from lib import *
fs=frames('blast','blast')
def green(f):
    r,g,b,a=[f[...,i].astype(int) for i in range(4)]
    return (a>=200)&(g>r+20)&(g>b+20)
for i,f in enumerate(fs):
    gm=green(f)
    # pillar columns x 85..150
    sub=gm[:, 80:160]
    cols=sub.any(0)
    rows=np.nonzero(sub[:, 20:60].sum(1)>=20)[0]  # rows where at least 20 px of pillar green in central band
    top=rows.min() if len(rows) else None
    widths=[]
    for y in (40,60,80):
        xs=np.nonzero(gm[y,60:180])[0]
        widths.append((xs.min()+60, xs.max()+60) if len(xs) else None)
    print(i,'pillar top (row with >=20 green px in x100-140):',top,' extents at y40/60/80:',widths)
