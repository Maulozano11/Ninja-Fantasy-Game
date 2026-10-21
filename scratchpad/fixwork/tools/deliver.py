"""Final deliverables with Spanish labels:
lanzamiento.png (his reference beside our release frame at the same height, then every 'throw' frame),
estocada.png (every 'pierce' frame), and both as GIFs at the poses' fps, 3x.
usage: python3 -I deliver.py
"""
import json, os
from PIL import Image, ImageDraw, ImageFont

S = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/poses-throw-pierce/'
REF = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/phase-ref/owner-phase-ref.jpg'
FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 15)
FONTB = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 17)
FONTT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 24)
BG = (26, 28, 36, 255)
CELL = (52, 56, 68, 255)
GOLD = (240, 214, 150, 255)
TXT = (222, 222, 232, 255)
HI = (120, 190, 255, 255)

LABELS = {
    'Solen': 'Solen\n(mandoble de cristal,\ncapa negra)',
    'Akira': 'Akira\n(katana, cuero)',
    'Aiden': 'Aiden\n(espada de fuego,\ncapa carmesí)',
    'male': 'Cuerpo: hombre\n(katana)',
    'female': 'Cuerpo: mujer\n(katana)',
    'bulky': 'Cuerpo: corpulento\n(katana)',
    'slender': 'Cuerpo: esbelta\n(katana)',
    'unarmed': 'Sin arma\n(lanza un kunai)',
    'naginata': 'Naginata',
    'katana': 'Katana',
    'crystal': 'Mandoble de cristal',
    'ice': 'Espada de cristal\nde hielo',
    'flame': 'Espada larga\nde fuego',
    'kunai': 'Kunai\n(estocada corta)',
}
UNARMED_PIERCE = 'Sin arma\n(golpe recto)'


def load(raw):
    man = json.load(open(S + raw + '/manifest.json'))
    for m in man:
        m['img'] = Image.open(S + raw + '/' + m['file']).convert('RGBA')
    return man


def union_box(frames, m=3):
    box = None
    for f in frames:
        b = f['img'].getbbox()
        if b:
            box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
    return (max(0, box[0] - m), max(0, box[1] - m), min(256, box[2] + m), min(256, box[3] + m))


def cell(img, box, k):
    c = img.crop(box).resize(((box[2] - box[0]) * k, (box[3] - box[1]) * k), Image.NEAREST)
    bg = Image.new('RGBA', c.size, CELL)
    d = ImageDraw.Draw(bg)
    gy = (216 - box[1]) * k  # the ground line (GROUND * RES)
    d.line([(0, gy), (c.width, gy)], fill=(84, 90, 106, 255))
    bg.alpha_composite(c)
    return bg


def text_block(d, xy, s, font, fill, gap=4):
    x, y = xy
    for line in s.split('\n'):
        d.text((x, y), line, font=font, fill=fill)
        y += font.size + gap


def side_by_side(frames, H=420):
    """His reference and our release frames, each scaled so head top to soles is H px."""
    ref = Image.open(REF).convert('RGBA')
    top, sole = 62, 235  # his figure on the 256 px picture: hair top, soles
    k = H / (sole - top)
    refs = ref.resize((round(ref.width * k), round(ref.height * k)), Image.LANCZOS)
    cells = [(refs, round(sole * k), 'Referencia del dueño')]
    for f, cap in frames:
        im = f['img']
        a = im.getchannel('A')
        bbox = im.getbbox()
        hx = round(f['head']['x'] * 2)
        t = next(y for y in range(256) if any(a.getpixel((x, y)) for x in range(hx - 9, hx + 10)))
        kk = H / (bbox[3] - t)
        big = im.crop(bbox).resize((round((bbox[2] - bbox[0]) * kk), round((bbox[3] - bbox[1]) * kk)), Image.NEAREST)
        cells.append((big, round((bbox[3] - bbox[1]) * kk), cap))
    pad = 36
    W = sum(c[0].width for c in cells) + pad * (len(cells) + 1)
    base = max(c[1] for c in cells) + 50
    Hh = base + max(c[0].height - c[1] for c in cells) + 24
    out = Image.new('RGBA', (W, Hh), (12, 14, 20, 255))
    d = ImageDraw.Draw(out)
    x = pad
    for im, sl, cap in cells:
        out.alpha_composite(im, (x, base - sl))
        d.text((x, 12), cap, font=FONTB, fill=GOLD)
        x += im.width + pad
    d.line([(0, base), (W, base)], fill=(70, 70, 90, 255))
    d.line([(0, base - H), (W, base - H)], fill=(70, 70, 90, 255))
    return out


