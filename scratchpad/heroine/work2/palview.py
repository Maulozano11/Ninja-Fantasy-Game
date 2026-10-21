"""Each palette as labelled swatches (index + hex), and how often the reduced reference uses each."""
import os
import sys
sys.path.insert(0, os.path.abspath('tools/refs'))
import numpy as np
from PIL import Image, ImageDraw
import heroine_ref as R

for w in R.WHICH:
    pal = R.PALETTES[w]
    per = 10
    k = 64
    im = Image.new('RGB', (per * k, ((len(pal) + per - 1) // per) * (k + 14)), (255, 255, 255))
    d = ImageDraw.Draw(im)
    for i, h in enumerate(pal):
        X, Y = (i % per) * k, (i // per) * (k + 14)
        d.rectangle((X, Y, X + k - 3, Y + k - 3), fill=h)
        c = tuple(int(h[j:j + 2], 16) for j in (1, 3, 5))
        t = (0, 0, 0) if R.luma(np.array(c)) > 110 else (255, 255, 255)
        d.text((X + 3, Y + 3), str(i), fill=t)
        d.text((X, Y + k - 1), h, fill=(0, 0, 0))
    im.save(f'/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/heroine/work2/palv-{w}.png')
