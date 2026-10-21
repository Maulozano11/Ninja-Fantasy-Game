"""sheet.py dir out k title: the head crops of poses.mts as a grid (rows bodies, columns poses), Spanish labels."""
import os
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

d, out, k, title = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4]
POSES = [('idle', 0, 'quieta'), ('attack', 0, 'ataque 0'), ('attack', 1, 'ataque 1'), ('attack', 2, 'ataque 2'), ('cast', 0, 'lanzar'),
         ('hurt', 0, 'herida'), ('victory', 0, 'victoria'), ('charge', 0, 'cargar'), ('handsigns', 0, 'sellos'), ('walk', 0, 'caminar'),
         ('run', 0, 'correr'), ('crouch', 0, 'agachada'), ('sneak', 0, 'sigilo'), ('downed', 0, 'caída'), ('sit', 0, 'sentada'),
         ('read', 0, 'leer'), ('lean', 0, 'apoyada'), ('train', 0, 'entrenar')]
BODIES = [('female', 'mujer'), ('slender', 'esbelta'), ('male', 'hombre'), ('bulky', 'corpulento')]


def font(size):
    for p in ('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'):
        try:
            return ImageFont.truetype(p, size)
        except OSError:
            pass
    return ImageFont.load_default()


F = font(18)
T = font(26)
tw, th = 28 * k, 24 * k
cols = 9
nrow = len(BODIES) * 2
W = 130 + cols * (tw + 8)
H = 50 + nrow * (th + 30)
im = Image.new('RGB', (W, H), (255, 255, 255))
dr = ImageDraw.Draw(im)
dr.text((10, 10), title, fill=(20, 20, 30), font=T)
for bi, (body, bname) in enumerate(BODIES):
    for pi, (pose, fr, pname) in enumerate(POSES):
        r = bi * 2 + pi // cols
        c = pi % cols
        a = np.asarray(Image.open(os.path.join(d, f'{body}-{pose}-{fr}.png')).convert('RGBA'))
        bg = np.full(a.shape[:2] + (3,), (226, 226, 232), np.uint8)
        m = a[..., 3] > 0
        bg[m] = a[m, :3]
        t = Image.fromarray(bg).resize((tw, th), Image.NEAREST)
        x = 130 + c * (tw + 8)
        y = 50 + r * (th + 30)
        im.paste(t, (x, y + 24))
        dr.text((x, y + 2), pname, fill=(20, 20, 30), font=F)
        if c == 0:
            dr.text((8, y + 24 + th // 2 - 10), bname, fill=(20, 20, 30), font=F)
im.save(out)
