"""The Earth burst proposal with Spanish labels. python3 -I earth_sheet.py <earth.png> <grimoire.png> <out.png>"""
import sys
from PIL import Image, ImageDraw, ImageFont

earth, grim, out = sys.argv[1:4]
E = Image.open(earth)
G = Image.open(grim)
ew = 450  # one earth cell (150 fine px at 3x)
gw = 450
picks = [
    (E.crop((ew * 0, 0, ew * 1, 510)), 'Cargar chakra (1)'),
    (E.crop((ew * 2, 0, ew * 3, 510)), 'Cargar chakra (2)'),
    (E.crop((ew * 4, 0, ew * 5, 510)), 'Cargar chakra (3)'),
    (E.crop((ew * 6, 0, ew * 7, 510)), 'Lanzar (en la mano)'),
    (E.crop((ew * 7, 0, ew * 8, 510)), 'Victoria'),
    (E.crop((ew * 8, 0, ew * 9, 510)), 'Aura en reposo'),
    (G.crop((gw * 0, 0, gw * 1, 450)), 'Grimorio I: orbe de tierra'),
    (G.crop((gw * 3, 0, gw * 4, 450)), 'Grimorio II: la palabra «ard»'),
]


def font(size, bold=False):
    p = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
    try:
        return ImageFont.truetype(p, size)
    except OSError:
        return ImageFont.load_default()


per = 4
cw, ch = 450, 520
W = per * cw + 20
H = 90 + 2 * (ch + 40)
img = Image.new('RGB', (W, H), (24, 20, 18))
dr = ImageDraw.Draw(img)
dr.text((20, 14), 'Propuesta: chakra de Tierra, «Tierra quebrada» (nuevo, falta tu aprobación)', fill=(242, 196, 109), font=font(28, True))
dr.text((20, 52), 'El suelo se agrieta con chakra brillando dentro, salen picos de piedra y las rocas flotan a los lados. En su color natural, marrón.', fill=(200, 190, 170), font=font(18))
for i, (im, label) in enumerate(picks):
    x = 10 + (i % per) * cw
    y = 90 + (i // per) * (ch + 40)
    img.paste(im, (x, y))
    dr.text((x + 10, y + im.size[1] + 6), label, fill=(242, 196, 109), font=font(20, True))
img.save(out)
print(img.size)
