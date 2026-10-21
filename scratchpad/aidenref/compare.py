# His picture / ours (idle 0) / differing pixels in red, at 8x.
import sys, numpy as np
sys.path.insert(0, '/home/user/Ninja-Fantasy-Game/tools/refs')
import os; os.chdir('/home/user/Ninja-Fantasy-Game')
from aiden_ref import native, background, OFFSET
from PIL import Image, ImageDraw
ours_path, out = sys.argv[1], sys.argv[2]
his = native(); bg = background(his)
H, W, _ = his.shape
o = np.fromfile(ours_path, np.uint8).reshape(256, 256, 4)
ours = o[OFFSET[1]:OFFSET[1] + H, OFFSET[0]:OFFSET[0] + W]
oa = ours[..., 3] > 0
diff = np.zeros((H, W), bool)
both = oa & ~bg
diff |= (oa != ~bg)
d = np.abs(ours[..., :3].astype(int) - his).max(-1)
diff |= both & (d > 24)
K = 8
def img(rgb, alpha):
    a = np.full((H, W, 3), 255, np.uint8); a[alpha] = rgb[alpha]
    return Image.fromarray(a).resize((W * K, H * K), Image.NEAREST)
A = img(his.astype(np.uint8), ~bg); B = img(ours[..., :3], oa)
dm = np.full((H, W, 3), 232, np.uint8); dm[diff] = (225, 40, 40)
C = Image.fromarray(dm).resize((W * K, H * K), Image.NEAREST)
sheet = Image.new('RGB', (3 * W * K + 40, H * K + 30), 'white'); dr = ImageDraw.Draw(sheet)
for i, (im, t) in enumerate([(A, 'tu dibujo'), (B, 'el juego'), (C, 'en rojo: pixeles distintos')]):
    sheet.paste(im, (i * (W * K + 20), 30)); dr.text((i * (W * K + 20) + 4, 8), t, fill='black')
sheet.save(out)
print('figure px', int((~bg).sum()), 'differ', int(diff.sum()))
