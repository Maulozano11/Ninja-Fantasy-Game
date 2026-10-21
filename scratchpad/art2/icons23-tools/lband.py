import sys; sys.path.insert(0,'/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/icons23-tools')
import numpy as np
from PIL import Image
from ok import oklab
# usage: lband.py id out.png lo1 hi1 [lo2 hi2]
id=sys.argv[1]; out=sys.argv[2]; bands=[float(v) for v in sys.argv[3:]]
a=np.asarray(Image.open('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging/ui_icons_23/ref/%s.png'%id).convert('RGB')).astype(float)
L=oklab(a)[...,0]
o=a.copy()
cols=[[255,0,255],[255,255,0],[0,255,255]]
for k in range(0,len(bands),2):
    m=(L>=bands[k])&(L<bands[k+1]); o[m]=cols[k//2]
h,w=L.shape
Image.fromarray(np.hstack([a,o]).astype(np.uint8)).resize((w*2*5,h*5),Image.NEAREST).save(out)
print('L pct',np.percentile(L,[1,5,10,25,50,75,90,95,99]).round(3))
