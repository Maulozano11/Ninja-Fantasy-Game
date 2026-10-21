# sample.py x0 y0 x1 y1 [r]: his first leer at our fine grid (his sheet coords: sprite (81+i,129+j)),
# each fine pixel the bilinear mean over its middle (+-r of a fine pixel), printed as hex per row.
import sys
import numpy as np
from PIL import Image
D = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/camp-ref/'
P, U, V = 2.1482, 66.37, 17.10
a = np.asarray(Image.open(D + 'owner-camp-poses.webp').convert('RGB')).astype(float)


def bil(x, y):
    x0, y0 = int(np.floor(x)), int(np.floor(y))
    fx, fy = x - x0, y - y0
    return (a[y0, x0] * (1 - fx) * (1 - fy) + a[y0, x0 + 1] * fx * (1 - fy) + a[y0 + 1, x0] * (1 - fx) * fy + a[y0 + 1, x0 + 1] * fx * fy)


def fine(sx, sy, r=0.25):
    cx = U + (sx - 81 + 0.5) * P - 0.5
    cy = V + (sy - 129 + 0.5) * P - 0.5
    acc = np.zeros(3)
    n = 0
    for yy in np.linspace(cy - r * P, cy + r * P, 3):
        for xx in np.linspace(cx - r * P, cx + r * P, 3):
            acc += bil(xx, yy)
            n += 1
    return acc / n


if __name__ == '__main__':
    x0, y0, x1, y1 = map(int, sys.argv[1:5])
    r = float(sys.argv[5]) if len(sys.argv) > 5 else 0.25
    print('     ' + ' '.join('%6d' % x for x in range(x0, x1)))
    for y in range(y0, y1):
        print('%4d ' % y + ' '.join('%02x%02x%02x' % tuple(int(round(c)) for c in fine(x, y, r)) for x in range(x0, x1)))
