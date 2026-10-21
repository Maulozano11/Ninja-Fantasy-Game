"""Lineup of a sprite group for the owner: every sprite (and its alternate states) standing on one ground line
next to a character, at 2x.  python3 lineup.py <group> <out.png> [scale]"""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont
W = '/home/user/Ninja-Fantasy-Game/src/assets/world'
CH = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/mockup/sprites/solen.png'
g, out = sys.argv[1], sys.argv[2]
k = int(sys.argv[3]) if len(sys.argv) > 3 else 2
man = json.load(open(os.path.join(W, g, 'manifest.json')))['sprites']
items = [(Image.open(CH).convert('RGBA'), (64, 120), 'personaje 1.75 m')]
for name, s in man.items():
    sheet = Image.open(os.path.join(W, g, s['file'])).convert('RGBA')
    for an, a in sorted(s['anims'].items(), key=lambda kv: kv[1]['row']):
        fw, fh = s['frameW'], s['frameH']
        idx = 0 if a['loop'] else a['frames'] - 1 if an in ('broken', 'burnt') else min(a['frames'] - 1, a['frames'] // 2)
        fr = sheet.crop((idx * fw, a['row'] * fh, (idx + 1) * fw, (a['row'] + 1) * fh))
        bb = fr.getbbox()
        if not bb:
            continue
        ax, ay = s['anchor']
        fr = fr.crop((bb[0], bb[1], bb[2], max(bb[3], ay + 1)))
        items.append((fr, (ax - bb[0], ay - bb[1]), f"{s['label']}" + ('' if an == list(s['anims'])[0] else f' · {an}')))
pad = 18
maxw = 1800 // k
rows, cur, w = [], [], pad
for it in items:
    if cur and w + it[0].width + pad > maxw:
        rows.append(cur); cur, w = [], pad
    cur.append(it); w += it[0].width + pad
rows.append(cur)
heights = [(max(i[1][1] for i in r), max(i[0].height - i[1][1] for i in r)) for r in rows]
H = sum(a + b + 30 for a, b in heights) + pad
canvas = Image.new('RGBA', (maxw, H), (93, 107, 87, 255))
y = pad
labels = []
for r, (above, below) in zip(rows, heights):
    gy = y + above
    ImageDraw.Draw(canvas).rectangle((0, gy, maxw, gy + below + 24), fill=(74, 90, 60, 255))
    x = pad
    for im, (ax, ay), lab in r:
        canvas.alpha_composite(im, (x, gy - ay))
        labels.append((x * k + im.width * k // 2, (gy + below + 8) * k, lab))
        x += im.width + pad
    y = gy + below + 30
big = canvas.resize((canvas.width * k, canvas.height * k), Image.NEAREST)
d = ImageDraw.Draw(big)
f = ImageFont.truetype('/usr/share/fonts/opentype/inter/Inter-SemiBold.otf', 18)
for x, yy, lab in labels:
    d.text((x, yy), lab, font=f, fill=(235, 240, 230, 255), anchor='mt')
big.convert('RGB').save(out)
print(out, big.size)
