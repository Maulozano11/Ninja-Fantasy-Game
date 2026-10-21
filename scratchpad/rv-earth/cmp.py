import json, sys
import numpy as np
from PIL import Image, ImageDraw
A='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/'
G=A+'staging/vfx_earth_v3/'
OUT=A+'review-set-r1/earth-v3/'
REF=Image.open(A+'REF-earth-set-owner.jpg').convert('RGB')
man=json.load(open(G+'manifest.json'))['sprites']
BG=(34,34,45)
CFG={ # his anchor, scale
 'bolt':((206,221),2.35),'breath':((1323,237),2.35),'sphere':((1801,236),2.35),'slash':((150,556),2.35),
 'multi':((444,557),2.35),'multi_hit':((750,556),2.35),'hit':((962,562),2.35),'blast':((1412,737),2.39),
 'wall':((379.5,1177),2.34),'wall_diag':((1545,1302),2.35),'wall_depth':((140,1736),2.26),'aura':((1072,1175),2.41),
 'aura_back':((1072,1175),2.41),'stream_head':((975+32*158/64,262),158/64),'stream':((817,262),158/64)}
KEY={'hit':('hit',2),'blast':('blast',3)}
def frame(name,anim=None,i=None):
    m=man[name]; an=m['anims']
    if anim is None:
        anim,i=('idle',0) if 'idle' in an and 'rise' in an else KEY.get(name,(list(an)[0],0))
    sh=Image.open(G+m['file']).convert('RGBA')
    fw,fh=m['frameW'],m['frameH']; r=an[anim]['row']
    return sh.crop((i*fw,r*fh,(i+1)*fw,(r+1)*fh))
def his(name,pad=0):
    m=man[name]; (hx,hy),s=CFG[name]; ax,ay=m['anchor']; W,H=m['frameW'],m['frameH']
    box=(hx-ax*s, hy-ay*s, hx+(W-ax)*s, hy+(H-ay)*s)
    return REF.resize((W,H),Image.BOX,box=box), box
def onbg(im,col=BG):
    b=Image.new('RGBA',im.size,col+(255,)); b.alpha_composite(im); return b.convert('RGB')
def make(name,k=3,extra=None):
    f=frame(name); h,box=his(name)
    W,H=f.size
    panels=[h, onbg(f), onbg(f,(255,0,255)), onbg(f,(235,235,235))]
    if extra: panels.insert(2,onbg(extra))
    gap=4
    out=Image.new('RGB',((W*k+gap)*len(panels),H*k+14),(10,10,10))
    for j,p in enumerate(panels):
        out.paste(p.resize((W*k,H*k),Image.NEAREST),(j*(W*k+gap),14))
    d=ImageDraw.Draw(out)
    labs=['HIS @game scale','OURS key','OURS on magenta','OURS on light']
    if extra: labs.insert(2,'extra')
    for j,l in enumerate(labs): d.text((j*(W*k+gap)+2,1),l,fill=(255,255,0))
    ax,ay=man[name]['anchor']
    for j in range(len(panels)):
        cx=j*(W*k+gap)+ax*k+k//2; cy=14+ay*k+k//2
        d.line([(cx-5,cy),(cx+5,cy)],fill=(0,255,0)); d.line([(cx,cy-5),(cx,cy+5)],fill=(0,255,0))
    out.save(OUT+'cmp-'+name+'.png'); print(name, f.size, box)
if __name__=='__main__':
    for n in sys.argv[1:]:
        make(n)

def pair(name,k=4,crop=None,suffix='',f=None,bgcol=BG):
    if f is None: f=frame(name)
    h,box=his(name)
    a=h; b=onbg(f,bgcol)
    if crop:
        a=a.crop(crop); b=b.crop(crop)
    W,H=a.size
    out=Image.new('RGB',(W*k*2+6,H*k),(255,0,0))
    out.paste(a.resize((W*k,H*k),Image.NEAREST),(0,0))
    out.paste(b.resize((W*k,H*k),Image.NEAREST),(W*k+6,0))
    out.save(OUT+'pair-'+name+suffix+'.png')

