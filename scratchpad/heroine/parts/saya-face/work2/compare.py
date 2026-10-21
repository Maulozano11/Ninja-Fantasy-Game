"""compare.py out ours.png [ours2.png label2]: her face (native pixels) beside ours at the same pixel scale
(one of hers is 0.65 of ours), Spanish labels; and her eyes beside ours, larger."""
import sys
sys.path.insert(0, 'tools/refs')
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import heroine_ref as H

out = sys.argv[1]
ours = [(sys.argv[2], 'En el juego')]
rest = sys.argv[3:]
while rest:
    ours.append((rest[0], rest[1]))
    rest = rest[2:]


def font(size):
    for p in ('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'):
        try:
            return ImageFont.truetype(p, size)
        except OSError:
            pass
    return ImageFont.load_default()


F = font(30)
BG = (232, 232, 236)


def tile(a, k):
    if a.shape[2] == 4:
        bg = np.full(a.shape[:2] + (3,), BG, np.uint8)
        m = a[..., 3] > 0
        bg[m] = a[m, :3]
        a = bg
    return Image.fromarray(a.astype(np.uint8)).resize((a.shape[1] * k, a.shape[0] * k), Image.NEAREST)


N = H.native('saya').astype(np.uint8)
rows = []
# head: hers x 92..124, y 12..44 at 13; ours 112..142, 124..154 at 20
heads = [('Tu dibujo', tile(N[12:44, 92:124], 13))]
eyes = [('Tu dibujo: ojos', tile(N[21:31, 99:120], 26))]
for p, lab in ours:
    a = np.asarray(Image.open(p).convert('RGBA'))
    heads.append((lab, tile(a[124:154, 112:142], 20)))
    eyes.append((lab + ': ojos', tile(a[137:145, 119:137], 40)))
for group in (heads, eyes):
    W = sum(t.width for _, t in group) + 40 * (len(group) + 1)
    Hh = max(t.height for _, t in group) + 70
    im = Image.new('RGB', (W, Hh), (255, 255, 255))
    d = ImageDraw.Draw(im)
    x = 40
    for lab, t in group:
        d.text((x, 14), lab, fill=(20, 20, 30), font=F)
        im.paste(t, (x, 60))
        x += t.width + 40
    rows.append(im)
W = max(r.width for r in rows)
sheet = Image.new('RGB', (W, sum(r.height for r in rows)), (255, 255, 255))
y = 0
for r in rows:
    sheet.paste(r, (0, y))
    y += r.height
sheet.save(out)
