import json, numpy as np
from PIL import Image
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/'
D=S+'art2/staging/creatures/'
W=S+'approve/_work/01-hidra/'
OUT=S+'approve/'
man=json.load(open(D+'manifest.json'))['sprites']
rig=json.load(open(D+'hydra.json'))
_sheets={}
def sheet(name):
    if name not in _sheets: _sheets[name]=Image.open(D+man[name]['file']).convert('RGBA')
    return _sheets[name]
def frame(name, anim, f):
    s=man[name]; a=s['anims'][anim]; fw,fh=s['frameW'],s['frameH']
    assert 0<=f<a['frames'], (name,anim,f)
    return sheet(name).crop((f*fw, a['row']*fh, (f+1)*fw, (a['row']+1)*fh))
def anim_info(name, anim): return man[name]['anims'][anim]

ORIGIN=(400,520)  # body anchor position on the work canvas
CW,CH=900,700
def compose(body=('idle',0), heads=None, follow=True):
    """heads: list of 7 entries: ('neck', anim, f) | ('stump', anim, f) | ('stump+neck', stumpanim, sf, anim, f) | None"""
    if heads is None: heads=[('neck','idle',0)]*7
    can=Image.new('RGBA',(CW,CH),(0,0,0,0))
    ba,bf=body
    fo=(0,0)
    if follow and ba in rig['follow']: fo=tuple(rig['follow'][ba][bf])
    def put(name, anim, f, ax, ay):
        s=man[name]; im=frame(name,anim,f)
        can.alpha_composite(im, (ax-s['anchor'][0], ay-s['anchor'][1]))
    def draw_head(i):
        h=rig['heads'][i]; st=heads[i]
        if st is None: return
        ax=ORIGIN[0]+h['attach'][0]+fo[0]; ay=ORIGIN[1]+h['attach'][1]+fo[1]
        if st[0]=='neck': put(h['sprite'],st[1],st[2],ax,ay)
        elif st[0]=='stump': put(rig['stump'],st[1],st[2],ax,ay)
        elif st[0]=='stump+neck':
            put(rig['stump'],st[1],st[2],ax,ay); put(h['sprite'],st[3],st[4],ax,ay)
    for i,h in enumerate(rig['heads']):
        if h['layer']=='back': draw_head(i)
    put(rig['body'],ba,bf,ORIGIN[0],ORIGIN[1])
    for i,h in enumerate(rig['heads']):
        if h['layer']=='front': draw_head(i)
    return can
def bbox_union(ims):
    bb=None
    for im in ims:
        b=im.getchannel('A').getbbox()
        if b is None: continue
        bb=b if bb is None else (min(bb[0],b[0]),min(bb[1],b[1]),max(bb[2],b[2]),max(bb[3],b[3]))
    return bb
def nn(im,k): return im.resize((im.width*k, im.height*k), Image.NEAREST)

def character():
    """The real character sprite (Solen) cropped from the artist's kit preview (scale 2, flat background)."""
    im=np.array(Image.open(S+'art2/creatures.png').convert('RGBA'))[:480,:300].copy()
    bgs=[(93,107,87),(74,90,60)]
    mask=np.ones(im.shape[:2],bool)
    for c in bgs: mask&=~np.all(im[:,:,:3]==c,axis=2)
    im[~mask]=0
    one=Image.fromarray(im[0::2,0::2])  # 2x2 blocks are aligned at (0,0)
    bb=one.getchannel('A').getbbox(); one=one.crop(bb)
    # kit preview(): character grid drawn at x=16 (pad) with CHARACTER_FEET=(64,120) on the ground line y=220 (1x)
    return one,(16+64-bb[0], 220-bb[1])

GROUND='/home/user/Ninja-Fantasy-Game/src/assets/maps/river_forest/ground.webp'
def ground_crop(x0,y0,w,h):
    g=Image.open(GROUND).convert('RGBA')
    return g.crop((x0,y0,x0+w,y0+h))

def cum_durations(times_ms, total_ms):
    """event start times (ms, ascending, first=0) -> per-frame durations rounded to 10 ms without drift"""
    ts=list(times_ms)+[total_ms]
    r=[int(round(t/10.0))*10 for t in ts]
    return [r[i+1]-r[i] for i in range(len(ts)-1)]

def save_gif(frames, durations, path):
    """frames: list of opaque RGB(A) PIL images; one shared palette, no dithering"""
    fr=[f.convert('RGB') for f in frames]
    w,h=fr[0].size
    big=Image.new('RGB',(w,h*len(fr)))
    for i,f in enumerate(fr): big.paste(f,(0,i*h))
    pal=big.quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    q=[f.quantize(palette=pal, dither=Image.Dither.NONE) for f in fr]
    q[0].save(path, save_all=True, append_images=q[1:], duration=durations, loop=0, disposal=2, optimize=False)
    return q

def contact_strip(path, out, k=1, cols=8, maxw=3600):
    g=Image.open(path); fr=[]; du=[]
    try:
        while True:
            fr.append(g.convert('RGB').copy()); du.append(g.info.get('duration')); g.seek(g.tell()+1)
    except EOFError: pass
    w,h=fr[0].size
    sc=1
    while cols*w//sc>maxw: sc+=1
    tw,th=w//sc,h//sc
    rows=(len(fr)+cols-1)//cols
    from PIL import ImageDraw, ImageFont
    F=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',16)
    sheet=Image.new('RGB',(cols*(tw+4)+4, rows*(th+24)+4),(20,24,28))
    d=ImageDraw.Draw(sheet)
    for i,f in enumerate(fr):
        x=4+(i%cols)*(tw+4); y=4+(i//cols)*(th+24)
        sheet.paste(f.resize((tw,th),Image.NEAREST),(x,y+20))
        d.text((x,y),f'{i}: {du[i]} ms',font=F,fill=(230,230,230))
    sheet.save(out)
    return len(fr), du
