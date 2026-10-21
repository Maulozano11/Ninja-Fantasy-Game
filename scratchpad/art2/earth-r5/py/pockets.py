from fr import *
import sys
from collections import deque
def pockets(a, thr=40):
    H,W=a.shape; low=a<thr; seen=np.zeros_like(low)
    dq=deque()
    for x in range(W):
        for y in (0,H-1):
            if low[y,x] and not seen[y,x]: seen[y,x]=1; dq.append((y,x))
    for y in range(H):
        for x in (0,W-1):
            if low[y,x] and not seen[y,x]: seen[y,x]=1; dq.append((y,x))
    while dq:
        y,x=dq.popleft()
        for v,u in ((y-1,x),(y+1,x),(y,x-1),(y,x+1)):
            if 0<=v<H and 0<=u<W and low[v,u] and not seen[v,u]: seen[v,u]=1; dq.append((v,u))
    return int((low&~seen).sum())
name=sys.argv[1]; anim=sys.argv[2]; g=sys.argv[3] if len(sys.argv)>3 else None
fs,_=frames(name,anim,g)
print(name, [pockets(f[...,3]) for f in fs])
