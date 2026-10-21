"""The owner's comparison sheets for Lyra's eyes:
owner_sheet.py <repo> <dir with d-*.png> <reduced.png> <out dir>
  ojos-lyra-comparacion.png  his picture | the study's reduction | before | after (bald), same size
  ojos-lyra-detalle.png      his eye | ours, eye region, same size
  ojos-lyra-con-pelo.png     before | after with an existing long hairstyle in her auburn, and 1x/2x
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

repo, d, reduced, out = sys.argv[1:5]
sys.path.insert(0, os.path.join(repo, 'tools/refs'))
import heroine_ref as H  # noqa: E402

pic = Image.open(os.path.join(repo, H.REFS['lyra'])).convert('RGB')
xs, ys = H.grid('lyra')
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 20)
small = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 15)


def her(x0, y0, x1, y1, W, Hh):
    """His picture over her pixels x0..x1, y0..y1 (block bounds), resized to W x Hh."""
    return pic.crop((xs[x0], ys[y0], xs[x1], ys[y1])).resize((W, Hh), Image.NEAREST)


def ours(path, x0, y0, w, h, W, Hh):
    a = np.asarray(Image.open(path).convert('RGBA'))[y0:y0 + h, x0:x0 + w]
    bg = np.zeros(a.shape[:2] + (3,), np.uint8)
    yy, xx = np.mgrid[0:h, 0:w]
    bg[:] = 236
    bg[((yy + xx) % 2) == 0] = 222
    m = a[..., 3] > 0
    bg[m] = a[m, :3]
    return Image.fromarray(bg).resize((W, Hh), Image.NEAREST)


def sheet(panels, path, note=None):
    pad, top = 16, 40
    W = sum(p.width for p, _ in panels) + pad * (len(panels) + 1)
    Hh = max(p.height for p, _ in panels) + top + pad + (28 if note else 0)
    s = Image.new('RGB', (W, Hh), (40, 38, 48))
    dr = ImageDraw.Draw(s)
    x = pad
    for im, label in panels:
        s.paste(im, (x, top))
        dr.text((x, 8), label, fill=(255, 240, 200), font=font)
        x += im.width + pad
    if note:
        dr.text((pad, Hh - 32), note, fill=(200, 200, 210), font=small)
    s.save(path)


# The face: her x 88-116, rows 18-50 (her eyes at x 99 and 109.5, lash at row 27); ours the same
# face at our scale (0.56 across, 0.51 down, her lash on our lash row 141): x 119-135, rows 136-152.
S = 18
W, Hh = 16 * S, 17 * S
panels = [
    (her(88, 18, 116, 50, W, Hh), 'Tu dibujo'),
    (ours(reduced, 119, 133, 16, 17, W, Hh), 'Reducida (estudio)'),
    (ours(os.path.join(d, 'd-std.png'), 119, 136, 16, 17, W, Hh), 'Antes'),
    (ours(os.path.join(d, 'd-keen.png'), 119, 136, 16, 17, W, Hh), 'Ojos de Lyra'),
]
sheet(panels, os.path.join(out, 'ojos-lyra-comparacion.png'),
      'Mismo tamaño: su cara (Tu dibujo) y la nuestra a nuestra escala; la reducida del estudio tiene los ojos 3 filas más arriba.')

# The eyes alone: her x 92-113, rows 22-35; ours x 121-133+3, rows 138-146.
S = 30
W, Hh = 16 * S, 8 * S
sheet([(her(92, 22, 113, 35, W, Hh), 'Tu dibujo'), (ours(os.path.join(d, 'd-keen.png'), 121, 138, 16, 8, W, Hh), 'En el juego')],
      os.path.join(out, 'ojos-lyra-detalle.png'), 'Cejas, pestañas, blanco e iris: cada píxel es un color de su dibujo (la piel es la nuestra).')

# In context, with an existing long hairstyle (Ribbon Cascade) in her auburn: 8x, and 1x / 2x.
k = 8
a = ours(os.path.join(d, 'd-std-hair.png'), 104, 120, 46, 40, 46 * k, 40 * k)
b = ours(os.path.join(d, 'd-keen-hair.png'), 104, 120, 46, 40, 46 * k, 40 * k)
s1 = ours(os.path.join(d, 'd-keen-hair.png'), 96, 120, 64, 104, 64, 104)
s2 = ours(os.path.join(d, 'd-keen-hair.png'), 96, 120, 64, 104, 128, 208)
sheet([(a, 'Antes (con pelo)'), (b, 'Ojos de Lyra (con pelo)'), (s1, '1x'), (s2, '2x')], os.path.join(out, 'ojos-lyra-con-pelo.png'),
      'El pelo es uno que ya existe (Ribbon Cascade) en su color, solo para ver los ojos en contexto.')
