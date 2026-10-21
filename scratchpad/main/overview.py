# overview.py <slot> <out> <x0> <y0> <w> <h> <zoom> : rows = items, cols = body/pose combos (raw files from overview.ts)
import sys, os
from PIL import Image, ImageDraw
d, out, x0, y0, w, h, k = sys.argv[1], sys.argv[2], *map(int, sys.argv[3:8])
combos = open(d + '/combos.txt').read().split()
items = open(d + '/items.txt').read().split()
cw, ch = w * k + 6, h * k + 6
img = Image.new('RGB', (130 + len(combos) * cw, 18 + len(items) * ch), (44, 44, 52))
dr = ImageDraw.Draw(img)
for c, name in enumerate(combos): dr.text((130 + c * cw + 4, 3), name, fill=(220, 220, 230))
for r, iid in enumerate(items):
    dr.text((4, 18 + r * ch + ch // 2 - 6), iid, fill=(220, 220, 230))
    for c, name in enumerate(combos):
        raw = open(f'{d}/{iid}__{name}.raw', 'rb').read()
        sp = Image.frombytes('RGBA', (128, 128), raw).crop((x0, y0, x0 + w, y0 + h)).resize((w * k, h * k), Image.NEAREST)
        bg = Image.new('RGBA', sp.size, (58, 58, 68, 255)); bg.alpha_composite(sp)
        img.paste(bg.convert('RGB'), (130 + c * cw + 3, 18 + r * ch + 3))
img.save(out); print(img.size)
