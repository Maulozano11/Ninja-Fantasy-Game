import sys, numpy as np
from PIL import Image, ImageDraw
F = np.load(sys.argv[1]); out = sys.argv[2]
x0, y0, x1, y1 = 24, 18, 196, 130
sc = 2
tiles = []
for i, f in enumerate(F):
    f = f.copy()
    r, g, b = f[..., 0].astype(int), f[..., 1].astype(int), f[..., 2].astype(int)
    pur = (r > g + 4) & (b > g + 4)
    body = (f[..., 3] == 255) & ~pur
    bg = Image.new('RGBA', (f.shape[1], f.shape[0]), (31, 33, 46, 255))
    m = f.copy(); m[body] = (70, 74, 70, 255)
    bg.alpha_composite(Image.fromarray(m, 'RGBA'))
    t = bg.crop((x0, y0, x1, y1)).convert('RGB').resize(((x1 - x0) * sc, (y1 - y0) * sc), Image.NEAREST)
    ImageDraw.Draw(t).text((3, 3), f'f{i}', fill=(255, 255, 255))
    tiles.append(t)
W_, H_ = tiles[0].size
img = Image.new('RGB', (W_ * 4 + 12, H_ * 2 + 4), (255, 255, 255))
for i, t in enumerate(tiles):
    img.paste(t, ((i % 4) * (W_ + 4), (i // 4) * (H_ + 4)))
img.save(out)
