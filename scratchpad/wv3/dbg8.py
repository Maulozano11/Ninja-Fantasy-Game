import runpy, sys, numpy as np
SP = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
sys.argv = ['x', SP + '/art2/REF-wind-set-owner.jpg', SP + '/wv3/refdata.ts']
g = runpy.run_path('/home/user/Ninja-Fantasy-Game/tools/refs/wind-from-ref.py')
t = g['tidx']
print((t[0:16, 52:64] > 0).astype(int))
print(t[0:16, 0:6])
