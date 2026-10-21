import numpy as np
from PIL import Image, ImageDraw
ref=Image.open('art2/REF-wind-set-owner.jpg').convert('RGB')
A=[(440.1,798.4),(618.1,799.5)]
WAX,WAY=100,80
outs=[]
for k,(ax,ay) in enumerate(A):
    ox,oy=round(ax-WAX),round(ay-WAY)
    c=ref.crop((ox,oy,ox+190,oy+140)).resize((190*5,140*5),Image.NEAREST)
    d=ImageDraw.Draw(c)
    for x in range(0,190,10):
        d.line([(x*5,0),(x*5,700)],fill=(90,40,40)); d.text((x*5+1,1),str(x),fill=(255,120,120))
    for y in range(0,140,10):
        d.line([(0,y*5),(950,y*5)],fill=(90,40,40)); d.text((1,y*5+1),str(y),fill=(255,120,120))
    d.ellipse([(WAX*5-4,WAY*5-4),(WAX*5+4,WAY*5+4)],outline=(255,255,0))
    c.save(f'phx/cv{k}.png')
