import sys
from PIL import Image, ImageDraw
im = Image.open('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/REF-genjutsu-set-owner.jpg').convert('RGB')
def tile(name, box, k=8):
    c = im.crop(box).resize(((box[2]-box[0])*k, (box[3]-box[1])*k), Image.NEAREST)
    d = ImageDraw.Draw(c)
    for gx in range(box[0] - box[0] % 5 + 5, box[2], 5):
        X = (gx-box[0])*k
        d.line([(X,0),(X,c.height)], fill=(0,200,0) if gx % 10 == 0 else (0,80,0))
        if gx % 10 == 0: d.text((X+2,2), str(gx), fill=(0,255,0))
    for gy in range(box[1] - box[1] % 5 + 5, box[3], 5):
        Y = (gy-box[1])*k
        d.line([(0,Y),(c.width,Y)], fill=(0,200,0) if gy % 10 == 0 else (0,80,0))
        if gy % 10 == 0: d.text((2,Y+2), str(gy), fill=(0,255,0))
    c.save(name)
x0, y0, x1, y1, cols, rows, prefix = [int(v) for v in sys.argv[1:7]] + [sys.argv[7]]
tw = (x1-x0)//cols; th = (y1-y0)//rows
for j in range(rows):
    for i in range(cols):
        tile(f'tiles/{prefix}{j}{i}.png', (x0+i*tw, y0+j*th, x0+(i+1)*tw, y0+(j+1)*th))
