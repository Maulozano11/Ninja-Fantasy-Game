import json, sys
mask = [l[4:].split('  <-')[0] for l in open(sys.argv[1]).read().split('\n')[1:] if l.strip()]
c = json.load(open(sys.argv[2]))[sys.argv[3]]
part = sys.argv[4] if len(sys.argv) > 4 else 'f'
ax, ay = c[part + 'a']; rows = c[part]
dx, dy = 14 - ax, 19 - ay
W = max(len(m) for m in mask) + 4
out = [list(m.ljust(W, '.')) for m in mask]
while len(out) < len(rows) + dy + 1: out.append(['.'] * W)
for r, row in enumerate(rows):
    for col, ch in enumerate(row):
        if ch == '.': continue
        y, x = r + dy, col + dx
        if 0 <= y < len(out) and 0 <= x < W: out[y][x] = ch
print('    ' + ''.join(str(i % 10) for i in range(W)))
for i, o in enumerate(out): print(f'{i:3} ' + ''.join(o))
