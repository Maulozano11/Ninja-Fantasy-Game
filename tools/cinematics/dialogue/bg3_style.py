"""Barrabás's welcome the way Baldur's Gate 3 lays out a conversation (the owner, 2026-10-31: "como
está hecho en Baldur's Gate"): no buttons; the camera on the one who talks (his portrait big in the
scene, cinema bands, the speaker over the shoulder), his line as a subtitle, the answers as a
numbered list in one dark panel, each with its tag in its colour ([ORGULLO], [LA LISTA], a check
with its %), the hovered one lit; after answering, companions approve or disapprove in the corner."""
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageEnhance, ImageFilter
S, OUT = sys.argv[1], sys.argv[2]
W, H = 1920, 1080
SERIF = '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf'
SERIFB = '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf'
SANSB = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
F = lambda p, s: ImageFont.truetype(p, s)
BG = Image.open(f'{S}/hydra/col14/empty.png').convert('RGBA').resize((W, H), Image.LANCZOS)
COL = {'red': (236, 92, 78), 'blue': (110, 170, 255), 'gold': (240, 196, 90), 'amethyst': (186, 128, 240), 'check': (120, 214, 170), 'grey': (170, 160, 150)}


def portrait(path, h, flip=False, bright=1.0, blur=0):
    im = Image.open(path).convert('RGBA')
    im = im.resize((int(im.width * h / im.height), h), Image.LANCZOS)
    if flip:
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    if bright != 1.0:
        a = im.split()[3]
        im = ImageEnhance.Brightness(im.convert('RGB')).enhance(bright).convert('RGBA')
        im.putalpha(a)
    if blur:
        im = im.filter(ImageFilter.GaussianBlur(blur))
    return im


def stage(bar_face, bar_flip=False):
    img = BG.copy().filter(ImageFilter.GaussianBlur(3))  # the courtyard out of focus behind them
    img = Image.alpha_composite(img, Image.new('RGBA', img.size, (0, 0, 0, 90)))
    B = portrait(f'{S}/barrabas/{bar_face}.png', 820, bar_flip)
    img.alpha_composite(B, (1080, 1000 - B.height))
    A = portrait(f'{S}/aidenp/aiden_1_neutral.png', 1000, False, 0.38, 2)  # over his shoulder
    img.alpha_composite(A, (-40, 1140 - A.height))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W, 70], fill=(0, 0, 0, 255))
    d.rectangle([0, H - 70, W, H], fill=(0, 0, 0, 255))
    return img


def wrap(d, text, font, width):
    out, cur = [], ''
    for w in text.split():
        t = (cur + ' ' + w).strip()
        if d.textlength(t, font=font) > width and cur:
            out.append(cur)
            cur = w
        else:
            cur = t
    return out + [cur]


def subtitle(img, name, line, y=None):
    d = ImageDraw.Draw(img)
    f = F(SERIF, 30)
    lines = wrap(d, line, f, 1150)
    y = y if y is not None else 600
    d.text((W / 2, y - 44), name, font=F(SERIFB, 24), fill=(214, 190, 140), anchor='mm', stroke_width=3, stroke_fill=(0, 0, 0))
    for k, ln in enumerate(lines):
        d.text((W / 2, y + k * 42), ln, font=f, fill=(245, 240, 228), anchor='mm', stroke_width=3, stroke_fill=(0, 0, 0))


OPTS = [
    ([('ORGULLO', 'red')], '¿Tú solo contra nosotros cinco? Esto va a ser rápido.', None),
    ([('MIRAI', 'blue'), ('LA LISTA', 'blue')], 'Portón abierto, ni un guardia, y tú esperándonos... Es una trampa. ¡Todos atentos!', None),
    ([('LEALTAD', 'gold')], '¿Un Kōton haciéndole de perro a los Northstar? Tu clan debe estar orgulloso.', None),
    ([('INTIMIDACIÓN', 'check')], 'Ríndete ahora y a lo mejor sales de aquí caminando.', '62 %'),
    ([('MISIÓN PRIMERO', 'amethyst')], '*Le lanzas un kunai antes de que termine de hablar.*', None),
]


