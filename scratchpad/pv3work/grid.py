import sys
from PIL import Image, ImageDraw
x0,y0,x1,y1,k=[int(v) for v in sys.argv[1:6]]
out=sys.argv[6]
im=Image.open('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/REF-poison-set-owner.jpg').convert('RGB').crop((x0,y0,x1,y1))
im=im.resize(((x1-x0)*k,(y1-y0)*k),Image.NEAREST)
d=ImageDraw.Draw(im)
for x in range((x0//10+1)*10,x1,10):
    d.line([((x-x0)*k,0),((x-x0)*k,im.height)],fill=(255,255,0) if x%50==0 else (110,110,0))
    if x%50==0: d.text(((x-x0)*k+2,2),str(x),fill=(255,255,0))
for y in range((y0//10+1)*10,y1,10):
    d.line([(0,(y-y0)*k),(im.width,(y-y0)*k)],fill=(0,255,255) if y%50==0 else (0,110,110))
    d.text((2,(y-y0)*k+2),str(y),fill=(0,255,255))
im.save(out)
