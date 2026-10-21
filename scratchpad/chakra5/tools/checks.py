import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
import ck
from PIL import Image
G = ck.G
OLD = sys.argv[1] if len(sys.argv) > 1 else None
M = ck.M
EXEMPT = {'stream': 'lr', 'stream_head': 'l', 'beast': 'all'}
nfr = 0; bad = []
widest = (0, '')
rows = []
for name, s in M.items():
    W, H = s['frameW'], s['frameH']
    im = Image.open(os.path.join(G, s['file']))
    widest = max(widest, (im.width, name))
    for an, a in s['anims'].items():
        fs = ck.frames(name, an)
        for i, f in enumerate(fs):
            nfr += 1
            if EXEMPT.get(name) == 'all': continue
            al = f[..., 3] > 0
            edges = {'t': al[0].any(), 'b': al[-1].any(), 'l': al[:, 0].any(), 'r': al[:, -1].any()}
            ex = EXEMPT.get(name, '')
            hit = [k for k, v in edges.items() if v and k not in ex]
            if hit: bad.append(f'{name}.{an}[{i}] {hit}')
        if name == 'beast': continue
        L = [ck.light(f) * 1000 / 255 for f in fs]
        loop = a.get('loop', True)
        steps = [abs(L[i+1] - L[i]) for i in range(len(L)-1)] + ([abs(L[0] - L[-1])] if loop else [])
        pk = max(L)
        mot = [ck.changed(fs[i], fs[(i+1) % len(fs)]) for i in range(len(fs) - (0 if loop else 1))]
        mm = np.mean(mot) if mot else 0
        rows.append((name, an, len(fs), a['fps'], ' '.join(f'{v:.0f}' for v in L), 100 * max(steps) / pk if pk else 0,
                     f'{100*(min(mot)/mm-1):+.0f}% / {100*(max(mot)/mm-1):+.0f}%' if loop and mm else ''))
print(f'border: {nfr} frames, {len(bad)} with art on the border'); [print('  ', b) for b in bad]
print('widest sheet row:', widest)
print('| sprite | anim | frames@fps | light per frame (per mille) | max step | motion min/max vs mean |')
for r in rows: print(f'| {r[0]} | {r[1]} | {r[2]}@{r[3]} | {r[4]} | {r[5]:.1f}% | {r[6]} |')
if OLD:
    om = json.load(open(os.path.join(OLD, 'manifest.json')))['sprites']
    keys = {'bolt': ('fly', 0), 'stream': ('fly', 0), 'stream_head': ('fly', 0), 'breath': ('fly', 0), 'sphere': ('fly', 0), 'slash': ('fly', 0), 'multi': ('fly', 0), 'hit': ('hit', 3), 'blast': ('blast', 4), 'wall': ('idle', 0), 'wall_diag': ('idle', 0), 'aura': ('idle', 0), 'aura_back': ('idle', 0)}
    def oframes(name, an):
        s = om[name]; a = s['anims'][an]; W, H = s['frameW'], s['frameH']
        sh = np.array(Image.open(os.path.join(OLD, s['file'])).convert('RGBA')).astype(float)
        return [sh[a['row']*H:(a['row']+1)*H, i*W:(i+1)*W] for i in range(a['frames'])]
    for n, (an, i) in keys.items():
        a = ck.frames(n, an)[i]; b = oframes(n, an)[i]
        print(f'key {n}.{an}[{i}] px differing from previous build: {int((a != b).any(-1).sum())}')
    for n in M:
        for an in M[n]['anims']:
            fa, fb = ck.frames(n, an), oframes(n, an)
            d = [int((x != y).any(-1).sum()) for x, y in zip(fa, fb)]
            if any(d): print(f'changed vs previous: {n}.{an}', d)
