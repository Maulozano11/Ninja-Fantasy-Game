# mark.py A name anim frame x0 y0 x1 y1 S x,y x,y ... : his | ours(light) with red circles at points
import sys
import numpy as np
from PIL import Image, ImageDraw
A, name, anim, f = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])
x0, y0, x1, y1, S = map(int, sys.argv[5:10])
pts = [tuple(map(int, p.split(','))) for p in sys.argv[10:]]
argv = sys.argv; sys.argv = [argv[0], A, name]
exec(open(A + '/../rv/cmp.py').read().split('only = sys.argv')[0])
area, s, kan, kf, bg = CFG[name]
m = man[name]; W, H = m['frameW'], m['frameH']
X0, Y0, X1, Y1 = area
hw, hh = int(round((X1 - X0) / s)), int(round((Y1 - Y0) / s))
his = np.asarray(ref.resize((hw, hh), Image.BOX, box=area)).astype(float)
P = 40
hp = np.ones((hh + 2 * P, hw + 2 * P, 3)) * np.array(bg); hp[P:P + hh, P:P + hw] = his
k = np.asarray(frame(name, kan, kf)).astype(float); ka = k[..., 3:] / 255
kb = k[..., :3] * ka + np.array(bg) * (1 - ka)
best = None
for dy in range(0, hp.shape[0] - H + 1):
    for dx in range(0, hp.shape[1] - W + 1):
        e = np.abs(hp[dy:dy + H, dx:dx + W] - kb).mean()
        if best is None or e < best[0]: best = (e, dx, dy)
_, dx, dy = best
hisW = hp[dy:dy + H, dx:dx + W]
o = np.asarray(frame(name, anim, f)).astype(float); oa = o[..., 3:] / 255
onbg = o[..., :3] * oa + np.array(bg) * (1 - oa)
light = o[..., :3] * oa + np.array((214, 206, 188)) * (1 - oa)
green = o[..., :3] * oa + np.array((80, 120, 60)) * (1 - oa)
w, h = x1 - x0, y1 - y0
tiles = [hisW, onbg, light, green]
canvas = Image.new('RGB', (len(tiles) * (w * S + 6) + 6, h * S + 24), (12, 12, 16))
dr = ImageDraw.Draw(canvas)
for i, t in enumerate(tiles):
    ti = Image.fromarray(np.clip(t[y0:y1, x0:x1], 0, 255).astype(np.uint8)).resize((w * S, h * S), Image.NEAREST)
    ox = 6 + i * (w * S + 6); canvas.paste(ti, (ox, 20))
    dr.text((ox, 4), ['HIS', 'OURS %s f%d' % (anim, f), 'OURS on light', 'OURS on grass'][i], fill=(230, 230, 230))
    for (px, py) in pts:
        cx, cy = ox + (px - x0) * S + S // 2, 20 + (py - y0) * S + S // 2
        dr.ellipse([cx - S * 2, cy - S * 2, cx + S * 2, cy + S * 2], outline=(255, 0, 255))
out = A + '/review-set-r2/earth-v3-r2/m-%s-%s%d-%d_%d.png' % (name, anim, f, x0, y0)
canvas.save(out); print(out)
