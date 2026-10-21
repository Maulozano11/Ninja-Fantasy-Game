import numpy as np
from PIL import Image
SP='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/'
ref=Image.open(SP+'REF-genjutsu-set-owner.jpg').convert('RGB')
s=96/124.0
for name,box in [('L',(262,798,522,1009)),('R',(522,798,785,1009))]:
    c=ref.crop(box); c=np.asarray(c.resize((round(c.width*s),round(c.height*s)),Image.BOX)).astype(float)
    ch=c.max(2)-c.min(2); lu=c@np.array([0.3,0.55,0.15]); gmin=(c.argmin(2)==1)
    print(name)
    for lo,hi in [(0,30),(30,45),(45,60),(60,70),(70,85),(85,95),(95,112),(112,999)]:
        b=(lu>=lo)&(lu<hi)
        print(f'  luma {lo}-{hi}: n={b.sum()} ch>30 {(b&(ch>30)).sum()} ch>40 {(b&(ch>40)).sum()}  green-min share {(b&(ch>30)&gmin).sum()}  magenta(g<.6min(r,b)) {(b&(ch>30)&(c[...,1]<0.6*np.minimum(c[...,0],c[...,2]))).sum()}')
