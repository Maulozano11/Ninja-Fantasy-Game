import sys
sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/approve/_work/02-fuego-firmas')
from PIL import Image, ImageDraw
from fxlib import *

K = 2
char, cf = character()
M = 24
CW1, GAP, CW2 = 560, 40, 760
W = M + CW1 + GAP + CW2 + M
im = Image.new('RGBA', (W, 1600), BG)
d = ImageDraw.Draw(im)
th = title_bar(im, '02 · Gran bola de fuego: normal vs mejorada · zoom 2x',
               'Zoom 2x = como se ve en pantalla en el juego (1080p) · el personaje es el objetivo, para dar escala',
               size=26, subsize=16)
X1, X2 = M, M + CW1 + GAP
text(d, (X1, th + 18), 'NORMAL · radio 1,5 m', 19, ACCENT, bold=True)
text(d, (X2, th + 18), 'MEJORADA · radio 2,25 m', 19, ACCENT, bold=True)

# row 1: fly
y = th + 60
text(d, (M, y), 'En vuelo (bucle de 6 fotogramas, aquí el 1.º)', 16, WHITE, bold=True)
G = y + 40 + 280


def fly_cell(x0, name, char_dx):
    fa = anchor(name)
    place(im, frame(name, 'fly', 0), fa, x0 + 24 + fa[0] * K, G - 60 * K, K)
    place(im, char, cf, x0 + char_dx, G, K)


fly_cell(X1, 'fireball', 24 + 2 * 115 + 30 + 56)
fly_cell(X2, 'fireball_great', 24 + 2 * 208 + 30 + 56)
d.line([(M, G + 30), (W - M, G + 30)], fill=LINE, width=1)

# row 2: burst peak
y = G + 46
text(d, (M, y), 'Impacto en el suelo (fotograma de máxima llama)', 16, WHITE, bold=True)
G2 = y + 40 + 260


def burst_cell(x0, name, f, ell_half, lab, char_dx):
    fa = anchor(name)
    cx = x0 + 24 + fa[0] * K
    place(im, frame(name, 'burst', f), fa, cx, G2, K)
    place(im, char, cf, x0 + char_dx, G2, K)
    by = G2 + (spec(name)['frameH'] - fa[1]) * K + 10
    bracket(d, cx - ell_half * K, cx + ell_half * K, by, lab, k=2, size=16)
    n = nframes(name, 'burst')
    text(d, (cx, by + 34), f'fotograma {f + 1} de {n}', 15, GREY, anchor='ma')
    return by + 60


b1 = burst_cell(X1, 'fireball', 3, 86, '3 m (radio 1,5 m)', 24 + 2 * 176 + 20 + 56)
b2 = burst_cell(X2, 'fireball_great', 4, 128, '4,5 m (radio 2,25 m)', 24 + 2 * 266 + 20 + 56)
bot = max(b1, b2)
d.line([(M + CW1 + GAP // 2, th + 14), (M + CW1 + GAP // 2, bot)], fill=LINE, width=1)
fy = bot + 10
d.line([(M, fy), (W - M, fy)], fill=LINE, width=1)
text(d, (M, fy + 12), 'La mejorada: bola el doble de grande (88 px frente a 46 px), núcleo blanco, anillo de calor, más humo y brasas;', 15, GREY)
text(d, (M, fy + 34), 'el impacto cubre 4,5 m en lugar de 3 m, con onda expansiva, suelo más quemado y más escombros.', 15, GREY)
im = im.crop((0, 0, W, fy + 66))
im.save(OUT + '02-fuego-firmas-bola-2x.png')
print(im.size)
