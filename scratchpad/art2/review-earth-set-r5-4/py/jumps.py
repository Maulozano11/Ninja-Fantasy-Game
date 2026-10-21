import sys; sys.path.insert(0, sys.argv[1])
from lib import *
from collections import deque
def comps(mask):
    H,W=mask.shape; lab=np.zeros((H,W),int); out=[]; n=0
    for y in range(H):
        for x in range(W):
            if mask[y,x] and not lab[y,x]:
                n+=1; dq=deque([(y,x)]); lab[y,x]=n; pts=[]
                while dq:
                    cy,cx=dq.popleft(); pts.append((cy,cx))
                    for dy in (-1,0,1):
                        for dx in (-1,0,1):
                            ny,nx=cy+dy,cx+dx
                            if 0<=ny<H and 0<=nx<W and mask[ny,nx] and not lab[ny,nx]: lab[ny,nx]=n; dq.append((ny,nx))
                out.append(pts)
    return out
def pm(f):
    a=f[...,3:4]/255.0
    return np.concatenate([f[...,:3]*a, f[...,3:4]],-1)
name=sys.argv[2]; anim=None if sys.argv[3]=='-' else sys.argv[3]; r=int(sys.argv[4]) if len(sys.argv)>4 else 10
fr=frames(name,anim); loop=M['sprites'][name]['anims'][anim or list(M['sprites'][name]['anims'])[0]]['loop']
pairs=[(i,i+1) for i in range(len(fr)-1)]+([(len(fr)-1,0)] if loop else [])
for a,b in pairs:
    A=pm(fr[a]); B=pm(fr[b]); H,W=A.shape[:2]
    # small solid pieces: opaque & isolated components after thresholding alpha>=200
    cs=[c for c in comps(fr[a][...,3]>=200) if 3<=len(c)<=80]
    flags=[]
    for c in cs:
        ys=np.array([p[0] for p in c]); xs=np.array([p[1] for p in c])
        T=A[ys,xs]
        best=(1e18,0,0); zero=None
        for dy in range(-r,r+1):
            for dx in range(-r,r+1):
                yy=ys+dy; xx=xs+dx
                if yy.min()<0 or xx.min()<0 or yy.max()>=H or xx.max()>=W: continue
                e=((B[yy,xx]-T)**2).mean()
                if dx==0 and dy==0: zero=e
                if e<best[0]: best=(e,dx,dy)
        e,dx,dy=best
        d=max(abs(dx),abs(dy))
        if d>=3 and e<400: flags.append((len(c),int(xs.min()),int(ys.min()),dx,dy,int(e**0.5)))
        if e>=900: flags.append((len(c),int(xs.min()),int(ys.min()),'nomatch',int(e**0.5)))
    if flags: print(f'{name} {a}->{b}:',flags[:12])
