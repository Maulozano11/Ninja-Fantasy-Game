# Lays out the owner's sample (frames recoloured by make.mts with src/sprite/vfxTint.ts) with Spanish
# labels sized for a phone: muestra-<elemento>-<n>.png, destacados.png, en-el-mapa-<n>.png and the GIFs.
# Run by make.mts:  python3 -I compose.py work/plan.json
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

plan = json.load(open(sys.argv[1]))
OUT = plan['out']
BG = (21, 23, 27, 255)
CELL = (30, 33, 39, 255)
INK = (238, 234, 222, 255)
DIM = (170, 174, 182, 255)
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
FONT_R = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
font = lambda n, bold=True: ImageFont.truetype(FONT if bold else FONT_R, n)
M, G = 28, 18  # margin, gap
# Where each of his frames was put, for check.py to compare with his sheets on its own.
PLACED = []


def load(p):
    return Image.open(p).convert('RGBA')


def bbox_union(imgs, pad=3):
    box = None
    for im in imgs:
        b = im.getchannel('A').getbbox()
        if not b:
            continue
        box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
    if box is None:
        return (0, 0, 1, 1)
    w, h = imgs[0].size
    return (max(0, box[0] - pad), max(0, box[1] - pad), min(w, box[2] + pad), min(h, box[3] + pad))


def up(im, k):
    return im.resize((im.width * k, im.height * k), Image.NEAREST)


def scale_for(w):
    # Small effects big enough to read on a phone; the big ones at 2x or 1x (never shrunk).
    return 4 if w <= 90 else 3 if w <= 130 else 2 if w <= 340 else 1


def text_w(d, s, f):
    return d.textbbox((0, 0), s, font=f)[2]


def hexrgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


def swatch(d, x, y, size, rid):
    if rid == 'orig':
        return
    d.rectangle((x, y, x + size, y + size), fill=hexrgb(plan['hex'][rid]), outline=(235, 235, 235, 255), width=3)


def wrap(d, text, f, width):
    words, lines, cur = text.split(), [], ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if text_w(d, t, f) <= width or not cur:
            cur = t
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def sizes(W):
    """Font sizes for a picture W px wide: labels about 4% of the width, so they read on a phone."""
    return {'title': round(max(64, 0.046 * W)), 'note': round(max(40, 0.028 * W)), 'label': round(max(54, 0.04 * W))}


def header(W, title, notes):
    """Title and notes, wrapped to the width: returns (image, height)."""
    z = sizes(W)
    f_t, f_n = font(z['title']), font(z['note'], False)
    tmp = ImageDraw.Draw(Image.new('RGBA', (8, 8)))
    tl = wrap(tmp, title, f_t, W - 2 * M)
    lines = [l for n in notes for l in wrap(tmp, n, f_n, W - 2 * M)]
    th, nh = round(z['title'] * 1.2), round(z['note'] * 1.3)
    H = M + len(tl) * th + 10 + len(lines) * nh + 16
    im = Image.new('RGBA', (W, H), BG)
    d = ImageDraw.Draw(im)
    y = M
    for l in tl:
        d.text((M, y), l, font=f_t, fill=INK)
        y += th
    y += 10
    for l in lines:
        d.text((M, y), l, font=f_n, fill=DIM)
        y += nh
    return im, H


