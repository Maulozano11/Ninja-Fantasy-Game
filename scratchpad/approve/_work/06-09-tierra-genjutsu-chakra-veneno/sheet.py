"""NN-<elem>.png: every role except the beast, key frame at 2x on the dark background, Spanish
labels and sizes in metres."""
import sys
sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/approve/_work/06-09-tierra-genjutsu-chakra-veneno')
from lib import *

K = 2
MARGIN = 32
GAP = 34
LAB_H = 46      # role + description above the box
SIZE_H = 30     # size line under the box
CHAR, CF = character()


def size_wh(el, role, an=None):
    bb = union_bbox(el, role, an)
    return bb[2] - bb[0], bb[3] - bb[1]


def size_line(el, role):
    if role == 'stream':
        return 'tramo de 1,1 m que se repite + cabeza'
    if role == 'wall':
        w, h = size_wh(el, 'wall', 'idle')
        return f'≈ {meters(w)} × {meters(h)} m'
    w, h = size_wh(el, role)
    s = f'≈ {meters(w)} × {meters(h)} m'
    if role == 'breath':
        s += ' por soplo'
    return s


KEY_OVERRIDE = {('poison', 'blast'): 4}   # geyser and cloud both visible


def key_frame(el, role):
    if role in ('hit', 'blast'):
        an, a = anim(el, role)
        f = KEY_OVERRIDE.get((el, role), peak_frame(el, role))
        return an, f, f'fot. {f + 1} de {a["frames"]}'
    if role == 'wall':
        return 'idle', 0, ''
    an, a = anim(el, role)
    return an, 0, ''


class Panel:
    """A labelled box. draw(canvas, x, y) with (x, y) = top-left of the label block."""

    def __init__(self, title, desc, box_w, box_h, size, extra_w=0, note=''):
        self.title, self.desc, self.size, self.note = title, desc, size, note
        self.box_w, self.box_h, self.extra_w = box_w, box_h, extra_w
        self.w = max(box_w + extra_w, text_w(title, 18, True), text_w(desc, 15), text_w(size + '   ' + note, 14))
        self.h = LAB_H + box_h + SIZE_H
        self.paint = []   # callables(canvas, bx, by) -> composite into the box

    def draw(self, im, x, y):
        d = ImageDraw.Draw(im)
        text(d, (x, y), self.title, 18, WHITE, True)
        text(d, (x, y + 23), self.desc, 15, GREY)
        bx, by = x, y + LAB_H
        d.rectangle([bx, by, bx + self.box_w - 1, by + self.box_h - 1], fill=BOX, outline=BOXLINE)
        for p in self.paint:
            p(im, bx, by)
        text(d, (x, by + self.box_h + 7), self.size, 14, GREY)
        if self.note:
            text(d, (x + text_w(self.size, 14) + 14, by + self.box_h + 7), self.note, 14, DIM)


def sprite_panel(el, role):
    s = spec(el, role)
    an, f, note = key_frame(el, role)
    p = Panel(ROLE_ES[role], DESC[el][role], s['frameW'] * K, s['frameH'] * K, size_line(el, role), note=note)
    img = up(frame(el, role, an, f), K)
    p.paint.append(lambda im, bx, by: paste_at(im, img, bx, by))
    return p


def stream_panel(el):
    st = frame(el, 'stream', 'fly', 0)
    hd = frame(el, 'stream_head', 'fly', 0)
    ha = spec(el, 'stream_head')['anchor']
    line = Image.new('RGBA', (64 * 3 + 64 - ha[0], 64), (0, 0, 0, 0))
    for i in range(3):
        line.alpha_composite(st, (64 * i, 0))
    # as in the game: the head's anchor sits on the end of the line
    line.alpha_composite(hd, (192 - ha[0], 0))
    p = Panel(ROLE_ES['stream'] + ' (3 tramos + cabeza)', DESC[el]['stream'], line.width * K, line.height * K,
              size_line(el, 'stream'))
    img = up(line, K)
    p.paint.append(lambda im, bx, by: paste_at(im, img, bx, by))
    return p


