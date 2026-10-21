import sys, numpy as np
sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/camp-ref/review/tools')
from sh import load
from collections import deque
def comps(m):
    H,W=m.shape; lab=np.zeros(m.shape,int); n=0; sizes=[]; boxes=[]
    for y in range(H):
        for x in range(W):
            if m[y,x] and not lab[y,x]:
                n+=1; q=deque([(y,x)]); lab[y,x]=n; c=0; xs=[];ys=[]
                while q:
                    cy,cx=q.popleft(); c+=1; xs.append(cx); ys.append(cy)
                    for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
                        ny,nx=cy+dy,cx+dx
                        if 0<=ny<H and 0<=nx<W and m[ny,nx] and not lab[ny,nx]:
                            lab[ny,nx]=n; q.append((ny,nx))
                sizes.append(c); boxes.append((min(xs),min(ys),max(xs),max(ys)))
    return sizes, boxes
def analyze(tree,name):
    a=load(tree,name); op=a[...,3]>0
    s,b=comps(op)
    hs,hb=comps(~op)
    # holes: transparent components not touching border
    holes=[(sz,bx) for sz,bx in zip(hs,hb) if bx[0]>0 and bx[1]>0 and bx[2]<255 and bx[3]<255]
    return sorted(zip(s,b),key=lambda t:-t[0]), holes
B=["male","female","bulky","slender"]
if __name__!="__main__": raise SystemExit
for p in range(3):
  for b in B:
    for w in ['held','none']:
      for pose,fc in [('read',12),('lean',4),('sit',4)]:
        for f in range(fc):
          n=f'p{p}-{b}-{w}-{pose}-{f}'
          ca,ha=analyze('raw-after',n); cb,hb=analyze('raw-before',n)
          if len(ca)!=len(cb) or len(ha)!=len(hb):
            print(n,'comps',len(cb),'->',len(ca),[c for c in ca[1:]],'holes',len(hb),'->',len(ha),ha)
