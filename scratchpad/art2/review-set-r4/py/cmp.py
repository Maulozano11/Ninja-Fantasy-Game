import json, sys
import numpy as np
from PIL import Image, ImageDraw
A='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2'
OUT=A+'/review-set-r4'
ref=Image.open(A+'/REF-earth-set-owner.jpg').convert('RGB')
man=json.load(open(A+'/staging/vfx_earth_v3/manifest.json'))['sprites']
# name: (his area box, scale, key (anim,frame), his approx anchor)
CFG={
 'bolt':((24,101,268,337),2.35,('fly',0),(206,221)),
 'stream':((649,101,1288,325),158/64,('fly',0),(975,262)),
 'stream_head':((649,101,1288,325),158/64,('fly',0),(975,262)),
 'breath':((1316,101,1635,363),2.35,('fly',0),(1323,237)),
 'sphere':((1663,101,1923,349),2.35,('fly',0),(1801,236)),
 'slash':((24,435,268,680),2.35,('fly',0),(150,556)),
 'multi':((298,435,576,680),2.35,('fly',0),(444,557)),
 'multi_hit':((580,420,805,665),2.35,('hit',3),(750,556)),
 'hit':((810,435,1122,680),2.35,('hit',3),(962,562)),
 'blast':((1158,435,1789,798),2.36,('blast',4),(1412,737)),
 'wall':((24,867,902,1255),2.35,('rise',11),(379.5,1177)),
 'aura':((930,867,1193,1216),2.40,('idle',0),(1072,1175)),
 'aura_back':((930,867,1193,1216),2.40,('idle',0),(1072,1175)),
 'wall_diag':((1222,867,1976,1491),2.35,('rise',11),(1545,1302)),
 'wall_depth':((24,1360,452,1975),2.27,('rise',11),(140,1736)),
}
def frame(name,anim,f):
    m=man[name]; im=Image.open(A+'/staging/vfx_earth_v3/'+m['file']).convert('RGBA')
    a=m['anims'][anim]; fw,fh=m['frameW'],m['frameH']
    return im.crop((f*fw,a['row']*fh,(f+1)*fw,(a['row']+1)*fh))
def his_scaled(box,s):
    c=ref.crop(box)
    return c.resize((round(c.width/s),round(c.height/s)),Image.BOX)
def over(fr,bg):
    b=Image.new('RGBA',fr.size,bg+(255,)); b.alpha_composite(fr); return b.convert('RGB')
res={}
names=sys.argv[1:] or list(CFG)
for n in names:
    box,s,(an,fi),hanc=CFG[n]
    fr=frame(n,an,fi); m=man[n]; ax,ay=m['anchor']
    hs=his_scaled(box,s); H=np.asarray(hs).astype(float)
    # predicted top-left of our frame in hs coords from his anchor
    px=(hanc[0]-box[0])/s-ax; py=(hanc[1]-box[1])/s-ay
    F=np.asarray(fr).astype(float); al=F[...,3]/255
    best=None
    for dy in range(-8,9):
        for dx in range(-8,9):
            ox=int(round(px))+dx; oy=int(round(py))+dy
            # region overlap
            x0=max(0,ox); y0=max(0,oy); x1=min(H.shape[1],ox+F.shape[1]); y1=min(H.shape[0],oy+F.shape[0])
            if x1<=x0 or y1<=y0: continue
            f=F[y0-oy:y1-oy,x0-ox:x1-ox]; h=H[y0:y1,x0:x1]
            w=(f[...,3]>200)
            if w.sum()<50: continue
            d=np.abs(f[...,:3]-h).sum(2)[w].mean()
            if best is None or d<best[0]: best=(d,ox,oy)
    d,ox,oy=best
    res[n]=dict(err=round(d,1),off=(ox-round(px),oy-round(py)))
    # build panel: his crop region matching our frame +pad
    pad=6
    W,Hh=fr.width+2*pad,fr.height+2*pad
    his=Image.new('RGB',(W,Hh),(36,36,48)); his.paste(hs,(-(ox-pad),-(oy-pad)))
    ours=over(fr,(36,36,48)); ol=over(fr,(200,200,190))
    o1=Image.new('RGB',(W,Hh),(36,36,48)); o1.paste(ours,(pad,pad))
    o2=Image.new('RGB',(W,Hh),(200,200,190)); o2.paste(ol,(pad,pad))
    sheet=Image.new('RGB',(W*3+8,Hh),(255,0,255))
    sheet.paste(his,(0,0)); sheet.paste(o1,(W+4,0)); sheet.paste(o2,(2*W+8,0))
    dr=ImageDraw.Draw(sheet)
    for k in range(3):
        cx=k*(W+4)+pad+ax; cy=pad+ay
        dr.line([(cx-3,cy),(cx+3,cy)],fill=(255,0,0)); dr.line([(cx,cy-3),(cx,cy+3)],fill=(255,0,0))
    sheet=sheet.resize((sheet.width*3,sheet.height*3),Image.NEAREST)
    sheet.save(f'{OUT}/c4-{n}.png')
    # save his scaled crop and ours for later
    his.save(f'{OUT}/h1-{n}.png'); fr.save(f'{OUT}/k1-{n}.png')
print(json.dumps(res,indent=0))
