import sys
sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/approve/_work/03-05-agua-viento-rayo')
from lib import *
from info import *
from PIL import ImageChops

K = 2
CHAR = Image.open(WORK + 'char_1x.png').convert('RGBA')   # faces left, 56x96
CHAR_FEET = (26, 95)


def anim_text(s):
    a = s['anims']
    if 'rise' in a:
        return f"sube una vez ({a['rise']['frames']} fot.) y luego bucle ({a['idle']['frames']} fot.)"
    (name, v), = a.items()
    if v['loop']:
        return f"bucle · {v['frames']} fotogramas · {v['fps']} fps"
    return f"un solo pase · {v['frames']} fotogramas · {v['fps']} fps"


def bbox_m(img):
    bb = img.getbbox()
    w, h = bb[2] - bb[0], bb[3] - bb[1]
    return w, h


def key(el, role):
    s = spec(el, role)
    if role in KEY[el]:
        an, f = KEY[el][role]
    elif role == 'wall':
        an, f = 'idle', 0
    else:
        an, f = next(iter(s['anims'])), 0
    return an, f


def size_text(el, role, img):
    if role == 'stream':
        return 'tramo de 1,1 m que se repite + cabeza'
    if role == 'blast':
        return 'círculo de 3 m en el suelo'
    if role == 'wall':
        w, h = bbox_m(img)
        return f'barrera de 4,5 m · ≈ {m(h)} m de alto'
    w, h = bbox_m(img)
    if role == 'breath':
        return f'alcance ≈ {m(w)} m · {m(h)} m de ancho'
    return f'≈ {m(w)} × {m(h)} m'


