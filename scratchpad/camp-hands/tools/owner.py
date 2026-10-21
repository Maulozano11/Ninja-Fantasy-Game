# The owner's sheet (Spanish labels): antes / ahora for the 4 camp poses on the 3 presets, as they
# are (their own body and weapon). Plus the grimoire cast next to the new read pose.
import os
from PIL import Image, ImageDraw, ImageFont

D = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/camp-hands'
G = 256
BG = (38, 42, 58)
FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 22)
SMALL = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 18)


def load(path):
    with open(path, 'rb') as f:
        return Image.frombytes('RGBA', (G, G), f.read())


def sheet(rows, cols, out, crop, scale, title=None):
    cw, ch = (crop[2] - crop[0]) * scale, (crop[3] - crop[1]) * scale
    lw, top = 150, 40 + (40 if title else 0)
    W, H = lw + len(cols) * (cw + 8), top + len(rows) * (ch + 8)
    img = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(img)
    if title:
        d.text((10, 8), title, font=FONT, fill=(240, 236, 220))
    for c, name in enumerate(cols):
        d.text((lw + c * (cw + 8) + 8, top - 32), name, font=FONT, fill=(240, 236, 220))
    for r, (label, paths, sep) in enumerate(rows):
        y = top + r * (ch + 8)
        if sep:
            d.line([(0, y - 4), (W, y - 4)], fill=(90, 96, 120), width=2)
        for k, line in enumerate(label.split('\n')):
            d.text((10, y + 10 + k * 26), line, font=FONT if k == 0 else SMALL, fill=(240, 236, 220) if k == 0 else (200, 196, 180))
        for c, p in enumerate(paths):
            im = load(p).crop(crop).resize((cw, ch), Image.NEAREST)
            img.paste(im, (lw + c * (cw + 8), y), im)
    img.save(out)
    print(out, img.size)


names = ['Solen', 'Akira', 'Aiden']
poses = [('lean', 0), ('sit', 0), ('read', 0), ('train', 0)]
rows = []
for i in range(3):
    for tag, R in [('antes', 'raw-before'), ('ahora', 'raw-after')]:
        rows.append((f'{tag}\n{names[i]}', [f'{D}/{R}/p{i}-male-held-{p}-{f}.rgba' for p, f in poses], tag == 'antes' and i > 0))
sheet(rows, ['recargado', 'sentado', 'leyendo', 'entrenando'], f'{D}/poses-campamento-antes-ahora.png', (64, 104, 192, 230), 3,
      'Poses del campamento: manos nuevas y el libro como el grimorio')

# the grimoire cast next to the new read pose (and the old one)
rows = []
for i in range(3):
    rows.append((names[i], [f'{D}/raw-after/p{i}-male-held-castbook-0.rgba', f'{D}/raw-before/p{i}-male-held-read-0.rgba', f'{D}/raw-after/p{i}-male-held-read-0.rgba'], i > 0))
sheet(rows, ['grimorio (lanzar)', 'leyendo antes', 'leyendo ahora'], f'{D}/grimorio-vs-leyendo.png', (60, 104, 196, 230), 3,
      'El libro de leer usa el dibujo del grimorio')
