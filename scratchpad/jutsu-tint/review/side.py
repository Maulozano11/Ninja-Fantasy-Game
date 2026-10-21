# side.py out k f1 f2 ... : frames side by side, nearest-neighbour k, on the cell grey
import sys
from PIL import Image
out, k, fs = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
ims = [Image.open(f).convert('RGBA') for f in fs]
box = None
for im in ims:
    b = im.getchannel('A').getbbox()
    box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
ims = [im.crop(box) for im in ims]
w, h = ims[0].size
can = Image.new('RGBA', (len(ims) * (w + 4), h), (30, 33, 39, 255))
for i, im in enumerate(ims): can.alpha_composite(im, (i * (w + 4), 0))
can = can.resize((can.width * k, can.height * k), Image.NEAREST)
can.convert('RGB').save(out); print(can.size)
