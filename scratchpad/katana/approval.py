import json
import numpy as np
from PIL import Image, ImageDraw, ImageFont
v = json.load(open('out/variants.json'))
F = '/usr/share/fonts/truetype/dejavu/'
JP = '/usr/share/fonts/truetype/fonts-japanese-gothic.ttf'
title = ImageFont.truetype(F + 'DejaVuSerif-Bold.ttf', 30)
head = ImageFont.truetype(F + 'DejaVuSerif-Bold.ttf', 22)
bold = ImageFont.truetype(F + 'DejaVuSans-Bold.ttf', 16)
body = ImageFont.truetype(F + 'DejaVuSans.ttf', 14)
try:
    jp = ImageFont.truetype(JP, 15)
except Exception:
    jp = body
BG = (236, 230, 216)
INK = (30, 24, 20)
DIM = (92, 80, 66)
def img(b, k):
    rows = b['rows']; H = len(rows); W = len(rows[0])
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch != '.':
                h = b['colors'][ch]
                im.putpixel((x, y), tuple(int(h[i:i+2], 16) for i in (1, 3, 5)) + (255,))
    return im.resize((W * k, H * k), Image.NEAREST)
SECTIONS = [
    ('ACERO  (color de la hoja)', [
        ('steel-a', 'A · Tamahagane plateado', '玉鋼', 'El acero de los herreros japoneses: plata con su línea de temple blanca.'),
        ('steel-b', 'B · Kurogane (acero negro)', '黒鉄', 'La hoja negra: rara y de mal agüero entre los cazadores; brillo violeta frío.'),
        ('steel-c', 'C · Nichirin de tu naturaleza', '日輪刀', 'La hoja toma el color de tu naturaleza: fuego, agua, rayo, viento, tierra.'),
    ]),
    ('HOJA', [
        ('blade-a', 'A · Shinogi-zukuri, temple recto', '鎬造・直刃', 'La katana clásica desde el periodo Kamakura: cresta, línea de temple recta.'),
        ('blade-b', 'B · Kogarasu-maru, "Pequeño Cuervo"', '小烏丸', 'Del herrero Amakuni (siglo VIII): mitad de doble filo, punta de lanza; puente entre la espada recta antigua y el tachi.'),
        ('blade-c', 'C · Estilo Masamune con Kurikara', '正宗・倶利伽羅', 'Temple salvaje (midare) con cristales de nie, canal en el lomo y grabado de Kurikara: la espada de Fudō Myōō con el dragón enroscado, que corta el mal.'),
    ]),
    ('GUARDA  (tsuba)', [
        ('guard-a', 'A · Mokkō', '木瓜', 'Cuatro lóbulos como un melón cortado, forma de la corte Heian; hierro con borde de oro.'),
        ('guard-b', 'B · Kaen (llamas)', '火焔', 'El fuego que rodea a Fudō Myōō y quema el mal (karura-en): llamas hacia la hoja.'),
        ('guard-c', 'C · Mitsudomoe', '三つ巴', 'Redonda, con las tres comas de Hachiman, dios de la guerra, en oro.'),
    ]),
    ('EMPUÑADURA  (tsuka)', [
        ('hilt-a', 'A · Hineri-maki', '捻巻', 'Cordón de seda cruzado sobre piel de raya blanca, rombos y adorno de oro (menuki).'),
        ('hilt-b', 'B · Tachi de la corte Heian', '太刀', 'Piel de raya desnuda, pomo de oro en forma de casco y borla roja de seda.'),
        ('hilt-c', 'C · Shimenawa y shide', '注連縄・紙垂', 'Cuerda sagrada roja y blanca de los santuarios y papel que purifica: hoja consagrada contra demonios.'),
    ]),
]
k = 6
kw = img(v['blade-a'], k).width
kh = img(v['blade-a'], k).height
colw = kw + 40
textw = colw - 20
def wrap(d, text, font, width):
    words = text.split(); lines = []; cur = ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if d.textlength(t, font=font) <= width: cur = t
        else: lines.append(cur); cur = w
    if cur: lines.append(cur)
    return lines
W = colw * 3 + 40
rowh = kh + 120
H = 6000
sheet = Image.new('RGB', (W, H), BG)
d = ImageDraw.Draw(sheet)
d.text((24, 22), 'Katanas estilo Demon Slayer  ·  piezas a / b / c para aprobar', font=title, fill=INK)
y = 80
for name, items in SECTIONS:
    d.text((24, y), name, font=head, fill=(140, 40, 30)); y += 34
    for i, (key, label, kanji, note) in enumerate(items):
        x = 20 + i * colw
        im = img(v[key], k)
        sheet.paste(im, (x, y), im)
        ty = y + kh + 4
        d.text((x + 6, ty), label, font=bold, fill=INK)
        d.text((x + 6 + d.textlength(label, font=bold) + 8, ty + 1), kanji, font=jp, fill=DIM)
        for j, line in enumerate(wrap(d, note, body, textw)):
            d.text((x + 6, ty + 22 + j * 17), line, font=body, fill=DIM)
    y += rowh + 12
d.text((24, y), 'ACERO C · Nichirin por naturaleza', font=head, fill=(140, 40, 30)); y += 34
nat = [('nature-fire', 'Fuego'), ('nature-water', 'Agua'), ('nature-lightning', 'Rayo'), ('nature-wind', 'Viento'), ('nature-earth', 'Tierra')]
k2 = 4
for i, (key, lab) in enumerate(nat):
    im = img(v[key], k2)
    x = 20 + (i % 3) * colw; yy = y + (i // 3) * (im.height + 34)
    sheet.paste(im, (x, yy), im); d.text((x + 6, yy + im.height + 2), lab, font=bold, fill=INK)
y += 2 * (img(v['nature-fire'], k2).height + 34) + 10
d.text((24, y), 'En la mano (reposo / corte): clásica · fuego · sol negro · cuervo · agua', font=head, fill=(140, 40, 30)); y += 34
hand0 = Image.open('hand/sheet.png')
third = hand0.height // 3
hand = Image.new('RGB', (hand0.width, third * 2), BG)
hand.paste(hand0.crop((0, 0, hand0.width, third)), (0, 0))
hand.paste(hand0.crop((0, third * 2, hand0.width, third * 3)), (0, third))
scale = (W - 40) / hand.width
hand = hand.resize((int(hand.width * scale), int(hand.height * scale)), Image.NEAREST)
sheet.paste(hand, (20, y))
y += hand.height + 20
sheet = sheet.crop((0, 0, W, y))
sheet.save('../review/katanas-propuesta.png')
print(sheet.size)
