"""Side-by-side review of landmark sprites: old (committed) | new (staging), first frame of each
animation row, on a grass-like backdrop, nearest-neighbour scaled.
usage: compare.py OUT.png SCALE [names...]"""
import json, sys
from PIL import Image
OLD = '/home/user/Ninja-Fantasy-Game/src/assets/world/landmarks'
NEW = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art3/staging/landmarks'
out, k = sys.argv[1], int(sys.argv[2])
names = sys.argv[3:]
mo, mn = json.load(open(OLD + '/manifest.json'))['sprites'], json.load(open(NEW + '/manifest.json'))['sprites']
names = names or list(mn)
def frame(root, man, name, row=0, col=0):
    s = man[name]; im = Image.open(f'{root}/{name}.png').convert('RGBA')
    return im.crop((col * s['frameW'], row * s['frameH'], (col + 1) * s['frameW'], (row + 1) * s['frameH'])), s['anchor']
items = []
for n in names:
    a, aa = frame(OLD, mo, n); b, ba = frame(NEW, mn, n)
    items.append((a, aa, b, ba))
pad = 6
W = sum(a.width + b.width + pad * 3 for a, _, b, _ in items) + pad
above = max(max(aa[1], ba[1]) for _, aa, _, ba in items)
below = max(max(a.height - aa[1], b.height - ba[1]) for a, aa, b, ba in items)
H = above + below + pad * 2
img = Image.new('RGBA', (W, H), (93, 107, 87, 255))
gy = pad + above
img.paste((74, 90, 60, 255), (0, gy, W, H))
x = pad
for a, aa, b, ba in items:
    img.alpha_composite(a, (x, gy - aa[1])); x += a.width + pad
    img.alpha_composite(b, (x, gy - ba[1])); x += b.width + pad * 2
img.resize((W * k, H * k), Image.NEAREST).save(out)
