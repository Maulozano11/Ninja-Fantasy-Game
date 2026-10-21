import sys
sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/approve/_work/10-campamento-noche')
import json as _json
from common import *  # noqa

M, G = 24, 16
SW = 1984
f18, f16 = font(18), font(16)
f18b = font(18, True)
blocks = []
full = compose('burning', 0)


def crop_up(box, k, src=None):
    return up((src or full).crop(box), k)


def cap(text, w, fill=TXT, fnt=f18b):
    t = Image.new('RGBA', (w, 30), (0, 0, 0, 0))
    ImageDraw.Draw(t).text((2, 15), text, font=fnt, fill=fill, anchor='lm')
    return t


def put(img, x, y, text, fill=TXT):
    blocks.append((cap(text, max(img.width, 600), fill), x, y))
    blocks.append((img, x, y + 30))
    return y + 30 + img.height


bar = title_bar(SW, '10 · Campamento de noche — detalles y escala', 'zoom de la escena pintada')
blocks.append((bar, 0, 0))
y0 = bar.height + 14

# --- row 1 ----------------------------------------------------------------------
tree = crop_up((0, 190, 260, 420), 3)
put(tree, M, y0, 'Árbol del marco: corteza, nudos, musgo y raíces · zoom 3x')
rx = M + tree.width + G
moon = crop_up((430, 25, 810, 145), 3)
yb = put(moon, rx, y0, 'Luna, nubes y bosques del fondo · zoom 3x')
yb += G
pit = crop_up((380, 262, 560, 372), 3)
put(pit, rx, yb, 'Fogata aprobada en el hoyo pintado · zoom 3x')
dx = rx + pit.width + G
blocks.append((cap('Defectos vistos · zoom 3x', 584, WARN), dx, yb))
dy = yb + 30
subs = []
for box, marks, sub in (((430, 150, 475, 240), [(447, 454)], 'franja de tronco'),
                        ((660, 150, 730, 240), [(676, 684), (711, 721)], 'franjas de tronco'),
                        ((190, 312, 250, 357), [], 'helecho en «V»')):
    im = crop_up(box, 3)
    dd = ImageDraw.Draw(im)
    for x0, x1 in marks:
        # small ticks above and below the column instead of a box, so the stripe itself stays visible
        a_, b_ = (x0 - box[0]) * 3, (x1 - box[0] + 1) * 3
        for yy_ in (0, im.height - 8):
            dd.rectangle([a_, yy_, b_ - 1, yy_ + 7], fill=(255, 120, 90, 255))
    blocks.append((im, dx, dy))
    t = Image.new('RGBA', (im.width, 24), (0, 0, 0, 0))
    ImageDraw.Draw(t).text((im.width // 2, 12), sub, font=font(15), fill=SUB, anchor='mm')
    blocks.append((t, dx, dy + im.height + 2))
    dx += im.width + G
ex = dx
fern = Image.new('RGBA', (0, 0))
row1_h = max(30 + tree.height, (yb - y0) + 30 + pit.height)
y1 = y0 + row1_h + 22

# --- row 2: scale with in-game party sprites ----------------------------------------
party = _json.load(open(PARTY + 'party.json'))
sc = Image.new('RGBA', (W, H), (0, 0, 0, 255))
for n in scene['layers']['back']:
    sc.alpha_composite(L(n))
spots = scene['partySpots']
items = []
for p, s in zip(party, spots):
    im = Image.open(PARTY + p['file']).convert('RGBA')
    if s['facing'] == 'left':
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
        fx = im.width - 1 - p['feet'][0]
    else:
        fx = p['feet'][0]
    items.append((s['y'], im, (s['x'] - fx, s['y'] - p['feet'][1])))
items.append((FIRE[1], cf_frame('burning', 0), CF_POS))
for _, im, pos in sorted(items, key=lambda t: t[0]):
    sc.alpha_composite(im, pos)
for n in scene['layers']['front']:
    sc.alpha_composite(L(n))
box = (300, 196, 700, 410)
scale = crop_up(box, 2, sc)
d = ImageDraw.Draw(scale)
bx, by = 24, scale.height - 26
d.rectangle([bx - 6, by - 26, bx + 57 * 2 + 6, by + 14], fill=(14, 18, 22, 200))
d.line([bx, by, bx + 57 * 2, by], fill=TXT, width=3)
d.line([bx, by - 6, bx, by + 6], fill=TXT, width=2)
d.line([bx + 114, by - 6, bx + 114, by + 6], fill=TXT, width=2)
d.text((bx + 57, by - 14), '1 metro', font=f16, fill=TXT, anchor='mm')
put(scale, M, y1, 'Escala: personajes del juego junto al fuego · zoom 2x')
blocks.append((cap('Sin la luz de noche (se ven como de día); sólo para ver el tamaño.', scale.width, SUB, f16), M, y1 + 30 + scale.height + 2))

# --- verdict panel --------------------------------------------------------------------
px = M + scale.width + G * 2
pw = SW - px - M
ph = 30 + scale.height
panel = Image.new('RGBA', (pw, ph), (26, 31, 37, 255))
d = ImageDraw.Draw(panel)
d.rectangle([0, 0, pw - 1, ph - 1], outline=(150, 120, 60, 255), width=2)
d.text((20, 26), '¿Llega al nivel de la referencia?', font=font(22, True), fill=TXT, anchor='lm')
OK, MID, NO = (120, 200, 120, 255), (235, 190, 90, 255), (240, 110, 90, 255)
lines = [
    (OK, 'Sí', 'Árboles del marco: corteza con surcos, nudos, musgo y raíces.'),
    (OK, 'Sí', 'Cielo: luna llena con halo, nubes con borde de luz, estrellas.'),
    (OK, 'Sí', 'Profundidad: bosque lejano azulado con niebla; bosque medio más oscuro.'),
    (OK, 'Sí', 'Copas del marco delante: arco natural con lianas colgando.'),
    (MID, 'A medias', 'Copas de los árboles: bolas con textura, no hojas sueltas.'),
    (MID, 'A medias', 'Hoyo del fuego: mancha naranja plana; el brillo es un halo'),
    (None, '', 'verde-amarillo, no una luz cálida sobre la hierba.'),
    (NO, 'No', 'La fogata aprobada es de día (piedras gris claro) y pequeña'),
    (None, '', 'para el hoyo pintado (unos 56 px frente a unos 160 px).'),
    (NO, 'No', 'Franjas verticales de tronco sobre copas y arbustos del fondo.'),
    (SUB, 'Aparte', 'Tiendas, torii, linterna y demás objetos son sprites aparte;'),
    (None, '', 'no se ven en esta escena.'),
]
yy = 66
for col, tag, text in lines:
    if col:
        d.rounded_rectangle([20, yy - 12, 112, yy + 12], radius=5, fill=col[:3] + (60,), outline=col, width=1)
        d.text((66, yy), tag, font=font(15, True), fill=col, anchor='mm')
    d.text((128, yy), text, font=font(17), fill=TXT, anchor='lm')
    yy += 34
blocks.append((panel, px, y1))
y2 = y1 + 30 + scale.height + 40

sheet = Image.new('RGBA', (SW, y2), BG)
for im, x, yy in blocks:
    sheet.alpha_composite(im, (x, yy))
sheet.convert('RGB').save(OUT + '10-campamento-noche-detalle.png', optimize=True)
print(sheet.size, 'row1 right edge', ex, 'panel', px, pw, ph, 'text bottom', yy)
