import sys
from PIL import Image
out = sys.argv[1]; ims = [Image.open(p) for p in sys.argv[2:]]
W = max(i.width for i in ims); H = sum(i.height + 6 for i in ims)
o = Image.new('RGB', (W, H), (0, 0, 0)); y = 0
for i in ims: o.paste(i, (0, y)); y += i.height + 6
o.save(out)
