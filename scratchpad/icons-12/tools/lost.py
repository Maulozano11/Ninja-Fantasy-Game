"""Groups the bright pixels each square leaves out (crops.json brightLostPixels) and prints them with his colours.

usage: python3 -I lost.py <stage>
"""
import json
import sys

import numpy as np
from PIL import Image

S = sys.argv[1]
c = json.load(open(S + '/ref/crops.json'))
for jid, v in c['icons'].items():
    p = v['placement']
    win = np.asarray(Image.open('%s/ref/%s@window.png' % (S, jid)).convert('RGB'))
    pts = set(map(tuple, p['brightLostPixels']))
    seen = set()
    groups = []
    for pt in sorted(pts):
        if pt in seen:
            continue
        st = [pt]
        seen.add(pt)
        g = []
        while st:
            q = st.pop()
            g.append(q)
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    r = (q[0] + dx, q[1] + dy)
                    if r in pts and r not in seen:
                        seen.add(r)
                        st.append(r)
        groups.append(sorted(g))
    print(jid, 'square', v['squareInWindow'][0], '..', v['squareInWindow'][2] - 1, 'lost', p['brightLost'], 'of', p['brightTotal'], 'in', len(groups), 'groups')
    if len(groups) > 60:
        xs = np.array([g[0][0] for g in groups])
        print('   (many groups; columns of their first pixel)', np.bincount(xs)[:30])
        continue
    for g in groups:
        xs = [q[0] for q in g]
        ys = [q[1] for q in g]
        cols = sorted({'#%02x%02x%02x' % tuple(win[y, x]) for x, y in g})[:4]
        print('   x %d..%d y %d..%d n %d %s' % (min(xs), max(xs), min(ys), max(ys), len(g), ' '.join(cols)))
