import sys, numpy as np
from PIL import Image, ImageDraw
# his crop, smooth, with the N-grid overlaid (lines every `step` cells). usage: hgrid.py in.png out.png N Z step [x0 y0 x1 y1 in N-coords]
src, out, N, Z, step = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5])
im = Image.open(src).convert('RGB')
im = im.crop((1,1,im.size[0]-1,im.size[1]-1))
box = tuple(map(int, sys.argv[6:10])) if len(sys.argv) > 6 else (0,0,N,N)
big = im.resize((N*Z, N*Z), Image.BICUBIC).crop((box[0]*Z, box[1]*Z, box[2]*Z, box[3]*Z))
w, h = box[2]-box[0], box[3]-box[1]
M = 22
c = Image.new('RGB', (w*Z+M, h*Z+M), (20,20,24))
c.paste(big, (M, M))
d = ImageDraw.Draw(c)
for i in range(w+1):
    gx = box[0]+i
    if gx % step: continue
    x = M+i*Z
    d.line([(x, M), (x, M+h*Z)], fill=(255,0,255) if gx % (step*2) == 0 else (255,255,0), width=1)
    d.text((x+1, 2), str(gx), fill=(255,255,255))
for j in range(h+1):
    gy = box[1]+j
    if gy % step: continue
    y = M+j*Z
    d.line([(M, y), (M+w*Z, y)], fill=(255,0,255) if gy % (step*2) == 0 else (255,255,0), width=1)
    d.text((1, y+1), str(gy), fill=(255,255,255))
c.save(out)
