"""Legends before / after, Spanish labels. python3 -I legends_sheet.py <dir> <out.png>"""
import sys
from PIL import Image, ImageDraw, ImageFont

d, out = sys.argv[1], sys.argv[2]
rows = [
    ('kaien', 'Kaien', 'Espíritu (violeta)', 'Rayo (violeta)', 'Chidori, Kirin'),
    ('ren', 'Ren', 'Agua (azul)', 'Rayo (azul)', 'Chidori, Kirin'),
    ('hiro', 'Hiro', 'Fuego: brasas (naranja)', 'Viento (naranja)', 'Ráfaga cortante, Rasenshuriken'),
    ('raiga', 'Raiga', 'Espíritu (violeta)', 'Fuego (violeta)', 'Fuego del dragón, Gran aniquilación'),
    ('hana', 'Hana', 'Viento (verde)', 'Agua (verde)', 'Muro de agua, Dragón de agua'),
    ('kenji', 'Kenji', 'Espíritu (violeta)', 'Tierra (violeta)', 'Muro de tierra, Dragón de madera'),
]


def font(size, bold=False):
    for p in ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf']:
        try:
            return ImageFont.truetype(p, size)
        except OSError:
            pass
    return ImageFont.load_default()


cell = Image.open(f'{d}/kaien-antes.png')
cw, ch = cell.size
head, lab = 70, 64
per = 3
W = per * (cw * 2 + 30) + 20
H = head + 2 * (ch + lab + 20)
img = Image.new('RGB', (W, H), (24, 20, 18))
dr = ImageDraw.Draw(img)
dr.text((20, 14), 'Las leyendas: su tipo de chakra sigue a sus jutsus; su color de siempre se mantiene', fill=(242, 196, 109), font=font(26, True))
for i, (key, name, before, after, jutsu) in enumerate(rows):
    x = 20 + (i % per) * (cw * 2 + 30)
    top = head + (i // per) * (ch + lab + 20)
    a = Image.open(f'{d}/{key}-antes.png')
    b = Image.open(f'{d}/{key}-ahora.png')
    img.paste(a, (x, top))
    img.paste(b, (x + cw, top))
    dr.text((x + 8, top + 6), f'{name} · Antes', fill=(220, 210, 190), font=font(20, True))
    dr.text((x + cw + 8, top + 6), f'{name} · Ahora', fill=(242, 196, 109), font=font(20, True))
    dr.text((x + 8, top + ch + 6), before, fill=(200, 190, 170), font=font(18))
    dr.text((x + cw + 8, top + ch + 6), after, fill=(242, 196, 109), font=font(18, True))
    dr.text((x + 8, top + ch + 34), 'Jutsus: ' + jutsu, fill=(150, 140, 125), font=font(16))
    dr.line([(x + cw, top), (x + cw, top + ch)], fill=(70, 60, 50), width=2)
img.save(out)
print(img.size)
