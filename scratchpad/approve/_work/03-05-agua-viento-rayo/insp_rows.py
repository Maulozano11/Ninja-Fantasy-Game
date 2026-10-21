import sys
sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/approve/_work/03-05-agua-viento-rayo')
from lib import *
el = sys.argv[1]; names = sys.argv[2].split(','); k = int(sys.argv[3]); out = sys.argv[4]
bg_col = (20, 24, 28, 255) if len(sys.argv) < 6 else tuple(int(sys.argv[5][i:i+2], 16) for i in (0, 2, 4)) + (255,)
rows = []
for n in names:
    s = spec(el, n)
    for an, a in s['anims'].items():
        rows.append((n, an, a['frames'], s['frameW'], s['frameH']))
W = max(r[2] * (r[3] * k + 6) for r in rows) + 10
H = sum(r[4] * k + 30 for r in rows) + 10
im = Image.new('RGBA', (W, H), (40, 40, 40, 255))
d = ImageDraw.Draw(im)
y = 5
for n, an, nf, fw, fh in rows:
    text(d, (6, y), f'{el}/{n} {an} {fw}x{fh}', 14)
    y += 22
    for f in range(nf):
        x = 5 + f * (fw * k + 6)
        d.rectangle([x - 1, y - 1, x + fw * k, y + fh * k], outline=(255, 0, 255, 255))
        cell = Image.new('RGBA', (fw, fh), bg_col)
        cell.alpha_composite(frame(el, n, an, f))
        im.paste(up(cell, k), (x, y))
    y += fh * k + 8
im.save(out)
print(im.size)
