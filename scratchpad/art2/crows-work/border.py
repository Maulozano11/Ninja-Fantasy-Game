import sys, json, runpy, io, contextlib
import numpy as np
from PIL import Image
A = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging/vfx_beasts_crows/'
man = json.load(open(A + 'manifest.json'))['sprites']['genjutsu']
img = np.asarray(Image.open(A + 'genjutsu.png').convert('RGBA'))
W, H = man['frameW'], man['frameH']
sys.argv = ['m', '/home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-beasts-ref-genjutsu.ts']
with contextlib.redirect_stdout(io.StringIO()):
    g = runpy.run_path('measure.py', run_name='x')
bad = 0
same = True
for anim, a in man['anims'].items():
    for i in range(a['frames']):
        f = img[a['row'] * H:(a['row'] + 1) * H, i * W:(i + 1) * W]
        al = f[..., 3] > 0
        n = int(al[0].sum() + al[-1].sum() + al[:, 0].sum() + al[:, -1].sum())
        bad += n
        ref = g['frames'][anim][i]
        eq = ref.shape == f.shape and np.array_equal(np.where(ref[..., 3:] > 0, ref, 0), np.where(f[..., 3:] > 0, f, 0))
        same &= eq
        print(f'{anim} {i}: border px {n}, equals data module: {eq}')
print('sheet', img.shape, 'frame', (W, H), 'anchor', man['anchor'], 'TOTAL opaque border px', bad, 'all equal', same)
