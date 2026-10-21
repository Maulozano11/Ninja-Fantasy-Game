import json,sys
from PIL import Image
import numpy as np
S=sys.argv[1]; R=sys.argv[2]
ref=Image.open(S+'/REF-genjutsu-set-owner.jpg').convert('RGB')
rm=json.load(open(S+'/vfx-genjutsu-v3-refmap.json'))
man=json.load(open(S+'/staging/vfx_genjutsu_v3/manifest.json'))['sprites']
BG=(32,32,42)
key={'bolt':(0,0),'stream':(0,0),'stream_head':(0,0),'breath':(0,0),'sphere':(0,0),'slash':(0,0),'multi':(0,0),'hit':(0,2),'blast':(0,3),'wall':(1,0),'aura':(0,0),'aura_back':(0,0),'wall_diag':(1,0),'wall_depth':(1,0)}
def frame(name,row,i):
    m=man[name]; im=Image.open(S+'/staging/vfx_genjutsu_v3/'+m['file']).convert('RGBA')
    fw,fh=m['frameW'],m['frameH']
    return im.crop((i*fw,row*fh,(i+1)*fw,(row+1)*fh))
out={}
for name,(row,i) in key.items():
    r=rm[name]; m=man[name]
    ox,oy=r['origin']; k=r['k']; w,h=r['size']
    # his crop at game scale, aligned so anchors coincide with ours
    fw,fh=m['frameW'],m['frameH']; ax,ay=m['anchor']; rax,ray=r['anchor']
    dx,dy=ax-rax, ay-ray
    # region in his px covering our frame
    x0=ox-dx/k; y0=oy-dy/k
    his=ref.resize((round(ref.width*k),round(ref.height*k)),Image.BOX)
    hx0=round(x0*k); hy0=round(y0*k)
    hc=his.crop((hx0,hy0,hx0+fw,hy0+fh))
    ours=Image.new('RGBA',(fw,fh),BG+(255,)); f=frame(name,row,i)
    if name=='aura':
        ours.alpha_composite(frame('aura_back',row,i))
        ch=Image.open(S+'/vfx-genjutsu-v3-character.png').convert('RGBA')
        ours.alpha_composite(ch,(ax-64,ay-120))
    ours.alpha_composite(f)
    canvas=Image.new('RGB',(fw*2+6,fh),(255,0,255))
    canvas.paste(hc,(0,0)); canvas.paste(ours.convert('RGB'),(fw+6,0))
    canvas=canvas.resize((canvas.width*3,canvas.height*3),Image.NEAREST)
    canvas.save(R+'/cmp_'+name+'.png')
    print(name,'saved',canvas.size,'anchor shift',dx,dy)
