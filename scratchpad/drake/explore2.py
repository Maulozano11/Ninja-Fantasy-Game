import numpy as np
from PIL import Image
from collections import deque
D='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/drake/work/'
a=np.asarray(Image.open('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/REF-earth-set-owner.jpg').convert('RGB')).astype(np.float32)
y0,y1,x0,x1=1548,1972,506,1755
P=a[y0:y1,x0:x1]
bg=np.median(np.concatenate([P[2:8,:].reshape(-1,3),P[:,2:8].reshape(-1,3)]),0)
print('bg',bg)
d=np.abs(P-bg).sum(2)
r,g,b=P[...,0],P[...,1],P[...,2]
m=d>22
ys,xs=np.nonzero(m[:, :1120-x0])
print('A extent x',xs.min()+x0,xs.max()+x0,'y',ys.min()+y0,ys.max()+y0)
ys,xs=np.nonzero(m[:, 1120-x0:])
print('B extent x',xs.min()+1120,xs.max()+1120,'y',ys.min()+y0,ys.max()+y0)
# A per-column bottom
mA=m[:, :1120-x0]
cols=[(x+x0, int(np.nonzero(mA[:,x])[0].max())+y0) for x in range(0,mA.shape[1],10) if mA[:,x].any()]
print('A bottoms', cols)
