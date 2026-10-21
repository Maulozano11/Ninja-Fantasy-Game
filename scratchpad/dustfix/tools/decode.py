"""Decode a drake data module (.ts) into the final 284x167 frames strip (same crop as beastSprite): decode.py in.ts out.png"""
import re
import sys
import numpy as np
from PIL import Image
src = open(sys.argv[1], encoding='utf-8').read()
W, H = map(int, re.search(r'SIZE: \[number, number\] = \[(\d+), (\d+)\]', src).groups())
alph = re.search(r"ALPHABET = '([^']*)'", src).group(1)
pal_block = src[src.index('PALETTE'):src.index('FRAMES')]
pal = re.findall(r"'#([0-9a-f]{8})'", pal_block)
pal = [tuple(int(p[i:i + 2], 16) for i in (0, 2, 4, 6)) for p in pal]
fr_block = src[src.index('fly: ['):]
frames = []
for fb in re.findall(r'\[\n((?:\s+\'[^\']*\',\n)+)\s+\]', fr_block):
    rows = re.findall(r"'([^']*)'", fb)
    a = np.zeros((H, W, 4), np.uint8)
    for y, row in enumerate(rows):
        x = 0
        for m in re.finditer(r'(\D)(\d*)', row):
            i = alph.index(m.group(1))
            n = int(m.group(2)) if m.group(2) else 1
            if i > 0:
                a[y, x:x + n] = pal[i]
            x += n
    frames.append(a)
assert len(frames) == 8, len(frames)
x0 = min(np.nonzero(f[..., 3].any(0))[0].min() for f in frames) - 3
y0 = min(np.nonzero(f[..., 3].any(1))[0].min() for f in frames) - 3
x1 = max(np.nonzero(f[..., 3].any(0))[0].max() for f in frames) + 3
y1 = max(np.nonzero(f[..., 3].any(1))[0].max() for f in frames) + 3
print('crop', x0, y0, x1, y1, 'frame', x1 - x0 + 1, 'x', y1 - y0 + 1)
strip = np.concatenate([f[y0:y1 + 1, x0:x1 + 1] for f in frames], 1)
Image.fromarray(strip, 'RGBA').save(sys.argv[2])
