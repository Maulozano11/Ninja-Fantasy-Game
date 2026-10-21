# usage: view.py sheet.png out.png [frame_w frame_h col row] [scale] [crop x y w h (in frame px)]
import sys, json
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGBA')
args = sys.argv[3:]
fw = fh = None
if len(args) >= 4:
    fw, fh, col, row = map(int, args[:4]); args = args[4:]
    im = im.crop((col*fw, row*fh, col*fw+fw, row*fh+fh))
k = int(args[0]) if args else 2
if len(args) >= 5:
    x, y, w, h = map(int, args[1:5]); im = im.crop((x, y, x+w, y+h))
bg = Image.new('RGBA', im.size, (93, 107, 87, 255))
bg.alpha_composite(im)
bg = bg.resize((im.width*k, im.height*k), Image.NEAREST)
bg.save(out)
print(bg.size)
