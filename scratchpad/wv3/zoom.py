# zoom.py name x0 y0 x1 y1 k  : crops region (game px) from his and ours (dark), side by side
import sys
from PIL import Image
n, x0, y0, x1, y1, k = sys.argv[1], *map(int, sys.argv[2:7])
im = Image.open('rev/x-%s.png' % n)
his = Image.open('rev/his-%s.png' % n)
W, H = his.size
kk = im.height // H
ours = im.crop((W * kk + 10, 0, W * kk * 2 + 10, H * kk)).resize((W, H), Image.NEAREST)
a = his.crop((x0, y0, x1, y1)); b = ours.crop((x0, y0, x1, y1))
out = Image.new('RGB', ((x1 - x0) * k * 2 + 8, (y1 - y0) * k), (0, 0, 0))
out.paste(a.resize(((x1 - x0) * k, (y1 - y0) * k), Image.NEAREST), (0, 0))
out.paste(b.resize(((x1 - x0) * k, (y1 - y0) * k), Image.NEAREST), ((x1 - x0) * k + 8, 0))
out.save('look/zz-%s.png' % n)
