"""02-fuego-bola.gif: normal (top lane) and great (bottom lane) Great Fireball, cast at the same
time: the ball flies from the caster to the target with the game's flight curve (slowed down so
the fly loop can be seen), then the burst plays at the target's ground point and holds ~600 ms."""
import sys, math
sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/approve/_work/02-fuego-firmas')
from PIL import Image, ImageDraw, ImageOps
from fxlib import *
from giflib import *

FLY_CYCLES = int(sys.argv[1]) if len(sys.argv) > 1 else 3
GRASS_COLORS = int(sys.argv[2]) if len(sys.argv) > 2 else 32
K = 2
W1, H1 = 565, 392
G1, G2 = 116, 300          # ground rows of the two lanes (1x)
CX, TX = 148, 433          # caster / target feet x (1x): 5 m apart; room behind the caster for the tail
char, cf = character()
char_r = ImageOps.mirror(char)
cf_r = (char.width - 1 - cf[0], cf[1])
bg = grass(40, 375, W1, H1, GRASS_COLORS)

n_fly = 6 * FLY_CYCLES
lanes = [('fireball', G1), ('fireball_great', G2)]
n_burst = {n: nframes(n, 'burst') for n, _ in lanes}
total = n_fly + max(n_burst.values())


def flight(t, G):
    # same curve as the game's renderer (vfxSprites.ts flight()): lift 70 -> 30, arc 30 px
    e = 2 * t * t if t < 0.5 else 1 - (-2 * t + 2) ** 2 / 2
    x = CX + (TX - CX) * e
    y = G - 70 + ((G - 30) - (G - 70)) * e - math.sin(t * math.pi) * 30
    return round(x), round(y)


BAND = 60
f_title = 'Gran bola de fuego: normal (arriba) vs mejorada (abajo) · zoom 2x'
frames = []
for i in range(total):
    sc = bg.copy()
    for name, G in lanes:
        place(sc, char_r, cf_r, CX, G)          # caster, facing the target
        place(sc, char, cf, TX, G)              # target, facing the caster
    for name, G in lanes:
        fa = anchor(name)
        if i < n_fly:
            x, y = flight(i / n_fly, G)
            place(sc, frame(name, 'fly', i % 6), fa, x, y)
        else:
            b = min(i - n_fly, n_burst[name] - 1)
            place(sc, frame(name, 'burst', b), fa, TX, G)
    big = up(sc, K)
    out = Image.new('RGBA', (big.width, big.height + BAND), BG)
    out.alpha_composite(big, (0, BAND))
    d = ImageDraw.Draw(out)
    d.rectangle([0, 0, out.width, BAND - 1], fill=BAR)
    text(d, (14, 10), f_title, 19, WHITE, bold=True)
    phase = 'En vuelo (ralentizado)' if i < n_fly else 'Impacto'
    text(d, (14, 35), phase, 16, ACCENT)
    text(d, (out.width - 14, 35), '12 fotogramas/s', 14, GREY, anchor='ra')
    # lane labels on the grass, under the caster's feet
    for (name, G), lab in zip(lanes, ['NORMAL · radio 1,5 m', 'MEJORADA · radio 2,25 m']):
        tw = text_w(lab, 15, True)
        y0 = BAND + (G + 8) * K
        d.rectangle([10, y0, 10 + tw + 16, y0 + 26], fill=(20, 24, 28, 255))
        text(d, (18, y0 + 4), lab, 15, WHITE, bold=True)
    frames.append(out)

durs = durations_12fps(len(frames), hold_last_ms=600)
prot = [sheet('fireball'), sheet('fireball_great'), char, bg]
size, mode = save_gif(frames, durs, OUT + '02-fuego-bola.gif', protect_imgs=prot)
print('frames', len(frames), 'size', frames[0].size, 'bytes', size, mode, 'total ms', sum(durs))
contact(frames, WORK + 'contact_bola.png', cols=6, k_down=2)
