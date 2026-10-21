import json, os
import numpy as np
from PIL import Image, ImageDraw
ART2='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2'
OUT=os.environ.get('OUT', '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/gj-r3/out')
G=os.environ.get('G', ART2+'/staging/vfx_genjutsu_v3')
MAN=json.load(open(G+'/manifest.json'))['sprites']
RM=json.load(open(ART2+'/vfx-genjutsu-v3-refmap.json'))
REF=Image.open(ART2+'/REF-genjutsu-set-owner.jpg').convert('RGB')
HISBG=(32,32,42); GRASS=(78,104,64)
def frames(name, anim=None):
    s=MAN[name]; sh=Image.open(G+'/'+s['file']).convert('RGBA'); out={}
    for an,a in s['anims'].items():
        out[an]=[sh.crop((i*s['frameW'],a['row']*s['frameH'],(i+1)*s['frameW'],(a['row']+1)*s['frameH'])) for i in range(a['frames'])]
    return out if anim is None else out[anim]
KEY={'hit':('hit',3),'blast':('blast',4)}
def key(name):
    fr=frames(name)
    an,i=KEY.get(name,('idle' if 'idle' in fr else next(iter(fr)),0))
    return fr[an][i]
def his(name, k=None, origin=None, size=None, resample=Image.LANCZOS):
    r=RM[name]; k=k or r['k']; ox,oy=origin or r['origin']
    m=MAN[name]; px=m['anchor'][0]-r['anchor'][0]; py=m['anchor'][1]-r['anchor'][1]
    ox-=px/k; oy-=py/k; w,h=size or (m['frameW'],m['frameH'])
    # crop region in his px
    box=(ox,oy,ox+w/k,oy+h/k)
    return REF.resize((w,h),resample,box=box)
def on(img,bg):
    b=Image.new('RGBA',img.size,bg+(255,)); return Image.alpha_composite(b,img).convert('RGB')
def up(img,k=3): return img.resize((img.width*k,img.height*k),Image.NEAREST)
def row(ims,gap=6,bg=(10,10,14)):
    W=sum(i.width for i in ims)+gap*(len(ims)-1); H=max(i.height for i in ims)
    o=Image.new('RGB',(W,H),bg); x=0
    for i in ims: o.paste(i,(x,0)); x+=i.width+gap
    return o
def col(ims,gap=6,bg=(10,10,14)):
    W=max(i.width for i in ims); H=sum(i.height for i in ims)+gap*(len(ims)-1)
    o=Image.new('RGB',(W,H),bg); y=0
    for i in ims: o.paste(i,(0,y)); y+=i.height+gap
    return o
