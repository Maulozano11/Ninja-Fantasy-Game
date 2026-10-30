"""The boss summon at 30 fps from his four painted steps: the game makes the motion between them
(cracks spreading from the centre, the rune rings rising off the floor, the column growing up out
of the circle with a flash and a shake, the smoke billowing out, then dissolving off the live
hydra), plus rising embers, flicker and a slow smoke drift. Frames go to <out>_frames/, then an
MP4 and a small GIF."""
import math, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
from scipy.ndimage import map_coordinates

S, OUT = sys.argv[1], sys.argv[2]
H = f'{S}/hydra'
sys.argv = [sys.argv[0], S, OUT]
exec(open(f'{H}/mount9.py').read())  # definitions only

C = f'{H}/col16'
ld = lambda p: np.array(Image.open(p).convert('RGB').resize((VW, VH), Image.LANCZOS)).astype(np.float32)
E = ld(f'{H}/col14/empty.png')
S1, S2, S3, S4 = [ld(f'{C}/step{i}.png') for i in range(1, 5)]
REST = rows_of(f'{H}/col5/grid.png', 130)
YY, XX = np.mgrid[0:VH, 0:VW].astype(np.float32)
CX, CY = 1292.0, 749.0  # the circle's centre on screen
FLOOR = 545.0  # where the floor meets the wall
rng = np.random.default_rng(11)
FDIR = OUT + '_frames'
os.makedirs(FDIR, exist_ok=True)
for f in os.listdir(FDIR):
    os.remove(os.path.join(FDIR, f))
N = [0]


def ease(t):
    t = min(max(t, 0.0), 1.0)
    return t * t * (3 - 2 * t)


