import numpy as np, sys
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
        im=cb.resize((w,h),Image.BOX)
        a=np.array(im).astype(float); al=a[:,:,3]/255; L=(0.299*a[:,:,0]+0.587*a[:,:,1]+0.114*a[:,:,2])
        m=al>0.6
        u=L[m]; u=u-u.mean(); uu=(u*u).sum()
        bs=None
        for oy in range(y0,y1-h+1):
            for ox in range(x0,x1-w+1):
                v=ref[oy:oy+h,ox:ox+w][m]; v=v-v.mean()
                c=(u*v).sum()/np.sqrt(uu*(v*v).sum()+1e-9)
                if bs is None or c>bs[0]: bs=(round(c,4),s,ox,oy,w,h)
        if best is None or bs[0]>best[0]: best=bs
        print(' ',bs)
    return best
reg={'blast':(740,270,850,425),'wall':(355,510,455,665),'aura':(462,495,575,655),'diag':(930,585,1020,735),'depth':(145,865,240,1010)}
for n in sys.argv[1:]:
    print(n, fit(reg[n],[1.20,1.22,1.24,1.25,1.26,1.27,1.28,1.29,1.30,1.31,1.32,1.34]))
