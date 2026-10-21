"""Zoomed views of the reduced reference with a grid (our frame coordinates), its part map, and the
char rows of a box. Run from the worktree root:
  python3 -I view.py <name> x0 y0 x1 y1 [k]
"""
import os, sys
sys.path.insert(0, os.path.join(os.getcwd(), 'tools/refs'))
import importlib.util
import numpy as np
from PIL import Image, ImageDraw

spec = importlib.util.spec_from_file_location('study', 'tools/refs/scarlet-study.py')
S = importlib.util.module_from_spec(spec)
spec.loader.exec_module(S)
R = S.R
D = os.path.dirname(os.path.abspath(__file__))

name = sys.argv[1]
x0, y0, x1, y1 = map(int, sys.argv[2:6])
k = int(sys.argv[6]) if len(sys.argv) > 6 else 12
N, Q, M, idx, part = S.build()
bx, by = S.REDUCED_BOX[:2]
rgba = S.to_rgba(idx)
sub = rgba[y0 - by:y1 - by, x0 - bx:x1 - bx].astype(float)
bg = np.array([236, 236, 240.0])
al = sub[..., 3:4] / 255
c = (sub[..., :3] * al + bg * (1 - al)).astype(np.uint8)
idle = np.asarray(Image.open('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/newchar/study/male-idle.png').convert('RGBA'))
bare = S.bare(idle, idx, part)[y0 - by:y1 - by, x0 - bx:x1 - bx]
c[bare] = (255, 0, 255)
im = Image.fromarray(c).resize(((x1 - x0) * k, (y1 - y0) * k), Image.NEAREST)
d = ImageDraw.Draw(im)
for x in range(x0, x1 + 1):
    col = (0, 160, 255) if x % 10 == 0 else (150, 200, 230) if x % 5 == 0 else (90, 120, 140)
    if x % 5 == 0 or k >= 10:
        d.line(((x - x0) * k, 0, (x - x0) * k, im.height), fill=col, width=1)
    if x % 10 == 0:
        d.text(((x - x0) * k + 2, 2), str(x), fill=(0, 90, 255))
for y in range(y0, y1 + 1):
    col = (0, 160, 255) if y % 10 == 0 else (150, 200, 230) if y % 5 == 0 else (90, 120, 140)
    if y % 5 == 0 or k >= 10:
        d.line((0, (y - y0) * k, im.width, (y - y0) * k), fill=col, width=1)
    if y % 10 == 0:
        d.text((2, (y - y0) * k + 2), str(y), fill=(0, 90, 255))
im.save(os.path.join(D, f'v-{name}.png'))
print('    ' + ''.join(str(x % 10) for x in range(x0, x1)))
for y, r in zip(range(y0, y1), S.rows(idx, x0, y0, x1, y1)):
    print(f'{y:3d} {r}')
pm = {n: c for n, c in zip(['', 'head', 'torso', 'lining', 'armN', 'handN', 'armF', 'handF', 'legN', 'legF', 'hilt', 'blade'], ' HTLAaFfNnhb')}
print('parts:')
for y in range(y0, y1):
    print(f'{y:3d} ' + ''.join(pm[part[y - by, x - bx]] for x in range(x0, x1)))
used = sorted(set(idx[idx >= 0].tolist()))
print(' '.join(f'{R.CHARS[i]}={R.PALETTE[i]}' for i in used))
