"""Show which of his pixels each crow took (tinted), at x4, for one picture."""
import runpy, sys, os
import numpy as np
from PIL import Image
sys.argv = ['crows-from-ref.py', 'docs/reference/genjutsu-set-owner-reference.jpg', '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/crows/out.ts']
g = runpy.run_path('tools/refs/crows-from-ref.py')
key = os.environ.get('PIC', 'L')
L = g['LAY'][key]
rgb = L['rgb'].copy()
cols = [(255, 60, 60), (60, 200, 255), (255, 220, 0), (120, 255, 120), (255, 120, 255), (255, 160, 60)]
out = rgb * 0.45
for i, cr in enumerate(L['crows']):
    m = cr['mask']
    out[m] = rgb[m] * 0.55 + np.array(cols[i % len(cols)]) * 0.45
    w = cr['wingmask']
    out[w] = rgb[w] * 0.4 + np.array(cols[i % len(cols)]) * 0.6
for f in L['feathers']:
    out[f['mask']] = rgb[f['mask']] * 0.5 + np.array((255, 255, 255)) * 0.5
im = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))
im.resize((im.width * 4, im.height * 4), Image.NEAREST).save(f'/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/crows/dbg/mask-{key}.png')