def noise(scale, seed):
    r = np.random.default_rng(seed).random((VH // scale + 2, VW // scale + 2)).astype(np.float32)
    r = ndimage.zoom(r, scale, order=3)[:VH, :VW]
    return (r - r.min()) / (r.max() - r.min())


NZ = noise(48, 1)
NZ2 = noise(90, 2)

# the circle's elliptical distance (the circle is about 5x wider than tall on screen)
DE = np.sqrt((XX - CX) ** 2 + ((YY - CY) * 5.0) ** 2)
D1, D2, D3, D4 = S1 - E, S2 - S1, S3 - S2, S4 - S3
UPPER = (YY < FLOOR + 40).astype(np.float32)
UPPER = ndimage.gaussian_filter(UPPER, 12)
D2_air, D2_floor = D2 * UPPER[..., None], D2 * (1 - UPPER[..., None])
SMOKE = ndimage.gaussian_filter((np.abs(S4 - E).mean(-1) > 28).astype(np.float32), 5)
SMOKE = np.clip(SMOKE * 1.4, 0, 1)
SB = np.nonzero(SMOKE.sum(1) > 5)[0].max()  # the smoke's base row


import cv2
sys.path.insert(0, H)
from rocks import find_rocks
R3 = [r for r in find_rocks(S3, S2, (YY < 800) & (XX > 540), lum_max=135, contrast=35) if (r[1] - r[0]) / max(1, r[3] - r[2]) < 2.0]
M3 = np.zeros((VH, VW), np.uint8)
ROCKS = []
for y0, y1, x0, x1, win in R3:
    m = ndimage.binary_dilation(win, iterations=1)
    M3[y0:y1, x0:x1] |= ndimage.binary_dilation(win, iterations=3).astype(np.uint8)
    al = ndimage.gaussian_filter(m.astype(np.float32), 0.8) * 255
    spr = Image.fromarray(np.dstack([S3[y0:y1, x0:x1], al]).clip(0, 255).astype(np.uint8), 'RGBA')
    ys, xs = np.nonzero(win)
    ROCKS.append(dict(spr=spr, p=(x0 + xs.mean(), y0 + ys.mean()), ua=rng.uniform(5, 10), w=rng.uniform(-7, 7), g=rng.uniform(0.35, 0.7)))
PLATE3 = cv2.inpaint(S3.clip(0, 255).astype(np.uint8), M3, 9, cv2.INPAINT_TELEA).astype(np.float32)
LUM3 = PLATE3.mean(-1)
CORE = ndimage.gaussian_filter(((LUM3 > 228) & (YY < CY + 20) & (np.abs(XX - CX) < 320)).astype(np.float32), 10)
VST = np.random.default_rng(5).random((VH // 70 + 3, VW // 5 + 3)).astype(np.float32)
VST = ndimage.zoom(VST, (70, 5), order=3)
VST = (VST - VST.min()) / (VST.max() - VST.min())
BOLT = ((LUM3 > 190) & (S2.mean(-1) < 165) & (np.abs(XX - CX) > 110) & (YY < FLOOR + 80) & (CORE < 0.2)).astype(np.float32)
BOLT = ndimage.gaussian_filter(BOLT, 1.2)
NOBOLT = cv2.inpaint(PLATE3.clip(0, 255).astype(np.uint8), (BOLT > 0.25).astype(np.uint8), 5, cv2.INPAINT_TELEA).astype(np.float32)
BL = PLATE3 - NOBOLT
MX = np.clip((2 * CX - XX).astype(int), 0, VW - 1)
BLM = np.clip(BL, 0, None)[:, MX[0]]
WA, WB = noise(70, 7), noise(70, 8)


def beam(k, base=None):
    """The column at frame k: light streaming up the core, the bolts flickering and changing sides."""
    P3 = PLATE3 if base is None else base
    sh = (k * 46) % (VST.shape[0] - VH)
    tex = VST[VH + 0 - VH + sh: sh + VH, :VW] if False else VST[sh:sh + VH, :VW]
    r = np.random.default_rng(100 + k)
    a, b = r.choice([0.1, 0.45, 1.0]), r.choice([0.0, 0.0, 0.5, 0.9])
    out = P3 - BL * (1 - a) + BLM * b
    # light streaming up the core: only brighter, warm white, never grey
    return out + (CORE * np.clip(tex - 0.35, 0, 1) * 70)[..., None] * np.array([1.0, 0.92, 0.75], np.float32)


def rocks_at(img, u, scale=1.0, alpha=1.0, fall_only=False):
    """His stones, launched from the circle at u=0 to where he painted them, then flying on and falling."""
    for r in ROCKS:
        px, py = r['p']
        ox, oy = CX + 0.2 * (px - CX), CY - 10
        ua = r['ua']
        if u < 0:
            continue
        if u <= ua:
            t = 1 - (1 - u / ua) ** 2
            x, y = ox + (px - ox) * t, oy + (py - oy) * t
        else:
            vx, vy = (px - ox) / ua * 0.45, (py - oy) / ua * 0.45
            d = u - ua
            x, y = px + vx * d, py + vy * d + 0.5 * r['g'] * d * d
        if y > VH + 50 or x < -100 or x > VW + 100:
            continue
        s = r['spr'].rotate(r['w'] * u, resample=Image.BICUBIC, expand=True)
        if scale != 1.0:
            s = s.resize((max(1, int(s.width * scale)), max(1, int(s.height * scale))), Image.LANCZOS)
        if alpha < 1:
            s.putalpha(s.getchannel('A').point(lambda v: int(v * alpha)))
        img.alpha_composite(s, (int(x - s.width / 2), int(y - s.height / 2)))
    return img


def smoke_warp(src, k, amt=1.0, rise=0.0):
    dx = (np.roll(WA, k * 3, axis=1) - 0.5) * 28 * amt * SMOKE
    dy = (np.roll(WB, -k * 3, axis=0) - 0.5) * 22 * amt * SMOKE - rise * SMOKE
    return np.stack([map_coordinates(src[..., c], [YY + dy, XX + dx], order=1, mode='nearest') for c in range(3)], -1)

# embers: spawn on the circle, rise, flicker
EMB = []


def embers_step(rate, spread=1.0):
    for _ in range(rate):
        a = rng.uniform(0, 2 * math.pi)
        r = math.sqrt(rng.uniform(0, 1))
        EMB.append([CX + 620 * spread * r * math.cos(a), CY + 125 * spread * r * math.sin(a), rng.uniform(2, 7), rng.uniform(-0.6, 0.6), rng.uniform(25, 60), rng.integers(1, 3)])
    for e in EMB:
        e[1] -= e[2]
        e[0] += e[3]
        e[4] -= 1
    EMB[:] = [e for e in EMB if e[4] > 0 and e[1] > -10]


def draw_embers(img):
    d = ImageDraw.Draw(img)
    for x, y, v, dx, life, s in EMB:
        c = (255, int(150 + 100 * rng.random()), 60) if life > 12 else (230, 110, 40)
        s2 = int(s) * 2
        d.rectangle([x, y, x + s2, y + s2], fill=c)
    return img


def party(img):
    for name, x, z in [('leg_solen', 3.2, 2.0), ('leg_aiden', 1.8, 4.5), ('leg_lyra', 3.6, 7.0), ('leg_aurelia', 1.6, 9.5)]:
        im = Image.open(f'{S}/cc/{name}.png').convert('RGBA')
        im = im.crop(im.getbbox())
        kk = 100 / im.height
        im = im.resize((int(im.width * kk), 100), Image.NEAREST)
        X, Y = P(x, z)
        img.alpha_composite(im, (int(X - im.width / 2), int(Y - im.height)))
    return img


def emit(arr, shake=0, flash=0.0, embers=True, over=None):
    arr = np.clip(arr, 0, 255)
    if flash:
        arr = arr * (1 - flash) + np.array([255, 248, 228], np.float32) * flash
    img = Image.fromarray(arr.astype(np.uint8)).convert('RGBA')
    if over:
        over(img)
    if embers:
        draw_embers(img)
    party(img)
    img = img.convert('RGB')
    if shake:
        n = N[0]
        img = img.transform(img.size, Image.AFFINE, (1, 0, ((n % 2) * 2 - 1) * shake, 0, 1, ((n // 2) % 3 - 1) * shake * 0.6), fillcolor=(0, 0, 0))
    img.save(f'{FDIR}/f{N[0]:04d}.png')
    N[0] += 1


def flick(n, amp=0.08):
    return 1 + amp * math.sin(n * 1.7) + amp * 0.6 * math.sin(n * 4.3 + 1)


# 0. the empty courtyard, a breath
for i in range(18):
    emit(E, embers=False)
# 1. cracks of light run out from the centre (his step 1)
T = 26
for i in range(T):
    rad = 1700 * ease(i / (T - 1)) ** 0.85
    m = np.clip((rad - DE + 80 * (NZ - 0.5) * 2) / 120, 0, 1)
    embers_step(1 if i > 8 else 0, 0.7)
    emit(E + D1 * m[..., None] * flick(i, 0.06))
for i in range(14):
    embers_step(1, 0.8)
    emit(S1 + D1 * (flick(i, 0.07) - 1))
# 2. the circle blazes up and the rune rings rise off the floor (his step 2)
T = 30
for i in range(T):
    t = ease(i / (T - 1))
    lift = 170 * (1 - t)
    air = map_coordinates(D2_air[..., 0], [YY - lift, XX], order=1, mode='constant')
    air = np.stack([air, map_coordinates(D2_air[..., 1], [YY - lift, XX], order=1), map_coordinates(D2_air[..., 2], [YY - lift, XX], order=1)], -1)
    embers_step(2, 0.9)
    emit(S1 + D2_floor * min(1, t * 1.6) + air * t)
for i in range(16):
    embers_step(3, 1.0)
    emit(S2 + (S2 - E) * 0.12 * (flick(i, 1.0) - 1))
# 3. the column: a flash, it grows up out of the circle, the stones fly, the screen shakes (his step 3)
for i, fl in enumerate([0.25, 0.55, 0.85]):
    embers_step(4, 1.0)
    emit(S2, shake=3 * i, flash=fl)
T = 8
for i in range(T):
    top = (CY - 40) - (CY + 40) * ease(i / (T - 1))
    m = ndimage.gaussian_filter(((YY > top) | (np.abs(XX - CX) > 360)).astype(np.float32), 20) if i < T - 1 else np.ones_like(YY)
    embers_step(5, 1.0)
    fr = beam(i)
    emit(S2 + (fr - S2) * m[..., None], shake=12 - i, flash=max(0, 0.5 - i * 0.08), over=lambda im, u=i: rocks_at(im, u))
for i in range(40):
    embers_step(5, 1.0)
    emit(beam(T + i) * flick(i, 0.06), shake=max(0, 7 - i // 4), over=lambda im, u=T + i: rocks_at(im, u))
# 3b. the column breaks: a wave of dust bursts from its base along the floor (his step 3b)
S3B = ld(f'{C}/step3b.png')
S4B = ld(f'{C}/step4b.png')
V = np.array(BG.convert('RGB')).astype(np.float32)


def mask_of(A, B, thr=28, blur=5):
    return np.clip(ndimage.gaussian_filter((np.abs(A - B).mean(-1) > thr).astype(np.float32), blur) * 1.4, 0, 1)


M3B = mask_of(S3B, S3, 34) * (YY > 300)
_m = np.abs(S4B - E).mean(-1) > 28
_m = ndimage.binary_fill_holes(ndimage.binary_closing(_m, iterations=25))
M4B = np.clip(ndimage.gaussian_filter(_m.astype(np.float32), 6) * 1.3, 0, 1)
M4W = mask_of(S4B, E) * (XX > 700)
EYES = ndimage.gaussian_filter(((S4B[..., 1] > 110) & (S4B[..., 1] > S4B[..., 0] + 25) & (S4B[..., 1] > S4B[..., 2] + 5)).astype(np.float32), 2.5)
EYES = np.clip(EYES * 4, 0, 1)


def warp(src, k, mask, amt=1.0, rise=0.0):
    dx = (np.roll(WA, k * 3, axis=1) - 0.5) * 28 * amt * mask
    dy = (np.roll(WB, -k * 3, axis=0) - 0.5) * 22 * amt * mask - rise * mask
    return np.stack([map_coordinates(src[..., c], [YY + dy, XX + dx], order=1, mode='nearest') for c in range(3)], -1)


DW = np.sqrt((XX - CX) ** 2 + ((YY - (CY - 40)) * 3.0) ** 2)
K0 = 48
T = 16
for i in range(T):
    rad = 1300 * ease(i / (T - 1)) ** 0.8
    m = np.clip((rad - DW + 120 * (NZ2 - 0.5) * 2) / 140, 0, 1)
    embers_step(3, 1.0)
    dust = warp(S3B, K0 + i, M3B, 0.6 * i / T)
    emit(beam(K0 + i) * (1 - m[..., None]) + dust * m[..., None], shake=max(0, 4 - i // 4), over=lambda im, u=K0 + i: rocks_at(im, u))
for i in range(14):
    embers_step(2, 1.0)
    emit(warp(S3B, K0 + T + i, M3B, 0.6 + 0.03 * i, rise=0.8 * i), over=lambda im, u=K0 + T + i: rocks_at(im, u, alpha=max(0.0, 1 - i / 14)))
# 4. the dust swells into the great cloud (his step 4): the cloud really grows, scaled up from the
# dust at its base, billowing as it goes, over the 3b dust
K1 = K0 + T + 14
T = 42
BX, BY = CX - 60, SB - 20  # the cloud's base


EDGE = np.clip(np.minimum.reduce([XX, YY, VW - 1 - XX, VH - 1 - YY]) / 420.0, 0, 1) ** 1.2


def grown(src, mask, sc, k, amt):
    """The painted cloud stays where he painted it (no shrunken copy of the wall behind it); only
    its outline grows out of the base, and the smoke inside rises into place as it does."""
    sx = BX + (XX - BX) / sc
    sy = BY + (YY - BY) / (sc ** 1.15)
    # the cloud runs off the frame's right and top: round those edges off in the cloud's own
    # coordinates while it is small, or its shrunken outline shows a straight cut
    m = mask * (EDGE + (1 - EDGE) * min(1.0, max(0.0, (sc - 0.95) / 0.05)))
    al = map_coordinates(m, [sy, sx], order=1, mode='constant')
    w = warp(src, k, SMOKE, amt, rise=-(1 - sc) * 140)
    return w, al


for i in range(T):
    t = i / (T - 1)
    sc = 0.32 + 0.68 * (1 - (1 - t) ** 2.2)
    a3 = warp(S3B, K1 + i, M3B, 1.0, rise=11 + 0.6 * i)
    c4, al = grown(S4, SMOKE, sc, K1 + i, 0.6 + 0.4 * t)
    al = np.clip(al * (0.55 + 0.45 * ease(t * 1.4)), 0, 1)
    emit(a3 * (1 - al[..., None]) + c4 * al[..., None], embers=False, shake=max(0, 3 - i // 6),
         over=lambda im, u=i: rocks_at(im, u * 0.5 - 2, scale=0.55))
for i in range(16):
    emit(warp(S4, K1 + T + i, SMOKE, 1.0, rise=0.6 * i), embers=False, over=lambda im, u=T + i: rocks_at(im, u * 0.5 - 2, scale=0.55))
# 4b. the eyes: the cloud darkens inside, then five pairs of green eyes slowly open in it (his step 4b)
K2 = K1 + T + 16
EYE_BLOOM = np.clip(ndimage.gaussian_filter(EYES, 14) * 9, 0, 1)
T = 34
for i in range(T):
    t = ease(i / (T - 1))
    a4 = warp(S4, K2 + i, SMOKE, 1.0, rise=10)
    b4 = warp(S4B, K2 + i, M4W, 1.0)
    out = a4 * (1 - t) + b4 * t
    # the painted eyes come in last, as if opening
    e = max(0.0, (i - T * 0.55) / (T * 0.45))
    out = out - (EYES * (1 - e) * 0.85)[..., None] * (out - a4 * 0 - np.array([40, 30, 25], np.float32)) * t
    emit(out, embers=False)
for i in range(64):
    t = i / 63
    b4 = warp(S4B, K2 + T + i, M4W, 1.0, rise=0.3 * i)
    pulse = 0.5 + 0.5 * math.sin(i * 0.32)
    glow = 0.25 + 0.35 * pulse + 1.6 * max(0.0, (t - 0.6) / 0.4) ** 1.5  # brighter and brighter at the end
    b4 = b4 + (EYES * glow * 0.8)[..., None] * np.array([90, 255, 120], np.float32)
    b4 = b4 + (EYE_BLOOM * max(0.0, glow - 0.45) * 0.55)[..., None] * np.array([50, 230, 90], np.float32)
    emit(b4, embers=False, shake=2 if 40 <= i <= 44 else 0)
# 5. the cloud opens on the hydra; the heads, tucked in against the body, shoot out to their places
K3 = K2 + T + 64
RETRACT = []
for i in range(5):
    x, z, up = HEADS[i]
    left = P(x - HL / 2, z, up)[0]
    RETRACT.append(max(0.0, (STUMPS[i][0] - 230 - left) / PXM))


def back(t):
    t = min(max(t, 0), 1)
    c = 1.6
    return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2


S4C = np.roll(ld(f'{C}/step4c_fixed.png'), -7, axis=1)  # his 4c, tunnels moved onto our lanes, 6 px to the left of 4b
_c = np.abs(S4C - E).mean(-1) > 45
_c = ndimage.binary_opening(_c, iterations=4)
_c = ndimage.binary_fill_holes(ndimage.binary_closing(_c, iterations=20))
M4C = np.clip(ndimage.gaussian_filter(_c.astype(np.float32), 8) * 1.3, 0, 1) * np.clip((XX - 600) / 160, 0, 1)
HEADX = np.clip((1560 - XX) / 160, 0, 1)  # the heads go over the smoke left of the tunnels' ends
MC = np.maximum(M4B, M4C)
T = 48
for i in range(T):
    t = i / (T - 1)
    ext = [back((t - 0.34 - 0.05 * j) / 0.36) for j in (2, 0, 3, 1, 4)]
    lunge = [-RETRACT[j] * (1 - ext[j]) for j in range(5)]
    h = min(max((t - 0.33) / 0.04, 0.0), 1.0)  # the heads show as they burst out
    live = np.array(scene(REST, (i // 4) % 6, lunge, i / 60).convert('RGB')).astype(np.float32)
    body = np.array(breathe(i / 60).convert('RGB')).astype(np.float32)
    c = min(max((t - 0.34) / 0.10, 0.0), 1.0)  # the tunnels tear open as the heads shoot out
    src = S4B * (1 - c) + S4C * c
    sm = warp(src, K3 + i, np.maximum(M4W, MC * (XX > 700)), 1.0 + t, rise=9 + 90 * max(0.0, t - 0.3))
    a = np.roll(M4B * (1 - c) + M4C * c, int(-9 - 90 * max(0.0, t - 0.3)), axis=0)
    a = a * np.clip((NZ2 * 0.8 + 0.2 - max(0.0, t - 0.42) * 1.8) * 3.5, 0, 1)
    a = a * np.clip((YY - (9 + 90 * max(0.0, t - 0.3))) / 80, 0, 1)
    if h < 1:
        base = body
    else:
        base = np.array(breathe(i / 60).convert('RGB')).astype(np.float32)
    hm = np.clip(np.abs(live - base).mean(-1) / 18, 0, 1) * h  # the heads and necks alone
    out = base * (1 - a[..., None]) + sm * a[..., None]
    ho = (np.clip(hm * 1.6, 0, 1) * np.maximum(HEADX * min(1.0, max(0.0, sum(ext) / 5 - 0.05) * 8), 1 - a))[..., None]
    out = out * (1 - ho) + live * ho
    out = out + (EYES * a * 1.2 * (1 - c))[..., None] * np.array([70, 255, 100], np.float32)
    fl = 0.5 if i == int(0.34 * (T - 1)) else (0.25 if i == int(0.34 * (T - 1)) + 1 else 0.0)
    emit(out, embers=False, shake=7 if 16 <= i <= 24 else 0, flash=fl)
# 6. the hydra, alive
for i in range(40):
    emit(np.array(scene(REST, (i // 5 + 7) % 6, 0.0, (i + 40) / 60).convert('RGB')).astype(np.float32), embers=False)

print('frames', N[0])
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', '30', '-i', f'{FDIR}/f%04d.png', '-vf', 'scale=1280:720:flags=lanczos', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', OUT + '.mp4'], check=True)
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', '30', '-i', f'{FDIR}/f%04d.png', '-vf', 'fps=20,scale=640:360:flags=lanczos,split[a][b];[a]palettegen=max_colors=192[p];[b][p]paletteuse=dither=bayer:bayer_scale=4', OUT + '.gif'], check=True)
print('ok')
