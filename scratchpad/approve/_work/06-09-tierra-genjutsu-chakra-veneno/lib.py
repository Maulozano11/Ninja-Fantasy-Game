"""Helpers for the 06-09 (tierra / genjutsu / chakra / veneno) approval package.
Read-only on the art: every sprite is read from the snapshot in ./snap (a byte copy of
art2/staging/vfx_<el>/ taken at the start, md5 list in md5_snap.txt)."""
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFont

SCR = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/'
OUT = SCR + 'approve/'
WORK = SCR + 'approve/_work/06-09-tierra-genjutsu-chakra-veneno/'
SNAP = WORK + 'snap/'
GROUND = '/home/user/Ninja-Fantasy-Game/src/assets/maps/river_forest/ground.webp'
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
FONTB = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
PXM = 57

BG = (20, 24, 28, 255)          # #14181c
BOX = (29, 34, 40, 255)         # sprite frame area on the sheet
BOXLINE = (44, 51, 59, 255)
BAR = (33, 39, 46, 255)
LINE = (58, 66, 76, 255)
WHITE = (240, 240, 236, 255)
GREY = (170, 176, 184, 255)
DIM = (124, 132, 142, 255)

ELEMS = {
    'earth': dict(num='06', es='Tierra', file='06-tierra', accent=(232, 190, 118, 255)),
    'genjutsu': dict(num='07', es='Genjutsu', file='07-genjutsu', accent=(240, 150, 232, 255)),
    'chakra': dict(num='08', es='Chakra', file='08-chakra', accent=(120, 200, 255, 255)),
    'poison': dict(num='09', es='Veneno', file='09-veneno', accent=(184, 232, 84, 255)),
}
ROLE_ES = {
    'bolt': 'Proyectil', 'sphere': 'Esfera', 'slash': 'Corte', 'multi': 'Múltiple',
    'hit': 'Impacto', 'breath': 'Aliento', 'stream': 'Chorro', 'blast': 'Explosión',
    'wall': 'Muro', 'aura': 'Aura',
}
DESC = {
    'earth': dict(bolt='roca que gira', sphere='peñasco que rueda', slash='media luna de piedra',
                  multi='tres balas de roca', hit='estallido de escombros', breath='ráfaga de grava',
                  stream='fila de pinchos de roca', blast='suelo partido y corona de pinchos',
                  wall='muro de piedras con musgo', aura='remolino de arena y piedras'),
    'genjutsu': dict(bolt='cometa magatama', sphere='orbe con ojo (tomoe)', slash='media luna de espejos',
                     multi='tres dardos de pluma', hit='cuervo que estalla en plumas', breath='ondas hipnóticas',
                     stream='cintas que se enroscan', blast='Templo del Nirvana (espiral y pilar)',
                     wall='velo de espejos', aura='lenguas de humo y plumas'),
    'chakra': dict(bolt='shuriken de energía', sphere='esfera espiral', slash='media luna con sellos',
                   multi='tres discos de sello', hit='estallido de hexagrama', breath='onda de palma',
                   stream='rayo con cadena de sello', blast='círculo de sellado y pilar',
                   wall='barrera de panal con sellos', aura='llamas de chakra y anillo'),
    'poison': dict(bolt='bola de ácido que gotea', sphere='burbuja de ácido', slash='mordida de colmillos',
                   multi='tres gotas de veneno', hit='salpicadura de ácido', breath='nube tóxica',
                   stream='chorro de ácido', blast='géiser de veneno de hidra',
                   wall='cortina de niebla tóxica', aura='vapores tóxicos'),
}
ROLES = ['bolt', 'sphere', 'slash', 'multi', 'hit', 'breath', 'stream', 'blast', 'wall', 'aura']

_man = {}
_sheets = {}


def man(el):
    if el not in _man:
        _man[el] = json.load(open(SNAP + 'vfx_' + el + '/manifest.json'))['sprites']
    return _man[el]


def spec(el, name):
    return man(el)[name]


def sheet(el, name):
    k = (el, name)
    if k not in _sheets:
        _sheets[k] = Image.open(SNAP + 'vfx_' + el + '/' + man(el)[name]['file']).convert('RGBA')
    return _sheets[k]


def anim(el, name, an=None):
    s = spec(el, name)
    if an is None:
        an = next(iter(s['anims']))
    return an, s['anims'][an]


def frame(el, name, an, f):
    s = spec(el, name)
    a = s['anims'][an]
    assert 0 <= f < a['frames'], (el, name, an, f)
    fw, fh = s['frameW'], s['frameH']
    return sheet(el, name).crop((f * fw, a['row'] * fh, (f + 1) * fw, (a['row'] + 1) * fh))


def union_bbox(el, name, an=None):
    an, a = anim(el, name, an)
    bb = None
    for f in range(a['frames']):
        b = frame(el, name, an, f).getbbox()
        if b is None:
            continue
        bb = b if bb is None else (min(bb[0], b[0]), min(bb[1], b[1]), max(bb[2], b[2]), max(bb[3], b[3]))
    return bb


def peak_frame(el, name, an=None):
    an, a = anim(el, name, an)
    cnt = [int((np.asarray(frame(el, name, an, f))[..., 3] > 0).sum()) for f in range(a['frames'])]
    return int(np.argmax(cnt))


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
    """alpha-composite sprite with its top-left at (x, y) (ints, may be negative / clipped)."""
    x, y = int(x), int(y)
    sx0, sy0 = max(0, -x), max(0, -y)
    sx1 = min(sprite.width, canvas.width - x)
    sy1 = min(sprite.height, canvas.height - y)
    if sx1 <= sx0 or sy1 <= sy0:
        return
    canvas.alpha_composite(sprite.crop((sx0, sy0, sx1, sy1)), (x + sx0, y + sy0))


def character():
    """The scale character (1x, 56x96), cut from the artist's own review sheets (vfx-*.png, wall
    panel): only the pixels identical in all four sheets, so no wall pixels come along.
    Returns (rgba, feet) with feet = (x, y) of the sole's centre (last opaque row)."""
    im = Image.open(WORK + 'char_1x.png').convert('RGBA')
    a = np.asarray(im)[..., 3] > 0
    ys, xs = np.nonzero(a)
    yb = ys.max()
    xb = xs[ys >= yb - 3]
    return im, (int(round((xb.min() + xb.max()) / 2)), int(yb))


def ground():
    return Image.open(GROUND).convert('RGBA')


def meters(px):
    """metres with a Spanish decimal comma, 1 decimal"""
    return ('%.1f' % (px / PXM)).replace('.', ',')