# --- 1. the sheets ----------------------------------------------------------------------------------
def page_rows(pg):
    rows, cols = pg['rows'], pg['cols']
    imgs = [{rid: load(f) for rid, f in c['cells'].items()} for c in cols]
    boxes = [bbox_union(list(ci.values())) for ci in imgs]
    ks = [scale_for(b[2] - b[0]) for b in boxes]
    if len(cols) == 1:  # alone on its page: as big as reads well
        ks = [max(ks[0], min(4, 900 // (boxes[0][2] - boxes[0][0])))]
    tmp = ImageDraw.Draw(Image.new('RGBA', (8, 8)))
    ch = max((b[3] - b[1]) * k for b, k in zip(boxes, ks))
    W = 1100
    for _ in range(3):  # the labels grow with the width, and the columns with the labels
        lab = sizes(W)['label']
        f_col, f_row, f_nat = font(lab - 4), font(lab), font(round(lab * 0.8))
        cw = [max((b[2] - b[0]) * k, text_w(tmp, c['label'], f_col) + 10) for b, k, c in zip(boxes, ks, cols)]
        W = max(1100, sum(cw) + G * (len(cols) - 1) + 2 * M)
    head, hh = header(W, pg['title'], pg['notes'])
    band, colh = round(lab * 1.35), round(lab * 1.25)
    rowh = band + ch + 24
    H = hh + colh + len(rows) * (rowh + G) + M
    can = Image.new('RGBA', (W, H), BG)
    can.alpha_composite(head)
    d = ImageDraw.Draw(can)
    x0 = (W - (sum(cw) + G * (len(cols) - 1))) // 2
    x = x0
    for i, c in enumerate(cols):
        d.text((x + (cw[i] - text_w(d, c['label'], f_col)) // 2, hh + 4), c['label'], font=f_col, fill=INK)
        x += cw[i] + G
    y = hh + colh
    for rid, name in rows:
        d.rectangle((M // 2, y, W - M // 2, y + rowh), fill=CELL)
        swatch(d, M, y + 14, round(lab * 0.85), rid)
        d.text((M + (round(lab * 1.15) if rid != 'orig' else 0), y + 8), name, font=f_row, fill=INK if rid != 'orig' else DIM)
        x = x0
        for i, c in enumerate(cols):
            if rid in c['natural']:
                t = '= tu dibujo'
                d.text((x + (cw[i] - text_w(d, t, f_nat)) // 2, y + band + (ch - lab) // 2), t, font=f_nat, fill=DIM)
            else:
                im = up(imgs[i][rid].crop(boxes[i]), ks[i])
                at = (x + (cw[i] - im.width) // 2, y + band + 12 + (ch - im.height) // 2)
                can.alpha_composite(im, at)
                if rid == 'orig':
                    PLACED.append({'out': pg['file'], 'src': c['cells']['orig'], 'at': at, 'k': ks[i], 'box': boxes[i]})
            x += cw[i] + G
        y += rowh + G
    return can


def page_grid(pg):
    rows, c = pg['rows'], pg['cols'][0]
    imgs = {rid: load(f) for rid, f in c['cells'].items()}
    box = bbox_union(list(imgs.values()))
    k = scale_for(box[2] - box[0])
    cw, ch = (box[2] - box[0]) * k, (box[3] - box[1]) * k
    n = max(1, min(3, (1950 - 2 * M + G) // (cw + G)))
    W = max(1100, n * cw + (n - 1) * G + 2 * M)
    head, hh = header(W, pg['title'], pg['notes'])
    lab = sizes(W)['label']
    band = round(lab * 1.4)
    cellh = band + ch + 16
    nrows = (len(rows) + n - 1) // n
    H = hh + nrows * (cellh + G) + M
    can = Image.new('RGBA', (W, H), BG)
    can.alpha_composite(head)
    d = ImageDraw.Draw(can)
    f_lab = font(lab)
    x0 = (W - (n * cw + (n - 1) * G)) // 2
    for j, (rid, name) in enumerate(rows):
        x = x0 + (j % n) * (cw + G)
        y = hh + (j // n) * (cellh + G)
        d.rectangle((x, y, x + cw, y + cellh), fill=CELL)
        swatch(d, x + 14, y + 16, round(lab * 0.85), rid)
        d.text((x + (round(lab * 1.3) if rid != 'orig' else 16), y + 10), name, font=f_lab, fill=INK if rid != 'orig' else DIM)
        im = up(imgs[rid].crop(box), k)
        can.alpha_composite(im, (x, y + band + 8))
        if rid == 'orig':
            PLACED.append({'out': pg['file'], 'src': c['cells']['orig'], 'at': (x, y + band + 8), 'k': k, 'box': box})
    return can


for pg in plan['pages']:
    can = page_rows(pg) if pg['mode'] == 'rows' else page_grid(pg)
    can.convert('RGB').save(os.path.join(OUT, pg['file']))
    print(pg['file'], can.size)


# --- 2. highlights ---------------------------------------------------------------------------------
def destacados():
    items = plan['destacados']
    rows = []
    b_of = {}
    for it in items:
        o, t = load(it['orig']), load(it['tinted'])
        b = bbox_union([o, t])
        b_of[it['orig']] = b
        k = scale_for(b[2] - b[0])
        rows.append((it, up(o.crop(b), k), up(t.crop(b), k)))
    cw = max(r[1].width for r in rows)
    W = max(1100, 2 * cw + G + 2 * M)
    head, hh = header(W, 'Destacados: tu dibujo y el nuevo color', [
        'Izquierda tu dibujo, derecha el mismo cuadro en el color del chakra. Sin aura: solo el jutsu.',
        'Blanco: luz con sombra plateada (en el fuego, dorada). Negro: oscuro con borde violeta; el fuego y el rayo con el corazón rojo.',
    ])
    lab = sizes(W)['label']
    f_title, f_lab = font(lab + 4), font(lab - 6)
    top = round(lab * 2.7)
    H = hh + sum(r[1].height + top + 12 for r in rows) + G * len(rows) + M
    can = Image.new('RGBA', (W, H), BG)
    can.alpha_composite(head)
    d = ImageDraw.Draw(can)
    y = hh
    x0 = (W - (2 * cw + G)) // 2
    for it, o, t in rows:
        rh = o.height + top + 12
        d.rectangle((M // 2, y, W - M // 2, y + rh), fill=CELL)
        swatch(d, M, y + 16, round(lab * 0.85), it['color'])
        d.text((M + round(lab * 1.2), y + 8), it['title'], font=f_title, fill=INK)
        for k, (im, name) in enumerate(((o, 'Tu dibujo'), (t, it['es']))):
            x = x0 + k * (cw + G)
            d.text((x + (cw - text_w(d, name, f_lab)) // 2, y + round(lab * 1.45)), name, font=f_lab, fill=DIM if k == 0 else INK)
            can.alpha_composite(im, (x + (cw - im.width) // 2, y + top))
            if k == 0:
                PLACED.append({'out': 'destacados.png', 'src': it['orig'], 'at': (x + (cw - im.width) // 2, y + top), 'k': scale_for(b_of[it['orig']][2] - b_of[it['orig']][0]), 'box': b_of[it['orig']]})
        y += rh + G
    can.convert('RGB').save(os.path.join(OUT, 'destacados.png'))
    print('destacados.png', can.size)


destacados()


# --- 3. on the battle map -----------------------------------------------------------------------------
def mapa(mp):
    root = plan['root']
    ground = Image.open(os.path.join(root, 'src/assets/maps/river_forest/ground.webp')).convert('RGBA')
    x0, y0, x1, y1 = mp['crop']
    can = Image.new('RGBA', (x1 - x0, y1 - y0), (18, 34, 31, 255))
    can.alpha_composite(ground.crop((x0, y0, x1, y1)))
    things = [dict(t, kind='char') for t in mp['chars']] + [dict(t, kind='fx') for t in mp['fx']]
    things.sort(key=lambda t: t['ground'])
    labels = []
    for t in things:
        im = load(t['file'])
        px, py = t['X'] - t['ax'] - x0, t['Y'] - t['ay'] - y0
        layer = Image.new('RGBA', can.size, (0, 0, 0, 0))
        layer.paste(im, (px, py))
        can.alpha_composite(layer)
        if t.get('label'):
            b = im.getchannel('A').getbbox()
            labels.append((t['label'], px + (b[0] + b[2]) // 2, py + b[3]))
    S = 2
    big = up(can, S)
    d = ImageDraw.Draw(big)
    f = font(56)
    for lab, cx, by in labels:
        tw = text_w(d, lab, f)
        X = min(max(16, cx * S - tw // 2), big.width - tw - 16)
        Y = min(by * S + 8, big.height - 76)
        d.rounded_rectangle((X - 12, Y - 4, X + tw + 12, Y + 68), 10, fill=(0, 0, 0, 185))
        d.text((X, Y), lab, font=f, fill=INK)
    ft = font(60)
    tw = text_w(d, mp['title'], ft)
    d.rounded_rectangle((14, 14, 14 + tw + 32, 14 + 80), 12, fill=(0, 0, 0, 185))
    d.text((30, 22), mp['title'], font=ft, fill=INK)
    fs = font(44, False)
    sub = 'A la escala del juego, imagen al 2x. Sin aura.'
    d.rounded_rectangle((14, 102, 14 + text_w(d, sub, fs) + 32, 102 + 62), 10, fill=(0, 0, 0, 185))
    d.text((30, 108), sub, font=fs, fill=INK)
    big.convert('RGB').save(os.path.join(OUT, mp['file']))
    print(mp['file'], big.size)


for mp in plan['mapas']:
    mapa(mp)


# --- 4. GIFs ---------------------------------------------------------------------------------------------
def to_gif_frame(rgb, keep):
    """An exact palette when the frame has 256 colours or fewer; otherwise his half (`keep`, a box) and
    the labels keep their exact colours and only the new colour's half is reduced to the rest."""
    a = np.asarray(rgb)
    flat = a.reshape(-1, 3)
    cols, inv = np.unique(flat, axis=0, return_inverse=True)
    if len(cols) <= 256:
        im = Image.fromarray(inv.reshape(a.shape[:2]).astype(np.uint8), 'P')
        im.putpalette(cols.astype(np.uint8).ravel().tolist() + [0] * (768 - 3 * len(cols)))
        return im, True
    kx0, ky0, kx1, ky1 = keep
    mask = np.zeros(a.shape[:2], bool)
    mask[ky0:ky1, kx0:kx1] = True
    exact = np.unique(a[mask].reshape(-1, 3), axis=0)
    rest = a.copy()
    rest[mask] = exact[0]
    # Text and background outside his half are few colours; the new colour's half is quantized.
    free = 256 - len(exact)
    q = Image.fromarray(rest).quantize(colors=max(2, free), method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
    qa = np.asarray(q).copy()
    qa[mask] = a[mask]
    cols, inv = np.unique(qa.reshape(-1, 3), axis=0, return_inverse=True)
    assert len(cols) <= 256, len(cols)
    im = Image.fromarray(inv.reshape(a.shape[:2]).astype(np.uint8), 'P')
    im.putpalette(cols.astype(np.uint8).ravel().tolist() + [0] * (768 - 3 * len(cols)))
    return im, False


def gif(g):
    parts = [(p, [load(f) for f in p['orig']['files']], [load(f) for f in p['tinted']['files']]) for p in g['parts']]
    boxes = [bbox_union(o + t, 4) for _, o, t in parts]
    k = min(scale_for(b[2] - b[0]) for b in boxes)
    cw = max((b[2] - b[0]) * k for b in boxes)
    chh = max((b[3] - b[1]) * k for b in boxes)
    title_h, lab_h = 84, 64
    W, H = max(G * 3 + cw * 2, 900), title_h + lab_h + chh + G
    ImageDraw.ImageDraw.fontmode = '1'  # no anti-aliased text: fewer colours, exact palettes
    f_t, f = font(52), font(44)
    frames, durs, exact_n = [], [], 0
    x0 = (W - (cw * 2 + G)) // 2
    for (p, o, t), b in zip(parts, boxes):
        for fi, (fo, ft) in enumerate(zip(o, t)):
            can = Image.new('RGBA', (W, H), BG)
            d = ImageDraw.Draw(can)
            d.text((G, 14), g['title'], font=f_t, fill=INK)
            for j, (im, lab) in enumerate(((fo, 'Tu dibujo'), (ft, g['es']))):
                x = x0 + j * (cw + G)
                d.rectangle((x, title_h + lab_h, x + cw, title_h + lab_h + chh), fill=CELL)
                d.text((x + (cw - text_w(d, lab, f)) // 2, title_h + 6), lab, font=f, fill=INK)
                c = up(im.crop(b), k)
                can.alpha_composite(c, (x + (cw - c.width) // 2, title_h + lab_h + (chh - c.height) // 2))
                if j == 0:
                    PLACED.append({'out': g['file'], 'frame': len(frames), 'src': p['orig']['files'][fi], 'at': (x + (cw - c.width) // 2, title_h + lab_h + (chh - c.height) // 2), 'k': k, 'box': b})
            fr, exact = to_gif_frame(can.convert('RGB'), (x0, title_h + lab_h, x0 + cw, title_h + lab_h + chh))
            exact_n += exact
            frames.append(fr)
            durs.append(round(1000 / p['orig']['fps']))
    ImageDraw.ImageDraw.fontmode = 'L'
    durs[-1] += 600  # a short pause before it loops
    frames[0].save(os.path.join(OUT, g['file']), save_all=True, append_images=frames[1:], duration=durs, loop=0, disposal=1, optimize=False)
    print(g['file'], (W, H), len(frames), 'frames,', exact_n, 'with an exact palette')


for g in plan['gifs']:
    gif(g)

json.dump(PLACED, open(os.path.join(os.path.dirname(sys.argv[1]), 'placed.json'), 'w'))
