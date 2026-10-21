import sys
sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/approve/_work/12-avance')
from common import *

T = W + '/snap/tents/'
NEWM = load_manifest(T + 'manifest.json')
OLDM = load_manifest(T + 'approved_manifest.json')
old_spec, big_spec, sml_spec = OLDM['tent'], NEWM['tent_large'], NEWM['tent_small']
old_fr = frames_of(T + 'approved_tent.png', old_spec, 'idle')
old_burnt = frames_of(T + 'approved_tent.png', old_spec, 'burnt')[0]
big_fr = frames_of(T + 'tent_large.png', big_spec, 'idle')
sml_fr = frames_of(T + 'tent_small.png', sml_spec, 'idle')
ch = Image.open('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art3/char0.png').convert('RGBA')
cbb = ch.getbbox()

Z = 2
PAD = 28
GAPX = 48
items = [
    ('Tienda actual', '(aprobada, ya en el juego)', old_fr[0], old_spec, WHITE),
    ('NUEVA: tienda grande', '(en proceso)', big_fr[0], big_spec, GREEN),
    ('NUEVA: tienda pequeña', '(en proceso)', sml_fr[0], sml_spec, GREEN),
]
widths = [s['frameW'] * Z for *_, s, _ in items]
row1_w = sum(widths) + GAPX * 3 + (cbb[2] - cbb[0]) * Z
page_w = max(row1_w + 2 * PAD + 40, 1720)
ground_y_rel = max(s['anchor'][1] for *_, s, _ in items) * Z + 30  # within the panel
panel1_h = ground_y_rel + 130

Z4 = 4
CROP = (80, 72)
panel2_h = CROP[1] * Z4 + 110
panel3_h = 300
TOP = 96
page_h = TOP + 30 + panel1_h + 40 + panel2_h + 40 + panel3_h + 30
img = Image.new('RGBA', (page_w, page_h), BG)
title_bar(img, '12 · AVANCE — Tiendas de campaña nuevas   (EN PROCESO, aún no es para aprobar)',
          'Arriba: la actual y las dos nuevas a zoom 2x, apoyadas en la misma línea de suelo, con un personaje (1,7 m) para comparar tamaños.')
d = ImageDraw.Draw(img)

# ---- panel 1: side by side at 2x
y1 = TOP + 30
d.rectangle((PAD, y1, page_w - PAD, y1 + panel1_h), fill=PANEL)
gy = y1 + ground_y_rel
d.rectangle((PAD + 10, gy, page_w - PAD - 10, gy + 2), fill=(70, 80, 70, 255))
x = PAD + 30
for (name, sub, fr, spec, col), w in zip(items, widths):
    s = up(fr, Z)
    ax, ay = spec['anchor']
    img.alpha_composite(s, (x, gy - ay * Z))
    text(d, (x + w // 2, gy + 16), name, font(22, True), col, 'ma')
    text(d, (x + w // 2, gy + 46), sub, font(16), GREY, 'ma')
    mw, mh = spec['meters']
    text(d, (x + w // 2, gy + 70), f"{str(mw).replace('.', ',')} m de ancho · {spec['frameW']}×{spec['frameH']} px", font(15), GREY, 'ma')
    x += w + GAPX
c = up(ch.crop(cbb), Z)
img.alpha_composite(c, (x, gy + Z - c.height))
text(d, (x + c.width // 2, gy + 16), 'Personaje', font(20, True), WHITE, 'ma')
text(d, (x + c.width // 2, gy + 46), '1,7 m', font(16), GREY, 'ma')

# ---- panel 2: 4x details
y2 = y1 + panel1_h + 40
text(d, (PAD, y2 - 4), 'Detalles a zoom 4x', font(22, True), WHITE)
text(d, (PAD + 250, y2 + 1), '— el borde de abajo de cada tienda, la textura de la lona nueva y un fallo dentro de la puerta', font(17), GREY)
crops = [
    ('Actual: borde de abajo', 'limpio, con contorno', old_fr[0], (96, 112), GREEN),
    ('Nueva grande: borde de abajo', 'CORTADO en recto', big_fr[0], (66, 166), ORANGE),
    ('Nueva pequeña: borde de abajo', 'CORTADO en recto', sml_fr[0], (40, 97), ORANGE),
    ('Nueva grande: lona y ventana', 'textura de la tela', big_fr[0], (40, 120), GREY),
    ('Nueva grande: dentro de la puerta', 'AGUJERO: se ve el césped', big_fr[0], (124, 124), ORANGE),
]
cx = PAD
cy = y2 + 36
for lab, sub2, fr, (ox, oy), col in crops:
    cr = fr.crop((ox, oy, ox + CROP[0], oy + CROP[1]))
    if sub2.startswith('AGUJERO'):
        cell = up(ground(300, 450, CROP[0], CROP[1]), Z4)  # real battle grass behind it
    else:
        cell = Image.new('RGBA', (CROP[0] * Z4, CROP[1] * Z4), (0x2c, 0x33, 0x2c, 255))
    cell.alpha_composite(up(cr, Z4))
    img.alpha_composite(cell, (cx, cy))
    if col is ORANGE:
        d.rectangle((cx, cy + cell.height + 2, cx + cell.width - 1, cy + cell.height + 5), fill=ORANGE)
    text(d, (cx + cell.width // 2, cy + cell.height + 12), lab, font(16, True), WHITE, 'ma')
    text(d, (cx + cell.width // 2, cy + cell.height + 34), sub2, font(15, col is ORANGE), col, 'ma')
    cx += cell.width + 14

# ---- panel 3: states
y3 = y2 + panel2_h + 40
text(d, (PAD, y3 - 4), 'Estados', font(22, True), WHITE)
text(d, (PAD + 105, y3 + 1), '— la actual tiene versión QUEMADA (para el fuego en combate). Las nuevas todavía no.', font(17), ORANGE)
sy = y3 + 34
b = up(old_burnt.crop(old_burnt.getbbox()), 1)
cell = Image.new('RGBA', (b.width + 30, 230), PANEL)
cell.alpha_composite(b, ((cell.width - b.width) // 2, 230 - b.height - 34))
img.alpha_composite(cell, (PAD, sy))
text(d, (PAD + cell.width // 2, sy + 230 - 28), 'Actual: quemada (tamaño real)', font(15), WHITE, 'ma')
mx = PAD + cell.width + 24
for lab in ('Nueva grande: quemada', 'Nueva pequeña: quemada'):
    d.rounded_rectangle((mx, sy, mx + 300, sy + 230), 8, outline=ORANGE, width=2, fill=PANEL)
    text(d, (mx + 150, sy + 92), 'FALTA', font(30, True), ORANGE, 'ma')
    text(d, (mx + 150, sy + 136), 'todavía no dibujada', font(16), GREY, 'ma')
    text(d, (mx + 150, sy + 202), lab, font(15), WHITE, 'ma')
    mx += 324
ny = sy + 10
for ln in ['Animación de reposo de las nuevas: 4 cuadros a 4 fps;',
           'la lona se mueve con el viento (ver el GIF).',
           '',
           'Las nuevas están giradas en diagonal (vista 3/4),',
           'mientras que la actual se ve casi de lado.']:
    text(d, (mx + 10, ny), ln, font(16), GREY); ny += 24

out = img.convert('RGB')
out.save(OUT + '/12-avance-tiendas.png', optimize=True)
print(out.size)
