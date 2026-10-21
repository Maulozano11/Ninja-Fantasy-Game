# Finds the frame rectangles of a strip (frames have a 2px (90,86,110) border) and saves each frame.
import sys, os
import numpy as np
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
im = Image.open(src).convert('RGB')
a = np.array(im).astype(int)
border = (abs(a[..., 0] - 90) < 3) & (abs(a[..., 1] - 86) < 3) & (abs(a[..., 2] - 110) < 3)
# rows where a long horizontal border run exists
H, W = border.shape
rows = [y for y in range(H) if border[y].sum() > 1500]
# group consecutive
groups = []
for y in rows:
    if groups and y - groups[-1][-1] <= 2:
        groups[-1].append(y)
    else:
        groups.append([y])
ys = [g[0] for g in groups]
print('border rows', ys)
# pairs top/bottom
n = 0
for i in range(0, len(ys) - 1, 2):
    y0, y1 = ys[i], ys[i + 1]
    line = border[y0]
    xs = np.where(line)[0]
    # split into segments
    segs = []
    s = xs[0]
    p = xs[0]
    for x in xs[1:]:
        if x != p + 1:
            segs.append((s, p)); s = x
        p = x
    segs.append((s, p))
    segs = [sg for sg in segs if sg[1] - sg[0] > 200]
    for j, (x0, x1) in enumerate(segs):
        fr = im.crop((x0 + 2, y0 + 2, x1 - 1, y1 - 1))
        # caption below
        cap = im.crop((x0, y1, x1, min(H, y1 + 170)))
        both = Image.new('RGB', (fr.width, fr.height + cap.height))
        both.paste(fr, (0, 0)); both.paste(cap, (0, fr.height))
        both.save(f'{out}/r{i//2}_f{j}.png')
        n += 1
print(n, 'frames')
