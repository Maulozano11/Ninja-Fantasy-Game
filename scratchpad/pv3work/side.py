import sys, json
from PIL import Image
import numpy as np
A2='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2'
name=sys.argv[1]; anim=sys.argv[2]; idx=int(sys.argv[3]); k=int(sys.argv[4]); out=sys.argv[5]
crop=[int(v) for v in sys.argv[6].split(',')] if len(sys.argv)>6 else None
man=json.load(open(A2+'/staging/vfx_poison_v3/manifest.json'))['sprites'][name]
sheet=Image.open(A2+'/staging/vfx_poison_v3/'+man['file']).convert('RGBA')
r=man['anims'][anim]['row']
f=sheet.crop((idx*man['frameW'],r*man['frameH'],(idx+1)*man['frameW'],(r+1)*man['frameH']))
his=Image.open(A2+'/vfx-poison-v3-src/his-'+name+'.png').convert('RGBA')
def on(im,bg):
    c=Image.new('RGBA',im.size,bg+(255,)); c.alpha_composite(im); return c
ims=[his,on(f,(31,33,46)),on(f,(84,110,70))]
if crop: ims=[i.crop(crop) for i in ims]
W=sum(i.width*k+6 for i in ims); H=ims[0].height*k
can=Image.new('RGB',(W,H))
x=0
for i in ims:
    can.paste(i.convert('RGB').resize((i.width*k,i.height*k),Image.NEAREST),(x,0)); x+=i.width*k+6
can.save(out)
