# The owner's sheets (Spanish labels), from renders in v3/fin (r.mts names: p{i}-male-held-own-{pose}-{f}.rgba).
#  - leer-vs-tu-ejemplo.png: his first "leer" | ours key frame | ours page turn (Solen), same scale; then Aiden and Akira large.
#  - aiden-leyendo.png + .gif: Aiden reading, all 12 frames at 4x.
#  - poses-campamento.png: leer / recargado / sentado, his example then Solen, Akira, Aiden.
import numpy as np
from PIL import Image, ImageDraw, ImageFont

D = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/camp-ref'
R = D + '/v3/fin'
OUT = D + '/v3'
G = 256
BG = (38, 42, 58)
INK = (240, 236, 220)
SUB = (200, 196, 180)
FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 22)
BIG = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 26)
SMALL = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 18)
HIS0 = Image.open(f'{D}/owner-camp-poses.webp').convert('RGB')
PAD = 60
HIS = Image.new('RGB', (HIS0.width + 2 * PAD, HIS0.height + 2 * PAD), (38, 43, 57))
HIS.paste(HIS0, (PAD, PAD))
# his picture: fine pixel (i, j) of his first leer = sprite (81 + i, 129 + j) as the sheet had it, centre at
# webp (U + (i + .5) P, V + (j + .5) P); our face is now one row lower than on that sheet.
P, U, V = 2.1482, 66.37, 17.10
NAMES = {0: 'Solen', 1: 'Akira', 2: 'Aiden'}


def load(pose, i, f, crop, s):
    with open(f'{R}/p{i}-male-held-own-{pose}-{f}.rgba', 'rb') as fh:
        im = Image.frombytes('RGBA', (G, G), fh.read())
    bg = Image.new('RGBA', (G, G), BG + (255,))
    bg.alpha_composite(im)
    c = bg.convert('RGB').crop(crop)
    return c.resize((c.width * s, c.height * s), Image.NEAREST)


def his_leer(crop, s, dy=1):
    """His first leer over our sprite box `crop` (our frame), at s screen px per sprite px."""
    x0, y0, x1, y1 = crop
    box = (PAD + U + (x0 - 81) * P, PAD + V + (y0 - dy - 129) * P, PAD + U + (x1 - 81) * P, PAD + V + (y1 - dy - 129) * P)
    return HIS.resize((round((x1 - x0) * s), round((y1 - y0) * s)), Image.LANCZOS, box=box)


def his_box(fig, crop, s, feet_his, feet_ours=221):
    """Another example of his (fig = his figure's box in the webp), its feet on our feet row."""
    x0, y0, x1, y1 = crop
    w, h = (x1 - x0) * P, (y1 - y0) * P
    cx = (fig[0] + fig[2]) / 2
    bottom = feet_his + (y1 - feet_ours) * P
    box = (PAD + cx - w / 2, PAD + bottom - h, PAD + cx + w / 2, PAD + bottom)
    im = HIS.resize((round((x1 - x0) * s), round((y1 - y0) * s)), Image.LANCZOS, box=box)
    # keep only his figure (the next column's figure may show at the edge)
    out = Image.new('RGB', im.size, BG)
    kx0 = max(0, round((PAD + fig[0] - 6 - box[0]) / P * s))
    kx1 = min(im.width, round((PAD + fig[2] + 6 - box[0]) / P * s))
    out.paste(im.crop((kx0, 0, kx1, im.height)), (kx0, 0))
    return out


# --- 1. leer: his example and ours ------------------------------------------------------------
Z = 6
RC = (96, 134, 150, 192)
RW, RH = (RC[2] - RC[0]) * Z, (RC[3] - RC[1]) * Z
panels = [
    ('tu ejemplo', his_leer(RC, Z)),
    ('ahora: cuadro clave', load('read', 0, 0, RC, Z)),
    ('ahora: pasa una página', load('read', 0, 10, RC, Z)),
]
Z2 = 5
RC2 = (92, 128, 152, 196)
big = [('Aiden', load('read', 2, 0, RC2, Z2)), ('Akira', load('read', 1, 0, RC2, Z2))]
W = max(20 + len(panels) * (RW + 14), 20 + len(big) * (big[0][1].width + 14)) + 6
H = 100 + RH + 50 + big[0][1].height + 60
img = Image.new('RGB', (W, H), BG)
d = ImageDraw.Draw(img)
d.text((20, 14), 'Leer: tu primer ejemplo y el nuestro, a la misma escala', font=BIG, fill=INK)
d.text((20, 50), 'el libro copiado de tu ejemplo: tapas de cuero en perspectiva, marco claro, páginas en V', font=SMALL, fill=SUB)
d.text((20, 72), 'la mano bajo la barbilla y la mano en la tapa, copiadas de tu dibujo', font=SMALL, fill=SUB)
for c, (t, p) in enumerate(panels):
    x = 20 + c * (RW + 14)
    img.paste(p, (x, 100))
    d.text((x + 4, 100 + RH + 8), t, font=FONT, fill=INK)
