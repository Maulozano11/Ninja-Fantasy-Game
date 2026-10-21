"""Try PAINT patches from a text file before putting them in the study script.

  python3 -I tryp.py <which> <patchfile> x0 y0 x1 y1 k out.png

The patch file: blocks starting with a line 'PART x0 y0' (PART a part name or None), then rows.
Renders the composite with the patches over the given box at k, with a 5-px grid, and her native
picture beside it scaled to the same height.
"""
import importlib.util
import os
import sys
sys.path.insert(0, os.path.abspath('tools/refs'))
import numpy as np
from PIL import Image, ImageDraw

spec = importlib.util.spec_from_file_location('study', 'tools/refs/heroine-study.py')
S = importlib.util.module_from_spec(spec)
spec.loader.exec_module(S)
import heroine_ref as R

which, pf = sys.argv[1], sys.argv[2]
x0, y0, x1, y1, k = map(int, sys.argv[3:8])
out = sys.argv[8]
patches = []
cur = None
for line in open(pf):
    line = line.rstrip('\n')
    if not line.strip() or line.startswith('#'):
        continue
    if line.startswith('@'):
        name, px, py = line[1:].split()
        cur = (None if name == 'None' else name, int(px), int(py), [])
        patches.append(cur)
    else:
        cur[3].append(line.strip().strip("',"))
S.PAINT[which] = S.PAINT.get(which, []) + patches
N, Q, M, idx, part, lay = S.build(which)
rgba = S.to_rgba(which, idx)
bx, by = S.BOX[:2]
full = np.zeros((256, 256, 4), np.uint8)
full[by:by + rgba.shape[0], bx:bx + rgba.shape[1]] = rgba
sub = full[y0:y1, x0:x1].astype(float)
al = sub[..., 3:4] / 255
img = (sub[..., :3] * al + np.array([236, 236, 240]) * (1 - al)).astype(np.uint8)
Mg = 28
im = Image.fromarray(img).resize(((x1 - x0) * k, (y1 - y0) * k), Image.NEAREST)
c = Image.new('RGB', (im.width + Mg, im.height + Mg), (255, 255, 255))
c.paste(im, (Mg, Mg))
d = ImageDraw.Draw(c)
for x in range(x0, x1 + 1):
    if x % 5 == 0:
        X = Mg + (x - x0) * k
        d.line((X, Mg, X, c.height), fill=(255, 0, 255) if x % 10 == 0 else (150, 210, 255), width=1)
        if x % 10 == 0:
            d.text((X + 1, 2), str(x), fill=(0, 0, 0))
for y in range(y0, y1 + 1):
    if y % 5 == 0:
        Y = Mg + (y - y0) * k
        d.line((Mg, Y, c.width, Y), fill=(255, 0, 255) if y % 10 == 0 else (150, 210, 255), width=1)
        if y % 10 == 0:
            d.text((1, Y + 1), str(y), fill=(0, 0, 0))
c.save(out)
# a 1:1-ish look: the whole figure at 4x beside her picture at the same height
oy, ox = np.nonzero(full[..., 3])
fig = full[oy.min():oy.max() + 1, ox.min():ox.max() + 1]
a = fig.astype(float)
al = a[..., 3:4] / 255
a = (a[..., :3] * al + np.array([236, 236, 240]) * (1 - al)).astype(np.uint8)
ours = Image.fromarray(a).resize((fig.shape[1] * 4, fig.shape[0] * 4), Image.NEAREST)
Nn = R.native(which).astype(np.uint8)
F = R.figure(which)
yy, xx = np.nonzero(F)
hisf = Nn[yy.min():yy.max() + 1, xx.min():xx.max() + 1]
hi = Image.fromarray(hisf)
hi = hi.resize((round(hi.width * ours.height / hi.height), ours.height), Image.NEAREST)
cc = Image.new('RGB', (hi.width + ours.width + 20, ours.height), (255, 255, 255))
cc.paste(hi, (0, 0))
cc.paste(ours, (hi.width + 20, 0))
cc.save(out.replace('.png', '-side.png'))
