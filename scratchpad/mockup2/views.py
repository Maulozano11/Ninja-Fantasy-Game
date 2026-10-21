"""The two gameplay screens of the second mockup round (1920x1080):
  tactical.png  zoomed out 1x: half the map at once, minimap, compact HUD
  close.png     normal 2x view of the same moment
python3 views.py [tactical|close|all]"""
import heapq
import math
import os
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import compose2 as K  # noqa: E402
import terrain as T  # noqa: E402

font = K.font

MM_Y0, MM_Y1 = T.BACK_Y - 2 * T.LV - 40, T.FRONT_Y + 30   # rows of the map shown in the minimap

# palette
INK = (12, 17, 28)
PANEL = INK + (214,)
LINE = (255, 255, 255, 30)
TXT = (236, 241, 248, 255)
DIM = (160, 174, 196, 255)
ALLY = (96, 214, 255)
FOE = (255, 104, 96)
GOLD = (255, 204, 96)
HP = (98, 214, 130)
CHAKRA = (92, 150, 255)


# ------------------------------------------------------------------ the moment shown: round 2, Charlotte's turn
CH0 = (24.4, 10.4)         # Charlotte now (16 m layout, stretched by K.ZK)
DST0 = (27.0, 9.6)         # where she will move (the river bank by the bridge)
CH = (CH0[0], CH0[1] * K.ZK)
DST = (DST0[0], DST0[1] * K.ZK)
CONE = (-14, 30, 11.0)     # aim (deg, + = toward the viewer), half angle, range m
CAST = [
    K.C('charlotte', *CH0, ring=ALLY),
    K.C('charlotte_cast', *DST0, alpha=0.5),
    K.C('solen', 21.0, 8.0),
    K.C('ren', 19.8, 11.4),
    K.C('saber', 22.2, 13.2),
    K.C('rogue3', 30.2, 6.9, mirror=True, team='foe', lvl=0),
    K.C('brute', 34.0, 10.6, mirror=True, team='foe'),
    K.C('rogue2', 41.6, 7.4, mirror=True, team='foe'),
    K.C('rogue1', 53.8, 2.2, mirror=True, team='foe'),
]
ORDER = [('charlotte', 'ally', 'Charlotte'), ('rogue3', 'foe', 'Centinela'), ('saber', 'ally', 'Saber'), ('brute', 'foe', 'Bruto'),
         ('ren', 'ally', 'Ren'), ('rogue2', 'foe', 'Lanzador'), ('solen', 'ally', 'Solen'), ('rogue1', 'foe', 'Vigía')]


# ------------------------------------------------------------------ HUD primitives
def panel(img, box, r=14, accent=None, fill=PANEL):
    over = Image.new('RGBA', img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(over)
    d.rounded_rectangle(box, r, fill=fill, outline=(accent + (210,)) if accent else LINE, width=2 if accent else 1)
    # soft top highlight
    x0, y0, x1, y1 = box
    d.line((x0 + r, y0 + 1, x1 - r, y0 + 1), fill=(255, 255, 255, 22), width=1)
    shadow = Image.new('RGBA', img.size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((x0 + 2, y0 + 6, x1 + 2, y1 + 8), r, fill=(0, 0, 0, 90))
    img.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(8)))
    img.alpha_composite(over)


def text(d, xy, s, f, fill=TXT, anchor='la'):
    d.text(xy, s, font=f, fill=fill, anchor=anchor)


def bar(d, box, v, m, col, label=None, f=None):
    x0, y0, x1, y1 = box
    r = (y1 - y0) / 2
    d.rounded_rectangle(box, r, fill=(34, 42, 60, 255))
    w = (x1 - x0) * v / m
    if w > 2 * r:
        d.rounded_rectangle((x0, y0, x0 + w, y1), r, fill=col + (255,))
        d.line((x0 + r, y0 + 2, x0 + w - r, y0 + 2), fill=(255, 255, 255, 70), width=1)
    if label:
        text(d, (x1 - 6, (y0 + y1) / 2), label, f, (240, 244, 250, 255), 'rm')