def panel(img, hover, line):
    lay = Image.new('RGBA', img.size)
    d = ImageDraw.Draw(lay)
    x0, x1 = 380, W - 380
    f = F(SERIF, 25)
    rows = []
    for tags, text, pct in OPTS:
        rows.append(wrap(d, text, f, x1 - x0 - 260))
    hgt = 74 + sum(len(r) * 34 + 14 for r in rows)
    y0 = H - 82 - hgt
    # a dark panel with a thin gold rule, fading at the sides
    pan = Image.new('RGBA', (x1 - x0 + 160, hgt), (0, 0, 0, 0))
    pd = ImageDraw.Draw(pan)
    for x in range(pan.width):
        e = min(1, x / 80, (pan.width - x) / 80)
        pd.line([(x, 0), (x, hgt)], fill=(10, 8, 12, int(215 * e)))
    lay.alpha_composite(pan, (x0 - 80, y0))
    d.line([(x0, y0 + 4), (x1, y0 + 4)], fill=(150, 120, 70, 255), width=2)
    d.polygon([(W / 2, y0 - 4), (W / 2 + 8, y0 + 4), (W / 2, y0 + 12), (W / 2 - 8, y0 + 4)], fill=(200, 160, 90, 255))
    img.alpha_composite(lay)
    d = ImageDraw.Draw(img)
    # his line stays at the top of the panel, smaller (what you are answering)
    d.text((x0, y0 + 22), line, font=F(SERIF, 21), fill=(190, 182, 168))
    y = y0 + 66
    for i, ((tags, text, pct), lines) in enumerate(zip(OPTS, rows)):
        on = i == hover
        base = (250, 238, 205) if on else (196, 186, 170)
        if on:
            d.rectangle([x0 - 20, y - 6, x1 + 20, y + len(lines) * 34 + 2], fill=(60, 44, 24))
            d.polygon([(x0 - 34, y + 12), (x0 - 24, y + 4), (x0 - 24, y + 20)], fill=(230, 190, 110))
        d.text((x0, y), f'{i + 1}.', font=F(SERIFB, 25), fill=(214, 176, 100) if on else (150, 130, 100))
        tx = x0 + 44
        for tg, c in tags:
            t = f'[{tg}]'
            d.text((tx, y + 2), t, font=F(SANSB, 21), fill=COL[c] if on else tuple(int(v * 0.8) for v in COL[c]))
            tx += d.textlength(t, font=F(SANSB, 21)) + 10
        ital = text.startswith('*')
        body = text.strip('*')
        fnt = F('/usr/share/fonts/truetype/dejavu/DejaVuSerif-Italic.ttf', 25) if ital else f
        first = wrap(d, body, fnt, x1 - tx - (90 if pct else 10))
        rest_w = x1 - x0 - 44 - (90 if pct else 10)
        d.text((tx, y), first[0], font=fnt, fill=base)
        rest = ' '.join(first[1:])
        yy = y
        if rest:
            for ln in wrap(d, rest, fnt, rest_w):
                yy += 34
                d.text((x0 + 44, yy), ln, font=fnt, fill=base)
        if pct:
            d.text((x1, y + 2), pct, font=F(SANSB, 22), fill=(120, 214, 170) if on else (96, 170, 136), anchor='ra')
        y = yy + 48
    return y0


def corner(img, notes):
    d = ImageDraw.Draw(img)
    y = 100
    for who, txt, c in notes:
        d.text((40, y), f'{who} {txt}', font=F(SERIFB, 24), fill=c, stroke_width=3, stroke_fill=(0, 0, 0))
        y += 36


def focus(img, n, plus):
    d = ImageDraw.Draw(img)
    x0, y0 = 40, H - 54
    d.text((x0, y0 - 2), 'AIDEN · Enfoque', font=F(SANSB, 18), fill=(214, 190, 140))
    for i in range(5):
        cx, cy = x0 + 200 + i * 30, y0 + 9
        pts = [(cx, cy - 10), (cx + 9, cy), (cx, cy + 10), (cx - 9, cy)]
        fill = (255, 205, 90) if i < n else ((255, 240, 200) if i < n + plus else (40, 34, 40))
        d.polygon(pts, fill=fill, outline=(150, 120, 80))


LINE = '¡Ja! Sabía que vendrían. Solo alguien tan orgulloso como tú entraría por la puerta grande... Insolente.'
# 1. he talks: the subtitle, no answers yet
a = stage('p2_2')
subtitle(a, 'BARRABÁS', LINE, 870)
a.convert('RGB').save(f'{OUT}/bg3_1_habla.png')
# 2. the answers, the first hovered (true to Aiden: a Focus diamond waits)
b = stage('p2_2')
panel(b, 0, 'Barrabás: «' + LINE + '»')
focus(b, 2, 1)
b.convert('RGB').save(f'{OUT}/bg3_2_respuestas.png')
# 3. a check hovered: its % before rolling
c = stage('p2_2')
panel(c, 3, 'Barrabás: «' + LINE + '»')
focus(c, 2, 0)
c.convert('RGB').save(f'{OUT}/bg3_3_tirada.png')
# 4. answered with pride: he laughs, the companions react in the corner
e = stage('p2_3_flip')
subtitle(e, 'BARRABÁS', '¿Solo? ¿Y quién te dijo que estoy solo?', 870)
corner(e, [('Romano', 'aprueba', (150, 220, 140)), ('Lyra', 'desaprueba', (230, 120, 110)), ('Aiden', '+1 Enfoque (orgullo)', (255, 214, 120))])
focus(e, 3, 0)
e.convert('RGB').save(f'{OUT}/bg3_4_reaccion.png')
print('ok')
