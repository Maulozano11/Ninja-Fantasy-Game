import numpy as np
from PIL import Image
D='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/drake/work/'
a=np.asarray(Image.open('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/REF-earth-set-owner.jpg').convert('RGB')).astype(np.float32)
P=a[1548:1972,506:1755]
bg=np.array([34,34,44],np.float32)
d=np.abs(P-bg).sum(2)
r,g,b=P[...,0],P[...,1],P[...,2]
for T in (20,30,45,60):
    m=d>T
    Image.fromarray((m*255).astype(np.uint8)).save(D+f'mask{T}.png')
# hue map: warm (dust) vs neutral
warm=(r-b>55)&(d>40)
vis=np.zeros(P.shape,np.uint8)
vis[d>30]=[120,120,120]
vis[warm]=[255,160,40]
green=(g>r+8)&(g>b+15)
vis[green&(d>30)]=[60,200,60]
Image.fromarray(vis).save(D+'classes.png')
# histogram of edge colors: pixels with d in 15..60
sel=(d>12)&(d<60)
print('n',sel.sum())
print(np.percentile(P[sel],[10,50,90],axis=0))
