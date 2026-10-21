import sys
sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/approve/_work/02-fuego-firmas')
from PIL import Image, ImageDraw, ImageOps
from fxlib import *

char, cf = character()
char_r = ImageOps.mirror(char)          # faces right (caster)
cf_r = (char.width - 1 - cf[0], cf[1])

M = 24
CW1, GAP, CW2 = 800, 40, 970
W = M + CW1 + GAP + CW2 + M
H = 1500
im = Image.new('RGBA', (W, H), BG)
d = ImageDraw.Draw(im)
th = title_bar(im, '02 · Firmas de fuego: Gran bola de fuego y Gran aniquilación de fuego',
               'Normal (izquierda) vs mejorada (derecha, cuando el jutsu sale potenciado) · tamaño real del sprite (1x) · personaje de escala ≈ 1,7 m',
               size=26, subsize=16)
X1 = M
X2 = M + CW1 + GAP


def section(y, title, note):
    text(d, (M, y), title, 22, ACCENT, bold=True)
    text(d, (M + text_w(title, 22, True) + 16, y + 5), note, 15, GREY)
    d.line([(M, y + 34), (W - M, y + 34)], fill=LINE, width=1)
    return y + 46


def colhead(x, y, s):
    text(d, (x, y), s, 17, WHITE, bold=True)


# ---------------- Section A: Great Fireball (1x) ----------------
y = section(th + 18, 'Gran bola de fuego', 'vuela en bucle (6 fotogramas) hasta el objetivo y estalla en el suelo (impacto de un solo pase)')
colhead(X1, y, 'NORMAL · radio 1,5 m')
colhead(X2, y, 'MEJORADA · radio 2,25 m')
G = y + 40 + 140        # ground line of the row

def fire_cell(x0, name, burst_f, fly_dx, burst_dx, char_dx, ell_half, ell_label):
    fa = anchor(name)
    # fly key frame, ball at chest height
    place(im, frame(name, 'fly', 0), fa, x0 + fly_dx, G - 60)
    # burst peak frame at the ground point
    place(im, frame(name, 'burst', burst_f), fa, x0 + burst_dx, G)
    # character beside the burst, feet on the same ground line
    place(im, char, cf, x0 + char_dx, G)
    n = nframes(name, 'burst')
    text(d, (x0 + fly_dx, G + 20), 'En vuelo', 15, GREY, anchor='ma')
    by = G + spec(name)['frameH'] - fa[1] + 8
    bracket(d, x0 + burst_dx - ell_half, x0 + burst_dx + ell_half, by, ell_label, size=14)
    text(d, (x0 + burst_dx, by + 30), f'Impacto (fotograma {burst_f + 1} de {n})', 15, GREY, anchor='ma')


fire_cell(X1, 'fireball', 3, 20 + 88, 20 + 88 + 150, 20 + 88 + 150 + 88 + 40, 86, '3 m')
fire_cell(X2, 'fireball_great', 4, 20 + 136, 20 + 136 + 230, 20 + 136 + 230 + 136 + 40, 128, '4,5 m')
d.line([(M + CW1 + GAP // 2, y), (M + CW1 + GAP // 2, G + 150)], fill=LINE, width=1)

# ---------------- Section B: Great Fire Annihilation (1x) ----------------
y = section(G + 168, 'Gran aniquilación de fuego', 'cono de 60° desde los pies del lanzador: oleada → arde (bucle) → se apaga')
colhead(X1, y, 'NORMAL · cono de 12 m')
colhead(X2, y, 'MEJORADA · cono de 15 m, con dragón de fuego')
GA = y + 40 + 431 + 4


def cone_cell(x0, name, length_px, label):
    ax = x0 + 52
    place(im, char_r, cf_r, ax - 24, GA)            # caster at the apex, facing the cone
    place(im, frame(name, 'burn', 0), anchor(name), ax, GA)
    by = GA + 104
    bracket(d, ax, ax + length_px, by, label, size=15)
    text(d, (ax - 24, GA + 14), 'lanzador', 13, GREY, anchor='ma')
    text(d, (ax + length_px // 2, by + 30), 'Arde (fotograma 1 del bucle)', 15, GREY, anchor='ma')


cone_cell(X1, 'annihilation', 684, '12 m')
cone_cell(X2, 'annihilation_enh', 855, '15 m')
d.line([(M + CW1 + GAP // 2, y), (M + CW1 + GAP // 2, GA + 156)], fill=LINE, width=1)

# ---------------- footer ----------------
fy = GA + 168
d.line([(M, fy), (W - M, fy)], fill=LINE, width=1)
text(d, (M, fy + 12), 'Siguientes archivos: zoom 2x de cada jutsu (así se ve en pantalla), detalle 4x y animaciones GIF sobre el suelo real del mapa del río.', 15, GREY)
text(d, (M, fy + 34), 'El resto de la hoja de fuego y el fénix ya están aprobados y no se repiten aquí.', 15, GREY)
im = im.crop((0, 0, W, fy + 66))
im.save(OUT + '02-fuego-firmas.png')
print(im.size)
