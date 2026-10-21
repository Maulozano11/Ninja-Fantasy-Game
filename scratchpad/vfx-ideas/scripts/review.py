# Downscaled previews of a strip and contact grids of its GIFs' frames (every k-th), for review.
import sys, os, glob
from PIL import Image
OUT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOOK = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'look')
n = sys.argv[1]
strip = glob.glob(f'{OUT}/{n}-*[!AB].png')[0]
im = Image.open(strip)
f = 2000 / im.width
im.resize((2000, int(im.height * f)), Image.LANCZOS).save(f'{LOOK}/r{n}_strip.png')
for g in sorted(glob.glob(f'{OUT}/{n}-*-[AB].gif')):
    gi = Image.open(g)
    N = gi.n_frames
    idx = list(range(0, N, max(1, N // 12)))[:12]
    fr = []
    for i in idx:
        gi.seek(i)
        fr.append(gi.convert('RGB'))
    w, h = fr[0].size
    s = 640 / w
    tw, th = 640, int(h * s)
    cols = 4
    rows = (len(fr) + cols - 1) // cols
    out = Image.new('RGB', (cols * (tw + 4), rows * (th + 4)), (0, 0, 0))
    for k, fm in enumerate(fr):
        out.paste(fm.resize((tw, th), Image.LANCZOS), ((k % cols) * (tw + 4), (k // cols) * (th + 4)))
    out.save(f'{LOOK}/r{n}_{g[-5]}.png')
    print(g, N, gi.size, os.path.getsize(g))
