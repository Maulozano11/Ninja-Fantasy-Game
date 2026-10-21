"""cmp.py <repo> <out.png> label=png ... : her face (native at 4x ~ ours at 8x), then our frame crops at 8x."""
import sys
sys.path.insert(0, sys.argv[1] + '/tools/refs')
import numpy as np
from PIL import Image, ImageDraw
import heroine_ref as H

out = sys.argv[2]
X0, X1, Y0, Y1 = 117, 137, 135, 152
K = 16


def panel(c, k):
    bg = np.full(c.shape[:2] + (3,), 236, np.uint8)
    m = c[..., 3] > 0
    bg[m] = c[m, :3]
    return Image.fromarray(np.kron(bg, np.ones((k, k, 1), np.uint8)))


N = H.native('elise').astype(np.uint8)
nat = N[20:52, 86:118]
nat = np.concatenate([nat, np.full(nat.shape[:2] + (1,), 255, np.uint8)], 2)
panels = [('Tu dibujo (sus pixeles)', panel(nat, 9))]
R = H.reduced('elise')
panels.append(('Referencia reducida', panel(R[Y0:Y1, X0:X1], K)))
for s in sys.argv[3:]:
    label, path = s.split('=', 1)
    A = np.asarray(Image.open(path).convert('RGBA'))
    panels.append((label, panel(A[Y0:Y1, X0:X1], K)))
W = sum(p.width for _, p in panels) + 12 * (len(panels) + 1)
Hh = max(p.height for _, p in panels) + 40
sheet = Image.new('RGB', (W, Hh), (255, 255, 255))
d = ImageDraw.Draw(sheet)
x = 12
for label, p in panels:
    sheet.paste(p, (x, 34))
    d.text((x, 10), label, fill=(0, 0, 0))
    x += p.width + 12
sheet.save(out)
