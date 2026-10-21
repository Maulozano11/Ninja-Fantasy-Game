"""pieces.py <refdata.ts> <sprite> <out.png> [zoom] [crop x0,y0,x1,y1]: each piece of a key frame in its own tint."""
import sys, json, re, base64
import numpy as np
from PIL import Image
ts = open(sys.argv[1]).read()
name, out = sys.argv[2], sys.argv[3]
k = int(sys.argv[4]) if len(sys.argv) > 4 else 3
crop = tuple(int(v) for v in sys.argv[5].split(',')) if len(sys.argv) > 5 else None
pal = json.loads(re.search(r'PV3_PAL: PoisonPal\[\] = (\[.*?\]);', ts, re.S).group(1))
ref = json.loads(re.search(r'PV3_REF: Record<string, PoisonRef> = (\{.*\});', ts, re.S).group(1))
P = np.array([[int(p['rgba'][i:i + 2], 16) for i in (1, 3, 5, 7)] for p in pal], float)
r = ref[name]
W, H = r['w'], r['h']
tints = [(255, 80, 80), (80, 255, 80), (80, 80, 255), (255, 255, 0), (255, 0, 255), (0, 255, 255), (255, 160, 0), (160, 160, 255)]
panels = []
for j, (pn, pc) in enumerate(r['pieces'].items()):
    L = np.zeros((H, W), int)
    b = base64.b64decode(pc['rle'])
    i = 0
    for q in range(0, len(b), 2):
        n, v = b[q], b[q + 1]
        for t in range(n):
            if v:
                L[pc['y'] + (i + t) // pc['w'], pc['x'] + (i + t) % pc['w']] = v
        i += n
    img = np.zeros((H, W, 3)) + (31, 33, 46)
    on = L > 0
    c = P[L[on] - 1]
    img[on] = c[:, :3] * c[:, 3:] / 255 + np.array([31, 33, 46]) * (1 - c[:, 3:] / 255)
    im = Image.fromarray(img.astype(np.uint8))
    if crop: im = im.crop(crop)
    panels.append((pn, im))
w, h = panels[0][1].size
can = Image.new('RGB', (len(panels) * (w * k + 6), h * k + 14), (90, 90, 90))
from PIL import ImageDraw
d = ImageDraw.Draw(can)
for j, (pn, im) in enumerate(panels):
    can.paste(im.resize((w * k, h * k), Image.NEAREST), (j * (w * k + 6), 14))
    d.text((j * (w * k + 6) + 2, 2), pn, fill=(255, 255, 0))
can.save(out)
