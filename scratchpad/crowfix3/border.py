import json, sys
import numpy as np
from PIL import Image
sys.path.insert(0, '.')
from decode import load
st = sys.argv[1]; ts = sys.argv[2]
man = json.load(open(f'{st}/manifest.json'))['sprites']['genjutsu']
sheet = np.asarray(Image.open(f"{st}/{man['file']}").convert('RGBA'))
W, H = man['frameW'], man['frameH']
size, anchor, frames = load(ts)
bad = 0; total = 0; near = []
for anim, a in man['anims'].items():
    for i in range(a['frames']):
        f = sheet[a['row'] * H:(a['row'] + 1) * H, i * W:(i + 1) * W]
        al = f[..., 3] > 0
        b = int(al[0].sum() + al[-1].sum() + al[:, 0].sum() + al[:, -1].sum())
        bad += b; total += 1
        ref = frames[anim][i]
        same = ref.shape == f.shape and np.array_equal(ref[..., 3] > 0, al) and np.array_equal(ref[al], f[al])
        print(f'{anim} {i}: border opaque px {b}, opaque {int(al.sum())}, equals data module: {same}')
print('frames', total, 'border px total', bad, 'frame', (W, H), 'anchor', man['anchor'], 'anims', {k: (v['frames'], v['fps'], v['loop']) for k, v in man['anims'].items()})
