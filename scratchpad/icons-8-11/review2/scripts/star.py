import sys, numpy as np
sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-8-11/review2/scripts')
from ok import *
from collections import Counter
for N in (88, 44):
    k = N / 88
    x0, y0, x1, y1 = [int(v * k) for v in (26, 2, 64, 31)]
    for nm, im in (('his', his('northstar_submission', N)), ('our', our('northstar_submission', N))):
        a = im[y0:y1, x0:x1].reshape(-1, 3)
        L, C, H = lch(a)
        m = L >= 0.45
        a = a[m]; L = L[m]; C = C[m]; H = H[m]
        n = len(a)
        def share(mask): return f'{mask.mean():.0%}'
        print(N, nm, 'n', n, 'hue<8', share(H < 8) if n else '', 'hue8-20', share((H >= 8) & (H < 20)), 'hue20-32', share((H >= 20) & (H < 32)), 'hue>=32', share((H >= 32) & (H < 180)), 'hue>300', share(H > 300),
              '| pale L>=.7 C<=.17', share((L >= 0.7) & (C <= 0.17)), '| medL %.2f medC %.3f medH %.0f' % (np.median(L), np.median(C), np.median(H)))
        if nm == 'our':
            cnt = Counter(hx(c) for c in a)
            print('   ', ', '.join(f'{c}x{v} H{lch(np.array(hexrgb(c)))[2]:.0f} L{lch(np.array(hexrgb(c)))[0]:.2f}' for c, v in cnt.most_common(12)))
