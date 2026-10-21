from PIL import Image, ImageDraw
import numpy as np, sys
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/'
OUT=S+'art2/review-beast-r3/'
ref=Image.open(S+'art2/REF-earth-set-owner.jpg').convert('RGB')
sheet=Image.open(S+'art2/staging/vfx_beasts/earth.png').convert('RGBA')
W,H=287,167; ax,ay=160,82; s=96/228
BG=(34,34,44)
def his(cx,cy,maskleft=None,maskright=None):
    r=ref.copy()
    d=ImageDraw.Draw(r)
    if maskleft: d.rectangle((0,0,maskleft,2000),fill=BG)
    if maskright: d.rectangle((maskright,0,2000,2000),fill=BG)
    # also mask outside the panel border
    L=cx-ax/s; T=cy-ay/s
    box=(L,T,L+W/s,T+H/s)
    return r.resize((W,H),Image.BOX,box=box)
def ours(f):
    fr=sheet.crop((f*W,0,(f+1)*W,H))
    bg=Image.new('RGBA',(W,H),BG+(255,))
    bg.alpha_composite(fr)
    return bg.convert('RGB')
h0=his(792,1755,maskright=1118); h5=his(1448,1755,maskleft=1118)
h0.save(OUT+'his-f0-game.png'); h5.save(OUT+'his-f5-game.png')
def sbs(a,b,name,k=3,crop=None):
    if crop: a=a.crop(crop); b=b.crop(crop)
    w,h=a.size
    c=Image.new('RGB',(w*2*k+6,h*k),(255,255,255))
    c.paste(a.resize((w*k,h*k),Image.NEAREST),(0,0))
    c.paste(b.resize((w*k,h*k),Image.NEAREST),(w*k+6,0))
    c.save(OUT+name)
sbs(h0,ours(0),'sbs-f0-3x.png')
sbs(h5,ours(5),'sbs-f5-3x.png')
