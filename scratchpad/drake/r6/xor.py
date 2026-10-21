"""python3 -I xor.py <earth.ts> <out.png> a-b [a-b ...]: onion of frame pairs (grey both, red first only, cyan second only)"""
import sys
import numpy as np
from PIL import Image
exec(open(__file__.replace('xor.py', 'metrics.py')).read().split('\ndef main')[0])
frames, anchor, off = load(sys.argv[1])
H, W = frames[0].shape[:2]
pairs = [tuple(int(v) for v in p.split('-')) for p in sys.argv[3:]]
tiles = []
for a, b in pairs:
    A, B = frames[a][..., 3] == 255, frames[b][..., 3] == 255
    WA, WB = warm(frames[a]), warm(frames[b])
    WA[:, int(W * 0.78):] = False
    WB[:, int(W * 0.78):] = False
    A &= ~WA
    B &= ~WB
    x = A ^ B
    yy, xx = np.mgrid[0:H, 0:W]
    reg = {'tail x<95': xx < 95, 'legs y>120': (yy > 120) & (xx >= 95), 'back y<55': (yy < 55) & (xx >= 95), 'mid': (yy >= 55) & (yy <= 120) & (xx >= 95)}
    print(f'{a}->{b} body xor {x.sum()} / union {(A | B).sum()} = {x.sum() / (A | B).sum():.1%}', {k: int((x & m).sum()) for k, m in reg.items()})
    v = np.zeros((H, W, 3), np.uint8)
    v[:] = (20, 20, 26)
    v[A & B] = (110, 110, 110)
    v[A & ~B] = (255, 60, 60)
    v[B & ~A] = (60, 220, 255)
    tiles.append(Image.fromarray(v).resize((W * 2, H * 2), Image.NEAREST))
o = Image.new('RGB', (W * 2, (H * 2 + 6) * len(tiles)), (255, 255, 255))
for i, t in enumerate(tiles):
    o.paste(t, (0, i * (H * 2 + 6)))
o.save(sys.argv[2])
