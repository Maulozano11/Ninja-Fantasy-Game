# The owner's sheets (Spanish labels):
#  - poses-campamento-referencia.png: for leer / recargado / sentado, his example next to antes (camp/hands-book)
#    and ahora on Solen, Akira and Aiden.
#  - leer-vs-tu-ejemplo.png: the read pose next to his first "leer" example at the same scale, zoomed.
from PIL import Image, ImageDraw, ImageFont

D = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/camp-ref'
G = 256
BG = (38, 42, 58)
INK = (240, 236, 220)
SUB = (200, 196, 180)
FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 22)
BIG = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 26)
SMALL = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 18)
HIS = Image.open(f'{D}/owner-camp-poses.webp').convert('RGB')
K = 2.13  # his picture's pixels per sprite pixel


def load(path):
    with open(path, 'rb') as f:
        im = Image.frombytes('RGBA', (G, G), f.read())
    bg = Image.new('RGBA', (G, G), BG + (255,))
    bg.alpha_composite(im)
    return bg.convert('RGB')


def ours(R, i, pose, f, crop, s):
    return load(f'{D}/{R}/p{i}-male-held-{pose}-{f}.rgba').crop(crop).resize(((crop[2] - crop[0]) * s, (crop[3] - crop[1]) * s), Image.NEAREST)


def his(box, s, fig=None):
    """His picture's region `box` scaled so one sprite pixel is `s` screen pixels, like ours. With `fig`
    (his figure's box, a few pixels of margin added) only the figure is kept, on our background."""
    x0, y0, x1, y1 = box
    c = Image.new('RGB', (x1 - x0, y1 - y0), BG)
    keep = fig and (fig[0] - 6, fig[1] - 4, fig[2] + 6, fig[3] + 4)
    kx0, ky0, kx1, ky1 = keep or (0, 0, HIS.width, HIS.height)
    kx0, ky0, kx1, ky1 = max(kx0, x0, 0), max(ky0, y0, 0), min(kx1, x1, HIS.width), min(ky1, y1, HIS.height)
    c.paste(HIS.crop((kx0, ky0, kx1, ky1)), (kx0 - x0, ky0 - y0))
    k = s / K
    return c.resize((round(c.width * k), round(c.height * k)), Image.LANCZOS)


# --- the three poses side by side -------------------------------------------------------------
S = 3
CROP = (62, 116, 162, 226)  # sprite pixels, the same for every pose
CW, CH = (CROP[2] - CROP[0]) * S, (CROP[3] - CROP[1]) * S
# His top row (Solen): each example's region, the same size as our cell, its figure's feet on our feet line.
def his_cell(fig_box):
    x0, y0, x1, y1 = fig_box
    w, h = CW / S * K, CH / S * K
    cx = (x0 + x1) / 2
    feet = y1 + (CROP[3] - 221) * K  # our feet are at sprite row 221
    return (round(cx - w / 2), round(feet - h), round(cx + w / 2), round(feet))


POSES = [
    ('leer', 'read', (69, 27, 197, 214), 'tu primer ejemplo:\nla mano en la barbilla'),
    ('recargado', 'lean', (637, 20, 760, 215), 'tu ejemplo:\nbrazos cruzados'),
    ('sentado', 'sit', (1055, 30, 1181, 214), 'tu ejemplo:\nmanos entrelazadas'),
]
NAMES = ['Solen', 'Akira', 'Aiden']
LW, TOP, GAP = 20, 110, 10
cols = 1 + 2 * len(NAMES)
W = LW + cols * (CW + GAP) + 20
RH = CH + 70
H = TOP + len(POSES) * RH + 10
img = Image.new('RGB', (W, H), BG)
d = ImageDraw.Draw(img)
d.text((LW, 14), 'Poses del campamento con tu imagen como referencia', font=BIG, fill=INK)
d.text((LW, 50), 'antes = la versión anterior (manos nuevas, libro del grimorio) · ahora = copiado de tu imagen', font=SMALL, fill=SUB)
heads = ['tu ejemplo'] + [f'{n} · {t}' for n in NAMES for t in ('antes', 'ahora')]
for c, t in enumerate(heads):
    d.text((LW + c * (CW + GAP) + 6, TOP - 30), t, font=FONT, fill=INK)
for r, (label, pose, fig, note) in enumerate(POSES):
    y = TOP + r * RH
    if r:
        d.line([(0, y - 6), (W, y - 6)], fill=(90, 96, 120), width=2)
    ex = his(his_cell(fig), S, fig)
    cell = Image.new('RGB', (CW, CH), BG)
    cell.paste(ex, (0, 0))
    img.paste(cell, (LW, y))
    for i in range(3):
        for k, R in enumerate(['raw-before', 'raw-after']):
            img.paste(ours(R, i, pose, 0, CROP, S), (LW + (1 + 2 * i + k) * (CW + GAP), y))
    d.text((LW + 6, y + CH + 6), label.upper(), font=BIG, fill=INK)
    d.text((LW + 230, y + CH + 10), note.replace('\n', ' '), font=SMALL, fill=SUB)
img.save(f'{D}/poses-campamento-referencia.png')
print('poses-campamento-referencia.png', img.size)

# --- the read pose next to his first example, zoomed ------------------------------------------
Z = 6
RC = (78, 128, 158, 206)  # sprite pixels: from the hair to the knees
RW, RHH = (RC[2] - RC[0]) * Z, (RC[3] - RC[1]) * Z
# The same region in his picture (his figure aligned to ours, see fine-antes-leer1.png: sprite (82,134) = his (68,27)).
hb = (68 + (RC[0] - 82) * K, 27 + (RC[1] - 134) * K, 68 + (RC[2] - 82) * K, 27 + (RC[3] - 134) * K)
panels = [
    ('tu ejemplo', his(tuple(round(v) for v in hb), Z).resize((RW, RHH), Image.LANCZOS)),
    ('ahora: cuadro clave', ours('raw-after', 0, 'read', 0, RC, Z)),
    ('ahora: pasa una página', ours('raw-after', 0, 'read', 10, RC, Z)),
]
small = [('Akira', ours('raw-after', 1, 'read', 0, RC, 3)), ('Aiden', ours('raw-after', 2, 'read', 0, RC, 3))]
W2 = 20 + len(panels) * (RW + 14) + 6
H2 = 100 + RHH + 50 + small[0][1].height + 50
img = Image.new('RGB', (W2, H2), BG)
d = ImageDraw.Draw(img)
d.text((20, 14), 'Leer: tu primer ejemplo y el nuestro, a la misma escala', font=BIG, fill=INK)
d.text((20, 50), 'la mano en la barbilla, el libro abierto en la otra mano, inclinado hacia la cara, tapas de cuero y páginas claras arriba', font=SMALL, fill=SUB)
for c, (t, p) in enumerate(panels):
    x = 20 + c * (RW + 14)
    img.paste(p, (x, 100))
    d.text((x + 4, 100 + RHH + 8), t, font=FONT, fill=INK)
y = 100 + RHH + 50
for c, (t, p) in enumerate(small):
    x = 20 + c * (p.width + 14)
    img.paste(p, (x, y))
    d.text((x + 4, y + p.height + 6), f'{t} · ahora', font=SMALL, fill=INK)
img.save(f'{D}/leer-vs-tu-ejemplo.png')
print('leer-vs-tu-ejemplo.png', img.size)
