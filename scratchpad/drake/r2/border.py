import json, sys
import numpy as np
from PIL import Image
d = sys.argv[1]
man = json.load(open(d + '/manifest.json'))['sprites']
bad = 0
for name, s in man.items():
    im = np.asarray(Image.open(d + '/' + s['file']).convert('RGBA'))
    FW, FH = s['frameW'], s['frameH']
    for anim, a in s['anims'].items():
        for i in range(a['frames']):
            f = im[a['row'] * FH:(a['row'] + 1) * FH, i * FW:(i + 1) * FW, 3]
            touch = int((f[0] > 0).sum() + (f[-1] > 0).sum() + (f[:, 0] > 0).sum() + (f[:, -1] > 0).sum())
            if touch:
                bad += 1
                print('TOUCH', name, anim, i, touch)
            if name == 'earth':
                print(f'earth {anim} {i}: px in col1 {int((f[:,1]>0).sum())} col-2 {int((f[:,-2]>0).sum())} row1 {int((f[1]>0).sum())} row-2 {int((f[-2]>0).sum())}')
print('frames touching the border:', bad)
