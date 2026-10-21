import json
from PIL import Image, ImageDraw
import numpy as np
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
A=S+'/art2/'; ST=A+'staging/vfx_poison_v3/'; O=A+'review-poison-set-r3/'
ref=Image.open(A+'REF-poison-set-owner.jpg').convert('RGB')
man=json.load(open(ST+'manifest.json'))['sprites']
rm=json.load(open(A+'vfx-poison-v3-src/refmap.json'))
def frame(name,anim,i):
    m=man[name]; im=Image.open(ST+m['file']).convert('RGBA')
    r=m['anims'][anim]['row']; w,h=m['frameW'],m['frameH']
    return im.crop((i*w,r*h,(i+1)*w,(r+1)*h))
def on(f,bg=(18,20,32)):
    b=Image.new('RGBA',f.size,bg+(255,)); b.alpha_composite(f); return b.convert('RGB')
for nm,crops in [('wall_diag',{'r':(170,20,230,120),'l':(0,140,60,240)}),('wall',{'l':(0,0,40,80),'r':(252,0,292,80)})]:
    b=rm[nm]['box']; w,h=rm[nm]['w'],rm[nm]['h']
    his=ref.resize((w,h),Image.LANCZOS,box=tuple(b))
    for side,c in crops.items():
        Z=6
        frames=[('his',his)]+[(f'f{i}',on(frame(nm,'rise',i))) for i in (1,3,5,8,11)]
        cw,ch=(c[2]-c[0])*Z,(c[3]-c[1])*Z
        out=Image.new('RGB',(len(frames)*(cw+4),ch+14),(255,0,255)); d=ImageDraw.Draw(out)
        for k,(t,im) in enumerate(frames):
            out.paste(im.crop(c).resize((cw,ch),Image.NEAREST),(k*(cw+4),14)); d.text((k*(cw+4)+2,1),t,fill=(255,255,0))
        out.save(O+f'z-{nm}-{side}post.png')
