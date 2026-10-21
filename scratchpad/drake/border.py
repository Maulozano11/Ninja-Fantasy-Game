import json, sys, os
import numpy as np
from PIL import Image
d = sys.argv[1]
m = json.load(open(os.path.join(d, 'manifest.json')))
bad = 0
for name, sp in m['sprites'].items():
    img = np.asarray(Image.open(os.path.join(d, sp['file'])).convert('RGBA'))
    fw, fh = sp['frameW'], sp['frameH']
    n = 0
    for anim, a in sp['anims'].items():
        for i in range(a['frames']):
            f = img[a['row'] * fh:(a['row'] + 1) * fh, i * fw:(i + 1) * fw, 3]
            n += 1
            edge = np.concatenate([f[0], f[-1], f[:, 0], f[:, -1]])
            if (edge > 0).any():
                bad += 1
                print('TOUCHES', name, anim, i, 'opaque', int((edge == 255).sum()), 'any', int((edge > 0).sum()))
    print(name, fw, fh, 'frames checked', n)
print('border problems:', bad)
