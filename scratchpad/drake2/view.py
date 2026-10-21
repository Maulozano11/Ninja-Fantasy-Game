import sys
from PIL import Image
# usage: view.py strip.png out.png frames...   (strip from debug(): frames side by side at x3 on green)
im = Image.open(sys.argv[1]); n = 8; W = im.width // n
sel = [int(a) for a in sys.argv[3:]]
cols = 2
rows = (len(sel) + cols - 1) // cols
out = Image.new('RGB', (W * cols, im.height * rows), 'black')
for j, i in enumerate(sel):
    out.paste(im.crop((i * W, 0, (i + 1) * W, im.height)), ((j % cols) * W, (j // cols) * im.height))
out.save(sys.argv[2])
