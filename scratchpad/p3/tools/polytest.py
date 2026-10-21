import sys, json, re
import numpy as np
from PIL import Image, ImageDraw
S = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/pw/'
polys = {
 'wall': [[(11,33),(34,33),(34,46),(11,46)], [(257,33),(281,33),(281,46),(257,46)]],
 'wall_diag': [[(28,124.5),(48.5,134.5),(48.5,147),(8,147),(8,136.5)], [(200,20.5),(223,31.5),(223,42),(205,42),(191.5,35.5),(191.5,28.5)]],
}
def inside(poly, x, y):
    c = False; n = len(poly)
    for i in range(n):
        x1, y1 = poly[i]; x2, y2 = poly[(i + 1) % n]
        if (y1 > y) != (y2 > y):
            xi = x1 + (y - y1) * (x2 - x1) / (y2 - y1)
            if x < xi: c = not c
    return c
for name in ['wall', 'wall_diag']:
    im = np.asarray(Image.open(S + f'pc/f-{name}-idle0.png').convert('RGBA')).astype(int)
    for k, P in enumerate(polys[name]):
        xs = [p[0] for p in P]; ys = [p[1] for p in P]
        x0, x1, y0, y1 = int(min(xs)) - 3, int(max(xs)) + 4, int(min(ys)) - 3, int(max(ys)) + 4
        out = np.zeros((y1 - y0, x1 - x0, 4), np.uint8)
        for y in range(y0, y1):
            for x in range(x0, x1):
                r, g, b, a = im[y, x]
                if a < 255: continue
                if not inside(P, x + 0.5, y + 0.5): continue
                lum = 0.3 * r + 0.59 * g + 0.11 * b; ch = max(r, g, b) - min(r, g, b)
                bright = g > r and g > b and ch >= 45 and lum >= 100
                out[y - y0, x - x0] = (255, 0, 255, 255) if bright else (r, g, b, 255)
        z = 14
        base = Image.fromarray(im[y0:y1, x0:x1].astype(np.uint8))
        bg = Image.new('RGBA', base.size, (21, 21, 29, 255)); bg.alpha_composite(base)
        bg2 = Image.new('RGBA', base.size, (21, 21, 29, 255)); bg2.alpha_composite(Image.fromarray(out))
        W = base.width * z
        img = Image.new('RGB', (2 * W + 10, base.height * z), (90, 0, 90))
        img.paste(bg.convert('RGB').resize((W, base.height * z), Image.NEAREST), (0, 0))
        img.paste(bg2.convert('RGB').resize((W, base.height * z), Image.NEAREST), (W + 10, 0))
        d = ImageDraw.Draw(img)
        d.polygon([((px - x0) * z, (py - y0) * z) for px, py in P], outline=(255, 255, 0))
        img.save(S + f'pt-{name}-{k}.png')
        print(name, k, img.size)
