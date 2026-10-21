import json, sys
import numpy as np
from PIL import Image, ImageDraw
A='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/'
R=A+'review-genjutsu-set-r3/'
ref=Image.open(A+'REF-genjutsu-set-owner.jpg').convert('RGB')
man=json.load(open(A+'staging/vfx_genjutsu_v3/manifest.json'))['sprites']
rm=json.load(open(A+'vfx-genjutsu-v3-refmap.json'))
KEY={'hit':('hit',3),'blast':('blast',4),'wall':('idle',0),'wall_diag':('idle',0),'wall_depth':('idle',0)}
def frame(name,anim=None,i=0):
    s=man[name]; im=Image.open(A+'staging/vfx_genjutsu_v3/'+s['file']).convert('RGBA')
    if anim is None: anim=list(s['anims'])[0]
    a=s['anims'][anim]; W,H=s['frameW'],s['frameH']
    return im.crop((i*W,a['row']*H,(i+1)*W,(a['row']+1)*H))
def hiscrop(name):
    r=rm[name]; s=man[name]; W,H=s['frameW'],s['frameH']
    # refmap size may differ from frame (padding of 2 px each side?)
    ox,oy=r['origin']; k=r['k']; w,h=r['size']
    ax,ay=r['anchor']; fx,fy=s['anchor']
    # align by anchor: our pixel (x,y) -> his (ox + (x-(fx-ax))/k)
    dx,dy=fx-ax,fy-ay
    box=(ox-dx/k, oy-dy/k, ox+(W-dx)/k, oy+(H-dy)/k)
    return ref.resize((W,H),Image.LANCZOS,box=box)
def onbg(fr,col):
    bg=Image.new('RGBA',fr.size,col+(255,)); bg.alpha_composite(fr); return bg.convert('RGB')
if __name__=='__main__':
    names=sys.argv[1:] or ['bolt','stream','stream_head','breath','sphere','slash','multi','hit','blast','wall','aura','wall_diag','wall_depth']
    for n in names:
        an,i=KEY.get(n,(None,0))
        fr=frame(n,an,i); his=hiscrop(n)
        S=3
        tiles=[his, onbg(fr,(32,32,42)), onbg(fr,(76,110,58))]
        W,H=fr.size
        out=Image.new('RGB',(W*S*3+8*2,H*S),(255,0,255))
        for j,t in enumerate(tiles):
            out.paste(t.resize((W*S,H*S),Image.NEAREST),(j*(W*S+8),0))
        out.save(R+f'cmp_{n}.png')
        his.save(R+f'his_{n}_1x.png'); fr.save(R+f'ours_{n}_1x.png')
        print(n,fr.size)
