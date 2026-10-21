"""Decode a vfx-beasts-ref-earth.ts and print per-frame stats; write a strip on green and on magenta.
python3 an.py <ts> <outprefix>"""
import re
import sys
from collections import deque

import numpy as np
from PIL import Image

ts = open(sys.argv[1]).read()
out = sys.argv[2]
W, H = map(int, re.search(r'SIZE: \[number, number\] = \[(\d+), (\d+)\]', ts).groups())
AX, AY = map(int, re.search(r'ANCHOR: \[number, number\] = \[(\d+), (\d+)\]', ts).groups())
alph = re.search(r"ALPHABET = '([^']*)'", ts).group(1)
pal_txt = ts[ts.index('export const PALETTE'):ts.index('];', ts.index('export const PALETTE'))]
pal = re.findall(r"'#([0-9a-f]{8})'", pal_txt)
pal = [tuple(int(c[i:i + 2], 16) for i in (0, 2, 4, 6)) for c in pal]
fr_txt = ts[ts.index('export const FRAMES'):]
frames = []
for block in re.findall(r'    \[\n(.*?)\n    \],', fr_txt, re.S):
    rows = re.findall(r"'([^']*)'", block)
    f = np.zeros((H, W, 4), np.uint8)
    for y, row in enumerate(rows):
        x = 0
        for m in re.finditer(r'(\D)(\d*)', row):
            i = alph.index(m.group(1))
            n = int(m.group(2)) if m.group(2) else 1
            if i:
                f[y, x:x + n] = pal[i]
            x += n
    frames.append(f)


def comps(mask):
    H_, W_ = mask.shape
    lab = -np.ones((H_, W_), int)
    res = []
    for y, x in zip(*np.nonzero(mask)):
        if lab[y, x] >= 0:
            continue
        q = deque([(y, x)])
        lab[y, x] = len(res)
        pts = []
        while q:
            cy, cx = q.popleft()
            pts.append((cy, cx))
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = cy + dy, cx + dx
                if 0 <= ny < H_ and 0 <= nx < W_ and mask[ny, nx] and lab[ny, nx] < 0:
                    lab[ny, nx] = len(res)
                    q.append((ny, nx))
        res.append(pts)
    return res


print('size', W, H, 'anchor', AX, AY, 'colors', len(pal) - 1)
eyes = []
for i, f in enumerate(frames):
    a = f[..., 3]
    yel = (f[..., 0] > 200) & (f[..., 1] > 150) & (f[..., 2] < 130) & (a == 255)
    yel[:, :AX + 60] = False
    cl = comps(yel)
    big = max(cl, key=len) if cl else []
    ey = np.mean([p[0] for p in big]) if big else -1
    ex = np.mean([p[1] for p in big]) if big else -1
    eyes.append((ex, ey))
    solid = a == 255
    soft = (a > 0) & (a < 255)
    ys = np.nonzero(solid.any(1))[0]
    xs = np.nonzero((a > 0).any(0))[0]
    yall = np.nonzero((a > 0).any(1))[0]
    # margin to the canvas edge
    marg = min(xs.min(), W - 1 - xs.max(), yall.min(), H - 1 - yall.max())
    # enclosed holes: transparent pixels enclosed by solid
    filled = np.zeros_like(solid)
    outside = np.zeros_like(solid)
    q = deque()
    for x in range(W):
        for y in (0, H - 1):
            if not solid[y, x]:
                outside[y, x] = True
                q.append((y, x))
    for y in range(H):
        for x in (0, W - 1):
            if not solid[y, x] and not outside[y, x]:
                outside[y, x] = True
                q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < H and 0 <= nx < W and not solid[ny, nx] and not outside[ny, nx]:
                outside[ny, nx] = True
                q.append((ny, nx))
    holes = ~solid & ~outside
    lum = (f[..., :3].astype(float) @ [0.3, 0.55, 0.15]) * a / 255
    print(f'f{i}: eye ({ex:.1f},{ey:.1f}) n={len(big)}  solid {solid.sum()} soft {soft.sum()}  lowest solid {ys.max()} '
          f'x[{xs.min()},{xs.max()}] y[{yall.min()},{yall.max()}] margin {marg}  holes {holes.sum()}  mean lum*a {lum.mean():.2f}')
for i in range(len(eyes)):
    j = (i + 1) % len(eyes)
    print(f'  eye step {i}->{j}: dx {eyes[j][0] - eyes[i][0]:+.1f} dy {eyes[j][1] - eyes[i][1]:+.1f}')


def strip(bg, path, k=2):
    pad = 4
    img = Image.new('RGB', ((W + pad) * 4, (H + pad) * 2), (0, 0, 0))
    for i, f in enumerate(frames):
        b = Image.new('RGBA', (W, H), bg + (255,))
        b.alpha_composite(Image.fromarray(f, 'RGBA'))
        img.paste(b.convert('RGB'), ((i % 4) * (W + pad), (i // 4) * (H + pad)))
    img.resize((img.width * k, img.height * k), Image.NEAREST).save(path)


strip((0x5d, 0x6b, 0x57), out + '-green.png')
strip((255, 0, 255), out + '-magenta.png')
np.save(out + '-frames.npy', np.stack(frames))
