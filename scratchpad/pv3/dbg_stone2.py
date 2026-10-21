import sys
import numpy as np
src = open('/home/user/Ninja-Fantasy-Game/tools/refs/poison-from-ref.py').read()
cut = src.index('# --- build every key frame')
sys.argv = ['x', sys.argv[1], '/dev/null', sys.argv[2]]
g = {'__name__': 'dbg'}
exec(compile(src[:cut], 'x', 'exec'), g)
cfg = g['SPRITES']['wall_diag']
print('frame' in cfg, cfg.get('frame'))
c = g['SMOOTH']; L = g['lum'](c); dist = np.sqrt(((c - g['BG']) ** 2).sum(-1))
keep = g['poly_mask'](g['H0'], g['W0'], cfg['area'])
art = keep & (dist >= 40)
fs = g['family_of'](c)
stone = art & (fs != 0) & (L < 150)
print('stone px', stone.sum(), 'in post', stone[560:580, 494:510].sum())
lab, n = g['components'](stone, nb=g['N8'])
sizes = np.bincount(lab.ravel(), minlength=n + 1)
print('n', n, 'big', sorted(sizes[1:])[-5:])
print(lab[560:566, 494:506])
