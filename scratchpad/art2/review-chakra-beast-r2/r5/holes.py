import sys
from PIL import Image
import numpy as np
from collections import deque
S=sys.argv[1]
a=np.asarray(Image.open(S+'/art2/staging/vfx_beasts_griffin/chakra.png').convert('RGBA'))
W,H=127,93
def label(m):
    lab=np.zeros(m.shape,int); n=0
    for y in range(m.shape[0]):
        for x in range(m.shape[1]):
            if m[y,x] and not lab[y,x]:
                n+=1; q=deque([(y,x)]); lab[y,x]=n
                while q:
                    cy,cx=q.popleft()
                    for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
                        ny,nx=cy+dy,cx+dx
                        if 0<=ny<m.shape[0] and 0<=nx<m.shape[1] and m[ny,nx] and not lab[ny,nx]:
                            lab[ny,nx]=n; q.append((ny,nx))
    return lab,n
for f in range(8):
    x=a[:,f*W:(f+1)*W]
    op=x[...,3]==255
    lab,n=label(~op)
    border=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])).tolist())
    holes=[]
    for i in range(1,n+1):
        if i in border: continue
        ys,xs=np.where(lab==i)
        holes.append((len(ys),int(xs.mean()),int(ys.mean()), int(x[ys,xs,3].max())))
    lab2,n2=label(op)
    sizes=sorted([((lab2==i).sum(),i) for i in range(1,n2+1)],reverse=True)
    isl=[(int(s),int(np.where(lab2==i)[1].mean()),int(np.where(lab2==i)[0].mean())) for s,i in sizes[1:] ]
    print('f%d holes(size,x,y,maxalpha):'%f, holes)
    print('    main',int(sizes[0][0]),'islands', isl[:40])
