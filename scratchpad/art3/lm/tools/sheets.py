"""Deliverables: landmarks-before-after.png (old lineup over new lineup, each with the character,
at 2x) and landmarks-anims.png (every animation row of the new sheets, frame by frame, at 3x)."""
import json, sys
from PIL import Image, ImageDraw
ART = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art3'
OLD = '/home/user/Ninja-Fantasy-Game/src/assets/world/landmarks'
NEW = ART + '/staging/landmarks'
CHAR = Image.open(ART + '/lm/charref.png').convert('RGBA'); CHAR_FEET = (64, 120)
out_dir = sys.argv[1] if len(sys.argv) > 1 else ART
BG, GROUND, LINE, TEXT = (93, 107, 87, 255), (74, 90, 60, 255), (60, 74, 50, 255), (236, 230, 210, 255)
def sheet(root):
    return json.load(open(root + '/manifest.json'))['sprites']
def frame(root, man, name, row=0, col=0):
    s = man[name]; im = Image.open(f'{root}/{name}.png').convert('RGBA')
    return im.crop((col * s['frameW'], row * s['frameH'], (col + 1) * s['frameW'], (row + 1) * s['frameH']))
mo, mn = sheet(OLD), sheet(NEW)
names = list(mn)
def lineup(root, man):
    items = [(CHAR.crop(CHAR.getbbox()), (CHAR_FEET[0] - CHAR.getbbox()[0], CHAR_FEET[1] - CHAR.getbbox()[1]))]
    for n in names:
        items.append((frame(root, man, n), tuple(man[n]['anchor'])))
    return items
pad, k = 10, 2
rows = [('BEFORE (committed)', lineup(OLD, mo)), ('AFTER (staging)', lineup(NEW, mn))]
W = max(sum(im.width + pad for im, _ in it) + pad for _, it in rows)
heights = []
for _, it in rows:
    above = max(a[1] for _, a in it); below = max(im.height - a[1] for im, a in it)
    heights.append((above, below))
H = sum(a + b + pad * 2 + 12 for a, b in heights)
img = Image.new('RGBA', (W, H), BG)
y = 0
d = ImageDraw.Draw(img)
for (label, it), (above, below) in zip(rows, heights):
    d.text((pad, y + 2), label, fill=TEXT)
    gy = y + 12 + pad + above
    img.paste(GROUND, (0, gy, W, gy + below + pad))
    img.paste(LINE, (0, gy, W, gy + 1))
    x = pad
    for im, (ax, ay) in it:
        img.alpha_composite(im, (x, gy - ay)); x += im.width + pad
    y = gy + below + pad
img = img.resize((W * k, H * k), Image.NEAREST)
img.save(out_dir + '/landmarks-before-after.png')
# Animations: each multi-frame or alternate-state row of the new sheets.
strips = []
for n in names:
    s = mn[n]
    for key, a in s['anims'].items():
        if a['frames'] < 2 and len(s['anims']) < 2: continue
        fr = [frame(NEW, mn, n, a['row'], c) for c in range(a['frames'])]
        strips.append((f"{n} / {key}  ({a['frames']} f @ {a['fps']} fps)", fr))
k2 = 3
W2 = max(sum(f.width + 4 for f in fr) + pad * 2 for _, fr in strips)
H2 = sum(max(f.height for f in fr) + 14 + pad for _, fr in strips) + pad
an = Image.new('RGBA', (W2, H2), BG); d = ImageDraw.Draw(an)
y = pad
for label, fr in strips:
    d.text((pad, y), label, fill=TEXT); y += 12
    h = max(f.height for f in fr)
    x = pad
    for f in fr:
        an.alpha_composite(f, (x, y + h - f.height)); x += f.width + 4
    y += h + pad
an.resize((W2 * k2, H2 * k2), Image.NEAREST).save(out_dir + '/landmarks-anims.png')
print('ok', img.size, an.size)
