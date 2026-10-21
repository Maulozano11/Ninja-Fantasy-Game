# his crop (trimmed) region shown at Z with the 44-cell grid overlaid; labels in 44 coords
import sys
from PIL import Image, ImageDraw
src, out, x0, y0, x1, y1, N = sys.argv[1], sys.argv[2], *map(int, sys.argv[3:8])
im = Image.open(src).convert('RGB'); w,h = im.size
t = im.crop((1,1,w-1,h-1)); W,H = t.size
Z = int(__import__("os").environ.get("GZ","6"))
sx, sy = W/N, H/N
X0, Y0, X1, Y1 = round(x0*sx), round(y0*sy), round(x1*sx), round(y1*sy)
reg = t.crop((X0,Y0,X1,Y1)).resize(((X1-X0)*Z,(Y1-Y0)*Z), Image.LANCZOS)
c = Image.new('RGB', (reg.width+30, reg.height+30), (0,0,0)); c.paste(reg,(30,30))
d = ImageDraw.Draw(c)
for gx in range(x0, x1+1):
    px = 30 + (gx*sx - X0)*Z
    d.line([(px,30),(px,c.height)], fill=(255,60,60) if gx%5==0 else (70,70,70))
    if gx%5==0: d.text((px+1,2), str(gx), fill=(255,255,255))
for gy in range(y0, y1+1):
    py = 30 + (gy*sy - Y0)*Z
    d.line([(30,py),(c.width,py)], fill=(255,60,60) if gy%5==0 else (70,70,70))
    if gy%5==0: d.text((2,py+1), str(gy), fill=(255,255,255))
c.save(out)
