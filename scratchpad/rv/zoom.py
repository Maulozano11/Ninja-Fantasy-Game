# zoom.py A name x0 y0 x1 y1 scale [anim frame]  -> his | ours(his bg) | ours(light) region zoom
import sys
sys.argv_saved = list(sys.argv)
A, name = sys.argv[1], sys.argv[2]
x0, y0, x1, y1, S = map(int, sys.argv[3:8])
extra = sys.argv[8:]
import numpy as np
from PIL import Image, ImageDraw
sys.argv = [sys.argv[0], A, name]
src = open(A + '/../rv/cmp.py').read().split('only = sys.argv')[0]
exec(src)
area, s, anim, f, bg = CFG[name]
if extra: anim, f = extra[0], int(extra[1])
m = man[name]; W, H = m['frameW'], m['frameH']; ax, ay = m['anchor']
fr = frame(name, anim, f)
ours = np.asarray(fr).astype(float); al = ours[..., 3:] / 255
X0, Y0, X1, Y1 = area
hw, hh = int(round((X1 - X0) / s)), int(round((Y1 - Y0) / s))
his = np.asarray(ref.resize((hw, hh), Image.BOX, box=area)).astype(float)
# use the anchor mapping from cmp: recompute offset by search
P = 40
hp = np.ones((hh + 2 * P, hw + 2 * P, 3)) * np.array(bg); hp[P:P + hh, P:P + hw] = his
keyf = frame(name, CFG[name][2], CFG[name][3]); k = np.asarray(keyf).astype(float); ka = k[..., 3:] / 255
kb = k[..., :3] * ka + np.array(bg) * (1 - ka)
best = None
for dy in range(0, hp.shape[0] - H + 1):
    for dx in range(0, hp.shape[1] - W + 1):
        e = np.abs(hp[dy:dy + H, dx:dx + W] - kb).mean()
        if best is None or e < best[0]: best = (e, dx, dy)
_, dx, dy = best
hisW = hp[dy:dy + H, dx:dx + W]
onbg = ours[..., :3] * al + np.array(bg) * (1 - al)
light = ours[..., :3] * al + np.array((214, 206, 188)) * (1 - al)
alpha = np.repeat(ours[..., 3:], 3, -1)
tiles = [hisW, onbg, light, alpha]
w, h = x1 - x0, y1 - y0
canvas = Image.new('RGB', (4 * w * S + 30, h * S + 24), (12, 12, 16))
dr = ImageDraw.Draw(canvas)
for i, t in enumerate(tiles):
    ti = Image.fromarray(np.clip(t[y0:y1, x0:x1], 0, 255).astype(np.uint8)).resize((w * S, h * S), Image.NEAREST)
    canvas.paste(ti, (6 + i * (w * S + 6), 20))
    dr.text((6 + i * (w * S + 6), 4), ['HIS', 'OURS %s f%d' % (anim, f), 'OURS light', 'alpha'][i], fill=(230, 230, 230))
canvas.save(A + '/review-set-r2/earth-v3-r2/z-%s-%s%d-%d_%d.png' % (name, anim, f, x0, y0))
print('saved', 'z-%s-%s%d-%d_%d.png' % (name, anim, f, x0, y0))
