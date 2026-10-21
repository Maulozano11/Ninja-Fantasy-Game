"""Review sheets for the venom cobra: beasts-cobra.png (his pictures beside ours, every frame, the cobra
next to our character) and beasts-cobra.gif (the loop at its fps, x3).

    python3 -I review.py <repo> <staging> <art2> <cobra-ref.json> <character.png>
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

REPO, STAGE, ART2, SIDE, CHARP = sys.argv[1:6]
K = 3
GRASS = (93, 107, 87, 255)
PANEL = (31, 33, 46, 255)
SHEET = (24, 26, 34, 255)
INK = (232, 226, 200, 255)
DIM = (160, 160, 150, 255)
font = ImageFont.load_default(size=15)
small = ImageFont.load_default(size=12)


def frames_of(group_dir, name, anim='fly'):
    man = json.load(open(os.path.join(group_dir, 'manifest.json')))
    sp = man['sprites'][name]
    img = Image.open(os.path.join(group_dir, sp['file'])).convert('RGBA')
    a = sp['anims'][anim]
    fw, fh = sp['frameW'], sp['frameH']
    fr = [img.crop((i * fw, a['row'] * fh, (i + 1) * fw, (a['row'] + 1) * fh)) for i in range(a['frames'])]
    return fr, sp


def on(bg, im):
    o = Image.new('RGBA', im.size, bg)
    o.alpha_composite(im)
    return o


def up(im, k=K):
    return im.resize((im.width * k, im.height * k), Image.NEAREST)


side = json.load(open(SIDE))
new, sp = frames_of(os.path.join(STAGE, 'vfx_beasts_cobra'), 'poison')
old, osp = frames_of(os.path.join(REPO, 'src/assets/world/vfx_beasts'), 'poison')
fw, fh = sp['frameW'], sp['frameH']
ax, ay = sp['anchor']
ref = Image.open(os.path.join(REPO, 'docs/reference/poison-set-owner-reference.jpg')).convert('RGBA')
his = {}
for fi, kk in (('0', 'L'), ('5', 'R')):
    sx, sy = side['keys'][fi]['anchor_in_sheet']
    his[fi] = ref.crop((sx - ax, sy - ay, sx - ax + fw, sy - ay + fh))
char = Image.open(CHARP).convert('RGBA')

# Light per frame from the built sheet (mean alpha x luma, x1000).
LUMA = np.array([0.3, 0.55, 0.15])
light = [round(float(((np.asarray(f, np.float32)[..., 3] / 255) * (np.asarray(f, np.float32)[..., :3] @ LUMA / 255)).mean() * 1000), 2) for f in new]
opaque = [int((np.asarray(f)[..., 3] == 255).sum()) for f in new]
print('light', light)
print('opaque', opaque)

pad, gap = 14, 10
W0 = pad * 2 + 4 * (fw * K + gap)
W = max(W0, (10 + 100 + fw + 6 + 100 + fw + 10 + 156 + 10) * K)
blocks = []

# 1. His pictures (his sheet, 1:1 = game scale, cut on our anchor) beside our frames 0 and 5.
row1 = Image.new('RGBA', (W, fh * K + 40), SHEET)
d = ImageDraw.Draw(row1)
x = pad
for fi, title in (('0', 'his LEFT (sheet, 1:1)'), ('0o', 'ours: fly frame 0'), ('5', 'his RIGHT (sheet, 1:1)'), ('5o', 'ours: fly frame 5')):
    im = his[fi] if not fi.endswith('o') else on(PANEL, new[int(fi[0])])
    row1.paste(up(im), (x, 30))
    # our anchor
    dd = ImageDraw.Draw(row1)
    cx, cy = x + ax * K + 1, 30 + ay * K + 1
    dd.line([(cx - 6, cy), (cx + 6, cy)], fill=(255, 80, 80, 255))
    dd.line([(cx, cy - 6), (cx, cy + 6)], fill=(255, 80, 80, 255))
    d.text((x, 8), title, fill=INK, font=font)
    x += fw * K + gap
blocks.append(row1)

# 1b. Close-ups (x6): his head and his neck-base mist beside ours, on his two pictures. The boxes are found
#     from the frame: the head is the top right, the neck base the bottom right of the body.
Z = 6
a0 = np.asarray(new[0])[..., 3] == 255
ys_, xs_ = np.nonzero(a0)
hx1 = int(xs_.max()) + 2
head_box = (hx1 - 62, int(ys_.min()) - 2, hx1, int(ys_.min()) + 44)
neck_box = (ax + 4, int(ys_.max()) - 34, ax + 64, int(ys_.max()) + 3)
cl = []
for bx, nm in ((head_box, 'head'), (neck_box, 'neck base')):
    for fi in ('0', '5'):
        hb = his[fi].crop(bx)
        ob = on(PANEL, new[int(fi)]).crop(bx)
        tile = Image.new('RGBA', (hb.width * Z * 2 + 8, hb.height * Z + 24), SHEET)
        tile.paste(up(hb.convert('RGBA'), Z), (0, 22))
        tile.paste(up(ob, Z), (hb.width * Z + 8, 22))
        ImageDraw.Draw(tile).text((2, 3), f'{nm}, frame {fi}: his | ours  (x{Z})', fill=INK, font=small)
        cl.append(tile)
cw_ = max(t.width for t in cl)
ch_ = max(t.height for t in cl)
per = max(1, W // (cw_ + gap))
rowsN = (len(cl) + per - 1) // per
row1b = Image.new('RGBA', (max(W, per * (cw_ + gap)), rowsN * (ch_ + gap)), SHEET)
for i, t in enumerate(cl):
    row1b.paste(t, ((i % per) * (cw_ + gap) + pad, (i // per) * (ch_ + gap)))
blocks.append(row1b)

# 2. Every fly frame on the battle-map grass (x3), with its light.
rows = []
for r in range(2):
    rw = Image.new('RGBA', (W, fh * K + 36), SHEET)
    d = ImageDraw.Draw(rw)
    x = pad
    for i in range(r * 4, r * 4 + 4):
        rw.paste(up(on(GRASS, new[i])), (x, 26))
        lab = f'fly {i}' + ('  = his LEFT' if i == 0 else '  = his RIGHT' if i == 5 else '')
        d.text((x, 6), lab + f'   light {light[i]}', fill=INK if i in (0, 5) else DIM, font=font)
        x += fw * K + gap
    rows.append(rw)
blocks += rows

# 3. Scale: our character and the cobra on one ground line (his sheet puts the coils on the ground), and the
#    cobra at flight height (the renderer flies a beast's anchor about 64 px over the ground); the old cobra.
H3 = 190
SW = 10 + 100 + fw + 6 + 100 + fw + 10 + osp['frameW'] + 10
sc = Image.new('RGBA', (SW, H3), GRASS)
ground = H3 - 24
ImageDraw.Draw(sc).rectangle([0, ground, sc.width, H3], fill=(74, 90, 60, 255))
x = 10
sc.alpha_composite(char, (x, ground - 120))
x += 100
fb = np.nonzero(np.asarray(new[0])[..., 3].max(1))[0].max()  # lowest pixel of frame 0 (the coil on the ground)
sc.alpha_composite(new[0], (x, ground - fb - 1))
x += fw + 6
sc.alpha_composite(char, (x, ground - 120))
x += 100
sc.alpha_composite(new[5], (x, ground - 64 - ay))
x += fw + 10
oax, oay = osp['anchor']
sc.alpha_composite(old[0], (x, ground - 64 - oay))
row3 = Image.new('RGBA', (max(W, SW * K), H3 * K + 30), SHEET)
row3.paste(up(sc), (0, 30))
d = ImageDraw.Draw(row3)
d.text((pad, 8), 'scale: our character (96 px) | frame 0 with the coils on the ground | at flight height (anchor 64 px up) | the old cobra (in game), for comparison', fill=INK, font=font)
blocks.append(row3)

head = Image.new('RGBA', (W, 64), SHEET)
d = ImageDraw.Draw(head)
d.text((pad, 8), f"VENOM COBRA (vfx_beasts_cobra / poison)  {fw}x{fh}, anchor {ax},{ay} (centre of the body's mass, red cross)  fly {len(new)} frames @ {sp['anims']['fly']['fps']} fps loop  x{K}", fill=INK, font=font)
d.text((pad, 30), f"his scale: his character {side['his_character']} px -> median {float(np.median(list(side['his_character'].values()))):g} against our 96 = {side['scale_measured']:.3f}, within a JPEG edge of 1: taken 1:1.  Light (mean alpha x luma x1000): {light}", fill=DIM, font=small)
d.text((pad, 46), f"opaque px per frame: {opaque}", fill=DIM, font=small)
blocks.insert(0, head)
H = sum(b.height for b in blocks) + 6 * len(blocks)
out = Image.new('RGBA', (max(b.width for b in blocks), H), SHEET)
y = 0
for b in blocks:
    out.paste(b, (0, y))
    y += b.height + 6
tmp = os.path.join(ART2, 'beasts-cobra.png.part')
out.convert('RGB').save(tmp, 'PNG')
os.replace(tmp, os.path.join(ART2, 'beasts-cobra.png'))

# GIF: the loop at its fps, x3, on the grass.
fps = sp['anims']['fly']['fps']
gf = [up(on(GRASS, f)).convert('RGB') for f in new]
tmp = os.path.join(ART2, 'beasts-cobra.gif.part')
gf[0].save(tmp, 'GIF', save_all=True, append_images=gf[1:], duration=int(round(1000 / fps)), loop=0, disposal=1)
os.replace(tmp, os.path.join(ART2, 'beasts-cobra.gif'))
print('wrote', os.path.join(ART2, 'beasts-cobra.png'), out.size, 'and the gif', gf[0].size, len(gf), 'frames at', fps, 'fps')
