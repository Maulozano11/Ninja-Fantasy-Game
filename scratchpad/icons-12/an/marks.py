"""His window at 5x with the candidate square's columns marked (gold ticks at the edges)."""
import sys
from PIL import Image, ImageDraw

src, out, k = sys.argv[1], sys.argv[2], 5
cols = [int(c) for c in sys.argv[3].split(',')]
im = Image.open(src).convert('RGB')
w, h = im.size
big = im.resize((w * k, h * k), Image.NEAREST)
c = Image.new('RGB', (w * k, h * k + 20), (20, 20, 26))
c.paste(big, (0, 10))
d = ImageDraw.Draw(c)
for x in cols:
    d.rectangle([x * k, 0, x * k + 1, 8], fill=(255, 210, 60))
    d.rectangle([x * k, h * k + 12, x * k + 1, h * k + 19], fill=(255, 210, 60))
for x in range(0, w, 10):
    d.rectangle([x * k, h * k + 10, x * k, h * k + 12], fill=(160, 160, 160))
c.save(out)
