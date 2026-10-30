"""His acid effects sheet (3 rows x 6: the spit in flight, the impact, the puddle) mounted in the
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


frames, durs = [], []


def emit(rows_args, t, under=None, over=None, ms=70):
    img = scene(rows_at(*rows_args), 1, 0.0, t)
    if under:
        under(img)
    party(img)
    if over:
        over(img)
    frames.append(img.convert('RGB'))
    durs.append(ms)


n = 0
# wind-up: his frames 1 and 2 (throat swells, mouth opens)
for f in [0, 0, 1, 1, 1]:
    emit((n, f), n / 30)
    n += 1
# the flight: an arc from the mouth to Aiden's feet
T = 11
for i in range(T):
    u = (i + 1) / T
    x = MX + (TX - MX) * u
    y = MY + (TY - 30 - MY) * u - 140 * math.sin(math.pi * u)
    vx = TX - MX
    vy = (TY - 30 - MY) - 140 * math.pi * math.cos(math.pi * u)
    ang = math.degrees(math.atan2(-vy, vx)) - 180
    emit((n, 4 if i > 3 else 1), n / 30, over=lambda im, x=x, y=y, ang=ang, i=i: put(im, FX[0][i % len(FX[0])], 150, x, y, rot=ang))
    n += 1
# the impact (over the party), then the puddle under him, boiling, then drying
for i in range(6):
    emit((n, 5), n / 30, under=(lambda im: put(im, FX[2][0], 150, TX, TY, 'floor')) if i >= 4 else None,
         over=lambda im, i=i: put(im, FX[1][i], 180, TX, TY, 'floor'))
    n += 1
for k in range(12):
    emit((n, 5), n / 30, under=lambda im, k=k: put(im, FX[2][k % 4], 155, TX, TY, 'floor'), ms=90)
    n += 1
for f, reps in [(4, 4), (5, 6)]:
    for _ in range(reps):
        emit((n, 5), n / 30, under=lambda im, f=f: put(im, FX[2][f], 155, TX, TY, 'floor'), ms=110)
        n += 1
import os, subprocess
FD = OUT + '_frames'
os.makedirs(FD, exist_ok=True)
for i, f in enumerate(frames):
    f.save(f'{FD}/f{i:03d}.png')
# one palette for the whole GIF (the first frame has no acid green, so a per-frame palette from it
# turned the acid yellow)
lst = ''.join(f"file 'f{i:03d}.png'\nduration {d / 1000:.3f}\n" for i, d in enumerate(durs))
open(f'{FD}/list.txt', 'w').write(lst + f"file 'f{len(frames) - 1:03d}.png'\n")
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-i', f'{FD}/list.txt', '-vf',
                'scale=960:540:flags=lanczos,split[a][b];[a]palettegen=max_colors=200[p];[b][p]paletteuse=dither=bayer:bayer_scale=4',
                OUT + '.gif'], check=True)
print('ok', len(frames))
