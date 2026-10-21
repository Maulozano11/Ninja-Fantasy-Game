import sys, numpy as np
from PIL import Image
src, out, scale, bgname = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4]
frames = [int(x) for x in sys.argv[5].split(',')]
im = np.array(Image.open(src).convert('RGBA')).astype(float)
fw, fh = 127, 93
bg = {'grass': (92,104,82), 'dark': (32,31,39)}[bgname]
tiles = []
for f in frames:
    t = im[:fh, f*fw:(f+1)*fw]
    a = t[..., 3:4]/255
    rgb = t[..., :3]*a + np.array(bg)*(1-a)
    tiles.append(rgb)
    tiles.append(np.full((fh, 2, 3), 255.0))
row = np.concatenate(tiles, 1).astype(np.uint8)
Image.fromarray(row).resize((row.shape[1]*scale, row.shape[0]*scale), Image.NEAREST).save(out)
