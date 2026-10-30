"""The loot on the dead hydra (the owner, 2026-10-30): one fang of the front head, longer than the
others, painted onto his dead picture over his own upper jaw (ivory with his dark outline); the game
makes it glow and sparkle. Writes the picture and the tooth's mask (1672x941 space)."""
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
SRC, OUT, MASK = sys.argv[1:4]
im = Image.open(SRC).convert('RGB')
W, H = im.size
k = 6
big = Image.new('RGBA', (W * k, H * k))
d = ImageDraw.Draw(big)
# a curved fang from the upper jaw (root about x 661-669, y 774) down past the lower jaw (tip at 667, 803)
root_l, root_r, tip = (660.5, 773.5), (669.5, 773.0), (667.0, 803.0)
def curve(a, b, bend, n=12):
    pts = []
    for i in range(n + 1):
        t = i / n
        x = a[0] + (b[0] - a[0]) * t + bend * np.sin(np.pi * t)
        y = a[1] + (b[1] - a[1]) * t
        pts.append((x * k, y * k))
    return pts
outer = curve(root_l, tip, -1.6) + curve(tip, root_r, 0.4)[1:]
d.polygon(outer, fill=(10, 8, 12, 255))
inner_l, inner_r, inner_tip = (661.6, 774.2), (668.4, 773.8), (666.8, 801.2)
fang = curve(inner_l, inner_tip, -1.4) + curve(inner_tip, inner_r, 0.4)[1:]
d.polygon(fang, fill=(236, 222, 190, 255))
shine = curve((664.0, 775.0), (666.5, 797.5), -1.0) + curve((666.5, 797.5), (666.2, 775.0), 0.2)[1:]
d.polygon(shine, fill=(255, 252, 240, 255))
d.line(curve((667.6, 775.5), (667.2, 798.0), 0.2), fill=(196, 170, 128, 255), width=k)
small = big.resize((W, H), Image.LANCZOS)
out = im.convert('RGBA')
out.alpha_composite(small)
out.convert('RGB').save(OUT)
np.save(MASK, (np.array(small)[..., 3] > 20))
