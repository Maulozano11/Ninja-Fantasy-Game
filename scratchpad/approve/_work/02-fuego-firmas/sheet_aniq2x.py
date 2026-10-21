import sys
sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/approve/_work/02-fuego-firmas')
from PIL import Image, ImageDraw, ImageOps
from fxlib import *

K = 2
char, cf = character()
char_r = ImageOps.mirror(char)
cf_r = (char.width - 1 - cf[0], cf[1])
M = 24
AX = M + 100                      # apex x at 2x
W = AX - 24 + 920 * K + M
im = Image.new('RGBA', (W, 2600), BG)
d = ImageDraw.Draw(im)
th = title_bar(im, '02 · Gran aniquilación de fuego: normal vs mejorada · zoom 2x',
               'Zoom 2x = como se ve en pantalla en el juego (1080p) · el lanzador está en el vértice del cono · fotograma 1 del bucle «arde»',
               size=26, subsize=16)


def block(y, name, head, length_m):
    text(d, (M, y), head, 19, ACCENT, bold=True)
    fa = anchor(name)
    G = y + 36 + fa[1] * K
    place(im, char_r, cf_r, AX - 24 * K // 2 - 24, G, K)
    place(im, frame(name, 'burn', 0), fa, AX, G, K)
    by = G + (spec(name)['frameH'] - fa[1]) * K + 6
    bracket(d, AX, AX + int(round(length_m * 57 * K)), by, f'{length_m} m de largo'.replace('.', ','), k=2, size=17)
    text(d, (AX - 48, G + 22), 'lanzador', 15, GREY, anchor='ma')
    return by + 48


y = block(th + 18, 'annihilation', 'NORMAL · cono de 12 m · llamas de unos 5 m (unos 3 personajes de alto)', 12)
d.line([(M, y), (W - M, y)], fill=LINE, width=1)
y = block(y + 16, 'annihilation_enh', 'MEJORADA · cono de 15 m · llamas más altas, segunda cresta, dragón de fuego y techo de humo', 15)
d.line([(M, y), (W - M, y)], fill=LINE, width=1)
text(d, (M, y + 12), 'En el juego: oleada (8 fotogramas) → arde en bucle 2 veces (6 fotogramas) → se apaga (6 fotogramas), unos 2,2 s en total. Ver los GIF.', 15, GREY)
im = im.crop((0, 0, W, y + 44))
im.save(OUT + '02-fuego-firmas-aniquilacion-2x.png')
print(im.size)
