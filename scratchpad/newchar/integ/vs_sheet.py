"""His picture, the reduced reference and our preset at idle, side by side at the same scale.
python3 -I vs_sheet.py <repo> <idle.png (256x256 at 1x)> <out.png>"""
import sys
import os
repo, ren, out = sys.argv[1:4]
sys.path.insert(0, os.path.join(repo, 'tools/refs'))
os.chdir(repo)
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import scarlet_ref as S

BG = (236, 230, 220)
INK = (40, 30, 24)
FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 34)
SMALL = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 22)

# His picture: his own pixels (one per his pixel), 5x. Ours: 9x (one of his pixels is 0.557 of ours,
# so 5 / 0.557 = 8.98: the figures come out the same size).
his = S.native()

K_HIS, K_OURS = 5, 9

def up(a, k):
    return np.kron(a, np.ones((k, k, 1), np.uint8))

def on_bg(a):
    o = np.empty(a.shape[:2] + (3,), np.uint8)
    o[:] = BG
    m = a[..., 3] > 0
    o[m] = a[m, :3]
    return o

red = S.reduced()
ours = np.asarray(Image.open(ren).convert('RGBA'))
m = (red[..., 3] > 0) | (ours[..., 3] > 0)
ys, xs = np.nonzero(m)
y0, y1, x0, x1 = ys.min() - 3, ys.max() + 4, xs.min() - 4, xs.max() + 5
# his figure's bottom (near sole) is his row 190, ours row ~218: align the soles
his_rgb = his[..., :3] if his.shape[-1] >= 3 else his
his_img = up(np.asarray(his_rgb, np.uint8), K_HIS)
red_img = up(on_bg(red[y0:y1, x0:x1]), K_OURS)
our_img = up(on_bg(ours[y0:y1, x0:x1]), K_OURS)

# soles: his near sole row 190 (scarlet_ref), ours: the lowest opaque row of the reduced figure
his_sole = 191 * K_HIS
our_sole = (ys.max() + 1 - y0) * K_OURS
top_pad = 70
H = max(his_img.shape[0], red_img.shape[0] + (his_sole - our_sole)) + top_pad + 60
gap = 40
W = his_img.shape[1] + red_img.shape[1] + our_img.shape[1] + gap * 4
sheet = Image.new('RGB', (W, H), BG)
d = ImageDraw.Draw(sheet)
x = gap
panels = [
    (his_img, 0, 'Tu dibujo', 'con la capa, como lo dibujaste'),
    (red_img, his_sole - our_sole, 'A nuestra escala', 'sin la capa, tus colores'),
    (our_img, his_sole - our_sole, 'El juego', 'Valen, reposo (cuadro 0)'),
]
for img, dy, label, sub in panels:
    sheet.paste(Image.fromarray(img), (x, top_pad + dy))
    d.text((x, 8), label, font=FONT, fill=INK)
    d.text((x, 46 - 4), sub, font=SMALL, fill=(90, 74, 60))
    x += img.shape[1] + gap
# actual size thumbnails (x2) of the reduced reference and the game, under their panels
thumbs = [on_bg(red[y0:y1, x0:x1]), on_bg(ours[y0:y1, x0:x1])]
ty = H + 50
sheet2 = Image.new('RGB', (W, H + 60 + thumbs[0].shape[0] * 2 + 30), BG)
sheet2.paste(sheet, (0, 0))
sheet = sheet2
d = ImageDraw.Draw(sheet)
d.text((gap, ty), 'Tamaño real, x2:', font=SMALL, fill=(90, 74, 60))
tx = gap + his_img.shape[1] + gap
for t, lab in zip(thumbs, ['a nuestra escala', 'el juego']):
    sheet.paste(Image.fromarray(up(t, 2)), (tx, ty))
    tx += red_img.shape[1] + gap
sheet.save(out)
print(sheet.size)
