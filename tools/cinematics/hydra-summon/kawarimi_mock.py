"""Kawarimi with his vanish cloud (the owner, 2026-10-30: the leap sheet's vanish row is the dodge
reaction's): the middle head spits at Lyra; as it lands she swaps: his cloud where she stood, a log
takes the acid, she comes out a few metres back in a smaller cloud.

From acid_mount.py: his acid effects sheet (3 rows x 6: the spit in flight, the impact, the puddle) mounted in the
battle: the middle head spits (his acid head sheet, frames without the painted jet), the ball flies
in an arc from its mouth to Lyra's feet, splashes, and the puddle boils under him, then dries.
Effects keyed by magenta-ness and unmixed (the pale vapour keeps its softness)."""
import math, sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

S, OUT = sys.argv[1], sys.argv[2]
sys.argv = [sys.argv[0], S, OUT]
exec(open(f'{S}/hydra/mount9.py').read())

a0 = np.array(Image.open(f'{S}/hydra/col18/acidfx.png').convert('RGB')).astype(float)
r_, g_, b_ = a0[..., 0], a0[..., 1], a0[..., 2]
AL = np.clip(1 - (np.minimum(r_, b_) - g_) / 235.0, 0, 1)
AL[AL < 0.1] = 0
RGB = ((a0 - (1 - AL[..., None]) * np.array([255.0, 0, 255.0])) / np.maximum(AL[..., None], 1e-3)).clip(0, 255)
RGBA = np.dstack([RGB, AL * 255]).astype(np.uint8)
BANDS = [(0, 300), (300, 560), (560, 887)]
FX = []
for y0, y1 in BANDS:
    cells = []
    XS = [0, 305, 600, 902, 1200, 1495, 1774]  # the gaps between his cells, the same in every row
    for x0, x1 in zip(XS, XS[1:]):
        im = Image.fromarray(RGBA[y0:y1, x0:x1], 'RGBA')
        cells.append(im.crop(im.getbbox()))
    FX.append(cells)
print('cells per row', [len(c) for c in FX])

REST = rows_of(f'{H}/col5/grid.png' if 'H' in dir() else f'{S}/hydra/col5/grid.png', 130)
ACID = rows_of(f'{S}/hydra/col7/acid.png', 130)
SP = 2  # the middle head spits


def rows_at(q, f):
    return [[REST[i][0], ACID[i][f] if i == SP else REST[i][q % 6]] for i in range(5)]


# the mouth: where his painted jet leaves the head (frame 3 of his acid sheet), found on screen
base = np.array(scene(rows_at(0, 0), 1, 0.0, 0.0).convert('RGB')).astype(int)
jet = np.array(scene(rows_at(0, 2), 1, 0.0, 0.0).convert('RGB')).astype(int)
gm = (jet[..., 1] > 150) & (jet[..., 1] > jet[..., 0] + 40) & (jet[..., 1] > jet[..., 2] + 60) & (np.abs(jet - base).sum(-1) > 60)
ys, xs = np.nonzero(gm)
MX = xs.max() - 25
MY = ys[xs > xs.max() - 40].mean()
print('mouth', MX, MY)

PARTY = [('leg_solen', 3.2, 2.0), ('leg_romano', 2.6, 6.0), ('leg_aiden', 1.8, 4.5), ('leg_lyra', 3.6, 7.5), ('leg_aurelia', 1.6, 9.5)]
TX, TY = P(3.6, 7.5)  # Lyra's feet


def party(img):
    for name, x, z in sorted(PARTY, key=lambda p: p[2]):
        im = Image.open(f'{S}/cc/{name}.png').convert('RGBA')
        im = im.crop(im.getbbox())
        im = im.resize((int(im.width * 100 / im.height), 100), Image.NEAREST)
        X, Y = P(x, z)
        img.alpha_composite(im, (int(X - im.width / 2), int(Y - im.height)))


def put(img, im, w, cx, cy, anchor='center', rot=0.0):
    k = w / im.width
    im = im.resize((max(1, int(im.width * k)), max(1, int(im.height * k))), Image.LANCZOS)
    if rot:
        im = im.rotate(rot, resample=Image.BICUBIC, expand=True)
    y = cy - im.height / 2 if anchor == 'center' else cy - im.height * 0.78  # the puddle's floor line
    img.alpha_composite(im, (int(cx - im.width / 2), int(y)))



import os, subprocess
V = f'{S}/vanish'
POOF = [Image.open(f'{V}/fx/fx_2_{c}.png').convert('RGBA') for c in range(6)]
LOG = Image.open('/home/claude/maulozano11/ninja-fantasy-game/src/assets/world/campsite/log_seat.png').convert('RGBA')
FB = lambda s: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', s)
from PIL import ImageFont
LX, LZ = 3.6, 7.5            # Lyra, where the spit is aimed
BX, BZ = 0.8, 7.6            # where she comes out (about 3 m back, clear of Aurelia)
TX, TY = P(LX, LZ)
BXs, BYs = P(BX, BZ)
lyra_at = [(LX, LZ)]
OTHERS = [p for p in PARTY if p[0] != 'leg_lyra']


