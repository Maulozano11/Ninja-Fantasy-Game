import json, numpy as np
from PIL import Image, ImageDraw, ImageFont
SP='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
OUT=SP+'/approve/'
WORK=SP+'/approve/_work/11-arboles/'
NEW_T=SP+'/art3/staging/trees'
OLD_T='/home/user/Ninja-Fantasy-Game/src/assets/world/trees'
NEW_P=SP+'/art3/staging/plants'
OLD_P='/home/user/Ninja-Fantasy-Game/src/assets/world/plants'
GROUND='/home/user/Ninja-Fantasy-Game/src/assets/maps/river_forest/ground.webp'
CHAR=SP+'/art3/char0.png'
FONT='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
FONTB='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
BG=(20,24,28,255)
BAR=(32,38,44,255)
TXT=(236,232,222,255)
SUB=(160,168,172,255)
GOLD=(222,184,96,255)
OLDC=(150,160,170,255)
NEWC=(140,214,120,255)
RED=(235,70,60,255)
def font(sz,bold=False): return ImageFont.truetype(FONTB if bold else FONT, sz)

_man={}
def manifest(d):
    if d not in _man: _man[d]=json.load(open(d+'/manifest.json'))['sprites']
    return _man[d]
_sheet={}
def frame(d,name,anim,f):
    m=manifest(d)[name]
    if (d,name) not in _sheet: _sheet[(d,name)]=Image.open(d+'/'+m['file']).convert('RGBA')
    a=m['anims'][anim]; fw,fh=m['frameW'],m['frameH']
    return _sheet[(d,name)].crop((f*fw,a['row']*fh,(f+1)*fw,(a['row']+1)*fh))

def bbox_union(frames):
    xs0=ys0=10**9; xs1=ys1=-1
    for fr in frames:
        b=fr.getchannel('A').getbbox()
        if b: xs0=min(xs0,b[0]); ys0=min(ys0,b[1]); xs1=max(xs1,b[2]); ys1=max(ys1,b[3])
    return xs0,ys0,xs1,ys1

# ---- ground texture: clean grass rectangle, mirror-tiled to any size
_g=None
def grass_tile():
    global _g
    if _g is None:
        g=Image.open(GROUND).convert('RGBA')
        _g=g.crop((0,440,900,830))  # plain grass, no path, little haze
    return _g
def ground(w,h,ox=0,oy=0):
    t=grass_tile(); tw,th=t.size
    variants={(0,0):t,(1,0):t.transpose(Image.FLIP_LEFT_RIGHT),(0,1):t.transpose(Image.FLIP_TOP_BOTTOM),
              (1,1):t.transpose(Image.FLIP_LEFT_RIGHT).transpose(Image.FLIP_TOP_BOTTOM)}
    nx=(w+ox)//tw+2; ny=(h+oy)//th+2
    big=Image.new('RGBA',(nx*tw,ny*th))
    for i in range(nx):
        for j in range(ny):
            # bottom row (j=0) is the unflipped tile; going up alternates flips
            big.paste(variants[(i%2,j%2)],(i*tw,(ny-1-j)*th))
    H=big.height
    return big.crop((ox,H-h-oy,ox+w,H-oy))
def water(w,h):
    g=Image.open(GROUND).convert('RGBA')
    return g.crop((1500,862,1500+w,862+h))

def ninja():
    c=Image.open(CHAR).convert('RGBA')
    b=c.getchannel('A').getbbox()
    return c.crop(b)   # feet on bottom row

def up(im,s): return im.resize((im.width*s,im.height*s),Image.NEAREST)

def text(draw,xy,s,sz,col=TXT,bold=False,anchor='la'):
    draw.text(xy,s,font=font(sz,bold),fill=col,anchor=anchor)
def tw(s,sz,bold=False):
    return font(sz,bold).getbbox(s)[2]

def tag(img,xy,s,col,sz=17):
    d=ImageDraw.Draw(img)
    f=font(sz,True); b=f.getbbox(s)
    x,y=xy; pw=b[2]+16; ph=sz+12
    d.rounded_rectangle((x,y,x+pw,y+ph),radius=5,fill=(16,20,24,235),outline=col,width=2)
    d.text((x+8,y+5),s,font=f,fill=col)
    return pw,ph

def title_bar(img,num,title,subtitle):
    d=ImageDraw.Draw(img)
    d.rectangle((0,0,img.width,92),fill=BAR)
    d.rectangle((0,92,img.width,94),fill=GOLD)
    text(d,(24,14),num,34,GOLD,True)
    x=24+tw(num,34,True)+16
    text(d,(x,14),title,34,TXT,True)
    text(d,(26,60),subtitle,18,SUB)

def save_png(img,path):
    img.convert('RGB').save(path,optimize=True)
