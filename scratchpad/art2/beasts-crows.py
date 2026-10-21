"""Review sheet and GIFs for the crow swarm copied from the owner's genjutsu sheet.

    python3 -I beasts-crows.py            (paths are relative to this file)

Reads the staged sheet (staging/vfx_beasts_crows), his two pictures at the game scale on our grid
and where they came from (crows-ref/, written by tools/refs/crows-from-ref.py with a debug dir), and
the character (beasts-character.png). Writes beasts-crows.png, beasts-crows.gif (fly loop) and
beasts-crows-summon.gif, each to a temp name and renamed, so a reader never sees half a file.
"""
import json
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
STAGE = os.path.join(HERE, 'staging', 'vfx_beasts_crows')
REFD = os.path.join(HERE, 'crows-ref')
K = 3
BG = (0x5D, 0x6B, 0x57, 255)        # the battle map's grass, as in the other beast sheets
HISBG = (31, 31, 41, 255)            # his panel's background
SHEET = (0x2A, 0x2E, 0x36, 255)
GROUND = (0x4A, 0x5A, 0x3C, 255)
INK = (0xE8, 0xE0, 0xC0, 255)
TICK = (0xE8, 0xC0, 0x40, 255)
FONT = ImageFont.load_default(size=22)
SMALL = ImageFont.load_default(size=18)


def save_whole(img, name, **kw):
    path = os.path.join(HERE, name)
    tmp = path + '.part'
    img.save(tmp, format=kw.pop('format', 'PNG'), **kw)
    os.replace(tmp, path)


man = json.load(open(os.path.join(STAGE, 'manifest.json')))['sprites']['genjutsu']
sheet = Image.open(os.path.join(STAGE, man['file'])).convert('RGBA')
FW, FH = man['frameW'], man['frameH']
AX, AY = man['anchor']


def frames(anim):
    a = man['anims'][anim]
    return [sheet.crop((i * FW, a['row'] * FH, (i + 1) * FW, (a['row'] + 1) * FH)) for i in range(a['frames'])]


FLY, SUMMON = frames('fly'), frames('summon')
info = json.load(open(os.path.join(REFD, 'crows-ref.json')))
# His pictures were written on the converter's grid; shift them onto the staged anchor.
DX, DY = AX - info['anchor'][0], AY - info['anchor'][1]


def his(key):
    src = Image.open(os.path.join(REFD, f'crows-his-{key}.png')).convert('RGBA')
    out = Image.new('RGBA', (FW, FH), HISBG)
    out.alpha_composite(src, (DX, DY)) if DX >= 0 and DY >= 0 else out.paste(src, (DX, DY), src)
    return out


def panel(frame, bg=BG, ticks=True):
    c = Image.new('RGBA', frame.size, bg)
    c.alpha_composite(frame)
    c = c.resize((frame.width * K, frame.height * K), Image.NEAREST)
    if ticks:  # the anchor, marked on the panel's edges
        d = ImageDraw.Draw(c)
        x, y = AX * K + K // 2, AY * K + K // 2
        d.line([(x, 0), (x, 8)], fill=TICK, width=2)
        d.line([(x, c.height - 9), (x, c.height - 1)], fill=TICK, width=2)
        d.line([(0, y), (8, y)], fill=TICK, width=2)
        d.line([(c.width - 9, y), (c.width - 1, y)], fill=TICK, width=2)
    return c


