import sys; sys.path.insert(0, sys.argv[1])
from lib import *
from collections import deque
name=sys.argv[2]; anim=None if sys.argv[3]=='-' else sys.argv[3]
fr=frames(name,anim)
def slv(f):
    o=f[...,3]==255
    H,W=o.shape
    blk=o[:-1,:-1]&o[1:,:-1]&o[:-1,1:]&o[1:,1:]
    inb=np.zeros_like(o)
    inb[:-1,:-1]|=blk; inb[1:,:-1]|=blk; inb[:-1,1:]|=blk; inb[1:,1:]|=blk
    thin=o&~inb
    # components of thin pixels (8-conn)
    lab=np.zeros((H,W),int); out=[]; n=0
    for y in range(H):
        for x in range(W):
            if thin[y,x] and not lab[y,x]:
                n+=1; dq=deque([(y,x)]); lab[y,x]=n; pts=[]
                while dq:
                    cy,cx=dq.popleft(); pts.append((cy,cx))
                    for dy in (-1,0,1):
                        for dx in (-1,0,1):
                            ny,nx=cy+dy,cx+dx
                            if 0<=ny<H and 0<=nx<W and thin[ny,nx] and not lab[ny,nx]: lab[ny,nx]=n; dq.append((ny,nx))
                if len(pts)>=3:
                    # isolated: not touching any 2x2 block pixel (8-neigh)
                    iso=all(not inb[max(0,py-1):py+2,max(0,px-1):px+2].any() for py,px in pts)
                    out.append((len(pts),min(p[1] for p in pts),min(p[0] for p in pts),iso))
    return out
for i,f in enumerate(fr):
    s=slv(f)
    iso=[c for c in s if c[3]]
    print(f'{name} {i}: thin comps>=3: {len(s)}, isolated (floating) thin comps: {len(iso)}', [c[:3] for c in sorted(iso,reverse=True)[:6]])
