import numpy as np
from PIL import Image
A='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/'
ref=np.array(Image.open(A+'REF-genjutsu-set-owner.jpg').convert('L')).astype(float)
ch=Image.open(A+'vfx-genjutsu-v3-character.png').convert('RGBA')
cb=ch.crop((27,27,83,123))  # 56x96
def fit(region, scales):
    x0,y0,x1,y1=region
    best=None
    for s in scales:
        w=round(56*s); h=round(96*s)
        im=cb.resize((w,h),Image.BILINEAR)
        a=np.array(im).astype(float); al=a[:,:,3]/255; L=(0.299*a[:,:,0]+0.587*a[:,:,1]+0.114*a[:,:,2])
        m=al>0.5
        for oy in range(y0,y1-h+1):
            for ox in range(x0,x1-w+1):
                p=ref[oy:oy+h,ox:ox+w]
                u=L[m]; v=p[m]
                u=u-u.mean(); v=v-v.mean()
                c=(u*v).sum()/np.sqrt((u*u).sum()*(v*v).sum()+1e-9)
                if best is None or c>best[0]: best=(c,s,ox,oy,w,h)
        print(s, best)
    return best
import sys
reg={'blast':(735,270,850,425),'wall':(350,505,455,660),'diag':(935,590,1015,730),'depth':(150,870,235,1000)}
for n in sys.argv[1:]:
    print(n, fit(reg[n],[1.22,1.24,1.26,1.28,1.30,1.32]))
