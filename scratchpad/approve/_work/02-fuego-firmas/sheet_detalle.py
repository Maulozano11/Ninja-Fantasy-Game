import sys
sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/approve/_work/02-fuego-firmas')
from PIL import Image, ImageDraw
from fxlib import *

EDGE = (150, 40, 150, 255)   # outside-the-frame marker


def crop(name, anim, f, box, k, pad=3):
    """Region of one frame on the dark background, upscaled k (nearest). Where the box
    touches the frame border, `pad` px of magenta show what lies outside the frame."""
    fr = frame(name, anim, f)
    fw, fh = fr.size
    cv = Image.new('RGBA', (fw + 2 * pad, fh + 2 * pad), EDGE)
    inner = Image.new('RGBA', (fw, fh), BG)
    inner.alpha_composite(fr)
    cv.paste(inner, (pad, pad))
    x0, y0, x1, y1 = box
    c = cv.crop((x0 + pad - (pad if x0 == 0 else 0), y0 + pad - (pad if y0 == 0 else 0),
                 x1 + pad + (pad if x1 == fw else 0), y1 + pad + (pad if y1 == fh else 0)))
    return up(c, k)


M = 24
W = 1900
im = Image.new('RGBA', (W, 4000), BG)
d = ImageDraw.Draw(im)
th = title_bar(im, '02 · Firmas de fuego: detalles con zoom',
               'Zoom 4x de las partes clave y zoom 2–4x de los defectos que vi en el arte (no los he corregido: es trabajo del artista)',
               size=26, subsize=16)


def flow(items, y, maxw=W - 2 * M, gap=28, cap=16):
    """Lay out (image, [caption lines]) left to right, wrapping rows."""
    x, rowh = M, 0
    for img, lines in items:
        h = img.height + 10 + len(lines) * (cap + 6)
        if x > M and x + img.width > M + maxw:
            x, y, rowh = M, y + rowh + gap, 0
        im.alpha_composite(img, (x, y))
        d.rectangle([x - 1, y - 1, x + img.width, y + img.height], outline=LINE)
        ty = y + img.height + 8
        for i, s in enumerate(lines):
            text(d, (x, ty), s, cap, WHITE if i == 0 else GREY, bold=(i == 0))
            ty += cap + 6
        x += max(img.width, max(text_w(s, cap, True) for s in lines)) + gap
        rowh = max(rowh, h)
    return y + rowh + gap


# ---- key details at 4x ----
y = th + 18
text(d, (M, y), 'Detalle 4x', 22, ACCENT, bold=True)
y += 40
y = flow([
    (crop('annihilation_enh', 'burn', 0, (668, 0, 900, 250), 4),
     ['Mejorada: cabeza del dragón de fuego (zoom 4x)', 'Fauces abiertas, colmillos, ojo encendido y crin de llamas.']),
    (crop('annihilation', 'burn', 0, (556, 0, 744, 236), 4),
     ['Normal: cresta de la ola (zoom 4x)', 'El rizo de la cresta se lee como una masa amarilla, no como un borde de ola nítido.']),
], y)

# ---- defects ----
d.line([(M, y - 8), (W - M, y - 8)], fill=LINE, width=1)
text(d, (M, y + 4), 'Defectos vistos en el arte', 22, ACCENT2, bold=True)
text(d, (M + text_w('Defectos vistos en el arte', 22, True) + 16, y + 10),
     'el borde morado marca el límite del fotograma: lo que toca ese borde queda cortado en recto', 15, GREY)
y += 48
y = flow([
    (crop('fireball_great', 'fly', 1, (0, 60, 110, 190), 3),
     ['Bola mejorada, en vuelo (3x)', 'La cola de humo se corta recta', 'en el borde izquierdo (todos los fotogramas).']),
    (crop('fireball', 'burst', 4, (16, 0, 176, 64), 3),
     ['Bola normal, impacto (3x)', 'La bola de fuego y el humo se cortan arriba', '(fotogramas 2–8; en la mejorada, 3, 4, 6 y 7).']),
    (crop('annihilation_enh', 'burn', 0, (130, 0, 330, 56), 3),
     ['Aniquilación mejorada (3x)', 'El techo de humo se corta recto arriba', 'desde mitad de la oleada hasta el final.']),
], y)
y = flow([
    (crop('annihilation', 'burn', 0, (664, 20, 744, 200), 3),
     ['Aniquilación normal (3x)', 'La cresta toca el borde derecho', 'y queda cortada (oleada final y todo el bucle).']),
    (crop('annihilation', 'fade', 3, (380, 236, 744, 424), 2),
     ['Aniquilación, «se apaga» (2x)', 'Quedan bloques rojos planos con costuras', 'rectas y un corte vertical (igual en la mejorada).']),
    (crop('annihilation', 'burn', 0, (0, 300, 64, 352), 4),
     ['Vértice del cono (4x)', '3 líneas rojas finas sueltas asoman', 'delante de las llamas, a los pies del lanzador.']),
], y)
y = flow([
    (crop('annihilation_enh', 'surge', 2, (236, 176, 420, 330), 3),
     ['Mejorada, oleada fotograma 3 (3x)', 'Una mancha rojo oscuro, sin forma clara,', 'junto a donde nace el cuello del dragón.']),
], y)
d.line([(M, y - 8), (W - M, y - 8)], fill=LINE, width=1)
text(d, (M, y + 4), 'Además, en movimiento (se ve en los GIF)', 19, ACCENT2, bold=True)
y += 38
for s_ in ['· Aniquilación mejorada: el techo de humo aparece de golpe en el fotograma 5 de la oleada (de nada a una franja de lado a lado).',
           '· Aniquilación mejorada: el dragón desaparece de golpe entre los fotogramas 2 y 3 de «se apaga».',
           '· Al final de «se apaga» todavía quedan humo y brasas (en la mejorada, también el techo de humo): en el juego se borran de golpe.']:
    text(d, (M, y), s_, 16, WHITE)
    y += 28
y += 16
im = im.crop((0, 0, W, y))
im.save(OUT + '02-fuego-firmas-detalle.png')
print(im.size)