def portrait(name, size, ring, mirror=False, dim=False, square=True):
    im, ax, _ = K.char_sprite(name, mirror)
    hx = K.META[name]['headX'] if not mirror else 127 - K.META[name]['headX']
    hy = K.META[name]['headY']
    crop = im.crop((hx - 19, hy - 22, hx + 19, hy + 16)).resize((size, size), Image.NEAREST)
    card = Image.new('RGBA', (size + 6, size + 6), (0, 0, 0, 0))
    d = ImageDraw.Draw(card)
    rad = size // 4 if square else size
    bgc = (24, 34, 52, 255) if ring != FOE else (48, 22, 28, 255)
    d.rounded_rectangle((0, 0, size + 5, size + 5), rad, fill=bgc, outline=ring + (255,), width=2)
    mask = Image.new('L', (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle((1, 1, size - 2, size - 2), max(1, rad - 2), fill=255)
    if dim:
        crop = Image.blend(crop, Image.new('RGBA', crop.size, (20, 30, 50, 255)), 0.5)
    alpha = Image.fromarray(np.minimum(np.array(crop)[..., 3], np.array(mask)))
    card.paste(crop, (3, 3), alpha)
    return card


def chip(d, x, y, s, f, bg=(12, 18, 30, 226), fg=TXT, border=None, anchor='center', icon=None):
    pad = 9
    w = d.textlength(s, font=f) + pad * 2 + (16 if icon else 0)
    h = f.size + 10
    x0 = x - w / 2 if anchor == 'center' else x
    x0 = min(max(x0, 12), d.im.size[0] - w - 12)     # keep labels on screen
    y = min(max(y, 12), d.im.size[1] - h - 12)
    d.rounded_rectangle((x0, y, x0 + w, y + h), h / 2, fill=bg, outline=border, width=2 if border else 0)
    tx = x0 + pad
    if icon:
        d.ellipse((tx, y + h / 2 - 5, tx + 10, y + h / 2 + 5), fill=icon)
        tx += 16
    text(d, (tx, y + h / 2), s, f, fg, 'lm')
    return x0 + w


def dice(d, cx, cy, r, val, f):
    pts = [(cx + r * math.cos(math.radians(60 * k + 30)), cy + r * math.sin(math.radians(60 * k + 30))) for k in range(6)]
    d.polygon(pts, fill=(238, 241, 247, 255), outline=(120, 132, 155, 255))
    d.polygon([(cx, cy - r * 0.74), (cx + r * 0.64, cy + r * 0.37), (cx - r * 0.64, cy + r * 0.37)], outline=(150, 160, 180, 255), width=2)
    text(d, (cx, cy + 2), str(val), f, (20, 28, 44, 255), 'mm')


# ------------------------------------------------------------------ HUD blocks
def unit_card(img, x, y):
    w, h = 410, 112
    panel(img, (x, y, x + w, y + h), 16, ALLY)
    img.alpha_composite(portrait('charlotte', 84, ALLY), (x + 12, y + 12))
    d = ImageDraw.Draw(img)
    text(d, (x + 112, y + 30), 'Charlotte', font('ExtraBold', 24), anchor='lm')
    text(d, (x + 252, y + 31), 'Nv 5', font('Bold', 14), GOLD + (255,), 'lm')
    text(d, (x + 112, y + 54), 'Clan Akkai · Espadachina · CA 16', font('Medium', 14), DIM, 'lm')
    bar(d, (x + 112, y + 70, x + 396, y + 84), 34, 42, HP, '34/42', font('Bold', 11))
    bar(d, (x + 112, y + 90, x + 396, y + 102), 18, 26, CHAKRA, '18/26', font('Bold', 10))


def initiative(img, cx, y):
    n = len(ORDER)
    step = 62
    w = n * step + 120
    x0 = cx - w / 2
    panel(img, (x0, y, x0 + w, y + 84), 18)
    d = ImageDraw.Draw(img)
    text(d, (x0 + 46, y + 28), 'RONDA', font('Bold', 12), DIM, 'mm')
    text(d, (x0 + 46, y + 56), '2', font('ExtraBold', 30), anchor='mm')
    d.line((x0 + 86, y + 14, x0 + 86, y + 70), fill=(255, 255, 255, 40), width=1)
    for i, (nm, team, label) in enumerate(ORDER):
        ring = ALLY if team == 'ally' else FOE
        cur = i == 0
        size = 54 if cur else 44
        px = x0 + 100 + i * step + (0 if cur else 5)
        py = y + (8 if cur else 14)
        if cur:
            glow = Image.new('RGBA', img.size, (0, 0, 0, 0))
            ImageDraw.Draw(glow).rounded_rectangle((px - 4, py - 4, px + size + 10, py + size + 10), 16, fill=GOLD + (120,))
            img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(6)))
        img.alpha_composite(portrait(nm, size, GOLD if cur else ring, mirror=team == 'foe'), (int(px), int(py)))
        d.rounded_rectangle((px + 8, y + 74, px + size - 2, y + 77), 2, fill=ring + (255,))
    text(d, (x0 + 100 + 30, y + 98), 'TU TURNO', font('ExtraBold', 12), GOLD + (255,), 'mm')


