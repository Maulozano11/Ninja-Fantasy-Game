"""Composites the staged bridge sprites over the river for the owner's review.

    python3 bridge-compose.py <repo> <art2 dir>

bridge-preview.png        the bridge at 2x over the river crop of the baked map (x 1300..1900, y 520..860),
                          which still contains the old painted bridge underneath
bridge-preview-river.png  the same over a plain river strip painted here with the map's own formulas
                          and palettes (no old bridge), so the sprite is seen as it will be in the game
Draw order as in the game: map, bridge (deck, face, piers, back railing), units on the deck, front railing.
"""
import json
import math
import os
import sys

import numpy as np
from PIL import Image

REPO, ART = sys.argv[1], sys.argv[2]
STAGE = os.path.join(ART, 'staging', 'bridge')
CX0, CY0, CW, CH = 1300, 520, 600, 340

man = json.load(open(os.path.join(STAGE, 'manifest.json')))['sprites']
info = json.load(open(os.path.join(STAGE, 'bridge.json')))
mapj = json.load(open(os.path.join(REPO, 'src', 'assets', 'maps', 'river_forest', 'map.json')))


def frame(name, row=0, col=0):
    s = man[name]
    sheet = Image.open(os.path.join(STAGE, s['file'])).convert('RGBA')
    return sheet.crop((col * s['frameW'], row * s['frameH'], (col + 1) * s['frameW'], (row + 1) * s['frameH']))


# The map's deck covers columns ceil(x0 - 0.5).. and rows ..floor(yBot - 0.5): anchor = its front-left pixel.
b = mapj['bridge']
ax_map = math.ceil(b['x0'] - 0.5)
ay_map = math.floor(b['yBot'] - 0.5)
ax, ay = info['anchor']
ox, oy = ax_map - CX0 - ax, ay_map - CY0 - ay

char = Image.open(os.path.join(ART, 'bridge-work', 'bridge-charref.png')).convert('RGBA')
FEET = (64, 120)


# --- a plain river strip, painted with the map generator's formulas and palettes -------------------
def pal(*hs):
    return np.array([[int(h[i:i + 2], 16) for i in (1, 3, 5)] for h in hs], float)


GRASS = pal('#1f3a24', '#2a5230', '#386b37', '#4a853e', '#62a046', '#82bb52', '#a6d16a')
DIRT = pal('#3a2a22', '#523a2a', '#6b4d34', '#86633f', '#a07c50', '#bd9a66')
WATER = pal('#123048', '#173f5c', '#1d5070', '#256487', '#2f7b9e', '#4596b4', '#6fb8cc', '#a8dde2')
SAND = pal('#3d6a6a', '#4f8278', '#679a86', '#86b394')
PXM, PZM, BACK_Y, DEPTH_M = 57, 38, 360, 20.0


def quant(v, p):
    return p[np.clip((v * len(p)).astype(int), 0, len(p) - 1)]


def vnoise(h, w, cell, seed, squash=1.0):
    r = np.random.default_rng(seed)
    gh, gw = int(h * squash / cell) + 3, int(w / cell) + 3
    a = r.random((gh, gw))
    im = Image.fromarray((a * 255).astype(np.uint8)).resize((gw * cell, int(gh * cell / squash)), Image.BICUBIC)
    return np.array(im)[:h, :w] / 255.0


def river_c(z):
    return 29.6 - 2.4 * z / DEPTH_M + 0.5 * math.sin(z * 0.44), 2.3 + 0.7 * z / DEPTH_M