def aura_panel(el, mode):
    s = spec(el, 'aura')
    ax, ay = s['anchor']
    fr = frame(el, 'aura', 'idle', 0)
    c = Image.new('RGBA', fr.size, (0, 0, 0, 0))
    if mode == 'sola':
        c.alpha_composite(fr)
        title, desc = ROLE_ES['aura'], DESC[el]['aura']
        size = size_line(el, 'aura')
    else:
        ch = Image.new('RGBA', fr.size, (0, 0, 0, 0))
        paste_at(ch, CHAR, ax - CF[0], ay - CF[1])
        if mode == 'delante':
            c.alpha_composite(ch)
            c.alpha_composite(fr)
            title, desc = 'Aura delante', 'así la pinta hoy el juego'
        else:
            c.alpha_composite(fr)
            c.alpha_composite(ch)
            title, desc = 'Aura detrás', 'del personaje'
        size = 'personaje: 1,7 m'
    p = Panel(title, desc, s['frameW'] * K, s['frameH'] * K, size)
    img = up(c, K)
    p.paint.append(lambda im, bx, by: paste_at(im, img, bx, by))
    return p


def wall_panel(el):
    s = spec(el, 'wall')
    ax, ay = s['anchor']
    fr = up(frame(el, 'wall', 'idle', 0), K)
    ch = up(CHAR, K)
    cx_gap = 16
    p = Panel(ROLE_ES['wall'] + ' + personaje para escala', DESC[el]['wall'], s['frameW'] * K, s['frameH'] * K,
              size_line(el, 'wall'), extra_w=cx_gap + ch.width)

    def paint(im, bx, by):
        paste_at(im, fr, bx, by)
        # character standing on the wall's ground line, just right of the frame
        paste_at(im, ch, bx + s['frameW'] * K + cx_gap, by + (ay - CF[1]) * K)
    p.paint.append(paint)
    return p


def make(el):
    E = ELEMS[el]
    rows = [
        [sprite_panel(el, r) for r in ['bolt', 'sphere', 'slash', 'multi', 'hit', 'breath']],
        [stream_panel(el), aura_panel(el, 'sola'), aura_panel(el, 'delante'), aura_panel(el, 'detras')],
        [sprite_panel(el, 'blast'), wall_panel(el)],
    ]
    title = f"{E['num']} · {E['es']} — efectos de jutsu"
    sub1 = 'Fotograma clave de cada efecto · zoom 2x (el doble del tamaño real en el juego) · 1 m = 57 px'
    sub2 = ('El recuadro gris es el tamaño del fotograma. La bestia invocada no está aquí: '
            'la está rehaciendo otro artista.')
    W = max(sum(p.w for p in r) + GAP * (len(r) - 1) for r in rows) + 2 * MARGIN
    W = max(W, text_w(sub1, 16) + 2 * MARGIN, text_w(sub2, 16) + 2 * MARGIN)
    TB = 112
    H = TB + MARGIN + sum(max(p.h for p in r) for r in rows) + GAP * (len(rows) - 1) + MARGIN
    im = Image.new('RGBA', (W, H), BG)
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, W, TB], fill=BAR)
    d.line([(0, TB), (W, TB)], fill=LINE, width=2)
    text(d, (MARGIN, 16), title, 30, E['accent'], True)
    text(d, (MARGIN, 58), sub1, 16, WHITE)
    text(d, (MARGIN, 82), sub2, 16, GREY)
    y = TB + MARGIN
    for r in rows:
        x = MARGIN
        for p in r:
            p.draw(im, x, y)
            x += p.w + GAP
        y += max(p.h for p in r) + GAP
    path = OUT + E['file'] + '.png'
    im.convert('RGB').save(path, optimize=True)
    print(path, im.size)
    return path


if __name__ == '__main__':
    for el in (sys.argv[1:] or list(ELEMS)):
        make(el)
