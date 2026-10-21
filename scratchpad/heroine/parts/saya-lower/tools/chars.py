"""Her native pixels as characters (nearest of a small key of her colours), for reading her design.

  python3 -I chars.py x0 y0 x1 y1   (run from the worktree root)
"""
import sys
sys.path.insert(0, 'tools/refs')
import numpy as np
import heroine_ref as R

KEY = {
    'k': '#02010d', 'K': '#14101f', 'z': '#050416',
    'U': '#1d1d32', 'u': '#1f2241', 'X': '#2e3e5d', 'e': '#314161', 'E': '#3f5177', 'M': '#647299',
    'Q': '#4b0f30', 'q': '#6e1c38', 'p': '#641a36', 'm': '#7c1d36', 'n': '#842b3c', 'r': '#ad333f', 'R': '#bb2e3e', 'a': '#a04641',
    'b': '#302525', 'B': '#453631', 'N': '#534239', 'l': '#604f46', 'w': '#704336', 'W': '#7d4c37', 'v': '#85543e', 'O': '#9d6e44',
    'g': '#343545', 's': '#575b67', 'S': '#6c6e78', 't': '#7e7f8e', 'T': '#9094a4', 'i': '#a0a4b2', 'I': '#b7becc', 'c': '#cacdd5', 'C': '#d6dae6',
    'y': '#f6d886', 'j': '#e8ba58', 'o': '#c48e42', 'J': '#d8a84c', 'h': '#e2b668', 'H': '#b6834e', 'G': '#c69151', 'F': '#f7c962',
    'd': '#d8826e', 'D': '#dc8c76', 'f': '#f4c8a5', 'x': '#eba789',
    '#': '#fefefc',
}
x0, y0, x1, y1 = (int(a) for a in sys.argv[1:5])
N = R.native('saya')
fig = R.figure('saya')
ch = list(KEY)
P = np.array([[int(KEY[c][i:i + 2], 16) for i in (1, 3, 5)] for c in ch])
d = np.stack([R.colour_distance(N, P[i]) for i in range(len(ch))], -1)
best = d.argmin(-1)
print('     ' + ''.join(str((x // 10) % 10) if x % 10 == 0 else ' ' for x in range(x0, x1)))
print('     ' + ''.join(str(x % 10) for x in range(x0, x1)))
for y in range(y0, y1):
    print(f'{y:4d} ' + ''.join(ch[best[y, x]] if fig[y, x] else '.' for x in range(x0, x1)))