def minimap(img, x, y, cam, Z, world_small, scale):
    w, h = world_small.size
    panel(img, (x - 10, y - 34, x + w + 10, y + h + 10), 14)
    d = ImageDraw.Draw(img)
    text(d, (x, y - 17), 'BOSQUE DEL RÍO · 60 × 20 m', font('Bold', 12), DIM, 'lm')
    mm = world_small.copy()
    md = ImageDraw.Draw(mm)
    vx0, vx1 = cam[0] * scale, (cam[0] + img.width / Z) * scale
    vy0, vy1 = (cam[1] - MM_Y0) * scale, (cam[1] + img.height / Z - MM_Y0) * scale
    md.rectangle((vx0, max(0, vy0), vx1 - 1, min(h - 1, vy1)), outline=(255, 255, 255, 230), width=2)
    for c in CAST:
        if c['alpha'] < 1:
            continue
        gx, gy = K.ground_xy(c['xm'], c['zm'], c['lvl'])
        px, py = gx * scale, (gy - MM_Y0) * scale
        col = (ALLY if c['team'] == 'ally' else FOE) + (255,)
        md.ellipse((px - 4, py - 4, px + 4, py + 4), fill=col, outline=(10, 14, 22, 255))
    # objective marker: the camp's map scroll
    ox, oy = K.ground_xy(47.6, 3.6 * K.ZK)
    oy -= MM_Y0
    md.polygon([(ox * scale, oy * scale - 9), (ox * scale + 6, oy * scale), (ox * scale, oy * scale + 9), (ox * scale - 6, oy * scale)], fill=GOLD + (255,))
    img.alpha_composite(mm, (x, y))
    d.rounded_rectangle((x, y, x + w, y + h), 6, outline=(255, 255, 255, 50), width=1)


def zoom_toggle(img, x, y, Z):
    d = ImageDraw.Draw(img)
    f = font('Bold', 14)
    panel(img, (x, y, x + 214, y + 36), 18)
    for k, (lab, z) in enumerate([('Táctica 1×', 1), ('Cerca 2×', 2)]):
        bx = x + 4 + k * 104
        if z == Z:
            d.rounded_rectangle((bx, y + 4, bx + 102, y + 32), 14, fill=(255, 255, 255, 235))
            text(d, (bx + 51, y + 18), lab, f, INK + (255,), 'mm')
        else:
            text(d, (bx + 51, y + 18), lab, f, DIM, 'mm')
    d2 = ImageDraw.Draw(img)
    chip(d2, x + 226, y + 2, 'Niebla · Día', font('SemiBold', 13), border=(255, 255, 255, 40), anchor='left', icon=(170, 210, 200, 255))


def party_frames(img, x, y):
    rows = [('solen', 'Solen', 'Jugador 2', 29, 38, 22, 30, 'Oculto'), ('ren', 'Ren', 'IA', 20, 33, 30, 30, None),
            ('saber', 'Saber', 'Jugador 3', 41, 44, 12, 18, 'Bendición')]
    for k, (nm, label, who, hp, hpm, ck, ckm, st) in enumerate(rows):
        yy = y + k * 66
        panel(img, (x, yy, x + 286, yy + 58), 14)
        img.alpha_composite(portrait(nm, 42, ALLY), (x + 8, yy + 6))
        d = ImageDraw.Draw(img)
        text(d, (x + 64, yy + 16), label, font('Bold', 15), anchor='lm')
        text(d, (x + 64 + d.textlength(label, font=font('Bold', 15)) + 8, yy + 17), who, font('Medium', 12), DIM, 'lm')
        if st:
            chip(d, x + 278, yy + 6, st, font('SemiBold', 11), bg=(30, 60, 50, 230), fg=(170, 240, 200, 255), anchor='left') if False else None
            text(d, (x + 276, yy + 16), st, font('SemiBold', 12), (150, 235, 190, 255), 'rm')
        bar(d, (x + 64, yy + 30, x + 276, yy + 40), hp, hpm, HP)
        bar(d, (x + 64, yy + 44, x + 276, yy + 51), ck, ckm, CHAKRA)


