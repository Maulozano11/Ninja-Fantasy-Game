import sys
from PIL import Image
files = sys.argv[2:]
ims = [Image.open(f) for f in files]
W = max(i.width for i in ims); H = sum(i.height for i in ims) + 6 * len(ims)
S = Image.new('RGB', (W, H), (0, 0, 0)); y = 0
for i in ims: S.paste(i, (0, y)); y += i.height + 6
S.save(sys.argv[1])
