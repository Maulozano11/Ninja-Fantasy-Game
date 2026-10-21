# usage: zoom.py src.png out.png N Z x0 y0 x1 y1 [step]
# His crop (trimmed) resampled to N (lanczos) or our N image; shown at Z with ticks every `step` N-pixels.
import sys
from PIL import Image, ImageDraw
src, out, N, Z = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
x0, y0, x1, y1 = [int(v) for v in sys.argv[5:9]]
step = int(sys.argv[9]) if len(sys.argv) > 9 else 4
im = Image.open(src).convert('RGB')
if im.size[0] > 150:
    im = im.crop((1, 1, im.size[0]-1, im.size[1]-1))
    # show his raw pixels mapped onto the N grid (each N px = 199/N his px): resize via box to Z*N
    big = im.resize((N*Z, N*Z), Image.BICUBIC)
else:
    big = im.resize((N*Z, N*Z), Image.NEAREST)
big = big.crop((x0*Z, y0*Z, x1*Z, y1*Z))
pad = 22
canvas = Image.new('RGB', (big.size[0]+pad, big.size[1]+pad), (20, 20, 24))
canvas.paste(big, (pad, pad))
d = ImageDraw.Draw(canvas)
for gx in range(x0, x1+1):
    X = pad + (gx-x0)*Z
    if gx % step == 0:
        d.line([(X, pad-6), (X, pad + big.size[1])], fill=(255, 60, 60) if gx % (step*2) == 0 else (120, 120, 120), width=1)
        d.text((X+1, 2), str(gx), fill=(255, 255, 0))
for gy in range(y0, y1+1):
    Y = pad + (gy-y0)*Z
    if gy % step == 0:
        d.line([(pad-6, Y), (pad + big.size[0], Y)], fill=(255, 60, 60) if gy % (step*2) == 0 else (120, 120, 120), width=1)
        d.text((1, Y+1), str(gy), fill=(255, 255, 0))
canvas.save(out)
