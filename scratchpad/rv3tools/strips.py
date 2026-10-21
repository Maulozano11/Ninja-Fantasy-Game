import json,sys
from PIL import Image, ImageDraw
import numpy as np
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
A=S+'/art2/'; ST=A+'staging/vfx_poison_v3/'; O=A+'review-poison-set-r3/'
man=json.load(open(ST+'manifest.json'))['sprites']
def frame(name,anim,i):
    m=man[name]; im=Image.open(ST+m['file']).convert('RGBA')
    r=m['anims'][anim]['row']; w,h=m['frameW'],m['frameH']
    return im.crop((i*w,r*h,(i+1)*w,(r+1)*h))
def strip(name,anim,frames,Z,bg,tag,crop=None,cols=None):
    m=man[name]; w,h=m['frameW'],m['frameH']
    if crop: x0,y0,x1,y1=crop
    else: x0,y0,x1,y1=0,0,w,h
    cw,chh=(x1-x0)*Z,(y1-y0)*Z
    cols=cols or len(frames)
    rows=(len(frames)+cols-1)//cols
    out=Image.new('RGB',(cols*(cw+4),rows*(chh+14)),(255,0,255))
    d=ImageDraw.Draw(out)
    for k,i in enumerate(frames):
        f=frame(name,anim,i)
        base=Image.new('RGBA',(w,h),bg+(255,)); base.alpha_composite(f)
        t=base.convert('RGB').crop((x0,y0,x1,y1)).resize((cw,chh),Image.NEAREST)
        cx,cy=(k%cols)*(cw+4),(k//cols)*(chh+14)
        out.paste(t,(cx,cy+14))
        d.rectangle((cx,cy,cx+cw,cy+13),fill=(0,0,0)); d.text((cx+2,cy+1),f'{name} {anim} f{i}',fill=(255,255,0))
    out.save(O+f'strip-{name}-{anim}-{tag}.png')
if __name__=='__main__':
    name,anim,frames,Z,bgs,tag=sys.argv[1],sys.argv[2],[int(x) for x in sys.argv[3].split(',')],int(sys.argv[4]),sys.argv[5],sys.argv[6]
    bg=tuple(int(x) for x in bgs.split('/'))
    crop=tuple(int(x) for x in sys.argv[7].split(',')) if len(sys.argv)>7 and sys.argv[7]!='-' else None
    cols=int(sys.argv[8]) if len(sys.argv)>8 else None
    strip(name,anim,frames,Z,bg,tag,crop,cols)
