import json, sys
from PIL import Image, ImageDraw
import numpy as np
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2'
OUT=S+'/review-set-r2'
G=S+'/staging/vfx_earth_v3/'
REF=Image.open(S+'/REF-earth-set-owner.jpg').convert('RGB')
M=json.load(open(G+'manifest.json'))['sprites']
BG=(34,34,45)
# name: (anim, frame, his anchor, scale)
CFG={
 'bolt':('fly',0,(206,221),2.35),'breath':('fly',0,(1323,237),2.35),'sphere':('fly',0,(1801,236),2.35),
 'slash':('fly',0,(150,556),2.35),'multi':('fly',0,(444,557),2.35),'multi_hit':('hit',3,(750,556),2.35),
 'hit':('hit',3,(962,562),2.35),'blast':('blast',4,(1412,737),2.39),'wall':('idle',0,(379.5,1177),2.34),
 'wall_diag':('idle',0,(1545,1302),2.35),'wall_depth':('idle',0,(140,1736),2.26),'aura':('idle',0,(1072,1175),2.41),
 'stream_head':('fly',0,(975,262),158/64),
}
def frame(name,anim,i):
    m=M[name]; a=m['anims'][anim]; im=Image.open(G+m['file']).convert('RGBA')
    W,H=m['frameW'],m['frameH']; return im.crop((i*W,a['row']*H,(i+1)*W,(a['row']+1)*H))
def his(name,W,H,ax,ay,hx,hy,s):
    box=(hx-ax*s,hy-ay*s,hx+(W-ax)*s,hy+(H-ay)*s)
    return REF.resize((W,H),Image.BOX,box=box)
def on(img,col):
    b=Image.new('RGBA',img.size,col+(255,)); b.alpha_composite(img); return b.convert('RGB')
def up(im,k=3): return im.resize((im.width*k,im.height*k),Image.NEAREST)
def cross(d,x,y,k=3):
    d.line([(x*k-6,y*k),(x*k+6,y*k)],fill=(255,0,0)); d.line([(x*k,y*k-6),(x*k,y*k+6)],fill=(255,0,0))
stats={}
for name,(anim,fi,(hx,hy),s) in CFG.items():
    m=M[name]; W,H=m['frameW'],m['frameH']; ax,ay=m['anchor']
    ours=frame(name,anim,fi)
    if name=='aura':
        back=frame('aura_back',anim,fi); ch=Image.open(S+'/earth-v3-work/character.png').convert('RGBA')
        comp=Image.new('RGBA',(W,H),(0,0,0,0)); comp.alpha_composite(back)
        comp.alpha_composite(ch,(ax-64,ay-120)); comp.alpha_composite(ours); ours=comp
    h=his(name,W,H,ax,ay,hx,hy,s)
    o1=on(ours,BG); o2=on(ours,(205,205,200)); o3=on(ours,(70,110,55))
    d=np.abs(np.asarray(h,float)-np.asarray(o1,float)).sum(-1)
    stats[name]=(d.mean(), (d>90).mean())
    heat=Image.fromarray(np.clip(d,0,255).astype(np.uint8)).convert('RGB')
    panels=[h,o1,o2,o3,heat]
    k=3; pad=6
    sheet=Image.new('RGB',(len(panels)*(W*k+pad),H*k+20),(10,10,10))
    dr=ImageDraw.Draw(sheet)
    for j,p in enumerate(panels):
        sheet.paste(up(p,k),(j*(W*k+pad),20))
    for j,t in enumerate(['HIS (box@%.2f)'%s,'OURS on his BG','OURS light','OURS green','|diff|']):
        dr.text((j*(W*k+pad)+2,4),t,fill=(255,255,0))
    sheet.save(OUT+'/cmp-%s.png'%name)
for k,v in stats.items(): print(k,'meanAbsDiff %.1f  frac>90 %.3f'%v)
