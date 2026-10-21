import sys
from PIL import Image, ImageDraw
src, out, z = sys.argv[1], sys.argv[2], int(sys.argv[3])
im = Image.open(src).convert('RGB')
w, h = im.size
big = im.resize((w*z, h*z), Image.NEAREST)
c = Image.new('RGB', (w*z+30, h*z+30), (10,10,10))
c.paste(big, (30, 30))
d = ImageDraw.Draw(c)
for i in range(0, max(w,h)):
    col = (90,90,90) if i % 5 else (200,60,60)
    if i < w: d.line([(30+i*z, 30), (30+i*z, 30+h*z)], fill=col if i%5==0 else (40,40,40))
    if i < h: d.line([(30, 30+i*z), (30+w*z, 30+i*z)], fill=col if i%5==0 else (40,40,40))
    if i % 5 == 0:
        if i < w: d.text((30+i*z+1, 2), str(i), fill=(255,255,255))
        if i < h: d.text((2, 30+i*z+1), str(i), fill=(255,255,255))
c.save(out)