def grid_sheet(title, sub, frames, caps, k=2, top=None, label=LABELS, release=None):
    keys = []
    for f in frames:
        if f['key'] not in keys:
            keys.append(f['key'])
    box = union_box(frames)
    cw, ch = (box[2] - box[0]) * k, (box[3] - box[1]) * k
    lab_w, cap_h, gap = 230, 24, 8
    n = max(f['frame'] for f in frames) + 1
    W = max(lab_w + n * (cw + gap) + gap, top.width + 20 if top else 0)
    head_h = 80 + (top.height + 20 if top else 0)
    H = head_h + len(keys) * (ch + cap_h + gap) + 10
    out = Image.new('RGBA', (W, H), BG)
    d = ImageDraw.Draw(out)
    d.text((14, 12), title, font=FONTT, fill=GOLD)
    d.text((14, 46), sub, font=FONT, fill=TXT)
    y = 80
    if top:
        out.alpha_composite(top, (10, y))
        y += top.height + 20
    for key in keys:
        text_block(d, (12, y + cap_h + 10), label.get(key, key), FONTB, GOLD)
        x = lab_w
        for f in sorted((f for f in frames if f['key'] == key), key=lambda f: f['frame']):
            out.alpha_composite(cell(f['img'], box, k), (x, y + cap_h))
            hl = release is not None and f['frame'] == release
            d.text((x + 2, y + 3), caps[f['frame']], font=FONTB if hl else FONT, fill=HI if hl else TXT)
            if hl:
                d.rectangle([x - 2, y + cap_h - 2, x + cw + 1, y + cap_h + ch + 1], outline=HI, width=2)
            x += cw + gap
        y += ch + cap_h + gap
    return out


def gif(path, frames, caps, fps, k=3, cols=4, label=LABELS, title=''):
    keys = []
    for f in frames:
        if f['key'] not in keys:
            keys.append(f['key'])
    box = union_box(frames, 2)
    cw, ch = (box[2] - box[0]) * k, (box[3] - box[1]) * k
    lab_h, gap = 52, 6
    rows = (len(keys) + cols - 1) // cols
    W = cols * (cw + gap) + gap
    H = 40 + rows * (ch + lab_h + gap) + gap
    n = max(f['frame'] for f in frames) + 1
    out_frames = []
    for i in range(n):
        im = Image.new('RGBA', (W, H), BG)
        d = ImageDraw.Draw(im)
        d.text((10, 8), f'{title}   cuadro {caps[i]}', font=FONTB, fill=GOLD)
        for j, key in enumerate(keys):
            x = gap + (j % cols) * (cw + gap)
            y = 40 + (j // cols) * (ch + lab_h + gap)
            text_block(d, (x + 4, y + 2), label.get(key, key).replace('\n', ' ', 1), FONT, TXT, 2)
            f = next(f for f in frames if f['key'] == key and f['frame'] == i)
            im.alpha_composite(cell(f['img'], box, k), (x, y + lab_h))
        out_frames.append(im.convert('RGB'))
    # one shared palette for every frame, so colours do not flicker
    strip = Image.new('RGB', (W, H * n))
    for i, f in enumerate(out_frames):
        strip.paste(f, (0, H * i))
    pal = strip.quantize(colors=255, method=Image.Quantize.MEDIANCUT)
    pframes = [f.quantize(palette=pal, dither=Image.Dither.NONE) for f in out_frames]
    # GIF delays are in 10 ms steps: spread the rounding so the loop keeps the pose's exact fps
    t = [round(i * 100 / fps) * 10 for i in range(n + 1)]
    durs = [t[i + 1] - t[i] for i in range(n)]
    pframes[0].save(path, save_all=True, append_images=pframes[1:], duration=durs, loop=0, disposal=1, optimize=False)
    print(path, (W, H), n, 'frames at', fps, 'fps')


THROW_CAPS = ['0 · carga', '1 · armado', '2 · lanzar', '3 · LANZAMIENTO', '4 · seguimiento']
PIERCE_CAPS = ['0 · guardia', '1 · recogida', '2 · estocada', '3 · impacto', '4 · retroceso']

lanz = load('raw_lanz')
rel = [f for f in lanz if f['frame'] == 3 and f['key'] in ('male', 'Akira', 'Aiden')]
top = side_by_side([(f, {'male': 'Nuestro lanzamiento (cuadro 3)', 'Akira': 'Akira, cuadro 3', 'Aiden': 'Aiden, cuadro 3'}[f['key']]) for f in sorted(rel, key=lambda f: ['male', 'Akira', 'Aiden'].index(f['key']))])
sheet = grid_sheet(
    'Arrojar arma (pose "throw") · 5 cuadros a 8 fps',
    'Cuadro 2: el brazo lanza el arma al frente, recta al blanco. Cuadro 3: la pose de tu referencia, donde empieza el phase (la mano abierta; el arma ya vuela, la dibuja el efecto).',
    lanz, THROW_CAPS, k=2, top=top, release=3)
sheet.convert('RGB').save(S + 'lanzamiento.png')
print(S + 'lanzamiento.png', sheet.size)
gif(S + 'lanzamiento.gif', lanz, THROW_CAPS, 8, cols=5, title='Arrojar arma · 8 fps')

esto = load('raw_esto')
lab = dict(LABELS)
lab['unarmed'] = UNARMED_PIERCE
sheet = grid_sheet(
    'Estocada (pose "pierce") · 5 cuadros a 8 fps',
    'Guardia, recogida a la cadera con la punta al frente, estocada a fondo (brazo recto, arma nivelada al blanco, mano libre atrás), impacto sostenido y retroceso.',
    esto, PIERCE_CAPS, k=2, label=lab)
sheet.convert('RGB').save(S + 'estocada.png')
print(S + 'estocada.png', sheet.size)
gif(S + 'estocada.gif', esto, PIERCE_CAPS, 8, cols=5, label=lab, title='Estocada · 8 fps')
