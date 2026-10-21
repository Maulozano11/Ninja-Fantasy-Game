import sys
sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/approve/_work/12-avance')
from common import *

NEW = load_manifest(W + '/snap/new/manifest.json')
ORDER = [
    ('water', 'Agua', 'Dragón de agua'),
    ('wind', 'Viento', 'Grulla de viento'),
    ('lightning', 'Rayo', 'Perro del trueno'),
    ('earth', 'Tierra', 'Dragón de piedra'),
    ('genjutsu', 'Genjutsu', 'Cuervo de ilusión'),
    ('chakra', 'Chakra', 'Zorro de chakra'),
    ('poison', 'Veneno', 'Cobra venenosa'),
]
OLDNAME = {'water': 'dragón de agua', 'wind': 'grulla', 'lightning': 'perro del trueno', 'earth': 'serpiente de piedra',
           'genjutsu': 'bandada de cuervos', 'chakra': 'zorro espíritu', 'poison': 'cobra'}

Z = 2
LABEL_W = 250
OLD_CELL = 128 * Z + 16
NEW_CELL = 157 * Z + 16
GAP = 10
SEP = 26
RIGHT_W = 128 * Z + 60
PAD = 24


def sprite_set(png, spec, anim='fly'):
    fr = frames_of(png, spec, anim)
    bb = union_bbox(fr)
    return [f.crop(bb) for f in fr], bb


