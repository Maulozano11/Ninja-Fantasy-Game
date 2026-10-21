"""Decode a drake data module (vfx-beasts-ref-earth.ts) into frames, cropped like beastSprite (pad 3)."""
import re
import numpy as np


def load(ts, crop=True):
    src = open(ts, encoding='utf-8').read()
    size = [int(v) for v in re.search(r'SIZE: \[number, number\] = \[(\d+), (\d+)\]', src).groups()]
    anchor = [int(v) for v in re.search(r'ANCHOR: \[number, number\] = \[(\d+), (\d+)\]', src).groups()]
    alph = re.search(r"ALPHABET = '([^']*)'", src).group(1)
    pal = re.findall(r"'(#[0-9a-f]{8})'", src.split('PALETTE: string[]')[1].split('];')[0])
    pal = [tuple(int(c[i:i + 2], 16) for i in (1, 3, 5, 7)) for c in pal]
    body = src.split('FRAMES: Record')[1]
    frames = []
    for fr in re.findall(r'\[\n((?:\s+\'[^\']*\',\n)+)\s+\]', body):
        rows = re.findall(r"'([^']*)'", fr)
        img = np.zeros((size[1], size[0], 4), np.uint8)
        for y, row in enumerate(rows):
            x = 0
            for m in re.finditer(r'(\D)(\d*)', row):
                i = alph.index(m.group(1))
                n = int(m.group(2)) if m.group(2) else 1
                if i > 0:
                    img[y, x:x + n] = pal[i]
                x += n
        frames.append(img)
    if not crop:
        return frames, tuple(anchor), (0, 0)
    a = np.stack([f[..., 3] > 0 for f in frames]).any(0)
    ys, xs = np.nonzero(a)
    x0, y0, x1, y1 = xs.min() - 3, ys.min() - 3, xs.max() + 3, ys.max() + 3
    frames = [f[y0:y1 + 1, x0:x1 + 1] for f in frames]
    return frames, (anchor[0] - x0, anchor[1] - y0), (x0, y0)
