# usage: view.py <frame.png> <out.png> [x0 y0 x1 y1] [scale] ; composites on navy and marks the checker's holes cyan
import sys
import numpy as np
from PIL import Image
sys.path.insert(0, '')
f = np.array(Image.open(sys.argv[1]).convert('RGBA'))
box = tuple(int(v) for v in sys.argv[3:7]) if len(sys.argv) > 6 else (150, 380, f.shape[1], 960)
sc = int(sys.argv[7]) if len(sys.argv) > 7 else 1
R = 9
def shift_or(m, r):
    out = m.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dx * dx + dy * dy > r * r: continue
            out |= np.roll(np.roll(m, dy, 0), dx, 1)
    return out
op = f[..., 3] == 255
holes = ~shift_or(~shift_or(op, R), R) & ~op
roi = np.zeros_like(op); roi[430:940, 180:940] = True
bg = np.zeros_like(f); bg[...] = (18, 20, 34, 255)
im = Image.alpha_composite(Image.fromarray(bg), Image.fromarray(f))
a = np.array(im); hl = a.copy(); hl[holes & roi] = (0, 255, 255, 255)
A = Image.fromarray(a).crop(box); B = Image.fromarray(hl).crop(box)
w, h = A.size
out = Image.new('RGBA', (w * sc, (h * 2 + 4) * sc), (255, 255, 255, 255))
out.paste(A.resize((w * sc, h * sc), Image.NEAREST), (0, 0)); out.paste(B.resize((w * sc, h * sc), Image.NEAREST), (0, (h + 4) * sc))
out.save(sys.argv[2])