rows = []
for key, elem, beast in ORDER:
    ospec = load_manifest(W + f'/snap/old/{key}.manifest.json')['beast']
    ofr, obb = sprite_set(W + f'/snap/old/{key}.png', ospec)
    nspec = NEW[key]
    nfr, nbb = sprite_set(W + '/snap/new/' + nspec['file'], nspec)
    nn = len(nfr)
    rows.append(dict(key=key, elem=elem, beast=beast, ospec=ospec, nspec=nspec,
                     old=[ofr[0], ofr[3]], new=[nfr[0], nfr[nn // 2]],
                     onf=len(ofr), nnf=nn))

row_h = []
for r in rows:
    h = max(max(i.height for i in r['old']), max(i.height for i in r['new'])) * Z + 24
    row_h.append(max(h, 150))

HEAD_TOP = 96 + 64
HEADS_H = 290
page_w = PAD + LABEL_W + 2 * OLD_CELL + GAP + SEP + 2 * NEW_CELL + GAP + SEP + RIGHT_W + PAD
page_h = HEAD_TOP + sum(row_h) + GAP * len(rows) + HEADS_H + 20
img = Image.new('RGBA', (page_w, page_h), BG)
title_bar(img, '12 · AVANCE — Bestias elementales rehechas   (EN PROCESO, aún no es para aprobar)',
          'Izquierda: ANTES (la versión que no gustó).  Centro: AHORA (la nueva).  Derecha: el fénix aprobado como listón de calidad.  Todo a zoom 2x.')
d = ImageDraw.Draw(img)

x_old = PAD + LABEL_W
x_new = x_old + 2 * OLD_CELL + GAP + SEP
x_right = x_new + 2 * NEW_CELL + GAP + SEP
text(d, (x_old, 112), 'ANTES', font(24, True), RED)
text(d, (x_old + 92, 118), '(6 cuadros, 128 px de largo)', font(16), GREY)
text(d, (x_new, 112), 'AHORA', font(24, True), GREEN)
text(d, (x_new + 100, 118), '(nueva · 2 de sus cuadros de vuelo)', font(16), GREY)
# separators
d.rectangle((x_new - SEP // 2 - 1, HEAD_TOP - 8, x_new - SEP // 2 + 1, HEAD_TOP + sum(row_h) + GAP * len(rows)), fill=(60, 68, 76, 255))
d.rectangle((x_right - SEP // 2 - 1, 104, x_right - SEP // 2 + 1, HEAD_TOP + sum(row_h) + GAP * len(rows)), fill=(60, 68, 76, 255))

y = HEAD_TOP
for r, h in zip(rows, row_h):
    # label
    text(d, (PAD, y + 14), r['elem'], font(26, True), WHITE)
    text(d, (PAD, y + 48), r['beast'], font(19), WHITE)
    text(d, (PAD, y + 80), f"Nueva: {r['nnf']} cuadros · {r['nspec']['anims']['fly']['fps']} fps", font(15), GREY)
    text(d, (PAD, y + 100), f"{r['nspec']['frameW']}×{r['nspec']['frameH']} px (antes {r['ospec']['frameW']}×{r['ospec']['frameH']})", font(15), GREY)
    text(d, (PAD, y + 120), f"Antes: {OLDNAME[r['key']]}", font(15), GREY)
    for i, fr in enumerate(r['old']):
        cx = x_old + i * (OLD_CELL + GAP)
        cell = Image.new('RGBA', (OLD_CELL, h), PANEL)
        s = up(fr, Z)
        cell.alpha_composite(s, ((OLD_CELL - s.width) // 2, (h - s.height) // 2))
        img.alpha_composite(cell, (cx, y))
    for i, fr in enumerate(r['new']):
        cx = x_new + i * (NEW_CELL + GAP)
        cell = Image.new('RGBA', (NEW_CELL, h), PANEL)
        s = up(fr, Z)
        cell.alpha_composite(s, ((NEW_CELL - s.width) // 2, (h - s.height) // 2))
        img.alpha_composite(cell, (cx, y))
    y += h + GAP

# right column: phoenix + character
pspec = load_manifest(W + '/snap/old/fire.manifest.json')['beast']
pfr, pbb = sprite_set(W + '/snap/old/fire.png', pspec)
ry = 112
text(d, (x_right, ry), 'LISTÓN DE CALIDAD', font(22, True), GOLD); ry += 32
text(d, (x_right, ry), 'Fénix de fuego (ya aprobado)', font(17), WHITE); ry += 24
text(d, (x_right, ry), '6 cuadros · 12 fps · 128×104 px', font(15), GREY); ry += 28
for fi in (0, 3):
    s = up(pfr[fi], Z)
    cell = Image.new('RGBA', (RIGHT_W - 20, s.height + 20), PANEL)
    cell.alpha_composite(s, ((cell.width - s.width) // 2, 10))
    img.alpha_composite(cell, (x_right, ry)); ry += cell.height + GAP
ry += 30
text(d, (x_right, ry), 'Personaje para escala', font(20, True), WHITE); ry += 28
text(d, (x_right, ry), '(1,7 m · mismo zoom 2x)', font(15), GREY); ry += 26
ch = Image.open('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art3/char0.png').convert('RGBA')
ch = ch.crop(ch.getbbox())
s = up(ch, Z)
cell = Image.new('RGBA', (RIGHT_W - 20, s.height + 30), PANEL)
cell.alpha_composite(s, ((cell.width - s.width) // 2, 15))
img.alpha_composite(cell, (x_right, ry)); ry += cell.height + 20
note = ['Las bestias nuevas miden', '≈150 px de largo; el fénix', '≈115 px. En el juego se', 'verán algo más grandes', 'que el fénix.']
for ln in note:
    text(d, (x_right, ry), ln, font(15), GREY); ry += 21

# heads at 4x
hy = HEAD_TOP + sum(row_h) + GAP * len(rows) + 16
d.rectangle((PAD, hy - 6, page_w - PAD, hy - 4), fill=(60, 68, 76, 255))
text(d, (PAD, hy + 4), 'Cabezas a zoom 4x', font(22, True), WHITE)
text(d, (PAD + 250, hy + 9), '— aquí salían las motas rosas y verdes del fallo de transparencia. En esta versión ya no aparecen.', font(17), GREEN)
hx = PAD
hy2 = hy + 44
Z4 = 4
for r in rows:
    spec = r['nspec']
    f0 = frames_of(W + '/snap/new/' + spec['file'], spec, 'fly')[0]
    a = np.array(f0)[..., 3] > 128
    ys, xs = np.nonzero(a)
    xr = xs.max()
    yh = int(np.median(ys[xs >= xr - 6]))
    y0 = max(0, yh - 30)
    box = (max(0, xr - 57), y0, xr + 3, min(spec['frameH'], y0 + 52))
    crop = f0.crop(box)
    s = up(crop, Z4)
    cell = Image.new('RGBA', (60 * Z4 + 12, 52 * Z4 + 12), PANEL)
    cell.alpha_composite(s, (6, 6))
    img.alpha_composite(cell, (hx, hy2))
    text(d, (hx + cell.width // 2, hy2 + cell.height + 6), r['elem'], font(16, True), WHITE, 'ma')
    hx += cell.width + 8

out = img.convert('RGB')
out.save(OUT + '/12-avance-bestias.png', optimize=True)
print(out.size)