def party_k(img):
    ps = OTHERS + ([('leg_lyra',) + lyra_at[0]] if lyra_at[0] else [])
    for name, x, z in sorted(ps, key=lambda p: p[2]):
        im = Image.open(f'{S}/cc/{name}.png').convert('RGBA')
        im = im.crop(im.getbbox())
        im = im.resize((int(im.width * 100 / im.height), 100), Image.NEAREST)
        X, Y = P(x, z)
        img.alpha_composite(im, (int(X - im.width / 2), int(Y - im.height)))


def poof(img, k, x, y, sc):
    im = POOF[min(5, k)]
    im = im.resize((int(im.width * sc), int(im.height * sc)), Image.LANCZOS)
    img.alpha_composite(im, (int(x - 134 * sc), int(y - 118 * sc)))


FD = OUT + '_frames'
os.makedirs(FD, exist_ok=True)
for f in os.listdir(FD):
    os.remove(os.path.join(FD, f))
N = [0]
EV = dict(ball=None, log=0.0, splash=None, poofA=None, poofB=None, word=None)


def emit(f, q):
    img = scene(rows_at(q, f), 1, 0.0, q / 30)
    if EV['log'] > 0:
        lg = LOG.copy()
        lg.putalpha(lg.getchannel('A').point(lambda v: int(v * EV['log'])))
        img.alpha_composite(lg, (int(TX - 48), int(TY - 34)))
    party_k(img)
    if EV['ball']:
        x, y, ang, i = EV['ball']
        put(img, FX[0][i % len(FX[0])], 150, x, y, rot=ang)
    if EV['splash'] is not None:
        put(img, FX[1][EV['splash']], 150, TX, TY - 8, 'floor')
    n = N[0]
    for key, x, y, sc, fps in (('poofA', TX, TY - 50, 0.55, 15), ('poofB', BXs, BYs - 50, 0.38, 20)):
        if EV[key] is not None:
            k = int((n - EV[key]) * fps / 30)
            if k < 6:
                poof(img, k, x, y, sc)
    if EV['word']:
        k = n - EV['word']
        a = min(1, k / 5) * min(1, (40 - k) / 10)
        if a > 0:
            d = ImageDraw.Draw(img)
            d.text((max(110, BXs), BYs - 130 - k), '¡Esquivado!', anchor='ms', font=FB(30), fill=(233, 216, 166, int(255 * a)), stroke_width=3, stroke_fill=(10, 6, 6, int(255 * a)))
    img.convert('RGB').save(f'{FD}/f{n:04d}.png')
    N[0] += 1


MARK = {}
q = 0
for f in [0] * 10 + [1] * 6:
    emit(f, q); q += 1
T = 14
for i in range(T):
    u = (i + 1) / T
    x = MX + (TX - MX) * u
    y = MY + (TY - 40 - MY) * u - 140 * math.sin(math.pi * u)
    vx, vy = TX - MX, (TY - 40 - MY) - 140 * math.pi * math.cos(math.pi * u)
    EV['ball'] = (x, y, math.degrees(math.atan2(-vy, vx)) - 180, i)
    if i == T - 5:  # the reaction: just before it lands she swaps
        EV['poofA'] = N[0]
        MARK['spark'] = N[0]
    if i == T - 3:  # the cloud is up: she is gone inside it
        lyra_at[0] = None
        MARK['swap'] = N[0]
    if i == T - 2:  # the log is there when the cloud opens
        EV['log'] = 1.0
    emit(4, q); q += 1
EV['ball'] = None
for i in range(6):
    EV['splash'] = i
    if i == 1:
        EV['poofB'] = N[0]
        lyra_at[0] = (BX, BZ)
        EV['word'] = N[0]
        MARK['out'] = N[0] + 2
    if i == 2:
        MARK['hit'] = N[0]
    emit(5, q); q += 1
EV['splash'] = None
for i in range(30):
    if i > 12:
        EV['log'] = max(0.0, 1 - (i - 12) / 14)
    emit(5 if i < 10 else 0, q); q += 1
MARK['end'] = N[0] - 1
print('frames', N[0], MARK)
import json
json.dump(MARK, open(OUT + '_marks.json', 'w'))
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', '30', '-i', f'{FD}/f%04d.png', '-vf', 'scale=1280:720:flags=lanczos', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', OUT + '.mp4'], check=True)
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', '30', '-i', f'{FD}/f%04d.png', '-vf', 'fps=15,crop=1200:675:0:405,scale=960:540:flags=lanczos,split[a][b];[a]palettegen=max_colors=200[p];[b][p]paletteuse=dither=bayer:bayer_scale=4', OUT + '.gif'], check=True)
print('ok')
