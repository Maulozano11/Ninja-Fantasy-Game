# piece.py libdir name anim x y [thr]: the solid component of frame 0 containing (x,y); for each frame
# the best whole-pixel offset, the differing px and an ascii view (frame 0 piece vs frame t at offset).
import sys; sys.path.insert(0, sys.argv[1])
from lib import *
from collections import deque
name=sys.argv[2]; anim=None if sys.argv[3]=='-' else sys.argv[3]; X=int(sys.argv[4]); Y=int(sys.argv[5]); thr=int(sys.argv[6]) if len(sys.argv)>6 else 200
fr=frames(name,anim); H,W=fr[0].shape[:2]
m=fr[0][...,3]>=thr
if not m[Y,X]:
    # nearest solid px
    yy,xx=np.nonzero(m); k=np.argmin((yy-Y)**2+(xx-X)**2); Y,X=int(yy[k]),int(xx[k])
seen=set([(Y,X)]); dq=deque([(Y,X)])
while dq:
    cy,cx=dq.popleft()
    for dy in (-1,0,1):
        for dx in (-1,0,1):
            ny,nx=cy+dy,cx+dx
            if 0<=ny<H and 0<=nx<W and m[ny,nx] and (ny,nx) not in seen: seen.add((ny,nx)); dq.append((ny,nx))
ys=np.array([p[0] for p in seen]); xs=np.array([p[1] for p in seen]); T=fr[0][ys,xs].astype(int)
print(name,'piece',len(seen),'px, box',xs.min(),ys.min(),xs.max(),ys.max())
last=(0,0)
for t,f in enumerate(fr):
    f=f.astype(int); best=None
    for dy in range(-10,11):
        for dx in range(-10,11):
            yy=ys+dy; xx=xs+dx
            if yy.min()<0 or xx.min()<0 or yy.max()>=H or xx.max()>=W: continue
            d=int((np.abs(f[yy,xx]-T).max(-1)>8).sum())
            k=(d,abs(dx-last[0])+abs(dy-last[1]))
            if best is None or k<best[0]: best=(k,dx,dy)
    (d,_),dx,dy=best; last=(dx,dy)
    print(f' f{t}: off ({dx:+d},{dy:+d}) differing {d}')
    if len(sys.argv)>7:
        x0,y0,x1,y1=xs.min()-2,ys.min()-2,xs.max()+3,ys.max()+3
        for yv in range(y0,y1):
            row=''
            for xv in range(x0,x1):
                a=f[yv+dy,xv+dx,3] if 0<=yv+dy<H and 0<=xv+dx<W else 0
                inp=(yv,xv) in seen
                row+=('#' if a>=200 else '+' if a>=100 else '.' if a>0 else ' ') if not inp else ('@' if a>=200 and np.abs(f[yv+dy,xv+dx]-fr[0][yv,xv].astype(int)).max()<=8 else 'X')
            print('   ',row)
