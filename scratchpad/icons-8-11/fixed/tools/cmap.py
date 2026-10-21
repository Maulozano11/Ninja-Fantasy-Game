"""cmap.py <id> <n> <dir|his> x0 y0 x1 y1: a character map of a region (letters per colour, dark to light)."""
import sys
sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-8-11/fixed/tools')
import m
jid, n, d = sys.argv[1], int(sys.argv[2]), sys.argv[3]
x0, y0, x1, y1 = map(int, sys.argv[4:8])
a = m.his(jid, n) if d == 'his' else m.ours(jid, n, d)
cols = sorted(set(m.hexc(c) for c in a[y0:y1, x0:x1].reshape(-1, 3)), key=lambda h: m.lch(m.hx(h))[0])
chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
key = {c: chars[i] for i, c in enumerate(cols)}
print('  '.join('%s %s' % (key[c], c) for c in cols))
print('   ' + ''.join(str(x % 10) for x in range(x0, x1)))
for y in range(y0, y1):
    print('%2d ' % y + ''.join(key[m.hexc(a[y, x])] for x in range(x0, x1)))
