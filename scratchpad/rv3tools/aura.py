import json
from PIL import Image, ImageDraw
import numpy as np
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
A=S+'/art2/'; ST=A+'staging/vfx_poison_v3/'; O=A+'review-poison-set-r3/'
ref=Image.open(A+'REF-poison-set-owner.jpg').convert('RGB')
man=json.load(open(ST+'manifest.json'))['sprites']
rm=json.load(open(A+'vfx-poison-v3-src/refmap.json'))
ch=Image.open(A+'vfx-poison-v3-character.png').convert('RGBA')
print('char',ch.size, ch.getbbox())
def frame(name,anim,i):
    m=man[name]; im=Image.open(ST+m['file']).convert('RGBA')
    r=m['anims'][anim]['row']; w,h=m['frameW'],m['frameH']
    return im.crop((i*w,r*h,(i+1)*w,(r+1)*h))
b=rm['aura']['box']; his=ref.resize((94,145),Image.LANCZOS,box=tuple(b))
Z=3
tiles=[his.resize((94*Z,145*Z),Image.NEAREST)]
for bgc in [(17,19,31),(70,110,50)]:
  for i in [0,3,6,9]:
    base=Image.new('RGBA',(94,145),bgc+(255,))
    base.alpha_composite(frame('aura_back','idle',i))
    # char feet at 64,120 -> anchor 47,123
    base.alpha_composite(ch,(47-64,123-120))
    base.alpha_composite(frame('aura','idle',i))
    tiles.append(base.convert('RGB').resize((94*Z,145*Z),Image.NEAREST))
out=Image.new('RGB',(len(tiles)*(94*Z+6),145*Z),(255,0,255))
for k,t in enumerate(tiles): out.paste(t,(k*(94*Z+6),0))
out.save(O+'aura-comp.png')
