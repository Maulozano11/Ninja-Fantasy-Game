# region.py stage assets out jid x0 y0 x1 y1 (in his 115 square coords) name
import sys, os
import numpy as np
from PIL import Image, ImageDraw
S, A, O, jid = sys.argv[1:5]
x0, y0, x1, y1 = map(int, sys.argv[5:9]); name = sys.argv[9]
sq = Image.open(os.path.join(S, 'ref', jid + '.png')).convert('RGB')
o88 = Image.open(os.path.join(A, jid + '@2x.png')).convert('RGB')
o44 = Image.open(os.path.join(A, jid + '.png')).convert('RGB')
H = 360
def panel(img, n, k):
    f = n / 115
    b = (round(x0*f), round(y0*f), round(x1*f), round(y1*f))
    c = img.crop(b)
    s = H / c.size[1]
    return c.resize((round(c.size[0]*s), H), Image.NEAREST), b
ps = [panel(sq, 115, 1), panel(o88, 88, 1), panel(o44, 44, 1)]
b88 = np.load(os.path.join(O, jid + '_b88.npy')); b44 = np.load(os.path.join(O, jid + '_b44.npy'))
ps.insert(1, panel(Image.fromarray(np.clip(b88,0,255).astype(np.uint8)), 88, 1))
ps.insert(3, panel(Image.fromarray(np.clip(b44,0,255).astype(np.uint8)), 44, 1))
tw = sum(p[0].size[0] for p in ps) + 10*(len(ps)+1)
im = Image.new('RGB', (tw, H+40), (40, 40, 40)); x = 10; d = ImageDraw.Draw(im)
labels = ['his px', 'his box88', 'ours88', 'his box44', 'ours44']
for (p, b), l in zip(ps, labels):
    im.paste(p, (x, 30)); d.text((x, 5), l + ' ' + str(b), fill=(255, 255, 0)); x += p.size[0] + 10
im.save(os.path.join(O, jid + '-' + name + '.png'))
