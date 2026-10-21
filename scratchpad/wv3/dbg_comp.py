import runpy, sys
import numpy as np
sys.argv = ['x', '/home/user/Ninja-Fantasy-Game/docs/reference/water-set-owner-reference.jpg', '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/wv3/refdata-dbg.ts', '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/vfx-water-v3-character.png']
g = runpy.run_path('/home/user/Ninja-Fantasy-Game/tools/refs/water-from-ref.py')
for n in ['sphere', 'slash', 'bolt', 'breath', 'wall', 'blast']:
    idx = g['idx_for_review'][n]
    k = g['KIND'][idx]
    lab, cnt = g['components']((k == 'body') | (k == 'outline'))
    sz = np.bincount(lab.ravel())[1:]
    print(n, sorted(sz.tolist()))
