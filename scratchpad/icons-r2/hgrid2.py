import sys
from PIL import Image, ImageDraw
# his crop smooth (bicubic) with every N-pixel cell outlined faintly; labels every 2. usage: in out N Z x0 y0 x1 y1
src, out, N, Z = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
x0,y0,x1,y1 = map(int, sys.argv[5:9])
im = Image.open(src).convert('RGB')
if im.size[0] > N: im = im.crop((1,1,im.size[0]-1,im.size[1]-1))
rs = Image.BICUBIC if im.size[0] > N else Image.NEAREST
big = im.resize((N*Z, N*Z), rs).crop((x0*Z, y0*Z, x1*Z, y1*Z))
M = 24
c = Image.new('RGB', (big.size[0]+M, big.size[1]+M), (20,20,24))
c.paste(big, (M, M))
d = ImageDraw.Draw(c, 'RGBA')
for gx in range(x0, x1+1):
    x = M+(gx-x0)*Z
    d.line([(x, M), (x, c.size[1])], fill=(255,0,255,200) if gx%4==0 else (255,255,255,60))
    if gx % 2 == 0 and gx < x1: d.text((x+2, 4), str(gx), fill=(255,255,255))
for gy in range(y0, y1+1):
    y = M+(gy-y0)*Z
    d.line([(M, y), (c.size[0], y)], fill=(255,0,255,200) if gy%4==0 else (255,255,255,60))
    if gy % 2 == 0 and gy < y1: d.text((2, y+2), str(gy), fill=(255,255,255))
c.save(out)
