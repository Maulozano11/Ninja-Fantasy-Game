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
name=sys.argv[2]; anim=None if sys.argv[3]=='-' else sys.argv[3]
fr=frames(name,anim); H,W=fr[0].shape[:2]
# pieces in frame 0: isolated solid components 8..120 px
base=[c for c in comps(fr[0][...,3]) if 8<=len(c)<=150]
report=[]
for c in base:
    ys=np.array([p[0] for p in c]); xs=np.array([p[1] for p in c]); T=fr[0][ys,xs].astype(int)
    path=[(0,0)]; prev=(0,0); errs=[]
    for t in list(range(1,len(fr)))+[0]:
        f=fr[t].astype(int); best=None
        for dy in range(prev[1]-8,prev[1]+9):
            for dx in range(prev[0]-8,prev[0]+9):
                yy=ys+dy; xx=xs+dx
                if yy.min()<0 or xx.min()<0 or yy.max()>=H or xx.max()>=W: continue
                d=(np.abs(f[yy,xx]-T).max(-1)>8).mean()
                if best is None or d<best[0] or (d==best[0] and abs(dx-prev[0])+abs(dy-prev[1])<abs(best[1]-prev[0])+abs(best[2]-prev[1])): best=(d,dx,dy)
        path.append((best[1],best[2])); errs.append(round(best[0],2)); prev=(best[1],best[2])
    steps=[max(abs(path[i+1][0]-path[i][0]),abs(path[i+1][1]-path[i][1])) for i in range(len(path)-1)]
    report.append((max(steps),len(c),int(xs.min()),int(ys.min()),path,max(errs)))
report.sort(reverse=True)
for r in report[:12]: print(name,'maxstep',r[0],'size',r[1],'at',(r[2],r[3]),'path',r[4],'maxerr',r[5])
