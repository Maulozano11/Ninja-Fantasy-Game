# One overview of the 12 abilities: number, name and one key frame of Ahora / A / B side by side,
# big Spanish labels so it reads on a phone. Split into two images of 6 rows.
#   python3 -I overview.py
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import mockups
import vfxlib
from vfxlib import *

SHORT = {
    1: ('6 alientos en fila, sin dragón', 'Tu cabeza dispara 5 bolas', 'Tres cabezas, como tu icono'),
    2: ('Chorro hasta el clic, sin dragón', 'La cabeza escupe el chorro', 'Sin cabeza: chorro hasta el final'),
    3: ('Golpe normal y una estrella', 'Tu cabeza de dragón embiste', 'Tu fénix cae en picado'),
    4: ('Tu dragón de piedra en arco', 'Sale de tus púas de tierra', 'Dragón de madera: dibujo nuevo'),
    5: ('Un trozo de cadena vuela', 'La cadena sale del pecho', 'Dos cadenas en X'),
    6: ('Golpe normal y una estrella', '8 palmas abiertas y tu sello', 'Lluvia de golpes y tu sello'),
    7: ('Tu dragón de agua en arco', 'Sale de tu géiser', 'Cuerpo largo de agua'),
    8: ('Púas hasta el clic', 'Tus 3 balas de roca', 'Púas y balas a la vez'),
    9: ('Golpe y X de viento', '3 medias lunas de chakra', '3 medias lunas de fuego'),
    10: ('Orbe con ojo y pilar', 'Tus cuervos bajan del cielo', 'Cuervos en vez del orbe'),
    11: ('Golpe y una chispa', 'Rayo en la mano y estocada', 'Estocada y chispa'),
    12: ('Estrella en su propio pecho', 'Giro y medias lunas de viento', 'Tornado sobre el ninja'),
}
OV = {(3, 1): 2, (4, 2): 1, (6, 0): 2, (9, 0): 2, (11, 0): 2}
NAMES = {1: 'Llama Dragón', 3: 'Night Guy', 6: '64 palmas', 7: 'Dragón de agua', 5: 'Cadenas selladoras'}

PW, PH = 640, 330  # panel box
GAP = 22
W = 3 * PW + 4 * GAP


def fit(im):
    s = min(PW / im.width, PH / im.height)
    k = max(1, int(s))
    if k > 1:
        im = im.resize((im.width * k, im.height * k), Image.NEAREST)
    s2 = min(PW / im.width, PH / im.height)
    if abs(s2 - 1) > 0.01:
        im = im.resize((round(im.width * s2), round(im.height * s2)), Image.LANCZOS)
    return im


def row_image(n):
    a = mockups.ABIL[n]()
    vfxlib.STILL[0] = True
    raw = []
    for i, r in enumerate(a['rows']):
        ov = OV.get((n, i), r.get('ov', len(r['keys']) // 2))
        t = r['keys'][ov][0]
        raw.append((r, r['scene'].render(t).convert('RGB'), r['scene'].label(t)))
    vfxlib.STILL[0] = False
    # crop the three panels alike to what is drawn over the ground (plus a margin), at the panel's aspect
    bg = np.array(background(a['rows'][0]['scene'].crop).convert('RGB')).astype(int)
    box = None
    for _, im, _ in raw:
        diff = np.abs(np.array(im).astype(int) - bg).sum(2) > 40
        ys, xs = np.nonzero(diff)
        if len(xs):
            b = [xs.min(), ys.min(), xs.max(), ys.max()]
            box = b if box is None else [min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3])]
    Wc, Hc = raw[0][1].size
    x0, y0, x1, y1 = box[0] - 24, box[1] - 24, box[2] + 24, box[3] + 16
    asp = PW / PH
    w, h = x1 - x0, y1 - y0
    if w / h < asp:
        cx = (x0 + x1) / 2
        w = h * asp
        x0, x1 = cx - w / 2, cx + w / 2
    else:
        cy = (y0 + y1) / 2
        h = w / asp
        y0, y1 = cy - h / 2, cy + h / 2
    if x0 < 0: x1 -= x0; x0 = 0
    if x1 > Wc: x0 -= x1 - Wc; x1 = Wc
    if y0 < 0: y1 -= y0; y0 = 0
    if y1 > Hc: y0 -= y1 - Hc; y1 = Hc
    cropbox = tuple(int(round(v)) for v in (max(0, x0), max(0, y0), min(Wc, x1), min(Hc, y1)))
    panels = [(r, fit(im.crop(cropbox)), lab) for r, im, lab in raw]
    ph = max(p[1].height for p in panels)
    H = 96 + ph + 168
    im = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(im)
    x = GAP
    if a.get('icon'):
        ic = Image.open(mockups.ICON.format(a['icon'])).convert('RGBA')
        ic = ic.resize((76, 76), Image.LANCZOS)
        im.paste(ic, (GAP, 12), ic)
        x += 90
    d.text((x, 14), a['title'], font=font(62, True), fill=INK)
    for i, (r, p, lab) in enumerate(panels):
        px = GAP + i * (PW + GAP)
        py = 96 + (ph - p.height) // 2
        rec = r.get('rec')
        im.paste(p, (px + (PW - p.width) // 2, py))
        col = GOLD if rec else (90, 86, 110)
        d.rectangle((px + (PW - p.width) // 2 - 3, py - 3, px + (PW + p.width) // 2 + 2, py + p.height + 2), outline=col, width=4 if rec else 2)
        ty = 96 + ph + 12
        name = {'Ahora': 'Ahora', 'Opción A': 'A', 'Opción B': 'B'}[r['label']]
        head = name + ('  ★ recomendada' if rec else '')
        d.text((px, ty), head, font=font(44, True), fill=GOLD if rec else INK)
        tw = d.textlength(lab, font=font(30))
        d.text((px + PW - tw, ty + 12), lab, font=font(30), fill=DIM)
        txt = SHORT[n][i]
        if r.get('tag'):
            txt = txt
        lines = wrap(txt, font(38), PW, d)
        yy = ty + 58
        for ln in lines[:2]:
            d.text((px, yy), ln, font=font(38), fill=(255, 150, 140) if (r.get('tag') and i == 2) else INK)
            yy += 44
    return im


def header(part):
    im = Image.new('RGB', (W, 300), BG)
    d = ImageDraw.Draw(im)
    d.text((GAP, 20), f'Efectos de las técnicas: ideas ({part}/2)', font=font(72, True), fill=INK)
    lines = ['Ahora = cómo se ve hoy en el juego · A y B = opciones para elegir',
             '★ = la que recomiendo · todo con tus dibujos del juego (moverlos, escalarlos, encadenarlos)',
             'Sin aura (estallido de ki) alrededor del ninja en ninguna opción, como pediste',
             'Cada técnica tiene su tira y sus GIF con todos los pasos y tiempos']
    y = 120
    for ln in lines:
        d.text((GAP, y), ln, font=font(36), fill=DIM)
        y += 44
    return im


for part, ns in ((1, range(1, 7)), (2, range(7, 13))):
    blocks = [header(part)] + [row_image(n) for n in ns]
    H = sum(b.height for b in blocks) + 6 * len(blocks)
    out = Image.new('RGB', (W, H), BG)
    y = 0
    d = ImageDraw.Draw(out)
    for b in blocks:
        out.paste(b, (0, y))
        y += b.height
        d.line((0, y + 2, W, y + 2), fill=(70, 66, 90), width=4)
        y += 6
    p = f'{OUT}/ideas-vfx-{part}.png'
    out.save(p, optimize=True)
    print(p, out.size, os.path.getsize(p))
