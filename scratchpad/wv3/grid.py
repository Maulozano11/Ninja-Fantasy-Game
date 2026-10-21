import sys
from PIL import Image, ImageDraw
im = Image.open('../art2/REF-wind-set-owner.jpg').convert('RGB')
S = 1.0875
P = {'bolt': (10, 43), 'stream': (280, 43), 'breath': (534, 43), 'sphere': (651, 43), 'slash': (10, 185), 'multi': (128, 185),
     'hit': (245, 185), 'blast': (362, 185), 'wall': (11, 371), 'wall_diag': (415, 371), 'wall_depth': (11, 683), 'aura': (223, 683)}
name, gx0, gy0, gx1, gy1, k = sys.argv[1], *map(int, sys.argv[2:7])
step = int(sys.argv[7]) if len(sys.argv) > 7 else 8
px, py = P[name]
W, H = gx1 - gx0, gy1 - gy0
g = im.resize((W, H), Image.BOX, box=(px + gx0 * S, py + gy0 * S, px + gx1 * S, py + gy1 * S))
z = g.resize((W * k, H * k), Image.NEAREST)
o = Image.new('RGB', (W * k + 30, H * k + 14), (0, 0, 0)); o.paste(z, (30, 14)); d = ImageDraw.Draw(o)
for x in range(gx0, gx1):
    if x % step == 0:
        X = 30 + (x - gx0) * k
        d.line([(X, 14), (X, 14 + H * k)], fill=(150, 0, 0)); d.text((X + 1, 1), str(x), fill=(255, 255, 0))
for y in range(gy0, gy1):
    if y % step == 0:
        Y = 14 + (y - gy0) * k
        d.line([(30, Y), (30 + W * k, Y)], fill=(150, 0, 0)); d.text((1, Y + 1), str(y), fill=(255, 255, 0))
o.save(f'look/g-{name}.png')
