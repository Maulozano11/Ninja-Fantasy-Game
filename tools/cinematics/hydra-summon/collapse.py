"""The hydra's death in the battle (his dead-hydra picture v2, an exact edit of the battle backdrop,
so it registers): the live hydra shudders, slumps down into his dead picture with an impact shake
and a dust wave along the floor, the dust settles, the party stands. 30 fps, MP4 + GIF."""
import os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage
from scipy.ndimage import map_coordinates

S, OUT = sys.argv[1], sys.argv[2]
sys.argv = [sys.argv[0], S, OUT]
exec(open(f'{S}/hydra/mount9.py').read())  # definitions only
FD = OUT + '_frames'
os.makedirs(FD, exist_ok=True)
for f in os.listdir(FD):
    os.remove(os.path.join(FD, f))
ld = lambda p: np.array(Image.open(p).convert('RGB').resize((VW, VH), Image.LANCZOS)).astype(np.float32)
DEAD = ld(f'{S}/hydra/col19/dead2_char.png')  # his v2 with four stumps charred (char_stumps.py)
EMPTY = ld(f'{S}/hydra/col14/empty.png')
REST = rows_of(f'{S}/hydra/col5/grid.png', 130)
YY, XX = np.mgrid[0:VH, 0:VW].astype(np.float32)
PARTY = [('leg_solen', 3.2, 2.0), ('leg_romano', 2.6, 6.0), ('leg_aiden', 1.8, 4.5), ('leg_lyra', 3.6, 7.5), ('leg_aurelia', 1.6, 9.5)]
SPR = []
for name, x, z in sorted(PARTY, key=lambda q: q[2]):
    sp = Image.open(f'{S}/cc/{name}.png').convert('RGBA')
    sp = sp.crop(sp.getbbox())
    sp = sp.resize((int(sp.width * 100 / sp.height), 100), Image.NEAREST)
    X, Y = P(x, z)
    SPR.append((sp, int(X - sp.width / 2), int(Y - sp.height)))
rng = np.random.default_rng(4)
FLOORY = 560.0 * VH / 941  # the floor line on screen
DUST = []
N = [0]


