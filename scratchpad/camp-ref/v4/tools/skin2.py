# skin2.py x0 y0 x1 y1 k: k-means over only the skin-like fine pixels of a box (warm, not page cream);
# prints the map (cluster letters by luminance, '#' dark line, '.' other) and the centres.
import sys
import numpy as np
sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/camp-ref/v4/tools')
from sample import fine
from skin import kmeans

x0, y0, x1, y1, k = map(int, sys.argv[1:6])
r = float(sys.argv[6]) if len(sys.argv) > 6 else 0.25
S = {(x, y): fine(x, y, r) for y in range(y0, y1) for x in range(x0, x1)}


def is_skin(c):
    R, G, B = c
    return R > 105 and R - B > 28 and R - G > 12


def is_line(c):
    R, G, B = c
    return R + G + B < 150 and R >= B


keys = [q for q in S if is_skin(S[q])]
X = np.array([S[q] for q in keys])
C, L = kmeans(X, k)
lab = dict(zip(keys, L))
chars = 'abcdefghijklmnop'
print('     ' + ''.join(str(x % 10) for x in range(x0, x1)))
for y in range(y0, y1):
    row = ''
    for x in range(x0, x1):
        if (x, y) in lab:
            row += chars[lab[(x, y)]]
        elif is_line(S[(x, y)]):
            row += '#'
        else:
            row += '.'
    print('%4d ' % y + row)
for c in range(k):
    print(chars[c], '#%02x%02x%02x' % tuple(int(round(v)) for v in C[c]), int((L == c).sum()))
