"""strip.py <earth.png> <out.png> [frames csv] [zoom] [crop x0,y0,x1,y1]: frames on the panel colour, nearest-neighbour."""
import sys
import numpy as np
from PIL import Image, ImageDraw
im = Image.open(sys.argv[1]).convert('RGBA')
fw, fh = int(__import__("os").environ.get("FW", 284)), int(__import__("os").environ.get("FH", 167))
n = im.width // fw
fr = [int(v) for v in sys.argv[3].split(',')] if len(sys.argv) > 3 and sys.argv[3] else list(range(n))
Z = int(sys.argv[4]) if len(sys.argv) > 4 else 2
box = [int(v) for v in sys.argv[5].split(',')] if len(sys.argv) > 5 and sys.argv[5] else [0, 0, fw, fh]
w, h = box[2] - box[0], box[3] - box[1]
cols = int(sys.argv[6]) if len(sys.argv) > 6 else len(fr)
rows = (len(fr) + cols - 1) // cols
out = Image.new('RGB', ((w * Z + 4) * cols, (h * Z + 4) * rows), (255, 255, 255))
for j, i in enumerate(fr):
    bg = Image.new('RGBA', (fw, fh), (34, 34, 44, 255))
    bg.alpha_composite(im.crop((i * fw, 0, (i + 1) * fw, fh)))
    t = bg.crop(box).convert('RGB').resize((w * Z, h * Z), Image.NEAREST)
    ImageDraw.Draw(t).text((3, 3), str(i), fill=(255, 255, 0))
    out.paste(t, ((j % cols) * (w * Z + 4), (j // cols) * (h * Z + 4)))
out.save(sys.argv[2])
