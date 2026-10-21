# ymap.py x0 y0 x1 y1 [r]: luminance (Y) of his fine-pixel samples, as 3-digit numbers per cell, plus
# a saturation/hue hint per cell.
import sys
import colorsys
sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/camp-ref/v4/tools')
from sample import fine

x0, y0, x1, y1 = map(int, sys.argv[1:5])
r = float(sys.argv[5]) if len(sys.argv) > 5 else 0.25
print('Y    ' + ' '.join('%3d' % x for x in range(x0, x1)))
for y in range(y0, y1):
    out = []
    for x in range(x0, x1):
        c = fine(x, y, r)
        out.append('%3d' % round(0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]))
    print('%4d ' % y + ' '.join(out))
print('S%   ' + ' '.join('%3d' % x for x in range(x0, x1)))
for y in range(y0, y1):
    out = []
    for x in range(x0, x1):
        c = fine(x, y, r)
        h, l, s = colorsys.rgb_to_hls(*(v / 255 for v in c))
        out.append('%3d' % round(s * 100))
    print('%4d ' % y + ' '.join(out))
