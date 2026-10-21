"""A first raster of the scabbard at her angle, to hand-finish: prints rows (x0, y0 given)."""
import math
import sys

x0, y0, W, H = 104, 173, 22, 24
c0 = (122.0, 174.5)   # throat middle (just under the lower belt)
c1 = (109.8, 193.6)   # the tip's middle
hw = float(sys.argv[1]) if len(sys.argv) > 1 else 1.9
dx, dy = c1[0] - c0[0], c1[1] - c0[1]
L = math.hypot(dx, dy)
ux, uy = dx / L, dy / L
nx, ny = uy, -ux   # across: + toward the upper right (away from the light)
rows = []
for y in range(y0, y0 + H):
    r = ''
    for x in range(x0, x0 + W):
        px, py = x + 0.5 - c0[0], y + 0.5 - c0[1]
        t = px * ux + py * uy
        s = px * nx + py * ny
        ch = '.'
        if -0.6 <= t <= L + 0.4 and abs(s) <= hw:
            end = t - (L - 1.6)
            if end > 0 and abs(s) > hw - end * 0.9:
                ch = '.'
            elif abs(s) > hw - 0.85 or t > L - 0.4 or t < -0.1:
                ch = 'k'
            elif t > L - 3.2:
                ch = 'O' if s > 0 else 'o'
            elif t < 1.6:
                ch = 'j' if s < 0 else 'o'
            elif s < -0.2:
                ch = 'g'
            else:
                ch = 'a'
        r += ch
    rows.append(r)
for j, r in enumerate(rows):
    print(f"    '{r}',  # {y0 + j}")
