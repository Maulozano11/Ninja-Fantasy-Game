"""show.py id [f|b]: an existing template in generator coords (anchor -> (14, 19)), over the female skull."""
import json, sys
AX, AY = 14, 19
d = json.load(open(sys.argv[3] if len(sys.argv) > 3 else 'before.json'))[sys.argv[1]]
key = sys.argv[2] if len(sys.argv) > 2 else 'f'
rows, (fa_x, fa_y) = d[key], d[key + 'a']
skull = open('skull.txt').read().split('\n')
ox, oy = AX - fa_x, AY - fa_y
x0, y0 = min(0, ox), min(0, oy)
x1 = max(34, ox + max(len(r) for r in rows))
y1 = max(34, oy + len(rows))
print('     ' + ''.join(str(abs(c) % 10) for c in range(x0, x1)))
for y in range(y0, y1):
    s = ''
    for x in range(x0, x1):
        r, c = y - oy, x - ox
        ch = rows[r][c] if 0 <= r < len(rows) and 0 <= c < len(rows[r]) else '.'
        if ch != '.':
            s += ch
        else:
            sk = skull[y][x] if 0 <= y < len(skull) and 0 <= x < len(skull[y]) else '.'
            s += {'s': ':', 'o': ',', 'e': 'e'}.get(sk, ' ')
    print(f'{y:4d} {s}')
