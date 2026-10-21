"""dec.py <refdata.ts> <sprite> <out.png> [pieces,...] [k] : decode refdata pieces onto light/dark grounds."""
import base64, json, re, sys
import numpy as np
from PIL import Image
src = open(sys.argv[1]).read()
if sys.argv[1].endswith('.json'):
    r = json.loads(src)
else:
    ref = json.loads(re.search(r'export const EV3_REF: Record<string, EarthRef> = (\{.*\});', src, re.S).group(1))
    r = ref[sys.argv[2]]
names = sys.argv[4].split(',') if len(sys.argv) > 4 and sys.argv[4] else list(r['pieces'])
k = int(sys.argv[5]) if len(sys.argv) > 5 else 4
pal = np.array([[int(p['rgba'][i:i + 2], 16) for i in (1, 3, 5, 7)] for p in r['pal']], float)
kinds = [p['kind'] for p in r['pal']]
img = np.zeros((r['h'], r['w']), np.int32)
for pn in names:
    if pn not in r['pieces']:
        continue
    pc = r['pieces'][pn]
    b = base64.b64decode(pc['rle'])
    flat = []
    for i in range(0, len(b), 2):
        flat += [b[i + 1]] * b[i]
    a = np.array(flat).reshape(pc['h'], pc['w'])
    sub = img[pc['y']:pc['y'] + pc['h'], pc['x']:pc['x'] + pc['w']]
    sub[a > 0] = a[a > 0]
out = np.zeros(img.shape + (4,))
out[img > 0] = pal[img[img > 0] - 1]
def comp(bg):
    A = out[..., 3:] / 255
    return out[..., :3] * A + np.array(bg, float) * (1 - A)
both = np.concatenate([comp((34, 34, 45)), np.zeros((r['h'], 4, 3)), comp((222, 214, 190))], 1)
Image.fromarray(np.clip(both, 0, 255).astype(np.uint8)).resize((both.shape[1] * k, both.shape[0] * k), Image.NEAREST).save(sys.argv[3])
print(r['w'], r['h'], r['anchor'], list(r['pieces']))
