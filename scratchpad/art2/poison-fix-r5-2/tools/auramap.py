import json, os, sys
import numpy as np
from PIL import Image
G, CH = sys.argv[1:3]
x0, y0, x1, y1 = [int(v) for v in sys.argv[3].split(',')]
fl = [int(v) for v in sys.argv[4].split(',')]
man = json.load(open(os.path.join(G, 'manifest.json')))['sprites']
def frames(n):
    m = man[n]; sh = Image.open(os.path.join(G, m['file'])).convert('RGBA'); a = m['anims']['idle']
    return [sh.crop((i * m['frameW'], a['row'] * m['frameH'], (i + 1) * m['frameW'], (a['row'] + 1) * m['frameH'])) for i in range(a['frames'])]
B, F = frames('aura_back'), frames('aura')
ch = Image.open(CH).convert('RGBA'); ax, ay = man['aura']['anchor']
rows = {}
for i in fl:
    c = Image.new('RGBA', B[i].size, (0, 0, 0, 0)); c.alpha_composite(B[i]); c.alpha_composite(ch, (ax - 64, ay - 120)); c.alpha_composite(F[i])
    a = np.asarray(c)[..., 3]; b = np.asarray(B[i])
    for y in range(y0, y1):
        s = ''
        for x in range(x0, x1):
            if a[y, x] <= 60: s += '.'
            else:
                r, g, bb = b[y, x, :3]
                s += 'v' if (r > g and bb > g and b[y,x,3]) else ('g' if b[y,x,3] else 'c')
        rows.setdefault(y, []).append(s)
print('    ' + ' | '.join(('f%d' % i).ljust(x1 - x0) for i in fl))
for y in range(y0, y1): print('%3d ' % y + ' | '.join(rows[y]))
