"""overlay.py MASKFILE TPLJSON NAME  -> prints the template over the skull mask (anchor 14,19 canvas)."""
import json, sys
mask = [l[4:] for l in open(sys.argv[1]).read().split('\n')[1:] if l.strip()]
mask = [m.split('  <-')[0] for m in mask]
c = json.load(open(sys.argv[2]))[sys.argv[3]]
ax, ay = c['fa']; rows = c['f']
dx, dy = 14 - ax, 19 - ay
W = max(len(m) for m in mask)
out = [list(m.ljust(W, '.')) for m in mask]
for r, row in enumerate(rows):
    for col, ch in enumerate(row):
        if ch == '.': continue
        y, x = r + dy, col + dx
        if 0 <= y < len(out) and 0 <= x < W: out[y][x] = ch
print('    ' + ''.join(str(i % 10) for i in range(W)))
for i, o in enumerate(out): print(f'{i:3} ' + ''.join(o))
