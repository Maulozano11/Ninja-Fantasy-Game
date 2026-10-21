"""slotview.py <frame.png> <out.png> <icon44.png>...: icons in the slot frame at 1x, 2x and 3x (nearest)."""
import sys
from PIL import Image
frame = Image.open(sys.argv[1]).convert('RGBA')
icons = [Image.open(p).convert('RGBA') for p in sys.argv[3:]]
row = Image.new('RGBA', (len(icons) * 60, 56), (21, 23, 29, 255))
for i, ic in enumerate(icons):
    row.paste(ic, (i * 60 + 6, 6))
    row.alpha_composite(frame, (i * 60, 0))
W = row.size[0]
can = Image.new('RGBA', (W * 6 + 40, 56 * 3 + 20), (21, 23, 29, 255))
can.paste(row, (0, 0))
can.paste(row.resize((W * 2, 112), Image.NEAREST), (W + 20, 0))
can.paste(row.resize((W * 3, 168), Image.NEAREST), (W * 3 + 40, 0))
can.convert('RGB').save(sys.argv[2])