def grid(tiles, labels, cols, gap=10):
    w, h = tiles[0].size
    rows = (len(tiles) + cols - 1) // cols
    out = Image.new('RGBA', (cols * w + (cols - 1) * gap, rows * h + (rows - 1) * gap), SHEET)
    d = ImageDraw.Draw(out)
    for i, (t, lab) in enumerate(zip(tiles, labels)):
        x, y = (i % cols) * (w + gap), (i // cols) * (h + gap)
        out.paste(t, (x, y))
        d.text((x + 8, y + 6), lab, fill=INK, font=SMALL)
    return out


# Scale: the character and the swarm (fly 0 and 4) at flight height, like the beasts lineup.
char = Image.open(os.path.join(HERE, 'beasts-character.png')).convert('RGBA')
LIFT = 64  # the renderer flies beasts about 64 px above the ground
above = max(120 + 4, LIFT + AY + 4)
below = 26
SW = 8 + 128 + 16 + FW + 12 + FW + 8
scale = Image.new('RGBA', (SW, above + below), BG)
ImageDraw.Draw(scale).rectangle([0, above, SW, above + below], fill=GROUND)
scale.alpha_composite(char, (8, above - 120))
scale.alpha_composite(FLY[0], (8 + 128 + 16, above - LIFT - AY))
scale.alpha_composite(FLY[4], (8 + 128 + 16 + FW + 12, above - LIFT - AY))
scale = scale.resize((SW * K, scale.height * K), Image.NEAREST)

blocks = [
    ('his', grid([panel(his('L'), HISBG), panel(FLY[0], HISBG), panel(FLY[0]), panel(his('R'), HISBG), panel(FLY[4], HISBG), panel(FLY[4])],
                 ['his left picture', 'ours: fly 0 (on his background)', 'ours: fly 0 (on the grass)', 'his right picture', 'ours: fly 4 (on his background)', 'ours: fly 4 (on the grass)'], 3),
     "His BEAST pictures (at the game scale, on our anchor) next to our frames 0 and 4, x3. Ticks: the anchor (shared)"),
    ('fly', grid([panel(f) for f in FLY], ['0 (his left)', '1', '2', '3', '4 (his right)', '5'], 3),
     'fly, 6 frames at 12 fps, loop: 1-3 and 5 move his crows as whole pieces (near wing turned, far wing sunk behind the body); his vortex spins, closes as the flock forms, reopens over 5 and 0'),
    ('summon', grid([panel(f) for f in SUMMON], ['0', '1', '2', '3', '4', '5 (his left)'], 3),
     'summon (OUR PROPOSAL, not in his sheet), 6 frames at 12 fps, once, at the caster before the swarm flies: the vortex opens, the crows come out of it head first and rise round it'),
    ('scale', scale, 'Scale: our character and the swarm (fly 0 and 4) at flight height, x3'),
]
title = f"Crow swarm (vfx_beasts_crows/genjutsu) copied from the owner's genjutsu sheet: {FW}x{FH}, anchor [{AX}, {AY}], fly 6F 12fps loop, summon 6F 12fps once"
W = max(b.width for _, b, _ in blocks) + 40
H = 60 + sum(b.height + 60 for _, b, _ in blocks)
out = Image.new('RGBA', (W, H), SHEET)
d = ImageDraw.Draw(out)
d.text((20, 18), title, fill=INK, font=FONT)
y = 60
for _, b, cap in blocks:
    d.text((20, y + 8), cap, fill=INK, font=FONT)
    out.paste(b, (20, y + 44))
    y += b.height + 60
save_whole(out, 'beasts-crows.png')


def gif(frs, name, hold_last=0):
    """Frames x3 on the grass at 12 fps, with an exact palette (no dithering: the art has few colours)."""
    imgs = []
    for f in frs:
        c = Image.new('RGBA', f.size, BG)
        c.alpha_composite(f)
        imgs.append(c.convert('RGB').resize((f.width * K, f.height * K), Image.NEAREST))
    arrs = [np.asarray(im).reshape(-1, 3) for im in imgs]
    colours, inv = np.unique(np.concatenate(arrs), axis=0, return_inverse=True)
    assert len(colours) <= 256, len(colours)
    pal = colours.astype(np.uint8).flatten().tolist() + [0] * (768 - 3 * len(colours))
    ps = []
    off = 0
    for im, a in zip(imgs, arrs):
        p = Image.fromarray(inv[off:off + len(a)].reshape(im.height, im.width).astype(np.uint8), 'P')
        off += len(a)
        p.putpalette(pal)
        ps.append(p)
    durs = [80, 90, 80, 80, 90, 80][:len(ps)]  # GIF delays are in 1/100 s: 12 fps on average
    if hold_last:
        durs[-1] = hold_last
    path = os.path.join(HERE, name)
    tmp = path + '.part'
    ps[0].save(tmp, format='GIF', save_all=True, append_images=ps[1:], duration=durs, loop=0, disposal=1, optimize=False)
    os.replace(tmp, path)


gif(FLY, 'beasts-crows.gif')
gif(SUMMON, 'beasts-crows-summon.gif', hold_last=700)
print('beasts-crows.png', out.size, '| fly', len(FLY), '| summon', len(SUMMON), '| frame', (FW, FH), 'anchor', (AX, AY))