def plain_river():
    rng = np.random.default_rng(11)
    yy, xx = np.mgrid[CY0:CY0 + CH, CX0:CX0 + CW]
    depth = np.clip((yy - BACK_Y) / (DEPTH_M * PZM), 0, 1)
    gv = 0.33 + 0.30 * (1 - depth) + (vnoise(CH, CW, 40, 31, 0.5) - 0.5) * 0.14 + (vnoise(CH, CW, 9, 32) - 0.5) * 0.08
    img = quant(np.clip(gv, 0, 1), GRASS)
    river = np.zeros((CH, CW), bool)
    across = np.zeros((CH, CW))
    offL = np.convolve(rng.normal(0, 1, CH + 40), np.ones(15) / 15, 'same')[20:-20] * 14
    offR = np.convolve(rng.normal(0, 1, CH + 40), np.ones(15) / 15, 'same')[20:-20] * 14
    for r in range(CH):
        z = (CY0 + r - BACK_Y) / PZM
        c, hw = river_c(z)
        left, right = (c - hw) * PXM + offL[r] - CX0, (c + hw) * PXM + offR[r] - CX0
        river[r, max(0, int(left)):min(CW, int(right))] = True
        across[r] = (xx[r] - CX0 - (left + right) / 2) / max(1, (right - left) / 2)
    deep = np.clip(1 - np.abs(across), 0, 1)
    wv = 0.78 - 0.55 * deep ** 0.8 + 0.12 * (1 - depth) + (vnoise(CH, CW, 9, 51, 0.5) - 0.5) * 0.16
    img[river] = quant(np.clip(wv, 0, 1), WATER)[river]
    shallow = river & (np.abs(across) > 0.8)
    img[shallow] = quant(np.clip(0.55 + (vnoise(CH, CW, 4, 52) - 0.5) * 0.4, 0, 1), SAND)[shallow]
    for _ in range(420):
        r = int(rng.integers(0, CH))
        x = int(rng.integers(0, CW))
        ln = 3 + int(rng.random() * 12)
        tone = rng.choice([5, 6, 7], p=[0.5, 0.38, 0.12])
        for k in range(ln):
            if x + k < CW and river[r, x + k] and not shallow[r, x + k]:
                img[r, x + k] = WATER[tone]
    lip = river & ~(np.roll(river, 1, 1) & np.roll(river, -1, 1))
    lip2 = river & ~(np.roll(river, 3, 1) & np.roll(river, -3, 1))
    img[lip2] = DIRT[1]
    img[lip] = DIRT[0]
    # grass blades
    for _ in range(900):
        r, x = int(rng.integers(4, CH)), int(rng.integers(0, CW))
        if river[r, x]:
            continue
        for j in range(int(rng.integers(2, 5))):
            if not river[r - j, x]:
                img[r - j, x] = GRASS[5] if j > 0 else GRASS[2]
    # the map's grade (misty forest mood)
    img = img * np.array([0.84, 0.92, 0.90]) + np.array([6, 12, 14])
    out = np.zeros((CH, CW, 4), np.uint8)
    out[..., :3] = img.clip(0, 255).astype(np.uint8)
    out[..., 3] = 255
    return Image.fromarray(out)


def compose(bg, label):
    im = bg.copy()
    im.alpha_composite(frame('bridge'), (ox, oy))
    # One unit mid-deck, one near the front edge (its legs behind the front railing).
    for x, d, flip in ((150, 60, False), (262, 14, True)):
        c = char.transpose(Image.FLIP_LEFT_RIGHT) if flip else char
        fx = FEET[0] if not flip else c.width - 1 - FEET[0]
        im.alpha_composite(c, (ax_map - CX0 + x - fx, ay_map - CY0 - round(d * 38 / 57) - FEET[1]))
    im.alpha_composite(frame('bridge_rail_front'), (ox, oy))
    im = im.resize((CW * 2, CH * 2), Image.NEAREST)
    im.save(os.path.join(ART, label))
    return im


ground = Image.open(os.path.join(REPO, 'src', 'assets', 'maps', 'river_forest', 'ground.webp')).convert('RGBA').crop((CX0, CY0, CX0 + CW, CY0 + CH))
compose(ground, 'bridge-preview.png')
compose(plain_river(), 'bridge-preview-river.png')
print('anchor on the map', (ax_map, ay_map), 'sprite origin in crop', (ox, oy))