def make(el):
    E = ELEMS[el]
    acc = E['accent']
    W = 2200
    im = Image.new('RGBA', (W, 2000), BG)
    d = ImageDraw.Draw(im)
    # ---- title bar
    th = 128
    d.rectangle([0, 0, W, th], fill=BAR)
    d.line([(0, th), (W, th)], fill=LINE, width=2)
    TITLE = f"{E['num']} · {E['es']} — efectos de jutsu ({E.get('state', 'repaso de pulido')})"
    text(d, (28, 18), TITLE, 30, WHITE, True)
    text(d, (28, 62), 'Fotograma clave de cada efecto · zoom 2x (cada píxel del juego = 2×2) · medidas en metros '
         '(1 m = 57 px) · personaje de escala ≈ 1,7 m', 16, GREY)
    text(d, (28, 88), 'Sin bestias invocadas: las está rehaciendo otro artista y se enseñarán aparte.', 16, GREY)

    def cell(x, y, role, extra_right=0, draw_extra=None):
        """label block + panel at (x, y). returns (width, height)"""
        s = spec(el, role)
        an, f = key(el, role)
        fr = frame(el, role, an, f)
        if role == 'stream':
            fr = Image.new('RGBA', (256, 64), (0, 0, 0, 0))
            for i in range(3):
                fr.alpha_composite(frame(el, 'stream', 'fly', 0), (64 * i, 0))
            fr.alpha_composite(frame(el, 'stream_head', 'fly', 0), (192, 0))
        l1 = ROLE_ES[role]
        l2 = DESC[el][role]
        l3 = size_text(el, role, fr)
        l4 = anim_text(s)
        if role in KEY[el]:
            n = s['anims'][an]['frames']
            l3 += f' · se ve el fotograma {f + 1} de {n}'
        text(d, (x, y), l1, 19, acc, True)
        text(d, (x + text_w(l1, 19, True) + 8, y + 3), l2, 15, WHITE)
        text(d, (x, y + 28), l3, 13, GREY)
        text(d, (x, y + 46), l4, 13, DIM)
        py = y + 70
        pw, ph = fr.width * K, fr.height * K
        d.rectangle([x - 1, py - 1, x + pw, py + ph], outline=LINE)
        panel = Image.new('RGBA', fr.size, PANEL)
        if role == 'aura':
            ax, ay = s['anchor']
            panel.alpha_composite(CHAR, (ax - CHAR_FEET[0], ay - CHAR_FEET[1]))
        panel.alpha_composite(fr)
        im.paste(up(panel, K), (x, py))
        if role == 'stream':
            for i in range(1, 4):
                xx = x + i * 64 * K
                for yy in range(py + 4, py + ph - 4, 8):
                    d.line([(xx, yy), (xx, yy + 3)], fill=(70, 78, 90, 255))
        if draw_extra:
            draw_extra(x, py, s, fr)
        lw = max(text_w(l1, 19, True) + 8 + text_w(l2, 15), text_w(l3, 13), text_w(l4, 13))
        return max(pw + extra_right, lw), 70 + ph

    def char_beside(dx):
        def f(x, py, s, fr):
            ax, ay = s['anchor']
            cx = x + fr.width * K + dx
            cy = py + ay * K
            c2 = up(CHAR, K)
            paste_at(im, c2, cx, cy - CHAR_FEET[1] * K - (K - 1))
        return f

    def bracket(x0, x1, yb, label):
        d.line([(x0, yb), (x1, yb)], fill=GREY, width=2)
        d.line([(x0, yb - 6), (x0, yb + 6)], fill=GREY, width=2)
        d.line([(x1, yb - 6), (x1, yb + 6)], fill=GREY, width=2)
        text(d, ((x0 + x1) // 2, yb + 8), label, 14, GREY, anchor='ma')

    GAP = 44
    y = th + 30
    # ---- row 1: small projectiles
    x = 28
    rowh = 0
    for role in ['bolt', 'sphere', 'slash', 'multi', 'hit']:
        w, h = cell(x, y, role)
        x += w + GAP
        rowh = max(rowh, h)
    y += rowh + 40
    # ---- row 2: breath + stream + aura
    x = 28
    w0, h0 = cell(x, y, 'breath')
    x += w0 + GAP
    w, h = cell(x, y, 'stream')
    x += w + GAP
    w2, h2 = cell(x, y, 'aura')
    y += max(h0, h, h2) + 40

    # ---- row 3: blast + wall with a character beside each
    x = 28

    def blast_extra(x, py, s, fr):
        char_beside(10)(x, py, s, fr)
        ax, ay = s['anchor']
        bracket(x + (ax - 82) * K, x + (ax + 82) * K, py + fr.height * K + 14, '3 m')

    def wall_extra(x, py, s, fr):
        char_beside(10)(x, py, s, fr)
        ax, ay = s['anchor']
        half = round(4.5 * PXM / 2)
        bracket(x + (ax - half) * K, x + (ax + half) * K, py + fr.height * K + 14, '4,5 m')

    w, h = cell(x, y, 'blast', extra_right=10 + CHAR.width * K, draw_extra=blast_extra)
    x += w + GAP + 20
    w2, h2 = cell(x, y, 'wall', extra_right=10 + CHAR.width * K, draw_extra=wall_extra)
    right = x + w2
    y += max(h, h2) + 46
    body = Image.new('RGBA', (W, y - th - 2), BG)
    diff = ImageChops.difference(im.crop((0, th + 2, W, y)).convert('RGB'), body.convert('RGB')).getbbox()
    sub_w = 28 + max(text_w('Fotograma clave de cada efecto · zoom 2x (cada píxel del juego = 2×2) · medidas en metros '
                            '(1 m = 57 px) · personaje de escala ≈ 1,7 m', 16), text_w(TITLE, 30, True))
    W2 = max(diff[2], sub_w) + 28
    # ---- footer
    d.line([(28, y), (W2 - 28, y)], fill=LINE, width=1)
    y += 14
    text(d, (28, y), 'El recuadro gris es el borde del sprite: lo que toca el borde se ve cortado en el juego.', 15, GREY)
    for extra in E.get('footer', []):
        y += 24
        text(d, (28, y), extra, 15, (255, 200, 120, 255))
    y += 24
    text(d, (28, y), f"La animación de todos los efectos, sobre la hierba del mapa del río: {E['file']}.gif", 15, GREY)
    y += 34
    out = im.crop((0, 0, W2, y))
    out.convert('RGB').save(OUT + E['file'] + '.png', optimize=True)
    print(E['file'], out.size, 'right edge', right)


if __name__ == '__main__':
    for el in (sys.argv[1:] or ['water', 'wind', 'lightning']):
        make(el)
