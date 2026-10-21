import sys
from PIL import Image, ImageDraw
d, out, x0, y0, w, h, k, cols = sys.argv[1], sys.argv[2], *map(int, sys.argv[3:9])
names = [l.split('|') for l in open(d + '/list.txt').read().splitlines()]
rows = (len(names) + cols - 1) // cols
cw, ch = w * k + 8, h * k + 20
img = Image.new('RGB', (cols * cw, rows * ch), (44, 44, 52))
dr = ImageDraw.Draw(img)
for n, (iid, name) in enumerate(names):
    raw = open(f'{d}/{iid}.raw', 'rb').read()
    sp = Image.frombytes('RGBA', (128, 128), raw).crop((x0, y0, x0 + w, y0 + h)).resize((w * k, h * k), Image.NEAREST)
    bg = Image.new('RGBA', sp.size, (58, 58, 68, 255))
    bg.alpha_composite(sp)
    cx, cy = (n % cols) * cw, (n // cols) * ch
    img.paste(bg.convert('RGB'), (cx + 4, cy + 18))
    dr.text((cx + 4, cy + 3), iid, fill=(220, 220, 230))
img.save(out)
print(img.size)
