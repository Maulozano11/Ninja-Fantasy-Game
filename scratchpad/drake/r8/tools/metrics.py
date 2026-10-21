"""Metrics for the drake data module (frames cropped like beastSprite with pad 3).

python3 -I metrics.py <earth.ts> [outPrefix]
"""
import re
import sys
from collections import deque

import numpy as np
from PIL import Image


def load(ts):
    src = open(ts, encoding='utf-8').read()
    size = [int(v) for v in re.search(r'SIZE: \[number, number\] = \[(\d+), (\d+)\]', src).groups()]
    anchor = [int(v) for v in re.search(r'ANCHOR: \[number, number\] = \[(\d+), (\d+)\]', src).groups()]
    alph = re.search(r"ALPHABET = '([^']*)'", src).group(1)
    pal = re.findall(r"'(#[0-9a-f]{8})'", src.split('PALETTE: string[]')[1].split('];')[0])
    pal = [tuple(int(c[i:i + 2], 16) for i in (1, 3, 5, 7)) for c in pal]
    body = src.split('FRAMES: Record')[1]
    frames = []
    for fr in re.findall(r'\[\n((?:\s+\'[^\']*\',\n)+)\s+\]', body):
        rows = re.findall(r"'([^']*)'", fr)
        img = np.zeros((size[1], size[0], 4), np.uint8)
        for y, row in enumerate(rows):
            x = 0
            for m in re.finditer(r'(\D)(\d*)', row):
                i = alph.index(m.group(1))
                n = int(m.group(2)) if m.group(2) else 1
                if i > 0:
                    img[y, x:x + n] = pal[i]
                x += n
        frames.append(img)
    # crop like beastSprite (pad 3)
    a = np.stack([f[..., 3] > 0 for f in frames]).any(0)
    ys, xs = np.nonzero(a)
    x0, y0, x1, y1 = xs.min() - 3, ys.min() - 3, xs.max() + 3, ys.max() + 3
    frames = [f[y0:y1 + 1, x0:x1 + 1] for f in frames]
    return frames, (anchor[0] - x0, anchor[1] - y0), (x0, y0)


def comps(mask):
    H, W = mask.shape
    seen = np.zeros((H, W), bool)
    out = []
    for y, x in zip(*np.nonzero(mask)):
        if seen[y, x]:
            continue
        q = deque([(y, x)])
        seen[y, x] = True
        pts = []
        while q:
            cy, cx = q.popleft()
            pts.append((cy, cx))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < H and 0 <= nx < W and mask[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        q.append((ny, nx))
        out.append(np.array(pts))
    return out


def warm(f):
    r, g, b = [f[..., i].astype(int) for i in range(3)]
    return (f[..., 3] > 0) & (r - b > 0.38 * r) & (r > g + 10)


def main():
    frames, anchor, off = load(sys.argv[1])
    H, W = frames[0].shape[:2]
    print('size', W, H, 'anchor', anchor, 'crop offset', off)
    lum = lambda f: f[..., :3].astype(float) @ np.array([0.3, 0.55, 0.15])
    n = len(frames)
    # body masks (no dust)
    bodies = []
    for i, f in enumerate(frames):
        op = f[..., 3] == 255
        wm = warm(f)
        # eyes are warm too: keep warm px in the head region (x > 0.75 W) as body
        wm[:, int(W * 0.78):] &= False
        body = op & ~wm
        cs = comps(body)
        big = max(cs, key=len)
        bm = np.zeros_like(body)
        for c in cs:
            if len(c) > 200:
                bm[c[:, 0], c[:, 1]] = True
        bodies.append(bm)
    print('frame  opaque  body  dust  snoutX  hornTop(x,y)  eyeY  lowestBodyY  meanLumOpaque  meanA*L')
    for i, f in enumerate(frames):
        bm = bodies[i]
        ys, xs = np.nonzero(bm)
        sx = xs.max()
        hx = xs > 225
        top = np.argmin(np.where(hx, ys, 9999))
        # eye: brightest yellow px
        r, g, b = [f[..., c].astype(int) for c in range(3)]
        ey = np.nonzero((r > 200) & (g > 150) & (b < 140) & (f[..., 3] == 255) & (np.arange(W)[None, :] > 225) & (np.arange(H)[:, None] < 110))
        eyy = ey[0].mean() if len(ey[0]) else -1
        eyx = ey[1].mean() if len(ey[1]) else -1
        op = f[..., 3] == 255
        L = lum(f)
        al = f[..., 3] / 255.0
        print(f'{i:5d} {op.sum():7d} {bm.sum():5d} {(warm(f)).sum():5d} {sx:7d}   ({xs[top]},{ys[top]})  ({eyx:5.1f},{eyy:5.1f}) {ys.max():6d}'
              f'   {L[op].mean():6.1f}  {(al * L).mean():6.2f}')
    print('step  xor/union(alpha>0)  xor/union(body)  body area change')
    for i in range(n):
        j = (i + 1) % n
        a, b = frames[i][..., 3] > 0, frames[j][..., 3] > 0
        x1 = (a ^ b).sum() / (a | b).sum()
        a, b = bodies[i], bodies[j]
        x2 = (a ^ b).sum() / (a | b).sum()
        print(f'{i}->{j}   {x1:6.1%}   {x2:6.1%}   {(b.sum() - a.sum()) / a.sum():+6.1%}')
    # spray (frame 5): warm px not in the biggest warm component
    f = frames[5]
    wm = warm(f) & (np.arange(W)[None, :] < W * 0.78)
    cs = sorted(comps(wm), key=len, reverse=True)
    pile = np.zeros_like(wm)
    pile[cs[0][:, 0], cs[0][:, 1]] = True
    spray = wm & ~pile
    sp = f[spray][:, :3].astype(float)
    dark = (sp @ np.array([0.3, 0.55, 0.15]) < 85).sum()
    print('frame 5 spray px', int(spray.sum()), 'mean', sp.mean(0).round(1).tolist(), 'dark (<85 lum)', int(dark),
          'alpha160', int((f[spray][:, 3] < 255).sum()))
    if len(sys.argv) > 2:
        Z = 3
        strip = Image.new('RGB', ((W * Z + 4) * n, H * Z), (255, 255, 255))
        for i, f in enumerate(frames):
            bg = Image.new('RGBA', (W, H), (52, 64, 48, 255))
            bg.alpha_composite(Image.fromarray(f, 'RGBA'))
            strip.paste(bg.convert('RGB').resize((W * Z, H * Z), Image.NEAREST), (i * (W * Z + 4), 0))
        strip.save(sys.argv[2] + '-strip.png')
        # onion of consecutive pairs
        tiles = Image.new('RGB', ((W * 2 + 4) * 4, (H * 2 + 4) * 2), (255, 255, 255))
        for i in range(n):
            j = (i + 1) % n
            v = np.zeros((H, W, 3), np.uint8)
            v[:] = (20, 20, 26)
            la, lb = lum(frames[i]), lum(frames[j])
            ma, mb = frames[i][..., 3] > 0, frames[j][..., 3] > 0
            v[ma, 0] = np.clip(60 + la[ma] * 1.2, 0, 255)
            v[mb, 1] = np.clip(60 + lb[mb], 0, 255)
            v[mb, 2] = np.clip(60 + lb[mb] * 1.2, 0, 255)
            t = Image.fromarray(v).resize((W * 2, H * 2), Image.NEAREST)
            tiles.paste(t, ((i % 4) * (W * 2 + 4), (i // 4) * (H * 2 + 4)))
        tiles.save(sys.argv[2] + '-onion.png')


main()
