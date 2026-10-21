import numpy as np
from collections import deque
def dil(m,r):
    o=m.copy(); H,W=m.shape
    p=np.pad(m,r)
    for dy in range(-r,r+1):
        for dx in range(-r,r+1):
            o|=p[r+dy:r+dy+H, r+dx:r+dx+W]
    return o
def ero(m,r):
    return ~dil(~m,r)
def close(m,r): 
    H,W=m.shape; p=np.pad(m,r+1)
    return ero(dil(p,r),r)[r+1:r+1+H, r+1:r+1+W]
def outside(clear):
    """clear pixels connected to the border (4-conn)"""
    H,W=clear.shape; seen=np.zeros_like(clear)
    q=deque()
    for x in range(W):
        for y in (0,H-1):
            if clear[y,x] and not seen[y,x]: seen[y,x]=1; q.append((y,x))
    for y in range(H):
        for x in (0,W-1):
            if clear[y,x] and not seen[y,x]: seen[y,x]=1; q.append((y,x))
    while q:
        y,x=q.popleft()
        for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
            yy,xx=y+dy,x+dx
            if 0<=yy<H and 0<=xx<W and clear[yy,xx] and not seen[yy,xx]: seen[yy,xx]=1; q.append((yy,xx))
    return seen
def label(m,conn8=True):
    H,W=m.shape; lab=np.zeros((H,W),int); n=0
    nb=((1,0),(-1,0),(0,1),(0,-1))+(((1,1),(1,-1),(-1,1),(-1,-1)) if conn8 else ())
    for y0,x0 in zip(*np.nonzero(m)):
        if lab[y0,x0]: continue
        n+=1; lab[y0,x0]=n; q=deque([(y0,x0)])
        while q:
            y,x=q.popleft()
            for dy,dx in nb:
                yy,xx=y+dy,x+dx
                if 0<=yy<H and 0<=xx<W and m[yy,xx] and not lab[yy,xx]: lab[yy,xx]=n; q.append((yy,xx))
    return lab,n
