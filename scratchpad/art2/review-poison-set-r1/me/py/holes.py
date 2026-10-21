import sys; sys.path.insert(0,'py')
from common import *
from collections import deque
def holes(fr,thr=128):
    a=np.asarray(fr)[...,3]
    H,W=a.shape
    solid=a>=thr
    seen=np.zeros_like(solid)
    q=deque()
    for x in range(W):
        for y in (0,H-1):
            if not solid[y,x] and not seen[y,x]: seen[y,x]=1; q.append((y,x))
    for y in range(H):
        for x in (0,W-1):
            if not solid[y,x] and not seen[y,x]: seen[y,x]=1; q.append((y,x))
    while q:
        y,x=q.popleft()
        for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
            yy,xx=y+dy,x+dx
            if 0<=yy<H and 0<=xx<W and not solid[yy,xx] and not seen[yy,xx]:
                seen[yy,xx]=1; q.append((yy,xx))
    return (~solid)&(~seen)
if __name__=='__main__':
    keys={'bolt':('fly',0),'stream_head':('fly',0),'breath':('fly',0),'sphere':('fly',0),'slash':('fly',0),'multi':('fly',0),'hit':('hit',3),'blast':('blast',4),'wall':('idle',0),'wall_diag':('idle',0),'aura_back':('idle',0),'wall_depth':('idle',0)}
    for n,(an,i) in keys.items():
        fr=frames(n,an)[i]
        h=holes(fr)
        # label sizes
        print(n, 'enclosed see-through px (alpha<128):', int(h.sum()))
        if h.sum():
            g=np.asarray(on((70,110,50),fr)).copy(); g[h]=(255,0,255)
            s=2 if fr.width>150 else 4
            up(Image.fromarray(g.astype(np.uint8)),s).save('holes_'+n+'.png')