def diff(name,k=3,f=None):
    if f is None: f=frame(name)
    h,box=his(name)
    a=np.asarray(h).astype(float); b=np.asarray(onbg(f)).astype(float)
    d=np.abs(a-b).sum(-1)
    W,H=h.size
    hm=np.clip(d*2,0,255).astype(np.uint8)
    hmi=Image.fromarray(hm).convert('RGB')
    out=Image.new('RGB',(W*k*3+12,H*k),(255,0,0))
    out.paste(h.resize((W*k,H*k),Image.NEAREST),(0,0))
    out.paste(onbg(f).resize((W*k,H*k),Image.NEAREST),(W*k+6,0))
    out.paste(hmi.resize((W*k,H*k),Image.NEAREST),(2*W*k+12,0))
    out.save(OUT+'diff-'+name+'.png')
    return d.mean(), np.percentile(d,95)

def strip(name,anim,k=2,cols=None,suffix=''):
    m=man[name]; an=m['anims'][anim]; n=an['frames']
    fr=[frame(name,anim,i) for i in range(n)]
    W,H=fr[0].size
    cols=cols or n
    rows=(n+cols-1)//cols
    out=Image.new('RGB',(cols*(W*k+4),rows*(H*k+4)),(255,0,0))
    for i,f in enumerate(fr):
        out.paste(onbg(f).resize((W*k,H*k),Image.NEAREST),((i%cols)*(W*k+4),(i//cols)*(H*k+4)))
    out.save(OUT+'strip-'+name+'-'+anim+suffix+'.png')

def pinholes(name,anim):
    """Clear (alpha 0) pixels whose 8 neighbours are mostly opaque-ish (alpha>=128): pinholes."""
    m=man[name]; n=m['anims'][anim]['frames']
    res=[]
    for i in range(n):
        a=np.asarray(frame(name,anim,i))[...,3].astype(int)
        H,W=a.shape
        p=np.pad(a,1)
        nb=np.zeros_like(a)
        for dy in (-1,0,1):
            for dx in (-1,0,1):
                if dy or dx: nb+= (p[1+dy:1+dy+H,1+dx:1+dx+W]>=128)
        ph=(a==0)&(nb>=6)
        res.append(int(ph.sum()))
    return res

def holemap(name,anim,i,k=3,thr=6,suffix=''):
    f=frame(name,anim,i)
    a=np.asarray(f)[...,3].astype(int)
    H,W=a.shape
    p=np.pad(a,1)
    nb=np.zeros_like(a)
    for dy in (-1,0,1):
        for dx in (-1,0,1):
            if dy or dx: nb+= (p[1+dy:1+dy+H,1+dx:1+dx+W]>=128)
    ph=(a==0)&(nb>=thr)
    img=np.asarray(onbg(f)).copy()
    img[ph]=[255,0,255]
    out=Image.new('RGB',(W*k*2+6,H*k),(255,0,0))
    out.paste(onbg(f).resize((W*k,H*k),Image.NEAREST),(0,0))
    out.paste(Image.fromarray(img).resize((W*k,H*k),Image.NEAREST),(W*k+6,0))
    out.save(OUT+'holes-%s-%s%d%s.png'%(name,anim,i,suffix))
    return int(ph.sum())

def enclosed(name,anim,i,thr=1):
    from collections import deque
    a=np.asarray(frame(name,anim,i))[...,3]
    H,W=a.shape
    clear=a<thr
    seen=np.zeros_like(clear)
    q=deque()
    for y in range(H):
        for x in range(W):
            if (y in (0,H-1) or x in (0,W-1)) and clear[y,x]:
                seen[y,x]=True; q.append((y,x))
    while q:
        y,x=q.popleft()
        for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
            u,v=y+dy,x+dx
            if 0<=u<H and 0<=v<W and clear[u,v] and not seen[u,v]:
                seen[u,v]=True; q.append((u,v))
    return clear&~seen

def encmap(name,anim,i,k=3,crop=None,suffix=''):
    f=frame(name,anim,i)
    e=enclosed(name,anim,i)
    img=np.asarray(onbg(f)).copy(); img[e]=[255,0,255]
    a=onbg(f); b=Image.fromarray(img)
    if crop: a=a.crop(crop); b=b.crop(crop)
    W,H=a.size
    out=Image.new('RGB',(W*k*2+6,H*k),(255,0,0))
    out.paste(a.resize((W*k,H*k),Image.NEAREST),(0,0))
    out.paste(b.resize((W*k,H*k),Image.NEAREST),(W*k+6,0))
    out.save(OUT+'enc-%s-%s%d%s.png'%(name,anim,i,suffix))
