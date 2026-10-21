"""Decode one sprite's key frame from the refdata TS and save previews (dark, grass, parchment, alpha)."""
import sys, json, base64
import numpy as np
from PIL import Image
ts, name, out = sys.argv[1], sys.argv[2], sys.argv[3]
crop = tuple(map(int, sys.argv[4].split(','))) if len(sys.argv) > 4 else None
k = int(sys.argv[5]) if len(sys.argv) > 5 else 4
t = open(ts).read()
pal = json.loads(t[t.index('PV3_PAL: PoisonPal[] = ') + len('PV3_PAL: PoisonPal[] = '):].split(';\n')[0])
ref = json.loads(t[t.index('PV3_REF: Record<string, PoisonRef> = ') + len('PV3_REF: Record<string, PoisonRef> = '):].rstrip().rstrip(';'))
P = np.array([[int(p['rgba'][i:i + 2], 16) for i in (1, 3, 5, 7)] for p in pal], np.float64)
r = ref[name]
idx = np.zeros((r['h'], r['w']), np.int32)
for pn, pc in r['pieces'].items():
    b = base64.b64decode(pc['rle'])
    flat = []
    for i in range(0, len(b), 2):
        flat += [b[i + 1]] * b[i]
    a = np.array(flat).reshape(pc['h'], pc['w'])
    sub = idx[pc['y']:pc['y'] + pc['h'], pc['x']:pc['x'] + pc['w']]
    sub[a > 0] = a[a > 0]
rgba = np.zeros(idx.shape + (4,))
rgba[idx > 0] = P[idx[idx > 0] - 1]
if crop:
    x0, y0, x1, y1 = crop
    rgba = rgba[y0:y1, x0:x1]
def comp(bg):
    A = rgba[..., 3:] / 255
    return rgba[..., :3] * A + np.array(bg) * (1 - A)
imgs = [comp((31, 33, 46)), comp((84, 110, 70)), comp((200, 190, 160)), np.repeat(rgba[..., 3:], 3, -1)]
H, W = rgba.shape[:2]
S = Image.new('RGB', (W * k * 4 + 30, H * k), (255, 0, 255))
for i, im in enumerate(imgs):
    S.paste(Image.fromarray(np.clip(im, 0, 255).astype(np.uint8)).resize((W * k, H * k), Image.NEAREST), (i * (W * k + 10), 0))
S.save(out)
