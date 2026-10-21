import json
import numpy as np
from PIL import Image, ImageDraw, ImageFont

W = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/approve/_work/12-avance'
OUT = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/approve'
GROUND = '/home/user/Ninja-Fantasy-Game/src/assets/maps/river_forest/ground.webp'
FR = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
FB = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'

BG = (0x14, 0x18, 0x1c, 255)
PANEL = (0x22, 0x28, 0x2e, 255)
TITLEBG = (0x0c, 0x0f, 0x12, 255)
WHITE = (236, 238, 240, 255)
GREY = (150, 158, 166, 255)
GOLD = (240, 196, 92, 255)
GREEN = (120, 210, 140, 255)
ORANGE = (240, 150, 80, 255)
RED = (235, 100, 90, 255)


def font(sz, bold=False):
    return ImageFont.truetype(FB if bold else FR, sz)


def up(im, k):
    return im.resize((im.width * k, im.height * k), Image.NEAREST)


def load_manifest(path):
    m = json.load(open(path))
    return m.get('sprites', m)


def frames_of(png, spec, anim):
    im = Image.open(png).convert('RGBA')
    a = spec['anims'][anim]
    fw, fh = spec['frameW'], spec['frameH']
    return [im.crop((f * fw, a['row'] * fh, (f + 1) * fw, (a['row'] + 1) * fh)) for f in range(a['frames'])]


def union_bbox(frames):
    bb = None
    for f in frames:
        b = f.getbbox()
        if b is None:
            continue
        bb = b if bb is None else (min(bb[0], b[0]), min(bb[1], b[1]), max(bb[2], b[2]), max(bb[3], b[3]))
    return bb


def ground(x0, y0, w, h):
    g = Image.open(GROUND).convert('RGBA')
    return g.crop((x0, y0, x0 + w, y0 + h))


def text(d, xy, s, f, fill=WHITE, anchor='la'):
    d.text(xy, s, font=f, fill=fill, anchor=anchor)


def title_bar(img, title, subtitle, h=96):
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, img.width, h), fill=TITLEBG)
    d.rectangle((0, h - 3, img.width, h), fill=GOLD)
    text(d, (24, 16), title, font(30, True), WHITE)
    text(d, (24, 58), subtitle, font(18), GREY)
    return h
