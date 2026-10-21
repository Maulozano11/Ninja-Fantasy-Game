import sys
import numpy as np
a = np.load('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/aiden-parts/eyes/native.npy')
ours = np.fromfile(sys.argv[1], np.uint8).reshape(256, 256, 4).astype(np.int32)
for y in range(3, 29):
    for x in range(36, 66):
        o = ours[y + 120, x + 75]
        h = a[y, x]
        if h.min() > 225 and o[3] == 0:
            continue
        if o[3] == 0 or np.abs(o[:3] - h).max() > 3:
            print(x, y, '#%02x%02x%02x' % tuple(h), '#%02x%02x%02x' % tuple(o[:3]) if o[3] else 'none')
