import sys
from PIL import Image
import numpy as np
S=sys.argv[1]; R=sys.argv[2]
ref=Image.open(S+'/art2/REF-chakra-set-owner.jpg').convert('RGB')
sh=Image.open(S+'/art2/staging/vfx_beasts_griffin/chakra.png').convert('RGBA')
FW,FH=127,93
frames=[sh.crop((i*FW,0,(i+1)*FW,FH)) for i in range(8)]
sc=96/97.5
bg=(32,31,39)
def onbg(f,c=bg):
    b=Image.new('RGBA',f.size,c+(255,)); b.alpha_composite(f); return b.convert('RGB')
# register: anchor [76,59] in ours = his sheet (191,100)
# his game-scale image: sheet coords -> (sx-191)*sc+76
def hisgame(x0,y0,x1,y1):
    # produce his image at game scale over ours frame coordinates region
    sx0=191+(x0-76)/sc; sy0=100+(y0-59)/sc; sx1=191+(x1-76)/sc; sy1=100+(y1-59)/sc
    c=ref.crop((round(sx0),round(sy0),round(sx1),round(sy1)))
    return c.resize((x1-x0,y1-y0),Image.BOX)
Z=6
f0=onbg(frames[0])
for name,box in [('head',(85,10,127,60)),('wings',(0,0,75,50)),('tail',(0,30,70,93)),('legs',(60,45,127,93))]:
    h=hisgame(*box); o=f0.crop(box)
    w=box[2]-box[0]; hh=box[3]-box[1]
    out=Image.new('RGB',(w*Z*2+15,hh*Z+10),(80,80,80))
    out.paste(h.resize((w*Z,hh*Z),Image.NEAREST),(5,5))
    out.paste(o.resize((w*Z,hh*Z),Image.NEAREST),(w*Z+10,5))
    out.save(R+'/zoom-'+name+'.png')
