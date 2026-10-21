import sys, numpy as np
from PIL import Image, ImageDraw
# usage: grid.py in.png out.png N scale [crop x0 y0 x1 y1]
src, out, N, Z = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
im = Image.open(src).convert('RGB')
if im.size != (N, N):
    im = im.crop((1,1,im.size[0]-1,im.size[1]-1)).resize((N, N), Image.BOX)
box = tuple(map(int, sys.argv[5:9])) if len(sys.argv) > 5 else (0,0,N,N)
im = im.crop(box)
w, h = im.size
M = 22
big = Image.new('RGB', (w*Z+M, h*Z+M), (20,20,24))
big.paste(im.resize((w*Z, h*Z), Image.NEAREST), (M, M))
d = ImageDraw.Draw(big)
for i in range(w+1):
    x = M+i*Z; gx = box[0]+i
    d.line([(x, M), (x, M+h*Z)], fill=(255,0,255) if gx%4==0 else (60,60,60), width=1)
    if gx % 4 == 0 and i < w: d.text((x+1, 2), str(gx), fill=(255,255,255))
for j in range(h+1):
    y = M+j*Z; gy = box[1]+j
    d.line([(M, y), (M+w*Z, y)], fill=(255,0,255) if gy%4==0 else (60,60,60), width=1)
    if gy % 4 == 0 and j < h: d.text((1, y+1), str(gy), fill=(255,255,255))
big.save(out)