ABIL = [('1', 'Ataque', None, (210, 214, 224)), ('2', 'Viento cortante', '4', (255, 132, 100)), ('3', 'Esconderse', None, (120, 230, 170)),
        ('4', 'Salto ninja', '2', (160, 190, 255)), ('5', 'Empujar', None, (226, 204, 140)), ('6', 'Agacharse', 'B', (150, 200, 160)),
        ('', 'Fin de turno', None, (180, 182, 194))]


def icon(d, k, cx, cy, col):
    c = col + (255,)
    if k == 0:
        d.line((cx - 14, cy + 14, cx + 14, cy - 14), fill=c, width=4)
        d.line((cx - 10, cy + 3, cx - 3, cy + 10), fill=c, width=4)
    elif k == 1:
        d.pieslice((cx - 22, cy - 22, cx + 22, cy + 22), 300, 360 + 20, fill=col + (230,))
        d.ellipse((cx - 3, cy - 3, cx + 3, cy + 3), fill=c)
    elif k == 2:
        d.arc((cx - 14, cy - 9, cx + 14, cy + 11), 200, 340, fill=c, width=3)
        d.arc((cx - 14, cy - 13, cx + 14, cy + 7), 20, 160, fill=c, width=3)
        d.line((cx - 13, cy + 11, cx + 13, cy - 11), fill=c, width=3)
    elif k == 3:
        d.arc((cx - 16, cy - 12, cx + 16, cy + 18), 200, 340, fill=c, width=4)
        d.polygon([(cx + 14, cy - 6), (cx + 20, cy + 6), (cx + 6, cy + 4)], fill=c)
    elif k == 4:
        d.polygon([(cx - 12, cy - 10), (cx + 6, cy), (cx - 12, cy + 10)], fill=c)
        d.line((cx + 11, cy - 12, cx + 11, cy + 12), fill=c, width=4)
    elif k == 5:
        d.rounded_rectangle((cx - 13, cy + 1, cx + 13, cy + 13), 5, fill=c)
        d.ellipse((cx - 6, cy - 13, cx + 6, cy - 1), fill=c)
    else:
        d.line((cx - 10, cy - 10, cx + 10, cy + 10), fill=c, width=4)
        d.line((cx - 10, cy + 10, cx + 10, cy - 10), fill=c, width=4)


