"""Shared helpers for the 02-fuego-firmas approval package (read-only on the art)."""
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFont

SCR = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/'
STAGE = SCR + 'art2/staging/vfx_fire/'
OUT = SCR + 'approve/'
WORK = SCR + 'approve/_work/02-fuego-firmas/'
GROUND = '/home/user/Ninja-Fantasy-Game/src/assets/maps/river_forest/ground.webp'
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
FONTB = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'

BG = (20, 24, 28, 255)        # #14181c
PANEL = (28, 33, 39, 255)
BAR = (33, 39, 46, 255)
LINE = (58, 66, 76, 255)
WHITE = (240, 240, 236, 255)
GREY = (170, 176, 184, 255)
ACCENT = (255, 196, 92, 255)
ACCENT2 = (255, 140, 70, 255)

MAN = json.load(open(STAGE + 'manifest.json'))['sprites']
_sheets = {}


def sheet(name):
    if name not in _sheets:
        _sheets[name] = Image.open(STAGE + MAN[name]['file']).convert('RGBA')
    return _sheets[name]


def spec(name):
    return MAN[name]


def frame(name, anim, f):
    s = MAN[name]
    a = s['anims'][anim]
    assert 0 <= f < a['frames'], (name, anim, f)
    fw, fh = s['frameW'], s['frameH']
    return sheet(name).crop((f * fw, a['row'] * fh, (f + 1) * fw, (a['row'] + 1) * fh))


def anchor(name):
    return tuple(MAN[name]['anchor'])


def fps(name, anim):
    return MAN[name]['anims'][anim]['fps']


def nframes(name, anim):
    return MAN[name]['anims'][anim]['frames']


def character():
    """The scale character cropped (1x) from the artist's compare image; faces left.
    Returns (rgba, (feet_x, feet_y))."""
    im = Image.open(WORK + 'char_raw.png').convert('RGBA')
    bb = im.getbbox()
    im = im.crop(bb)
    # feet: horizontal centre of the bottom rows, sole on the last opaque row
    return im, (im.width // 2, im.height - 1)


def up(im, k):
    return im if k == 1 else im.resize((im.width * k, im.height * k), Image.NEAREST)


def font(size, bold=False):
    return ImageFont.truetype(FONTB if bold else FONT, size)


def paste_at(canvas, sprite, x, y):
    """alpha-composite sprite with its top-left at (x, y) (ints, may be negative)."""
    x, y = int(x), int(y)
    # clip
    sx0, sy0 = max(0, -x), max(0, -y)
    sx1 = min(sprite.width, canvas.width - x)
    sy1 = min(sprite.height, canvas.height - y)
    if sx1 <= sx0 or sy1 <= sy0:
        return
    canvas.alpha_composite(sprite.crop((sx0, sy0, sx1, sy1)), (x + sx0, y + sy0))


def place(canvas, sprite, anc, x, y, k=1):
    """Composite `sprite` (1x) upscaled by k so that its anchor lands on canvas (x, y)."""
    s = up(sprite, k)
    paste_at(canvas, s, x - anc[0] * k, y - anc[1] * k)


def text(d, xy, s, size, fill=WHITE, bold=False, anchor='la'):
    d.text(xy, s, font=font(size, bold), fill=fill, anchor=anchor)


def text_w(s, size, bold=False):
    f = font(size, bold)
    l, t, r, b = f.getbbox(s)
    return r - l


def bracket(d, x0, x1, y, label, k=1, size=16, color=GREY):
    """A horizontal measuring bracket from x0 to x1 at y with a centred label below."""
    h = 5 * max(1, k // 1)
    d.line([(x0, y), (x1, y)], fill=color, width=max(1, k))
    d.line([(x0, y - h), (x0, y + h)], fill=color, width=max(1, k))
    d.line([(x1, y - h), (x1, y + h)], fill=color, width=max(1, k))
    text(d, ((x0 + x1) // 2, y + h + 3), label, size, color, anchor='ma')


def title_bar(canvas, title, subtitle=None, h=None, size=28, subsize=17):
    d = ImageDraw.Draw(canvas)
    if h is None:
        h = 18 + size + (subsize + 14 if subtitle else 0) + 14
    d.rectangle([0, 0, canvas.width, h], fill=BAR)
    d.line([(0, h), (canvas.width, h)], fill=LINE, width=2)
    text(d, (24, 16), title, size, WHITE, bold=True)
    if subtitle:
        text(d, (24, 16 + size + 10), subtitle, subsize, GREY)
    return h


def ground_crop(x0, y0, w, h):
    g = Image.open(GROUND).convert('RGBA')
    return g.crop((x0, y0, x0 + w, y0 + h))
