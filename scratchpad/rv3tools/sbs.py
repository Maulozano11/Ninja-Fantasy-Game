import json
from PIL import Image, ImageDraw
import numpy as np
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
A=S+'/art2/'; ST=A+'staging/vfx_poison_v3/'; O=A+'review-poison-set-r3/'
ref=Image.open(A+'REF-poison-set-owner.jpg').convert('RGB')
man=json.load(open(ST+'manifest.json'))['sprites']
rm=json.load(open(A+'vfx-poison-v3-src/refmap.json'))
BG=(29,32,40)
def frame(name,anim,i):
    m=man[name]; im=Image.open(ST+m['file']).convert('RGBA')
    r=m['anims'][anim]['row']; w,h=m['frameW'],m['frameH']
    return im.crop((i*w,r*h,(i+1)*w,(r+1)*h))
def his(name):
    b=rm[name]['box']; w,h=rm[name]['w'],rm[name]['h']
    return ref.resize((w,h),Image.LANCZOS,box=tuple(b))
def onbg(f,bg):
    base=Image.new('RGBA',f.size,bg+(255,)); base.alpha_composite(f); return base.convert('RGB')
key={'bolt':('fly',0),'stream':('fly',0),'stream_head':('fly',0),'breath':('fly',0),'sphere':('fly',0),'slash':('fly',0),'multi':('fly',0),'hit':('hit',3),'blast':('blast',4),'wall':('idle',0),'wall_diag':('idle',0),'aura':('idle',0),'aura_back':('idle',0)}
Z=3
for n,(an,i) in key.items():
    h=his(n); f=frame(n,an,i)
    # sample panel bg from his crop corner
    bg=tuple(int(v) for v in np.array(h)[1:4,1:4].reshape(-1,3).mean(0))
    o=onbg(f,bg); g=onbg(f,(70,110,50))
    W,H=h.size
    out=Image.new('RGB',(W*Z*3+20,H*Z+14),(0,0,0))
    out.paste(h.resize((W*Z,H*Z),Image.NEAREST),(0,14))
    out.paste(o.resize((W*Z,H*Z),Image.NEAREST),(W*Z+10,14))
    out.paste(g.resize((W*Z,H*Z),Image.NEAREST),(2*W*Z+20,14))
    d=ImageDraw.Draw(out); d.text((2,2),f'{n} his | ours {an}{i} on his bg | on grass   anchor {man[n]["anchor"]}',fill=(255,255,0))
    ax,ay=man[n]['anchor']
    for k in range(3):
        cx=k*(W*Z+10)+ax*Z+1; cy=14+ay*Z+1
        d.ellipse((cx-3,cy-3,cx+3,cy+3),outline=(255,0,255))
    out.save(O+f'sbs-{n}.png')
    print(n,h.size,f.size,bg)