def action_bar(img, cx, y, sel=1):
    bw, gap = 64, 10
    n = len(ABIL)
    left_w = 250
    w = left_w + n * (bw + gap) + 20
    x0 = cx - w / 2
    panel(img, (x0, y, x0 + w, y + 92), 20)
    d = ImageDraw.Draw(img)
    # turn economy
    for k, (lab, col, used) in enumerate([('Acción', (98, 214, 130), False), ('Adicional', (255, 172, 70), False), ('Reacción', (190, 124, 255), False)]):
        px = x0 + 26 + k * 74
        d.ellipse((px, y + 16, px + 24, y + 40), fill=col + (255,) if not used else (60, 66, 80, 255), outline=(240, 244, 250, 200), width=2)
        text(d, (px + 12, y + 52), lab, font('SemiBold', 11), DIM, 'mm')
    text(d, (x0 + 24, y + 75), 'Mov.', font('SemiBold', 12), DIM, 'lm')
    bar(d, (x0 + 62, y + 69, x0 + 196, y + 81), 6.4, 9, (96, 214, 255))
    text(d, (x0 + 202, y + 75), '6.4/9 m', font('Bold', 12), (200, 232, 255, 255), 'lm')
    for k, (key, lab, cost, col) in enumerate(ABIL):
        bx = x0 + left_w + k * (bw + gap)
        by = y + 12
        s = k == sel
        if s:
            g = Image.new('RGBA', img.size, (0, 0, 0, 0))
            ImageDraw.Draw(g).rounded_rectangle((bx - 4, by - 4, bx + bw + 4, by + bw + 4), 18, fill=col + (110,))
            img.alpha_composite(g.filter(ImageFilter.GaussianBlur(7)))
            d = ImageDraw.Draw(img)
        d.rounded_rectangle((bx, by, bx + bw, by + bw), 14, fill=(26, 34, 52, 255) if not s else (70, 30, 26, 255), outline=col + (255 if s else 120,), width=3 if s else 1)
        icon(d, k, bx + bw / 2, by + bw / 2 - 2, col)
        if key:
            text(d, (bx + 9, by + 11), key, font('Bold', 11), DIM, 'mm')
        if cost:
            cc = CHAKRA if cost.isdigit() else (255, 172, 70)
            d.rounded_rectangle((bx + bw - 22, by + bw - 18, bx + bw - 3, by + bw - 3), 6, fill=cc + (255,))
            text(d, (bx + bw - 12.5, by + bw - 10), cost, font('Bold', 11), (12, 16, 26, 255), 'mm')
        text(d, (bx + bw / 2, y + 86), lab if len(lab) < 12 else lab.split(' ')[0], font('SemiBold', 10), (200, 210, 225, 255), 'mm')
    return x0, w


def tooltip(img, x, y):
    w, h = 300, 132
    panel(img, (x, y, x + w, y + h), 14, (255, 132, 100))
    d = ImageDraw.Draw(img)
    text(d, (x + 16, y + 22), 'Viento cortante', font('ExtraBold', 19), (255, 176, 150, 255), 'lm')
    text(d, (x + w - 14, y + 22), 'Acción · 4 chakra', font('SemiBold', 12), DIM, 'rm')
    for k, s in enumerate(['Abanico 60° · 11 m · 3d8 cortante', 'Salvación DES 14: mitad de daño', 'Golpea a todos dentro, aliados incluidos.', 'Aviva el fuego y empuja el humo.']):
        text(d, (x + 16, y + 50 + k * 21), s, font('Medium', 14), TXT if k < 2 else DIM, 'lm')


def roll_toast(img, x, y):
    w, h = 330, 70
    panel(img, (x, y, x + w, y + h), 14)
    d = ImageDraw.Draw(img)
    dice(d, x + 36, y + 35, 24, 17, font('ExtraBold', 15))
    text(d, (x + 72, y + 22), 'Saber · Tajo con espada', font('Bold', 14), anchor='lm')
    text(d, (x + 72, y + 46), '17 + 5 = 22 vs CA 15 · ¡9 de daño!', font('Medium', 14), (130, 232, 160, 255), 'lm')


# ------------------------------------------------------------------ ground overlays
def reach_cells(budget=6.4, cell=0.25):
    """Dijkstra over 0.25 m cells on level 1: grass 1x, shallow river 2x, the deck 1x; the hill is blocked."""
    nx, nz = int(60.6 / cell), int(T.DEPTH_M / cell)
    river = np.zeros((nz, nx), bool)
    blocked = np.zeros((nz, nx), bool)
    deck = np.zeros((nz, nx), bool)
    for j in range(nz):
        z = (j + 0.5) * cell
        c, hw = T.river_c(z)
        for i in range(nx):
            x = (i + 0.5) * cell
            river[j, i] = abs(x - c) < hw
            if x >= T.HILL_X - 2.6 and z <= T.hill_front(min(max(x, T.HILL_X), 60)) + 0.2:
                blocked[j, i] = True
            if T.BRIDGE_Z - T.BRIDGE_DEPTH <= z <= T.BRIDGE_Z and abs(x - c) < hw + 1.0:
                deck[j, i] = True
    cost = np.where(river & ~deck, 2.0, 1.0)
    dist = np.full((nz, nx), np.inf)
    s = (int(CH[1] / cell), int(CH[0] / cell))
    dist[s] = 0
    pq = [(0.0, s)]
    st = [(-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)]
    while pq:
        dd, (j, i) = heapq.heappop(pq)
        if dd > dist[j, i] or dd > budget:
            continue
        for dj, di in st:
            nj, ni = j + dj, i + di
            if 0 <= nj < nz and 0 <= ni < nx and not blocked[nj, ni]:
                nd = dd + math.hypot(dj, di) * cell * cost[nj, ni]
                if nd < dist[nj, ni]:
                    dist[nj, ni] = nd
                    heapq.heappush(pq, (nd, (nj, ni)))
    return dist <= budget, cell


