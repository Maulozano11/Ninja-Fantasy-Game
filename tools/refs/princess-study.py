"""The study previews of the owner's princess (tools/refs/princess_ref.py), with Spanish labels for him.

  python3 -I tools/refs/princess-study.py <out dir> [idle]   writes native@4.png, parts@4.png,
                                                             overlay@4.png, palette.png
  python3 -I tools/refs/princess-study.py --palette          prints PALETTE for princess_ref.py

<idle> is the prefix tools/refs/princess-idle.ts wrote (our female idle frame 0, <idle>.rgba and
<idle>.json); without it the overlay is not drawn. Run from the repository root.
"""

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image, ImageDraw, ImageFont  # noqa: E402

import princess_ref as P  # noqa: E402

FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
ES = {
    'hair_back': 'Pelo (detrás)',
    'underskirt': 'Falda interior + enagua',
    'shoes': 'Zapatos',
    'body': 'Piel (hombros, escote, manos)',
    'overskirt': 'Sobrefalda abierta',
    'bodice': 'Corpiño + cuello alto',
    'sleeve_far': 'Manga lejana',
    'sleeve_near': 'Manga cercana',
    'face': 'Cara',
    'eyes': 'Ojos',
    'hair_front': 'Pelo (delante)',
    'tiara': 'Tiara',
    'sceptre': 'Cetro',
    'sparkles': 'Destellos',
}
COLORS = [(230, 25, 75), (60, 180, 75), (255, 225, 25), (0, 130, 200), (245, 130, 48), (145, 30, 180),
          (70, 240, 240), (240, 50, 230), (210, 245, 60), (250, 190, 212), (0, 128, 128), (170, 140, 255),
          (170, 110, 40), (128, 0, 0)]
BG = (236, 233, 226)


def font(size, bold=False):
    try:
        return ImageFont.truetype(BOLD if bold else FONT, size)
    except OSError:
        return ImageFont.load_default()


def up(rgb, k):
    img = Image.fromarray(np.asarray(rgb).astype(np.uint8))
    return img.resize((img.width * k, img.height * k), Image.NEAREST)


def on_bg(rgba, bg=BG):
    a = np.asarray(rgba).astype(float)
    al = a[..., 3:4] / 255
    return (a[..., :3] * al + np.array(bg) * (1 - al)).astype(np.uint8)


def titled(img, title, sub=None, pad=12):
    f, fs = font(22, True), font(15)
    h = 34 + (22 if sub else 0)
    probe = ImageDraw.Draw(Image.new('RGB', (1, 1)))
    tw = max(probe.textlength(title, font=f), probe.textlength(sub or '', font=fs))
    out = Image.new('RGB', (max(img.width, int(tw) + 4) + 2 * pad, img.height + h + pad), (250, 248, 243))
    d = ImageDraw.Draw(out)
    d.text((pad, 6), title, fill=(30, 25, 35), font=f)
    if sub:
        d.text((pad, 34), sub, fill=(80, 70, 90), font=fs)
    out.paste(img, (pad, h))
    return out


def row(imgs, gap=10, bg=(250, 248, 243)):
    W = sum(i.width for i in imgs) + gap * (len(imgs) - 1)
    H = max(i.height for i in imgs)
    out = Image.new('RGB', (W, H), bg)
    x = 0
    for i in imgs:
        out.paste(i, (x, 0))
        x += i.width + gap
    return out


def col(imgs, gap=10, bg=(250, 248, 243)):
    W = max(i.width for i in imgs)
    H = sum(i.height for i in imgs) + gap * (len(imgs) - 1)
    out = Image.new('RGB', (W, H), bg)
    y = 0
    for i in imgs:
        out.paste(i, (0, y))
        y += i.height + gap
    return out


def bbox(mask, pad=2):
    ys, xs = np.nonzero(mask)
    return max(0, xs.min() - pad), max(0, ys.min() - pad), min(P.SIZE, xs.max() + 1 + pad), min(P.SIZE, ys.max() + 1 + pad)


def native_sheet(out):
    """His picture beside his pixels (native), both at 4 fine pixels per his pixel."""
    k = 4
    pic = Image.open(P.REF).convert('RGB').resize((P.SIZE * k, P.SIZE * k), Image.NEAREST)
    N = P.native()
    a = titled(pic, 'Tu dibujo', '2000 x 2000, reducido a la misma escala')
    b = titled(up(N, k), 'Tus píxeles', '100 x 100: 1 píxel tuyo = 20 x 20 de la imagen')
    fig = P.figure()
    g = np.where(fig[..., None], N, 255)
    for x in range(0, P.SIZE, 10):
        g[:, x] = np.where(fig[:, x, None], g[:, x], [255, 200, 200])
    for y in range(0, P.SIZE, 10):
        g[y, :] = np.where(fig[y, :, None], g[y, :], [255, 200, 200])
    c = titled(up(g, k), 'Rejilla cada 10 píxeles', 'su figura: 97 de alto (tiara a suela)')
    row([a, b, c]).save(os.path.join(out, 'native@4.png'))


