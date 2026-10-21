import runpy, sys
import numpy as np
from PIL import Image
sys.argv = ['x', '/home/user/Ninja-Fantasy-Game/docs/reference/water-set-owner-reference.jpg', '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/wv3/refdata-dbg.ts', '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/vfx-water-v3-character.png']
g = runpy.run_path('/home/user/Ninja-Fantasy-Game/tools/refs/water-from-ref.py')
cls = g['built']['aura']['cls']
x0, y0, x1, y1 = 200, 670, 330, 830
vis = np.zeros((y1 - y0, x1 - x0, 3), np.uint8)
vis[cls['body'][y0:y1, x0:x1]] = (60, 160, 220)
vis[cls['outline'][y0:y1, x0:x1]] = (200, 40, 40)
vis[cls['glow'][y0:y1, x0:x1]] = (40, 200, 40)
Image.fromarray(vis).resize(((x1 - x0) * 4, (y1 - y0) * 4), Image.NEAREST).save('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/wv3/look/aura-cls.png')
b = g['built']['aura']
print('glow game px', b['glow'].sum(), 'solid', b['solid'].sum(), 'rim', b['rim'].sum())
print('GLOW', g['GLOW'].round())
