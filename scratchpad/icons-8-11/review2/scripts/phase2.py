import sys, numpy as np
sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-8-11/review2/scripts')
from ok import *
from PIL import Image
from collections import Counter
R2='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-8-11/review2'
RAMP = ['#00035a', '#041384', '#11249b', '#1d35ba', '#2d49cf', '#415fdc', '#5a7ae8', '#799bf8', '#99bbff', '#c4e3ff', '#e4ffff']
for jid in ('ryusei_swap', 'ryusei_warp'):
    for N, suf in ((88, '@2x'), (44, '')):
        cur = np.asarray(Image.open(f'{ICONS}/{jid}{suf}.png').convert('RGB'))
        old = np.asarray(Image.open(f'{R2}/old/e413/{jid}{suf}.png').convert('RGB'))
        d = np.linalg.norm(lab(cur) - lab(old), axis=-1)
        m = d > 0.08
        cnt = Counter(hx(c) for c in cur[m])
        tot = m.sum()
        rim = cnt.get('#e4ffff', 0) + cnt.get('#c4e3ff', 0)
        Lc, Cc, Hc = lch(cur)
        print(jid, N, 'changed', tot, 'rim colours (#e4ffff/#c4e3ff)', rim, f'{rim/tot:.0%}')
        print('   top colours:', ', '.join(f'{k} {v} L{lch(np.array(hexrgb(k)))[0]:.2f}' for k, v in cnt.most_common(14)))
