# h88.py work id out x0 y0 x1 y1 Z: his @88 ref | ours @2x | r5 @2x, no grid
import sys
from PIL import Image
W, iid, out = sys.argv[1], sys.argv[2], sys.argv[3]
x0, y0, x1, y1, Z = [int(v) for v in sys.argv[4:9]]
ims = [Image.open(W + f'/out/ref/{iid}@88.png').convert('RGB'), Image.open(W + f'/out/{iid}@2x.png').convert('RGB'), Image.open(W + f'/staging-r5-backup/{iid}@2x.png').convert('RGB')]
ims = [i.crop((x0, y0, x1, y1)).resize(((x1 - x0) * Z, (y1 - y0) * Z), Image.NEAREST) for i in ims]
o = Image.new('RGB', (sum(i.size[0] for i in ims) + 40, ims[0].size[1] + 20), (17, 18, 24)); x = 10
for i in ims: o.paste(i, (x, 10)); x += i.size[0] + 10
o.save(out)
