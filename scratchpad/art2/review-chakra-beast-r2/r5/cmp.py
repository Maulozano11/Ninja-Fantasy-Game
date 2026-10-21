import sys
from PIL import Image, ImageDraw
import numpy as np
S=sys.argv[1]
ref=Image.open(S+'/art2/REF-chakra-set-owner.jpg').convert('RGB')
s=96/97.5
box=(191-76/s,100-59/s,191+(127-76)/s,100+(93-59)/s)
his=ref.resize((127,93),Image.BOX,box=box)
his.save('his-game-127x93.png')
sh=Image.open(S+'/art2/staging/vfx_beasts_griffin/chakra.png').convert('RGBA')
W,H=127,93
frames=[sh.crop((f*W,0,(f+1)*W,H)) for f in range(8)]
bg=(32,31,39)
def onbg(fr,c=bg):
    b=Image.new('RGBA',fr.size,c+(255,)); b.alpha_composite(fr); return b.convert('RGB')
k=3
out=Image.new('RGB',(W*k*3+40,H*k+30),(10,10,10))
out.paste(his.resize((W*k,H*k),Image.NEAREST),(0,30))
out.paste(onbg(frames[0]).resize((W*k,H*k),Image.NEAREST),(W*k+20,30))
# overlay: his silhouette vs ours
hn=np.asarray(his).astype(int)
d=np.abs(hn-np.array(bg)).sum(2)
hm=d>60
om=np.asarray(frames[0])[...,3]==255
ov=np.zeros((H,W,3),np.uint8)
ov[hm&om]=(120,120,120); ov[hm&~om]=(255,60,60); ov[~hm&om]=(60,200,255)
out.paste(Image.fromarray(ov).resize((W*k,H*k),Image.NEAREST),(2*W*k+40,30))
dr=ImageDraw.Draw(out)
dr.text((4,4),'HIS panel @ game scale 0.985 BOX',fill=(255,255,255))
dr.text((W*k+24,4),'OUR f0 on his panel colour',fill=(255,255,255))
dr.text((2*W*k+44,4),'red=his only, cyan=ours only, grey=both',fill=(255,255,255))
out.save('cmp-his-f0-x3.png')
print('his only',int((hm&~om).sum()),'ours only',int((~hm&om).sum()),'both',int((hm&om).sum()))
