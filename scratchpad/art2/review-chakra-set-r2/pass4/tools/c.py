import json, numpy as np
from PIL import Image
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
ST=S+'/art2/staging/vfx_chakra_v3'
R=S+'/art2/review-chakra-set-r2/pass4'
MAN=json.load(open(ST+'/manifest.json'))
REF=Image.open(S+'/art2/REF-chakra-set-owner.jpg').convert('RGB')
REFA=np.asarray(REF).astype(float)
BG=(30,29,37)
def frames(name, anim):
    sp=MAN['sprites'][name]; a=sp['anims'][anim]
    sheet=Image.open(ST+'/'+sp['file']).convert('RGBA')
    fw,fh=sp['frameW'],sp['frameH']
    return [sheet.crop((i*fw,a['row']*fh,(i+1)*fw,(a['row']+1)*fh)) for i in range(a['frames'])]
def up(im,k=3): return im.resize((im.width*k,im.height*k),Image.NEAREST)
def over(im,bg=BG):
    b=Image.new('RGBA',im.size,tuple(bg)+(255,)); b.alpha_composite(im); return b.convert('RGB')
def lum(a): return 0.299*a[...,0]+0.587*a[...,1]+0.114*a[...,2]
def light(im):
    a=np.asarray(im).astype(float)/255
    return float((a[...,3]*lum(a)).mean()*1000)
def row(ims,gap=4,bg=(60,60,70)):
    W=sum(i.width for i in ims)+gap*(len(ims)-1); H=max(i.height for i in ims)
    o=Image.new('RGB',(W,H),bg); x=0
    for i in ims: o.paste(i.convert('RGB'),(x,0)); x+=i.width+gap
    return o
def col(ims,gap=4,bg=(60,60,70)):
    W=max(i.width for i in ims); H=sum(i.height for i in ims)+gap*(len(ims)-1)
    o=Image.new('RGB',(W,H),bg); y=0
    for i in ims: o.paste(i.convert('RGB'),(0,y)); y+=i.height+gap
    return o
CHAR=Image.open(S+'/chakra5/char.png').convert('RGBA')
def withchar(back, front, anchor, bgcol=BG, cx=0):
    w,h=back.size
    base=Image.new('RGBA',(w,h),tuple(bgcol)+(255,))
    base.alpha_composite(back)
    ch=Image.new('RGBA',(w,h),(0,0,0,0))
    ch.paste(CHAR,(anchor[0]-64+cx,anchor[1]-120),CHAR)
    base.alpha_composite(ch)
    if front is not None: base.alpha_composite(front)
    return base.convert('RGB')
