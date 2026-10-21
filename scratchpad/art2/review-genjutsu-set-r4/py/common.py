import json
import numpy as np
from PIL import Image
A='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/'
R=A+'review-genjutsu-set-r4/'
ref=Image.open(A+'REF-genjutsu-set-owner.jpg').convert('RGB')
man=json.load(open(A+'staging/vfx_genjutsu_v3/manifest.json'))['sprites']
rm=json.load(open(A+'vfx-genjutsu-v3-refmap.json'))
KEY={'hit':('hit',3),'blast':('blast',4),'wall':('idle',0),'wall_diag':('idle',0),'wall_depth':('idle',0)}
FILL=(32,32,42)
_cache={}
def sheet(name):
    if name not in _cache:
        _cache[name]=Image.open(A+'staging/vfx_genjutsu_v3/'+man[name]['file']).convert('RGBA')
    return _cache[name]
def frame(name,anim=None,i=0):
    s=man[name]; im=sheet(name)
    if anim is None: anim=list(s['anims'])[0]
    a=s['anims'][anim]; W,H=s['frameW'],s['frameH']
    return im.crop((i*W,a['row']*H,(i+1)*W,(a['row']+1)*H))
def nframes(name,anim): return man[name]['anims'][anim]['frames']
def hisbox(name,ddx=0,ddy=0):
    r=rm[name]; s=man[name]; W,H=s['frameW'],s['frameH']
    ox,oy=r['origin']; k=r['k']
    ax,ay=r['anchor']; fx,fy=s['anchor']
    dx,dy=fx-ax+ddx,fy-ay+ddy
    return (ox-dx/k, oy-dy/k, ox+(W-dx)/k, oy+(H-dy)/k)
def hiscrop(name,ddx=0,ddy=0,method=Image.LANCZOS):
    s=man[name]; W,H=s['frameW'],s['frameH']
    return ref.resize((W,H),method,box=hisbox(name,ddx,ddy))
def onbg(fr,col):
    bg=Image.new('RGBA',fr.size,col+(255,)); bg.alpha_composite(fr); return bg.convert('RGB')
def up(im,S=3): return im.resize((im.width*S,im.height*S),Image.NEAREST)
def row(tiles,S=3,gap=6,bg=(255,0,255)):
    W=sum(t.width*S for t in tiles)+gap*(len(tiles)-1); H=max(t.height*S for t in tiles)
    out=Image.new('RGB',(W,H),bg); x=0
    for t in tiles:
        out.paste(up(t.convert('RGB'),S),(x,0)); x+=t.width*S+gap
    return out
def col(imgs,gap=6,bg=(255,0,255)):
    W=max(i.width for i in imgs); H=sum(i.height for i in imgs)+gap*(len(imgs)-1)
    out=Image.new('RGB',(W,H),bg); y=0
    for i in imgs: out.paste(i,(0,y)); y+=i.height+gap
    return out
