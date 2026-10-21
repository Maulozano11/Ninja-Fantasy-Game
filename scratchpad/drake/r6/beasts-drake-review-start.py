"""Review sheet + GIF for the stone drake: his two pictures at game scale on our anchor next to our
frames 0 and 5, all eight frames, and the drake beside our character for scale.

    python3 -I review.py <staged vfx_beasts dir> <reference.jpg> <beasts-ref-earth.json> <character.png> <out.png> <out.gif>
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

stage, refp, sidep, charp, outp, gifp = sys.argv[1:7]
man = json.load(open(os.path.join(stage, 'manifest.json')))['sprites']['earth']
sheet = Image.open(os.path.join(stage, man['file'])).convert('RGBA')
FW, FH = man['frameW'], man['frameH']
AX, AY = man['anchor']
n = man['anims']['fly']['frames']
frames = [sheet.crop((i * FW, 0, (i + 1) * FW, FH)) for i in range(n)]
side = json.load(open(sidep))
S = side['scale']
ref = Image.open(refp).convert('RGB')
PANEL_BG = (34, 34, 44)
GRASS = (0x5d, 0x6b, 0x57)
K = 3


def his(k):
    """His picture k box-filtered to game scale, placed on our anchor as the converter places it."""
    tx, ty = side['keys'][str(k)]['torso']
    box = (tx - AX / S, ty - AY / S, tx + (FW - AX) / S, ty + (FH - AY) / S)
    return ref.resize((FW, FH), Image.BOX, box=box)


def on(bg, im):
    b = Image.new('RGBA', im.size, bg + (255,))
    b.alpha_composite(im)
    return b.convert('RGB')


def label(img, text):
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, 8 * len(text) + 8, 16), fill=(0, 0, 0))
    d.text((4, 3), text, fill=(255, 230, 120))
    return img


gap = 6
# Row 1: his 0, ours 0, his 5, ours 5 (on his panel colour, so they compare like for like).
row1 = [(his(0), 'HIS LEFT (prowl)'), (on(PANEL_BG, frames[0]), 'OURS frame 0'), (his(5), 'HIS RIGHT (lunge)'), (on(PANEL_BG, frames[5]), 'OURS frame 5')]
# Row 2-3: all eight frames on the battlefield green, over a ground strip at the feet line (frame 0's
# lowest claw), so the leap and the dust resting on the ground show.
feet_y = max(y for y in range(FH) if any(frames[0].getpixel((x, y))[3] == 255 for x in range(FW)))


def on_ground(im):
    b = Image.new('RGBA', im.size, GRASS + (255,))
    ImageDraw.Draw(b).rectangle((0, feet_y + 1, im.width, im.height), fill=(0x4a, 0x5a, 0x3c, 255))
    b.alpha_composite(im)
    return b.convert('RGB')


names = {0: 'frame 0 = HIS LEFT', 5: 'frame 5 = HIS RIGHT'}
row2 = [(on_ground(f), names.get(i, f'frame {i}')) for i, f in enumerate(frames)]
# Row 4: our character beside frames 0 and 5, all standing on one ground line.
ch = Image.open(charp).convert('RGBA')
W = (FW + gap) * 4 + gap
scale_row = Image.new('RGB', (W, max(FH, 128) + 20), GRASS)
gy = scale_row.height - 14
ImageDraw.Draw(scale_row).rectangle((0, gy, W, scale_row.height), fill=(0x4a, 0x5a, 0x3c))
scale_row.paste(ch, (gap + 20, gy - 120), ch)
scale_row.paste(frames[0], (gap + 160, gy - feet_y), frames[0])
scale_row.paste(frames[5], (gap + 160 + FW + 40, gy - feet_y), frames[5])
label(scale_row, f'scale: our 96 px character, frame 0 and 5 (feet line y={feet_y})')

out = Image.new('RGB', (W, gap + (FH + gap) * 3 + scale_row.height + gap), (14, 14, 18))
for i, (im, t) in enumerate(row1):
    out.paste(label(im.copy(), t), (gap + i * (FW + gap), gap))
for i, (im, t) in enumerate(row2):
    out.paste(label(im.copy(), t), (gap + (i % 4) * (FW + gap), gap + (FH + gap) * (1 + i // 4)))
out.paste(scale_row, (0, gap + (FH + gap) * 3))
out = out.resize((out.width * K, out.height * K), Image.NEAREST)
tmp = outp + '.part.png'
out.save(tmp)
os.replace(tmp, outp)
print('feet line y', feet_y, 'frame', FW, FH, 'anchor', AX, AY)

gif = [on_ground(f).resize((FW * K, FH * K), Image.NEAREST) for f in frames]
tmp = gifp + '.part.gif'
# GIF delays are in 10 ms steps: spread the rounding so the loop runs at the real 12 fps on average.
step = 1000 / man['anims']['fly']['fps']
dur = [int(round((i + 1) * step / 10) * 10 - round(i * step / 10) * 10) for i in range(len(gif))]
gif[0].save(tmp, save_all=True, append_images=gif[1:], duration=dur, loop=0, disposal=1)
os.replace(tmp, gifp)
