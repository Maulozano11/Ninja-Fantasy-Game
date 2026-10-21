"""vsref.py out ours.png before.png: the reduced reference's head beside our female idle (her eyes) and before, at 8x."""
import sys
sys.path.insert(0, 'tools/refs')
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import heroine_ref as H

out, ours, before = sys.argv[1:4]
x0, y0, w, h, k = 106, 118, 40, 40, 8


def font(size):
    return ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', size)


F = font(20)
S = font(18)


def tile(a):
    c = a[y0:y0 + h, x0:x0 + w]
    bg = np.full(c.shape[:2] + (3,), (226, 226, 232), np.uint8)
    m = c[..., 3] > 0
    bg[m] = c[m, :3]
    return Image.fromarray(bg).resize((w * k, h * k), Image.NEAREST)


panels = [('Referencia reducida (estudio)', tile(H.reduced('saya'))),
          ('En el juego: ojos de Saya', tile(np.asarray(Image.open(ours).convert('RGBA')))),
          ('Antes: ojos normales', tile(np.asarray(Image.open(before).convert('RGBA'))))]
W = 30 + len(panels) * (w * k + 50)
im = Image.new('RGB', (W, h * k + 156), (255, 255, 255))
d = ImageDraw.Draw(im)
for i, (lab, t) in enumerate(panels):
    x = 30 + i * (w * k + 50)
    d.text((x, 12), lab, fill=(20, 20, 30), font=F)
    im.paste(t, (x, 50))
d.text((30, h * k + 62), 'Cuerpo femenino, quieta, cuadro 0, a 8x.', fill=(60, 60, 70), font=S)
d.text((30, h * k + 90), 'Los ojos van en las filas de nuestra cara; en el estudio estaban 3 filas más arriba,', fill=(60, 60, 70), font=S)
d.text((30, h * k + 118), 'sobre su cabeza más pequeña.', fill=(60, 60, 70), font=S)
im.save(out)
