import sys, numpy as np
from collections import deque
fly=np.load(sys.argv[1]).astype(np.int32)
def comps(m):
    H,W=m.shape; seen=np.zeros_like(m); out=[]
    for y,x in zip(*np.nonzero(m)):
        if seen[y,x]: continue
        q=deque([(y,x)]); seen[y,x]=True; pts=[]
        while q:
            cy,cx=q.popleft(); pts.append((cy,cx))
            for dy in (-1,0,1):
                for dx in (-1,0,1):
                    ny,nx=cy+dy,cx+dx
                    if 0<=ny<H and 0<=nx<W and m[ny,nx] and not seen[ny,nx]:
                        seen[ny,nx]=True; q.append((ny,nx))
        out.append(np.array(pts))
    return out
v=[];cen=[]
for f in fly:
    r,g,b,a=f[...,0],f[...,1],f[...,2],f[...,3]
    pur=(r>g+10)&(b>g+10)&(a>0)
    best=None
    for p in comps(pur):
        cy,cx=p[:,0].mean(),p[:,1].mean()
        if 60<cx<140 and cy<70:
            s=float((a[p[:,0],p[:,1]]/255.0).sum())
            if best is None or s>best[0]: best=(s,(int(cx),int(cy)))
    v.append(round(best[0],1)); cen.append(best[1])
print(v); print(cen)
pk=max(v); print('steps % of peak',[round((v[(i+1)%8]-v[i])/pk*100,1) for i in range(8)])
