import sys
from PIL import Image, ImageDraw
im = Image.open('../art2/REF-wind-set-owner.jpg').convert('RGB')
S = 1.0875
def ruler(name, x0, y0, x1, y1, k, ox=0, oy=0):
    # game px coords relative to the panel origin (x0, y0); ox/oy extend left/up (game px)
    W, H = round((x1 - x0) / S) + ox, round((y1 - y0) / S) + oy
    g = im.resize((W, H), Image.BOX, box=(x0 - ox * S, y0 - oy * S, x0 - ox * S + W * S, y0 - oy * S + H * S))
    z = g.resize((W * k, H * k), Image.NEAREST)
    o = Image.new('RGB', (W * k + 26, H * k + 26), (0, 0, 0)); o.paste(z, (26, 0)); d = ImageDraw.Draw(o)
    for x in range(-ox, W - ox):
        if x % 8 == 0:
            X = 26 + (x + ox) * k
            d.line([(X, H * k), (X, H * k + (10 if x % 32 == 0 else 5))], fill=(255, 255, 0))
            if x % 16 == 0: d.text((X + 1, H * k + 12), str(x), fill=(255, 255, 255))
    for y in range(-oy, H - oy):
        if y % 8 == 0:
            Y = (y + oy) * k
            d.line([(16, Y), (26, Y)], fill=(255, 80, 80))
            if y % 16 == 0: d.text((0, Y + 1), str(y), fill=(255, 255, 255))
    o.save(f'look/r-{name}.png')
P = {
    'bolt': (10, 43, 84, 113), 'breath': (534, 43, 638, 113),
    'sphere': (651, 43, 727, 113), 'slash': (10, 185, 80, 259), 'multi': (128, 185, 201, 255),
    'hit': (245, 185, 323, 270), 'blast': (362, 185, 618, 339), 'wall': (11, 371, 402, 502),
    'wall_diag': (415, 371, 737, 652), 'wall_depth': (11, 683, 141, 1012), 'aura': (223, 683, 310, 824),
}
for n in sys.argv[1:]:
    k = 8 if n in ('bolt', 'sphere', 'slash', 'multi', 'hit', 'breath') else (5 if n == 'aura' else 3)
    ox = 10 if n == 'aura' else 0
    ruler(n, *P[n], k, ox, 0)
