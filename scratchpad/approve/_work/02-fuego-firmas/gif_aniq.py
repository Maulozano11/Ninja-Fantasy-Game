"""Annihilation GIFs at 1x on the real ground: surge once -> burn loop x2 -> fade, hold ~600 ms.
usage: gif_aniq.py normal|enh [grass_colors]"""
import sys
sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/approve/_work/02-fuego-firmas')
from PIL import Image, ImageDraw, ImageOps
from fxlib import *
from giflib import *

which = sys.argv[1]
GRASS_COLORS = int(sys.argv[2]) if len(sys.argv) > 2 else 32
char, cf = character()
char_r = ImageOps.mirror(char)
cf_r = (char.width - 1 - cf[0], cf[1])
AX = 64
if which == 'normal':
    name, G, W1, H1, gx, gy = 'annihilation', 329, 804, 411, 20, 385
    title = 'Gran aniquilación de fuego · NORMAL · cono de 12 m'
    out_name = '02-fuego-aniquilacion-normal.gif'
else:
    name, G, W1, H1, gx, gy = 'annihilation_enh', 437, 979, 535, 20, 362
    title = 'Gran aniquilación de fuego · MEJORADA · cono de 15 m'
    out_name = '02-fuego-aniquilacion-mejorada.gif'
bg = grass(gx, gy, W1, H1, GRASS_COLORS)
fa = anchor(name)
seq = [('surge', f, 'Oleada') for f in range(nframes(name, 'surge'))]
for rep in (1, 2):
    seq += [('burn', f, f'Arde (bucle {rep} de 2)') for f in range(nframes(name, 'burn'))]
seq += [('fade', f, 'Se apaga') for f in range(nframes(name, 'fade'))]
assert all(fps(name, a) == 12 for a in ('surge', 'burn', 'fade'))

BAND = 40
frames = []
for anim, f, phase in seq:
    sc = bg.copy()
    place(sc, char_r, cf_r, AX - 24, G)           # caster at the apex, facing the cone
    place(sc, frame(name, anim, f), fa, AX, G)
    out = Image.new('RGBA', (W1, H1 + BAND), BG)
    out.alpha_composite(sc, (0, BAND))
    d = ImageDraw.Draw(out)
    d.rectangle([0, 0, W1, BAND - 1], fill=BAR)
    text(d, (10, 4), title, 15, WHITE, bold=True)
    text(d, (10, 22), f'{phase} · fotograma {f + 1}', 13, ACCENT)
    text(d, (W1 - 10, 22), 'tamaño real 1x (en pantalla se ve al doble)', 13, GREY, anchor='ra')
    frames.append(out)

durs = durations_12fps(len(frames), hold_last_ms=600)
size, mode = save_gif(frames, durs, OUT + out_name, protect_imgs=[sheet(name), char, bg])
print(out_name, 'frames', len(frames), 'size', frames[0].size, 'bytes', size, mode, 'ms', sum(durs))
contact(frames, WORK + f'contact_aniq_{which}.png', cols=4)
