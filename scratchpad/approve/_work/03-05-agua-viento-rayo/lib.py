"""Helpers for the 03-05 (agua / viento / rayo) approval package. Read-only on the art."""
import json
from PIL import Image, ImageDraw, ImageFont

SCR = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/'
OUT = SCR + 'approve/'
WORK = SCR + 'approve/_work/03-05-agua-viento-rayo/'
STAGE = WORK + 'snap/'

GROUND = '/home/user/Ninja-Fantasy-Game/src/assets/maps/river_forest/ground.webp'
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
FONTB = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
PXM = 57

BG = (20, 24, 28, 255)
PANEL = (27, 32, 38, 255)
BAR = (33, 39, 46, 255)
LINE = (58, 66, 76, 255)
WHITE = (240, 240, 236, 255)
GREY = (170, 176, 184, 255)
DIM = (120, 128, 138, 255)

_man = {}
_sheets = {}


def man(el):
    if el not in _man:
        _man[el] = json.load(open(STAGE + 'vfx_' + el + '/manifest.json'))['sprites']
    return _man[el]


def sheet(el, name):
    k = (el, name)
    if k not in _sheets:
        _sheets[k] = Image.open(STAGE + 'vfx_' + el + '/' + man(el)[name]['file']).convert('RGBA')
    return _sheets[k]


def spec(el, name):
    return man(el)[name]


def frame(el, name, anim, f):
    s = spec(el, name)
    a = s['anims'][anim]
    assert 0 <= f < a['frames'], (el, name, anim, f)
    fw, fh = s['frameW'], s['frameH']
    return sheet(el, name).crop((f * fw, a['row'] * fh, (f + 1) * fw, (a['row'] + 1) * fh))


def up(im, k):
    return im if k == 1 else im.resize((im.width * k, im.height * k), Image.NEAREST)


_fonts = {}


def font(size, bold=False):
    k = (size, bold)
    if k not in _fonts:
        _fonts[k] = ImageFont.truetype(FONTB if bold else FONT, size)
    return _fonts[k]


def text(d, xy, s, size, fill=WHITE, bold=False, anchor='la'):
    d.text(xy, s, font=font(size, bold), fill=fill, anchor=anchor)


def text_w(s, size, bold=False):
    l, t, r, b = font(size, bold).getbbox(s)
    return r - l


def paste_at(canvas, sprite, x, y):
    x, y = int(x), int(y)
    sx0, sy0 = max(0, -x), max(0, -y)
    sx1 = min(sprite.width, canvas.width - x)
    sy1 = min(sprite.height, canvas.height - y)
    if sx1 <= sx0 or sy1 <= sy0:
        return
    canvas.alpha_composite(sprite.crop((sx0, sy0, sx1, sy1)), (x + sx0, y + sy0))


def ground():
    return Image.open(GROUND).convert('RGBA')


def m(px):
    """metres string, Spanish decimal comma"""
    v = px / PXM
    s = ('%.1f' % v).replace('.', ',')
    if s.endswith(',0'):
        s = s[:-2]
    return s
