import sys, json
from PIL import Image
import numpy as np
G = sys.argv[1]
man = json.load(open(G + '/manifest.json'))['sprites']
tot = 0; worst = {}
for n, s in man.items():
    if n == 'beast': continue
    sh = np.asarray(Image.open(G + '/' + s['file']).convert('RGBA'))[..., 3].astype(int)
    fw, fh = s['frameW'], s['frameH']
    for an, a in s['anims'].items():
        for i in range(a['frames']):
            A = sh[a['row'] * fh:(a['row'] + 1) * fh, i * fw:(i + 1) * fw]
            clear = A < 40; lab = -np.ones(A.shape, int); cnt = 0
            for y0 in range(fh):
                for x0 in range(fw):
                    if not clear[y0, x0] or lab[y0, x0] >= 0: continue
                    st = [(y0, x0)]; lab[y0, x0] = y0 * fw + x0; reg = []; op = False
                    while st:
                        y, x = st.pop(); reg.append((y, x))
                        if x in (0, fw - 1) or y in (0, fh - 1): op = True
                        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                            u, v = y + dy, x + dx
                            if 0 <= u < fh and 0 <= v < fw and clear[u, v] and lab[u, v] < 0:
                                lab[u, v] = y0 * fw + x0; st.append((u, v))
                    if op or len(reg) > 12: continue
                    ring = solid = 0
                    for y, x in reg:
                        for dy in (-1, 0, 1):
                            for dx in (-1, 0, 1):
                                u, v = y + dy, x + dx
                                if 0 <= u < fh and 0 <= v < fw and lab[u, v] != y0 * fw + x0:
                                    ring += 1; solid += A[u, v] >= 200
                    if ring and solid >= 0.75 * ring: cnt += 1
            tot += cnt
            if cnt: worst[f'{n} {an}[{i}]'] = cnt
print('enclosed see-through holes, all frames:', tot, worst if worst else '')