def live(i):
    return np.array(scene(REST, (i // 5) % 6, 0.0, i / 60).convert('RGB')).astype(np.float32)


def emit(arr, shake=0):
    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).convert('RGBA')
    if DUST:
        lay = Image.new('RGBA', img.size)
        d = ImageDraw.Draw(lay)
        for x, y, r, a, vx in DUST:
            if a > 0.03:
                d.ellipse([x - r * 1.8, y - r, x + r * 1.8, y + r * 0.6], fill=(120, 100, 85, int(150 * a)))
        img.alpha_composite(lay.filter(ImageFilter.GaussianBlur(14)))
    for sp, x, y in SPR:
        img.alpha_composite(sp, (x, y))
    img = img.convert('RGB')
    if shake:
        n = N[0]
        img = img.transform(img.size, Image.AFFINE, (1, 0, ((n % 2) * 2 - 1) * shake, 0, 1, ((n // 2) % 3 - 1) * shake * 0.6), fillcolor=(0, 0, 0))
    img.save(f'{FD}/f{N[0]:04d}.png')
    N[0] += 1


def dust_step(spawn=0):
    for _ in range(spawn):
        x = rng.uniform(700, 1920)
        DUST.append([x, rng.uniform(FLOORY + 120, VH - 40), rng.uniform(25, 55), rng.uniform(0.6, 1.0), rng.uniform(-3, -0.5)])
    for p in DUST:
        p[0] += p[4]
        p[1] -= 0.8
        p[2] += 1.6
        p[3] *= 0.975


# 1. the end of the fight: four stumps already burnt and sealed (his burn sheet's last frame), the
# fifth head (the front one) is cut off (his cut sheet), and that last cut kills it
REF = '/home/claude/maulozano11/ninja-fantasy-game/docs/reference'
def run(script, sheet, tag):
    ns = {}
    sys.argv = [script, S, sheet, f'{S}/hydra/out_dead2/_{tag}']
    exec(open(f'{S}/hydra/{script}').read(), ns)
    return ns
NC = run('mount_cut.py', f'{S}/hydra/col8/cut.png', 'cut')
NB = run('mount_burn.py', f'{S}/hydra/col17/burn.png', 'burn')
LAST = 4  # the front head
BURNT = NB['PASS'][-1][0]
SHB = [-g for g in NB['GAP']]
def floor_head(r):
    """the cut sheet's fallen head (below the neck) laid onto the burnt stump's cell"""
    burnt = np.array(BURNT[r][1]).copy()
    cut = np.array(NC['PASS'][-1][0][r][1])
    al = cut[..., 3] > 128
    t, b2 = NC['band'](al, cut.shape[1] - 48, cut.shape[1] - 12)
    low = al.copy()
    low[:b2 + 25] = False
    burnt[low] = cut[low]
    return Image.fromarray(burnt, 'RGBA')
# the four heads cut earlier lie on the floor where his dead picture has them (matted from it by
# their difference with the battle backdrop), the last one (E, the front) falls there when cut
K = VW / 1672
HM = np.load(f'{S}/hydra/col19/heads1672.npy')
DSRC = np.array(Image.open(f'{S}/hydra/col19/dead2_char.png').convert('RGB'))
def head_sprite(bit):
    m = ndimage.gaussian_filter(((HM & bit) > 0).astype(np.float32), 1.2)
    ys, xs = np.nonzero(m > 0.02)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    im = Image.fromarray(np.dstack([DSRC[y0:y1, x0:x1], (m[y0:y1, x0:x1] * 255).astype(np.uint8)]), 'RGBA')
    im = im.resize((int(im.width * K), int(im.height * K)), Image.LANCZOS)
    return im, x0 * K, y0 * K
FLOOR_HEADS = [head_sprite(b) for b in (1, 2, 4, 8)]
EH, EX, EY = head_sprite(16)
# the heads lie on the floor, so they go into the background before the necks are drawn over it
_breathe = NC['breathe']
def _breathe_with_heads(t):
    img = _breathe(t)
    for im, x, y in FLOOR_HEADS:
        img.alpha_composite(im, (int(x), int(y)))
    return img
NC['breathe'] = _breathe_with_heads
def with_heads(arr, extra=None):
    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).convert('RGBA')
    if extra:
        extra(img)
    return np.array(img.convert('RGB')).astype(np.float32)
RAW = NB['PASS'][0][0][LAST][1]  # his raw stump, lined up like the burnt ones
def battle(p_cut, i, k_in, stump_only=False, extra=None):
    rows_c, _, f = NC['PASS'][p_cut]
    rows = [BURNT[r] if r != LAST else ([BURNT[r][0], RAW] if stump_only else rows_c[r]) for r in range(5)]
    sh = [SHB[r] if (r != LAST or stump_only) else NC['MAXS'][r] * k_in for r in range(5)]
    return with_heads(np.array(NC['scene'](rows, 1, sh, i / 60).convert('RGB')).astype(np.float32), extra)
i = 0
for _ in range(24):
    emit(battle(0, i, 0.0)); i += 1
# the last cut: his cut frames while the head is still on (frames 0-2)
CUTP = [p for p, (_, _, f) in enumerate(NC['PASS']) if f <= 2]
for p in CUTP:
    f = NC['PASS'][p][2]
    for _ in range(5):
        emit(battle(p, i, 0.0 if f < 2 else 0.5), shake=4 if f in (1, 2) else 0); i += 1
# where the head is at the cut: the difference between the head-on frame and the stump alone
on = battle(CUTP[-1], i, 0.5)
off = battle(CUTP[-1], i, 0.5, stump_only=True)
dm = np.abs(on - off).mean(-1) > 40
ys, xs = np.nonzero(dm)
HX0, HY0 = float(np.median(xs)), float(np.median(ys))
HXF, HYF = EX + EH.width / 2, EY + EH.height / 2
print('head falls from', (HX0, HY0), 'to', (HXF, HYF))
# it falls with gravity, turning onto its side, and lands where his picture has it
T = 16
for j in range(T):
    u = (j + 1) / T
    x = HX0 + (HXF - HX0) * u
    y = HY0 + (HYF - HY0) * u * u - 60 * np.sin(np.pi * u) * (1 - u)
    rot = 35 * (1 - u) ** 1.5
    def ex(img, x=x, y=y, rot=rot):
        s2 = EH.rotate(rot, resample=Image.BICUBIC, expand=True)
        img.alpha_composite(s2, (int(x - s2.width / 2), int(y - s2.height / 2)))
    emit(battle(CUTP[-1], i, 0.5, stump_only=True, extra=ex)); i += 1
def ex_landed(img):
    img.alpha_composite(EH, (int(EX), int(EY)))
# it lands: a thud, a puff of dust; the body shudders: it is dead
for j in range(4):
    DUST.append([HXF + rng.uniform(-120, 120), HYF + 40, rng.uniform(15, 30), 0.9, rng.uniform(-2, 2)])
for j in range(14):
    dust_step(0)
    emit(battle(CUTP[-1], i, 0.5, stump_only=True, extra=ex_landed), shake=(8 if j < 3 else (5 if j % 4 < 2 else 2))); i += 1
L = battle(CUTP[-1], i, 0.5, stump_only=True, extra=ex_landed)
HY = ndimage.gaussian_filter(((np.abs(L - EMPTY).mean(-1) > 30) | (np.abs(DEAD - EMPTY).mean(-1) > 30)).astype(np.float32), 25)
def nz(seed, sc):
    r = np.random.default_rng(seed).random((VH // sc + 2, VW // sc + 2)).astype(np.float32)
    r = ndimage.zoom(r, sc, order=3)[:VH, :VW]
    return (r - r.min()) / (r.max() - r.min())
NZ = nz(9, 60)
DCOL = np.array([118, 98, 82], np.float32)
T = 30
for i in range(T):
    t = (i + 1) / T
    cover = np.clip((HY * 1.3 - (1 - min(1, t * 1.6)) * 1.2 + (NZ - 0.5) * 0.5), 0, 1) * (1 - max(0, t - 0.7) / 0.3 * 0.55)
    cover = np.clip(cover * (0.85 + 0.15 * np.sin(YY / 40 + i * 0.3)), 0, 1)[..., None]
    a = (np.clip((t - 0.3) / 0.4, 0, 1) * HY)[..., None]
    sinkpx = int(40 * min(1, t * 2) ** 2)
    Ls = np.concatenate([L[:sinkpx] * 0 + L[:1], L[:VH - sinkpx]], axis=0) if sinkpx else L
    Ls = L * (1 - HY[..., None]) + Ls * HY[..., None]
    frame = Ls * (1 - a) + DEAD * a
    frame = frame * (1 - 0.92 * cover) + DCOL * 0.92 * cover
    dust_step(4 if t > 0.5 else 0)
    emit(frame, shake=0 if t < 0.35 else int(16 * (1 - abs(t - 0.6) * 2)))
# the dust thins off his picture
for i in range(24):
    t = i / 23
    cover = np.clip(HY * 1.3 * (1 - t) * 0.45 + (NZ - 0.5) * 0.3 * (1 - t), 0, 1)[..., None]
    dust_step(3 if i < 8 else 0)
    emit(DEAD * (1 - 0.92 * cover) + DCOL * 0.92 * cover, shake=max(0, 6 - i))
# 3. the impact: shake, the dust wave rolls out along the floor

# 4. the dust settles; it lies there
for i in range(70):
    dust_step(0)
    emit(DEAD)
print('frames', N[0])
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', '30', '-i', f'{FD}/f%04d.png', '-vf', 'scale=1280:720:flags=lanczos', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', OUT + '.mp4'], check=True)
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', '30', '-i', f'{FD}/f%04d.png', '-vf', 'fps=15,scale=800:450:flags=lanczos,split[a][b];[a]palettegen=max_colors=200[p];[b][p]paletteuse=dither=bayer:bayer_scale=4', OUT + '.gif'], check=True)
print('ok')