y = 100 + RH + 50
for c, (t, p) in enumerate(big):
    x = 20 + c * (p.width + 14)
    img.paste(p, (x, y))
    d.text((x + 4, y + p.height + 6), f'{t} leyendo', font=FONT, fill=INK)
img.save(f'{OUT}/leer-vs-tu-ejemplo.png')
print('leer-vs-tu-ejemplo.png', img.size)

# --- 2. Aiden reading: all frames, 4x, and a gif -----------------------------------------------
S = 4
AC = (84, 120, 156, 226)
frames = [load('read', 2, f, AC, S) for f in range(12)]
fw, fh = frames[0].size
cols = 6
img = Image.new('RGB', (20 + cols * (fw + 10), 100 + 2 * (fh + 40)), BG)
d = ImageDraw.Draw(img)
d.text((20, 14), 'Aiden leyendo: los 12 cuadros (4x)', font=BIG, fill=INK)
d.text((20, 50), 'respira; en los cuadros 10 a 12 pasa una página · guanteletes: el filo de acero con remache dorado en la mano del libro, la placa de acero bajo la barbilla', font=SMALL, fill=SUB)
for f, im in enumerate(frames):
    x = 20 + (f % cols) * (fw + 10)
    yy = 100 + (f // cols) * (fh + 40)
    img.paste(im, (x, yy))
    d.text((x + 4, yy + fh + 4), f'cuadro {f + 1}', font=SMALL, fill=INK)
img.save(f'{OUT}/aiden-leyendo.png')
print('aiden-leyendo.png', img.size)
gif = [load('read', 2, f, AC, S) for f in range(12)]
gif[0].save(f'{OUT}/aiden-leyendo.gif', save_all=True, append_images=gif[1:], duration=[260] * 12, loop=0)
print('aiden-leyendo.gif')

# --- 3. the three camp poses ---------------------------------------------------------------
S = 3
CROP = (62, 116, 162, 226)
CW, CH = (CROP[2] - CROP[0]) * S, (CROP[3] - CROP[1]) * S
POSES = [
    ('leer', 'read', None, 'tu primer ejemplo: la mano en la barbilla'),
    ('recargado', 'lean', ((637, 20, 760, 215), 215), 'tu ejemplo: brazos cruzados (sin cambios)'),
    ('sentado', 'sit', ((1055, 30, 1181, 214), 214), 'tu ejemplo: manos entrelazadas (sin cambios)'),
]
LW, TOP, GAP = 20, 110, 10
cols = 4
W = LW + cols * (CW + GAP) + 10
RHH = CH + 70
H = TOP + len(POSES) * RHH + 10
img = Image.new('RGB', (W, H), BG)
d = ImageDraw.Draw(img)
d.text((LW, 14), 'Poses del campamento', font=BIG, fill=INK)
d.text((LW, 50), 'leer: libro y manos copiados de tu ejemplo · recargado y sentado como estaban', font=SMALL, fill=SUB)
for c, t in enumerate(['tu ejemplo', 'Solen', 'Akira', 'Aiden']):
    d.text((LW + c * (CW + GAP) + 6, TOP - 30), t, font=FONT, fill=INK)
for r, (label, pose, fig, note) in enumerate(POSES):
    y = TOP + r * RHH
    if r:
        d.line([(0, y - 6), (W, y - 6)], fill=(90, 96, 120), width=2)
    ex = his_leer(CROP, S) if fig is None else his_box(fig[0], CROP, S, fig[1])
    ImageDraw.Draw(ex).rectangle([0, 0, ex.width, 36], fill=BG)  # his column labels
    img.paste(ex, (LW, y))
    for k, i in enumerate([0, 1, 2]):
        img.paste(load(pose, i, 0, CROP, S), (LW + (1 + k) * (CW + GAP), y))
    d.text((LW + 6, y + CH + 6), label.upper(), font=BIG, fill=INK)
    d.text((LW + 230, y + CH + 10), note, font=SMALL, fill=SUB)
img.save(f'{OUT}/poses-campamento.png')
print('poses-campamento.png', img.size)
