"""Crops round a joint of each shot: python3 -I joint_crops.py <out.png> <k> <joint> <half> <cols> <shot.png=label> ..."""
import sys, json
import numpy as np
from PIL import Image, ImageDraw, ImageFont

out, k, joint, half, cols = sys.argv[1], int(sys.argv[2]), sys.argv[3], int(sys.argv[4]), int(sys.argv[5])
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 16)
tiles = []
for a in sys.argv[6:]:
    p, label = a.split('=', 1)
    J = json.load(open(p[:-4] + '.json'))
    x, y = (int(v) for v in J[joint])
    im = np.asarray(Image.open(p).convert('RGBA')).copy()
    im[im[..., 3] == 0] = (226, 226, 232, 255)
    c = im[max(0, y - half):y + half, max(0, x - half):x + half]
    t = Image.fromarray(c, 'RGBA').resize((c.shape[1] * k, c.shape[0] * k), Image.NEAREST)
    T = Image.new('RGBA', (2 * half * k, 2 * half * k + 24), (255, 255, 255, 255))
    T.paste(t, (0, 24))
    ImageDraw.Draw(T).text((3, 3), label, fill=(20, 20, 30, 255), font=font)
    tiles.append(T)
w, h = tiles[0].size
rows = (len(tiles) + cols - 1) // cols
S = Image.new('RGBA', (cols * (w + 4) + 4, rows * (h + 4) + 4), (255, 255, 255, 255))
for i, t in enumerate(tiles):
    S.paste(t, (4 + (i % cols) * (w + 4), 4 + (i // cols) * (h + 4)))
S.save(out)
print(out, S.size)