def parts_sheet(out):
    """The part map and each part alone, his pixels at 4 (8 for the small ones)."""
    N = P.native()
    pm = P.part_map()
    k = 4
    m = np.full((P.SIZE, P.SIZE, 3), 255.0)
    for i, name in enumerate(P.PARTS):
        sel = pm == i
        m[sel] = np.array(COLORS[i]) * 0.65 + N[sel] * 0.35
    legend = Image.new('RGB', (300, max(P.SIZE * k, 30 * len(P.PARTS) + 30)), (250, 248, 243))
    d = ImageDraw.Draw(legend)
    f = font(16)
    for i, name in enumerate(P.PARTS):
        y = 8 + i * 27
        d.rectangle([4, y, 24, y + 18], fill=COLORS[i], outline=(0, 0, 0))
        d.text((32, y), f'{i + 1:2d}  {ES[name]}', fill=(30, 25, 35), font=f)
    d.text((4, 8 + len(P.PARTS) * 27 + 8), 'Orden: 1 al fondo, 14 delante', fill=(80, 70, 90), font=f)
    top = row([titled(up(N, k), 'Tu princesa'), titled(up(m, k), 'Sus partes'), titled(legend, 'Partes')])
    tiles = []
    for i, name in enumerate(P.PARTS):
        sel = pm == i
        x0, y0, x1, y1 = bbox(sel)
        crop = np.where(sel[y0:y1, x0:x1, None], N[y0:y1, x0:x1], np.array(BG))
        kk = 8 if max(x1 - x0, y1 - y0) < 40 else 4
        tiles.append(titled(up(crop, kk), f'{i + 1}. {ES[name]}', f'{int(sel.sum())} píxeles'))
    rows, cur, w = [], [], 0
    for t in tiles:
        if cur and w + t.width > top.width:
            rows.append(row(cur))
            cur, w = [], 0
        cur.append(t)
        w += t.width + 10
    if cur:
        rows.append(row(cur))
    col([top] + rows, gap=16).save(os.path.join(out, 'parts@4.png'))


def load_idle(prefix):
    rgba = np.fromfile(prefix + '.rgba', np.uint8).reshape(P.GRID, P.GRID, 4)
    with open(prefix + '.json') as fh:
        joints = json.load(fh)
    return rgba, joints


def marks(img, pts, k, ox, oy, colour, r=4):
    d = ImageDraw.Draw(img)
    for x, y in pts:
        X, Y = (x - ox) * k, (y - oy) * k
        d.ellipse([X - r, Y - r, X + r, Y + r], outline=colour, width=2)


def overlay_sheet(out, idle):
    """Our female idle; his princess laid on it whole (OFFSET) and part by part (PART_OFFSET), at 4."""
    rgba, ours = load_idle(idle)
    k = 4
    x0, y0, x1, y1 = 70, 108, 170, 224
    crop = lambda a: a[y0:y1, x0:x1]
    body = on_bg(crop(rgba))
    whole = P.placed()
    ov = body.astype(float).copy()
    al = crop(whole)[..., 3:4] / 255 * 0.6
    ov = (crop(whole)[..., :3] * al + ov * (1 - al)).astype(np.uint8)
    parts = np.zeros((P.GRID, P.GRID, 4), np.uint8)
    for name in P.LAYERS:
        p = P.placed(name)
        sel = p[..., 3] > 0
        parts[sel] = p[sel]
    pt = crop(parts)
    pb = body.copy()
    sel = pt[..., 3] > 0
    pb[sel] = pt[sel][:, :3]
    a = up(body, k)
    marks(a, ours.values(), k, x0, y0, (0, 160, 60))
    b = up(ov, k)
    marks(b, ours.values(), k, x0, y0, (0, 160, 60))
    marks(b, [(x + P.OFFSET[0], y + P.OFFSET[1]) for x, y in P.JOINTS.values()], k, x0, y0, (220, 30, 120))
    c = up(pb, k)
    marks(c, ours.values(), k, x0, y0, (0, 160, 60))
    leg = 'verde: nuestras articulaciones; rosa: las suyas'
    row([titled(a, 'Nuestro cuerpo femenino', 'en reposo, cuadro 0'),
         titled(b, 'Tu princesa encima (60%)', leg),
         titled(c, 'Cada parte en su sitio', 'movida a nuestro esqueleto, sin reescalar')]).save(
        os.path.join(out, 'overlay@4.png'))


def palette_sheet(out):
    pal = P.PALETTE
    n = len(pal)
    cols = 12
    rows = (n + cols - 1) // cols
    s = 56
    img = Image.new('RGB', (cols * s, rows * (s + 16)), (250, 248, 243))
    d = ImageDraw.Draw(img)
    f = font(11)
    for i, c in enumerate(pal):
        x, y = (i % cols) * s, (i // cols) * (s + 16)
        d.rectangle([x + 4, y + 4, x + s - 4, y + s - 4], fill=tuple(int(v) for v in c), outline=(0, 0, 0))
        d.text((x + 4, y + s - 2), P.rgb_hex(c), fill=(30, 25, 35), font=f)
    titled(img, f'Tus colores ({n})', 'de su figura, del más oscuro al más claro').save(os.path.join(out, 'palette.png'))


def main():
    if sys.argv[1:2] == ['--palette']:
        pal = P._palette()
        print('PALETTE_HEX = [')
        for i in range(0, len(pal), 8):
            print('    ' + ', '.join(f"'{P.rgb_hex(c)}'" for c in pal[i:i + 8]) + ',')
        print(']')
        return
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    native_sheet(out)
    parts_sheet(out)
    palette_sheet(out)
    if len(sys.argv) > 2:
        overlay_sheet(out, sys.argv[2])


if __name__ == '__main__':
    main()
