import json, sys
from PIL import Image, ImageDraw
STG = sys.argv[1]; OUT = sys.argv[2]
m = json.load(open(f'{STG}/vfx_dc/manifest.json'))['sprites']
k = 3
rows = []
for name, s in m.items():
    im = Image.open(f'{STG}/vfx_dc/{s["file"]}').convert('RGBA')
    own = [int(a[1:]) for a in s['anims']]
    angles = [-60, -30, 0, 30, 60] if name != 'lightning_fan' else [-40, -20, 0, 20, 40]
    cells = []
    for a in angles:
        an = s['anims'][f'a{a}']
        fr = im.crop((0, an['row'] * s['frameH'], s['frameW'], (an['row'] + 1) * s['frameH']))
        cells.append(fr)
    rows.append((name, s, cells))
W = max(len(c) * (s['frameW'] * k + 8) for _, s, c in rows) + 260
H = sum(s['frameH'] * k + 12 for _, s, _ in rows)
out = Image.new('RGBA', (W, H), (34, 52, 34, 255))
d = ImageDraw.Draw(out)
y = 0
for name, s, cells in rows:
    d.text((4, y + 4), name, fill=(255, 255, 255, 255))
    d.text((4, y + 20), s['label'][-60:], fill=(200, 200, 200, 255))
    x = 260
    for c in cells:
        big = c.resize((c.width * k, c.height * k), Image.NEAREST)
        out.alpha_composite(big, (x, y))
        ax, ay = s['anchor']
        d.rectangle([x + ax * k - 2, y + ay * k - 2, x + ax * k + 2, y + ay * k + 2], outline=(255, 0, 255, 255))
        x += big.width + 8
    y += s['frameH'] * k + 12
out.save(OUT)
print(out.size)
