import sys, glob, os, re
from PIL import Image
d = sys.argv[1]; row = sys.argv[2]; scale = float(sys.argv[3]) if len(sys.argv) > 3 else 0.5
fs = sorted(glob.glob(f'{d}/r{row}_f*.png'), key=lambda p: int(re.search(r'_f(\d+)', p).group(1)))
ims = [Image.open(f) for f in fs]
ims = [i.resize((int(i.width * scale), int(i.height * scale)), Image.LANCZOS) for i in ims]
cols = 2
w, h = ims[0].width, ims[0].height
rows = (len(ims) + cols - 1) // cols
out = Image.new('RGB', (cols * w + 10, rows * h + 10 * rows), (0, 0, 0))
for k, im in enumerate(ims):
    out.paste(im, ((k % cols) * (w + 10), (k // cols) * (h + 10)))
out.save(f'{d}/grid_r{row}.png')
print(out.size)
