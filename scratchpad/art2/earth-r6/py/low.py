from fr import *
import sys
g=sys.argv[1] if len(sys.argv)>1 else None
fs,(ax,ay)=frames('wall_depth','rise',g)
H,W=fs[0].shape[:2]
print('anchor',ax,ay,'size',W,H)
import numpy as np
lows=[]
for i,f in enumerate(fs):
    a=f[:,:,3]
    low=np.full(W,-1)
    for x in range(W):
        ys=np.nonzero(a[:,x]>=128)[0]
        if len(ys): low[x]=ys.max()
    lows.append(low)
L=np.array(lows)
for x in range(0,W,4):
    print(x, ' '.join('%3d'%v for v in L[:,x]))
for i,f in enumerate(fs):
    a=f[:,:,3]
    print(i,'opaque rows 244-265:', [(int((a[y]>=128).sum())) for y in range(244,266)])
