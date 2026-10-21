import sys; sys.path.insert(0,'.')
from ref import *
import numpy as np
from collections import deque
s=REF['wall']; W,H=s['w'],s['h']; seams=s['seams']
m=piece('wall','main')
c=comp([m]).astype(float)
def labL(c):
    cc=c/255; cc=np.where(cc>0.04045,((cc+0.055)/1.055)**2.4,cc/12.92)
    Y=cc[...,0]*0.2126+cc[...,1]*0.7152+cc[...,2]*0.0722
    return 116*np.cbrt(Y)-16
L=labL(c)
kind=np.array(['']+KIND,dtype=object)[m]
light=(m>0)&(L>=36)&(kind=='body')
pill=lambda x: sum(1 for sx in seams if sx<=x)
colp=np.array([pill(x) for x in range(W)])
# components
lab=np.zeros((H,W),int); n=0
for y in range(H):
    for x in range(W):
        if light[y,x] and not lab[y,x]:
            n+=1; q=deque([(y,x)]); lab[y,x]=n
            while q:
                a,b=q.popleft()
                for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
                    v,u=a+dy,b+dx
                    if 0<=v<H and 0<=u<W and light[v,u] and not lab[v,u]: lab[v,u]=n; q.append((v,u))
own=np.full((H,W),-1)
for i in range(1,n+1):
    ys,xs=np.nonzero(lab==i); ps=colp[xs]
    cnt=np.bincount(ps,minlength=len(seams)+1)
    p=int(cnt.argmax())
    if cnt.max()<0.75*len(xs) and len(xs)>30: print('straddler',i,len(xs),cnt[cnt>0], 'x',xs.min(),xs.max(),'y',ys.min(),ys.max())
    own[ys,xs]=p
for j,sx in enumerate(seams):
    if j==0: continue
    p=j  # pillar left of seam sx is j, right is j+1? pill(x)= number of seams <= x
    left=pill(sx-1); right=pill(sx)
    crossR=((own==left)&(np.arange(W)[None,:]>=sx)).sum()
    crossL=((own==right)&(np.arange(W)[None,:]<sx)).sum()
    print('seam',sx,'pillars',left,right,'left->R',crossR,'right->L',crossL)
