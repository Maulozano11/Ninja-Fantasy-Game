import numpy as np
from PIL import Image
from collections import deque
R='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/review-beast-r4'
def label(m,eight=True):
    H,W=m.shape; lab=np.zeros((H,W),int); n=0
    nbr=[(-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1)] if eight else [(-1,0),(1,0),(0,-1),(0,1)]
    for y in range(H):
        for x in range(W):
            if m[y,x] and not lab[y,x]:
                n+=1; q=deque([(y,x)]); lab[y,x]=n
                while q:
                    cy,cx=q.popleft()
                    for dy,dx in nbr:
                        ny,nx=cy+dy,cx+dx
                        if 0<=ny<H and 0<=nx<W and m[ny,nx] and not lab[ny,nx]:
                            lab[ny,nx]=n; q.append((ny,nx))
    return lab,n
if __name__=='__main__':
  for i in range(8):
    f=np.asarray(Image.open(R+'/f%d.png'%i)).astype(int)
    a=f[...,3]>0
    lab,n=label(a)
    sizes=np.bincount(lab.ravel())[1:]
    l2,n2=label(~a,eight=False)
    border=set(np.unique(np.concatenate([l2[0],l2[-1],l2[:,0],l2[:,-1]])))
    hs=np.bincount(l2.ravel())
    holes=[(k,int(hs[k])) for k in range(1,n2+1) if k not in border]
    p=np.pad(a,1); nb=p[:-2,1:-1].astype(int)+p[2:,1:-1]+p[1:-1,:-2]+p[1:-1,2:]
    pin=(~a)&(nb>=3)
    stray=[]
    for k in range(1,n+1):
        if sizes[k-1]<=4:
            m=lab==k; c=f[m][:,:3].mean(0)
            sat=c.max()-c.min()
            if sat<30: stray.append((int(sizes[k-1]),tuple(int(v) for v in np.argwhere(m)[0][::-1]),tuple(int(v) for v in c.round())))
    hole_info=[(h[1],tuple(int(v) for v in np.argwhere(l2==h[0])[0][::-1])) for h in holes]
    print(i,'comps',n,'main',int(sizes.max()),'holes',hole_info[:10],'pin',int(pin.sum()),'unsat-small',len(stray),stray[:10])
