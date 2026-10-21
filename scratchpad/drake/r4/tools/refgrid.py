import sys
from PIL import Image, ImageDraw
REF='/home/user/Ninja-Fantasy-Game/docs/reference/earth-set-owner-reference.jpg'
def grid(x0,y0,x1,y1,k,path,polys=(),step=10):
    im=Image.open(REF).convert('RGB')
    c=im.crop((x0,y0,x1,y1)).resize(((x1-x0)*k,(y1-y0)*k),Image.NEAREST)
    d=ImageDraw.Draw(c)
    for gy in range((y0//step)*step,y1,step):
        if gy<y0: continue
        d.line([(0,(gy-y0)*k),(c.width,(gy-y0)*k)],fill=(255,0,0) if gy%50==0 else (80,0,0))
        if gy%20==0: d.text((2,(gy-y0)*k+1),str(gy),fill=(255,255,0))
    for gx in range((x0//step)*step,x1,step):
        if gx<x0: continue
        d.line([((gx-x0)*k,0),((gx-x0)*k,c.height)],fill=(255,0,0) if gx%50==0 else (80,0,0))
        if gx%20==0: d.text(((gx-x0)*k+1,2),str(gx),fill=(255,255,0))
    for pts,col in polys:
        d.line([((x-x0)*k,(y-y0)*k) for x,y in pts],fill=col,width=2)
    c.save(path)
