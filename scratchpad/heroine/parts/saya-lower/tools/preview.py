"""Stamp the draft pieces (design.py in this folder's ../work) over a body render and zoom it beside
her picture (native, at half the zoom so she shows at our scale).

  python3 -I preview.py <design.py> <body.png> <out.png> [pieces...]
"""
import importlib.util
import sys
import os
import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_7487bce9-1b7-5/tools/refs')
import heroine_ref as R  # noqa: E402

spec = importlib.util.spec_from_file_location('design', sys.argv[1])
D = importlib.util.module_from_spec(spec)
spec.loader.exec_module(D)
body = np.asarray(Image.open(sys.argv[2]).convert('RGBA')).copy()
names = sys.argv[4:] or [p[0] for p in D.PIECES]
canvas = np.zeros((256, 256, 4), np.uint8)
canvas[...] = (214, 214, 220, 255)
m = body[..., 3] > 0
canvas[m] = body[m]
# depth order: scabbard (behind legs) is drawn first, under the body
order = sorted([p for p in D.PIECES if p[0] in names], key=lambda p: D.DEPTH_ORDER.index(p[1]))
for name, depth, x0, y0, rows in order:
    for j, r in enumerate(rows):
        for i, ch in enumerate(r):
            if ch == '.':
                continue
            x, y = x0 + i, y0 + j
            if depth == 'behind' and m[y, x] and not D.behind_ok(x, y):
                continue
            h = D.KEY[ch]
            canvas[y, x, :3] = [int(h[k:k + 2], 16) for k in (1, 3, 5)]
            canvas[y, x, 3] = 255
Image.fromarray(canvas).save(sys.argv[3].replace('.png', '@1.png'))
k = 12
x0, y0, x1, y1 = 100, 160, 150, 200
ours = Image.fromarray(canvas[y0:y1, x0:x1]).resize(((x1 - x0) * k, (y1 - y0) * k), Image.NEAREST).convert('RGB')
d = ImageDraw.Draw(ours)
for x in range(x0, x1):
    if x % 5 == 0:
        d.line([((x - x0) * k, 0), ((x - x0) * k, ours.height)], fill=(0, 170, 0) if x % 10 else (255, 0, 255))
for y in range(y0, y1):
    if y % 5 == 0:
        d.line([(0, (y - y0) * k), (ours.width, (y - y0) * k)], fill=(0, 170, 0) if y % 10 else (255, 0, 255))
for x in range(x0, x1, 10):
    d.text(((x - x0) * k + 2, 2), str(x), fill=(255, 0, 255))
for y in range(y0, y1, 10):
    d.text((2, (y - y0) * k + 2), str(y), fill=(255, 0, 255))
N = R.native('saya').astype(np.uint8)
# her crop: our x0..x1 -> her x = 106 + (x - 127) / 0.55, our y -> her y = 82 + (y - 168) / 0.47
hx0, hx1 = 106 + (x0 - 127) / 0.55, 106 + (x1 - 127) / 0.55
hy0, hy1 = 82 + (y0 - 168) / 0.47, 82 + (y1 - 168) / 0.47
her = Image.fromarray(N[int(hy0):int(hy1), int(hx0):int(hx1)])
her = her.resize((int((int(hx1) - int(hx0)) * 0.55 * k), int((int(hy1) - int(hy0)) * 0.47 * k)), Image.NEAREST)
W = ours.width + her.width + 20
out = Image.new('RGB', (W, max(ours.height, her.height)), (255, 255, 255))
out.paste(her, (0, 0))
out.paste(ours, (her.width + 20, 0))
out.save(sys.argv[3])
