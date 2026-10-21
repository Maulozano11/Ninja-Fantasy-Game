import json, os, sys
import numpy as np
from PIL import Image
G, CH = sys.argv[1:3]
thr = int(sys.argv[3]) if len(sys.argv) > 3 else 60
man = json.load(open(os.path.join(G, 'manifest.json')))['sprites']
def frames(n):
    m = man[n]; sh = Image.open(os.path.join(G, m['file'])).convert('RGBA'); a = m['anims']['idle']
    return [sh.crop((i * m['frameW'], a['row'] * m['frameH'], (i + 1) * m['frameW'], (a['row'] + 1) * m['frameH'])) for i in range(a['frames'])]
B, F = frames('aura_back'), frames('aura')
ch = Image.open(CH).convert('RGBA'); ax, ay = man['aura']['anchor']
for i in range(len(B)):
    c = Image.new('RGBA', B[i].size, (0, 0, 0, 0)); c.alpha_composite(B[i]); c.alpha_composite(ch, (ax - 64, ay - 120)); c.alpha_composite(F[i])
    a = np.asarray(c)[..., 3]; H, W = a.shape
    op = a <= thr; seen = np.zeros_like(op); st = []
    for x in range(W):
        for y in (0, H - 1):
            if op[y, x] and not seen[y, x]: seen[y, x] = 1; st.append((y, x))
    for y in range(H):
        for x in (0, W - 1):
            if op[y, x] and not seen[y, x]: seen[y, x] = 1; st.append((y, x))
    while st:
        y, x = st.pop()
        for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
            v, u = y + dy, x + dx
            if 0 <= v < H and 0 <= u < W and op[v, u] and not seen[v, u]: seen[v, u] = 1; st.append((v, u))
    enc = op & ~seen
    lab = np.zeros((H, W), int); n = 0; out = []
    for y in range(H):
        for x in range(W):
            if enc[y, x] and not lab[y, x]:
                n += 1; q = [(y, x)]; lab[y, x] = n; pts = []
                while q:
                    p = q.pop(); pts.append(p)
                    for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
                        v, u = p[0] + dy, p[1] + dx
                        if 0 <= v < H and 0 <= u < W and enc[v, u] and not lab[v, u]: lab[v, u] = n; q.append((v, u))
                ys = [p[0] for p in pts]; xs = [p[1] for p in pts]
                out.append('%d px x%d-%d y%d-%d' % (len(pts), min(xs), max(xs), min(ys), max(ys)))
    print('frame', i, '; '.join(out))
