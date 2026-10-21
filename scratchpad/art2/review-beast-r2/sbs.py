import sys
from PIL import Image, ImageDraw
import numpy as np
S=sys.argv[1]; R=sys.argv[2]
ref=Image.open(f'{S}/art2/REF-earth-set-owner.jpg').convert('RGB')
sh=Image.open(f'{S}/art2/staging/vfx_beasts/earth.png').convert('RGBA')
W,H=276,160; AX,AY=149,77; k=96/228
def his(cx,cy):
    x0=cx-AX/k; y0=cy-AY/k; x1=x0+W/k; y1=y0+H/k
    return ref.resize((W,H),Image.BOX,box=(x0,y0,x1,y1))
def ours(i,bg=(34,34,44)):
    f=sh.crop((i*W,0,(i+1)*W,H)); b=Image.new('RGBA',(W,H),bg+(255,)); b.alpha_composite(f); return b.convert('RGB')
for i,(cx,cy) in ((0,(792,1755)),(5,(1448,1755))):
    h=his(cx,cy); o=ours(i)
    h.save(f'{R}/his-f{i}-game.png')
    c=Image.new('RGB',(W*2+4,H),(255,0,255)); c.paste(h,(0,0)); c.paste(o,(W+4,0))
    c=c.resize((c.width*3,c.height*3),Image.NEAREST)
    d=ImageDraw.Draw(c)
    for xo in (0,(W+4)*3):
        d.line([(xo,158*3),(xo+W*3,158*3)],fill=(255,0,0))
        d.line([(xo+AX*3-6,AY*3),(xo+AX*3+6,AY*3)],fill=(0,255,255)); d.line([(xo+AX*3,AY*3-6),(xo+AX*3,AY*3+6)],fill=(0,255,255))
    c.save(f'{R}/sbs-f{i}.png')
    # crops of halves for detail
    for part,box in (('L',(0,0,W//2+10,H)),('R',(W//2-10,0,W,H))):
        hc=h.crop(box); oc=o.crop(box); w=box[2]-box[0]
        cc=Image.new('RGB',(w*2+2,H),(255,0,255)); cc.paste(hc,(0,0)); cc.paste(oc,(w+2,0))
        cc.resize((cc.width*4,cc.height*4),Image.NEAREST).save(f'{R}/sbs-f{i}-{part}-4x.png')
print('done')
