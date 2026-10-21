# rigid.py libdir name anim: every solid piece of frame 0 (alpha>=200 comps 4..150 px) found whole
# (<=10% px differing) in each frame within 10 px of where it last was; reports the largest step
# between consecutive frames where it is found whole, and the frames where it is not found whole.
import sys; sys.path.insert(0, sys.argv[1])
from lib import *
from collections import deque
def comps(a,thr=200):
    H,W=a.shape; m=a>=thr; lab=np.zeros((H,W),int); out=[]; n=0
    for y in range(H):
        for x in range(W):
            if m[y,x] and not lab[y,x]:
                n+=1; dq=deque([(y,x)]); lab[y,x]=n; pts=[]
                while dq:
                    cy,cx=dq.popleft(); pts.append((cy,cx))
                    for ny,nx in ((cy+1,cx),(cy-1,cx),(cy,cx+1),(cy,cx-1),(cy+1,cx+1),(cy-1,cx-1),(cy+1,cx-1),(cy-1,cx+1)):
                        if 0<=ny<H and 0<=nx<W and m[ny,nx] and not lab[ny,nx]: lab[ny,nx]=n; dq.append((ny,nx))
                out.append(pts)
    return out
name=sys.argv[2]; anim=None if sys.argv[3]=='-' else sys.argv[3]; mn=int(sys.argv[4]) if len(sys.argv)>4 else 4
fr=frames(name,anim); H,W=fr[0].shape[:2]; N=len(fr)
bad=0; tot=0; rows=[]
for c in comps(fr[0][...,3]):
    if not (mn<=len(c)<=150): continue
    ys=np.array([p[0] for p in c]); xs=np.array([p[1] for p in c]); T=fr[0][ys,xs].astype(int)
    tot+=1
    pos=[(0,0)]+[None]*(N-1); last=(0,0)
    for t in range(1,N):
        f=fr[t].astype(int); best=None
        for dy in range(last[1]-10,last[1]+11):
            for dx in range(last[0]-10,last[0]+11):
                yy=ys+dy; xx=xs+dx
                if yy.min()<0 or xx.min()<0 or yy.max()>=H or xx.max()>=W: continue
                d=(np.abs(f[yy,xx]-T).max(-1)>8).mean()
                k=(d, abs(dx-last[0])+abs(dy-last[1]))
                if best is None or k<best[0]: best=(k,dx,dy)
        if best and best[0][0]<=0.1: pos[t]=(best[1],best[2]); last=pos[t]
    seq=pos+[pos[0]]
    steps=[]
    for i in range(N):
        a,b=seq[i],seq[i+1]
        if a is not None and b is not None: steps.append((max(abs(a[0]-b[0]),abs(a[1]-b[1])),i))
    ms=max(steps)[0] if steps else 0
    miss=[i for i in range(N) if pos[i] is None]
    if ms>2: bad+=1
    rows.append((ms,len(c),int(xs.min()),int(ys.min()),[p if p else '-' for p in pos],miss))
rows.sort(key=lambda r:(-r[0],-r[1]))
print(f'{name}: {tot} solid pieces tracked, {bad} with a step over 2 px between frames where found whole')
for r in rows[:int(sys.argv[5]) if len(sys.argv)>5 else 5]: print('  maxstep',r[0],'size',r[1],'at',(r[2],r[3]),'path',r[4],'not whole in',r[5])
