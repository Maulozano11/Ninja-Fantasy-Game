import sys, json
from PIL import Image
import numpy as np
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
stage = sys.argv[1]
man = json.load(open(stage + '/manifest.json'))['sprites']['wall_diag']
rm = json.load(open(S + '/art2/vfx-genjutsu-v3-refmap.json'))['wall_diag']
fw, fh = man['frameW'], man['frameH']
room = (man['anchor'][0] - rm['anchor'][0], man['anchor'][1] - rm['anchor'][1])
sheet = np.asarray(Image.open(stage + '/wall_diag.png').convert('RGBA')).astype(int)
k = rm['k']; ox, oy = rm['origin']
boxes = {'far-left': (624, 700, 668, 782), 'front-left': (676, 745, 728, 782), 'foot': (749, 690, 787, 732), 'splash': (826, 652, 864, 682), 'right-end': (880, 560, 920, 650)}
def g(hx, hy): return int(round((hx - ox) * k + room[0])), int(round((hy - oy) * k + room[1]))
for an, a in man['anims'].items():
    for fi in range(a['frames']):
        f = sheet[a['row'] * fh:(a['row'] + 1) * fh, fi * fw:(fi + 1) * fw]
        out = []
        for nm, (x0, y0, x1, y1) in boxes.items():
            gx0, gy0 = g(x0, y0); gx1, gy1 = g(x1, y1)
            r = f[gy0:gy1, gx0:gx1]
            al = r[..., 3]
            tr = (al > 0) & (al < 200)
            # largest 4-connected single-colour translucent component
            seen = np.zeros(tr.shape, bool); big = 0
            H, Wd = tr.shape
            for y in range(H):
                for x in range(Wd):
                    if tr[y, x] and not seen[y, x]:
                        col = tuple(r[y, x]); st = [(y, x)]; seen[y, x] = True; n = 0
                        while st:
                            a_, b_ = st.pop(); n += 1
                            for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
                                u, v = a_ + dy, b_ + dx
                                if 0 <= u < H and 0 <= v < Wd and tr[u, v] and not seen[u, v] and tuple(r[u, v]) == col:
                                    seen[u, v] = True; st.append((u, v))
                        big = max(big, n)
            out.append(f'{nm}: a<200 {int(tr.sum())} maxcomp {big}')
        if an == 'idle' or fi >= 8: print(an, fi, ' | '.join(out))
