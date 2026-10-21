import sys
from PIL import Image
src, n, cols, k, out = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]), sys.argv[5]
sel = [int(v) for v in sys.argv[6].split(',')] if len(sys.argv) > 6 else list(range(n))
im = Image.open(src)
fw = im.width // n
fh = im.height
rows = (len(sel) + cols - 1) // cols
g = Image.new('RGB', (cols * (fw + 6), rows * (fh + 6)), (10, 10, 10))
for i, f in enumerate(sel):
    g.paste(im.crop((f * fw, 0, (f + 1) * fw, fh)), ((i % cols) * (fw + 6), (i // cols) * (fh + 6)))
g = g.resize((g.width * k // 3, g.height * k // 3), Image.NEAREST)
g.save(out)
