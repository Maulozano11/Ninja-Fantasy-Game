# steps.py x0 y0 x1 y1 [r]: his fine-pixel samples sorted by luminance into his skin steps
# (o line, D dark, s shadow, b base, l light, h highlight); '.' for cells that are not skin-warm
# and not dark (book, cloth, page, background).
import sys
import colorsys
sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/camp-ref/v4/tools')
from sample import fine

x0, y0, x1, y1 = map(int, sys.argv[1:5])
r = float(sys.argv[5]) if len(sys.argv) > 5 else 0.25
T = [(75, 'o'), (150, 'D'), (175, 's'), (195, 'b'), (205.5, 'l'), (999, 'h')]
print('     ' + ''.join(str(x % 10) for x in range(x0, x1)))
for y in range(y0, y1):
    row = ''
    for x in range(x0, x1):
        c = fine(x, y, r)
        Y = 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]
        warm = c[0] - c[2] > 25 and c[0] > 90
        if Y < 75:
            row += 'o'
        elif not warm:
            row += '.'
        else:
            row += next(ch for t, ch in T if Y < t)
    print('%4d ' % y + row)
