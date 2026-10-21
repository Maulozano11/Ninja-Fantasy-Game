import json,sys
from PIL import Image, ImageDraw
import numpy as np
S=sys.argv[1]; R=sys.argv[2]
ref=Image.open(S+'/REF-genjutsu-set-owner.jpg').convert('RGB')
rm=json.load(open(S+'/vfx-genjutsu-v3-refmap.json'))
man=json.load(open(S+'/staging/vfx_genjutsu_v3/manifest.json'))['sprites']
BG=(32,32,42); GREEN=(86,112,58)
key={'bolt':(0,0),'stream':(0,0),'stream_head':(0,0),'breath':(0,0),'sphere':(0,0),'slash':(0,0),'multi':(0,0),'hit':(0,3),'blast':(0,4),'wall':(1,0),'aura':(0,0),'wall_diag':(1,0),'wall_depth':(1,0)}
def frame(name,row,i):
    m=man[name]; im=Image.open(S+'/staging/vfx_genjutsu_v3/'+m['file']).convert('RGBA')
    fw,fh=m['frameW'],m['frameH']
    return im.crop((i*fw,row*fh,(i+1)*fw,(row+1)*fh))
res={}
for name,(row,i) in key.items():
    r=rm[name]; m=man[name]
    ox,oy=r['origin']; k=r['k']
    fw,fh=m['frameW'],m['frameH']; ax,ay=m['anchor']; rax,ray=r['anchor']
    dx,dy=ax-rax, ay-ray
    x0=ox-dx/k; y0=oy-dy/k
    # crop his region exactly then resize to game scale (box)
    hc=ref.crop((round(x0),round(y0),round(x0+fw/k),round(y0+fh/k))).resize((fw,fh),Image.BOX)
    f=frame(name,row,i)
    ours=Image.new('RGBA',(fw,fh),BG+(255,))
    if name=='aura':
        ours.alpha_composite(frame('aura_back',row,i))
        ch=Image.open(S+'/vfx-genjutsu-v3-character.png').convert('RGBA')
        ours.alpha_composite(ch,(ax-64,ay-120))
    ours.alpha_composite(f)
    green=Image.new('RGBA',(fw,fh),GREEN+(255,))
    if name=='aura': green.alpha_composite(frame('aura_back',row,i))
    green.alpha_composite(f)
    # alignment search
    H=np.asarray(hc).astype(float); O=np.asarray(ours.convert('RGB')).astype(float)
    best=None
    for sy in range(-5,6):
        for sx in range(-5,6):
            a=H[5+sy:fh-5+sy,5+sx:fw-5+sx]; b=O[5:fh-5,5:fw-5]
            e=np.abs(a-b).mean()
            if best is None or e<best[0]: best=(e,sx,sy)
    e0=np.abs(H-O).mean()
    res[name]=(round(e0,2),best)
    # diff map
    D=np.abs(H-O).sum(2); D=np.clip(D*1.0,0,255).astype(np.uint8)
    dimg=Image.fromarray(D).convert('RGB')
    gap=4
    can=Image.new('RGB',(fw*4+gap*3,fh),(255,0,255))
    can.paste(hc,(0,0)); can.paste(ours.convert('RGB'),(fw+gap,0)); can.paste(green.convert('RGB'),(2*(fw+gap),0)); can.paste(dimg,(3*(fw+gap),0))
    d=ImageDraw.Draw(can)
    for j in range(3):
        cx=j*(fw+gap)+ax; d.point((cx,ay),fill=(255,255,0))
    sc=3 if fw<200 else 2
    can=can.resize((can.width*sc,can.height*sc),Image.NEAREST)
    can.save(R+'/cmp_'+name+'.png')
    hc.save(R+'/his_'+name+'_1x.png'); ours.save(R+'/ours_'+name+'_1x.png')
for k,v in res.items(): print(k,'meanAbsErr',v[0],'best shift (err,sx,sy)',v[1])
