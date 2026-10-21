import sys, json, numpy as np
from PIL import Image, ImageDraw
d, name, out = sys.argv[1], sys.argv[2], sys.argv[3]
names = sys.argv[4].split(',')
scale = int(sys.argv[5]) if len(sys.argv) > 5 else 3
meta = json.load(open(f'{d}/{name}.json'))
W, H = meta['w'], meta['h']
ims = []
for n in names:
    a = np.frombuffer(open(f'{d}/{name}-{n}.rgba', 'rb').read(), np.uint8).reshape(H, W, 4).astype(float)
    bg = np.zeros((H, W, 3)) + (28, 36, 48)
    A = a[..., 3:] / 255
    c = a[..., :3] * A + bg * (1 - A)
    ims.append((n, Image.fromarray(c.astype(np.uint8)).resize((W*scale, H*scale), Image.NEAREST)))
cols = min(len(ims), 4)
rows = (len(ims) + cols - 1) // cols
S = Image.new('RGB', (cols*(W*scale+6), rows*(H*scale+16)), (60, 60, 70))
dr = ImageDraw.Draw(S)
for i, (n, im) in enumerate(ims):
    x, y = (i % cols)*(W*scale+6), (i//cols)*(H*scale+16)
    S.paste(im, (x, y+14)); dr.text((x+2, y+1), n, fill=(255, 255, 0))
S.save(out)
