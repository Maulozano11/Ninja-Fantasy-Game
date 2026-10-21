import sys
sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/approve/_work/03-05-agua-viento-rayo')
from lib import *
# usage: el name anim f0 f1 k percol out
el, n, an = sys.argv[1:4]; f0, f1, k, per = map(int, sys.argv[4:8]); out = sys.argv[8]
s = spec(el, n); fw, fh = s['frameW'], s['frameH']
fr = list(range(f0, f1))
cols = min(per, len(fr)); rows = (len(fr) + per - 1) // per
W = cols * (fw * k + 8) + 8; H = rows * (fh * k + 26) + 8
im = Image.new('RGBA', (W, H), (40, 40, 40, 255)); d = ImageDraw.Draw(im)
for i, f in enumerate(fr):
    x = 8 + (i % per) * (fw * k + 8); y = 22 + (i // per) * (fh * k + 26)
    text(d, (x, y - 18), f'{el}/{n} {an} f{f}', 13)
    d.rectangle([x - 1, y - 1, x + fw * k, y + fh * k], outline=(255, 0, 255, 255))
    cell = Image.new('RGBA', (fw, fh), BG); cell.alpha_composite(frame(el, n, an, f))
    im.paste(up(cell, k), (x, y))
im.save(out); print(im.size)
