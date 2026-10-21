import sys
sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/approve/_work/10-campamento-noche')
from common import *  # noqa

M = 24
G = 16
SW = W * 2 + M * 2 + G       # 1984
f20, f18, f16 = font(20), font(18), font(16)
f20b = font(20, True)

blocks = []  # (image, x, y)
y = 0
bar = title_bar(SW, '10 · Campamento de noche — escena pintada', 'nuevo · para aprobar')
blocks.append((bar, 0, 0))
y = bar.height + 14


def label(text, x, yy, fnt=f20b, fill=TXT):
    t = Image.new('RGBA', (SW, 30), (0, 0, 0, 0))
    ImageDraw.Draw(t).text((x, 15), text, font=fnt, fill=fill, anchor='lm')
    return (t, 0, yy)


# --- 1. main scene at 2x with spot markers --------------------------------------
blocks.append(label('Escena completa con la fogata aprobada encendida  ·  zoom 2x  (en el juego mide 960 × 420 px)', M, y))
y += 34
main = up(compose('burning', 0), 2)
ov = Image.new('RGBA', main.size, (0, 0, 0, 0))
d = ImageDraw.Draw(ov)
for i, s in enumerate(scene['spots']):
    cx, cy = s['x'] * 2, s['y'] * 2
    d.ellipse([cx - 26, cy - 9, cx + 26, cy + 9], outline=(200, 225, 240, 120), width=2)
    d.text((cx - 32, cy - 4), str(i + 1), font=font(15, True), fill=(200, 225, 240, 150), anchor='rm')
main.alpha_composite(ov)
blocks.append((main, (SW - main.width) // 2, y))
y += main.height + 6
blocks.append(label('Los óvalos 1–4 marcan dónde se colocan los personajes (el juego los dibuja; aquí van vacíos).  '
                    'Las copas y lianas de arriba van DELANTE de los personajes.', M, y, f18, SUB))
y += 30 + 18

# --- 2. real size, fire on / off --------------------------------------------------
blocks.append(label('Tamaño real en el juego (1x)', M, y))
y += 34
on = compose('burning', 0)
off = compose('out', 0, ground='ground_nofire.png')
blocks.append((on, M, y))
blocks.append((off, M + W + G, y))
y += H + 4
t = Image.new('RGBA', (SW, 30), (0, 0, 0, 0))
dd = ImageDraw.Draw(t)
dd.text((M + 8, 15), 'Fuego encendido (suelo con brillo cálido)', font=f18, fill=SUB, anchor='lm')
dd.text((M + W + G + 8, 15), 'Fuego apagado (suelo sin fuego + fogata apagada)', font=f18, fill=SUB, anchor='lm')
blocks.append((t, 0, y))
y += 30 + 18

# --- 3. layers -------------------------------------------------------------------
blocks.append(label('Capas por separado, de atrás hacia delante  ·  1x  (los cuadros grises = transparente)', M, y))
y += 34
cells = [
    ('sky.png', '1 · Cielo (luna, nubes, estrellas)'),
    ('forest_far.png', '2 · Bosque lejano (siluetas con niebla)'),
    ('forest_mid.png', '3 · Bosque medio (troncos y copas)'),
    ('ground.png', '4 · Suelo (claro con brillo del fuego)'),
    ('ground_nofire.png', '4b · Suelo sin fuego (alternativa)'),
    ('frame_back.png', '5 · Marco: troncos y raíces (detrás de personajes)'),
    ('frame_front.png', '6 · Marco: copas y lianas (delante de personajes)'),
    (None, 'Fogata aprobada · 8 cuadros a 12 fps · zoom 2x'),
]
for i, (fn, text) in enumerate(cells):
    cx = M + (i % 2) * (W + G)
    cy = y + (i // 2) * (30 + H + 14)
    t = Image.new('RGBA', (W, 30), (0, 0, 0, 0))
    ImageDraw.Draw(t).text((8, 15), text, font=f18, fill=TXT, anchor='lm')
    blocks.append((t, cx, cy))
    cell = checker(W, H)
    if fn:
        lay = L(fn)
        cell.alpha_composite(lay)
    else:
        cell = checker(W, H)
        strip = Image.new('RGBA', (FW * 8, FH), (0, 0, 0, 0))
        for f in range(8):
            strip.alpha_composite(cf_frame('burning', f), (f * FW, 0))
        strip = up(strip, 2)
        cell.alpha_composite(strip, ((cell.width - strip.width) // 2, 40))
        out = up(cf_frame('out', 0), 2)
        smo = up(cf_frame('smoldering', 0), 2)
        cell.alpha_composite(smo, (cell.width // 2 - smo.width - 20, 40 + strip.height + 30))
        cell.alpha_composite(out, (cell.width // 2 + 20, 40 + strip.height + 30))
        dc = ImageDraw.Draw(cell)
        dc.text((cell.width // 2 - 20 - smo.width // 2, 40 + strip.height + 30 + smo.height + 14), 'brasas', font=f16, fill=SUB, anchor='mm')
        dc.text((cell.width // 2 + 20 + out.width // 2, 40 + strip.height + 30 + out.height + 14), 'apagada', font=f16, fill=SUB, anchor='mm')
        dc.text((cell.width // 2, 20), 'encendida', font=f16, fill=SUB, anchor='mm')
    blocks.append((cell, cx, cy + 30))
y += 4 * (30 + H + 14) + 10

sheet = Image.new('RGBA', (SW, y), BG)
for im, x, yy in blocks:
    sheet.alpha_composite(im, (x, yy))
sheet.convert('RGB').save(OUT + '10-campamento-noche.png', optimize=True)
print(sheet.size)
