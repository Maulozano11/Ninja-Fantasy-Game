"""Independent measurements of a crow-swarm data module against his JPEG (review r2 metrics).

    python3 -I measure.py <module.ts> [outdir]
"""
import json
import re
import sys

import numpy as np
from PIL import Image

TS = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else None
REF = '/home/user/Ninja-Fantasy-Game/docs/reference/genjutsu-set-owner-reference.jpg'
JS = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/crows-ref/crows-ref.json'

src = open(TS, encoding='utf-8').read()
size = tuple(json.loads(re.search(r'SIZE: \[number, number\] = (\[[^\]]*\])', src).group(1)))
anchor = tuple(json.loads(re.search(r'ANCHOR: \[number, number\] = (\[[^\]]*\])', src).group(1)))
alph = re.search(r"ALPHABET = '([^']*)'", src).group(1)
pal = re.findall(r"'(#[0-9a-f]{8})'", src.split('export const PALETTE')[1].split('];')[0])
palv = np.array([[int(c[i:i + 2], 16) for i in (1, 3, 5, 7)] for c in pal], np.uint8)
frames = {}
body = src.split('export const FRAMES')[1]
for anim in ('fly', 'summon'):
    part = body.split(f'  {anim}: [')[1].split('\n  ],')[0]
    fr = []
    for blk in part.split('    [')[1:]:
        rows = re.findall(r"      '([^']*)',", blk)
        img = np.zeros((size[1], size[0], 4), np.uint8)
        for y, row in enumerate(rows):
            x = 0
            for m in re.finditer(r'(\D)(\d*)', row):
                n = int(m.group(2)) if m.group(2) else 1
                img[y, x:x + n] = palv[alph.index(m.group(1))]
                x += n
            assert x == size[0]
        fr.append(img)
    frames[anim] = fr

W, H = size
AX, AY = anchor
info = json.load(open(JS))
S = info['scale']
ref = Image.open(REF).convert('RGB')


def his_box(key):
    """His JPEG area-averaged (PIL BOX) to the game grid on our anchor."""
    sx, sy = info['anchors'][key]
    box = (sx - AX / S, sy - AY / S, sx + (W - AX) / S, sy + (H - AY) / S)
    return np.asarray(ref.resize((W, H), Image.BOX, box=box)).astype(np.float32)


def luma(c):
    return c[..., 0] * 0.299 + c[..., 1] * 0.587 + c[..., 2] * 0.114


def eyezone(eyes):
    yy, xx = np.mgrid[0:H, 0:W]
    z = np.zeros((H, W), bool)
    for ex, ey in eyes:
        z |= np.hypot(xx + 0.5 - ex, yy + 0.5 - ey) < 3.5
    return z


def vortexish(c):
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    return (c.max(-1) - c.min(-1) > 45) & (b > g + 35)


def flood4(open_):
    reach = np.zeros_like(open_)
    reach[0, :] = open_[0, :]
    reach[-1, :] = open_[-1, :]
    reach[:, 0] |= open_[:, 0]
    reach[:, -1] |= open_[:, -1]
    while True:
        g = reach.copy()
        g[1:] |= reach[:-1]
        g[:-1] |= reach[1:]
        g[:, 1:] |= reach[:, :-1]
        g[:, :-1] |= reach[:, 1:]
        g &= open_
        if (g == reach).all():
            return reach
        reach = g


def dil4(m, n):
    for _ in range(n):
        g = m.copy()
        g[1:] |= m[:-1]
        g[:-1] |= m[1:]
        g[:, 1:] |= m[:, :-1]
        g[:, :-1] |= m[:, 1:]
        m = g
    return m


def eye_pixels(f):
    """Our eye stamp: the reddest pixels (r much above g and b)."""
    c = f[..., :3].astype(np.float32)
    return (f[..., 3] > 0) & (c[..., 0] > c[..., 1] + 30) & (c[..., 0] > c[..., 2] - 10) & (c[..., 0] > 70)


res = {}
for anim, fr in frames.items():
    for i, f in enumerate(fr):
        a = f[..., 3]
        air = flood4(a == 0)
        semi = (a > 0) & (a < 255)
        deep = semi & ~dil4(air, 2)
        res[f'{anim}{i}'] = {'opaque': int((a > 0).sum()), 'semi': int(semi.sum()), 'semi_inside': int(deep.sum()), 'holes': int(((a == 0) & ~air).sum())}
# Highlights on the key frames against his box reference.
for key, i in (('L', 0), ('R', 4)):
    f = frames['fly'][i]
    c = f[..., :3].astype(np.float32)
    on = f[..., 3] > 0
    ez = dil4(eye_pixels(f), 2)
    h = his_box(key)
    hon = np.abs(h - np.array([31, 31, 41])).sum(-1) > 12
    # Only inside his picture (not the label above it or the panel border).
    PICS = {'L': (262, 798, 522, 1009), 'R': (522, 798, 785, 1009)}
    sx, sy = info['anchors'][key]
    yy, xx = np.mgrid[0:H, 0:W]
    gx, gy = sx + (xx + 0.5 - AX) / S, sy + (yy + 0.5 - AY) / S
    x0, y0, x1, y1 = PICS[key]
    hon &= (gx > x0 + 1.5) & (gx < x1 - 1.5) & (gy > y0 + 1.5) & (gy < y1 - 1.5)
    out = {}
    for name, img, m in (('his', h, hon), ('ours', c, on)):
        L = luma(img)
        vx = vortexish(img)
        crow = m & ~ez & ~vx
        allm = m & ~ez
        out[name + '_all'] = [int((allm & (L > t)).sum()) for t in (80, 90, 100, 110, 120)]
        out[name] = {'crow>90': int((crow & (L > 90)).sum()), 'crow>100': int((crow & (L > 100)).sum()), 'crow>110': int((crow & (L > 110)).sum()),
                     'crowmax': round(float(L[crow].max()), 1), 'vort>100': int((m & vx & ~ez & (L > 100)).sum()), 'vortmax': round(float(L[m & vx & ~ez].max()) if (m & vx & ~ez).any() else 0, 1),
                     'eyecol_mean': [round(float(v), 0) for v in img[ez & m].mean(0)] if (ez & m).any() else None}
    res[f'hl_{key}'] = out
# Vortex violet per fly frame.
for anim, fr in frames.items():
    vv, bv = [], []
    for f in fr:
        c = f[..., :3].astype(np.int32)
        on = f[..., 3] > 0
        vio = on & (c[..., 2] - c[..., 1] > 40) & (c[..., 0] - c[..., 1] > 20)
        vv.append(int(vio.sum()))
        bv.append(int((on & (c[..., 2] - c[..., 1] > 70)).sum()))
    res[f'violet_{anim}'] = vv
    res[f'brightviolet_{anim}'] = bv
for k, v in res.items():
    print(k, v)
if OUT:
    import os
    os.makedirs(OUT, exist_ok=True)
    for anim, fr in frames.items():
        for i, f in enumerate(fr):
            a = f[..., 3]
            air = flood4(a == 0)
            semi = (a > 0) & (a < 255)
            deep = semi & ~dil4(air, 2)
            t = Image.new('RGBA', (W, H), (0x5d, 0x6b, 0x57, 255))
            t.alpha_composite(Image.fromarray(f, 'RGBA'))
            arr = np.asarray(t).copy()
            arr[deep] = (0, 255, 255, 255)
            Image.fromarray(arr).resize((W * 3, H * 3), Image.NEAREST).save(os.path.join(OUT, f'm-{anim}{i}.png'))
