"""cmp.py <render.png> <bare.png> <out.png>: our render (idle male with the upper items) beside the
reduced reference, at 8x, and a third panel marking (red) pixels of the reduced reference's torso /
lining / arm parts that the render does not reproduce, and (blue) pixels the items changed that the
reference gives to another part."""
import sys
sys.path.insert(0, 'tools/refs')
import numpy as np
from PIL import Image
import scarlet_ref as R

ren = np.asarray(Image.open(sys.argv[1]).convert('RGBA')).astype(int)
bare = np.asarray(Image.open(sys.argv[2]).convert('RGBA')).astype(int)
out = sys.argv[3]
ref = R.reduced().astype(int)
P = R.reduced_parts()
mine = P['torso'] | P['lining'] | P['armN'] | P['armF']
diff = (np.abs(ren[..., :3] - ref[..., :3]).sum(-1) > 0) | (ren[..., 3] != ref[..., 3])
bad = mine & diff
changed = (np.abs(ren - bare).sum(-1) > 0)
others = (ref[..., 3] > 0) & ~mine
stray = changed & others & diff
extra = (ren[..., 3] > 0) & (ref[..., 3] == 0) & (np.abs(ren - bare).sum(-1) > 0)
print('mine', int(mine.sum()), 'wrong', int(bad.sum()), 'stray', int(stray.sum()), 'extra (items drawn where he is not)', int(extra.sum()))
for y, x in zip(*np.nonzero(extra)):
    print('extra', x, y)
x0, y0, x1, y1 = 96, 136, 160, 210
def bg(a):
    a = a.copy()
    t = a[..., 3] == 0
    a[t, :3] = 236
    a[..., 3] = 255
    return a
m = bg(ren)
m2 = m.copy()
m2[bad, :3] = [255, 0, 0]
m2[stray, :3] = [0, 120, 255]
m2[extra, :3] = [0, 200, 0]
gap = np.full((y1 - y0, 3, 4), 255)
img = np.concatenate([m[y0:y1, x0:x1], gap, bg(ref)[y0:y1, x0:x1], gap, m2[y0:y1, x0:x1]], 1).astype(np.uint8)
Image.fromarray(img).resize((img.shape[1] * 8, img.shape[0] * 8), Image.NEAREST).save(out)
for y, x in zip(*np.nonzero(bad)):
    if len(sys.argv) > 4:
        print('bad', x, y, ren[y, x, :3], ref[y, x, :3])
