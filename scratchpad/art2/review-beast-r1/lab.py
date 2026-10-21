import numpy as np
from collections import deque
def label(m):
    H,W=m.shape; lab=np.zeros((H,W),int); n=0; comps=[]
    for y in range(H):
        for x in range(W):
            if m[y,x] and not lab[y,x]:
                n+=1; q=deque([(y,x)]); lab[y,x]=n; pts=[]
                while q:
                    cy,cx=q.popleft(); pts.append((cy,cx))
                    for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
                        yy,xx=cy+dy,cx+dx
                        if 0<=yy<H and 0<=xx<W and m[yy,xx] and not lab[yy,xx]:
                            lab[yy,xx]=n; q.append((yy,xx))
                comps.append(pts)
    return lab,comps
def erode(m):
    o=m.copy(); o[1:]&=m[:-1]; o[:-1]&=m[1:]; o[:,1:]&=m[:,:-1]; o[:,:-1]&=m[:,1:]; return o
def dilate(m):
    o=m.copy(); o[1:]|=m[:-1]; o[:-1]|=m[1:]; o[:,1:]|=m[:,:-1]; o[:,:-1]|=m[:,1:]; return o
def opening(m): return dilate(erode(m))
