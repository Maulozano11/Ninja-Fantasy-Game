"""vsheet.py dir out k title cols: v<i>.png tiles with labels.json, Spanish labels."""
import json
import os
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

d, out, k, title, cols = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4], int(sys.argv[5])
labels = json.load(open(os.path.join(d, 'labels.json')))


def font(size):
    for p in ('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',):
        try:
            return ImageFont.truetype(p, size)
        except OSError:
            pass
    return ImageFont.load_default()


F, T = font(20), font(28)
tiles = []
for i, lab in enumerate(labels):
    a = np.asarray(Image.open(os.path.join(d, f'v{i}.png')).convert('RGBA'))
    bg = np.full(a.shape[:2] + (3,), (226, 226, 232), np.uint8)
    m = a[..., 3] > 0
    bg[m] = a[m, :3]
    tiles.append((lab, Image.fromarray(bg).resize((a.shape[1] * k, a.shape[0] * k), Image.NEAREST)))
tw, th = tiles[0][1].size
rows = (len(tiles) + cols - 1) // cols
im = Image.new('RGB', (20 + cols * (tw + 16), 56 + rows * (th + 34)), (255, 255, 255))
dr = ImageDraw.Draw(im)
dr.text((16, 12), title, fill=(20, 20, 30), font=T)
for i, (lab, t) in enumerate(tiles):
    x = 16 + (i % cols) * (tw + 16)
    y = 56 + (i // cols) * (th + 34)
    dr.text((x, y), lab, fill=(20, 20, 30), font=F)
    im.paste(t, (x, y + 28))
im.save(out)
