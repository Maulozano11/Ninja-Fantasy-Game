# usage: trace.py <id> <out.png> [ours44.png]
# His window resampled (nearest) to 44 cells of 12 px with the 44 grid drawn over it (labels every 5),
# and, when given, our 44 at the same scale beside it with the same grid.
import sys
from PIL import Image, ImageDraw
REF='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging/ui_icons_23/ref/'
id=sys.argv[1]; out=sys.argv[2]
K=12
his=Image.open(REF+id+'.png').convert('RGB').resize((44*K,44*K),Image.NEAREST)
ims=[his]
if len(sys.argv)>3: ims.append(Image.open(sys.argv[3]).convert('RGB').resize((44*K,44*K),Image.NEAREST))
c=Image.new('RGB',(len(ims)*(44*K+30)+10,44*K+30),(16,16,20))
for n,im in enumerate(ims):
    ox=n*(44*K+30)+24
    c.paste(im,(ox,24))
    d=ImageDraw.Draw(c)
    for i in range(45):
        col=(255,0,255) if i%5==0 else (90,0,90)
        if i%5==0 or True:
            d.line([(ox+i*K,24),(ox+i*K,24+44*K)],fill=col if i%5==0 else (70,70,70))
            d.line([(ox,24+i*K),(ox+44*K,24+i*K)],fill=col if i%5==0 else (70,70,70))
        if i%5==0 and i<44:
            d.text((ox+i*K+1,10),str(i),fill=(255,255,255)); d.text((ox-20,24+i*K+1),str(i),fill=(255,255,255))
c.save(out)
