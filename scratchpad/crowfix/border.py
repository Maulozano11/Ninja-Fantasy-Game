import json, re, sys
import numpy as np
from PIL import Image
D = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging/vfx_beasts_crows'
man = json.load(open(f'{D}/manifest.json'))['sprites']['genjutsu']
sheet = np.asarray(Image.open(f'{D}/genjutsu.png').convert('RGBA'))
W, H = man['frameW'], man['frameH']
# the data module, decoded independently
ts = open('/home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-beasts-ref-genjutsu.ts', encoding='utf-8').read()
alph = re.search(r"ALPHABET = '(.*?)';", ts).group(1)
pal = re.findall(r"'(#[0-9a-f]{8})'", ts.split('export const PALETTE')[1].split('];')[0])
P = np.array([[int(c[i:i+2], 16) for i in (1, 3, 5, 7)] for c in pal], np.uint8)
size = json.loads(re.search(r'SIZE: \[number, number\] = (\[.*?\])', ts).group(1))
bad = 0
for anim, a in man['anims'].items():
    body = ts.split(f'  {anim}: [')[1]
    chunks = body.split('    [')[1:1 + a['frames']]
    for i in range(a['frames']):
        f = sheet[a['row'] * H:(a['row'] + 1) * H, i * W:(i + 1) * W]
        al = f[..., 3] > 0
        edge = int(al[0].sum() + al[-1].sum() + al[:, 0].sum() + al[:, -1].sum())
        near = int(al[1].sum() + al[-2].sum() + al[:, 1].sum() + al[:, -2].sum())
        rows = re.findall(r"      '(.*?)',", chunks[i].split('    ],')[0])
        img = np.zeros((size[1], size[0], 4), np.uint8)
        for y, row in enumerate(rows):
            x = 0
            for m in re.finditer(r'(\D)(\d*)', row):
                n = int(m.group(2)) if m.group(2) else 1
                img[y, x:x + n] = P[alph.index(m.group(1))]
                x += n
        same = img.shape == f.shape and np.array_equal(img, f)
        print("  png == data module:", same) if not same else None
        bad += 0 if same else 1000
        print(f'{anim} {i}: opaque on border {edge}, 1 px in {near}, alpha levels {sorted(set(np.unique(f[...,3]).tolist()))}, px {int(al.sum())}')
        bad += edge
print('TOTAL border px', bad, '| frame', W, H, 'anchor', man['anchor'])
