import json
from PIL import Image, ImageDraw
import numpy as np
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
A=S+'/art2/'; ST=A+'staging/vfx_poison_v3/'; O=A+'review-poison-set-r3/'
ch=Image.open(A+'vfx-poison-v3-character.png').convert('RGBA')
ab=Image.open(ST+'aura_back.png').convert('RGBA'); af=Image.open(ST+'aura.png').convert('RGBA')
Z=6; c=(30,108,94,134)
tiles=[]
for i in range(12):
    b=Image.new('RGBA',(94,145),(70,110,50,255))
    b.alpha_composite(ab.crop((i*94,0,(i+1)*94,145))); b.alpha_composite(ch,(47-64,123-120)); b.alpha_composite(af.crop((i*94,0,(i+1)*94,145)))
    t=b.convert('RGB').crop(c).resize(((c[2]-c[0])*Z,(c[3]-c[1])*Z),Image.NEAREST)
    d=ImageDraw.Draw(t)
    # mark slit
    d.text((2,2),f'aura f{i} (back+char+front, grass)',fill=(255,255,0))
    tiles.append(t)
w,h=tiles[0].size
out=Image.new('RGB',(4*(w+4),3*(h+4)+20),(0,0,0))
dd=ImageDraw.Draw(out); dd.text((4,4),'MAJOR: aura_back row 123 opens a 1px see-through slit (x 57-71, x 8-12) on frames 3-8 - flickers under the feet',fill=(255,80,80))
for k,t in enumerate(tiles): out.paste(t,((k%4)*(w+4),20+(k//4)*(h+4)))
out.save(O+'review-poison-r3-majors.png')
