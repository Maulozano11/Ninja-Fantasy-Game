import sys, numpy as np
sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-8-11/review2/scripts')
from ok import *
# reg.py jid N x0 y0 x1 y1 (inclusive): mean colour, L, C, H of his reduction and ours, and mean deltaE per pixel
jid, N = sys.argv[1], int(sys.argv[2]); x0, y0, x1, y1 = map(int, sys.argv[3:7])
a = his(jid, N)[y0:y1+1, x0:x1+1].astype(float); b = our(jid, N)[y0:y1+1, x0:x1+1].astype(float)
for nm, im in (('his', a), ('our', b)):
    m = im.reshape(-1, 3).mean(0); L, C, H = lch(m)
    print(f'{nm}: mean {hx(m)} L{L:.3f} C{C:.3f} H{H:.0f}')
print('mean dE(pixelwise) %.3f, dE(means) %.3f' % (np.linalg.norm(lab(a) - lab(b), axis=-1).mean(), np.linalg.norm(lab(a.reshape(-1,3).mean(0)) - lab(b.reshape(-1,3).mean(0)))))
