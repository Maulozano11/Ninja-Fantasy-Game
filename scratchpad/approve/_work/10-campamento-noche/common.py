import json
import numpy as np
from PIL import Image, ImageDraw, ImageFont

SP = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/'
SC = SP + 'art3/staging/scene/'
OUT = SP + 'approve/'
WORK = SP + 'approve/_work/10-campamento-noche/'
CAMP = '/home/user/Ninja-Fantasy-Game/src/assets/world/camp/'
PARTY = SP + 'art3/work/party/'
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
FONTB = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'

BG = (20, 24, 28, 255)
BAR = (30, 36, 43, 255)
TXT = (228, 232, 236, 255)
SUB = (160, 172, 184, 255)
WARN = (240, 180, 90, 255)

scene = json.load(open(SC + 'scene.json'))
W, H = scene['size']


def font(sz, bold=False):
    return ImageFont.truetype(FONTB if bold else FONT, sz)


def L(name):
    return Image.open(SC + name).convert('RGBA')


def up(im, k):
    return im.resize((im.width * k, im.height * k), Image.NEAREST)


# ---- approved campfire -------------------------------------------------------
man = json.load(open(CAMP + 'manifest.json'))['sprites']['campfire']
cf_sheet = Image.open(CAMP + man['file']).convert('RGBA')
FW, FH = man['frameW'], man['frameH']


def cf_frame(anim, f):
    a = man['anims'][anim]
    return cf_sheet.crop((f * FW, a['row'] * FH, (f + 1) * FW, (a['row'] + 1) * FH))


# The approved sprite's anchor (30,80) is the front foot of the stone ring; the ring itself is centred
# at about (28.5, 60.5) in the frame (bbox of the 'out' frame).  scene.json's fire point is the centre
# of the painted fire pit ("anchor = centre of the ring"), so the ring centre goes on it.
RING_C = (29, 61)
FIRE = (scene['fire']['x'], scene['fire']['y'])
CF_POS = (FIRE[0] - RING_C[0], FIRE[1] - RING_C[1])


def compose(fire_anim='burning', f=0, ground='ground.png', front=True):
    im = Image.new('RGBA', (W, H), (0, 0, 0, 255))
    for n in scene['layers']['back']:
        if n == 'ground.png':
            n = ground
        im.alpha_composite(L(n))
    if fire_anim:
        im.alpha_composite(cf_frame(fire_anim, f), CF_POS)
    if front:
        for n in scene['layers']['front']:
            im.alpha_composite(L(n))
    return im


def checker(w, h, s=12, c1=(38, 44, 52, 255), c2=(30, 35, 42, 255)):
    im = Image.new('RGBA', (w, h), c1)
    d = ImageDraw.Draw(im)
    for y in range(0, h, s):
        for x in range(0, w, s):
            if ((x // s) + (y // s)) % 2:
                d.rectangle([x, y, x + s - 1, y + s - 1], fill=c2)
    return im


def title_bar(w, text, sub=None, h=64):
    bar = Image.new('RGBA', (w, h), BAR)
    d = ImageDraw.Draw(bar)
    d.text((24, h // 2), text, font=font(30, True), fill=TXT, anchor='lm')
    if sub:
        d.text((w - 24, h // 2), sub, font=font(18), fill=SUB, anchor='rm')
    d.line([0, h - 2, w, h - 2], fill=(150, 120, 60, 255), width=2)
    return bar
