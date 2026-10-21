import sys
from PIL import Image, ImageDraw
import numpy as np
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
O=S+'/art2/review-beast-r2/'
ref=Image.open(S+'/art2/REF-earth-set-owner.jpg').convert('RGB')
sheet=Image.open(S+'/art2/staging/vfx_beasts/earth.png').convert('RGBA')
W,H=280,163; s=96/228
AX,AY=151,78
PAN=(34,34,44)
def his(torso):
    x0=torso[0]-AX/s; y0=torso[1]-AY/s
    return ref.resize((W,H),Image.BOX,box=(x0,y0,x0+W/s,y0+H/s))
def ours(i,bg=PAN):
    f=sheet.crop((i*W,0,i*W+W,H))
    c=Image.new('RGBA',(W,H),bg+(255,)); c.alpha_composite(f); return c.convert('RGB')
h0=his((792,1755)); h5=his((1448,1755))
h0.save(O+'n-his0-game.png'); h5.save(O+'n-his5-game.png')
for k,h in ((0,h0),(5,h5)):
    o=ours(k)
    Z=3
    out=Image.new('RGB',(W*Z*2+12,H*Z),(255,255,255))
    out.paste(h.resize((W*Z,H*Z),Image.NEAREST),(0,0))
    out.paste(o.resize((W*Z,H*Z),Image.NEAREST),(W*Z+12,0))
    d=ImageDraw.Draw(out)
    for xo in (0,W*Z+12):
        d.line([(xo+AX*Z,AY*Z-6),(xo+AX*Z,AY*Z+6)],fill=(255,0,255))
        d.line([(xo+AX*Z-6,AY*Z),(xo+AX*Z+6,AY*Z)],fill=(255,0,255))
        d.line([(xo,159*Z+Z),(xo+W*Z,159*Z+Z)],fill=(0,255,255))
    out.save(O+f'n-sbs-f{k}-3x.png')