def ground_overlay(img, cam, Z, info):
    W, H = img.size
    reach, cell = reach_cells()
    m = Image.new('L', (W, H), 0)
    md = ImageDraw.Draw(m)
    nz, nx = reach.shape
    for j in range(nz):
        for i in range(nx):
            if reach[j, i]:
                x0, y0 = K.to_screen(i * cell, j * cell, cam, Z, 0)
                x1, y1 = K.to_screen((i + 1) * cell, (j + 1) * cell, cam, Z, 0)
                md.rectangle((x0, y0, x1, y1), fill=255)
    m = m.filter(ImageFilter.GaussianBlur(4 * Z)).point(lambda v: 255 if v > 128 else 0)
    a = np.array(m) > 0
    ov = np.zeros((H, W, 4), np.uint8)
    ov[a] = (96, 214, 255, 40)
    e = a & ~(np.roll(a, 2, 0) & np.roll(a, -2, 0) & np.roll(a, 2, 1) & np.roll(a, -2, 1))
    ov[e] = (150, 230, 255, 210)
    img.alpha_composite(Image.fromarray(ov))
    over = Image.new('RGBA', img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(over)
    # cone of the jutsu from the destination (stopped by nothing here)
    aim, half, rng_m = CONE
    pts = [K.to_screen(*DST, cam, Z, 0)]
    for k in range(33):
        ang = math.radians(aim - half + 2 * half * k / 32)
        pts.append(K.to_screen(DST[0] + math.cos(ang) * rng_m, DST[1] + math.sin(ang) * rng_m, cam, Z, 0))
    # the cone stops at the cliff: clip it to level-1 ground in front of the hill
    cone = Image.new('L', img.size, 0)
    cd = ImageDraw.Draw(cone)
    cd.polygon(pts, fill=255)
    hill = (info['plateau'] | info['cliff'] | info['lookout'])
    nw, nh = W // Z, H // Z
    hm = Image.fromarray((hill[cam[1]:cam[1] + nh, cam[0]:cam[0] + nw] * 255).astype(np.uint8)).resize((W, H), Image.NEAREST)
    cone = Image.fromarray(np.where(np.array(hm) > 0, 0, np.array(cone)).astype(np.uint8))
    ca = np.array(cone) > 0
    cov = np.zeros((H, W, 4), np.uint8)
    cov[ca] = (255, 100, 70, 60)
    ce = ca & ~(np.roll(ca, Z + 1, 0) & np.roll(ca, -Z - 1, 0) & np.roll(ca, Z + 1, 1) & np.roll(ca, -Z - 1, 1))
    cov[ce] = (255, 140, 100, 235)
    over.alpha_composite(Image.fromarray(cov))
    d = ImageDraw.Draw(over)
    # path dots
    n = 12
    for k in range(1, n):
        t = k / n
        xm = CH[0] + (DST[0] - CH[0]) * t
        zm = CH[1] + (DST[1] - CH[1]) * t
        x, y = K.to_screen(xm, zm, cam, Z, 0)
        r = 2.5 * Z
        d.ellipse((x - r, y - r, x + r, y + r), fill=(210, 246, 255, 240))
    x, y = K.to_screen(*DST, cam, Z, 0)
    d.ellipse((x - 16 * Z, y - 5 * Z, x + 16 * Z, y + 5 * Z), outline=(210, 246, 255, 255), width=max(2, Z + 1))
    # selection ring under Charlotte and red rings under targets in the cone
    for c in CAST:
        if c['alpha'] < 1:
            continue
        x, y = K.to_screen(c['xm'], c['zm'], cam, Z, c['lvl'])
        if c['name'] == 'charlotte':
            d.ellipse((x - 18 * Z, y - 5 * Z, x + 18 * Z, y + 6 * Z), outline=GOLD + (255,), width=max(2, Z + 1))
        elif c['name'] in ('rogue3', 'brute'):
            d.ellipse((x - 18 * Z, y - 5 * Z, x + 18 * Z, y + 6 * Z), outline=FOE + (255,), width=max(2, Z + 1))
    img.alpha_composite(over)


def world_labels(img, cam, Z):
    d0 = ImageDraw.Draw(img)
    W, H = img.size

    class OnScreen:
        # draws a world label only when its anchor is inside the view (no labels piling up on the edges)
        def __getattr__(self, k):
            return getattr(d0, k)
    d = OnScreen()

    def chip_if(x, y, *a, **kw):
        if 0 <= x <= W and 0 <= y <= H - 120:
            chip(d0, x, y, *a, **kw)
    fs = font('Bold', 15 if Z == 1 else 18)
    fsm = font('SemiBold', 13 if Z == 1 else 15)
    head = lambda xm, zm, lvl=None, up=118: K.to_screen(xm, zm, cam, Z, lvl, -up)
    x, y = head(30.2, 6.9 * K.ZK, 0)
    chip_if(x, y - 26 * Z / 2 - 10, '78% · 3d8', fs, bg=(44, 12, 14, 236), border=FOE + (255,))
    x, y = head(34.0, 10.6 * K.ZK, None, 122)
    chip_if(x, y - 26 * Z / 2 - 10, '61% · Cobertura ½', fs, bg=(44, 12, 14, 236), border=FOE + (255,))
    x, y = K.to_screen(36.0, 12.0 * K.ZK, cam, Z, 0, -86)
    chip_if(x, y, '¡Barriles en el abanico! Explotan 3 m', fsm, bg=(52, 26, 10, 236), border=(255, 160, 80, 255))
    x, y = head(41.6, 7.4 * K.ZK, None, 124)
    chip_if(x, y - 26 * Z / 2 - 10, 'Fuera de alcance · Altura +2', fsm, border=(160, 190, 255, 220))
    x, y = head(53.8, 2.2 * K.ZK, None, 124)
    chip_if(x, y - 26 * Z / 2 - 10, 'Vigía · Altura +4 · te ve', fsm, border=(160, 190, 255, 220))
    x, y = K.to_screen(*DST, cam, Z, 0, 10)
    chip_if(x, y, '2.6 m · orilla (agua ×2)', fs, border=(210, 246, 255, 230))
    x, y = K.to_screen(44.8, 5.2 * K.ZK, cam, Z, None, 6)
    chip_if(x, y, 'Hoguera', fsm, border=(255, 170, 90, 200))


# ------------------------------------------------------------------ screens
def screen(Z, cam, name):
    items = K.world_props() + CAST
    img, placed, info = K.render_view(items, cam, Z, ground_fx=lambda im, inf: ground_overlay(im, cam, Z, inf))
    # redraw the cast and the props in front of them on top of the overlay? keep it simple: overlays sit under labels only
    world_labels(img, cam, Z)
    W, H = img.size
    unit_card(img, 24, 20)
    initiative(img, W / 2 - 30, 18)
    # minimap from the panorama
    pano = Image.open(os.path.join(HERE, 'panorama.png')).convert('RGBA')
    band = pano.crop((0, MM_Y0, pano.width, MM_Y1))
    scale = 400 / pano.width
    small = band.resize((400, int(band.height * scale)), Image.LANCZOS)
    minimap(img, W - 24 - 400, 54, cam, Z, small, scale)
    zoom_toggle(img, W - 24 - 400 - 10, 54 + small.height + 22, Z)
    party_frames(img, 24, H - 24 - 3 * 66 + 8)
    ax0, aw = action_bar(img, W / 2 + 60, H - 24 - 92)
    tooltip(img, ax0 + 250 + 1 * 74 - 118, H - 24 - 92 - 146)
    roll_toast(img, W - 24 - 330, H - 24 - 70)
    img.convert('RGB').save(os.path.join(HERE, name))
    print('wrote', name, 'missing sprites:', sorted(K.LIB.missing))


if __name__ == '__main__':
    what = sys.argv[1] if len(sys.argv) > 1 else 'all'
    if what in ('tactical', 'all'):
        screen(1, (int(18.4 * T.PXM), 110), 'tactical.png')
    if what in ('close', 'all'):
        screen(2, (int(20.4 * T.PXM), 470), 'close.png')
