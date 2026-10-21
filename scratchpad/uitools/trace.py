# usage: trace.py x0 y0 x1 y1 [scale]  -> prints a char map of his crop at art scale
# digits 0-7 = METAL ramp by luminance, '.' = background (green / grass), 'r','g','b','t' gems
import sys
import numpy as np
from PIL import Image
x0, y0, x1, y1 = map(float, sys.argv[1:5])
sc = float(sys.argv[5]) if len(sys.argv) > 5 else 1600 / 1024 / 2
im = Image.open('/home/user/Ninja-Fantasy-Game/docs/reference/ui-battle-owner-reference.jpg').convert('RGB')
w, h = round((x1 - x0) * sc), round((y1 - y0) * sc)
c = im.resize((round(im.width * sc), round(im.height * sc)), Image.BOX)
a = np.asarray(c).astype(float)
ox, oy = round(x0 * sc), round(y0 * sc)
a = a[oy:oy + h, ox:ox + w]
METAL = ['#140c05', '#2e2010', '#4c3b23', '#6e5d40', '#918063', '#b3a383', '#d3c6a5', '#efe7cf']
L = [0.3 * int(m[1:3], 16) + 0.59 * int(m[3:5], 16) + 0.11 * int(m[5:7], 16) for m in METAL]
for row in a:
    s = ''
    for r, g, b in row:
        lum = 0.3 * r + 0.59 * g + 0.11 * b
        if g > r + 6 and g > b:  # greenish: background
            s += '.'
        elif r > g + 40 and r > b + 40:
            s += 'r'
        else:
            k = int(np.argmin([abs(lum - l) for l in L]))
            s += str(k)
    print(s)
