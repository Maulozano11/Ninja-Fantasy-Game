"""Enclosed near-white regions of her figure, marked in magenta with their seed coords, at 4x."""
import os
import sys
sys.path.insert(0, os.path.abspath('tools/refs'))
import numpy as np
from PIL import Image, ImageDraw
import heroine_ref as R

w = sys.argv[1]
N = R.native(w)
bg = R.background(N)
L = R.luma(N)
white = (L > 238) & ~bg
H, W = white.shape
seen = np.zeros_like(white)
comps = []
for y in range(H):
    for x in range(W):
        if white[y, x] and not seen[y, x]:
            st = [(y, x)]
            seen[y, x] = True
            pts = []
            while st:
                a, b = st.pop()
                pts.append((a, b))
                for c, d in ((a + 1, b), (a - 1, b), (a, b + 1), (a, b - 1)):
                    if 0 <= c < H and 0 <= d < W and white[c, d] and not seen[c, d]:
                        seen[c, d] = True
                        st.append((c, d))
            comps.append(pts)
k = 4
img = N.copy().astype(np.uint8)
img[bg] = (200, 230, 200)
for p in comps:
    if len(p) >= 4:
        for a, b in p:
            img[a, b] = (255, 0, 255)
im = Image.fromarray(img).resize((W * k, H * k), Image.NEAREST)
d = ImageDraw.Draw(im)
for p in comps:
    if len(p) >= 4:
        a, b = min(p)
        d.text((b * k + 6, a * k - 4), f'{b},{a}:{len(p)}', fill=(0, 0, 0))
im.save(f'/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/heroine/work2/holes-{w}.png')
